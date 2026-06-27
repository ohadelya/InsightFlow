import { readFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { classifyDocumentType } from "../../src/classifier/index.ts";
import { assessDocumentQuality } from "../../src/classifier/documentQuality.ts";
import { extractResumeLocalSections } from "../../src/extractors/resumeLocalExtractor.ts";
import { documentDashboards } from "../../src/product/documentDashboards.ts";
import {
  localizeDecisionLabel,
  localizeSlotTitle,
  normalizeLanguage,
  isMostlyHebrew,
} from "../../src/product/localization.ts";
import * as pipelineUtils from "../../src/engine/pipelineUtils.js";

const pipeline = pipelineUtils.default || pipelineUtils;

const {
  hasContactInfoSignals,
  normalizeLocalResumeSectionsToSlots,
  sanitizeTextForLanguage,
} = pipeline;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesRoot = path.resolve(__dirname, "../fixtures");

const fixtureDefinitions = [
  { id: "resume-he", displayName: "Resume HE" },
  { id: "resume-en", displayName: "Resume EN" },
  { id: "contract-he", displayName: "Contract HE" },
  { id: "contract-en", displayName: "Contract EN" },
  { id: "tender", displayName: "Tender" },
  { id: "requirements", displayName: "Requirements" },
];

function parseExpected(json) {
  const data = JSON.parse(json);
  return {
    expectedDocumentType: String(data.expectedDocumentType || "generic"),
    expectedLanguage: String(data.expectedLanguage || "en"),
    requiredSlotTypes: Array.isArray(data.requiredSlotTypes) ? data.requiredSlotTypes.map(String) : [],
    forbiddenUserFacingStrings: Array.isArray(data.forbiddenUserFacingStrings)
      ? data.forbiddenUserFacingStrings.map(String)
      : [],
    requiredUserFacingLanguage: String(data.requiredUserFacingLanguage || data.expectedLanguage || "en"),
    expectQualityValid: Boolean(data.expectQualityValid),
    maxAllowedTotalMs: Number(data.maxAllowedTotalMs || 5000),
  };
}

function validateLanguage(userFacingStrings, requiredLanguage) {
  const joined = userFacingStrings.join(" ");
  if (requiredLanguage === "he") {
    const hebrewChars = (joined.match(/[\u0590-\u05FF]/g) || []).length;
    const latinChars = (joined.match(/[A-Za-z]/g) || []).length;
    return hebrewChars > 0 && hebrewChars >= latinChars;
  }

  const latinChars = (joined.match(/[A-Za-z]/g) || []).length;
  return latinChars > 0;
}

async function runFixture(definition) {
  const fixturePath = path.join(fixturesRoot, definition.id);
  const textPath = path.join(fixturePath, "extracted-text.txt");
  const expectedPath = path.join(fixturePath, "expected.json");

  const [rawText, rawExpected] = await Promise.all([
    readFile(textPath, "utf8"),
    readFile(expectedPath, "utf8"),
  ]);

  const text = rawText.trim();
  const expected = parseExpected(rawExpected);
  const start = performance.now();

  const errors = [];
  const quality = assessDocumentQuality(text);
  if (expected.expectQualityValid && !quality.isValid) {
    errors.push(`quality gate failed (${quality.reason})`);
  }

  const classification = classifyDocumentType(text);
  if (classification.docType !== expected.expectedDocumentType) {
    errors.push(
      `classification mismatch: expected ${expected.expectedDocumentType}, got ${classification.docType}`,
    );
  }

  const detectedLanguage = isMostlyHebrew(text) ? "he" : "en";
  if (expected.expectedLanguage !== detectedLanguage) {
    errors.push(`language mismatch: expected ${expected.expectedLanguage}, got ${detectedLanguage}`);
  }

  const uiLanguage = normalizeLanguage(expected.expectedLanguage);
  const dashboard = documentDashboards[expected.expectedDocumentType] || documentDashboards.generic;
  const localSlots = expected.expectedDocumentType === "resume"
    ? normalizeLocalResumeSectionsToSlots({
        localResumeSections: extractResumeLocalSections(text),
        dashboardSlots: dashboard.slots,
        uiLanguage,
        localizeTitle: localizeSlotTitle,
      })
    : [];

  for (const requiredType of expected.requiredSlotTypes) {
    if (!localSlots.some((slot) => slot.type === requiredType)) {
      errors.push(`missing required slot type from local extraction: ${requiredType}`);
    }
  }

  if (expected.expectedDocumentType === "resume" && !hasContactInfoSignals(text)) {
    errors.push("resume contact signal check failed");
  }

  const userFacingStrings = [
    ...dashboard.slots.slice(0, 5).map((slot) => localizeSlotTitle(slot.type, slot.title, uiLanguage)),
    ...localSlots.map((slot) => String(slot.title || "")),
    localizeDecisionLabel("positive", uiLanguage),
    sanitizeTextForLanguage("Candidate Snapshot", uiLanguage, "", isMostlyHebrew),
  ].filter(Boolean);

  for (const forbidden of expected.forbiddenUserFacingStrings) {
    const hit = userFacingStrings.some((value) => value.toLowerCase().includes(forbidden.toLowerCase()));
    if (hit) {
      errors.push(`forbidden user-facing string found: ${forbidden}`);
    }
  }

  if (!validateLanguage(userFacingStrings, expected.requiredUserFacingLanguage)) {
    errors.push(`user-facing language validation failed for ${expected.requiredUserFacingLanguage}`);
  }

  const totalMs = Math.round(performance.now() - start);
  if (totalMs > expected.maxAllowedTotalMs) {
    errors.push(`performance budget exceeded: ${totalMs}ms > ${expected.maxAllowedTotalMs}ms`);
  }

  return {
    id: definition.id,
    displayName: definition.displayName,
    pass: errors.length === 0,
    errors,
    totalMs,
  };
}

function printHumanSummary(results) {
  console.log("InsightFlow Regression");
  console.log("");

  for (const result of results) {
    console.log(`${result.displayName}: ${result.pass ? "PASS" : "FAIL"}`);
  }

  const failures = results.filter((result) => !result.pass);
  console.log("");
  if (failures.length > 0) {
    console.log("Failures:");
    for (const failure of failures) {
      for (const error of failure.errors) {
        console.log(`- ${failure.displayName}: ${error}`);
      }
    }
    console.log("");
  }

  console.log(`Ready for human review: ${failures.length === 0 ? "YES" : "NO"}`);
}

async function main() {
  const results = [];
  for (const fixture of fixtureDefinitions) {
    results.push(await runFixture(fixture));
  }

  const ready = results.every((result) => result.pass);
  const jsonMode = process.argv.includes("--json");

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify({ ready, results })}\n`);
  } else {
    printHumanSummary(results);
  }

  if (!ready) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
