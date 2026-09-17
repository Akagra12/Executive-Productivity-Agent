/**
 * deduplicate.js — Route: /api/deduplicate
 *
 * Endpoints:
 *  GET  /api/deduplicate          — run deduplication on all extracted commitments
 *  GET  /api/deduplicate/pairs    — return all pair scores without merging (audit view)
 *  GET  /api/deduplicate/flagged  — return only UNCERTAIN pairs flagged for review
 */

const express  = require("express");
const router   = express.Router();
const svc      = require("../services/commitmentService");
const { deduplicate, scorePair } = require("../services/deduplicator");

function resolveDate(req) {
  const qDate = req.query.date;
  if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) return qDate;
  if (process.env.DEMO_DATE) return process.env.DEMO_DATE;
  return new Date().toISOString().split("T")[0];
}

// ── GET /api/deduplicate ──────────────────────────────────────────────────────
// Runs full deduplication pipeline on live commitment data.

router.get("/", (req, res) => {
  try {
    const date        = resolveDate(req);
    const commitments = svc.getAll(date);
    const result      = deduplicate(commitments);

    res.json({
      status:         "ok",
      reference_date: date,
      approach:       "deterministic_multi_signal_scoring",
      signals:        ["owner_match(0.30)", "recipient_match(0.25)", "keyword_jaccard(0.30)", "deadline_proximity(0.15)"],
      thresholds:     { auto_merge: ">=0.70", flag_review: "0.40-0.69", not_duplicate: "<0.40" },
      ...result,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/deduplicate/pairs ────────────────────────────────────────────────
// Shows every pairwise score without merging — useful for auditing.

router.get("/pairs", (req, res) => {
  try {
    const date        = resolveDate(req);
    const commitments = svc.getAll(date);
    const result      = deduplicate(commitments);

    res.json({
      status:          "ok",
      reference_date:  date,
      total_pairs:     result.all_pair_scores.length,
      all_pair_scores: result.all_pair_scores,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/deduplicate/flagged ─────────────────────────────────────────────
// Returns UNCERTAIN pairs that need human review.

router.get("/flagged", (req, res) => {
  try {
    const date        = resolveDate(req);
    const commitments = svc.getAll(date);
    const result      = deduplicate(commitments);

    res.json({
      status:        "ok",
      reference_date: date,
      flagged_count: result.flagged_pairs.length,
      flagged_pairs: result.flagged_pairs,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
