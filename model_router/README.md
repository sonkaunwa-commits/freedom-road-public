# FREOVIA Model Router v1

Model Router v1 is a deterministic policy layer. It decides the minimum model capability class a task is allowed to use and records why. It does not call a provider.

## Capability tiers

- `L0`: deterministic/local/simple extraction and formatting.
- `L1`: routine summarization, drafting and bounded research assistance.
- `L2`: complex reasoning, architecture and high-value analysis.
- `L3`: high-risk/high-value work requiring premium reasoning plus independent review or cross-check.

## Core invariant

Cost can choose among candidates that satisfy the quality floor. Cost must never lower the floor itself.

If a task needs L2 and the available budget only admits L1, the result is `ESCALATE_BUDGET_OR_CAPABILITY`, not a silent L1 route.

## Inputs

Routing considers task complexity, risk, required accuracy, latency class, context size, tool requirement, budget class, protected domain and cross-check requirement.

Task and candidate machine fields are fail-closed. Context/latency fields require real bounded non-negative integers rather than `int()` coercion; capability flags require real booleans; enabled candidate IDs must be non-empty and unique; candidate quality must be finite and within `[0, 1]`. Malformed values raise `RoutingPolicyError` instead of silently changing eligibility or sort order.

## Observability

Each routing decision records the policy floor, selected candidate when any, quality score, cost class, expected latency and reason codes. Later provider adapters can append actual latency/cost/success without changing this contract.

## Scope boundary

No credentials, provider calls, private-data egress, paid activation or production cutover are part of v1.
