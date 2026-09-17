/**
 * queryService.js
 *
 * Purpose: Natural query processing engine for executive queries.
 * Answers key assignment questions such as:
 *  - "What did I promise Raghav?"
 *  - "What needs action today?"
 *  - "What is Neha responsible for?"
 *  - "Show me items with unclear ownership"
 *  - "What is overdue?"
 *
 * Uses deterministic intent classification and entity extraction so it runs
 * reliably offline with zero external API calls or latency.
 */

const svc = require("./commitmentService");
const { classifyAll } = require("./classifier");

// Known executive team members and their aliases
const CONTACTS = [
  {
    name: "Raghav Sethi",
    aliases: ["raghav", "sethi", "raghav sethi", "raghav.sethi"],
    email: "raghav.sethi@veridian-corp.example",
    role: "Engineering Director",
  },
  {
    name: "Neha Kapoor",
    aliases: ["neha", "kapoor", "neha kapoor", "neha.kapoor"],
    email: "neha.kapoor@veridian-corp.example",
    role: "Product Lead",
  },
  {
    name: "Divya Rao",
    aliases: ["divya", "rao", "divya rao", "divya.rao"],
    email: "divya.rao@veridian-corp.example",
    role: "Finance Lead",
  },
  {
    name: "Priya Nair",
    aliases: ["priya", "nair", "priya nair", "priya.nair"],
    email: "priya.nair@veridian-corp.example",
    role: "Chief of Staff",
  },
  {
    name: "Arjun Malhotra",
    aliases: ["arjun", "me", "i", "myself", "arjun malhotra", "arjun.malhotra"],
    email: "arjun.malhotra@veridian-corp.example",
    role: "Executive (User)",
  },
];

/**
 * Identify a contact mentioned in the query text.
 * @param {string} query
 * @returns {object|null}
 */
function findContact(query) {
  const lower = query.toLowerCase();
  for (const contact of CONTACTS) {
    for (const alias of contact.aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, "i");
      if (regex.test(lower)) {
        return contact;
      }
    }
  }
  return null;
}

/**
 * Classify user intent and return matching commitments with a natural language explanation.
 *
 * @param {string} rawQuery
 * @param {string} referenceDate
 * @returns {object}
 */
function answerExecutiveQuery(rawQuery, referenceDate = "2026-09-23") {
  if (!rawQuery || typeof rawQuery !== "string" || !rawQuery.trim()) {
    return {
      query: rawQuery,
      intent: "empty",
      answer: "Please enter a question, e.g., 'What did I promise Raghav?' or 'What needs action today?'",
      results: [],
      reference_date: referenceDate,
    };
  }

  const query = rawQuery.trim().toLowerCase();
  const allCommitments = svc.getAll(referenceDate);
  const contact = findContact(query);

  // Intent 1: "What did I promise [Person]?" / "My promises to [Person]"
  if (
    (query.includes("promise") || query.includes("commit") || query.includes("owed") || query.includes("deliver")) &&
    contact &&
    contact.name !== "Arjun Malhotra"
  ) {
    const promises = svc.getArjunPromisesTo(contact.email, referenceDate);
    return {
      query: rawQuery,
      intent: "promises_to_person",
      matched_contact: contact,
      confidence: 0.95,
      answer: promises.length > 0
        ? `You made ${promises.length} commitment(s) to ${contact.name} (${contact.email}).`
        : `No active commitments found where you promised deliverables to ${contact.name}.`,
      results: promises,
      reference_date: referenceDate,
    };
  }

  // Intent 2: "What is [Person] working on / responsible for?"
  if (
    (query.includes("what is") || query.includes("tasks for") || query.includes("assigned to") || query.includes("waiting on")) &&
    contact &&
    contact.name !== "Arjun Malhotra"
  ) {
    const tasks = svc.getByPerson(contact.email, "owner", referenceDate);
    return {
      query: rawQuery,
      intent: "person_tasks",
      matched_contact: contact,
      confidence: 0.90,
      answer: tasks.length > 0
        ? `${contact.name} is responsible for ${tasks.length} task(s).`
        : `No tasks found assigned to ${contact.name}.`,
      results: tasks,
      reference_date: referenceDate,
    };
  }

  // Intent 3: "What needs action today?" / "Due today" / "Action items"
  if (
    query.includes("today") ||
    query.includes("action") ||
    query.includes("needs action") ||
    query.includes("urgent") ||
    query.includes("my tasks") ||
    query.includes("what do i have to do")
  ) {
    const actionable = svc.getActionableToday(referenceDate, true);
    return {
      query: rawQuery,
      intent: "actionable_today",
      confidence: 0.95,
      answer: actionable.length > 0
        ? `You have ${actionable.length} item(s) requiring action as of ${referenceDate}.`
        : `No urgent items due or overdue on ${referenceDate}.`,
      results: actionable,
      reference_date: referenceDate,
    };
  }

  // Intent 4: "What is overdue?" / "Overdue items"
  if (query.includes("overdue") || query.includes("late") || query.includes("delayed") || query.includes("missed")) {
    const overdue = allCommitments.filter((c) => c.computed_status === "overdue");
    return {
      query: rawQuery,
      intent: "overdue_items",
      confidence: 0.95,
      answer: overdue.length > 0
        ? `There are ${overdue.length} overdue commitment(s).`
        : `No overdue items found as of ${referenceDate}.`,
      results: overdue,
      reference_date: referenceDate,
    };
  }

  // Intent 5: "Unclear ownership" / "Unassigned" / "Flagged"
  if (
    query.includes("unclear") ||
    query.includes("unassigned") ||
    query.includes("ownership") ||
    query.includes("flag") ||
    query.includes("orphan")
  ) {
    const unclear = svc.getUnclearOwnership(referenceDate);
    return {
      query: rawQuery,
      intent: "unclear_ownership",
      confidence: 0.95,
      answer: unclear.length > 0
        ? `There are ${unclear.length} item(s) flagged with unclear ownership needing executive assignment.`
        : `No items with unclear ownership detected.`,
      results: unclear,
      reference_date: referenceDate,
    };
  }

  // Intent 6: General contact lookup fallback
  if (contact) {
    const personItems = svc.getByPerson(contact.email, "any", referenceDate);
    return {
      query: rawQuery,
      intent: "contact_overview",
      matched_contact: contact,
      confidence: 0.80,
      answer: `Found ${personItems.length} commitment(s) involving ${contact.name}.`,
      results: personItems,
      reference_date: referenceDate,
    };
  }

  // Intent 7: Keyword search across title, description, and verbatim evidence
  const keywords = query.replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
  const matched = allCommitments.filter((c) => {
    const text = [
      c.title,
      c.description,
      c.owner,
      c.recipient,
      ...(c.evidence || []).map((e) => e.verbatim),
    ].join(" ").toLowerCase();
    return keywords.some((k) => text.includes(k));
  });

  return {
    query: rawQuery,
    intent: "keyword_search",
    confidence: 0.70,
    answer: matched.length > 0
      ? `Found ${matched.length} commitment(s) matching "${rawQuery}".`
      : `No commitments matched your query "${rawQuery}". Try asking "What did I promise Raghav?" or "What needs action today?"`,
    results: matched,
    reference_date: referenceDate,
  };
}

module.exports = {
  answerExecutiveQuery,
  CONTACTS,
};
