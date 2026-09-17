# AIONOS Executive Productivity Agent

An AI-powered agent that converts messy executive inputs (meetings, emails, calendars, voice notes) into a structured daily action brief.

**Executive:** Arjun Malhotra, VP Sales @ Veridian Corp  
**Assignment:** AIONOS Agentic AI Factory — Assignment 1

---

## Project Structure

```
AIONOS/
├── Client/          # React + Vite frontend (port 5173)
└── server/          # Node.js + Express backend (port 3001)
    ├── src/
    │   ├── app.js        # Express config, middleware, routes
    │   ├── server.js     # Entry point — starts the HTTP server
    │   └── routes/
    │       └── health.js # GET /api/health
    ├── .env.example      # Environment variable template (safe to commit)
    └── .env              # Your local values (DO NOT commit)
```

---

## Quick Start

### 1. Backend (Express server)

```bash
cd server

# Copy env template and fill in your API key later
cp .env.example .env

# Start in development mode (auto-restarts on file changes — no nodemon needed)
npm run dev

# OR start normally
npm start
```

Server will be available at: `http://localhost:3001`

### 2. Frontend (React + Vite)

```bash
cd Client
npm run dev
```

Frontend will be available at: `http://localhost:5173`

---

## Testing the Health Endpoint

Once the server is running, test it with any of these methods:

**Browser:** Open `http://localhost:3001/api/health`

**curl (PowerShell):**
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/api/health" | Select-Object -ExpandProperty Content
```

**curl (if installed):**
```bash
curl http://localhost:3001/api/health
```

**Expected response:**
```json
{
  "status": "ok",
  "message": "AIONOS Executive Productivity Agent — server is running",
  "timestamp": "2026-09-17T14:12:00.000Z"
}
```

---

## Environment Variables

See [`server/.env.example`](./server/.env.example) for all required variables.

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `3001`) |
| `GEMINI_API_KEY` | Later | Google Gemini API key for LLM calls |
| `DEMO_DATE` | Later | Fixed "today" date for demo context |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Backend | Node.js + Express 5 |
| LLM API | Google Gemini (to be integrated) |
| Styling | Vanilla CSS |

---

## What's Next

- [ ] Sample data layer (JSON files for meeting transcript, emails, calendar, voice notes)
- [ ] Agent pipeline: extractor → deduplicator → classifier
- [ ] `/api/process` — runs the full pipeline
- [ ] `/api/brief` — returns structured daily brief
- [ ] `/api/query` — answers natural-language questions
- [ ] Frontend: Daily Brief UI + Q&A chatbox
