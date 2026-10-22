"""
services/market_intelligence/skill_gap.py
=========================================
Cohort & Student Skill Gap Heatmap Generator inspired by ai-job-search /upskill.
Analyzes the gap between candidate/cohort skill vectors and a target corpus of
active market jobs, producing a prioritized heatmap and free study roadmap.
No LLM or external keys required.

Public API
----------
generate_skill_gap_report(students: list[dict], jobs: list[dict]) -> dict
"""

from __future__ import annotations

from collections import Counter
from typing import Any
from services.market_intelligence.lead_intel import extract_tech_stack

# Curated free learning resources for common campus tech stack gaps
_FREE_LEARNING_RESOURCES: dict[str, dict[str, str]] = {
    "Python": {
        "platform": "Python.org & freeCodeCamp",
        "url": "https://www.freecodecamp.org/learn/scientific-computing-with-python/",
        "est_hours": "20 hrs",
    },
    "TypeScript": {
        "platform": "TypeScript Handbook & Executable Spikes",
        "url": "https://www.typescriptlang.org/docs/handbook/intro.html",
        "est_hours": "15 hrs",
    },
    "React": {
        "platform": "React Official Docs (react.dev)",
        "url": "https://react.dev/learn",
        "est_hours": "25 hrs",
    },
    "Next.js": {
        "platform": "Next.js Official Learn Course",
        "url": "https://nextjs.org/learn",
        "est_hours": "15 hrs",
    },
    "FastAPI": {
        "platform": "FastAPI Official Tutorial",
        "url": "https://fastapi.tiangolo.com/tutorial/",
        "est_hours": "12 hrs",
    },
    "Docker": {
        "platform": "Docker Official Getting Started",
        "url": "https://docs.docker.com/get-started/",
        "est_hours": "10 hrs",
    },
    "Kubernetes": {
        "platform": "Kubernetes Basics Interactive",
        "url": "https://kubernetes.io/docs/tutorials/kubernetes-basics/",
        "est_hours": "20 hrs",
    },
    "PostgreSQL": {
        "platform": "PostgreSQL Tutorial & Supabase Docs",
        "url": "https://www.postgresqltutorial.com/",
        "est_hours": "15 hrs",
    },
    "SQL": {
        "platform": "SQLZoo & Khan Academy SQL",
        "url": "https://sqlzoo.net/",
        "est_hours": "10 hrs",
    },
    "AWS": {
        "platform": "AWS Skill Builder Free Tier",
        "url": "https://skillbuilder.aws/",
        "est_hours": "30 hrs",
    },
    "AI/ML": {
        "platform": "Fast.ai Practical Deep Learning",
        "url": "https://course.fast.ai/",
        "est_hours": "40 hrs",
    },
    "RAG": {
        "platform": "LangChain & LlamaIndex Guides",
        "url": "https://python.langchain.com/docs/tutorials/rag/",
        "est_hours": "15 hrs",
    },
    "LLMs": {
        "platform": "DeepLearning.AI Short Courses",
        "url": "https://www.deeplearning.ai/short-courses/",
        "est_hours": "10 hrs",
    },
    "Tailwind CSS": {
        "platform": "Tailwind Labs Official Course",
        "url": "https://tailwindcss.com/docs",
        "est_hours": "8 hrs",
    },
    "MongoDB": {
        "platform": "MongoDB University Free Tier",
        "url": "https://learn.mongodb.com/",
        "est_hours": "12 hrs",
    },
}


def generate_skill_gap_report(students: list[dict], jobs: list[dict]) -> dict[str, Any]:
    """
    Generate a prioritized Skill Gap Heatmap comparing student competencies
    against active market job requirements.

    Parameters
    ----------
    students : list[dict]
        List of student records with 'skills' list and 'department'.
    jobs : list[dict]
        List of job records with 'title', 'description', 'requirements'.

    Returns
    -------
    dict
        Structured heatmap containing:
        - cohort_summary (student count, job count, total market skills)
        - prioritized_gaps (sorted by market demand frequency x missing ratio)
        - coverage_matrix (per-skill cohort supply vs market demand)
        - recommended_interventions (actionable workshops for TPOs)
    """
    total_students = len(students)
    total_jobs = len(jobs)

    # 1. Aggregate market demand frequency for all skills
    market_skill_counts: Counter[str] = Counter()
    for j in jobs:
        text = f"{j.get('title', '')} {j.get('description', '')} {j.get('requirements', '')}"
        extracted = extract_tech_stack(text)
        for s in set(extracted):
            market_skill_counts[s] += 1

    # 2. Aggregate student skill supply frequency
    student_skill_counts: Counter[str] = Counter()
    for st in students:
        s_list = st.get("skills") or []
        for s in set(s_list):
            student_skill_counts[s] += 1

    # 3. Calculate Gap Index for every skill in market demand
    gap_analysis = []
    for skill, demand_count in market_skill_counts.items():
        supply_count = student_skill_counts.get(skill, 0)
        demand_pct = round((demand_count / max(1, total_jobs)) * 100, 1)
        supply_pct = round((supply_count / max(1, total_students)) * 100, 1)
        
        # Missing ratio among cohort
        missing_count = total_students - supply_count
        missing_pct = round((missing_count / max(1, total_students)) * 100, 1)
        
        # Priority Score = Demand Volume * Missing Percentage
        priority_score = round(demand_pct * (missing_pct / 100), 1)

        severity = "Critical" if priority_score >= 40 else ("Moderate" if priority_score >= 15 else "Low")
        
        resource = _FREE_LEARNING_RESOURCES.get(skill, {
            "platform": "Official Documentation & GitHub Examples",
            "url": f"https://github.com/topics/{skill.lower().replace(' ', '-')}",
            "est_hours": "15 hrs",
        })

        gap_analysis.append({
            "skill": skill,
            "market_demand_jobs": demand_count,
            "market_demand_pct": demand_pct,
            "cohort_supply_students": supply_count,
            "cohort_supply_pct": supply_pct,
            "cohort_missing_pct": missing_pct,
            "priority_score": priority_score,
            "severity": severity,
            "learning_resource": resource,
        })

    # Sort prioritized gaps descending by priority score
    sorted_gaps = sorted(gap_analysis, key=lambda x: x["priority_score"], reverse=True)

    # 4. Generate targeted institutional interventions for TPOs
    interventions = []
    top_critical = [g for g in sorted_gaps if g["severity"] == "Critical"][:4]
    for cg in top_critical:
        interventions.append({
            "title": f"Bootcamp Directive: {cg['skill']} Intensive",
            "reason": f"Required in {cg['market_demand_pct']}% of active postings, but only {cg['cohort_supply_pct']}% of cohort lists it.",
            "recommended_format": f"3-day practical hackathon or {cg['learning_resource']['est_hours']} self-paced module via {cg['learning_resource']['platform']}.",
            "target_skill": cg["skill"],
        })

    # Cohort overall readiness index (average supply coverage across top 10 market skills)
    top_10_market_skills = sorted(market_skill_counts.keys(), key=lambda k: market_skill_counts[k], reverse=True)[:10]
    avg_coverage = 0
    if top_10_market_skills:
        sum_cov = sum(
            round((student_skill_counts.get(sk, 0) / max(1, total_students)) * 100, 1)
            for sk in top_10_market_skills
        )
        avg_coverage = round(sum_cov / len(top_10_market_skills), 1)

    return {
        "cohort_summary": {
            "total_students": total_students,
            "total_jobs_analyzed": total_jobs,
            "unique_market_skills": len(market_skill_counts),
            "top_10_market_readiness_index": avg_coverage,
        },
        "prioritized_gaps": sorted_gaps,
        "recommended_interventions": interventions,
    }
