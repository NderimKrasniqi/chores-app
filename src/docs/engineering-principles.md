# Engineering Principles

## Development

- Product decisions are settled before implementation; implementation should not rediscover the product.
- Use domain language consistently in docs, code, and tests.
- Keep specifications behavioral and implementation-independent.
- Prefer simple solutions, cohesive modules with small clear interfaces, and existing project conventions.
- Avoid speculative abstraction and scope creep.

## Code quality

Review meaningful improvements in:
1. correctness,
2. readability,
3. maintainability,
4. performance where material,
5. language/framework/project best practices.

Do not create stylistic churn when the existing implementation is already clear and correct.

## Audit and refactor discipline

- A broad engineering audit is findings-first. Do not begin with a repository-wide rewrite or cleanup.
- Review the existing implementation before proposing structural changes, and distinguish correctness problems from stylistic preferences.
- Classify audit findings consistently:
  - **P0 — correctness, security, privacy, or data-integrity risk:** fix before further product development.
  - **P1 — material architectural or reliability problem:** normally stabilize before production UI work.
  - **P2 — readability, maintainability, testability, or localized design improvement:** fix when the value justifies the churn.
  - **P3 — optimization or polish:** require material evidence or a clear maintenance benefit.
  - **DEFER — presentation work likely to be replaced by the production UI/UX:** do not refactor merely to improve temporary code.
- Prefer targeted refactors with explicit invariants and regression coverage over broad rewrites.
- Stabilize domain rules, server authority, authorization, persistence, application interfaces, and consequential state transitions before investing in final presentation architecture.
- Do not treat existing temporary UI composition as an architectural constraint on the production experience.
- Performance work should target measured or structurally credible problems rather than speculative micro-optimization.
- Consequential architecture changes discovered during an audit must update the appropriate living architecture documentation and ADR history before or with implementation.

## Testing

- Test behavior through meaningful public interfaces, not private implementation details.
- Unit-test domain rules, invariants, state transitions, calculations, and other focused logic where a unit boundary is meaningful.
- Use integration tests when the meaningful behavior crosses infrastructure.
- E2E-test important product journeys and meaningful user-visible edge cases.
- Do not chase coverage percentages or duplicate the same behavior at every test layer.

## Security

Security review is independent from normal code review. Treat authentication, authorization, trust boundaries, sensitive data, untrusted input, external integrations, and business-logic abuse as explicit security concerns.

## Context hygiene

Planning can use broad context. Each implementation task starts in a fresh focused context and loads only the task, its referenced spec/domain/design context, and relevant existing code. Retrieve more only when a concrete ambiguity appears.

## Living documentation

Project docs are living sources of truth. Update the smallest authoritative set when truth changes:
- product problem/solution/journey/constraint → `docs/product.md`
- domain language/rule/invariant/state transition → `docs/domain.md`
- observable journey behavior → `docs/specs.md#J-xx`
- current technology/architecture choice → `docs/architecture.md`
- current system structure/boundary/major flow → `architecture.md`
- consequential technical decision → a new ADR; supersede rather than rewrite history
- current execution order/progress → `implementation-plan.md`

Do not knowingly leave docs, code, and tests telling different stories.

## Definition of Ready

A task is ready when its behavior is specified enough to implement without inventing a material product/domain decision, and all blocking tasks are complete.

## Definition of Done

As applicable:
- agreed behavior is implemented,
- relevant focused tests pass,
- affected living docs are current,
- code review has no unresolved material findings,
- security review has no unresolved serious findings,
- relevant E2E journey coverage passes.
