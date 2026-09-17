/**
 * classifier.js
 *
 * Purpose: Deterministic classification engine for commitment objects.
 *
 * Takes a single commitment (from commitments_extracted.json) and returns
 * a `classification` object that states:
 *   - label:          the canonical category label (see LABELS below)
 *   - reason:         plain-English explanation of why this label was assigned
 *   - rules_applied:  ordered list of rule IDs that fired — auditable trail
 *   - evidence_summary: key source IDs that directly support the classification
 *
 * ── The Four Classification Labels ─────────────────────────────────────────
 *
 *   "my_action"         Arjun Malhotra (the user) is the named owner AND
 *                       the commitment is not yet resolved.
 *
 *   "waiting_on_others" Another named person is the owner AND
 *                       the commitment is not yet resolved.
 *
 *   "unclear_ownership" No owner can be established from the source data, OR
 *                       the source data explicitly shows ownership was disputed /
 *                       declined by all parties.
 *
 *   "completed"         The commitment existed in one of the above states,
 *                       but the source data contains positive confirmation
 *                       that it was delivered and received.
 *
 * ── Rule Precedence (checked top to bottom, first match wins) ──────────────
 *
 *   RULE-1: RESOLVED_STATUS
 *     If stored status === "resolved", the task is completed regardless of
 *     who owned it. Applies to both my_action and waiting_on_others originals.
 *
 *   RULE-2: EXPLICIT_UNCLEAR_FLAG
 *     If ownership_unclear === true OR owner is null.
 *     Ownership must never be invented.
 *
 *   RULE-3: OWNER_IS_ARJUN
 *     If owner matches Arjun's email address.
 *
 *   RULE-4: OWNER_IS_SOMEONE_ELSE
 *     If owner is a non-null email that is not Arjun.
 *
 *   RULE-5: FALLBACK_UNCLEAR
 *     Safety net. Should never fire for well-formed data.
 *
 * ── Design Constraints ──────────────────────────────────────────────────────
 *   - This module has ZERO external dependencies.
 *   - It never reads files or touches state.
 *   - Input and output are plain JS objects.
 *   - All reasoning is traceable back to specific source IDs.
 */

const ARJUN_EMAIL = "arjun.malhotra@veridian-corp.example";

const LABELS = {
  MY_ACTION:         "my_action",
  WAITING_ON_OTHERS: "waiting_on_others",
  UNCLEAR_OWNERSHIP: "unclear_ownership",
  COMPLETED:         "completed",
};

// ── Individual rule functions ─────────────────────────────────────────────────
// Each returns { matched: bool, label?, reason?, rule_id? }

function ruleResolvedStatus(c) {
  if (c.status !== "resolved") return { matched: false };

  const originalCategory = c.category;
  const resolvedEvidence  = c.resolved_evidence;

  // Build human-readable resolution sentence
  let resolutionDetail = "Source data contains evidence of delivery.";
  if (resolvedEvidence) {
    resolutionDetail =
      `Confirmed in ${resolvedEvidence.source_id}: ` +
      `"${resolvedEvidence.verbatim.substring(0, 80)}${resolvedEvidence.verbatim.length > 80 ? "..." : ""}"`;
    if (resolvedEvidence.resolved_at) {
      resolutionDetail += ` (at ${resolvedEvidence.resolved_at})`;
    }
  }

  return {
    matched: true,
    label: LABELS.COMPLETED,
    rule_id: "RULE-1: RESOLVED_STATUS",
    reason:
      `Classified as completed. The stored status is "resolved", which means ` +
      `the source data contains positive confirmation that this item was ` +
      `delivered and acknowledged. Original category was "${originalCategory}". ` +
      resolutionDetail,
    evidence_source_ids: resolvedEvidence ? [resolvedEvidence.source_id] : [],
  };
}

function ruleExplicitUnclearFlag(c) {
  const isUnclear = c.ownership_unclear === true || c.owner === null;
  if (!isUnclear) return { matched: false };

  const ownershipNotes = c.ownership_notes || "Ownership was not established in the source data.";

  return {
    matched: true,
    label: LABELS.UNCLEAR_OWNERSHIP,
    rule_id: "RULE-2: EXPLICIT_UNCLEAR_FLAG",
    reason:
      `Classified as unclear_ownership. Either ownership_unclear is set to true ` +
      `or owner is null. This agent never invents ownership. ` +
      ownershipNotes,
    evidence_source_ids: c.source_ids || [],
  };
}

function ruleOwnerIsArjun(c) {
  if (!c.owner) return { matched: false };
  const ownerNorm = c.owner.toLowerCase();
  if (ownerNorm !== ARJUN_EMAIL.toLowerCase()) return { matched: false };

  // Find the primary evidence — prefer meeting transcript or earliest email
  const primary = (c.evidence || []).find(
    (e) => e.source_type === "meeting_transcript"
  ) || (c.evidence || [])[0];

  const primaryDetail = primary
    ? `Primary source: ${primary.source_id} (${primary.source_type}) — "${primary.verbatim.substring(0, 80)}${primary.verbatim.length > 80 ? "..." : ""}"`
    : "Source evidence is in the evidence array.";

  return {
    matched: true,
    label: LABELS.MY_ACTION,
    rule_id: "RULE-3: OWNER_IS_ARJUN",
    reason:
      `Classified as my_action. The commitment owner is Arjun Malhotra ` +
      `(${c.owner}), the agent's user. Arjun made this commitment explicitly ` +
      `in the source data. ${primaryDetail}`,
    evidence_source_ids: (c.evidence || []).map((e) => e.source_id),
  };
}

function ruleOwnerIsSomeoneElse(c) {
  if (!c.owner) return { matched: false };
  const ownerNorm = c.owner.toLowerCase();
  if (ownerNorm === ARJUN_EMAIL.toLowerCase()) return { matched: false };

  // Find the primary commitment evidence from the other person
  const primary = (c.evidence || []).find(
    (e) => e.source_type === "email" || e.source_type === "meeting_transcript"
  );

  const primaryDetail = primary
    ? `Primary source: ${primary.source_id} — "${primary.verbatim.substring(0, 80)}${primary.verbatim.length > 80 ? "..." : ""}"`
    : "";

  return {
    matched: true,
    label: LABELS.WAITING_ON_OTHERS,
    rule_id: "RULE-4: OWNER_IS_SOMEONE_ELSE",
    reason:
      `Classified as waiting_on_others. The commitment owner is ${c.owner}, ` +
      `not Arjun Malhotra. Arjun is the recipient waiting for this deliverable. ` +
      primaryDetail,
    evidence_source_ids: (c.evidence || []).map((e) => e.source_id),
  };
}

function ruleFallback(c) {
  return {
    matched: true,
    label: LABELS.UNCLEAR_OWNERSHIP,
    rule_id: "RULE-5: FALLBACK_UNCLEAR",
    reason:
      `No preceding rule matched. Falling back to unclear_ownership to avoid ` +
      `inventing ownership. Commitment ID: ${c.commitment_id}. ` +
      `Inspect commitment data for missing fields.`,
    evidence_source_ids: [],
  };
}

// ── Rule chain ────────────────────────────────────────────────────────────────

const RULES = [
  ruleResolvedStatus,
  ruleExplicitUnclearFlag,
  ruleOwnerIsArjun,
  ruleOwnerIsSomeoneElse,
  ruleFallback,
];

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Classify a single commitment object.
 * Applies rules in precedence order; first match wins.
 *
 * @param {object} commitment - A raw commitment from commitments_extracted.json
 * @returns {object} The same commitment with a `classification` field added
 *
 * The returned `classification` object has shape:
 * {
 *   label:              string   — one of the 4 canonical labels
 *   reason:             string   — plain-English explanation
 *   rules_applied:      string[] — IDs of rules that were evaluated (all up to and including match)
 *   evidence_source_ids: string[] — source IDs that support the classification decision
 *   is_arjun_responsible: bool  — true iff Arjun must take action (my_action or unclear_ownership)
 * }
 */
function classify(commitment) {
  const rulesEvaluated = [];
  let result = null;

  for (const rule of RULES) {
    const outcome = rule(commitment);
    if (outcome.matched) {
      rulesEvaluated.push(outcome.rule_id);
      result = outcome;
      break;
    } else {
      // Record evaluated-but-not-matched rules too for full transparency
      // Extract rule_id from function name pattern
      const fnSrc = rule.toString();
      const match = fnSrc.match(/function\s+(\w+)/);
      if (match) rulesEvaluated.push(`${match[1]} (not matched)`);
    }
  }

  const label = result.label;

  return {
    ...commitment,
    classification: {
      label,
      reason:              result.reason,
      rules_applied:       rulesEvaluated,
      evidence_source_ids: result.evidence_source_ids,
      // Convenience flag for the UI: does Arjun need to take action?
      is_arjun_responsible:
        label === LABELS.MY_ACTION || label === LABELS.UNCLEAR_OWNERSHIP,
    },
  };
}

/**
 * Classify an array of commitments.
 * @param {object[]} commitments
 * @returns {object[]}
 */
function classifyAll(commitments) {
  return commitments.map(classify);
}

/**
 * Group an array of classified commitments by their classification label.
 * @param {object[]} classifiedCommitments — output of classifyAll()
 * @returns {{ my_action, waiting_on_others, unclear_ownership, completed, stats }}
 */
function groupByLabel(classifiedCommitments) {
  const groups = {
    [LABELS.MY_ACTION]:         [],
    [LABELS.WAITING_ON_OTHERS]: [],
    [LABELS.UNCLEAR_OWNERSHIP]: [],
    [LABELS.COMPLETED]:         [],
  };

  for (const c of classifiedCommitments) {
    const label = c.classification?.label;
    if (groups[label] !== undefined) {
      groups[label].push(c);
    }
  }

  return {
    my_action:         groups[LABELS.MY_ACTION],
    waiting_on_others: groups[LABELS.WAITING_ON_OTHERS],
    unclear_ownership: groups[LABELS.UNCLEAR_OWNERSHIP],
    completed:         groups[LABELS.COMPLETED],
    stats: {
      total:             classifiedCommitments.length,
      my_action_count:         groups[LABELS.MY_ACTION].length,
      waiting_on_others_count: groups[LABELS.WAITING_ON_OTHERS].length,
      unclear_ownership_count: groups[LABELS.UNCLEAR_OWNERSHIP].length,
      completed_count:         groups[LABELS.COMPLETED].length,
    },
  };
}

module.exports = {
  classify,
  classifyAll,
  groupByLabel,
  LABELS,
  ARJUN_EMAIL,
};
