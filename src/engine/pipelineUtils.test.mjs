import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCandidateSnapshotFallback,
  dedupeNormalizedSlots,
  hasContactInfoSignals,
  mergeSkillsContent,
  normalizeLocalResumeSectionsToSlots,
  sanitizeListForLanguage,
  sanitizeTextForLanguage,
} from "./pipelineUtils.js";

test("dedupeNormalizedSlots prefers local factual slots", () => {
  const input = [
    {
      type: "languages",
      priority: 3,
      confidence: 0.55,
      source: "ai",
      content: ["English"],
    },
    {
      type: "languages",
      priority: 3,
      confidence: 0.51,
      source: "local",
      content: ["English", "Hebrew"],
    },
  ];

  const result = dedupeNormalizedSlots(input);

  assert.equal(result.length, 1);
  assert.equal(result[0].type, "languages");
  assert.equal(result[0].source, "local");
  assert.deepEqual(result[0].content, ["English", "Hebrew"]);
});

test("dedupeNormalizedSlots keeps higher confidence for non-factual types", () => {
  const input = [
    {
      type: "decision_summary",
      priority: 10,
      confidence: 0.7,
      source: "system",
      content: { reason: "A" },
    },
    {
      type: "decision_summary",
      priority: 10,
      confidence: 0.8,
      source: "ai",
      content: { reason: "B" },
    },
  ];

  const result = dedupeNormalizedSlots(input);

  assert.equal(result.length, 1);
  assert.equal(result[0].confidence, 0.8);
  assert.deepEqual(result[0].content, { reason: "B" });
});

test("mergeSkillsContent normalizes and deduplicates skill groups", () => {
  const aiContent = {
    technical: ["SQL", "Python"],
    tools: ["Jira"],
  };

  const localContent = {
    tech: ["Python", "React"],
    tools: ["Jira", "Power BI"],
    business: ["project management"],
  };

  const result = mergeSkillsContent(aiContent, localContent);

  assert.deepEqual(result, {
    technical: ["SQL", "Python", "React"],
    tools: ["Jira", "Power BI"],
    business: ["project management"],
  });
});

test("hasContactInfoSignals detects Hebrew phone label", () => {
  assert.equal(hasContactInfoSignals("פרטי קשר: טלפון 050-1234567"), true);
});

test("hasContactInfoSignals detects email", () => {
  assert.equal(hasContactInfoSignals("Contact: ohad@example.com"), true);
});

test("hasContactInfoSignals detects LinkedIn and GitHub URL", () => {
  assert.equal(hasContactInfoSignals("Profiles: https://linkedin.com/in/user and https://github.com/user"), true);
});

test("hasContactInfoSignals detects location/contact labels", () => {
  assert.equal(hasContactInfoSignals("Location: Tel Aviv"), true);
  assert.equal(hasContactInfoSignals("כתובת: תל אביב"), true);
});

test("hasContactInfoSignals returns false without contact clues", () => {
  assert.equal(hasContactInfoSignals("Experienced analyst with strong delivery execution"), false);
});

test("buildCandidateSnapshotFallback generates summary with role/orientation", () => {
  const text = "Systems analyst and project manager with years of experience in delivery and systems analysis across enterprise workflows since 2016.";
  const summary = buildCandidateSnapshotFallback(text, "en");
  assert.equal(typeof summary, "string");
  assert.equal(summary.includes("systems analyst") || summary.includes("project manager"), true);
});

test("buildCandidateSnapshotFallback does not invent unrelated facts", () => {
  const text = "Project manager leading cross-team execution and stakeholder communication across enterprise programs from 2019 to 2024, including planning, delivery tracking, and stakeholder governance in multiple long-running initiatives.";
  const summary = buildCandidateSnapshotFallback(text, "en");
  assert.equal(typeof summary, "string");
  assert.equal(summary.includes("QA professional"), false);
  assert.equal(summary.includes("data analyst"), false);
});

test("buildCandidateSnapshotFallback returns null when insufficient signals", () => {
  const text = "Strong professional with proven contribution.";
  assert.equal(buildCandidateSnapshotFallback(text, "en"), null);
});

test("sanitizeTextForLanguage filters English-only text in Hebrew mode", () => {
  const isMostlyHebrew = (value) => /[\u0590-\u05FF]/.test(value) && ((value.match(/[\u0590-\u05FF]/g) || []).length >= (value.match(/[A-Za-z]/g) || []).length);
  const result = sanitizeTextForLanguage("Add specific metrics and achievements", "he", "", isMostlyHebrew);
  assert.equal(result, "");
});

test("sanitizeTextForLanguage preserves Hebrew text", () => {
  const isMostlyHebrew = (value) => /[\u0590-\u05FF]/.test(value) && ((value.match(/[\u0590-\u05FF]/g) || []).length >= (value.match(/[A-Za-z]/g) || []).length);
  const result = sanitizeTextForLanguage("להוסיף הישגים מדידים", "he", "", isMostlyHebrew);
  assert.equal(result, "להוסיף הישגים מדידים");
});

test("sanitizeListForLanguage preserves mixed technical terms when mostly Hebrew", () => {
  const isMostlyHebrew = (value) => /[\u0590-\u05FF]/.test(value);
  const values = [
    "ניסיון עם SQL, Python, Jira ו-SAP",
    "Add metrics",
  ];
  const result = sanitizeListForLanguage(values, "he", isMostlyHebrew);
  assert.deepEqual(result, ["ניסיון עם SQL, Python, Jira ו-SAP"]);
});

test("normalizeLocalResumeSectionsToSlots creates consistent local slot objects", () => {
  const localResumeSections = {
    languages: {
      items: ["עברית", "אנגלית"],
      confidence: 0.9,
      source: "explicit-header",
      evidence: ["header:שפות"],
    },
  };
  const dashboardSlots = [
    { type: "languages", title: "Languages", priority: 3 },
  ];

  const result = normalizeLocalResumeSectionsToSlots({
    localResumeSections,
    dashboardSlots,
    uiLanguage: "he",
    localizeTitle: (type, title, language) => (language === "he" && type === "languages" ? "שפות" : title),
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].type, "languages");
  assert.equal(result[0].title, "שפות");
  assert.equal(result[0].source, "local");
  assert.equal(typeof result[0].confidence_reason, "string");
  assert.deepEqual(result[0].content, ["עברית", "אנגלית"]);
});

test("normalizeLocalResumeSectionsToSlots skips empty or low-confidence sections", () => {
  const localResumeSections = {
    languages: {
      items: [],
      confidence: 0.9,
      source: "explicit-header",
      evidence: [],
    },
    education: {
      items: ["B.A."],
      confidence: 0.5,
      source: "semantic-pattern",
      evidence: [],
    },
  };
  const dashboardSlots = [
    { type: "languages", title: "Languages", priority: 3 },
    { type: "education", title: "Education", priority: 3 },
  ];

  const result = normalizeLocalResumeSectionsToSlots({
    localResumeSections,
    dashboardSlots,
    uiLanguage: "en",
    localizeTitle: (_type, title) => title,
  });

  assert.deepEqual(result, []);
});
