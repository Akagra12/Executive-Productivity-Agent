/**
 * test_deadlines.js
 *
 * Dedicated test suite for deadline detection, normalization, and status logic.
 *
 * Covers all assignment requirements:
 * 1. Detecting explicit deadlines from phrases (EOD, morning, Wednesday evening, Thursday 9:30 AM).
 * 2. Status identification across upcoming, due_today, overdue, completed, and unclear states.
 * 3. Boundary precision: exact day matching, day before, day after.
 * 4. Safety rules: Missing deadline or missing reference date is NEVER marked overdue.
 * 5. Completed override: Completed items with passed deadlines remain completed and are not marked overdue.
 * 6. Source evidence preservation.
 */

const {
  normalizeTimeOfDay,
  parseDeadlineFromText,
  evaluateDeadlineStatus,
  enrichWithDeadlineStatus,
  WEEKDAY_TO_DATE_2026_09,
} = require("./src/services/deadlineEngine");
const svc = require("./src/services/commitmentService");

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName} — ${details}`);
  }
}

console.log("================================================================");
console.log("SUITE 1: Time-of-Day Phrase Normalization & Business Conventions");
console.log("================================================================");
assert(normalizeTimeOfDay("EOD") === "18:00", "EOD normalizes to 18:00");
assert(normalizeTimeOfDay("end of day") === "18:00", "end of day normalizes to 18:00");
assert(normalizeTimeOfDay("morning") === "09:00", "morning normalizes to 09:00");
assert(normalizeTimeOfDay("first thing") === "09:00", "first thing normalizes to 09:00");
assert(normalizeTimeOfDay("9:30 AM") === "09:30", "9:30 AM normalizes to 09:30");
assert(normalizeTimeOfDay("09:30") === "09:30", "09:30 normalizes to 09:30");
assert(normalizeTimeOfDay("5:00 PM") === "17:00", "5:00 PM normalizes to 17:00");
assert(normalizeTimeOfDay("noon") === "12:00", "noon normalizes to 12:00");
assert(normalizeTimeOfDay("") === "18:00", "Empty time defaults safely to EOD 18:00");

console.log("\n================================================================");
console.log("SUITE 2: Natural Language Phrase Parsing from Text");
console.log("================================================================");
{
  const p1 = parseDeadlineFromText("Please send this by Wednesday morning", "2026-09-22");
  assert(p1 && p1.date === "2026-09-23" && p1.time_24h === "09:00", "Parse 'Wednesday morning'");

  const p2 = parseDeadlineFromText("Let's review the deck on Thursday 9:30 AM", "2026-09-22");
  assert(p2 && p2.date === "2026-09-24" && p2.time_24h === "09:30", "Parse 'Thursday 9:30 AM'");

  const p3 = parseDeadlineFromText("Sign lease by Friday EOD", "2026-09-22");
  assert(p3 && p3.date === "2026-09-25" && p3.time_24h === "18:00", "Parse 'Friday EOD'");

  const p4 = parseDeadlineFromText("Running behind, will send first thing tomorrow morning instead", "2026-09-21");
  assert(p4 && p4.date === "2026-09-22" && p4.time_24h === "09:00", "Parse 'tomorrow morning' relative to Monday 21 Sep");

  const p5 = parseDeadlineFromText("No time mentioned in this message", "2026-09-22");
  assert(p5 === null, "Text with no deadline returns null without inventing");
}

console.log("\n================================================================");
console.log("SUITE 3: Deadline Boundary & State Evaluation (Target: 2026-09-24)");
console.log("================================================================");
{
  const testCommitment = {
    commitment_id: "c_boundary_test",
    title: "Prepare quarterly budget review",
    status: "pending",
    deadline: { date: "2026-09-24", time_of_day: "EOD" },
  };

  // Day before: 2026-09-23 -> Upcoming
  const before = evaluateDeadlineStatus(testCommitment, "2026-09-23");
  assert(before.computed_status === "upcoming" && before.days_until_due === 1, "Day before target is upcoming (1 day until due)");

  // Same day: 2026-09-24 -> Due Today
  const onDay = evaluateDeadlineStatus(testCommitment, "2026-09-24");
  assert(onDay.computed_status === "due_today" && onDay.is_actionable === true, "On target date is due_today and actionable");

  // Day after: 2026-09-25 -> Overdue by 1 day
  const after = evaluateDeadlineStatus(testCommitment, "2026-09-25");
  assert(after.computed_status === "overdue" && after.days_overdue === 1, "Day after target is overdue (1 day overdue)");

  // Three days after: 2026-09-27 -> Overdue by 3 days
  const threeDaysAfter = evaluateDeadlineStatus(testCommitment, "2026-09-27");
  assert(threeDaysAfter.computed_status === "overdue" && threeDaysAfter.days_overdue === 3, "3 days after target is overdue (3 days overdue)");
}

console.log("\n================================================================");
console.log("SUITE 4: Safety & Edge Cases (Missing DL, Missing Ref, Completed)");
console.log("================================================================");
{
  // 1. Missing deadline
  const noDl = { commitment_id: "c_no_dl", title: "General inquiry", status: "pending", deadline: null };
  const resNoDl = evaluateDeadlineStatus(noDl, "2026-09-25");
  assert(resNoDl.computed_status === "no_deadline" && resNoDl.days_overdue === null, "Item without deadline is NEVER marked overdue");

  // 2. Missing reference date
  const testC = { commitment_id: "c_test", status: "pending", deadline: { date: "2026-09-22" } };
  const resNoRef = evaluateDeadlineStatus(testC, null);
  assert(resNoRef.computed_status === "no_reference_date" && resNoRef.days_overdue === null, "Missing reference date is NEVER marked overdue");

  // 3. Completed item with past deadline
  const completedPast = {
    commitment_id: "c_done_past",
    title: "Delivered product deck",
    status: "resolved",
    deadline: { date: "2026-09-21" },
  };
  const resDone = evaluateDeadlineStatus(completedPast, "2026-09-25");
  assert(resDone.computed_status === "completed" && resDone.days_overdue === null, "Resolved task with past deadline remains completed (never overdue)");

  // 4. Unclear ownership item
  const unclear = {
    commitment_id: "c_unclear",
    title: "Sign office lease",
    status: "unclear_ownership",
    ownership_unclear: true,
    deadline: { date: "2026-09-25" },
  };
  const resUnclear = evaluateDeadlineStatus(unclear, "2026-09-23");
  assert(resUnclear.computed_status === "unclear_ownership" && resUnclear.is_actionable === true, "Unclear ownership item retains unclear_ownership and is actionable");
}

console.log("\n================================================================");
console.log("SUITE 5: BUG-001 Regression: Time-of-Day Precision & ISO Timestamps");
console.log("================================================================");
{
  const morningTask = {
    commitment_id: "c_morning_test",
    title: "Send vendor list to Raghav",
    status: "pending",
    deadline: { date: "2026-09-23", time_of_day: "morning" }, // 09:00
  };

  const eodTask = {
    commitment_id: "c_eod_test",
    title: "Submit weekly timesheet",
    status: "pending",
    deadline: { date: "2026-09-23", time_of_day: "EOD" }, // 18:00
  };

  // 1. Morning deadline at 08:00 -> due_today
  const res0800 = evaluateDeadlineStatus(morningTask, "2026-09-23", "08:00");
  assert(res0800.computed_status === "due_today" && res0800.days_overdue === null, "Morning deadline at 08:00 is due_today");

  // 2. Morning deadline at 09:30 -> overdue
  const res0930 = evaluateDeadlineStatus(morningTask, "2026-09-23", "09:30");
  assert(res0930.computed_status === "overdue" && res0930.days_overdue === 0, "Morning deadline at 09:30 is overdue (days_overdue: 0)");

  // 3. Morning deadline at 18:00 -> overdue
  const res1800 = evaluateDeadlineStatus(morningTask, "2026-09-23", "18:00");
  assert(res1800.computed_status === "overdue" && res1800.days_overdue === 0, "Morning deadline at 18:00 is overdue (days_overdue: 0)");

  // 4. Default referenceTime (omitted) on morning deadline -> overdue (evaluated at standard EOD close)
  const resDefault = evaluateDeadlineStatus(morningTask, "2026-09-23");
  assert(resDefault.computed_status === "overdue" && resDefault.days_overdue === 0, "Morning deadline with default referenceTime (18:00) is overdue");

  // 5. EOD deadline at 18:00 -> due_today
  const resEod1800 = evaluateDeadlineStatus(eodTask, "2026-09-23", "18:00");
  assert(resEod1800.computed_status === "due_today" && resEod1800.days_overdue === null, "EOD deadline at 18:00 is due_today");

  // 6. EOD deadline with default referenceTime (omitted) -> due_today
  const resEodDefault = evaluateDeadlineStatus(eodTask, "2026-09-23");
  assert(resEodDefault.computed_status === "due_today" && resEodDefault.days_overdue === null, "EOD deadline with default referenceTime is due_today");

  // 7. Time extracted from ISO referenceDate string:
  // 7a. "2026-09-23T08:00:00" -> due_today
  const resIsoBefore = evaluateDeadlineStatus(morningTask, "2026-09-23T08:00:00");
  assert(resIsoBefore.computed_status === "due_today", "ISO referenceDate '2026-09-23T08:00:00' extracts 08:00 -> due_today");

  // 7b. "2026-09-23T09:30:00" -> overdue
  const resIsoAfter = evaluateDeadlineStatus(morningTask, "2026-09-23T09:30:00");
  assert(resIsoAfter.computed_status === "overdue" && resIsoAfter.days_overdue === 0, "ISO referenceDate '2026-09-23T09:30:00' extracts 09:30 -> overdue");

  // 8. Explicit referenceTime overrides ISO string time
  const resOverride = evaluateDeadlineStatus(morningTask, "2026-09-23T18:00:00", "08:00");
  assert(resOverride.computed_status === "due_today", "Explicit referenceTime '08:00' overrides ISO string '18:00' -> due_today");
}

console.log("\n================================================================");
console.log("SUITE 6: Real Data Pack Commitments Status across Simulated Week");
console.log("================================================================");
{
  // c_001 (vendor list, latest deadline: 2026-09-23 morning)
  const c001_on_22 = svc.getById("c_001", "2026-09-22");
  assert(c001_on_22.computed_status === "upcoming" && c001_on_22.days_until_due === 1, "c_001 on Tue 22 Sep is upcoming (due tomorrow)");

  // c_001 on Wed 23 Sep at 08:00 (before morning 09:00 deadline) -> due_today
  const c001_on_23_early = svc.getById("c_001", "2026-09-23", "08:00");
  assert(c001_on_23_early.computed_status === "due_today", "c_001 on Wed 23 Sep at 08:00 AM is due_today (before 09:00)");

  // c_001 on Wed 23 Sep at 09:30 (after morning 09:00 deadline) -> overdue
  const c001_on_23_midday = svc.getById("c_001", "2026-09-23", "09:30");
  assert(c001_on_23_midday.computed_status === "overdue" && c001_on_23_midday.days_overdue === 0, "c_001 on Wed 23 Sep at 09:30 AM is overdue");

  // c_001 on Wed 23 Sep by default (EOD snapshot) -> overdue (matches source data status: 'overdue')
  const c001_on_23_default = svc.getById("c_001", "2026-09-23");
  assert(c001_on_23_default.computed_status === "overdue" && c001_on_23_default.days_overdue === 0, "c_001 on Wed 23 Sep (default) is overdue matching data pack truth");

  const c001_on_24 = svc.getById("c_001", "2026-09-24");
  assert(c001_on_24.computed_status === "overdue" && c001_on_24.days_overdue === 1, "c_001 on Thu 24 Sep is overdue by 1 day");

  const c001_on_25 = svc.getById("c_001", "2026-09-25");
  assert(c001_on_25.computed_status === "overdue" && c001_on_25.days_overdue === 2, "c_001 on Fri 25 Sep is overdue by 2 days");

  // c_002 (deck review, target: 2026-09-24 09:30)
  const c002_on_23 = svc.getById("c_002", "2026-09-23");
  assert(c002_on_23.computed_status === "upcoming" && c002_on_23.days_until_due === 1, "c_002 on Wed 23 Sep is upcoming (1 day)");

  // c_002 on Thu 24 Sep before 09:30 AM meeting -> due_today
  const c002_on_24_early = svc.getById("c_002", "2026-09-24", "09:00");
  assert(c002_on_24_early.computed_status === "due_today", "c_002 on Thu 24 Sep at 09:00 AM is due_today");

  // c_002 on Thu 24 Sep at EOD (after 09:30 AM meeting passed) -> overdue today
  const c002_on_24_eod = svc.getById("c_002", "2026-09-24");
  assert(c002_on_24_eod.computed_status === "overdue" && c002_on_24_eod.days_overdue === 0, "c_002 on Thu 24 Sep at EOD is overdue today");

  // c_003 (Neha prep deck, status: resolved)
  const c003_on_25 = svc.getById("c_003", "2026-09-25");
  assert(c003_on_25.computed_status === "completed", "c_003 (resolved) remains completed on Fri 25 Sep");
}

console.log("\n================================================================");
console.log("SUITE 7: BUG-004 Regression: Unclear Ownership Urgency & Ownership Preservation");
console.log("================================================================");
{
  const c004_raw = require("./src/data/sample/commitments_extracted.json").commitments.find(c => c.commitment_id === "c_004");

  // 1. Mumbai lease c_004 on 2026-09-23 -> upcoming (due in 2 days)
  const eval23 = evaluateDeadlineStatus(c004_raw, "2026-09-23");
  const c004_on_23 = svc.getById("c_004", "2026-09-23");
  assert(eval23.computed_status === "unclear_ownership", "c_004 on 2026-09-23 preserves computed_status: unclear_ownership");
  assert(eval23.deadline_urgency === "upcoming", "c_004 on 2026-09-23 evaluates deadline_urgency: upcoming");
  assert(c004_on_23.deadline_evaluation.deadline_urgency === "upcoming", "c_004 on 2026-09-23 via svc has deadline_evaluation.deadline_urgency: upcoming");
  assert(c004_on_23.days_until_due === 2, "c_004 on 2026-09-23 has days_until_due: 2");
  assert(c004_on_23.days_overdue === null, "c_004 on 2026-09-23 has days_overdue: null");
  assert(c004_on_23.owner === null, "c_004 on 2026-09-23 strictly preserves owner: null (no owner invented)");
  assert(c004_on_23.ownership_unclear === true, "c_004 on 2026-09-23 strictly preserves ownership_unclear: true");

  // 2. Mumbai lease c_004 on 2026-09-25 at 18:00 (EOD target date) -> due_today (not overdue)
  const eval25 = evaluateDeadlineStatus(c004_raw, "2026-09-25", "18:00");
  const c004_on_25 = svc.getById("c_004", "2026-09-25", "18:00");
  assert(eval25.computed_status === "unclear_ownership", "c_004 on 2026-09-25 preserves computed_status: unclear_ownership");
  assert(eval25.deadline_urgency === "due_today", "c_004 on 2026-09-25 evaluates deadline_urgency: due_today");
  assert(c004_on_25.deadline_evaluation.deadline_urgency === "due_today", "c_004 on 2026-09-25 via svc has deadline_evaluation.deadline_urgency: due_today");
  assert(c004_on_25.days_until_due === 0, "c_004 on 2026-09-25 has days_until_due: 0");
  assert(c004_on_25.days_overdue === null, "c_004 on 2026-09-25 has days_overdue: null (not overdue at exactly 18:00 EOD)");
  assert(c004_on_25.owner === null, "c_004 on 2026-09-25 strictly preserves owner: null");
  assert(c004_on_25.ownership_unclear === true, "c_004 on 2026-09-25 strictly preserves ownership_unclear: true");

  // 3. Mumbai lease c_004 on 2026-09-26 -> overdue (1 day overdue)
  const eval26 = evaluateDeadlineStatus(c004_raw, "2026-09-26");
  const c004_on_26 = svc.getById("c_004", "2026-09-26");
  assert(eval26.computed_status === "unclear_ownership", "c_004 on 2026-09-26 preserves computed_status: unclear_ownership");
  assert(eval26.deadline_urgency === "overdue", "c_004 on 2026-09-26 evaluates deadline_urgency: overdue");
  assert(c004_on_26.deadline_evaluation.deadline_urgency === "overdue", "c_004 on 2026-09-26 via svc has deadline_evaluation.deadline_urgency: overdue");
  assert(c004_on_26.days_overdue === 1, "c_004 on 2026-09-26 has days_overdue: 1");
  assert(c004_on_26.days_until_due === null, "c_004 on 2026-09-26 has days_until_due: null");
  assert(c004_on_26.owner === null, "c_004 on 2026-09-26 strictly preserves owner: null");
  assert(c004_on_26.ownership_unclear === true, "c_004 on 2026-09-26 strictly preserves ownership_unclear: true");

  // 4. Unclear item without a deadline is never overdue
  const unclearNoDl = {
    commitment_id: "c_unclear_nodl",
    title: "Arbitrary unassigned inquiry",
    status: "unclear_ownership",
    ownership_unclear: true,
    owner: null,
    deadline: null,
  };
  const resNoDl = evaluateDeadlineStatus(unclearNoDl, "2026-09-26");
  assert(resNoDl.computed_status === "unclear_ownership", "Unclear item with no deadline preserves computed_status: unclear_ownership");
  assert(resNoDl.deadline_urgency === "no_deadline", "Unclear item with no deadline has deadline_urgency: no_deadline");
  assert(resNoDl.days_overdue === null, "Unclear item with no deadline is NEVER marked overdue");
}

console.log("\n================================================================");
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log("================================================================");

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
