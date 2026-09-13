# Design

**Status:** Active — clean-slate production design

This directory is the repository-based visual source of truth for TASK-23.

## Authority

- `src/docs/product.md` and `src/docs/domain.md` remain authoritative for behavior and terminology.
- Approved visual references under `design/references/` are authoritative for visual implementation.
- Generated images are visual references, not executable specifications. Exact copy, accessibility, interaction states, and responsive behavior must be captured in deterministic HTML before React Native implementation.

## Statuses

- **Exploration** — an early visual direction with no approval.
- **Review** — selected for refinement but not approved for implementation.
- **Approved** — explicitly approved by a human for the stated scope only.

Approval never transfers automatically from one screen or flow to another.

## Current direction

Direction C is selected for refinement. It uses warm tactile surfaces, deep aubergine typography, muted mint, terracotta, apricot, and dusty lavender accents, rounded components, and clay-and-paper household illustrations.

See `references/direction-c/README.md` for the approval record and asset scope.

The shared Direction C token foundation and component recipes in `system/` were explicitly approved by the human reviewer on 2026-09-13.

## UX architecture

- `ux/navigation.md` defines the proposed role-specific navigation model.
- `ux/screen-map.md` defines required production screens and state coverage.

Both documents remain Review until explicitly approved.
