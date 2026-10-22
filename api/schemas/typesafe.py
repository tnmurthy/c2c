from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum


class FounderArchetype(str, Enum):
    builder = "Builder"
    leader = "Leader"
    rainmaker = "Rainmaker"
    anchor = "Anchor"


class TypeSafeEvaluateRequest(BaseModel):
    student_id: Optional[str] = None
    candidate_name: Optional[str] = "Candidate"
    responses: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of assessment responses with item_id, text, and response value"
    )
    custom_rubrics: Optional[Dict[str, str]] = Field(
        default=None,
        description="Optional custom rubrics for IQ, EQ, AQ, SQ, SpQ"
    )


class DimensionScore(BaseModel):
    score: float = Field(..., ge=0, le=100)
    percentile_band: str
    confidence: float = Field(..., ge=0, le=1.0)
    rationale: str


class TypeSafeEvaluateResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    candidate_name: str
    primary_archetype: FounderArchetype
    archetype_probabilities: Dict[str, float]
    scores: Dict[str, DimensionScore]
    placement_ready: bool
    placement_ready_probability: Optional[float] = None
    requires_intervention: bool
    requires_intervention_probability: Optional[float] = None
    ai_confidence: float
    model_provider: str = "TypeSafe AI System One (Jev)"
    is_live_api: bool = False
    timestamp: str


class TypeSafeStatusResponse(BaseModel):
    provider: str = "TypeSafe AI"
    flagship_model: str = "Jev (System One)"
    api_key_configured: bool
    latency_target_ms: int = 50
    supported_primitives: List[str] = ["Choice", "Score", "Noul"]
    status: str


class TypeSafeFeaturizeRequest(BaseModel):
    student_id: Optional[str] = None
    candidate_name: Optional[str] = "Candidate"
    free_text: str = Field(
        ...,
        description="Candidate resume, bio, project descriptions, or interview notes"
    )
    custom_probes: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="Optional custom probes matching TypeSafe autoresearch format"
    )


class TypeSafeFeatureColumn(BaseModel):
    name: str
    kind: str = Field(..., description="'intensity' (Score) or 'presence' (Noul)")
    mean: float = Field(..., description="Expected rubric level or probability")
    spread_sd: float = Field(0.0, description="Uncertainty / standard deviation across levels")
    interpretation: str


class TypeSafeFeaturizeResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    candidate_name: str
    features: Dict[str, TypeSafeFeatureColumn]
    numeric_vector: List[float] = Field(..., description="CatBoost/GBDT-ready float array")
    feature_names: List[str] = Field(..., description="Column names corresponding to numeric_vector")
    model_provider: str = "TypeSafe AI System One (Jev Autoresearch Engine)"
    is_live_api: bool = False
    timestamp: str
