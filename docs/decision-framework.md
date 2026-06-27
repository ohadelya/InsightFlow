# InsightFlow Decision Framework

This document defines the expert reasoning model for the four supported document types:

1. Resume
2. Contract
3. Tender / RFP
4. Requirements / Specification

It is a product-intelligence specification for future prompts and dashboards. It does not prescribe implementation details.

---

## Resume

### 1. User Persona
- Primary: HR recruiter
- Secondary: Hiring manager

### 2. User Goal
- Core 30-second question: Should I continue with this candidate for the target role?

### 3. Primary Decisions
1. Continue to screening interview or stop.
2. Prioritize this candidate now or keep in pipeline.
3. What claims require verification in interview.
4. Which role family this profile best fits.
5. Whether missing information blocks decision quality.

### 4. High-value Insights (ranked)
1. Demonstrated role-relevant impact (outcomes, scale, accountability).
2. Fit between experience trajectory and target role scope.
3. Skill depth and recency in required tools/domains.
4. Evidence quality (specificity, consistency, credibility).
5. Risk signals (frequent unexplained transitions, vague claims).

### 5. Missing Information Detection
- Missing measurable achievements.
Why: Distinguishes candidates with similar titles and tenure.
- Missing context for responsibilities (team size, scope, ownership).
Why: Prevents overestimating seniority.
- Missing recency of key skills/tools.
Why: Reduces confidence in current capability.
- Missing employment timeline clarity.
Why: Affects reliability and interview planning.
- Missing contact/availability basics.
Why: Blocks process continuation.

### 6. Executive Brief Rules
- Synthesize cross-document signals (trajectory, impact, fit, risks), not the opening paragraph.
- Maximum 3 sentences:
Sentence 1: Who the candidate is professionally and where they are strongest.
Sentence 2: Why they are or are not a strong match for the likely target role.
Sentence 3: The highest-priority uncertainty to validate next.
- Must include evidence confidence framing (strong/moderate/weak signal) without over-claiming.

### 7. Recommendation Rules
- Recommendations must map to a hiring action (advance, hold, reject, validate specific claim).
- Each recommendation must cite evidence type (experience pattern, quantified result, skill recency, inconsistency).
- Recommendations must define next-step action (interview focus, reference check, ask for portfolio, request clarification).
- No generic advice; every recommendation must be tied to a concrete signal or gap in this resume.

### 8. Anti-patterns
- Never invent job fit beyond documented evidence.
- Never infer personality traits from formatting/style.
- Never prescribe generic certifications unless directly role-relevant.
- Never restate sections without decision value.
- Never hide uncertainty when evidence is thin.

---

## Contract

### 1. User Persona
- Primary: Business owner / procurement lead
- Secondary: Legal reviewer (non-advisory support)

### 2. User Goal
- Core 30-second question: What should I pay attention to before signing?

### 3. Primary Decisions
1. Proceed as-is, renegotiate, or escalate.
2. Which clauses create highest financial/operational exposure.
3. Whether obligations are feasible and clearly bounded.
4. Whether protections are sufficient for downside scenarios.
5. Whether unresolved ambiguities block signature.

### 4. High-value Insights (ranked)
1. Risk concentration (liability, indemnity, termination, penalties).
2. Obligation clarity (deliverables, SLAs, acceptance, timelines).
3. Protection asymmetry (one-sided terms, missing safeguards).
4. Trigger conditions and remedies (breach, cure periods, dispute flow).
5. Hidden operational burden (reporting, compliance, audit obligations).

### 5. Missing Information Detection
- Missing liability caps/exclusions.
Why: Directly affects worst-case exposure.
- Missing acceptance criteria or service definitions.
Why: Creates execution disputes and payment conflicts.
- Missing termination/cure mechanics.
Why: Increases lock-in and recovery risk.
- Missing data/privacy/security obligations where relevant.
Why: Compliance and reputational risk.
- Missing governing law/dispute mechanism.
Why: Escalates uncertainty during conflict.

### 6. Executive Brief Rules
- Synthesize the contract’s risk posture and commercial practicality across clauses.
- Maximum 3 sentences:
Sentence 1: Overall risk posture (balanced, moderate risk, high risk) with key reason.
Sentence 2: The two most consequential clauses/omissions.
Sentence 3: The immediate pre-signing action path (accept, negotiate specific points, escalate review).
- Must avoid legal advice language and stay in risk-identification mode.

### 7. Recommendation Rules
- Recommendations must be clause-specific and negotiation-ready.
- Each recommendation must include business impact if unaddressed.
- Actions must be concrete (request cap, clarify term, add carve-out, define acceptance test).
- Prioritize by risk severity and reversibility.

### 8. Anti-patterns
- Never provide legal advice or legal conclusions.
- Never claim a clause is safe without explicit evidence.
- Never ignore missing definitions that drive obligations.
- Never give generic “consult legal” as the only output.
- Never treat boilerplate as irrelevant by default.

---

## Tender / RFP

### 1. User Persona
- Primary: Bid manager / procurement response lead
- Secondary: Delivery manager / commercial lead

### 2. User Goal
- Core 30-second question: Can we realistically submit a competitive, compliant bid?

### 3. Primary Decisions
1. Bid / no-bid.
2. Whether internal capability aligns with scope and constraints.
3. Whether timeline and submission requirements are feasible.
4. Which compliance/document gaps threaten disqualification.
5. Which risks affect profitability or delivery certainty.

### 4. High-value Insights (ranked)
1. Bid feasibility under timeline and resource constraints.
2. Compliance criticality (mandatory docs, formal requirements).
3. Scope-risk hotspots (unclear deliverables, dependencies, penalties).
4. Competitive positioning requirements (evaluation criteria implications).
5. Cost-risk drivers (service levels, staffing, warranties, assumptions).

### 5. Missing Information Detection
- Missing mandatory submission artifacts list.
Why: Highest risk of administrative disqualification.
- Missing timeline clarity (milestones, Q&A windows, submission cutoff).
Why: Directly affects bid readiness.
- Missing evaluation weighting/criteria detail.
Why: Prevents strategic response prioritization.
- Missing scope boundaries/assumptions.
Why: Creates pricing and delivery exposure.
- Missing contractual annexes or referenced documents.
Why: Core obligations may be invisible.

### 6. Executive Brief Rules
- Synthesize bid viability by combining compliance, capacity, and risk.
- Maximum 3 sentences:
Sentence 1: Go/no-go posture with confidence level.
Sentence 2: The biggest blockers or risk concentrations.
Sentence 3: Immediate actions required before committing to bid.
- Must explicitly separate known requirements from inferred assumptions.

### 7. Recommendation Rules
- Recommendations must support a bid decision or a bid-readiness plan.
- Each recommendation must tie to a qualification risk, effort estimate driver, or disqualification risk.
- Actions must be operational (assign owner, gather missing annex, run compliance checklist, clarify scope).
- Prioritize recommendations by deadline criticality first, then business value.

### 8. Anti-patterns
- Never assume the company can deliver required capabilities.
- Never understate compliance/document completeness risk.
- Never infer customer intent beyond tender text.
- Never provide generic “submit quickly” guidance.
- Never collapse strategic and administrative risks into one score without explanation.

---

## Requirements / Specification

### 1. User Persona
- Primary: Business analyst / product manager
- Secondary: Engineering lead / QA lead

### 2. User Goal
- Core 30-second question: What must be clarified before development starts?

### 3. Primary Decisions
1. Is the spec actionable for implementation planning now.
2. Which ambiguities or contradictions block estimation.
3. Which dependencies/constraints must be resolved first.
4. Whether acceptance criteria are testable and complete.
5. What clarification sequence reduces delivery risk fastest.

### 4. High-value Insights (ranked)
1. Requirement clarity and testability.
2. Completeness of functional + non-functional scope.
3. Contradictions and unresolved assumptions.
4. Dependency and interface risks.
5. Traceability to measurable acceptance outcomes.

### 5. Missing Information Detection
- Missing acceptance criteria for core behaviors.
Why: Blocks QA and definition of done.
- Missing non-functional constraints (performance, security, reliability).
Why: High risk of late rework.
- Missing integration/interface definitions.
Why: Planning uncertainty and hidden complexity.
- Missing edge-case and failure-state behavior.
Why: Production risk and defect escape probability.
- Missing ownership/decision authority on open questions.
Why: Clarification stalls execution.

### 6. Executive Brief Rules
- Synthesize implementation readiness, not document prose quality.
- Maximum 3 sentences:
Sentence 1: Current readiness level (ready/partially ready/not ready) and why.
Sentence 2: Top ambiguity/contradiction clusters with highest delivery impact.
Sentence 3: Ordered clarification priorities before build kickoff.
- Must anchor statements in testability and delivery risk.

### 7. Recommendation Rules
- Recommendations must reduce ambiguity and improve execution readiness.
- Each recommendation must point to a specific gap class (criteria, dependency, contradiction, constraint).
- Actions must be concrete and assignable (define acceptance test, specify SLA, resolve conflicting requirement).
- Prioritize by impact on estimation accuracy and defect prevention.

### 8. Anti-patterns
- Never invent architecture or implementation details not in scope.
- Never label requirements as clear without testability evidence.
- Never conflate business intent with technical specification completeness.
- Never produce generic “add more detail” recommendations.
- Never ignore contradictions because “teams can clarify later.”
