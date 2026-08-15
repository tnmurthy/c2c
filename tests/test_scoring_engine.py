import unittest
from api.routers.employer_router import calculate_match_score

class TestScoringEngine(unittest.TestCase):
    def test_tech_matching_weight(self):
        # IQ: 40%, AQ: 30%, EQ: 20%, SQ: 5%, SpQ: 5%
        scores = {"IQ": 100, "AQ": 100, "EQ": 100, "SQ": 100, "SpQ": 100}
        self.assertEqual(calculate_match_score(scores, "tech"), 100.0)

        scores_partial = {"IQ": 80, "AQ": 70, "EQ": 90, "SQ": 50, "SpQ": 60}
        # Expected: 0.4*80 + 0.3*70 + 0.2*90 + 0.05*50 + 0.05*60
        # = 32 + 21 + 18 + 2.5 + 3.0 = 76.5
        self.assertEqual(calculate_match_score(scores_partial, "tech"), 76.5)

    def test_sales_matching_weight(self):
        # IQ: 10%, AQ: 20%, EQ: 35%, SQ: 35%, SpQ: 0%
        scores = {"IQ": 100, "AQ": 100, "EQ": 100, "SQ": 100, "SpQ": 100}
        self.assertEqual(calculate_match_score(scores, "sales"), 100.0)

        scores_partial = {"IQ": 50, "AQ": 60, "EQ": 80, "SQ": 70, "SpQ": 90}
        # Expected: 0.1*50 + 0.2*60 + 0.35*80 + 0.35*70 + 0.0*90
        # = 5 + 12 + 28 + 24.5 = 69.5
        self.assertEqual(calculate_match_score(scores_partial, "sales"), 69.5)

    def test_ops_matching_weight(self):
        # IQ: 30%, AQ: 25%, EQ: 25%, SQ: 15%, SpQ: 5%
        scores = {"IQ": 100, "AQ": 100, "EQ": 100, "SQ": 100, "SpQ": 100}
        self.assertEqual(calculate_match_score(scores, "ops"), 100.0)

    def test_leadership_matching_weight(self):
        # IQ: 20%, AQ: 20%, EQ: 30%, SQ: 25%, SpQ: 5%
        scores = {"IQ": 100, "AQ": 100, "EQ": 100, "SQ": 100, "SpQ": 100}
        self.assertEqual(calculate_match_score(scores, "leadership"), 100.0)

    def test_default_role_fallback(self):
        # Defaults to tech if role invalid
        scores = {"IQ": 80, "AQ": 70, "EQ": 90, "SQ": 50, "SpQ": 60}
        self.assertEqual(calculate_match_score(scores, "invalid_role"), 76.5)

    def test_empty_or_missing_scores(self):
        scores = {}
        self.assertEqual(calculate_match_score(scores, "tech"), 0.0)

        scores_partial = {"IQ": 100} # missing others
        # Expected: 0.4*100 = 40.0
        self.assertEqual(calculate_match_score(scores_partial, "tech"), 40.0)

if __name__ == "__main__":
    unittest.main()
