/**
 * app.js
 * Purpose: Configures and exports the Express application instance.
 *
 * Kept separate from server.js so that:
 * - app.js handles all middleware and routing logic
 * - server.js handles only the network binding (port, listen)
 * This separation makes it easy to test app logic without starting a real server.
 */

const express = require("express");
const cors = require("cors");

// Import routes
const healthRouter = require("./routes/health");

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────

/**
 * CORS: Allow requests from the Vite dev server (port 5173).
 * In production this would be locked to your actual frontend domain.
 */
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Vite default dev port
      "http://localhost:4173", // Vite preview port
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/**
 * JSON body parser: Allows routes to read req.body as a plain JS object.
 * Limit set to 2mb to handle large transcript/email payloads later.
 */
app.use(express.json({ limit: "2mb" }));

// ── Routes ──────────────────────────────────────────────────────────────────

// All agent API routes live under /api
app.use("/api/health", healthRouter);

// ── 404 catch-all ───────────────────────────────────────────────────────────
// Catches any request that didn't match a registered route
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ─────────────────────────────────────────────────────
// Express calls this automatically when next(err) is invoked in any route
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Server Error]", err.message);
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
});

module.exports = app;
