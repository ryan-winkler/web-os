import io
import json
import logging
import re
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import Mock, patch

import support_agent_router as router


def triage_json(issues, facts=None, summary="Customer reported support issues."):
    return json.dumps(
        {
            "customer_summary": summary,
            "stated_customer_facts": facts or [],
            "issues": issues,
        }
    )


def specialist_json(answer="Short answer.", category=None):
    return json.dumps(
        {
            "answer": answer,
            "recommended_next_action": "Take the next step.",
            "feedback_category": category,
        }
    )


class RouterPureTests(unittest.TestCase):
    def test_01_valid_multi_issue_pipeline(self):
        output = triage_json(
            [
                {"summary": "Burst requests get 429s.", "specialist_name": "RateLimitAgent", "confidence": 0.99},
                {"summary": "Requests are slow.", "specialist_name": "LatencyAgent", "confidence": 0.98},
                {"summary": "Customer is frustrated.", "specialist_name": "FeedbackAgent", "confidence": 0.97},
            ]
        )
        with patch.object(
            router,
            "invoke_agent",
            side_effect=[
                output,
                specialist_json("Retry with backoff."),
                specialist_json("Measure latency."),
                specialist_json("Acknowledge the feedback.", "support_experience"),
            ],
        ) as invoke:
            result = router.process_customer("429s, slow requests, and I am frustrated.", router.build_agents())

        self.assertEqual(4, invoke.call_count)
        self.assertEqual(3, len(result.routes))
        self.assertEqual(
            ["RateLimitAgent", "LatencyAgent", "FeedbackAgent"],
            [route.specialist_name for route in result.routes],
        )
        for call in invoke.call_args_list[1:]:
            self.assertNotIn(
                "429s, slow requests, and I am frustrated.",
                call.args[1],
            )

    def test_02_specialist_allowlist_and_fallback(self):
        triage = router.TriageOutput(
            customer_summary="Two issues.",
            issues=[
                router.TriagedIssue(summary="Known.", specialist_name="APIErrorAgent", confidence=1),
                router.TriagedIssue(summary="Unknown.", specialist_name="InventedAgent", confidence=1),
            ],
        )
        routes = router.build_routes(triage)
        self.assertEqual("APIErrorAgent", routes[0].specialist_name)
        self.assertEqual("FallbackAgent", routes[1].specialist_name)
        self.assertEqual(
            {"TriageAgent", *router.SPECIALIST_NAMES},
            set(router.AGENT_KNOWLEDGE_GRAPH),
        )
        agents = router.build_agents()
        for agent_name in router.AGENT_KNOWLEDGE_GRAPH:
            self.assertIn("Approved OpenAI context sources:", agents[agent_name].instructions)
            for _title, url in router.learning_resources(agent_name):
                self.assertTrue(url.startswith(router.OFFICIAL_SOURCE_PREFIXES))
        with patch.object(
            router.Runner,
            "run_sync",
            return_value=Mock(final_output="ok"),
        ) as runner:
            self.assertEqual("ok", router.invoke_agent(agents["FallbackAgent"], "issue"))
        run_config = runner.call_args.kwargs["run_config"]
        self.assertTrue(run_config.tracing_disabled)
        self.assertFalse(run_config.trace_include_sensitive_data)

    def test_03_zero_and_overflow_issue_bounds(self):
        empty = router.build_routes(router.TriageOutput(customer_summary="Nothing.", issues=[]))
        self.assertEqual(1, len(empty))
        self.assertEqual("FallbackAgent", empty[0].specialist_name)

        many = router.build_routes(
            router.TriageOutput(
                customer_summary="Many.",
                issues=[
                    router.TriagedIssue(
                        summary=f"Distinct issue {index}",
                        specialist_name="LatencyAgent",
                        confidence=0.5,
                    )
                    for index in range(12)
                ],
            )
        )
        self.assertEqual(10, len(many))
        self.assertEqual("FallbackAgent", many[-1].specialist_name)
        self.assertIn("3 additional issues", many[-1].summary)

    def test_04_deduplication_and_python_issue_ids(self):
        routes = router.build_routes(
            router.TriageOutput(
                customer_summary="Duplicates.",
                issues=[
                    router.TriagedIssue(summary="Slow requests.", specialist_name="LatencyAgent", confidence=0.8),
                    router.TriagedIssue(summary="  slow   REQUESTS! ", specialist_name="LatencyAgent", confidence=0.7),
                    router.TriagedIssue(summary="HTTP 503.", specialist_name="APIErrorAgent", confidence=0.9),
                ],
            )
        )
        self.assertEqual(["issue-001", "issue-002"], [route.issue_id for route in routes])
        self.assertEqual(["Slow requests.", "HTTP 503."], [route.summary for route in routes])

    def test_05_fact_evidence_and_request_id_validation(self):
        message = (
            "Acme is in EMEA using Product Alpha. Website HTTPS://evil.example. "
            "Request req_ABCdef12 failed; req_ABCdef12 repeated. req_bad."
        )
        parsed = router.parse_triage_output(
            triage_json(
                [{"summary": "Failure.", "specialist_name": "APIErrorAgent", "confidence": 0.9}],
                facts=[
                    {"name": "organization", "value": "Acme", "evidence": "Acme is in EMEA"},
                    {"name": "region", "value": "EMEA", "evidence": "Acme is in EMEA"},
                    {
                        "name": "product",
                        "value": "HTTPS://evil.example",
                        "evidence": "Website HTTPS://evil.example",
                    },
                    {"name": "account_tier", "value": "enterprise", "evidence": "Acme is in EMEA"},
                ],
            ),
            message,
        )
        self.assertEqual(
            ["organization", "region", "product"],
            [fact.name for fact in parsed.stated_customer_facts],
        )
        self.assertNotIn(
            "evil.example",
            " ".join(
                fact.value + fact.evidence for fact in parsed.stated_customer_facts
            ),
        )
        self.assertEqual(["req_ABCdef12"], router.extract_request_ids(message))

    def test_06_feedback_category_is_bounded(self):
        parsed = router.parse_specialist_output(specialist_json(category="support_experience"))
        self.assertEqual("support_experience", parsed.feedback_category)
        with self.assertRaises(ValueError):
            router.parse_specialist_output(specialist_json(category="angry"))
        external = router.parse_specialist_output(
            json.dumps(
                {
                    "answer": (
                        "\u001b[31m Read FTP://example.com/unsupported, "
                        "//other.example/path, and mailto:user@third.example"
                    ),
                    "recommended_next_action": "Open www.bad.test/path or bare.example/path",
                    "feedback_category": None,
                }
            )
        )
        safe_output = external.answer + external.recommended_next_action
        for unsafe in ("\u001b", "example.com", "other.example", "third.example", "bad.test", "bare.example"):
            self.assertNotIn(unsafe, safe_output)
        technical = "response.usage error.code cache.hit api.error openai.RateLimitError"
        self.assertEqual(technical, router._safe_text(technical))

    def test_07_automatic_mode_never_prompts(self):
        with patch.object(
            router,
            "invoke_agent",
            side_effect=[
                triage_json([{"summary": "429.", "specialist_name": "RateLimitAgent", "confidence": 1}]),
                specialist_json(),
            ],
        ):
            result = router.process_customer(
                "429",
                router.build_agents(),
                manual=False,
                input_fn=Mock(side_effect=AssertionError("automatic mode prompted")),
            )
        self.assertFalse(result.triage_failed)

    def test_08_manual_review_reprompts_and_refreshes_owner_choices(self):
        route = router.RouteItem(
            issue_id="issue-001",
            summary="Slow.",
            specialist_name="RateLimitAgent",
            confidence=1,
            recommended_owner="API Support",
        )
        answers = iter(["bogus", "2", "bogus", "2"])
        output = []
        reviewed = router.review_routes([route], lambda _prompt: next(answers), output.append)
        self.assertEqual("LatencyAgent", reviewed[0].specialist_name)
        self.assertEqual("Platform Reliability", reviewed[0].recommended_owner)
        self.assertGreaterEqual(sum("Invalid" in line for line in output), 2)

    def test_09_exit_status_matrix(self):
        success = router.RunOutcome(text="ok")
        usage = router.exit_status(success, usage_error=True)
        triage = router.exit_status(router.RunOutcome(text="bad", triage_failed=True, logging_failed=True))
        specialist = router.exit_status(
            router.RunOutcome(text="partial", specialist_failures=1, logging_failed=True)
        )
        logging_only = router.exit_status(router.RunOutcome(text="ok", logging_failed=True))
        self.assertEqual([0, 2, 3, 1, 4], [router.exit_status(success), usage, triage, specialist, logging_only])
        with (
            patch("sys.argv", ["support_agent_router.py", ""]),
            patch.object(router, "configure_logging") as configure,
            patch.object(router, "build_agents") as build,
            redirect_stderr(io.StringIO()),
            self.assertRaises(SystemExit) as stopped,
        ):
            router.main()
        self.assertEqual(2, stopped.exception.code)
        configure.assert_not_called()
        build.assert_not_called()

    def test_10_triage_exception_stops_before_specialists(self):
        with patch.object(router, "invoke_agent", side_effect=RuntimeError("network")) as invoke:
            result = router.process_customer("A problem.", router.build_agents())
        self.assertTrue(result.triage_failed)
        self.assertEqual(1, invoke.call_count)
        self.assertIn("Triage unavailable", result.text)

    def test_11_specialist_failure_continues_and_formats_all_fields(self):
        with patch.object(
            router,
            "invoke_agent",
            side_effect=[
                triage_json(
                    [
                        {
                            "summary": "First at HTTPS://evil.example.",
                            "specialist_name": "LatencyAgent",
                            "confidence": 1,
                        },
                        {
                            "summary": "Second.",
                            "specialist_name": "APIErrorAgent",
                            "confidence": 1,
                        },
                    ],
                    summary="Customer report at HTTPS://summary.example.",
                ),
                RuntimeError("first failed"),
                specialist_json("Second succeeded."),
            ],
        ):
            result = router.process_customer(
                "Two failures.",
                router.build_agents(),
                customer_id="HTTPS://customer.example",
            )

        self.assertEqual(1, result.specialist_failures)
        self.assertIn("Unable to generate a specialist answer", result.text)
        for field in (
            "Customer:",
            "Customer summary:",
            "Issues found:",
            "Selected agent:",
            "Recommended owner:",
            "Agent flow:",
            "Answer:",
            "Next action:",
            "Where to inspect:",
            "Learning resources:",
        ):
            self.assertIn(field, result.text)
        self.assertIn("Second succeeded.", result.text)
        urls = re.findall(r"https?://\S+", result.text)
        self.assertTrue(urls)
        self.assertTrue(
            all(url.startswith(router.OFFICIAL_SOURCE_PREFIXES) for url in urls)
        )
        self.assertNotIn("evil.example", result.text)
        self.assertNotIn("summary.example", result.text)
        self.assertNotIn("customer.example", result.text)

    def test_12_logging_is_private_and_failure_is_nonfatal(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "router.log"
            state = router.configure_logging(path)
            route = router.RouteItem(
                issue_id="issue-001",
                summary="secret customer text",
                specialist_name="FeedbackAgent",
                confidence=1,
                recommended_owner="Customer Success",
                feedback_category="support_experience",
            )
            self.assertTrue(
                router.log_event(
                    state,
                    correlation_id="opaque-correlation",
                    stage="specialist",
                    status="ok",
                    route=route,
                    elapsed_ms=12,
                )
            )
            state.logger.handlers[0].maxBytes = 1
            self.assertTrue(
                router.log_event(
                    state,
                    correlation_id="second-event",
                    stage="complete",
                    status="ok",
                )
            )
            for handler in state.logger.handlers:
                handler.flush()
                handler.close()
            events = [
                json.loads(line)
                for candidate in (path, Path(f"{path}.1"))
                for line in candidate.read_text(encoding="utf-8").splitlines()
            ]
            event = next(
                item for item in events if item["correlation_id"] == "opaque-correlation"
            )
            self.assertEqual(
                {
                    "correlation_id",
                    "elapsed_ms",
                    "feedback_category",
                    "issue_id",
                    "owner",
                    "specialist",
                    "stage",
                    "status",
                    "timestamp",
                },
                set(event),
            )
            self.assertNotIn(
                "secret customer text",
                "".join(
                    candidate.read_text(encoding="utf-8")
                    for candidate in (path, Path(f"{path}.1"))
                ),
            )
            for candidate in (path, Path(f"{path}.1")):
                self.assertEqual(0o600, candidate.stat().st_mode & 0o777)

        broken = router.LogState(logger=Mock(spec=logging.Logger), required=True)
        broken.logger.info.side_effect = OSError("disk full")
        warnings = io.StringIO()
        with redirect_stderr(warnings):
            self.assertFalse(
                router.log_event(
                    broken,
                    correlation_id="opaque",
                    stage="complete",
                    status="ok",
                )
            )
            self.assertFalse(
                router.log_event(
                    broken,
                    correlation_id="opaque",
                    stage="complete",
                    status="ok",
                )
            )
        self.assertTrue(broken.failed)
        self.assertEqual(1, warnings.getvalue().count("warning:"))

    def test_13_interactive_loop_handles_customers_and_clean_exits(self):
        outcomes = [router.RunOutcome(text="first"), router.RunOutcome(text="second")]
        inputs = iter(["customer-1", "message one", "", "", "customer-2", "message two", "m", "", "quit"])
        output = []
        with patch.object(router, "process_customer", side_effect=outcomes) as process:
            status = router.interactive_loop(
                router.build_agents(),
                router.LogState(),
                input_fn=lambda _prompt: next(inputs),
                output_fn=output.append,
            )
        self.assertEqual(0, status)
        self.assertEqual([False, True], [call.kwargs["manual"] for call in process.call_args_list])

        for exception in (EOFError, KeyboardInterrupt):
            with self.subTest(exception=exception.__name__):
                self.assertEqual(
                    0,
                    router.interactive_loop(
                        router.build_agents(),
                        router.LogState(),
                        input_fn=Mock(side_effect=exception),
                        output_fn=lambda _text: None,
                    ),
                )

        prompts = []
        self.assertEqual(
            0,
            router.interactive_loop(
                router.build_agents(),
                router.LogState(),
                input_fn=lambda prompt: (prompts.append(prompt), "quit")[1],
                output_fn=lambda _text: None,
                default_customer_id="ftp://evil.example",
            ),
        )
        self.assertNotIn("evil.example", "".join(prompts))


if __name__ == "__main__":
    unittest.main()
