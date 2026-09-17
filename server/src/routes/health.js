/**
 * health.js
 * Route: GET /api/health
 *
 * Purpose: Allows any client (browser, curl, frontend) to confirm
 * the server is running and reachable. This is the simplest possible
 * integration test — no database, no LLM, no auth required.
 */

const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "AIONOS Executive Productivity Agent — server is running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
