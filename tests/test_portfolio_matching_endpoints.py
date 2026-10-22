"""
tests/test_portfolio_matching_endpoints.py
=========================================
Synchronous, zero-socket unit & integration test suite verifying:
1. TypeSafe AI Autoresearch status, evaluation, and featurization API endpoints.
2. Market matching endpoints (score-fit, job-match-card) including 6-dimension rubric and TypeSafe telemetry.
3. Candidate profile expander and social media normalizer (X/Twitter, Meta/Instagram, LinkedIn, GitHub).
4. Question deduplication invariance in psychometric assessment session tracking.
"""

from __future__ import annotations

import unittest

from api.routers.typesafe_router import (
    get_typesafe_status,
    featurize_candidate_text,
)
from api.schemas.typesafe import TypeSafeFeaturizeRequest
from services.market_intelligence import (
    generate_job_match_card,
    score_job_fit,
)
from services.market_intelligence.profile_expander import (
    _extract_github_handle,
    _extract_linkedin_handle,
    _extract_meta_handle,
    _extract_x_handle,
    normalize_social_urls,
)
from api.routers.assessment_router import select_distinct_items


class TestPortfolioAndMatchingEndpoints(unittest.TestCase):
    """Zero-socket integration and unit tests for candidate matching, portfolio, and TypeSafe AI features."""

    def test_typesafe_status_endpoint(self):
        """Verifies GET /typesafe/status returns active service status."""
        status = get_typesafe_status()
        self.assertEqual(status.provider, "TypeSafe AI")
        self.assertIn("Jev", status.flagship_model)
        self.assertEqual(status.status, "online")
        self.assertIn("Choice", status.supported_primitives)
        self.assertIn("Score", status.supported_primitives)
        self.assertIn("Noul", status.supported_primitives)

    def test_typesafe_featurize_endpoint(self):
        """Verifies POST /typesafe/featurize transforms candidate text into 11D feature vector."""
        payload = TypeSafeFeaturizeRequest(
            candidate_name="Devi Priya",
            free_text="Distributed systems engineer skilled in Rust, Docker, Kubernetes, PostgreSQL, and low-latency microservices with concurrency."
        )
        data = featurize_candidate_text(payload)
        self.assertEqual(data.candidate_name, "Devi Priya")
        self.assertEqual(len(data.numeric_vector), 11)
        self.assertEqual(len(data.feature_names), 11)
        self.assertIn("systems_architecture", data.features)
        self.assertIn("production_engineering", data.features)
        self.assertIn("concurrency_experience", data.features)
        self.assertGreater(data.features["systems_architecture"].mean, 0.0)

    def test_market_job_match_card_endpoint(self):
        """Verifies job match card generation returns 6 dimensions and TypeSafe AI telemetry."""
        posting = "Seeking Senior Cloud Backend Engineer with Kubernetes, Docker, and distributed microservices experience."
        candidate = {
            "full_name": "Aarav Sharma",
            "department": "Computer Science",
            "skills": ["Python", "FastAPI", "Docker", "Kubernetes", "PostgreSQL"],
            "experience_years": 2,
            "archetype": "THE_BUILDER",
            "eq_score": 85,
            "aq_score": 90,
            "placement_readiness_score": 88,
            "location": "Remote",
            "bio": "Passionate backend engineer who builds reliable distributed services.",
            "github_url": "https://github.com/aaravsharma",
            "x_url": "https://x.com/aaravsharma",
            "meta_url": "https://instagram.com/aaravsharma",
            "linkedin_url": "https://linkedin.com/in/aaravsharma",
        }
        job_meta = {
            "title": "Senior Cloud Backend Engineer",
            "company": "Nexus Systems",
        }

        data = generate_job_match_card(posting, candidate, job_meta)
        self.assertEqual(data["job_title"], "Senior Cloud Backend Engineer")
        self.assertEqual(data["company"], "Nexus Systems")

        # Verify 6 dimensions (including TypeSafe AI Neural Rigor)
        self.assertEqual(len(data["dimensions"]), 6)
        dimension_names = [d["name"] for d in data["dimensions"]]
        self.assertIn("Technical Skills Match", dimension_names)
        self.assertIn("Experience & Seniority Fit", dimension_names)
        self.assertIn("Behavioral & Culture Fit", dimension_names)
        self.assertIn("Location & Logistics", dimension_names)
        self.assertIn("Placement & Career Alignment", dimension_names)
        self.assertTrue({"TypeSafe AI Neural Rigor", "Profile Rigor (heuristic)"} & set(dimension_names))

        # Verify TypeSafe telemetry
        self.assertIn("typesafe_telemetry", data)
        telemetry = data["typesafe_telemetry"]
        self.assertIn("numeric_vector", telemetry)
        self.assertEqual(len(telemetry["numeric_vector"]), 11)
        self.assertIn("features", telemetry)
        self.assertIn("model_provider", telemetry)

    def test_market_score_fit_endpoint(self):
        """Verifies fit scorer calculates match score and breakdown."""
        posting = "Looking for frontend React and TypeScript developer in Bengaluru."
        candidate = {
            "target_roles": ["Frontend Developer"],
            "department": "Computer Science",
            "skills": ["React", "TypeScript", "Tailwind CSS"],
            "location": "Bengaluru",
        }
        data = score_job_fit(posting, candidate)
        self.assertIn("score", data)
        self.assertIn("grade", data)
        self.assertGreaterEqual(data["score"], 50)

    def test_social_media_handles_normalization(self):
        """Verifies profile expander standardizes full suite of social media links."""
        raw_profile = {
            "github": "octocat",
            "x_url": "https://twitter.com/dev_builder",
            "meta_url": "threads.net/@dev_builder",
            "linkedin": "linkedin.com/in/devbuilder",
            "portfolio_url": "devbuilder.dev",
        }
        canonical = normalize_social_urls(raw_profile)
        self.assertEqual(canonical["github_url"], "https://github.com/octocat")
        self.assertEqual(canonical["x_url"], "https://x.com/dev_builder")
        self.assertEqual(canonical["meta_url"], "https://instagram.com/dev_builder")
        self.assertEqual(canonical["linkedin_url"], "https://linkedin.com/in/devbuilder")
        self.assertEqual(canonical["portfolio_url"], "https://devbuilder.dev")

    def test_social_handle_regex_extractors(self):
        """Unit verification for handle parsing from different URL variants."""
        self.assertEqual(_extract_github_handle("https://github.com/torvalds/"), "torvalds")
        self.assertEqual(_extract_x_handle("https://x.com/levelsio"), "levelsio")
        self.assertEqual(_extract_x_handle("@sama"), "sama")
        self.assertEqual(_extract_meta_handle("https://instagram.com/zuck"), "zuck")
        self.assertEqual(_extract_meta_handle("@natgeo"), "natgeo")
        self.assertEqual(_extract_linkedin_handle("https://linkedin.com/in/satyanadella"), "satyanadella")

    def test_assessment_session_question_deduplication(self):
        """Verifies select_distinct_items tracks served stems and eliminates duplicates."""
        mock_items = [
            {"id": "q1", "stem": "When facing an ambiguous problem, I immediately build a prototype.", "item_type": "Likert"},
            {"id": "q2", "stem": "When facing an ambiguous problem, I immediately build a prototype!", "item_type": "Likert"},  # Duplicate stem punctuation
            {"id": "q3", "stem": "I prioritize clear asynchronous documentation over sync meetings.", "item_type": "Likert"},
            {"id": "q4", "stem": "I prioritize clear asynchronous documentation over sync meetings.", "item_type": "Likert"},  # Duplicate exact
            {"id": "q5", "stem": "In team conflicts, I mediate by aligning incentives.", "item_type": "SJT"},
        ]
        seen_fps = set()
        chosen = select_distinct_items(mock_items, count=5, seen_fingerprints=seen_fps)
        
        # Only 3 distinct questions should be chosen out of the 5
        self.assertEqual(len(chosen), 3)
        chosen_ids = {c["id"] for c in chosen}
        # Exactly one from {q1, q2} and one from {q3, q4}
        self.assertTrue(("q1" in chosen_ids) ^ ("q2" in chosen_ids))
        self.assertTrue(("q3" in chosen_ids) ^ ("q4" in chosen_ids))
        self.assertIn("q5", chosen_ids)


if __name__ == "__main__":
    unittest.main()
