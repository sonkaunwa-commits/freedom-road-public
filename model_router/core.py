from __future__ import annotations

from dataclasses import dataclass
from math import isfinite
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


def _require_bool(value: Any, name: str) -> bool:
    _require(type(value) is bool, f"{name} must be boolean")
    return value


def _require_nonnegative_int(value: Any, name: str) -> int:
    _require(not isinstance(value, bool) and isinstance(value, int), f"{name} must be a non-negative integer")
    _require(0 <= value <= 2_147_483_647, f"{name} must be within 0..2147483647")
    return value


def _require_quality(value: Any, name: str) -> float:
    _require(not isinstance(value, bool) and isinstance(value, (int, float)), f"{name} must be numeric")
    numeric = float(value)
    _require(isfinite(numeric), f"{name} must be finite")
    _require(0.0 <= numeric <= 1.0, f"{name} must be within [0, 1]")
    return numeric


def _require_text(value: Any, name: str) -> str:
    _require(isinstance(value, str) and bool(value.strip()), f"{name} must be non-empty text")
    return value.strip()


def _rank(value: str, ordered: list[str]) -> int:
    _require(value in ordered, f"unsupported ranked value: {value}")
    return ordered.index(value)


def _max_tier(tiers: list[str], values: list[str]) -> str:
    return tiers[max(_rank(value, tiers) for value in values)]


def route_task(policy: dict[str, Any], task: dict[str, Any], candidates: list[dict[str, Any]]) -> RouteDecision:
    _require(isinstance(policy, dict), "policy must be an object")
    _require(isinstance(task, dict), "task must be an object")
    _require(isinstance(candidates, list), "candidates must be a list")

    tiers = list(policy["tiers"])
    budget_order = list(policy["budget_order"])
    reasons: list[str] = []

    risk = str(task["risk"])
    complexity = str(task["complexity"])
    accuracy = str(task["required_accuracy"])
    budget = str(task["budget_class"])
    domain = str(task.get("protected_domain") or "")
    tools_required = _require_bool(task.get("tools_required", False), "task.tools_required")
    cross_check_required = _require_bool(task.get("cross_check_required", False), "task.cross_check_required")
    context_tokens = _require_nonnegative_int(task.get("context_tokens", 0), "task.context_tokens")
    max_latency_ms = _require_nonnegative_int(task.get("max_latency_ms", 2_147_483_647), "task.max_latency_ms")

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

    if tools_required:
        floors.append(policy["rules"]["tools_required_minimum"])
        reasons.append("TOOLS_REQUIRED")

    if cross_check_required:
        floors.append(policy["rules"]["cross_check_requires"])
        reasons.append("CROSS_CHECK_REQUIRED")

    if domain:
        _require(domain in policy["protected_domains"], "unknown protected domain")
        floors.append(policy["protected_domains"][domain])
        reasons.append(f"PROTECTED_DOMAIN_{domain}")

    minimum_tier = _max_tier(tiers, floors)

    eligible: list[dict[str, Any]] = []
    blocked_by_budget = False
    enabled_ids: set[str] = set()
    normalized: dict[int, tuple[str, int, int, float, bool, bool]] = {}

    for candidate in candidates:
        _require(isinstance(candidate, dict), "candidate must be an object")
        enabled = _require_bool(candidate.get("enabled", False), "candidate.enabled")
        if not enabled:
            continue
        candidate_id = _require_text(candidate.get("candidate_id"), "candidate.candidate_id")
        _require(candidate_id not in enabled_ids, "enabled candidate_id values must be unique")
        enabled_ids.add(candidate_id)
        max_context = _require_nonnegative_int(candidate.get("max_context_tokens", 0), f"candidate {candidate_id} max_context_tokens")
        latency = _require_nonnegative_int(candidate.get("estimated_latency_ms", 0), f"candidate {candidate_id} estimated_latency_ms")
        quality = _require_quality(candidate.get("quality_score", 0.0), f"candidate {candidate_id} quality_score")
        supports_tools = _require_bool(candidate.get("supports_tools", False), f"candidate {candidate_id} supports_tools")
        supports_cross_check = _require_bool(candidate.get("supports_cross_check", False), f"candidate {candidate_id} supports_cross_check")
        normalized[id(candidate)] = (candidate_id, max_context, latency, quality, supports_tools, supports_cross_check)

        tier = str(candidate.get("tier"))
        cost_class = str(candidate.get("cost_class"))
        _require(tier in tiers, "candidate has unknown tier")
        _require(cost_class in budget_order, "candidate has unknown cost class")
        if _rank(tier, tiers) < _rank(minimum_tier, tiers):
            continue
        if max_context < context_tokens:
            continue
        if tools_required and not supports_tools:
            continue
        if cross_check_required and not supports_cross_check:
            continue
        if latency > max_latency_ms:
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
            -normalized[id(item)][3],
            _rank(str(item["cost_class"]), budget_order),
            normalized[id(item)][2],
            normalized[id(item)][0],
        )
    )
    selected = eligible[0]
    candidate_id, _, latency, quality, _, _ = normalized[id(selected)]
    reasons.append("QUALITY_FLOOR_SATISFIED")
    reasons.append("BEST_ELIGIBLE_QUALITY_COST_LATENCY")
    return RouteDecision(
        decision="ROUTE",
        minimum_tier=minimum_tier,
        selected_candidate=candidate_id,
        reason_codes=tuple(reasons),
        expected_quality_score=quality,
        estimated_cost_class=str(selected["cost_class"]),
        estimated_latency_ms=latency,
    )
