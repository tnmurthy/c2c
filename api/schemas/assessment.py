from pydantic import BaseModel, UUID4
from typing import Optional
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
