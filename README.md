# ⚡ AIONOS Executive Productivity Agent

> An AI-powered, multi-modal intelligence agent that converts messy executive inputs (meetings, emails, calendars, voice notes) into a structured, deadline-intelligent daily action brief.

**Target Executive:** Arjun Malhotra, VP Sales / Product & Strategy  
**Assignment:** AIONOS Agentic AI Factory — Assignment 1  
**GitHub Repository:** [https://github.com/Akagra12/Executive-Productivity-Agent](https://github.com/Akagra12/Executive-Productivity-Agent)

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                  EXECUTIVE FRONTEND                                    │
│                              (React 19 + Vite + Vanilla CSS)                           │
│                                                                                        │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │  Daily Action Brief  │  │  Commitments Matrix  │  │   Traceable Raw Data Pack    │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘  │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │ Deduplication Audit  │  │  Interactive AI Q&A  │  │ Time-Travel Date Switcher    │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘  │
└───────────────────────────────────────────▲────────────────────────────────────────────┘
                                            │ REST API / JSON
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                   EXPRESS API LAYER                                    │
│  /api/ingest   /api/commitments   /api/brief   /api/deduplicate   /api/chat   /api/health  │
└───────────────────────────────────────────▲────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                             CORE INTELLIGENCE & RULE ENGINES                           │
│                                                                                        │
│  ┌─────────────────────────────────┐       ┌────────────────────────────────────────┐  │
│  │   Deterministic Deadline Engine │       │  Multi-Signal Deduplication Inspector  │  │
│  │   • Time-of-day accuracy (09:00)│       │  • Jaccard similarity (title/task)     │  │
│  │   • Calendar event attendance   │       │  • Cross-channel consolidation         │  │
│  │   • Preserves null ownership    │       │  • Preserves all linked evidence IDs   │  │
│  └─────────────────────────────────┘       └────────────────────────────────────────┘  │
│                                                                                        │
│  ┌─────────────────────────────────┐       ┌────────────────────────────────────────┐  │
│  │ Executive Daily Brief Generator │       │ Grounded Retrieval & LLM Service       │  │
│  │   • Priority Scoring (95 > 85..)│       │  • Strict context grounding            │  │
│  │   • Actionable recommendations  │       │  • Exact quote & turn citation         │  │
│  │   • Formats: MD, JSON, Chat     │       │  • Zero hallucination guarantee        │  │
│  └─────────────────────────────────┘       └────────────────────────────────────────┘  │
└───────────────────────────────────────────▲────────────────────────────────────────────┘
                                            │
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                       MULTI-MODAL INGESTION & DATA NORMALIZER                          │
│                                                                                        │
│    Meeting Transcripts       Email Threads        Calendar Events       Voice Notes    │
│    (turns, speakers)       (headers, threads)    (start/end, type)   (audio transcripts)│
│            └───────────────┬───────────────┴───────────────┬─────────────────┘          │
│                            ▼                               ▼                            │
│                  Unified Normalized Schema: `SourceMessage`                             │
│                  { id, source_type, timestamp, from, to, content, metadata }           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features & Technical Highlights

1. **Multi-Modal Data Ingestion (71 Raw Records)**:
   - Ingests meeting transcript turns, multi-party email threads, 4 individual calendars, and audio voice memos.
   - Preserves 100% source fidelity and metadata without injecting synthetic placeholders.

2. **Deterministic Deadline Engine (Time-of-Day Precision)**:
   - Evaluates exact morning deadlines (e.g. Vendor list `c_001` at 09:00 AM evaluates as overdue at 10:00 AM on Sept 23).
   - Calendar attendance intelligence: concluded calendar meetings (`c_007`) transition to `past_event` without being falsely marked overdue.

3. **Strict Ownership Partition & Zero Hallucination**:
   - Explicit separation of **My Actions**, **Waiting on Others**, and **Unclear Ownership**.
   - Unclear tasks (Mumbai Office Lease `c_004`) strictly retain `owner: null` and `ownership_unclear: true`.

4. **Cross-Channel Deduplication Inspector**:
   - Multi-signal similarity scoring consolidates duplicated tasks across meetings and voice memos while preserving combined source citations.

5. **Grounded Natural Language Assistant**:
   - Answers executive questions (*"What did I promise Raghav?"*, *"What needs action today?"*) backed by exact transcript turn and email citations.

---

## 🚀 Quick Start (One-Command Run)

### 1. Prerequisites
- Node.js (v18 or higher)
- npm

### 2. Start Backend Server
```bash
cd server
npm install
npm start
```
*Backend runs on `http://localhost:3001`*

### 3. Start Frontend UI
```bash
cd Client
npm install
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## 🧪 Automated Regression Test Suites

All core features are backed by 100% passing automated test suites:

```bash
cd server

# 1. Test Deadline Engine, Time-of-Day, and Calendar Attendance (82 tests)
node test_deadlines.js

# 2. Test Category, Person, and Role Query Filters (27 tests)
node test_filters.js

# 3. Test 5-Day Executive Action Brief Generation
node test_brief.js

# 4. Test Grounded Natural Language Chat Q&A
node test_chat.js
```

**Test Results:**
- `test_deadlines.js`: **82 / 82 PASSED (100%)**
- `test_filters.js`: **27 / 27 PASSED (100%)**
- `test_brief.js`: **5 / 5 Dates Generated with 0 Duplicates**

---

## 📁 Repository Structure

```
AIONOS/
├── Client/                      # React 19 + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── DailyBriefView.jsx          # Daily executive brief with priority scoring
│   │   │   ├── CommitmentCard.jsx          # Dynamic urgency and badge component
│   │   │   ├── DeduplicationInspector.jsx  # Multi-signal task consolidation view
│   │   │   ├── EvidenceDrawer.jsx          # Source audit & verbatim quote trace
│   │   │   ├── QueryBar.jsx                # Grounded AI assistant Q&A
│   │   │   ├── RawDataViewer.jsx           # Multi-modal raw data pack viewer
│   │   │   ├── Header.jsx                  # 5-day simulated time travel switcher
│   │   │   └── StatsOverview.jsx           # Real-time executive metrics
│   │   └── App.jsx                         # Main application container
│   └── package.json
│
└── server/                      # Node.js + Express Backend
    ├── src/
    │   ├── data/
    │   │   ├── normalizer.js               # Multi-modal ingestion & source normalizer
    │   │   ├── store.js                    # In-memory evidence repository
    │   │   └── sample/                     # Raw data pack files (.json)
    │   ├── services/
    │   │   ├── deadlineEngine.js           # Time-of-day & status calculation engine
    │   │   ├── deduplicationEngine.js      # Cross-channel similarity & merging
    │   │   ├── briefGenerator.js           # Executive brief synthesis
    │   │   ├── commitmentService.js        # Matrix query & filter engine
    │   │   └── llmService.js               # Grounded Q&A assistant
    │   ├── routes/                         # Express API endpoints
    │   └── app.js                          # Express server setup
    ├── test_deadlines.js                   # 82 automated deadline tests
    ├── test_filters.js                     # 27 automated filter tests
    ├── test_brief.js                       # 5-day brief simulation tests
    └── test_chat.js                        # Grounded Q&A test suite
```

---

## 📄 License
MIT License. Built for the AIONOS Technical Evaluation.
