/**
 * test_filters.js
 *
 * Dedicated test suite for BUG-002 & BUG-003:
 * Validates query parameter filters (category, person, role) on commitments
 * both at the service layer and live HTTP API layer.
 */

const svc = require("./src/services/commitmentService");
const BASE_URL = "http://localhost:3001";

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

async function runFilterTests() {
  console.log("================================================================");
  console.log("SUITE 1: Service-Level Query Filter Validation");
  console.log("================================================================");

  // 1. No filters -> returns all 7 commitments
  const all = svc.getFiltered({}, "2026-09-23");
  assert(all.length === 7, "No filters returns all 7 commitments");

  // 2. Category filters
  const myActions = svc.getFiltered({ category: "my_action" }, "2026-09-23");
  assert(
    myActions.length === 4 &&
      myActions.every((c) => c.category === "my_action") &&
      myActions.map((c) => c.commitment_id).sort().join(",") === "c_001,c_002,c_006,c_007",
    "category=my_action returns exactly 4 commitments (c_001, c_002, c_006, c_007)"
  );

  const waiting = svc.getFiltered({ category: "waiting_on_others" }, "2026-09-23");
  assert(
    waiting.length === 2 &&
      waiting.every((c) => c.category === "waiting_on_others") &&
      waiting.map((c) => c.commitment_id).sort().join(",") === "c_003,c_005",
    "category=waiting_on_others returns exactly 2 commitments (c_003, c_005)"
  );

  const unclear = svc.getFiltered({ category: "unclear_ownership" }, "2026-09-23");
  assert(
    unclear.length === 1 && unclear[0].commitment_id === "c_004",
    "category=unclear_ownership returns exactly 1 commitment (c_004)"
  );

  const nonExistentCat = svc.getFiltered({ category: "non_existent_category" }, "2026-09-23");
  assert(nonExistentCat.length === 0, "Non-existent category returns 0 commitments");

  // 3. Person & Role filters
  const raghavRecipient = svc.getFiltered(
    { person: "raghav.sethi@veridian-corp.example", role: "recipient" },
    "2026-09-23"
  );
  assert(
    raghavRecipient.length === 1 && raghavRecipient[0].commitment_id === "c_001",
    "person=raghav & role=recipient returns 1 commitment (c_001)"
  );

  const raghavOwner = svc.getFiltered(
    { person: "raghav.sethi@veridian-corp.example", role: "owner" },
    "2026-09-23"
  );
  assert(raghavOwner.length === 0, "person=raghav & role=owner returns 0 commitments");

  const raghavEither = svc.getFiltered(
    { person: "raghav.sethi@veridian-corp.example", role: "either" },
    "2026-09-23"
  );
  assert(
    raghavEither.length === 1 && raghavEither[0].commitment_id === "c_001",
    "person=raghav & role=either returns 1 commitment (c_001)"
  );

  const raghavDefaultRole = svc.getFiltered(
    { person: "raghav.sethi@veridian-corp.example" },
    "2026-09-23"
  );
  assert(
    raghavDefaultRole.length === 1 && raghavDefaultRole[0].commitment_id === "c_001",
    "person=raghav without explicit role defaults to 'either' -> returns 1 commitment"
  );

  const arjunOwner = svc.getFiltered(
    { person: "arjun.malhotra@veridian-corp.example", role: "owner" },
    "2026-09-23"
  );
  assert(
    arjunOwner.length === 4 &&
      arjunOwner.map((c) => c.commitment_id).sort().join(",") === "c_001,c_002,c_006,c_007",
    "person=arjun & role=owner returns 4 commitments (c_001, c_002, c_006, c_007)"
  );

  const arjunRecipient = svc.getFiltered(
    { person: "arjun.malhotra@veridian-corp.example", role: "recipient" },
    "2026-09-23"
  );
  assert(
    arjunRecipient.length === 2 &&
      arjunRecipient.map((c) => c.commitment_id).sort().join(",") === "c_003,c_005",
    "person=arjun & role=recipient returns 2 commitments (c_003, c_005)"
  );

  const arjunEither = svc.getFiltered(
    { person: "arjun.malhotra@veridian-corp.example", role: "either" },
    "2026-09-23"
  );
  assert(arjunEither.length === 6, "person=arjun & role=either returns 6 commitments");

  const nehaRecipient = svc.getFiltered(
    { person: "neha.kapoor@veridian-corp.example", role: "recipient" },
    "2026-09-23"
  );
  assert(
    nehaRecipient.length === 1 && nehaRecipient[0].commitment_id === "c_002",
    "person=neha & role=recipient returns 1 commitment (c_002)"
  );

  const nehaOwner = svc.getFiltered(
    { person: "neha.kapoor@veridian-corp.example", role: "owner" },
    "2026-09-23"
  );
  assert(
    nehaOwner.length === 1 && nehaOwner[0].commitment_id === "c_003",
    "person=neha & role=owner returns 1 commitment (c_003)"
  );

  // 4. Combined Filters
  const combinedMatch = svc.getFiltered(
    {
      category: "my_action",
      person: "neha.kapoor@veridian-corp.example",
      role: "recipient",
    },
    "2026-09-23"
  );
  assert(
    combinedMatch.length === 1 && combinedMatch[0].commitment_id === "c_002",
    "Combined category=my_action + person=neha + role=recipient returns c_002"
  );

  const combinedMismatch = svc.getFiltered(
    {
      category: "my_action",
      person: "neha.kapoor@veridian-corp.example",
      role: "owner",
    },
    "2026-09-23"
  );
  assert(
    combinedMismatch.length === 0,
    "Combined category=my_action + person=neha + role=owner returns 0 commitments"
  );

  console.log("\n================================================================");
  console.log("SUITE 2: HTTP API Layer Validation (GET /api/commitments)");
  console.log("================================================================");

  try {
    const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

    // HTTP 1. No filters
    const rNoFilter = await (await fetch(`${BASE_URL}/api/commitments?date=2026-09-23`)).json();
    assert(rNoFilter.status === "ok", "HTTP GET /api/commitments returns status ok");
    assert(rNoFilter.count === 7, "HTTP GET /api/commitments without filters returns count 7");
    assert(
      rNoFilter.filters_applied &&
        rNoFilter.filters_applied.category === null &&
        rNoFilter.filters_applied.person === null &&
        rNoFilter.filters_applied.role === null,
      "HTTP response returns filters_applied with null fields when no filters provided"
    );

    // HTTP 2. Category filter
    const rCat = await (
      await fetch(`${BASE_URL}/api/commitments?category=my_action&date=2026-09-23`)
    ).json();
    assert(rCat.count === 4, "HTTP ?category=my_action returns count 4");
    assert(rCat.filters_applied.category === "my_action", "HTTP response echoes category filter");

    // HTTP 3. Person and Role filter
    const rPersonRole = await (
      await fetch(
        `${BASE_URL}/api/commitments?person=raghav.sethi@veridian-corp.example&role=recipient&date=2026-09-23`
      )
    ).json();
    assert(rPersonRole.count === 1, "HTTP ?person=raghav&role=recipient returns count 1");
    assert(
      rPersonRole.commitments[0].commitment_id === "c_001",
      "HTTP ?person=raghav&role=recipient returns commitment c_001"
    );
    assert(
      rPersonRole.filters_applied.role === "recipient",
      "HTTP response echoes role: recipient"
    );

    // HTTP 4. Combined filters
    const rCombined = await (
      await fetch(
        `${BASE_URL}/api/commitments?category=waiting_on_others&person=neha.kapoor@veridian-corp.example&role=owner&date=2026-09-23`
      )
    ).json();
    assert(
      rCombined.count === 1 && rCombined.commitments[0].commitment_id === "c_003",
      "HTTP combined filters return expected single commitment (c_003)"
    );

    // HTTP 5. Invalid role returns 400
    const rInvalidRoleRes = await fetch(`${BASE_URL}/api/commitments?role=invalid_role`);
    assert(rInvalidRoleRes.status === 400, "HTTP invalid role returns 400 Bad Request");
    const rInvalidJson = await rInvalidRoleRes.json();
    assert(
      rInvalidJson.status === "error" && rInvalidJson.message.includes("Invalid role parameter"),
      "HTTP invalid role returns descriptive error message"
    );
  } catch (err) {
    console.error("  [HTTP SUITE ERROR] Server may need to be restarted: ", err.message);
  }

  console.log("\n================================================================");
  console.log(
    `TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round(
      (passedTests / totalTests) * 100
    )}%)`
  );
  console.log("================================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFilterTests();
