/**
 * ingest.js
 * Route: POST /api/ingest
 * Route: GET  /api/ingest/status
 *
 * Purpose:
 * - POST /api/ingest   — loads all 4 sample data files, normalizes them,
 *                        saves to the in-memory store, and returns a summary
 * - GET  /api/ingest/status — returns current store contents without re-running
 *
 * This route is the entry point for the data ingestion pipeline.
 * It reads from disk each time it is called so you can edit the sample JSON
 * files without restarting the server.
 */

const express = require("express");
const path = require("path");
const fs = require("fs");
const router = express.Router();

const { normalizeAll } = require("../data/normalizer");
const store = require("../data/store");

// Resolve absolute paths to the 4 sample data files
const DATA_DIR = path.join(__dirname, "../data/sample");
const FILES = {
  meeting:    path.join(DATA_DIR, "meeting_transcript.json"),
  emails:     path.join(DATA_DIR, "emails.json"),
  calendar:   path.join(DATA_DIR, "calendar.json"),
  voiceNotes: path.join(DATA_DIR, "voice_notes.json"),
};

/**
 * Safely parse a JSON file.
 * Returns { data, error } instead of throwing so we can report per-file failures.
 */
function safeReadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return { data: JSON.parse(raw), error: null };
  } catch (err) {
    return {
      data: null,
      error: `Failed to read/parse "${path.basename(filePath)}": ${err.message}`,
    };
  }
}

// ── POST /api/ingest ─────────────────────────────────────────────────────────

router.post("/", (req, res) => {
  const loadErrors = [];
  const rawData = {};

  // Step 1: Load all 4 source files from disk
  for (const [key, filePath] of Object.entries(FILES)) {
    const { data, error } = safeReadJson(filePath);
    if (error) {
      loadErrors.push(error);
    } else {
      rawData[key] = data;
    }
  }

  // If any file failed to load, report immediately — don't run partial ingestion
  if (loadErrors.length > 0) {
    return res.status(500).json({
      status: "error",
      message: "One or more source files could not be loaded",
      file_errors: loadErrors,
    });
  }

  // Step 2: Normalize all sources into unified SourceMessages
  const { messages, errors: normErrors } = normalizeAll(rawData);

  // Step 3: Populate the store
  store.populate(messages, rawData, normErrors);

  // Step 4: Return summary
  const summary = store.getSummary();

  return res.status(200).json({
    status: "ok",
    message: "Data ingestion complete",
    summary,
    // Return first 3 messages as a sample so you can verify the schema visually
    sample_messages: messages.slice(0, 3),
    normalization_errors: normErrors,
  });
});

router.get("/", (req, res) => {
  // If not yet populated, run the ingestion now
  if (!store.lastProcessed) {
    const rawData = {};
    for (const [key, filePath] of Object.entries(FILES)) {
      const { data, error } = safeReadJson(filePath);
      if (!error && data) rawData[key] = data;
    }
    const { messages, errors: normErrors } = normalizeAll(rawData);
    store.populate(messages, rawData, normErrors);
  }

  return res.status(200).json({
    status: "ok",
    stats: store.getSummary(),
    records: store.sourceMessages,
  });
});

// ── GET /api/ingest/status ────────────────────────────────────────────────────

router.get("/status", (req, res) => {
  if (!store.lastProcessed) {
    return res.status(200).json({
      status: "empty",
      message: "Store has not been populated yet. Call POST /api/ingest first.",
    });
  }

  return res.status(200).json({
    status: "ok",
    summary: store.getSummary(),
    // Expose all messages for inspection (paginated in real app, fine for MVP)
    messages: store.sourceMessages,
  });
});

module.exports = router;
