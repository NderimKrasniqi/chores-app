# Chores — Design Source of Truth

This directory defines the production UX and visual design direction for Chores.

It exists so product behavior, UX decisions, visual design, and React Native
implementation do not silently drift apart.

## Authority hierarchy

1. `src/docs/product.md` — product behavior and constraints
2. `src/docs/domain.md` — domain terminology, invariants, and state models
3. `src/docs/architecture.md` — technical and authority boundaries
4. `src/docs/specs.md` — observable product behavior
5. `design/ux/*` — information architecture and UX decisions
6. `design/patterns/*` — reusable interaction patterns
7. Approved HTML screens — visual source of truth
8. React Native implementation — downstream implementation

If an HTML design conflicts with approved product/domain behavior,
the product/domain documentation wins.

## Core principle

> Product and domain documentation define what is true.
> The design workspace defines how that truth is presented.
> Approved HTML screens are the visual source of truth for production implementation.

## Selected visual direction

**Concept E** is the currently selected visual direction.

Concept E is playful, warm, optimistic and reward-aware while keeping money,
commitments, deadlines and parental review grounded in real product behavior.

Reference material lives under:

`design/references/concept-e/`

The reference itself is not authoritative. Approved HTML remains the production
visual source of truth.

## Screen statuses

### Exploration

Early visual or structural ideas.

May contain competing alternatives.

Not implementation-ready.

### Draft

A coherent proposed direction exists, but important design decisions may still change.

### Review

The design is ready for human review.

It must not be treated as approved yet.

### Approved

The design has received explicit human approval.

This is the visual source of truth for implementation.

### Implemented

The corresponding production React Native UI has been implemented against
the approved design.

## Approval rule

AI agents must never mark a screen `Approved` without explicit human approval.

Generated images and screenshots are references or explorations only.

They do not become authoritative merely because they look polished.

## References

Reference images belong under:

`design/references/`

References may guide:

- hierarchy
- typography
- density
- navigation
- visual language
- interaction patterns

They must be clearly distinguished from the current HTML design.

## Implementation guidance

When implementing an approved screen in React Native:

1. Read the relevant product/domain documentation.
2. Read the relevant UX and pattern documents.
3. Inspect the approved HTML screen.
4. Translate the visual system into native React Native / NativeWind components.
5. Preserve existing server-authoritative behavior.
6. Preserve accessibility and deterministic E2E selectors.
7. Do not copy browser-specific implementation details blindly.

The HTML is a visual specification, not production application code.

## Current design progress

| Screen | Status |
|---|---|
| Child Home | Review — Concept E v2 |
| Child Extras | Exploration |
| Child Claim Detail | Exploration |
| Child Activity | Exploration |
| Child Money | Exploration |
| Parent Home | Exploration |
| Parent Chores | Exploration |
| Parent Reviews | Exploration |
| Parent Money | Exploration |
| Parent Household | Exploration |

The current design phase intentionally focuses on Child Home before propagating
the visual language across the rest of the application.
