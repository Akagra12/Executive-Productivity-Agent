/**
 * brief.js — Route: /api/brief
 *
 * Endpoints:
 *  GET  /api/brief?date=YYYY-MM-DD          — Full executive brief (data + markdown + chat snippet)
 *  GET  /api/brief/markdown?date=YYYY-MM-DD — Plain markdown brief text
 *  GET  /api/brief/summary?date=YYYY-MM-DD  — Short chat notification snippet
 */

const express = require("express");
const router  = express.Router();
const { generateExecutiveBrief } = require("../services/briefGenerator");

function resolveDate(req) {
  const qDate = req.query.date;
  if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) return qDate;
  if (process.env.DEMO_DATE) return process.env.DEMO_DATE;
  return "2026-09-23";
}

router.get("/", (req, res) => {
  try {
    const date = resolveDate(req);
    const brief = generateExecutiveBrief(date);
    res.json({ status: "ok", ...brief });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.get("/markdown", (req, res) => {
  try {
    const date = resolveDate(req);
    const brief = generateExecutiveBrief(date);
    res.type("text/plain").send(brief.markdown);
  } catch (err) {
    res.status(500).send(`Error: ${err.message}`);
  }
});

router.get("/summary", (req, res) => {
  try {
    const date = resolveDate(req);
    const brief = generateExecutiveBrief(date);
    res.json({
      status: "ok",
      reference_date: date,
      chat_snippet: brief.chat_snippet,
      stats: brief.stats,
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

module.exports = router;
