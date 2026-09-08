---
name: motivation-to-evidence
description: Deepen a change dossier from stakeholder concern and drivers through assessments, goals, measurable outcomes, requirements, and acceptance evidence. Use explicitly when value, motivation, stakeholder conflict, or causal assumptions are material. Do not design the implementation.
---

# Motivation to Evidence

## Purpose

Create a traceable motivation model that preserves ArchiMate-like concepts while
adding epistemic status and measurable evidence. Prevent polished prose or a
diagram from turning unsupported claims into facts.

## Inputs

- current GitHub Issue/change dossier;
- authoritative stakeholder statements and evidence;
- applicable obligations/principles/constraints;
- existing outcome measures and baselines;
- risk route.

## Model

```text
Stakeholder / Concern
        ↓
Driver
        ↓
Assessment
        ↓
Goal
        ↓
Outcome
        ↓
Requirement
        ↓
Acceptance evidence
```

Principles, constraints, and defined meaning may constrain goals, outcomes, and
requirements. Conflicts must remain visible.

## Record for every material statement

- stable ID (`MOT-###`, `OUT-###`, or `REQ-###` as appropriate);
- statement;
- owner/accountable interpreter;
- source;
- epistemic status: observed fact / stakeholder claim / hypothesis / constraint /
  decision;
- supporting and contrary evidence;
- confidence with rationale;
- risk if wrong or omitted;
- dependencies and conflicts;
- date/version applicability.

## Outcomes

Every `OUT-###` must include:

- beneficiary and possible disbeneficiaries;
- baseline;
- target/direction;
- measure and data source;
- measurement window;
- causal hypothesis connecting the change to the outcome;
- confounders/trade-offs;
- owner and review date.

Include the do-nothing option and cost of inaction.

## Procedure

1. Preserve the originator's language before normalising terminology.
2. Separate observed evidence from interpretation.
3. Identify stakeholders and conflicting concerns.
4. Derive drivers and assessments without silently merging them.
5. Convert goals into measurable outcomes where possible.
6. Link requirements only to outcomes/constraints they actually serve.
7. Define what evidence would confirm or falsify each material outcome and
   requirement.
8. Report orphan goals, unsupported assessments, requirements without outcomes,
   outcomes without owners/measures, and unresolved conflicts.
9. Update the normative Issue body or produce a proposed patch; do not mark it
   accepted.

## Output

Produce:

1. a readable Motivation section suitable for the Issue;
2. a traceability table;
3. a list of conflicts, assumptions, unknowns, and decision owners;
4. the next required acceptance/evidence work.

Do not create an ArchiMate diagram until the underlying model is accepted. A
diagram is a projection, not evidence.

## Stop conditions

Stop rather than invent when:

- the beneficiary or decision owner is unavailable;
- a target is a business judgement with no accountable acceptance;
- a legal/regulatory claim lacks an authoritative source;
- stakeholders disagree on value or acceptable harm;
- evidence cannot distinguish a fact from a hypothesis.

Do not select an architecture, write code, approve the Issue, or claim that an
outcome will occur merely because the feature can be implemented.

## Pipeline handoff

Return a concise purpose anchor (beneficiary, accepted outcome/invariant, guardrails,
non-goals and trade-offs) for implementation/review. Define when new evidence must
reopen the outcome hypothesis. Use the accepted semantic vocabulary (NAM-01); do not
turn an unverified name into a domain fact. This skill is not required merely because
a tiny change exists; reference the already accepted outcome where sufficient.
