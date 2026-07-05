from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class StudentOnboard(BaseModel):
    full_name: str
    email: str
    department: str
    graduation_year: int
    institution_id: Optional[str] = None

class StudentProfileUpdate(BaseModel):
    bio: Optional[str] = None
    skills: Optional[list[str]] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    resume_url: Optional[str] = None

class ApplicationCreate(BaseModel):
    job_id: str
