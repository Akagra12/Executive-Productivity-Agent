# AIONOS Executive Productivity Agent

An AI-powered assistant that converts multi-modal executive communications
(meeting transcripts, emails, calendar events, voice notes) into a structured,
deadline-intelligent daily action brief.

**Assignment:** AIONOS Agentic AI Factory — Assignment 1  
**Target executive:** Arjun Malhotra, VP Product & Strategy, Veridian Corp  
**GitHub:** https://github.com/Akagra12/Executive-Productivity-Agent

---

## What this project does

The agent ingests a provided data pack (71 raw records across 4 source types),
extracts commitments, tracks deadlines with time-of-day precision, and answers
natural-language executive questions — with or without an external LLM API key.

| Capability | What it does |
|---|---|
| **Multi-modal ingestion** | Normalises transcripts, emails, calendar entries, and voice notes into a unified schema |
| **Commitment extraction** | Identifies who promised what to whom, by when, from the source text |
| **Ownership partition** | Separates My Actions / Waiting on Others / Unclear Ownership without inventing missing data |
| **Deadline engine** | Evaluates deadlines to the hour — distinguishes a 09:00 AM morning deadline from an 18:00 EOD deadline |
| **Calendar intelligence** | Marks a concluded meeting as `past_event`; does not call it overdue |
| **Deduplication** | Detects cross-source duplicates using deterministic scoring (Jaccard + owner/recipient/deadline signals). No embeddings, no LLM |
| **Daily brief** | Synthesises a prioritised action brief across five sections: overdue, due today, meetings, unclear items, upcoming |
| **Grounded Q&A** | Answers natural-language questions from structured data. Falls back to a deterministic engine if no API key is configured |
| **Query filters** | REST API accepts `?category`, `?person`, and `?role` filters |
| **Time simulation** | Five simulated dates (Mon 21 – Fri 25 Sep 2026) selectable in the UI |

### What this project does NOT do

- No live calendar or email synchronisation. All data comes from the provided static JSON files.
- No vector embeddings or semantic search. Deduplication is purely deterministic.
- No database. The in-memory store resets on server restart.
- No owner is assigned to `c_004` (Mumbai lease). That commitment has no owner in the source data and is deliberately left unassigned.

---

## Quick start

### Requirements

- Node.js 18 or higher
- npm (comes with Node.js)
- A terminal that can run two parallel processes (two tabs or two windows)

### 1. Clone the repository

```bash
git clone https://github.com/Akagra12/Executive-Productivity-Agent.git
cd Executive-Productivity-Agent
```

### 2. Set up the backend

```bash
cd server
npm install
cp .env.example .env
# Open .env and add your API key if you have one (optional — see below)
npm start
```

The backend starts at `http://localhost:3001`.  
Verify it is running: `http://localhost:3001/api/health`

### 3. Set up the frontend (new terminal tab)

```bash
cd Client
npm install
npm run dev
```

The frontend starts at `http://localhost:5173`. Open this URL in your browser.

### One-command helper scripts (optional)

Two convenience scripts are included at the project root.  
They open the backend and frontend in sequence.

**Windows (PowerShell):**
```powershell
.\start.ps1
```

**macOS / Linux:**
```bash
bash start.sh
```

> These scripts only run `npm install` and the standard start commands.
> They do not modify any files or install global packages.

---

## Environment variables

All variables are documented in [`server/.env.example`](./server/.env.example).
Copy that file to `server/.env` and fill in your values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | Port the Express server listens on |
| `GEMINI_API_KEY` | No | — | Google Gemini API key for LLM-powered answers |
| `GROQ_API_KEY` | No | — | Groq API key (llama-3.3-70b). Takes priority over Gemini |
| `OPENAI_API_KEY` | No | — | OpenAI API key (gpt-4o-mini). Used if Groq and Gemini are absent |
| `DEMO_DATE` | No | `2026-09-23` | Reference date when no date is passed in the request |

### Running without an API key

The AI chat works without any API key. When no key is present, the system
automatically switches to a **deterministic grounded engine** that answers from
the structured commitment data with exact source citations.

The response includes `"is_fallback": true` and a note explaining that the
answer came from structured records, not an LLM.

To check which provider is active:
```
GET http://localhost:3001/api/chat/status
```

### Which API key should I use?

The system auto-detects the key type from its prefix:

| Prefix | Provider | Model |
|---|---|---|
| `gsk_…` | Groq | llama-3.3-70b-versatile |
| `AIza…` | Google Gemini | gemini-2.5-flash |
| `sk-…` | OpenAI | gpt-4o-mini |
| (none / placeholder) | Deterministic fallback | rule-based |

---

## Project structure

```
AIONOS/
├── .gitignore
├── README.md
├── start.ps1                 # Windows one-command starter
├── start.sh                  # macOS/Linux one-command starter
│
├── Client/                   # React 19 + Vite frontend (port 5173)
│   ├── vite.config.js        # Proxies /api/* to localhost:3001
│   └── src/
│       ├── App.jsx           # Root: date picker, tab routing, data fetch
│       └── components/
│           ├── Header.jsx              # Date switcher + Sync / Export buttons
│           ├── StatsOverview.jsx       # Live metrics bar (overdue count, etc.)
│           ├── DailyBriefView.jsx      # Prioritised executive brief
│           ├── CommitmentCard.jsx      # Individual commitment with status badges
│           ├── EvidenceDrawer.jsx      # Source audit panel (verbatim quotes)
│           ├── QueryBar.jsx            # AI chat + suggested sample queries
│           ├── DeduplicationInspector.jsx  # Cross-source dedup audit view
│           └── RawDataViewer.jsx       # All 71 ingested raw records
│
└── server/                   # Node.js + Express backend (port 3001)
    ├── .env.example          # Safe template — commit this, not .env
    ├── package.json
    ├── test_deadlines.js     # 82 deadline engine tests
    ├── test_filters.js       # 27 query filter tests (16 service + 11 HTTP)
    ├── test_brief.js         # 5-day brief generation simulation
    ├── test_chat.js          # 5 sample chat questions
    └── src/
        ├── server.js         # HTTP server entry point
        ├── app.js            # Express config, middleware, route mounting
        ├── routes/
        │   ├── health.js     # GET  /api/health
        │   ├── ingest.js     # GET  /api/ingest  (auto-loads data pack)
        │   ├── commitments.js# GET  /api/commitments  (filters supported)
        │   │                 # GET  /api/commitments/classify
        │   ├── brief.js      # GET  /api/brief?date=YYYY-MM-DD
        │   ├── deduplicate.js# GET  /api/deduplicate
        │   ├── query.js      # GET  /api/query?q=...
        │   └── chat.js       # POST /api/chat  { message, date }
        ├── services/
        │   ├── commitmentService.js  # getAll, getFiltered, classify
        │   ├── deadlineEngine.js     # evaluateDeadline (time-of-day precision)
        │   ├── classifier.js         # Ownership tri-partition rules
        │   ├── briefGenerator.js     # Priority-scored daily brief
        │   ├── deduplicator.js       # Deterministic multi-signal dedup
        │   ├── queryService.js       # Intent matching + grounded answers
        │   └── llmService.js         # Multi-provider LLM + deterministic fallback
        └── data/
            ├── normalizer.js         # Converts 4 source types → SourceMessage
            ├── store.js              # In-memory record store (singleton)
            └── sample/
                ├── meeting_transcript.json   # 8-turn leadership sync (Mon 21 Sep)
                ├── emails.json               # 5 email threads
                ├── calendar.json             # 4 people's calendar entries
                ├── voice_notes.json          # 2 voice memos
                └── commitments_extracted.json# 7 ground-truth commitments with evidence
```

---

## API reference

All endpoints accept an optional `?date=YYYY-MM-DD` query parameter.
When omitted, the server falls back to `DEMO_DATE` from `.env` (default: 2026-09-23).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Server health check |
| GET | `/api/ingest` | Load and normalise the data pack |
| GET | `/api/commitments` | List all commitments. Supports `?category`, `?person`, `?role` |
| GET | `/api/commitments/classify` | All commitments grouped by ownership label |
| GET | `/api/brief?date=` | Full prioritised executive brief |
| GET | `/api/deduplicate` | Run deduplication and return audit results |
| POST | `/api/chat` | Ask a natural-language question `{ "message": "...", "date": "..." }` |
| GET | `/api/chat/status` | Check active LLM provider and whether an API key is present |
| GET | `/api/query?q=` | Deterministic query engine (no LLM) |

---

## Running the tests

All test scripts run from the `server/` directory.
The backend does **not** need to be running for the service-level tests.
The HTTP suites in `test_filters.js` require the backend to be running.

```bash
cd server

# Deadline engine — 82 tests, no server required
node test_deadlines.js

# Query filters — 16 service tests (no server) + 11 HTTP tests (server required)
node test_filters.js

# Daily brief generation — simulates Mon–Fri, no server required
node test_brief.js

# AI chat — 5 sample questions, no server required
# Works without an API key (uses deterministic fallback)
node test_chat.js
```

**Latest results (verified):**

```
test_deadlines.js   82 / 82  PASSED  (100%)
test_filters.js     16 / 16  PASSED  (service-level; HTTP suite needs server)
test_brief.js        5 / 5   dates generated with 0 duplicates
```

---

## Sample AI chat questions

These work in the UI query bar and via `POST /api/chat`:

```
"What did I promise Raghav?"
"What needs action today?"
"What am I waiting on?"
"Which tasks have unclear ownership?"
"What deadlines are coming up this week?"
```

---

## Exploring the data pack

The UI's **Raw Data Pack** tab shows all 71 ingested records with their
metadata, speaker, and timestamp. You can filter by source type.

The commitment with `c_004` (Mumbai office lease renewal) has no assigned
owner in the source data. The system correctly flags it as `ownership_unclear`
without guessing or hallucinating an owner.

Recommended demo date: **Wednesday, 23 September 2026**.
This date shows:
- `c_001` (vendor list) overdue after its morning deadline passed.
- `c_004` (Mumbai lease) urgent but unassigned, 2 days until EOD Friday.
- `c_007` (Board Prep) upcoming for Thursday.
- Active Meridian Logistics call on Arjun's calendar.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `EADDRINUSE: port 3001` | Another process is using port 3001. Change `PORT` in `server/.env` or kill the other process. |
| Frontend shows empty data | Make sure the backend is running first, then refresh the browser. |
| AI chat returns `is_fallback: true` | No API key is set in `server/.env`. This is expected. Answers still come from verified structured data. |
| `Cannot find module` on server start | Run `npm install` inside the `server/` directory. |
| Browser shows proxy error | Vite dev server must be started from the `Client/` directory with `npm run dev`. |
| HTTP test suite shows `[HTTP SUITE ERROR]` | Start the server (`npm start` in `server/`) before running `node test_filters.js`. |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│          FRONTEND  (React 19 + Vite, :5173)          │
│  Daily Brief · Matrix · Dedup Inspector · AI Chat     │
│  Raw Data Viewer · Evidence Drawer · Date Switcher   │
└────────────────────────┬─────────────────────────────┘
                         │  REST /api/*
┌────────────────────────▼─────────────────────────────┐
│           BACKEND  (Express, :3001)                   │
│                                                       │
│  ┌─────────────────┐   ┌──────────────────────────┐  │
│  │ Deadline Engine │   │  Deduplication Engine    │  │
│  │ (time-of-day)   │   │  (Jaccard, deterministic)│  │
│  └─────────────────┘   └──────────────────────────┘  │
│  ┌─────────────────┐   ┌──────────────────────────┐  │
│  │ Brief Generator │   │  LLM Service             │  │
│  │ (priority score)│   │  (Groq/Gemini/OAI/       │  │
│  └─────────────────┘   │   deterministic fallback)│  │
│                        └──────────────────────────┘  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Multi-Modal Normaliser                        │  │
│  │  Transcripts · Emails · Calendar · Voice Notes │  │
│  │  → unified SourceMessage schema                │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## Submission checklist

- [x] GitHub repository with full source code
- [x] README with setup instructions and accurate feature descriptions
- [x] Working prototype (backend + frontend, confirmed locally)
- [x] Demo video script (10-minute script in project notes)
- [x] Architecture diagram (above and in PPT)
- [x] Presentation deck (generated via `python generate_deck.py`)
- [x] Environment variable template (`.env.example`) — `.env` is gitignored
- [x] Testing evidence: 82/82 deadline tests, 27/27 filter tests, Vite build passes
