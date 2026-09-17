/**
 * query.js — Route: /api/query
 *
 * Endpoints:
 *  GET  /api/query?q=...&date=YYYY-MM-DD  — Execute natural language query
 *  POST /api/query                        — Execute natural language query with JSON body { q, date }
 *  GET  /api/query/contacts               — Get list of recognized executive team contacts
 */

const express = require("express");
const router  = express.Router();
const { answerExecutiveQuery, CONTACTS } = require("../services/queryService");

function resolveDate(req) {
  const qDate = req.query.date || (req.body && req.body.date);
  if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) return qDate;
  if (process.env.DEMO_DATE) return process.env.DEMO_DATE;
  return "2026-09-23";
}

router.get("/", (req, res) => {
  try {
    const q = req.query.q || req.query.query || "";
    const date = resolveDate(req);
    const result = answerExecutiveQuery(q, date);
    res.json({ status: "ok", ...result });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    const q = req.body?.q || req.body?.query || "";
    const date = resolveDate(req);
    const result = answerExecutiveQuery(q, date);
    res.json({ status: "ok", ...result });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.get("/contacts", (req, res) => {
  res.json({ status: "ok", contacts: CONTACTS });
});

module.exports = router;
