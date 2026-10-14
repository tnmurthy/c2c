from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any

from api.schemas.typesafe import (
    TypeSafeEvaluateRequest,
    TypeSafeEvaluateResponse,
    TypeSafeStatusResponse,
)
from api.services.typesafe_service import typesafe_service

router = APIRouter(prefix="/typesafe", tags=["TypeSafe AI"])


@router.get("/status", response_model=TypeSafeStatusResponse)
def get_typesafe_status():
    """
    Returns the current status of the TypeSafe AI System One integration.
    """
    return typesafe_service.get_status()


@router.post("/evaluate", response_model=TypeSafeEvaluateResponse)
def evaluate_candidate(payload: TypeSafeEvaluateRequest):
    """
    Evaluates candidate responses using TypeSafe AI's System One (Choice, Score, Noul primitives).
    """
    try:
        return typesafe_service.evaluate(
            responses=payload.responses,
            candidate_name=payload.candidate_name or "Candidate",
            custom_rubrics=payload.custom_rubrics
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TypeSafe evaluation error: {str(e)}")
