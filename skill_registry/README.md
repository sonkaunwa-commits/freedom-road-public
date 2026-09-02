# FREOVIA Skill Registry v1

The Skill Registry is the admission-control layer for reusable Skills, MCPs, plugins, APIs, agents and internal utilities. Discovery does not equal approval.

## Lifecycle

`Discover → Register → Static Review → Pilot → Benchmark → Approve/Reject → Monitor → Re-evaluate/Deprecate`

Canonical states:

- `WATCH`: known candidate; no production authority.
- `PILOT`: bounded evaluation only.
- `APPROVED`: allowed only within the permissions and use case recorded in the entry.
- `DEPRECATED`: retained for audit/history; must not be selected by default.
- `REJECTED`: evaluated and explicitly declined; retained to prevent repeated rediscovery without new evidence.

## Required evaluation dimensions

Every entry records the problem solved, I/O contract, permissions, overlap with existing capabilities, maintenance state, security/privacy risk, cost, alternatives, latest evaluation date and—when available—success/latency evidence.

`APPROVED` requires non-empty approval evidence. Approval never implies broader permissions than those declared in the registry.

## Cost rule

A new capability is not admitted merely because it is technically better. The evaluator should compare total useful-output cost, including model/API spend, CI/runtime cost, maintenance, rework and failure risk. Existing zero/low-marginal-cost capability should be preferred when quality remains acceptable.

## Privacy and authority rule

Registry status is capability admission, not execution authorization. A skill that is approved in the registry still needs the calling workflow's data-egress, write, external-action and other runtime gates.

## Validation

Run:

```bash
node scripts/validate-skill-registry.cjs
```

The validator intentionally uses only Node.js built-ins so the minimum registry gate does not add package-install or network cost.
