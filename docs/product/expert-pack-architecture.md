# Expert Pack Architecture

## Future Flow
Engine
↓
Classifier
↓
Expert Pack
↓
Decision Framework
↓
Dashboard
↓
Exports

## Layer Definitions

### Engine
Core execution layer responsible for orchestration, guardrails, and consistent output contracts. The Engine manages processing flow and reliability expectations.

### Classifier
Determines the supported document type and routes analysis to the correct Expert Pack. Classification is a routing decision, not a final business conclusion.

### Expert Pack
A domain module that encapsulates role-specific reasoning logic, priorities, anti-patterns, and recommendation philosophy for one document family.

### Decision Framework
The explicit reasoning schema applied by each Expert Pack:
- User objective.
- Primary decisions.
- High-value insight ranking.
- Missing-information logic.
- Executive brief rules.
- Recommendation rules and anti-patterns.

### Dashboard
Presentation layer for decision-ready outputs. The dashboard expresses reasoning results as clear, scannable decision artifacts without exposing unnecessary processing complexity.

### Exports
Operational handoff layer for reports, audits, and downstream workflow systems. Exports preserve decision rationale, evidence links, and action items.

## Why Expert Packs Are the Extensibility Mechanism
- Hardcoded document types create brittle growth and high maintenance coupling.
- Expert Packs separate domain reasoning from core runtime, enabling independent evolution.
- New document families can be added by defining reasoning contracts instead of rewriting global logic.
- Expert Packs allow organization-specific variants (policy, tone, risk model) while preserving a stable platform core.
- This mechanism supports product scalability from four types today to a modular catalog tomorrow.

## Strategic Outcome
Expert Packs make InsightFlow a Decision Intelligence platform, not a fixed-feature analyzer. The platform can expand by adding reasoning modules rather than reworking core architecture.
