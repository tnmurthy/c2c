from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class AuditRequest(BaseModel):
    candidate: Dict[str, Any]
    job_description: str

class OrdealRequest(BaseModel):
    candidate_name: str
    gaps: List[Any]

class PortfolioRequest(BaseModel):
    candidate: Dict[str, Any]
    projects: List[Dict[str, Any]]
    folders: List[Dict[str, Any]]
