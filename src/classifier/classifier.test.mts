import test from "node:test";
import assert from "node:assert/strict";
import { classifyDocumentType } from "./index.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Hebrew resume covering 6 categories: header, contact, experience, education, skills, languages */
const HEBREW_RESUME_FULL = `קורות חיים
שם: יעל כהן
טלפון: 050-1234567
מייל: test@example.com

ניסיון תעסוקתי
2020-2024 - מנהלת פרויקטים בחברת טכנולוגיה

השכלה
תואר ראשון במערכות מידע, אוניברסיטת חיפה 2018

מיומנויות
SQL, Python, Jira, Excel

שפות
עברית שפת אם, אנגלית ברמה גבוהה
`;

/** Hebrew resume with words scattered / reversed as pdf2json might produce (RTL issue) */
const HEBREW_RESUME_PARTIAL_RTL = `חיים קורות
כהן יעל
050-1234567 :טלפון
test@example.com :מייל
תעסוקתי ניסיון
חיפה אוניברסיטת ,מידע מערכות ראשון תואר
כישורים
שפות עברית אנגלית
`;

/** Text with only 2 resume signals — must NOT trigger structural override at high confidence */
const WEAK_RESUME_TEXT = "experience\nSQL developer role";

/** Non-resume document — contract — must not be misclassified as resume */
const CONTRACT_TEXT = `SERVICE AGREEMENT
This agreement is entered into between Party A and Party B.
Terms and conditions apply. Termination clause included.
Effective date: 2024-01-01. Obligations outlined herein.
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("classifyDocumentType — Hebrew resume (full) → resume with confidence ≥ 0.85 and structuralOverride", () => {
  const result = classifyDocumentType(HEBREW_RESUME_FULL);
  assert.equal(result.docType, "resume", `Expected 'resume', got '${result.docType}'. Reason: ${result.reason}`);
  assert(result.confidence >= 0.85, `Expected confidence ≥ 0.85, got ${result.confidence}. Reason: ${result.reason}`);
  assert.equal(result.structuralOverride, true, `Expected structuralOverride=true. Reason: ${result.reason}`);
});

test("classifyDocumentType — Hebrew resume with partial RTL scatter → resume", () => {
  const result = classifyDocumentType(HEBREW_RESUME_PARTIAL_RTL);
  assert.equal(result.docType, "resume", `Expected 'resume', got '${result.docType}'. Reason: ${result.reason}`);
  assert.equal(result.structuralOverride, true, `Expected structuralOverride=true. Reason: ${result.reason}`);
});

test("classifyDocumentType — structuralOverride confidence is never below 0.70", () => {
  // Any document that triggers structuralOverride must have confidence ≥ 0.70
  for (const fixture of [HEBREW_RESUME_FULL, HEBREW_RESUME_PARTIAL_RTL]) {
    const result = classifyDocumentType(fixture);
    if (result.structuralOverride) {
      assert(
        result.confidence >= 0.70,
        `structuralOverride was set but confidence is ${result.confidence} (< 0.70). Reason: ${result.reason}`,
      );
    }
  }
});

test("classifyDocumentType — weak text (2 signals) does NOT trigger structuralOverride at high confidence", () => {
  const result = classifyDocumentType(WEAK_RESUME_TEXT);
  // If it sets structuralOverride it must be at lower confidence (< 0.85)
  if (result.structuralOverride) {
    assert(
      result.confidence < 0.85,
      `Weak text should not reach 0.85 structural override confidence, got ${result.confidence}`,
    );
  }
  // It's acceptable to classify weak text as generic or low-confidence resume
});

test("classifyDocumentType — contract text is not misclassified as resume", () => {
  const result = classifyDocumentType(CONTRACT_TEXT);
  assert.notEqual(result.docType, "resume", `Contract text should not be classified as resume. Reason: ${result.reason}`);
});
