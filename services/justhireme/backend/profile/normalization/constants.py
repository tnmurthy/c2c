"""Shared lookup tables and compiled regexes used across the normalization package.

These are pure data/constants with no behavior of their own; every submodule
in ``profile.normalization`` imports from here instead of redefining patterns.
"""

from __future__ import annotations

import re

SECTION_TITLES = {
    "about",
    "achievements",
    "certifications",
    "contact",
    "education",
    "experience",
    "featured projects",
    "featured work",
    "portfolio",
    "projects",
    "selected projects",
    "selected work",
    "skills",
    "technical expertise",
    "technical skills",
    "work",
}

NON_PROJECT_TITLES = SECTION_TITLES | {
    "ai agents & automation",
    "backend",
    "contact me",
    "frontend",
    "languages",
    "services",
    "tools",
}

LOCATION_WORDS = {
    "andhra pradesh",
    "bengaluru",
    "bangalore",
    "chandigarh",
    "delhi",
    "haryana",
    "hyderabad",
    "india",
    "jalandhar",
    "karnataka",
    "maharashtra",
    "mumbai",
    "new delhi",
    "noida",
    "punjab",
    "remote",
    "uttar pradesh",
}

EDUCATION_ANCHOR_RE = re.compile(
    r"\b(university|college|institute|school|academy|polytechnic|b\.?\s?tech|bachelor|master|m\.?\s?tech|"
    r"b\.?\s?e\.?|m\.?\s?e\.?|bsc|msc|bca|mca|mba|ph\.?d|degree|diploma)\b",
    re.I,
)
INSTITUTION_ANCHOR_RE = re.compile(r"\b(university|college|institute|school|academy|polytechnic)\b", re.I)
DEGREE_ANCHOR_RE = re.compile(
    r"\b(b\.?\s?tech|bachelor|master|m\.?\s?tech|b\.?\s?e\.?|m\.?\s?e\.?|bsc|msc|bca|mca|mba|ph\.?d|degree|diploma)\b",
    re.I,
)
GRADE_RE = re.compile(r"\b(cgpa|gpa|grade|percentage|marks?|score)\b|^\d+(?:\.\d+)?\s*/\s*\d+$|^\d+(?:\.\d+)?$", re.I)
DATE_RE = re.compile(r"\b(?:19|20)\d{2}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b", re.I)
ACTION_SENTENCE_RE = re.compile(
    r"^(built|created|developed|designed|engineered|implemented|integrated|led|launched|shipped|supports?|"
    r"automated|optimized|improved|reduced|increased|features?|worked|used|using|maintained|deployed)\b",
    re.I,
)
URL_RE = re.compile(r"https?://[^\s|)]+|www\.[^\s|)]+", re.I)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?\d[\d\s().-]{7,}\d)")
CERT_DATE_RE = re.compile(
    r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*'?\.?\s*\d{2,4}\b|\b(?:19|20)\d{2}\b",
    re.I,
)
GENERIC_PROJECT_TITLE_FRAGMENTS = {
    "api",
    "apis",
    "conditioning",
    "certificate link",
    "github",
    "repo",
    "repository",
    "live",
    "demo",
    "link",
    "source code",
}
CERTIFICATE_ISSUERS = {
    "nptel",
    "coursera",
    "udemy",
    "edx",
    "aws",
    "google",
    "microsoft",
    "oracle",
    "meta",
    "ibm",
    "linkedin learning",
}
REPO_METADATA_SKILL_RE = re.compile(
    r"(?i)(?:"
    r"^\d+(?:\.\d+)?\s+(?:forks?|stars?|watchers?|issues?|prs?|pull\s+requests?|commits?|branches?|repos?)$|"
    r"\b(?:maintained|updated|pushed|created)\s+(?:through|until|on|at)\s+(?:19|20)\d{2}(?:-\d{2}){0,2}\b|"
    r"\b(?:last\s+pushed|pushed\s+at|updated\s+at|created\s+at)\b|"
    r"\b(?:live\s+preview|deployed\s+live|accessible\s+via|fully\s+client-side)\b"
    r")"
)
GENERIC_SKILL_DENYLIST = {
    "copy",
    "fork",
    "forks",
    "maintain",
    "maintained",
    "preview",
    "send",
    "sent",
    "star",
    "stars",
    "updated",
}
