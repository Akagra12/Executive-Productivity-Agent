/**
 * commitments.js — Route: /api/commitments
 *
 * All endpoints accept an optional ?date=YYYY-MM-DD query parameter.
 * When provided, computed_status and days_overdue are added to each commitment.
 * When omitted, raw stored data is returned.
 *
 * Endpoints:
 *  GET  /api/commitments                           — all commitments
 *  GET  /api/commitments/brief?date=YYYY-MM-DD     — daily brief (4-section grouping)
 *  GET  /api/commitments/classify?date=YYYY-MM-DD  — all commitments with classification labels + reasons
 *  GET  /api/commitments/today?date=YYYY-MM-DD     — actionable today (overdue + due_today)
 *  GET  /api/commitments/unclear                   — items with unclear ownership
 *  GET  /api/commitments/:id                       — single commitment by ID
 *  GET  /api/commitments/person/:email             — by owner or recipient
 *  GET  /api/commitments/promises-to/:email        — Arjun's promises to a specific person
 */

const express = require("express");
const router  = express.Router();
const svc     = require("../services/commitmentService");
const { classifyAll, groupByLabel } = require("../services/classifier");

/**
 * Parse and validate the optional ?date query param.
 * Returns the provided date or falls back to the DEMO_DATE env variable.
 * If neither is set, returns today's date in YYYY-MM-DD format.
 */
function resolveDate(req) {
  const qDate = req.query.date;
  if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) return qDate;
  if (process.env.DEMO_DATE) return process.env.DEMO_DATE;
  return new Date().toISOString().split("T")[0];
}

// ── GET /api/commitments ──────────────────────────────────────────────────────

router.get("/", (req, res) => {
  try {
    const date = resolveDate(req);
    const { category, person, role, time } = req.query;

    if (role && !["owner", "recipient", "either", "any"].includes(role.trim().toLowerCase())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid role parameter. Supported values: 'owner', 'recipient', 'either'.",
      });
    }

    const commitments = svc.getFiltered({ category, person, role }, date, time);

    const filters_applied = {
      category: category ? category.trim() : null,
      person: person ? person.trim() : null,
      role: person
        ? (role ? role.trim().toLowerCase() : "either")
        : (role ? role.trim().toLowerCase() : null),
    };

    res.json({
      status: "ok",
      reference_date: date,
      filters_applied,
      count: commitments.length,
      commitments,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/commitments/brief ────────────────────────────────────────────────

router.get("/brief", (req, res) => {
  try {
    const date = resolveDate(req);
    const brief = svc.getDailyBriefData(date);
    res.json({ status: "ok", ...brief });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/commitments/today ────────────────────────────────────────────────

router.get("/today", (req, res) => {
  try {
    const date = resolveDate(req);
    const items = svc.getActionableToday(date);
    res.json({
      status: "ok",
      reference_date: date,
      count: items.length,
      commitments: items,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/commitments/classify ───────────────────────────────────────────
// Returns every commitment enriched with a classification object:
//   { label, reason, rules_applied[], evidence_source_ids[], is_arjun_responsible }
// Also returns commitments grouped by the four canonical labels.

router.get("/classify", (req, res) => {
  try {
    const date = resolveDate(req);
    const all  = svc.getAll(date);

    // Classify every commitment — pure function, no side-effects
    const classified = classifyAll(all);

    // Group into the 4 canonical buckets for easy rendering
    const grouped = groupByLabel(classified);

    res.json({
      status:         "ok",
      reference_date: date,
      all_classified: classified,
      grouped,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/commitments/unclear ──────────────────────────────────────────────

router.get("/unclear", (req, res) => {
  try {
    const date = resolveDate(req);
    const items = svc.getUnclearOwnership(date);
    res.json({ status: "ok", reference_date: date, count: items.length, commitments: items });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/commitments/person/:email ────────────────────────────────────────

router.get("/person/:email", (req, res) => {
  try {
    const date = resolveDate(req);
    const role = req.query.role || "any"; // "owner" | "recipient" | "any"
    const { email } = req.params;
    const items = svc.getByPerson(email, role, date);
    res.json({
      status: "ok",
      reference_date: date,
      email,
      role,
      count: items.length,
      commitments: items,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/commitments/promises-to/:email ───────────────────────────────────
// Answers: "What did I (Arjun) promise [person]?"

router.get("/promises-to/:email", (req, res) => {
  try {
    const date = resolveDate(req);
    const { email } = req.params;
    const items = svc.getArjunPromisesTo(email, date);
    res.json({
      status: "ok",
      reference_date: date,
      question: `What did Arjun promise to ${email}?`,
      count: items.length,
      commitments: items,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/commitments/:id ──────────────────────────────────────────────────
// Must come AFTER named routes to avoid "brief", "today" etc. being treated as IDs

router.get("/:id", (req, res) => {
  try {
    const date = resolveDate(req);
    const c = svc.getById(req.params.id, date);
    if (!c) {
      return res.status(404).json({
        status: "error",
        message: `Commitment "${req.params.id}" not found`,
      });
    }
    res.json({ status: "ok", reference_date: date, commitment: c });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
