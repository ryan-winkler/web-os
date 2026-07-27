from unittest.mock import patch

import support_agent_router as router


agents = router.build_agents()
calls = []
replies = iter(("LatencyAgent", "Check timeout settings."))
with patch.object(
    router,
    "invoke_agent",
    side_effect=lambda agent, issue: (calls.append(agent.name), next(replies))[1],
):
    selected = router.select_agent("Requests are slow.", agents)
    answer = router.answer_issue("Requests are slow.", selected, agents)

    assert selected == "LatencyAgent"
    assert answer == (
        "Check timeout settings.\n"
        "Recommended next action: Review the answer and follow up as needed."
    )
    assert calls == ["TriageAgent", "LatencyAgent"]

with patch.object(router, "invoke_agent", return_value="UnknownAgent"):
    assert router.select_agent("Unclear issue.", agents) == "FallbackAgent"
