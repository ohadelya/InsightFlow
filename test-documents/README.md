# InsightFlow Regression Fixtures

This folder defines the stable fixture strategy for regression testing.

Goal: prevent behavior regressions across the analysis pipeline.

## Principles

- Keep representative documents for each supported document type.
- Validate stage outputs, not only final UI rendering.
- Use deterministic assertions (presence, language constraints, required slots, confidence bands).
- Do not include sensitive real-world personal data.

## Required fixture set

- Hebrew Resume
- English Resume
- Hebrew Contract
- English Contract
- Tender
- Requirements Specification

## Current fixture status

Use `manifest.json` as the authoritative list.

## Validation categories per fixture

1. Extraction gate outcome
2. Classification type and confidence band
3. Canonical slots presence (required slot types)
4. Localization guard checks
5. Decision label validity (never raw/internal where disallowed)

## Notes

- OCR-heavy documents may fail extraction and should be tracked separately as OCR fixtures.
- New fixtures must be added to `manifest.json` before they are used in CI.
