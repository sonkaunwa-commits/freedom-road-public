# Platform Evolution P2 Conformance Gate v1

This gate validates the platform as a system rather than treating each module's local CI as sufficient evidence.

It checks two classes of contract:

1. **Structural conformance** — required P1/P2 baseline artifacts must still exist and JSON artifacts must remain readable.
2. **Safety conformance** — critical fail-closed invariants must remain true across Model Router, Evaluation, Multi-Model Review, Skill Health and Content Feedback.

The manifest is intentionally machine-readable. Future module changes trigger this gate so an individually valid change can still fail if it breaks a platform-level invariant.

The v1 gate is repository-only. It performs no network calls, model calls, external notifications, publishing, registry mutation, production activation or trading action.