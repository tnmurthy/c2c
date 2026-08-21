import unittest

from services.scoring_engine.engine import (
    compute_archetype,
    compute_fit_score,
    compute_founder_fit,
    generate_development_report,
)


class TestComputeFounderFit(unittest.TestCase):
    def test_builder_wins_on_iq_and_aq(self):
        scores = {"IQ": 90, "AQ": 90, "EQ": 10, "SQ": 10, "SpQ": 10}
        self.assertEqual(compute_archetype(scores), "Builder")

    def test_leader_wins_on_eq_and_sq(self):
        scores = {"IQ": 10, "AQ": 10, "EQ": 90, "SQ": 90, "SpQ": 10}
        self.assertEqual(compute_archetype(scores), "Leader")

    def test_founder_fit_sums_mapped_dimensions(self):
        scores = {"IQ": 20, "AQ": 30, "EQ": 40, "SQ": 50, "SpQ": 0}
        fit = compute_founder_fit(scores)
        self.assertEqual(fit["Builder"], 50)   # IQ + AQ
        self.assertEqual(fit["Leader"], 90)    # EQ + SQ
        self.assertEqual(fit["Rainmaker"], 80)  # SQ + AQ
        self.assertEqual(fit["Anchor"], 60)    # IQ + EQ


class TestGenerateDevelopmentReport(unittest.TestCase):
    def test_profile_summary_matches_archetype(self):
        report = generate_development_report({"IQ": 80, "AQ": 80, "EQ": 80, "SQ": 80, "SpQ": 80}, "Builder")
        self.assertIn("Builders thrive", report["profile_summary"])

    def test_low_aq_triggers_resilience_feedback(self):
        report = generate_development_report({"AQ": 30}, "Builder")
        self.assertTrue(any("resilience" in f for f in report["actionable_feedback"]))

    def test_no_feedback_when_all_scores_mid_range(self):
        report = generate_development_report({"IQ": 60, "AQ": 60, "EQ": 60, "SQ": 60, "SpQ": 60}, "Builder")
        self.assertEqual(report["actionable_feedback"], [])


class TestComputeFitScore(unittest.TestCase):
    def test_perfect_scores_yield_100(self):
        scores = {"IQ": 100, "AQ": 100, "EQ": 100, "SQ": 100, "SpQ": 100}
        self.assertEqual(compute_fit_score(scores, "tech"), 100.0)

    def test_unknown_role_falls_back_to_tech_weights(self):
        scores = {"IQ": 80, "AQ": 70, "EQ": 90, "SQ": 50, "SpQ": 60}
        self.assertEqual(compute_fit_score(scores, "made_up_role"), compute_fit_score(scores, "tech"))


if __name__ == "__main__":
    unittest.main()
