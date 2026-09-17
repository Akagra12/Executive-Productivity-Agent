/**
 * deduplicator.js
 *
 * Purpose: Detect and merge likely-duplicate commitments that refer to the
 * same logical task but were extracted from different sources.
 *
 * ── Why this problem exists ──────────────────────────────────────────────────
 * The same commitment often surfaces across multiple sources. In our dataset:
 *   "Send vendor list to Raghav" appears in:
 *     - Leadership Sync meeting transcript (turn 3)
 *     - Email thread 1 (email_t1_2, email_t1_4)
 *     - Voice Note 1 (vn_001)
 *
 * During extraction, these were already collapsed into c_001 with all four
 * source IDs preserved. But if a different extraction process created one
 * commitment object per source, deduplication would be needed to merge them.
 *
 * This module handles that general case: given any list of commitment objects,
 * find true duplicates, flag uncertain ones, and leave unrelated ones separate.
 *
 * ── Approach ─────────────────────────────────────────────────────────────────
 * DETERMINISTIC multi-signal scoring — no embeddings, no LLM, no network.
 *
 * Rationale: The dataset is small and well-structured. Deterministic logic is
 * 100% reproducible, fully auditable, and requires no API keys. An LLM-based
 * approach would be appropriate for free-text extraction but adds unpredictability
 * for a binary merge/no-merge decision.
 *
 * ── Scoring Signals ──────────────────────────────────────────────────────────
 *   Signal                    Weight  Condition
 *   ─────────────────────────────────────────────────────────────
 *   Owner match               0.30    owner emails are equal (normalised)
 *   Recipient match           0.25    recipient emails are equal
 *   Keyword overlap (Jaccard) 0.30    token overlap across title + description
 *   Deadline proximity        0.15    deadlines within 3 calendar days
 *   ─────────────────────────────────────────────────────────────
 *   Max possible score:       1.00
 *
 * ── Confidence Tiers ─────────────────────────────────────────────────────────
 *   score >= 0.70  →  HIGH_CONFIDENCE  →  auto-merged
 *   score  0.40–0.69  →  UNCERTAIN     →  flagged for human review, NOT merged
 *   score < 0.40   →  NOT_DUPLICATE    →  kept separate
 *
 * ── Why NOT merge uncertain pairs ────────────────────────────────────────────
 * Silently merging a wrong pair would corrupt the brief. It is safer to surface
 * an uncertain pair for review and let the user decide. This is consistent with
 * the assignment rule: "do not assume ownership".
 *
 * ── Limitations ──────────────────────────────────────────────────────────────
 * 1. Keyword matching uses simple token sets — it does not understand synonyms
 *    ("send" vs "deliver") unless both words appear in both titles.
 * 2. Deadline proximity works on dates only; "morning" vs "evening" is ignored.
 * 3. The algorithm is O(n²) in the number of commitments — fine for ≤100 items,
 *    not suitable for thousands without a blocking/indexing step.
 * 4. No cross-person merging: if owner A and owner B both describe "send X",
 *    they score 0 on owner match and will not be merged unless other signals
 *    are overwhelming — this is intentional (different owners = different tasks).
 */

// ── Stop-word list ────────────────────────────────────────────────────────────
// Common words that carry no task-specific meaning and would inflate Jaccard scores.
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "to", "for", "of", "in", "on",
  "at", "by", "with", "from", "is", "are", "was", "were", "be", "been",
  "being", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "shall", "can", "need", "must",
  "it", "its", "this", "that", "these", "those", "i", "me", "my",
  "we", "our", "you", "your", "he", "she", "his", "her", "they", "their",
  "action", "task", "item", "arjun", "malhotra", // person names not task signals
  "neha", "kapoor", "raghav", "sethi", "divya", "rao", "priya", "nair",
]);

// ── Text utilities ────────────────────────────────────────────────────────────

/**
 * Tokenise a string into a Set of lowercase meaningful words.
 * Strips punctuation, splits on whitespace, removes stop words and short tokens.
 * @param {string} text
 * @returns {Set<string>}
 */
function tokenise(text) {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ") // remove punctuation
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

/**
 * Jaccard similarity: |A ∩ B| / |A ∪ B|
 * Returns 0 if both sets are empty.
 * @param {Set<string>} a
 * @param {Set<string>} b
 * @returns {number} 0.0 – 1.0
 */
function jaccardSimilarity(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union        = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/**
 * Build a token set from all text fields of a commitment that describe the action.
 * @param {object} c - commitment object
 * @returns {Set<string>}
 */
function commitmentTokens(c) {
  const text = [c.title || "", c.description || ""].join(" ");
  return tokenise(text);
}

// ── Signal scorers ────────────────────────────────────────────────────────────

function scoreOwnerMatch(a, b) {
  if (!a.owner || !b.owner) return 0;
  return a.owner.toLowerCase() === b.owner.toLowerCase() ? 0.30 : 0;
}

function scoreRecipientMatch(a, b) {
  if (!a.recipient || !b.recipient) return 0;
  return a.recipient.toLowerCase() === b.recipient.toLowerCase() ? 0.25 : 0;
}

function scoreKeywordOverlap(a, b) {
  const tokensA = commitmentTokens(a);
  const tokensB = commitmentTokens(b);
  const jaccard  = jaccardSimilarity(tokensA, tokensB);
  return jaccard * 0.30; // max contribution is 0.30
}

function scoreDeadlineProximity(a, b) {
  const dA = a.deadline?.date;
  const dB = b.deadline?.date;
  if (!dA || !dB) return 0;
  const daysDiff = Math.abs(
    (new Date(dA) - new Date(dB)) / (1000 * 60 * 60 * 24)
  );
  if (daysDiff === 0) return 0.15;
  if (daysDiff <= 1)  return 0.10;
  if (daysDiff <= 3)  return 0.05;
  return 0;
}

// ── Confidence tier ───────────────────────────────────────────────────────────

const TIERS = {
  HIGH:    { label: "HIGH_CONFIDENCE",  threshold: 0.70, action: "auto_merged"     },
  MEDIUM:  { label: "UNCERTAIN",        threshold: 0.40, action: "flagged_review"  },
  LOW:     { label: "NOT_DUPLICATE",    threshold: 0.00, action: "kept_separate"   },
};

function getTier(score) {
  if (score >= TIERS.HIGH.threshold)   return TIERS.HIGH;
  if (score >= TIERS.MEDIUM.threshold) return TIERS.MEDIUM;
  return TIERS.LOW;
}

// ── Pair scoring ──────────────────────────────────────────────────────────────

/**
 * Score one pair of commitments across all 4 signals.
 * Returns a detailed breakdown so every decision is auditable.
 *
 * @param {object} a
 * @param {object} b
 * @returns {object} { score, tier, breakdown }
 */
function scorePair(a, b) {
  const ownerScore     = scoreOwnerMatch(a, b);
  const recipientScore = scoreRecipientMatch(a, b);
  const keywordScore   = scoreKeywordOverlap(a, b);
  const deadlineScore  = scoreDeadlineProximity(a, b);

  const score = ownerScore + recipientScore + keywordScore + deadlineScore;
  const tier  = getTier(score);

  // Compute raw Jaccard for transparency in the breakdown
  const tokensA  = commitmentTokens(a);
  const tokensB  = commitmentTokens(b);
  const jaccard  = jaccardSimilarity(tokensA, tokensB);
  const sharedTokens = [...tokensA].filter((x) => tokensB.has(x));

  return {
    commitment_a: a.commitment_id,
    commitment_b: b.commitment_id,
    score:        Math.round(score * 100) / 100,
    tier:         tier.label,
    action:       tier.action,
    breakdown: {
      owner_match:        { score: ownerScore,     match: ownerScore > 0,     detail: `"${a.owner}" vs "${b.owner}"` },
      recipient_match:    { score: recipientScore, match: recipientScore > 0, detail: `"${a.recipient}" vs "${b.recipient}"` },
      keyword_overlap:    { score: Math.round(keywordScore * 100) / 100, jaccard: Math.round(jaccard * 100) / 100, shared_tokens: sharedTokens },
      deadline_proximity: { score: deadlineScore,  days_apart: a.deadline?.date && b.deadline?.date
        ? Math.abs((new Date(a.deadline.date) - new Date(b.deadline.date)) / (1000 * 60 * 60 * 24))
        : null,
        deadline_a: a.deadline?.date || null,
        deadline_b: b.deadline?.date || null,
      },
    },
  };
}

// ── Merger ────────────────────────────────────────────────────────────────────

/**
 * Merge two HIGH_CONFIDENCE duplicate commitments into one canonical object.
 *
 * Merge strategy:
 * - commitment_id:   keep A's ID, record B's as merged_from
 * - title/description: keep A's (assumed to be the more recent or authoritative)
 * - owner/recipient: keep A's (must be the same for HIGH_CONFIDENCE)
 * - status:          prefer "resolved" if either is resolved; else prefer "overdue";
 *                    else prefer the later-sourced one (A)
 * - deadline:        use the most recent (latest date) supported by source
 * - source_ids:      union of both arrays, deduplicated
 * - evidence:        union of both arrays, deduplicated by source_id
 * - deadline_history: union, deduplicated
 *
 * @param {object} a - primary commitment (kept as base)
 * @param {object} b - secondary commitment (merged into a)
 * @param {object} pairScore - output of scorePair(a, b)
 * @returns {object} merged commitment
 */
function mergeCommitments(a, b, pairScore) {
  // Status precedence: resolved > overdue > pending > unclear_ownership
  const STATUS_RANK = { resolved: 4, overdue: 3, pending: 2, unclear_ownership: 1 };
  const mergedStatus =
    (STATUS_RANK[a.status] || 0) >= (STATUS_RANK[b.status] || 0)
      ? a.status
      : b.status;

  // Deadline: prefer the latest date (most recently confirmed)
  let mergedDeadline = a.deadline;
  if (a.deadline?.date && b.deadline?.date && b.deadline.date > a.deadline.date) {
    mergedDeadline = b.deadline;
  }

  // source_ids: union, deduplicated
  const mergedSourceIds = [
    ...new Set([...(a.source_ids || []), ...(b.source_ids || [])]),
  ];

  // evidence: union, deduplicated by source_id
  const evidenceMap = new Map();
  [...(a.evidence || []), ...(b.evidence || [])].forEach((e) => {
    if (!evidenceMap.has(e.source_id)) evidenceMap.set(e.source_id, e);
  });

  // deadline_history: union, deduplicated by source_id
  const historyMap = new Map();
  [...(a.deadline_history || []), ...(b.deadline_history || [])].forEach((h) => {
    if (!historyMap.has(h.source_id)) historyMap.set(h.source_id, h);
  });

  return {
    ...a, // spread A as base
    status:           mergedStatus,
    deadline:         mergedDeadline,
    source_ids:       mergedSourceIds,
    evidence:         [...evidenceMap.values()],
    deadline_history: [...historyMap.values()],
    // Deduplication metadata
    _dedup: {
      merged: true,
      merged_from: b.commitment_id,
      merge_score: pairScore.score,
      merge_tier:  pairScore.tier,
      merge_breakdown: pairScore.breakdown,
    },
  };
}

// ── Main deduplication function ───────────────────────────────────────────────

/**
 * Deduplicate an array of commitment objects.
 *
 * Algorithm:
 * 1. Score every pair (O(n²))
 * 2. Sort pairs by score descending
 * 3. Greedily merge HIGH_CONFIDENCE pairs (each commitment can only be merged once)
 * 4. Flag UNCERTAIN pairs for review (not merged)
 * 5. All remaining commitments stay separate
 *
 * @param {object[]} commitments
 * @returns {object} {
 *   merged:            object[]  — final deduplicated commitment list
 *   auto_merged_pairs: object[]  — pairs that were merged (with breakdown)
 *   flagged_pairs:     object[]  — pairs flagged for review (score 0.40–0.69)
 *   all_pair_scores:   object[]  — every pair scored (for auditability)
 *   stats:             object
 * }
 */
function deduplicate(commitments) {
  if (!Array.isArray(commitments) || commitments.length === 0) {
    return {
      merged:            [],
      auto_merged_pairs: [],
      flagged_pairs:     [],
      all_pair_scores:   [],
      stats:             { input_count: 0, output_count: 0, merged_count: 0, flagged_count: 0 },
    };
  }

  // Step 1: Score every unique pair
  const allPairScores = [];
  for (let i = 0; i < commitments.length; i++) {
    for (let j = i + 1; j < commitments.length; j++) {
      allPairScores.push(scorePair(commitments[i], commitments[j]));
    }
  }

  // Sort descending by score so greedy merge prioritises best matches first
  allPairScores.sort((x, y) => y.score - x.score);

  // Step 2: Greedy merge — each commitment can only be consumed once
  const consumed    = new Set(); // IDs already merged into another
  const autoMerged  = [];       // pairs we merged
  const flagged     = [];       // pairs we flagged but did not merge

  // Index commitments by ID for fast lookup
  const commitmentMap = new Map(commitments.map((c) => [c.commitment_id, c]));

  for (const pair of allPairScores) {
    const { commitment_a, commitment_b, tier, action } = pair;

    if (action === "auto_merged") {
      // Skip if either side was already merged into something else
      if (consumed.has(commitment_a) || consumed.has(commitment_b)) continue;

      const a = commitmentMap.get(commitment_a);
      const b = commitmentMap.get(commitment_b);
      const merged = mergeCommitments(a, b, pair);

      // Replace A in the map with the merged version; mark B as consumed
      commitmentMap.set(commitment_a, merged);
      consumed.add(commitment_b);
      autoMerged.push({ ...pair, merged_commitment_id: commitment_a });
    } else if (action === "flagged_review") {
      // Record the flag even if one side was already merged — useful for audit
      flagged.push({
        ...pair,
        note: "Score is in the UNCERTAIN range (0.40–0.69). These commitments may refer to the same task but the evidence is not conclusive. Human review recommended before merging.",
      });
    }
    // LOW score pairs: nothing to record — they're just not duplicates
  }

  // Step 3: Collect surviving commitments (all non-consumed entries)
  const finalCommitments = [...commitmentMap.values()].filter(
    (c) => !consumed.has(c.commitment_id)
  );

  return {
    merged:            finalCommitments,
    auto_merged_pairs: autoMerged,
    flagged_pairs:     flagged,
    all_pair_scores:   allPairScores,
    stats: {
      input_count:   commitments.length,
      output_count:  finalCommitments.length,
      merged_count:  autoMerged.length,
      flagged_count: flagged.length,
      pairs_scored:  allPairScores.length,
    },
  };
}

module.exports = {
  deduplicate,
  scorePair,
  mergeCommitments,
  tokenise,
  jaccardSimilarity,
  commitmentTokens,
  TIERS,
};
