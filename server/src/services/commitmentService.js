/**
 * commitmentService.js
 *
 * Purpose: Business logic layer for commitment data.
 * Sits between the raw extracted JSON and the route handlers.
 * Loads commitments from disk on first call and holds them in memory.
 *
 * Responsibilities:
 * - Load and validate the commitments_extracted.json file
 * - Filter by status, category, person, or date
 * - Resolve "what is overdue given a reference date?"
 * - Resolve "what is due today?"
 * - Answer queries like "What did Arjun promise Raghav?"
 *
 * Design rule: THIS SERVICE NEVER INVENTS OR MODIFIES COMMITMENT DATA.
 * It only reads, filters, and enriches with computed fields (e.g. days_overdue).
 * All original source evidence is preserved in every returned object.
 */

const path = require("path");
const fs   = require("fs");
const { classify, classifyAll, groupByLabel } = require("./classifier");

const COMMITMENTS_FILE = path.join(
  __dirname,
  "../data/sample/commitments_extracted.json"
);

const { 
  evaluateDeadlineStatus, 
  enrichWithDeadlineStatus 
} = require("./deadlineEngine");

// Cache: loaded once on first call, held for the process lifetime
let _cache = null;

/**
 * Loads and returns all commitments from disk.
 * Caches on first call. Call clearCache() to force a reload.
 * @returns {object[]}
 */
function loadCommitments() {
  if (_cache) return _cache;

  try {
    const raw = fs.readFileSync(COMMITMENTS_FILE, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.commitments)) {
      throw new Error(
        "commitments_extracted.json must have a top-level 'commitments' array"
      );
    }

    _cache = parsed.commitments;
    return _cache;
  } catch (err) {
    throw new Error(`[CommitmentService] Failed to load commitments: ${err.message}`);
  }
}

/** Clears the cache so the file is re-read on next call (useful for development) */
function clearCache() {
  _cache = null;
}

// ── Status computation ────────────────────────────────────────────────────────

/**
 * Given a commitment and a reference date string ("YYYY-MM-DD"),
 * returns a computed status using deadlineEngine.
 */
function computeStatus(commitment, referenceDate, referenceTime = null) {
  return evaluateDeadlineStatus(commitment, referenceDate, referenceTime).computed_status;
}

/**
 * Computes how many calendar days overdue a commitment is.
 * Returns null if not overdue or no deadline.
 */
function daysOverdue(commitment, referenceDate, referenceTime = null) {
  return evaluateDeadlineStatus(commitment, referenceDate, referenceTime).days_overdue;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns all commitments, optionally enriched with computed status.
 * @param {string} [referenceDate] "YYYY-MM-DD" — if provided, adds computed_status and days_overdue
 * @param {string} [referenceTime] "HH:MM"
 * @returns {object[]}
 */
function getAll(referenceDate, referenceTime = null) {
  const commitments = loadCommitments();
  if (!referenceDate) return commitments;
  return enrichWithDeadlineStatus(commitments, referenceDate, referenceTime);
}

/**
 * Returns a single commitment by its ID.
 * @param {string} id
 * @param {string} [referenceDate]
 * @param {string} [referenceTime]
 * @returns {object|null}
 */
function getById(id, referenceDate, referenceTime = null) {
  const commitments = loadCommitments();
  const c = commitments.find((x) => x.commitment_id === id) || null;
  if (!c || !referenceDate) return c;
  const evalResult = evaluateDeadlineStatus(c, referenceDate, referenceTime);
  return {
    ...c,
    computed_status: evalResult.computed_status,
    days_overdue:    evalResult.days_overdue,
    days_until_due:  evalResult.days_until_due,
    is_actionable:   evalResult.is_actionable,
    deadline_evaluation: evalResult,
  };
}

/**
 * Returns commitments filtered by category.
 * Valid categories: "my_action" | "waiting_on_others" | "unclear_ownership"
 */
function getByCategory(category, referenceDate, referenceTime = null) {
  return getAll(referenceDate, referenceTime).filter((c) => c.category === category);
}

/**
 * Filters commitments by flexible criteria: category, person, and role.
 *
 * @param {object} filters
 * @param {string} [filters.category] - "my_action" | "waiting_on_others" | "unclear_ownership"
 * @param {string} [filters.person] - Participant email address
 * @param {"owner"|"recipient"|"either"} [filters.role="either"] - Role to filter for person
 * @param {string} [referenceDate] - "YYYY-MM-DD"
 * @param {string} [referenceTime] - "HH:MM"
 * @returns {object[]}
 */
function getFiltered({ category, person, role } = {}, referenceDate, referenceTime = null) {
  let list = getAll(referenceDate, referenceTime);

  if (category && typeof category === "string") {
    const catNorm = category.trim().toLowerCase();
    list = list.filter((c) => c.category && c.category.toLowerCase() === catNorm);
  }

  if (person && typeof person === "string") {
    const emailNorm = person.trim().toLowerCase();
    const roleNorm = (role || "either").trim().toLowerCase();

    list = list.filter((c) => {
      const ownerMatch = c.owner && c.owner.toLowerCase() === emailNorm;
      const recipientMatch = c.recipient && c.recipient.toLowerCase() === emailNorm;

      if (roleNorm === "owner") return Boolean(ownerMatch);
      if (roleNorm === "recipient") return Boolean(recipientMatch);
      return Boolean(ownerMatch || recipientMatch);
    });
  }

  return list;
}

/**
 * Returns commitments where the given email is the owner OR the recipient.
 * Used to answer "What did I promise Raghav?" (filter owner=arjun + recipient=raghav)
 * or "What is Neha responsible for?" (filter owner=neha).
 *
 * @param {string} email
 * @param {"owner"|"recipient"|"any"} [role="any"]
 * @param {string} [referenceDate]
 */
function getByPerson(email, role, referenceDate) {
  const all = getAll(referenceDate);
  const normalised = email.toLowerCase();

  return all.filter((c) => {
    const ownerMatch =
      c.owner && c.owner.toLowerCase() === normalised;
    const recipientMatch =
      c.recipient && c.recipient.toLowerCase() === normalised;

    if (role === "owner") return ownerMatch;
    if (role === "recipient") return recipientMatch;
    return ownerMatch || recipientMatch; // "any"
  });
}

/**
 * Returns commitments where Arjun is the owner AND the given person is the recipient.
 * Directly answers: "What did I promise [person]?"
 *
 * @param {string} recipientEmail
 * @param {string} [referenceDate]
 */
function getArjunPromisesTo(recipientEmail, referenceDate) {
  const ARJUN = "arjun.malhotra@veridian-corp.example";
  const all = getAll(referenceDate);
  const normalised = recipientEmail.toLowerCase();

  return all.filter(
    (c) =>
      c.owner &&
      c.owner.toLowerCase() === ARJUN.toLowerCase() &&
      c.recipient &&
      c.recipient.toLowerCase() === normalised
  );
}

/**
 * Returns commitments that are due or overdue on the reference date.
 * This is the core of "What needs action today?"
 *
 * @param {string} referenceDate "YYYY-MM-DD"
 * @param {boolean} [includeArjunOnly=true] If true, only returns items Arjun owns or must act on
 */
function getActionableToday(referenceDate, includeArjunOnly = true) {
  const ARJUN = "arjun.malhotra@veridian-corp.example";
  const all = getAll(referenceDate);

  return all.filter((c) => {
    const status = c.computed_status;
    const isActionable = status === "overdue" || status === "due_today";
    if (!isActionable) return false;
    if (!includeArjunOnly) return true;
    // Include items Arjun owns OR items with unclear ownership (he needs to resolve them)
    return (
      (c.owner && c.owner.toLowerCase() === ARJUN.toLowerCase()) ||
      c.ownership_unclear
    );
  });
}

/**
 * Returns commitments with unclear ownership.
 * Used to populate the "Flag for Attention" section of the daily brief.
 */
function getUnclearOwnership(referenceDate) {
  return getAll(referenceDate).filter((c) => c.ownership_unclear === true);
}

/**
 * Returns a structured daily brief summary grouped into the 4 sections
 * required by the assignment. Uses the classifier to determine each section,
 * so classification labels (not raw category strings) are the authority.
 *
 * @param {string} referenceDate "YYYY-MM-DD"
 */
function getDailyBriefData(referenceDate) {
  const all        = getAll(referenceDate);
  const classified = classifyAll(all);
  const grouped    = groupByLabel(classified);

  // Overdue: my_action items whose deadline has passed
  const overdueItems = grouped.my_action.filter(
    (c) => c.computed_status === "overdue"
  );

  return {
    reference_date:   referenceDate,
    my_actions:       grouped.my_action,
    waiting_on_others:grouped.waiting_on_others,
    overdue:          overdueItems,
    unclear_ownership:grouped.unclear_ownership,
    completed:        grouped.completed,
    stats: {
      total:                 all.length,
      my_actions_count:      grouped.stats.my_action_count,
      waiting_count:         grouped.stats.waiting_on_others_count,
      overdue_count:         overdueItems.length,
      unclear_count:         grouped.stats.unclear_ownership_count,
      completed_count:       grouped.stats.completed_count,
    },
  };
}

module.exports = {
  loadCommitments,
  clearCache,
  getAll,
  getById,
  getByCategory,
  getByPerson,
  getFiltered,
  getArjunPromisesTo,
  getActionableToday,
  getUnclearOwnership,
  getDailyBriefData,
  // Re-export classifier utilities for convenience
  classifyAll,
  groupByLabel,
};

