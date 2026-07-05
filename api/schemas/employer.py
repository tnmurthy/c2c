from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class EmployerOnboard(BaseModel):
    company_name: str
    industry: str
    contact_person: str

class JobCreate(BaseModel):
    title: str
    description: str
    requirements: list[str]
    location: Optional[str] = None
    is_remote: bool = False
    salary_range: Optional[str] = None
    role_type: Optional[str] = "tech"

class JobMatchRequest(BaseModel):
    role_type: Optional[str] = "tech"
