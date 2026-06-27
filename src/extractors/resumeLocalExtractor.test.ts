import test from 'node:test';
import assert from 'node:assert/strict';
import { extractResumeLocalSections } from './resumeLocalExtractor.ts';

test('extracts sections from varied headers and order', () => {
  const text = `
  Professional Summary
  Experienced analyst and project manager.

  Military Service
  IDF officer, 6 years of service.

  Language Skills
  Hebrew native; English fluent.

  Academic Background
  B.A. in Computer Science, University of Tel Aviv.
  `;

  const result = extractResumeLocalSections(text);

  assert.equal(result.languages?.items[0]?.toLowerCase().includes('hebrew'), true);
  assert.equal(result.military_service?.confidence >= 0.6, true);
  assert.equal(result.education?.confidence >= 0.6, true);
});

test('extracts sections from flattened text without line breaks', () => {
  const text = `
  אוהד אלישיב 054-770989 | ohad060795@gmail.com
  תמצית אנליסט מערכות ומנהל פרויקטים.
  ניסיון תעסוקתי 2022 – היום | מנתח מערכות.
  השכלה 2021 – היום | האוניברסיטה הפתוחה, תואר ראשון BA בניהול ומדעי המחשב.
  שירות צבאי 2013 – 2018 | שירות צבאי מלא וקבע, מפקד כלי שיט.
  שפות עברית – שפת אם, אנגלית – שליטה מלאה.
  `;

  const result = extractResumeLocalSections(text);

  assert.equal(result.education?.confidence >= 0.6, true);
  assert.equal(result.military_service?.confidence >= 0.6, true);
  assert.equal(result.languages?.items.some((item) => item.toLowerCase().includes('עברית') || item.toLowerCase().includes('english') || item.toLowerCase().includes('אנגלית')), true);
});

test('avoids false positives from ambiguous words', () => {
  const text = `
  The service team improved the process.
  We discussed languages in general terms.
  `;

  const result = extractResumeLocalSections(text);

  assert.equal(result.military_service, undefined);
  assert.equal(result.languages, undefined);
});
