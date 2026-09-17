/**
 * store.js
 *
 * Purpose: Simple in-memory data store.
 *
 * Why no database?
 * - The MVP uses static sample data from the data pack. There is no user-generated
 *   data to persist across server restarts. A DB would add complexity with no benefit.
 * - The store is a plain JS module — a singleton pattern in Node.js since require()
 *   caches modules. Any route that imports store will share the same object.
 *
 * What it holds:
 * - sourceMessages: flat array of normalized SourceMessage objects (output of normalizer)
 * - rawSources:     the original parsed JSON for each source type (for source evidence display)
 * - lastProcessed:  ISO timestamp of when the store was last populated
 */

const store = {
  /** @type {object[]} Normalized, chronologically sorted SourceMessages */
  sourceMessages: [],

  /** @type {object} Raw parsed data files for evidence / traceability */
  rawSources: {
    meeting: null,
    emails: null,
    calendar: null,
    voiceNotes: null,
  },

  /** @type {string|null} ISO timestamp of last successful ingestion */
  lastProcessed: null,

  /** @type {string[]} Any errors that occurred during the last ingestion */
  ingestionErrors: [],

  /**
   * Clears and replaces the store with fresh data.
   * @param {object[]} messages  - Array of normalized SourceMessage objects
   * @param {object}   rawData   - The raw source files that were ingested
   * @param {string[]} errors    - Validation errors from normalizer
   */
  populate(messages, rawData, errors = []) {
    this.sourceMessages = messages;
    this.rawSources = rawData;
    this.lastProcessed = new Date().toISOString();
    this.ingestionErrors = errors;
  },

  /** Returns a summary suitable for API responses */
  getSummary() {
    const counts = { meeting_transcript: 0, email: 0, calendar: 0, voice_note: 0 };
    this.sourceMessages.forEach((m) => {
      if (counts[m.source_type] !== undefined) counts[m.source_type]++;
    });
    return {
      total_messages: this.sourceMessages.length,
      by_source_type: counts,
      last_processed: this.lastProcessed,
      ingestion_errors: this.ingestionErrors,
    };
  },

  /** Returns messages filtered by source type */
  getBySourceType(type) {
    return this.sourceMessages.filter((m) => m.source_type === type);
  },

  /** Returns a single message by its ID */
  getById(id) {
    return this.sourceMessages.find((m) => m.id === id) || null;
  },
};

module.exports = store;
