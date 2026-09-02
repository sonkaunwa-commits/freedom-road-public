from __future__ import annotations

import copy
import json
from pathlib import Path

from model_router.core import route_task


ROOT = Path(__file__).resolve().parents[1]


def load(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main() -> None:
    policy = load("model_router/policy.v1.json")
    sample = load("model_router/sample_inputs.v1.json")
    candidates = sample["candidates"]

    formatting = route_task(policy, sample["tasks"]["formatting"], candidates)
    assert formatting.decision == "ROUTE"
    assert formatting.minimum_tier == "L0"
    assert formatting.selected_candidate == "local-simple"

    investment = route_task(policy, sample["tasks"]["investment_research"], candidates)
    assert investment.decision == "ROUTE"
    assert investment.minimum_tier == "L2"
    assert investment.selected_candidate == "strong-reasoning"

    critical = route_task(policy, sample["tasks"]["critical_review"], candidates)
    assert critical.decision == "ROUTE"
    assert critical.minimum_tier == "L3"
    assert critical.selected_candidate == "strong-reviewed"

    low_budget = copy.deepcopy(sample["tasks"]["investment_research"])
    low_budget["budget_class"] = "LOW"
    blocked = route_task(policy, low_budget, candidates)
    assert blocked.decision == "ESCALATE_BUDGET_OR_CAPABILITY"
    assert blocked.minimum_tier == "L2"
    assert blocked.selected_candidate is None
    assert "BUDGET_BELOW_POLICY_FLOOR" in blocked.reason_codes

    no_l3 = [candidate for candidate in candidates if candidate["tier"] != "L3"]
    blocked = route_task(policy, sample["tasks"]["critical_review"], no_l3)
    assert blocked.decision == "ESCALATE_CAPABILITY"
    assert blocked.minimum_tier == "L3"
    assert blocked.selected_candidate is None

    tool_task = copy.deepcopy(sample["tasks"]["formatting"])
    tool_task["tools_required"] = true
    tool_task["budget_class"] = "LOW"
    routed = route_task(policy, tool_task, candidates)
    assert routed.minimum_tier == "L1"
    assert routed.selected_candidate == "standard-general"

    print("model-router-v1: PASS")


if __name__ == "__main__":
    main()
