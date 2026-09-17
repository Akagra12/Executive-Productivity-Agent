/**
 * normalizer.js
 *
 * Purpose: Converts each of the 4 raw source formats from the data pack into
 * a single, unified SourceMessage schema that the agent pipeline can process
 * uniformly regardless of origin.
 *
 * Unified SourceMessage schema:
 * {
 *   id:           string   — globally unique across all source types
 *   source_type:  string   — "meeting_transcript" | "email" | "calendar" | "voice_note"
 *   source_ref:   string   — original ID from the source file (email_id, entry_id, note_id, etc.)
 *   timestamp:    string   — ISO 8601 datetime string (date + time combined, TZ assumed IST)
 *   from:         string   — email address of the sender / recorder
 *   to:           string[] — recipients (empty array if not applicable, e.g. calendar / voice note)
 *   content:      string   — the raw text the LLM will read
 *   metadata:     object   — source-specific extra fields (thread_id, subject, speaker, etc.)
 * }
 *
 * Design decisions:
 * - All times are stored as ISO strings so date comparison is unambiguous
 * - null times (e.g. Raghav Fri 25 Sep entries) produce a timestamp of date + "T00:00:00" and
 *   a flag metadata.time_unknown = true — never invented
 * - Meeting transcript lines are emitted as individual SourceMessages per speaker turn
 *   so the LLM can reason about who said what
 * - Calendar "Blocked" entries are typed as "blocked" and included so the agent can
 *   cross-reference Arjun's availability, but they carry a flag metadata.is_blocked = true
 *   to prevent them from being mistaken for commitments
 */

const TIMEZONE_OFFSET = "+05:30"; // IST — all source data is in this timezone

/**
 * Build an ISO 8601 timestamp from a date string and 24h time string.
 * @param {string} date - "YYYY-MM-DD"
 * @param {string|null} time - "HH:MM" or null
 * @returns {{ timestamp: string, time_unknown: boolean }}
 */
function buildTimestamp(date, time) {
  if (!time) {
    return {
      timestamp: `${date}T00:00:00${TIMEZONE_OFFSET}`,
      time_unknown: true,
    };
  }
  return {
    timestamp: `${date}T${time}:00${TIMEZONE_OFFSET}`,
    time_unknown: false,
  };
}

/**
 * Validate that a required field is present and non-empty.
 * Throws a descriptive error that includes the source ID for traceability.
 */
function requireField(value, fieldName, sourceId) {
  if (value === undefined || value === null || value === "") {
    throw new Error(
      `[Normalizer] Missing required field "${fieldName}" in source "${sourceId}"`
    );
  }
}

// ── Meeting Transcript ───────────────────────────────────────────────────────

/**
 * Normalizes a meeting transcript JSON object.
 * Each speaker turn becomes a separate SourceMessage so the LLM can
 * attribute commitments to the correct speaker.
 *
 * @param {object} transcript - Contents of meeting_transcript.json
 * @returns {object[]} Array of SourceMessage objects
 */
function normalizeMeetingTranscript(transcript) {
  requireField(transcript.meeting_id, "meeting_id", "meeting_transcript");
  requireField(transcript.date, "date", transcript.meeting_id);
  requireField(transcript.transcript, "transcript", transcript.meeting_id);

  const speakerEmailMap = {};
  (transcript.attendees || []).forEach((a) => {
    speakerEmailMap[a.name.split(" ")[0]] = a.email; // "Arjun" → arjun.malhotra@...
  });

  return transcript.transcript.map((turn, index) => {
    requireField(turn.speaker, "speaker", `${transcript.meeting_id}[${index}]`);
    requireField(turn.text, "text", `${transcript.meeting_id}[${index}]`);

    const { timestamp } = buildTimestamp(transcript.date, transcript.start_time);
    const senderEmail =
      speakerEmailMap[turn.speaker] || `unknown-${turn.speaker.toLowerCase()}`;

    return {
      id: `mt_${transcript.meeting_id}_turn_${index + 1}`,
      source_type: "meeting_transcript",
      source_ref: transcript.meeting_id,
      timestamp,
      from: senderEmail,
      to: transcript.attendees
        .map((a) => a.email)
        .filter((e) => e !== senderEmail),
      content: `[${turn.speaker} in ${transcript.title}]: ${turn.text}`,
      metadata: {
        meeting_id: transcript.meeting_id,
        meeting_title: transcript.title,
        meeting_date: transcript.date,
        speaker: turn.speaker,
        speaker_email: senderEmail,
        turn_index: index + 1,
        all_attendees: transcript.attendees.map((a) => a.email),
      },
    };
  });
}

// ── Email Threads ────────────────────────────────────────────────────────────

/**
 * Normalizes all email threads into individual SourceMessages — one per email.
 *
 * @param {object} emailData - Contents of emails.json
 * @returns {object[]} Array of SourceMessage objects
 */
function normalizeEmails(emailData) {
  requireField(emailData.threads, "threads", "emails.json");

  const messages = [];

  emailData.threads.forEach((thread) => {
    requireField(thread.thread_id, "thread_id", "emails.json thread");
    requireField(thread.subject, "subject", thread.thread_id);
    requireField(thread.emails, "emails", thread.thread_id);

    thread.emails.forEach((email) => {
      requireField(email.email_id, "email_id", thread.thread_id);
      requireField(email.date, "date", email.email_id);
      requireField(email.from, "from", email.email_id);
      requireField(email.body, "body", email.email_id);

      const { timestamp, time_unknown } = buildTimestamp(email.date, email.time);

      messages.push({
        id: email.email_id,
        source_type: "email",
        source_ref: email.email_id,
        timestamp,
        from: email.from,
        to: Array.isArray(email.to) ? email.to : [email.to].filter(Boolean),
        content: email.body,
        metadata: {
          thread_id: thread.thread_id,
          subject: thread.subject,
          sequence: email.sequence,
          time_unknown,
        },
      });
    });
  });

  return messages;
}

// ── Calendar ─────────────────────────────────────────────────────────────────

/**
 * Normalizes calendar entries for all people into SourceMessages.
 * Only Arjun's calendar entries are the primary focus (he is the user),
 * but all 4 calendars are included for cross-referencing.
 *
 * @param {object} calendarData - Contents of calendar.json
 * @returns {object[]} Array of SourceMessage objects
 */
function normalizeCalendar(calendarData) {
  requireField(calendarData.calendars, "calendars", "calendar.json");

  const messages = [];

  calendarData.calendars.forEach((personCal) => {
    requireField(personCal.person, "person", "calendar.json");
    requireField(personCal.email, "email", personCal.person);
    requireField(personCal.entries, "entries", personCal.person);

    personCal.entries.forEach((entry) => {
      requireField(entry.entry_id, "entry_id", personCal.person);
      requireField(entry.date, "date", entry.entry_id);
      requireField(entry.event, "event", entry.entry_id);

      const { timestamp, time_unknown } = buildTimestamp(
        entry.date,
        entry.time_start
      );

      messages.push({
        id: entry.entry_id,
        source_type: "calendar",
        source_ref: entry.entry_id,
        timestamp,
        from: personCal.email,
        to: [],
        // Content phrased so LLM understands what it is
        content: `[Calendar — ${personCal.person}] ${entry.date}${entry.time_start ? ` ${entry.time_start}` : ""}: ${entry.event}`,
        metadata: {
          person: personCal.person,
          person_email: personCal.email,
          date: entry.date,
          time_start: entry.time_start,
          time_end: entry.time_end,
          event_type: entry.type,
          is_blocked: entry.type === "blocked",
          time_unknown,
        },
      });
    });
  });

  return messages;
}

// ── Voice Notes ───────────────────────────────────────────────────────────────

/**
 * Normalizes voice notes into SourceMessages.
 * Voice notes are personal memos from Arjun — not messages to anyone else.
 * The "to" field is empty; the agent should treat them as Arjun's own
 * internal commitments / reminders.
 *
 * @param {object} voiceNoteData - Contents of voice_notes.json
 * @returns {object[]} Array of SourceMessage objects
 */
function normalizeVoiceNotes(voiceNoteData) {
  requireField(voiceNoteData.voice_notes, "voice_notes", "voice_notes.json");

  return voiceNoteData.voice_notes.map((note) => {
    requireField(note.note_id, "note_id", "voice_notes.json");
    requireField(note.recorded_by, "recorded_by", note.note_id);
    requireField(note.transcript, "transcript", note.note_id);

    const { timestamp, time_unknown } = buildTimestamp(note.date, note.time);

    return {
      id: note.note_id,
      source_type: "voice_note",
      source_ref: note.note_id,
      timestamp,
      from: note.recorded_by,
      to: [], // personal memo — no recipient
      content: `[Voice memo by Arjun]: ${note.transcript}`,
      metadata: {
        context: note.context,
        time_unknown,
        is_personal_memo: true,
      },
    };
  });
}

// ── Master normalizer ─────────────────────────────────────────────────────────

/**
 * Loads all 4 sample data files and returns a single flat array of
 * SourceMessage objects sorted chronologically.
 *
 * @param {object} rawData - Object with keys: meeting, emails, calendar, voiceNotes
 *   Each value is the parsed JSON from the corresponding sample file.
 * @returns {{ messages: object[], errors: string[] }}
 */
function normalizeAll(rawData) {
  const errors = [];
  let messages = [];

  const process = (label, fn, input) => {
    try {
      const result = fn(input);
      messages = messages.concat(result);
    } catch (err) {
      errors.push(`[${label}] ${err.message}`);
    }
  };

  process("meeting_transcript", normalizeMeetingTranscript, rawData.meeting);
  process("emails", normalizeEmails, rawData.emails);
  process("calendar", normalizeCalendar, rawData.calendar);
  process("voice_notes", normalizeVoiceNotes, rawData.voiceNotes);

  // Sort all messages chronologically by timestamp
  messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return { messages, errors };
}

module.exports = {
  normalizeMeetingTranscript,
  normalizeEmails,
  normalizeCalendar,
  normalizeVoiceNotes,
  normalizeAll,
};
