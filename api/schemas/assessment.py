from pydantic import BaseModel
from typing import Optional, List, Dict, Any

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
