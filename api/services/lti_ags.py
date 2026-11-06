"""
LTI 1.3 Advantage Assignment and Grade Services (AGS) Grade Passback Engine.
Posts student 5Q assessment results back into Moodle's academic gradebook.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx

logger = logging.getLogger("c2c_api.lti_ags")


def build_ags_score_payload(
    user_id: str,
    score: float,
    max_score: float = 100.0,
    comment: Optional[str] = None,
) -> Dict[str, Any]:
    """Formats score submission according to IMS Global LTI AGS 2.0 specification."""
    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "scoreGiven": float(round(score, 2)),
        "scoreMaximum": float(round(max_score, 2)),
        "comment": comment or "C2C 5Q Placement Assessment Completed",
        "activityProgress": "Completed",
        "gradingProgress": "FullyGraded",
        "userId": str(user_id),
    }


def send_lti_grade(
    lineitem_url: str,
    user_id: str,
    score: float,
    max_score: float = 100.0,
    comment: Optional[str] = None,
    access_token: Optional[str] = None,
    timeout: float = 8.0,
) -> Dict[str, Any]:
    """
    Publishes student assessment grade to Moodle / Canvas AGS lineitem endpoint.
    Handles network communication, gracefully logs errors without raising exceptions.
    """
    if not lineitem_url or not user_id:
        logger.warning("LTI AGS passback skipped: missing lineitem_url or user_id.")
        return {"success": False, "reason": "missing_parameters"}

    # Form scores endpoint: if lineitem_url doesn't end with /scores, append it
    endpoint = lineitem_url.rstrip("/")
    if not endpoint.endswith("/scores"):
        endpoint = f"{endpoint}/scores"

    payload = build_ags_score_payload(user_id, score, max_score, comment)

    headers = {
        "Content-Type": "application/vnd.ims.lis.v1.score+json",
        "Accept": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"

    logger.info(f"🚀 [LTI AGS] Posting grade {score}/{max_score} for user '{user_id}' to {endpoint}")

    try:
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(endpoint, json=payload, headers=headers)
            if resp.status_code in (200, 201, 204):
                logger.info(f"✅ [LTI AGS] Grade passback succeeded (HTTP {resp.status_code})")
                return {"success": True, "status_code": resp.status_code, "endpoint": endpoint}
            else:
                logger.warning(
                    f"⚠️ [LTI AGS] Grade passback returned HTTP {resp.status_code}: {resp.text}"
                )
                return {
                    "success": False,
                    "status_code": resp.status_code,
                    "response": resp.text,
                    "endpoint": endpoint,
                }
    except Exception as e:
        logger.error(f"❌ [LTI AGS] Failed to connect to LMS lineitem endpoint ({endpoint}): {e}")
        return {"success": False, "error": str(e), "endpoint": endpoint}
