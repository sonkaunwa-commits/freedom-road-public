# Platform P2 Adversarial Conformance Regression v1

The normal P2 conformance gate proves the current repository satisfies the accepted platform invariants. This suite proves the gate also rejects representative unsafe regressions.

Each case copies the required canonical artifacts into an isolated temporary directory, injects one bounded defect there, and expects the existing conformance validator to fail closed. Canonical repository files are hashed before and after the suite and must remain unchanged.

Covered regression classes include quality-floor downgrades, automatic promotion, removal of high-risk multi-model fail-closed behavior, Skill Health side effects, Content Feedback causality/policy mutation, missing critical artifacts and duplicate component declarations.

No network, provider, model or production fault injection is used.
