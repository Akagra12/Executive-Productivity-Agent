/**
 * chat.js — Route: /api/chat
 *
 * Endpoints:
 *  POST /api/chat          — Execute grounded AI chat query { message, date }
 *  GET  /api/chat?q=...    — Execute grounded AI chat query via GET
 *  GET  /api/chat/status   — Check active LLM provider and configuration
 */

const express = require("express");
const router  = express.Router();
const { processExecutiveChat, resolveLlmConfig } = require("../services/llmService");

function resolveDate(req) {
  const qDate = req.query.date || (req.body && req.body.date);
  if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) return qDate;
  if (process.env.DEMO_DATE) return process.env.DEMO_DATE;
  return "2026-09-23";
}

// ── POST /api/chat ──────────────────────────────────────────────────────────

router.post("/", async (req, res) => {
  try {
    const message = req.body?.message || req.body?.query || req.body?.q || "";
    if (!message || !message.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Request body must include a 'message' or 'query' string.",
      });
    }

    const date = resolveDate(req);
    const result = await processExecutiveChat(message.trim(), date);
    res.json({ status: "ok", ...result });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/chat ───────────────────────────────────────────────────────────

router.get("/", async (req, res) => {
  try {
    const q = req.query.q || req.query.query || req.query.message || "";
    if (!q || !q.trim()) {
      return res.status(400).json({
        status: "error",
        message: "Query parameter 'q' or 'query' is required.",
      });
    }

    const date = resolveDate(req);
    const result = await processExecutiveChat(q.trim(), date);
    res.json({ status: "ok", ...result });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── GET /api/chat/status ────────────────────────────────────────────────────

router.get("/status", (req, res) => {
  const config = resolveLlmConfig();
  res.json({
    status: "ok",
    provider: config.provider,
    model: config.model,
    has_api_key: Boolean(config.apiKey),
    fallback_available: true,
  });
});

module.exports = router;
