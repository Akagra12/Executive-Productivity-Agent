/**
 * server.js
 * Purpose: Entry point for the Node.js server.
 *
 * Responsibilities:
 * 1. Load environment variables from .env BEFORE anything else (dotenv must be first)
 * 2. Import the configured Express app from app.js
 * 3. Bind the app to a PORT and start listening
 *
 * Why is this separate from app.js?
 * - app.js only configures the app; it never opens a network socket
 * - server.js owns the lifecycle (start, port, shutdown)
 * - This makes app.js importable in tests without binding a real port
 */

// Step 1: Load .env variables into process.env — must be the very first call
require("dotenv").config();

const app = require("./app");

// Read PORT from environment, fall back to 3001 if not set
const PORT = process.env.PORT || 3001;

// Start the HTTP server
app.listen(PORT, () => {
  console.log(`\n✅  AIONOS server is running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health\n`);
});
