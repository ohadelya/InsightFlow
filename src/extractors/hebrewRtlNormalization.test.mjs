import test from "node:test";
import assert from "node:assert/strict";
import { normalizeHebrewRtlText } from "./hebrewRtlNormalization.js";

test("normalizes single reversed Hebrew token", () => {
  assert.equal(normalizeHebrewRtlText("תיצמת"), "תמצית");
});

test("normalizes reversed Hebrew section line", () => {
  assert.equal(normalizeHebrewRtlText("יתקוסעת ןויסינ"), "ניסיון תעסוקתי");
});

test("normalizes reversed military section", () => {
  assert.equal(normalizeHebrewRtlText("יאבצ תוריש"), "שירות צבאי");
});

test("normalizes reversed languages token", () => {
  assert.equal(normalizeHebrewRtlText("תופש"), "שפות");
});

test("normalizes reversed education token", () => {
  assert.equal(normalizeHebrewRtlText("הלכשה"), "השכלה");
});

test("keeps technical latin-only line unchanged", () => {
  assert.equal(normalizeHebrewRtlText("SQL Python Jira SAP"), "SQL Python Jira SAP");
});

test("normalizes Hebrew tokens and keeps tool names unchanged in mixed line", () => {
  assert.equal(
    normalizeHebrewRtlText("יתקוסעת ןויסינ SQL Python Jira SAP"),
    "ניסיון תעסוקתי SQL Python Jira SAP",
  );
});

test("keeps email phone and url unchanged", () => {
  const input = "test@example.com 050-1234567 https://example.com";
  assert.equal(normalizeHebrewRtlText(input), input);
});
