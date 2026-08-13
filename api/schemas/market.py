from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ScoreFitRequest(BaseModel):
    posting: str
    candidate: dict[str, Any]


class EvaluateLeadRequest(BaseModel):
    lead: dict[str, Any]
    min_quality: int = 60
    target_level: str = "fresher"
    max_age_days: int = 14


class ExtractIntelRequest(BaseModel):
    text: str


class DiscoveryRunRequest(BaseModel):
    sources: list[str] = []
    max_leads: int = 50


class GenerateResumeRequest(BaseModel):
    lead_id: str
    candidate: dict[str, Any]
    posting: str = ""


class GenerateCoverLetterRequest(BaseModel):
    lead_id: str
    posting: str
    candidate: dict[str, Any]


class GenerateOutreachRequest(BaseModel):
    posting: str
    candidate: dict[str, Any]
    style: str = "cold_email"  # cold_email | linkedin_note | founder_message
