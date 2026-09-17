/**
 * deadlineEngine.js
 *
 * Purpose: Robust deadline extraction, normalization, and status evaluation engine
 * for the Executive Productivity Agent.
 *
 * ── Simulated Context ────────────────────────────────────────────────────────
 * Anchor Week: 21 September 2026 (Monday) – 25 September 2026 (Friday)
 * Reference Person: Arjun Malhotra (VP Product & Strategy)
 *
 * ── Supported Deadline States ────────────────────────────────────────────────
 * 1. "completed"        — Confirmed resolved in evidence (regardless of deadline)
 * 2. "overdue"          — Reference datetime > deadline datetime (Requires valid date & dl)
 * 3. "due_today"        — Reference date === deadline date and not yet overdue/resolved
 * 4. "upcoming"         — Reference datetime < deadline datetime
 * 5. "no_deadline"      — No explicit deadline mentioned in source evidence
 * 6. "unclear_deadline" — Conflicting or ambiguous timing without resolved consensus
 *
 * ── Time-of-Day Conventions & Assumptions ────────────────────────────────────
 * Standard business hour conventions for relative phrases:
 *   - "morning" / "first thing"  → 09:00 (Start of business)
 *   - "noon" / "midday"          → 12:00
 *   - "afternoon"                → 14:00
 *   - "evening"                  → 18:00
 *   - "EOD" / "end of day" / "COB" → 18:00 (Close of business)
 *   - "tonight" / "night"        → 21:00
 *   - Explicit time (e.g., "09:30 AM") → Exact 24-hour time "09:30"
 *
 * When only a date is provided without a time, EOD (18:00) is the default assumption.
 */

// Simulated business week mapping (September 2026)
const WEEKDAY_TO_DATE_2026_09 = {
  monday:    "2026-09-21",
  tuesday:   "2026-09-22",
  wednesday: "2026-09-23",
  thursday:  "2026-09-24",
  friday:    "2026-09-25",
  saturday:  "2026-09-26",
  sunday:    "2026-09-27",
};

// Standard time-of-day offsets (24h format HH:MM)
const TIME_OF_DAY_STANDARDS = {
  "morning":    "09:00",
  "first thing":"09:00",
  "midday":     "12:00",
  "noon":       "12:00",
  "afternoon":  "14:00",
  "evening":    "18:00",
  "eod":        "18:00",
  "end of day": "18:00",
  "cob":        "18:00",
  "night":      "21:00",
};

/**
 * Normalizes a time phrase or explicit time string into HH:MM format.
 * @param {string} timeStr
 * @returns {string} e.g. "09:00", "18:00", "09:30"
 */
function normalizeTimeOfDay(timeStr) {
  if (!timeStr) return "18:00"; // default to EOD
  const clean = timeStr.trim().toLowerCase();

  if (TIME_OF_DAY_STANDARDS[clean]) {
    return TIME_OF_DAY_STANDARDS[clean];
  }

  // Handle formats like "9:30", "09:30", "9:30 am", "5:00 pm", "5pm"
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? match12[2] : "00";
    const period = match12[3].toLowerCase();
    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = String(parseInt(match24[1], 10)).padStart(2, "0");
    return `${hours}:${match24[2]}`;
  }

  return "18:00";
}

/**
 * Parses natural language deadline phrases from source text relative to an utterance date.
 *
 * @param {string} text - Raw supporting text
 * @param {string} [utteranceDate="2026-09-22"] - Date the message was spoken/sent
 * @returns {object|null} { date: "YYYY-MM-DD", time_of_day: string, time_24h: string, confidence: number }
 */
function parseDeadlineFromText(text, utteranceDate = "2026-09-22") {
  if (!text || typeof text !== "string") return null;
  const lower = text.toLowerCase();

  // Pattern 1: Explicit ISO date "YYYY-MM-DD"
  const isoMatch = lower.match(/\b(202\d-\d{2}-\d{2})\b/);
  if (isoMatch) {
    return {
      date: isoMatch[1],
      time_of_day: "EOD",
      time_24h: "18:00",
      confidence: 1.0,
      extracted_phrase: isoMatch[0],
    };
  }

  // Pattern 2: Day of week with optional time (e.g., "Thursday 9:30 AM", "Wednesday evening", "Friday EOD", "by Friday")
  const dayMatch = lower.match(/\b(by\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?:\s+(morning|afternoon|evening|eod|cob|\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?\b/);
  if (dayMatch) {
    const weekday = dayMatch[2];
    const timePhrase = dayMatch[3] || "EOD";
    const targetDate = WEEKDAY_TO_DATE_2026_09[weekday];
    if (targetDate) {
      return {
        date: targetDate,
        time_of_day: timePhrase,
        time_24h: normalizeTimeOfDay(timePhrase),
        confidence: 0.95,
        extracted_phrase: dayMatch[0],
      };
    }
  }

  // Pattern 3: "tomorrow morning", "first thing tomorrow", "by tomorrow EOD"
  if (lower.includes("tomorrow")) {
    const base = new Date(utteranceDate);
    if (!isNaN(base.getTime())) {
      const tomorrow = new Date(base);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomDateStr = tomorrow.toISOString().split("T")[0];

      let timePhrase = "EOD";
      if (lower.includes("morning") || lower.includes("first thing")) timePhrase = "morning";
      else if (lower.includes("evening")) timePhrase = "evening";
      else if (lower.includes("afternoon")) timePhrase = "afternoon";

      return {
        date: tomDateStr,
        time_of_day: timePhrase,
        time_24h: normalizeTimeOfDay(timePhrase),
        confidence: 0.90,
        extracted_phrase: "tomorrow " + timePhrase,
      };
    }
  }

  // Pattern 4: "today EOD", "by end of day today", "tonight"
  if (lower.includes("today") || lower.includes("end of day") || lower.includes("eod")) {
    let timePhrase = "EOD";
    if (lower.includes("morning")) timePhrase = "morning";
    else if (lower.includes("afternoon")) timePhrase = "afternoon";
    else if (lower.includes("evening")) timePhrase = "evening";

    return {
      date: utteranceDate,
      time_of_day: timePhrase,
      time_24h: normalizeTimeOfDay(timePhrase),
      confidence: 0.85,
      extracted_phrase: "today " + timePhrase,
    };
  }

  return null;
}

/**
 * Evaluates the status of a commitment relative to a reference date/time.
 *
 * Rules:
 *  - If stored status === "resolved" -> "completed" (resolved always takes precedence)
 *  - If commitment has no valid deadline -> "no_deadline" (NEVER marked overdue)
 *  - If reference date is missing or invalid -> "no_reference_date" (NEVER marked overdue)
 *  - If deadline date < reference date -> "overdue"
 *  - If deadline date === reference date:
 *      * If reference time > deadline time -> "overdue" (days_overdue: 0, passed earlier today)
 *      * Otherwise -> "due_today"
 *  - If deadline date > reference date -> "upcoming"
 *
 * Time-of-day resolution order:
 *  1. Explicitly provided `referenceTime` parameter (e.g. "08:00", "09:30", "18:00").
 *  2. Time component extracted from ISO `referenceDate` string (e.g. "2026-09-23T09:30:00" -> "09:30").
 *  3. Default to "18:00" (EOD standard close of business).
 *
 * @param {object} commitment
 * @param {string} referenceDate - "YYYY-MM-DD" (or ISO string with time "YYYY-MM-DDTHH:MM:SS")
 * @param {string} [referenceTime] - Optional explicit "HH:MM". If omitted, extracts from ISO date or defaults to "18:00".
 * @returns {object} {
 *   computed_status: "completed"|"overdue"|"due_today"|"upcoming"|"no_deadline"|"unclear_ownership",
 *   days_overdue: number|null,
 *   days_until_due: number|null,
 *   is_actionable: boolean,
 *   evaluation_note: string
 * }
 */
/**
 * Helper to identify if a commitment represents pure calendar attendance
 * rather than a deliverable promise.
 *
 * @param {object} commitment
 * @returns {boolean}
 */
function isCalendarAttendance(commitment) {
  if (!commitment || typeof commitment !== "object") return false;
  if (commitment.commitment_type === "calendar" || commitment.commitment_type === "calendar_event") return true;
  if (commitment.source_type === "calendar") return true;
  if (Array.isArray(commitment.source_ids) && commitment.source_ids.length > 0 && commitment.source_ids.every((id) => typeof id === "string" && id.startsWith("cal_"))) return true;
  if (Array.isArray(commitment.evidence) && commitment.evidence.length > 0 && commitment.evidence.every((e) => e.source_type === "calendar")) return true;
  return false;
}

function evaluateDeadlineStatus(commitment, referenceDate, referenceTime = null) {
  if (!commitment || typeof commitment !== "object") {
    return {
      computed_status: "invalid_commitment",
      days_overdue: null,
      days_until_due: null,
      is_actionable: false,
      evaluation_note: "Invalid commitment input.",
    };
  }

  // Rule 1: Completed status is definitive
  if (commitment.status === "resolved") {
    return {
      computed_status: "completed",
      deadline_urgency: "completed",
      days_overdue: null,
      days_until_due: null,
      is_actionable: false,
      evaluation_note: "Commitment is verified completed/resolved in source evidence.",
    };
  }

  // Check if ownership is unclear (Rule 2)
  const isUnclearOwnership = commitment.status === "unclear_ownership" || !!commitment.ownership_unclear;

  // Rule 3: Missing reference date safety guard
  if (!referenceDate || typeof referenceDate !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(referenceDate)) {
    return {
      computed_status: isUnclearOwnership ? "unclear_ownership" : "no_reference_date",
      deadline_urgency: "no_reference_date",
      days_overdue: null,
      days_until_due: null,
      is_actionable: isUnclearOwnership,
      evaluation_note: isUnclearOwnership
        ? "Ownership is unclear in evidence; reference date not supplied or invalid."
        : "Reference date not supplied or invalid; cannot determine deadline status.",
    };
  }

  // Extract clean date portion "YYYY-MM-DD"
  const refDateStr = referenceDate.substring(0, 10);

  // Determine effective reference time: explicit > ISO timestamp > default "18:00" EOD
  let effectiveRefTime = "18:00";
  if (typeof referenceTime === "string" && referenceTime.trim()) {
    effectiveRefTime = referenceTime.trim();
  } else if (referenceDate.includes("T")) {
    const timeMatch = referenceDate.match(/T(\d{1,2}:\d{2})/);
    if (timeMatch) {
      effectiveRefTime = timeMatch[1];
    }
  }

  // Rule 4: Missing deadline safety guard
  const dlDateStr = commitment.deadline?.date;
  if (!dlDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dlDateStr)) {
    return {
      computed_status: isUnclearOwnership ? "unclear_ownership" : "no_deadline",
      deadline_urgency: "no_deadline",
      days_overdue: null,
      days_until_due: null,
      is_actionable: isUnclearOwnership,
      evaluation_note: isUnclearOwnership
        ? "Ownership is unclear in evidence; no explicit or supported deadline found."
        : "No explicit or supported deadline found in source evidence.",
    };
  }

  // Check if commitment is a calendar attendance event
  const isCalendar = isCalendarAttendance(commitment);

  // Compute date difference in calendar days
  const refTimeMs = new Date(`${refDateStr}T00:00:00Z`).getTime();
  const dlTimeMs  = new Date(`${dlDateStr}T00:00:00Z`).getTime();
  const diffDays  = Math.round((refTimeMs - dlTimeMs) / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    // Deadline date is strictly before reference date
    if (isCalendar) {
      return {
        computed_status: "past_event",
        deadline_urgency: "past_event",
        days_overdue: null,
        days_until_due: null,
        is_actionable: false,
        evaluation_note: `Calendar event concluded on ${dlDateStr}.`,
      };
    }

    return {
      computed_status: isUnclearOwnership ? "unclear_ownership" : "overdue",
      deadline_urgency: "overdue",
      days_overdue: diffDays,
      days_until_due: null,
      is_actionable: true,
      evaluation_note: isUnclearOwnership
        ? `Ownership is unclear in evidence; target deadline (${dlDateStr}) is overdue by ${diffDays} calendar day(s). Requires executive assignment.`
        : `Overdue by ${diffDays} calendar day(s). Target was ${dlDateStr}.`,
    };
  } else if (diffDays === 0) {
    // Due on the exact reference date
    // Compare time of day if precision is provided
    const dlTime24 = normalizeTimeOfDay(commitment.deadline?.time_of_day || commitment.deadline?.time_24h);
    const refTime24 = normalizeTimeOfDay(effectiveRefTime);

    if (refTime24 > dlTime24) {
      if (isCalendar) {
        return {
          computed_status: "past_event",
          deadline_urgency: "past_event",
          days_overdue: null,
          days_until_due: 0,
          is_actionable: false,
          evaluation_note: `Calendar event time (${commitment.deadline?.time_of_day || dlTime24}) has concluded for today.`,
        };
      }

      return {
        computed_status: isUnclearOwnership ? "unclear_ownership" : "overdue",
        deadline_urgency: "overdue",
        days_overdue: 0,
        days_until_due: 0,
        is_actionable: true,
        evaluation_note: isUnclearOwnership
          ? `Ownership is unclear in evidence; deadline is overdue today (Target was ${commitment.deadline?.time_of_day || dlTime24}, current time is ${effectiveRefTime}). Requires executive assignment.`
          : `Overdue today (Target was ${commitment.deadline?.time_of_day || dlTime24}, current time is ${effectiveRefTime}).`,
      };
    }

    return {
      computed_status: isUnclearOwnership ? "unclear_ownership" : "due_today",
      deadline_urgency: "due_today",
      days_overdue: null,
      days_until_due: 0,
      is_actionable: true,
      evaluation_note: isUnclearOwnership
        ? `Ownership is unclear in evidence; deadline is due today (${commitment.deadline?.time_of_day || 'EOD'}). Requires executive assignment.`
        : isCalendar
        ? `Scheduled calendar event today (${commitment.deadline?.time_of_day || 'EOD'}).`
        : `Due today (${commitment.deadline?.time_of_day || 'EOD'}).`,
    };
  } else {
    // Upcoming
    const daysUntil = Math.abs(diffDays);
    return {
      computed_status: isUnclearOwnership ? "unclear_ownership" : "upcoming",
      deadline_urgency: "upcoming",
      days_overdue: null,
      days_until_due: daysUntil,
      is_actionable: isUnclearOwnership ? true : false,
      evaluation_note: isUnclearOwnership
        ? `Ownership is unclear in evidence; deadline is upcoming in ${daysUntil} day(s) on ${dlDateStr}. Requires executive assignment.`
        : isCalendar
        ? `Scheduled calendar event in ${daysUntil} day(s) on ${dlDateStr}.`
        : `Upcoming in ${daysUntil} day(s) on ${dlDateStr}.`,
    };
  }
}

/**
 * Enriches a list of commitments with computed deadline status and metrics.
 * @param {object[]} commitments
 * @param {string} referenceDate "YYYY-MM-DD"
 * @param {string} [referenceTime] "HH:MM"
 * @returns {object[]}
 */
function enrichWithDeadlineStatus(commitments, referenceDate, referenceTime = null) {
  if (!Array.isArray(commitments)) return [];
  return commitments.map((c) => {
    const evalResult = evaluateDeadlineStatus(c, referenceDate, referenceTime);
    return {
      ...c,
      computed_status:  evalResult.computed_status,
      deadline_urgency: evalResult.deadline_urgency,
      days_overdue:     evalResult.days_overdue,
      days_until_due:   evalResult.days_until_due,
      is_actionable:    evalResult.is_actionable,
      deadline_evaluation: evalResult,
    };
  });
}

module.exports = {
  normalizeTimeOfDay,
  parseDeadlineFromText,
  evaluateDeadlineStatus,
  enrichWithDeadlineStatus,
  WEEKDAY_TO_DATE_2026_09,
  TIME_OF_DAY_STANDARDS,
};
