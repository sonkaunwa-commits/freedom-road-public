#!/usr/bin/env python3
from copy import deepcopy
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from model_router.core import RoutingPolicyError, route_task

POLICY = json.loads((ROOT / "model_router/policy.v1.json").read_text(encoding="utf-8"))
SAMPLES = json.loads((ROOT / "model_router/sample_inputs.v1.json").read_text(encoding="utf-8"))


def expect_error(task=None, candidates=None):
    try:
        route_task(
            deepcopy(POLICY),
            task if task is not None else deepcopy(SAMPLES["tasks"]["formatting"]),
            candidates if candidates is not None else deepcopy(SAMPLES["candidates"]),
        )
    except RoutingPolicyError:
        return
    raise AssertionError("expected RoutingPolicyError")


decision = route_task(deepcopy(POLICY), deepcopy(SAMPLES["tasks"]["formatting"]), deepcopy(SAMPLES["candidates"]))
assert decision.decision == "ROUTE"
assert decision.selected_candidate == "local-simple"

for field in ("context_tokens", "max_latency_ms"):
    for value in (True, "100"):
        bad = deepcopy(SAMPLES["tasks"]["formatting"])
        bad[field] = value
        expect_error(task=bad)

for field in ("tools_required", "cross_check_required"):
    bad = deepcopy(SAMPLES["tasks"]["formatting"])
    bad[field] = 1
    expect_error(task=bad)

for field in ("max_context_tokens", "estimated_latency_ms"):
    for value in (True, "100"):
        bad = deepcopy(SAMPLES["candidates"])
        bad[0][field] = value
        expect_error(candidates=bad)

for value in (math.nan, math.inf, -math.inf):
    bad = deepcopy(SAMPLES["candidates"])
    bad[0]["quality_score"] = value
    expect_error(candidates=bad)

bad = deepcopy(SAMPLES["candidates"])
bad[0]["candidate_id"] = " "
expect_error(candidates=bad)

bad = deepcopy(SAMPLES["candidates"])
bad[1]["candidate_id"] = bad[0]["candidate_id"]
expect_error(candidates=bad)

print("model-router strict contract self-test: PASS")
