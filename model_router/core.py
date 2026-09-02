from __future__ import annotations

from dataclasses import dataclass
from typing import Any


class RoutingPolicyError(ValueError):
    pass


@dataclass(frozen=True)
class RouteDecision:
    decision: str
    minimum_tier: str
    selected_candidate: str | None
    reason_codes: tuple[str, ...]
    expected_quality_score: float | None
    estimated_cost_class: str | None
    estimated_latency_ms: int | None


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise RoutingPolicyError(message)


def _rank(value: str, ordered: list[str]) -> int:
    _require(value in ordered, f"unsupported ranked value: {value}")
    return ordered.index(value)


def _max_tier(tiers: list[str], values: list[str]) -> str:
    return tiers[max(_rank(value, tiers) for value in values)]


def route_task(policy: dict[str, Any], task: dict[str, Any], candidates: list[dict[str, Any]]) -> RouteDecision:
    tiers = list(policy["tiers"])
    budget_order = list(policy["budget_order"])
    reasons: list[str] = []

    risk = str(task["risk"])
    complexity = str(task["complexity"])
    accuracy = str(task["required_accuracy"])
    budget = str(task["budget_class"])
    domain = str(task.get("protected_domain") or "")

    _require(risk in policy["risk_floor"], "unknown risk")
    _require(complexity in policy["complexity_floor"], "unknown complexity")
    _require(accuracy in policy["accuracy_floor"], "unknown accuracy")
    _require(budget in budget_order, "unknown budget class")

    floors = [
        policy["risk_floor"][risk],
        policy["complexity_floor"][complexity],
        policy["accuracy_floor"][accuracy],
    ]
    reasons.extend([f"RISK_{risk}", f"COMPLEXITY_{complexity}", f"ACCURACY_{accuracy}"])

    if task.get("tools_required"):
        floors.append(policy["rules"]["tools_required_minimum"])
        reasons.append("TOOLS_REQUIRED")

    if task.get("cross_check_required"):
        floors.append(policy["rules"]["cross_check_requires"])
        reasons.append("CROSS_CHECK_REQUIRED")

    if domain:
        _require(domain in policy["protected_domains"], "unknown protected domain")
        floors.append(policy["protected_domains"][domain])
        reasons.append(f"PROTECTED_DOMAIN_{domain}")

    minimum_tier = _max_tier(tiers, floors)
    context_tokens = int(task.get("context_tokens", 0))
    max_latency_ms = int(task.get("max_latency_ms", 2_147_483_647))

    eligible: list[dict[str, Any]] = []
    blocked_by_budget = False
    for candidate in candidates:
        if candidate.get("enabled") is not True:
            continue
        tier = str(candidate.get("tier"))
        cost_class = str(candidate.get("cost_class"))
        _require(tier in tiers, "candidate has unknown tier")
        _require(cost_class in budget_order, "candidate has unknown cost class")
        if _rank(tier, tiers) < _rank(minimum_tier, tiers):
            continue
        if int(candidate.get("max_context_tokens", 0)) < context_tokens:
            continue
        if task.get("tools_required") and not candidate.get("supports_tools"):
            continue
        if task.get("cross_check_required") and not candidate.get("supports_cross_check"):
            continue
        if int(candidate.get("estimated_latency_ms", 0)) > max_latency_ms:
            continue
        if _rank(cost_class, budget_order) > _rank(budget, budget_order):
            blocked_by_budget = True
            continue
        eligible.append(candidate)

    if not eligible:
        reasons.append("NO_ELIGIBLE_CANDIDATE")
        if blocked_by_budget:
            reasons.append("BUDGET_BELOW_POLICY_FLOOR")
            decision = "ESCALATE_BUDGET_OR_CAPABILITY"
        else:
            decision = "ESCALATE_CAPABILITY"
        return RouteDecision(
            decision=decision,
            minimum_tier=minimum_tier,
            selected_candidate=None,
            reason_codes=tuple(reasons),
            expected_quality_score=None,
            estimated_cost_class=None,
            estimated_latency_ms=None,
        )

    eligible.sort(
        key=lambda item: (
            -float(item.get("quality_score", 0.0)),
            _rank(str(item["cost_class"]), budget_order),
            int(item.get("estimated_latency_ms", 0)),
            str(item["candidate_id"]),
        )
    )
    selected = eligible[0]
    reasons.append("QUALITY_FLOOR_SATISFIED")
    reasons.append("BEST_ELIGIBLE_QUALITY_COST_LATENCY")
    return RouteDecision(
        decision="ROUTE",
        minimum_tier=minimum_tier,
        selected_candidate=str(selected["candidate_id"]),
        reason_codes=tuple(reasons),
        expected_quality_score=float(selected.get("quality_score", 0.0)),
        estimated_cost_class=str(selected["cost_class"]),
        estimated_latency_ms=int(selected.get("estimated_latency_ms", 0)),
    )
