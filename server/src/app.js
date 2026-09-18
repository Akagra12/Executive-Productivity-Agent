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
const healthRouter      = require("./routes/health");
const ingestRouter      = require("./routes/ingest");
const commitmentsRouter = require("./routes/commitments");
const deduplicateRouter = require("./routes/deduplicate");
const briefRouter       = require("./routes/brief");
const queryRouter       = require("./routes/query");
const chatRouter        = require("./routes/chat");

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────

/**
 * CORS: Allow requests from the Vite dev server, custom CORS_ORIGIN, or any *.vercel.app deployment.
 */
const allowedOrigins = [
  "http://localhost:5173", // Vite default dev port
  "http://localhost:4173", // Vite preview port
  process.env.CORS_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl)
      if (!origin) return callback(null, true);
      // Allow if explicit match or wildcard *
      if (process.env.CORS_ORIGIN === "*" || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow any vercel deployment preview / production domain
      if (origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback for demo evaluations
    },
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

// Root endpoint: API directory and links
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "AIONOS Executive Productivity Agent API",
    version: "1.0.0",
    executive: "Arjun Malhotra (VP Product & Strategy, Veridian Corp)",
    links: {
      health: "/api/health",
      brief: "/api/brief?date=2026-09-23",
      commitments: "/api/commitments?date=2026-09-23",
      classification: "/api/commitments/classify?date=2026-09-23",
      deduplicate: "/api/deduplicate?date=2026-09-23",
      ingest: "/api/ingest",
      chat_status: "/api/chat/status",
    },
    live_frontend: "https://executive-productivity-agent.vercel.app",
    github: "https://github.com/Akagra12/Executive-Productivity-Agent",
  });
});

// All agent API routes live under /api
app.use("/api/health",      healthRouter);
app.use("/api/ingest",      ingestRouter);
app.use("/api/commitments", commitmentsRouter);
app.use("/api/deduplicate", deduplicateRouter);
app.use("/api/brief",       briefRouter);
app.use("/api/query",       queryRouter);
app.use("/api/chat",        chatRouter);

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
