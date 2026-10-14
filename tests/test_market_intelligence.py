"""
tests/test_market_intelligence.py
=================================
Comprehensive unit & integration test suite for services/market_intelligence.

Modules Covered:
1. lead_intel.py         (clean_text, extract_budget, extract_tech_stack, extract_location, extract_company, extract_urgency, compute_signal_quality, extract_lead_intel)
2. quality_gate.py       (evaluate_lead_quality, _parse_date, seniority targeting, red flags, freshness)
3. fit_scorer.py         (score_job_fit, generate_job_match_card, _detect_role_family, _candidate_role_family, _grade, _safe_int, 5-dimension rubric)
4. interview_prep.py     (generate_interview_prep, technical questions, STAR behavioral frameworks, archetype mappings, research checklist)
5. profile_expander.py   (expand_github_profile, expand_candidate_profile, _extract_github_handle, skill badge mapping, confidence scoring)
6. skill_gap.py          (generate_skill_gap_report, demand/supply calculation, priority scoring, severity assignment, learning resources, TPO interventions)
7. drafter_reviewer.py   (run_drafter_reviewer_pipeline, _critique_application_packet, _revise_cover_letter, ATS scoring, cliché cleanup)
8. outreach_generator.py (generate_outreach_draft, build_resume_context, build_cover_letter_context, _voice, _top_skills, _job_location)

Executable via:
    pytest tests/test_market_intelligence.py -v
    python -m unittest tests/test_market_intelligence.py
"""

from __future__ import annotations

import io
import json
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
import urllib.error

# Module imports
from services.market_intelligence import (
    build_cover_letter_context,
    build_resume_context,
    evaluate_lead_quality,
    expand_candidate_profile,
    expand_github_profile,
    extract_lead_intel,
    generate_interview_prep,
    generate_job_match_card,
    generate_outreach_draft,
    generate_skill_gap_report,
    run_drafter_reviewer_pipeline,
    score_job_fit,
)
from services.market_intelligence.drafter_reviewer import (
    _CLICHE_PHRASES,
    _critique_application_packet,
    _revise_cover_letter,
)
from services.market_intelligence.fit_scorer import (
    _candidate_role_family,
    _detect_role_family,
    _grade,
    _safe_int,
    _score_location,
    _score_psychometric,
    _score_role_alignment,
    _score_seniority,
    _score_signal,
    _score_tech_stack,
)
from services.market_intelligence.lead_intel import (
    RED_FLAG_TERMS,
    clean_text,
    compute_signal_quality,
    extract_budget,
    extract_company,
    extract_location,
    extract_tech_stack,
    extract_urgency,
)
from services.market_intelligence.outreach_generator import (
    _cold_email,
    _follow_up_sequence,
    _founder_message,
    _job_location,
    _linkedin_note,
    _top_skills,
    _voice,
)
from services.market_intelligence.profile_expander import _extract_github_handle
from services.market_intelligence.quality_gate import _parse_date


# =============================================================================
# 1. TEST LEAD INTEL
# =============================================================================
class TestLeadIntel(unittest.TestCase):
    """Unit tests for services/market_intelligence/lead_intel.py"""

    def test_clean_text(self):
        self.assertEqual(clean_text("   Hello \t\n  World! \n\n"), "Hello World!")
        self.assertEqual(clean_text(""), "")
        self.assertEqual(clean_text(None), "")
        self.assertEqual(clean_text(12345), "")

    def test_extract_budget_various_formats(self):
        # Dollar format
        self.assertEqual(extract_budget("We offer $80,000 - $100,000 for this role"), "$80,000 - $100,000")
        self.assertEqual(extract_budget("Salary range is $60k - $80k"), "$60k - $80k")
        # INR / ₹ format
        self.assertIn("6,00,000", extract_budget("Package: INR 6,00,000 per annum") or "")
        self.assertIn("12 LPA", extract_budget("CTC: ₹12 LPA") or "")
        self.assertIn("25k", extract_budget("Stipend: 25k per month") or "")
        # LPA ranges
        self.assertEqual(extract_budget("Expected CTC 6 to 8.5 LPA in Bangalore"), "6 to 8.5 LPA")
        self.assertEqual(extract_budget("Offering 10 LPA"), "10 LPA")
        # No budget
        self.assertIsNone(extract_budget("Great opportunity with competitive benefits."))

    def test_extract_tech_stack(self):
        text = "We need a Full Stack Engineer experienced with Python, FastAPI, React, Next.js, Docker and PostgreSQL."
        tech = extract_tech_stack(text)
        expected = ["Python", "FastAPI", "React", "Next.js", "PostgreSQL", "Docker"]
        for item in expected:
            self.assertIn(item, tech)

        # Case-insensitivity check and deduplication
        text_case = "Looking for python, PYTHON, Fastapi, sql, SQL, AWS, and aws developers."
        tech_case = extract_tech_stack(text_case)
        self.assertIn("Python", tech_case)
        self.assertIn("FastAPI", tech_case)
        self.assertIn("SQL", tech_case)
        self.assertIn("AWS", tech_case)
        self.assertEqual(len([t for t in tech_case if t == "Python"]), 1)
        self.assertEqual(len([t for t in tech_case if t == "AWS"]), 1)

        # Empty or non-tech text
        self.assertEqual(extract_tech_stack("Just a casual conversation about coffee and books."), [])

    def test_extract_location(self):
        self.assertEqual(extract_location("This is a remote india opportunity."), "Remote India")
        self.assertEqual(extract_location("Looking for candidates fully remote or wfh."), "Remote")
        self.assertEqual(extract_location("Job located in Bengaluru office."), "Bangalore")
        self.assertEqual(extract_location("Office in Hyderabad, Hitec City."), "Hyderabad")
        self.assertEqual(extract_location("Position based in Mumbai Nariman Point."), "Mumbai")
        self.assertEqual(extract_location("Pune campus drive"), "Pune")
        self.assertEqual(extract_location("Noida sector 62 opening"), "Noida")
        self.assertIsNone(extract_location("Worldwide global decentralized opportunity"))

    def test_extract_company(self):
        self.assertEqual(extract_company("Company: Acme Innovations Pvt Ltd"), "Acme Innovations Pvt Ltd")
        self.assertIn("Stripe Labs", extract_company("Join the team at Stripe Labs for exciting work.") or "")
        self.assertIn("Infosys", extract_company("Hiring for Infosys across India.") or "")
        self.assertIsNone(extract_company("Exciting developer role open now!"))

    def test_extract_urgency(self):
        self.assertTrue(extract_urgency("Immediate joiner required for this role ASAP."))
        self.assertTrue(extract_urgency("Looking for candidates available immediately or notice period 0."))
        self.assertFalse(extract_urgency("Standard placement cycle starting next semester."))

    def test_compute_signal_quality(self):
        # High quality posting: long, tech terms, budget, location, company
        high_jd = (
            "Company: Acme Corp. Location: Bangalore. We are hiring a Senior Software Engineer. "
            "Salary: 12-15 LPA. Required tech stack: Python, FastAPI, React, PostgreSQL, Docker, AWS, Redis. "
            "You will build high performance microservices, manage CI/CD pipelines, and collaborate with product teams. "
            "We offer generous equity and health insurance. Apply immediately."
        )
        sq_high = compute_signal_quality(high_jd)
        self.assertGreaterEqual(sq_high["score"], 80)
        self.assertIn("tech_rich", sq_high["tags"])
        self.assertIn("budget_disclosed", sq_high["tags"])
        self.assertIn("location_specified", sq_high["tags"])
        self.assertIn("company_identified", sq_high["tags"])

        # Red flag posting: bond period deduction
        red_flag_jd = "Data entry operator required. Registration fee of Rs 500 and training bond mandatory. Earn from home."
        sq_rf = compute_signal_quality(red_flag_jd)
        self.assertIn("red_flag", sq_rf["tags"])
        self.assertIn("Red-flag terms detected", sq_rf["reason"])

        # Short low-signal posting
        short_jd = "Hiring coder."
        sq_short = compute_signal_quality(short_jd)
        self.assertLess(sq_short["score"], 40)
        self.assertIn("too_short", sq_short["tags"])

    def test_extract_lead_intel_unified(self):
        jd = "Company: TechGiant\nPosition in Hyderabad. Salary: 10 LPA. Requires Python, Docker. Immediate joiner."
        intel = extract_lead_intel(jd)
        self.assertIn("TechGiant", intel["company"] or "")
        self.assertEqual(intel["location"], "Hyderabad")
        self.assertIn("10 LPA", intel["budget"] or "")
        self.assertTrue(intel["urgency"])
        self.assertIn("Python", intel["tech_stack"])
        self.assertIn("Docker", intel["tech_stack"])
        self.assertIn("fingerprint", intel)
        self.assertEqual(len(intel["fingerprint"]), 16)


# =============================================================================
# 2. TEST QUALITY GATE
# =============================================================================
class TestQualityGate(unittest.TestCase):
    """Unit tests for services/market_intelligence/quality_gate.py"""

    def test_parse_date(self):
        # ISO formats
        dt1 = _parse_date("2026-08-20T10:30:00+00:00")
        self.assertIsNotNone(dt1)
        self.assertEqual(dt1.year, 2026)

        dt2 = _parse_date("2026-08-20T10:30:00Z")
        self.assertIsNotNone(dt2)

        dt3 = _parse_date("2026-08-20")
        self.assertIsNotNone(dt3)

        self.assertIsNone(_parse_date(None))
        self.assertIsNone(_parse_date("not-a-valid-date"))

    def test_evaluate_lead_quality_passing(self):
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        lead = {
            "title": "Junior Python Developer",
            "url": "https://example.com/jobs/12345",
            "posted_date": now_str,
            "text": (
                "Company: FinTech Solutions. Location: Bangalore. We are hiring an entry-level Fresher Software Engineer. "
                "Salary: 6 LPA. Tech Stack: Python, SQL, Git, FastAPI, Docker. Build modern REST APIs with mentor support. "
                "Fresh graduates from 2025/2026 batches welcome to apply."
            ),
        }
        res = evaluate_lead_quality(lead, min_quality=50, target_level="fresher", max_age_days=14)
        self.assertTrue(res["accepted"])
        self.assertGreaterEqual(res["score"], 50)
        self.assertIn("fresh", res["tags"])

    def test_evaluate_lead_quality_rejections_and_deductions(self):
        # Missing URL and too short
        lead_bad = {
            "text": "Short post without link.",
            "url": "",
            "posted_date": None,
        }
        res_bad = evaluate_lead_quality(lead_bad, min_quality=60)
        self.assertFalse(res_bad["accepted"])
        self.assertIn("no_url", res_bad["tags"])
        self.assertIn("text_too_short", res_bad["tags"])

        # Stale posting (older than max_age_days)
        stale_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
        lead_stale = {
            "url": "https://example.com/jobs/stale",
            "posted_date": stale_date,
            "text": (
                "Company: Tech Corp. Location: Pune. Junior developer needed. Salary: 5 LPA. "
                "Skills: Python, Django, PostgreSQL, HTML5, CSS3. Full-time role."
            ),
        }
        res_stale = evaluate_lead_quality(lead_stale, min_quality=70, max_age_days=14)
        self.assertIn("stale", res_stale["tags"])

        # Red flags check (deposit fee)
        lead_rf = {
            "url": "https://example.com/jobs/scam",
            "text": (
                "Work from home earning daily target. Registration fee and security deposit required. "
                "Earn from home with pyramid referral income."
            ),
        }
        res_rf = evaluate_lead_quality(lead_rf, min_quality=40)
        self.assertFalse(res_rf["accepted"])
        self.assertIn("red_flag", res_rf["tags"])

        # Seniority mismatch for fresher target
        lead_senior = {
            "url": "https://example.com/jobs/senior-lead",
            "text": (
                "Company: ScaleUp. Location: Hyderabad. Principal Architect and Staff Engineer required. "
                "10+ years of experience leading distributed engineering teams. Salary: 45 LPA."
            ),
        }
        res_senior = evaluate_lead_quality(lead_senior, min_quality=60, target_level="fresher")
        self.assertIn("seniority_mismatch", res_senior["tags"])


# =============================================================================
# 3. TEST FIT SCORER
# =============================================================================
class TestFitScorer(unittest.TestCase):
    """Unit tests for services/market_intelligence/fit_scorer.py"""

    def test_detect_role_family(self):
        self.assertEqual(_detect_role_family("Looking for a full stack software developer"), "software_engineer")
        self.assertEqual(_detect_role_family("We need a data analyst for BI reporting"), "data_analyst")
        self.assertEqual(_detect_role_family("Senior ML engineer and AI research scientist"), "data_scientist")
        self.assertEqual(_detect_role_family("DevOps and SRE platform engineer"), "devops")
        self.assertEqual(_detect_role_family("Product manager for roadmaps and scrum"), "product")
        self.assertEqual(_detect_role_family("UI/UX Designer for Figma workflows"), "design")
        self.assertEqual(_detect_role_family("Account executive for business development"), "sales")
        self.assertEqual(_detect_role_family("Digital marketing and SEO specialist"), "marketing")
        self.assertEqual(_detect_role_family("Chartered accountant for financial audit"), "finance")
        self.assertEqual(_detect_role_family("Talent acquisition recruiter in HR"), "hr")
        self.assertIsNone(_detect_role_family("Chef and kitchen supervisor"))

    def test_candidate_role_family(self):
        cand1 = {"target_roles": ["Software Developer", "Backend Engineer"], "department": "Computer Science"}
        self.assertEqual(_candidate_role_family(cand1), "software_engineer")

        cand2 = {"target_roles": ["Business Analyst"], "department": "Analytics"}
        self.assertEqual(_candidate_role_family(cand2), "data_analyst")

        cand3 = {"target_roles": [], "department": ""}
        self.assertIsNone(_candidate_role_family(cand3))

    def test_grade_and_safe_int(self):
        self.assertEqual(_grade(95), "A")
        self.assertEqual(_grade(80), "A")
        self.assertEqual(_grade(79), "B")
        self.assertEqual(_grade(65), "B")
        self.assertEqual(_grade(64), "C")
        self.assertEqual(_grade(50), "C")
        self.assertEqual(_grade(49), "D")
        self.assertEqual(_grade(0), "D")

        self.assertEqual(_safe_int("85"), 85)
        self.assertEqual(_safe_int(120, hi=100), 100)
        self.assertEqual(_safe_int(-10, lo=0), 0)
        self.assertEqual(_safe_int("invalid", default=50), 50)
        self.assertEqual(_safe_int(None, default=70), 70)

    def test_scoring_dimensions_isolated(self):
        # 1. Role alignment
        pts_ra, _, _ = _score_role_alignment(
            "Backend developer needed",
            {"target_roles": ["Software Engineer"], "department": "CS"},
        )
        self.assertEqual(pts_ra, 20)

        # 2. Tech stack coverage
        pts_ts, match_ts, gap_ts = _score_tech_stack(
            "Requires Python, FastAPI, Docker, and PostgreSQL",
            {"skills": ["Python", "FastAPI", "React"]},
        )
        self.assertGreater(pts_ts, 0)
        self.assertTrue(len(match_ts) > 0)
        self.assertTrue(len(gap_ts) > 0)

        # 3. Seniority fit
        pts_sn_fresher, _, _ = _score_seniority(
            "Hiring fresh graduate entry level intern",
            {"experience_years": 0, "department": "Student"},
        )
        self.assertEqual(pts_sn_fresher, 20)

        # 4. Psychometrics
        pts_ps, _, _ = _score_psychometric({"iq_score": 80, "eq_score": 80, "aq_score": 80})
        self.assertEqual(pts_ps, 12)  # (80/100) * 15 = 12

        pts_ps_none, _, _ = _score_psychometric({})
        self.assertEqual(pts_ps_none, 7)  # neutral score

        # 5. Location
        pts_loc_remote, _, _ = _score_location("Work from home remote india", {"location": "Hyderabad"})
        self.assertEqual(pts_loc_remote, 10)

        pts_loc_city, _, _ = _score_location("Office in Bangalore", {"location": "Bengaluru / Bangalore"})
        self.assertEqual(pts_loc_city, 10)

        # 6. Signal
        pts_sig, _, _ = _score_signal("Company: X. Location: Bangalore. Salary: 10 LPA. Tech: Python, Docker, React, AWS, SQL.")
        self.assertGreaterEqual(pts_sig, 5)

    def test_score_job_fit_composite(self):
        posting = (
            "Company: FinCorp. Location: Bangalore. Looking for an entry-level Junior Backend Developer. "
            "Salary: 7-9 LPA. Tech Stack: Python, FastAPI, PostgreSQL, Git, Docker."
        )
        candidate = {
            "target_roles": ["Software Developer", "Backend Engineer"],
            "department": "Computer Science",
            "skills": ["Python", "FastAPI", "PostgreSQL", "Git"],
            "experience_years": 0,
            "location": "Bangalore",
            "iq_score": 85,
            "eq_score": 75,
            "aq_score": 80,
        }
        res = score_job_fit(posting, candidate)
        self.assertIn("score", res)
        self.assertIn("grade", res)
        self.assertIn("breakdown", res)
        self.assertIn("match_points", res)
        self.assertIn("gaps", res)
        self.assertGreaterEqual(res["score"], 70)
        self.assertIn(res["grade"], ["A", "B"])

    def test_generate_job_match_card(self):
        posting = (
            "Company: StartupAI. Location: Remote. We are building fast-paced LLM infrastructure. "
            "Salary: 15 LPA. Looking for high energy Python and Docker builders."
        )
        candidate = {
            "target_roles": ["Software Engineer"],
            "department": "Computer Science",
            "skills": ["Python", "Docker", "FastAPI"],
            "experience_years": 1,
            "archetype": "THE_BUILDER",
            "eq_score": 80,
            "aq_score": 85,
            "placement_readiness_score": 90,
            "location": "Remote",
        }
        card = generate_job_match_card(posting, candidate, job_meta={"title": "AI Backend Engineer", "company": "StartupAI"})
        self.assertEqual(card["job_title"], "AI Backend Engineer")
        self.assertEqual(card["company"], "StartupAI")
        self.assertEqual(len(card["dimensions"]), 5)

        dimension_names = [d["name"] for d in card["dimensions"]]
        self.assertIn("Technical Skills Match", dimension_names)
        self.assertIn("Experience & Seniority Fit", dimension_names)
        self.assertIn("Behavioral & Culture Fit", dimension_names)
        self.assertIn("Location & Logistics", dimension_names)
        self.assertIn("Placement & Career Alignment", dimension_names)
        self.assertIn("key_strengths", card)
        self.assertIn("growth_gaps", card)


# =============================================================================
# 4. TEST INTERVIEW PREP
# =============================================================================
class TestInterviewPrep(unittest.TestCase):
    """Unit tests for services/market_intelligence/interview_prep.py"""

    def test_generate_interview_prep_builder(self):
        student = {
            "full_name": "Aarav Sharma",
            "skills": ["Python", "FastAPI", "Docker", "PostgreSQL"],
            "department": "Information Technology",
            "target_roles": ["Backend Developer"],
            "archetype": "THE_BUILDER",
            "iq_score": 85,
            "eq_score": 75,
            "aq_score": 80,
        }
        job = {
            "title": "Junior Backend Engineer",
            "company": "CloudTech Systems",
            "description": "Building microservices using Python, FastAPI, and Docker in Bangalore.",
            "requirements": "Strong knowledge of Python, Docker, and REST APIs.",
        }
        prep = generate_interview_prep(student, job)

        self.assertEqual(prep["candidate_name"], "Aarav Sharma")
        self.assertEqual(prep["role_title"], "Junior Backend Engineer")
        self.assertEqual(prep["company"], "CloudTech Systems")
        self.assertEqual(prep["archetype"], "THE_BUILDER")

        # Technical questions verification
        self.assertTrue(len(prep["technical_questions"]) > 0)
        topics = [q["topic"] for q in prep["technical_questions"]]
        self.assertTrue(any(t in ["Python", "FastAPI", "Docker"] for t in topics))

        # Behavioral questions verification
        self.assertTrue(len(prep["behavioral_star_questions"]) >= 3)
        arch_q = prep["behavioral_star_questions"][0]
        self.assertIn("THE_BUILDER", arch_q["category"])
        self.assertIn("Situation", arch_q["star_starter"])

        # Checklist and Elevator pitch
        self.assertEqual(len(prep["research_checklist"]), 4)
        self.assertEqual(prep["candidate_name"], "Aarav Sharma")
        self.assertIn("CloudTech Systems", prep["elevator_pitch"])
        self.assertIn("THE_BUILDER", prep["elevator_pitch"])

    def test_generate_interview_prep_archetype_variations(self):
        # Leader Archetype
        student_leader = {
            "full_name": "Priya Nair",
            "skills": ["Python", "AWS"],
            "department": "Computer Science",
            "archetype": "LEADER",
        }
        job = {"title": "Engineering Lead", "company": "GrowthCorp"}
        prep_leader = generate_interview_prep(student_leader, job)
        self.assertIn("LEADER", prep_leader["behavioral_star_questions"][0]["category"])

        # Anchor Archetype
        student_anchor = {
            "full_name": "Vikram Sen",
            "skills": ["SQL", "PostgreSQL"],
            "department": "Data Science",
            "archetype": "ANCHOR",
        }
        prep_anchor = generate_interview_prep(student_anchor, job)
        self.assertIn("ANCHOR", prep_anchor["behavioral_star_questions"][0]["category"])


# =============================================================================
# 5. TEST PROFILE EXPANDER
# =============================================================================
class TestProfileExpander(unittest.TestCase):
    """Unit tests for services/market_intelligence/profile_expander.py"""

    def test_extract_github_handle(self):
        self.assertEqual(_extract_github_handle("https://github.com/karpathy"), "karpathy")
        self.assertEqual(_extract_github_handle("https://github.com/karpathy/"), "karpathy")
        self.assertEqual(_extract_github_handle("github.com/torvalds"), "torvalds")
        self.assertEqual(_extract_github_handle("@octocat"), "octocat")
        self.assertEqual(_extract_github_handle("sriharsha"), "sriharsha")
        self.assertEqual(_extract_github_handle(""), "")
        self.assertEqual(_extract_github_handle(None), "")

    @patch("urllib.request.urlopen")
    def test_expand_github_profile_success(self, mock_urlopen):
        # Mock user API response
        user_json = json.dumps({
            "login": "octocat",
            "name": "The Octocat",
            "bio": "Open source contributor & builder",
            "public_repos": 8,
        }).encode("utf-8")

        # Mock repos API response
        repos_json = json.dumps([
            {
                "name": "awesome-fastapi",
                "stargazers_count": 120,
                "forks_count": 15,
                "language": "Python",
                "topics": ["fastapi", "docker", "supabase"],
                "description": "Production FastAPI starter template with PostgreSQL and Supabase.",
                "html_url": "https://github.com/octocat/awesome-fastapi",
            },
            {
                "name": "nextjs-dashboard",
                "stargazers_count": 80,
                "forks_count": 10,
                "language": "TypeScript",
                "topics": ["nextjs", "react", "tailwindcss"],
                "description": "Interactive Next.js and React web dashboard.",
                "html_url": "https://github.com/octocat/nextjs-dashboard",
            },
        ]).encode("utf-8")

        # Setup urlopen side effect for the two consecutive calls
        mock_resp_user = MagicMock()
        mock_resp_user.read.return_value = user_json
        mock_resp_user.__enter__.return_value = mock_resp_user

        mock_resp_repos = MagicMock()
        mock_resp_repos.read.return_value = repos_json
        mock_resp_repos.__enter__.return_value = mock_resp_repos

        mock_urlopen.side_effect = [mock_resp_user, mock_resp_repos]

        profile = expand_github_profile("https://github.com/octocat")
        self.assertEqual(profile["handle"], "octocat")
        self.assertEqual(profile["name"], "The Octocat")
        self.assertIn("Python", profile["inferred_skills"])
        self.assertIn("TypeScript", profile["inferred_skills"])
        self.assertIn("FastAPI", profile["inferred_skills"])
        self.assertIn("Docker", profile["inferred_skills"])
        self.assertIn("React", profile["inferred_skills"])
        self.assertIn("Supabase", profile["inferred_skills"])
        self.assertEqual(len(profile["repo_highlights"]), 2)

    @patch("urllib.request.urlopen")
    def test_expand_github_profile_network_error_resilience(self, mock_urlopen):
        # Simulate network failure / 404 / rate-limit
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")

        profile = expand_github_profile("nonexistent-user-xyz")
        self.assertEqual(profile["handle"], "nonexistent-user-xyz")
        self.assertEqual(profile["inferred_skills"], [])
        self.assertEqual(profile["confidence_level"], "Low")

    def test_expand_github_profile_empty_handle(self):
        profile = expand_github_profile("")
        self.assertIn("error", profile)
        self.assertEqual(profile["inferred_skills"], [])

    @patch("services.market_intelligence.profile_expander.expand_github_profile")
    def test_expand_candidate_profile(self, mock_github):
        mock_github.return_value = {
            "handle": "studentdev",
            "inferred_skills": ["Python", "FastAPI", "Docker", "PostgreSQL", "Redis"],
            "repo_highlights": [],
            "confidence_level": "High",
        }

        student = {
            "id": "student-uuid-1",
            "full_name": "Dev Candidate",
            "skills": ["Python", "SQL"],
            "github_url": "https://github.com/studentdev",
        }

        expanded = expand_candidate_profile(student)
        self.assertEqual(expanded["candidate_id"], "student-uuid-1")
        self.assertEqual(expanded["original_skills_count"], 2)
        self.assertIn("FastAPI", expanded["new_skills_discovered"])
        self.assertIn("Docker", expanded["new_skills_discovered"])
        self.assertIn("Redis", expanded["new_skills_discovered"])
        self.assertIn("SQL", expanded["all_merged_skills"])
        self.assertIn("Python", expanded["all_merged_skills"])
        self.assertEqual(expanded["total_skills_count"], len(expanded["all_merged_skills"]))


# =============================================================================
# 6. TEST SKILL GAP REPORT
# =============================================================================
class TestSkillGap(unittest.TestCase):
    """Unit tests for services/market_intelligence/skill_gap.py"""

    def test_generate_skill_gap_report_standard(self):
        students = [
            {"id": "s1", "skills": ["Python", "SQL"], "department": "CS"},
            {"id": "s2", "skills": ["Python", "HTML5"], "department": "IT"},
            {"id": "s3", "skills": ["Java", "SQL"], "department": "CS"},
        ]
        jobs = [
            {"title": "Backend Dev", "description": "Need Python, FastAPI, Docker, and PostgreSQL."},
            {"title": "Full Stack Dev", "description": "Need React, Next.js, Python, and Docker."},
            {"title": "Data Engineer", "description": "Need Python, SQL, Docker, and PostgreSQL."},
        ]

        report = generate_skill_gap_report(students, jobs)
        summary = report["cohort_summary"]
        self.assertEqual(summary["total_students"], 3)
        self.assertEqual(summary["total_jobs_analyzed"], 3)
        self.assertGreater(summary["unique_market_skills"], 0)

        # Check prioritized gaps
        gaps = report["prioritized_gaps"]
        self.assertTrue(len(gaps) > 0)
        gap_skills = [g["skill"] for g in gaps]
        self.assertIn("Docker", gap_skills)
        self.assertIn("PostgreSQL", gap_skills)

        # Docker appears in 3/3 jobs (100%), supply is 0/3 (0%), missing 100% -> priority score 100.0 (Critical)
        docker_gap = next(g for g in gaps if g["skill"] == "Docker")
        self.assertEqual(docker_gap["market_demand_pct"], 100.0)
        self.assertEqual(docker_gap["cohort_supply_pct"], 0.0)
        self.assertEqual(docker_gap["cohort_missing_pct"], 100.0)
        self.assertEqual(docker_gap["priority_score"], 100.0)
        self.assertEqual(docker_gap["severity"], "Critical")
        self.assertIn("platform", docker_gap["learning_resource"])
        self.assertIn("url", docker_gap["learning_resource"])

        # Check TPO Interventions
        interventions = report["recommended_interventions"]
        self.assertTrue(len(interventions) > 0)
        interv_skills = [iv["target_skill"] for iv in interventions]
        self.assertIn("Docker", interv_skills)

    def test_generate_skill_gap_report_empty_inputs(self):
        report = generate_skill_gap_report([], [])
        self.assertEqual(report["cohort_summary"]["total_students"], 0)
        self.assertEqual(report["cohort_summary"]["total_jobs_analyzed"], 0)
        self.assertEqual(report["prioritized_gaps"], [])
        self.assertEqual(report["recommended_interventions"], [])


# =============================================================================
# 7. TEST DRAFTER REVIEWER PIPELINE
# =============================================================================
class TestDrafterReviewer(unittest.TestCase):
    """Unit tests for services/market_intelligence/drafter_reviewer.py"""

    def test_critique_application_packet(self):
        draft_packet = {
            "cover_letter_text": (
                "Dear Hiring Team, I am a hard-working individual and a dynamic self-starter. "
                "I am a team player who likes to think outside the box to deliver synergy."
            ),
            "resume_context": {
                "top_skills": ["Python", "FastAPI"],
            },
        }
        job_description = "We need Python, FastAPI, Docker, AWS, and PostgreSQL engineers."
        critique = _critique_application_packet(draft_packet, job_description)

        self.assertIn("ats_score", critique)
        self.assertIn("ats_grade", critique)
        self.assertIn("keyword_coverage_pct", critique)
        self.assertIn("detected_cliches", critique)
        self.assertIn("hard-working individual", critique["detected_cliches"])
        self.assertIn("team player", critique["detected_cliches"])
        self.assertIn("think outside the box", critique["detected_cliches"])
        self.assertIn("synergy", critique["detected_cliches"])
        self.assertTrue(len(critique["missing_keywords"]) > 0)

    def test_revise_cover_letter_cliche_removal(self):
        original = "I am a hard-working individual and a team player."
        cliches = ["hard-working individual", "team player"]
        revised = _revise_cover_letter(original, cliches)
        self.assertNotIn("hard-working individual", revised)
        self.assertNotIn("team player", revised)
        self.assertIn("diligent engineer", revised)
        self.assertIn("collaborative contributor", revised)

    def test_run_drafter_reviewer_pipeline_end_to_end(self):
        student = {
            "full_name": "Rohan Gupta",
            "department": "Computer Science",
            "skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
            "archetype": "THE_BUILDER",
            "location": "Bangalore",
        }
        job = {
            "title": "Backend Software Engineer",
            "company": "Nexus Innovations",
            "description": "Looking for a Backend Software Engineer with Python, FastAPI, Docker, PostgreSQL, and AWS.",
            "location": "Bangalore",
        }

        result = run_drafter_reviewer_pipeline(student, job)
        self.assertEqual(result["candidate_name"], "Rohan Gupta")
        self.assertEqual(result["role_title"], "Backend Software Engineer")
        self.assertEqual(result["company"], "Nexus Innovations")

        # Audit validation
        audit = result["ats_audit"]
        self.assertIn("score", audit)
        self.assertIn("grade", audit)
        self.assertIn("keyword_coverage_pct", audit)
        self.assertIn("matched_keywords", audit)
        self.assertIn("critique_notes", audit)

        # Final application packet validation
        packet = result["final_application_packet"]
        self.assertIn("cover_letter_text", packet)
        self.assertIn("resume_context", packet)
        self.assertIn("cold_email", packet)
        self.assertIn("linkedin_note", packet)
        self.assertIn("founder_message", packet)
        self.assertIn("follow_up_sequence", packet)

        self.assertIn("Nexus Innovations", packet["cover_letter_text"])
        self.assertIn("Rohan Gupta", packet["cover_letter_text"])
        self.assertEqual(len(packet["follow_up_sequence"]), 3)


# =============================================================================
# 8. TEST OUTREACH GENERATOR
# =============================================================================
class TestOutreachGenerator(unittest.TestCase):
    """Unit tests for services/market_intelligence/outreach_generator.py"""

    def test_voice_profiles(self):
        self.assertIn("analytical rigour", _voice("analyst")["strength"])
        self.assertIn("full-stack delivery", _voice("builder")["strength"])
        self.assertIn("stakeholder management", _voice("leader")["strength"])
        self.assertIn("visual prototyping", _voice("creator")["strength"])
        self.assertIn("subject-matter expertise", _voice("specialist")["strength"])
        # Default fallback
        self.assertIn("collaborative approach", _voice("unknown_role")["strength"])

    def test_top_skills_and_job_location(self):
        student = {"skills": ["Java", "Python", "C++", "FastAPI", "Docker"]}
        job = {"title": "Dev", "description": "We need FastAPI, Docker, and PostgreSQL.", "location": "Hyderabad"}

        skills = _top_skills(student, job, n=3)
        self.assertIn("FastAPI", skills)
        self.assertIn("Docker", skills)

        self.assertEqual(_job_location(job), "Hyderabad")
        self.assertEqual(_job_location({"title": "Dev", "description": "Work in Pune office."}), "Pune")

    def test_generate_outreach_draft_components(self):
        student = {
            "full_name": "Ananya Roy",
            "department": "Computer Science",
            "skills": ["Python", "FastAPI", "SQL"],
            "archetype": "analyst",
        }
        job = {
            "title": "Junior Data Analyst",
            "company": "Insight Analytics",
            "description": "Looking for SQL and Python specialists in Bangalore.",
        }
        draft = generate_outreach_draft(student, job)

        self.assertIn("Subject: Application — Junior Data Analyst | Ananya Roy", draft["cold_email"])
        self.assertIn("Insight Analytics", draft["cold_email"])
        self.assertIn("Ananya Roy", draft["linkedin_note"])
        self.assertIn("Insight Analytics", draft["founder_message"])
        self.assertEqual(len(draft["follow_up_sequence"]), 3)
        self.assertIn("Day 3", draft["follow_up_sequence"][0])
        self.assertIn("Day 7", draft["follow_up_sequence"][1])
        self.assertIn("Day 14", draft["follow_up_sequence"][2])

    def test_build_resume_and_cover_letter_context(self):
        student = {
            "full_name": "Karthik Raja",
            "department": "Mechanical Engineering",
            "skills": ["Python", "SQL", "Tableau"],
            "archetype": "builder",
        }
        job = {
            "title": "Business Intelligence Analyst",
            "company": "RetailPulse",
            "description": "Looking for Tableau, SQL, and Python experts in Chennai.",
        }
        r_ctx = build_resume_context(student, job)
        self.assertEqual(r_ctx["candidate_name"], "Karthik Raja")
        self.assertEqual(r_ctx["role_title"], "Business Intelligence Analyst")
        self.assertEqual(r_ctx["company"], "RetailPulse")
        self.assertIn("Python", r_ctx["top_skills"])

        cl_ctx = build_cover_letter_context(student, job)
        self.assertEqual(cl_ctx["candidate_name"], "Karthik Raja")
        self.assertEqual(cl_ctx["role_title"], "Business Intelligence Analyst")
        self.assertIn("follow_up_note", cl_ctx)


if __name__ == "__main__":
    unittest.main()
