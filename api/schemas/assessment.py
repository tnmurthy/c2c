from pydantic import BaseModel, UUID4
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class AppRole(str, Enum):
    student = "student"
    institution = "institution"
    employer = "employer"
    admin = "admin"


class TokenClaims(BaseModel):
    sub: UUID4
    role: AppRole
    institution_id: Optional[str] = None


class AssessmentAttemptRead(BaseModel):
    id: UUID4
    student_id: UUID4
    assessment_id: UUID4
    attempt_number: int
    score: float
    created_at: datetime


class InstitutionOnboard(BaseModel):
    name: str
    type: str
    domain: str
    location: str


class AssessmentSubmit(BaseModel):
    student_id: str
    responses: List[Dict[str, Any]] # Expected: { "item_id": "...", "response": "..." }


class FeedbackSubmit(BaseModel):
    student_id: str
    reviewer_email: str
    reviewer_role: str
    dimension_scores: Dict[str, float]
    feedback_text: str


class SessionStart(BaseModel):
    student_id: str


class AnswerSubmit(BaseModel):
    item_id: str
    response: str
