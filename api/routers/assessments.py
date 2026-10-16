from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from api.schemas.assessment import TokenClaims, AssessmentAttemptRead, AppRole
from api.deps import get_current_claims
from api.db import get_anon_client

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("/history", response_model=List[AssessmentAttemptRead])
async def get_assessment_history(
    claims: TokenClaims = Depends(get_current_claims),
):
    client = get_anon_client()

    if claims.role == AppRole.student:
        res = (
            client.table("assessment_attempts")
            .select("*")
            .eq("student_id", str(claims.sub))
            .execute()
        )
    elif claims.role == AppRole.institution:
        if not claims.institution_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No institution_id in token"
            )
        res = (
            client.table("assessment_attempts")
            .select("*")
            .eq("institution_id", claims.institution_id)
            .execute()
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{claims.role}' cannot access history"
        )

    return res.data
