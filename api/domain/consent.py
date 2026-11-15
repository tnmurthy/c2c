"""Student consent for sharing data with partners (R5, ADR-004, DPDP Act 2023).

- Consent is specific (one partner), informed (a versioned notice listing exactly what is
  shared), freely given (refusing changes nothing in c2c) and withdrawable at any time.
- Only students who confirm they are 18 or older can consent online; under-18 needs a
  parent/guardian route (not built yet).
- Every decision is appended to consent_records; the latest one counts.
- has_consent() fails closed: any error means "no consent".
"""
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("c2c_api.consent")

NOTICES: Dict[str, Dict[str, Any]] = {
    "eklav": {
        "version": "2026-11-v1",
        # versions still valid; a materially changed notice drops older versions -> students re-consent
        "accepted_versions": ["2026-11-v1"],
        "partner_name": "eklav",
        "title": "Share my c2c profile with eklav",
        "purpose": ("eklav is a learning and skills platform your college uses alongside c2c. Sharing lets "
                    "eklav create your account, keep it in sync with your college and department, and "
                    "personalise your practice using your c2c assessment results."),
        "data_shared": [
            "Your name and college email address",
            "Your college, department, programme and graduation year",
            "Your c2c assessment results (5Q scores and profile)",
        ],
        "not_shared": ["Your phone number", "Your answers to individual assessment questions",
                       "Your applications to employers"],
        "retention": ("eklav keeps this data while sharing is on. If you turn sharing off, c2c stops "
                      "sending updates immediately and eklav must delete what it received."),
        "voluntary": ("This is optional. Turning it off does not affect your c2c account, assessments or "
                      "placement opportunities."),
        "age": "You must be 18 or older to turn this on yourself.",
    },
}


class ConsentError(ValueError):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def notice(partner_id: str) -> Optional[Dict[str, Any]]:
    n = NOTICES.get(partner_id)
    if not n:
        return None
    return {k: v for k, v in n.items() if k != "accepted_versions"}


def latest_decision(client, student_id, partner_id: str) -> Optional[Dict[str, Any]]:
    res = (client.table("consent_records").select("granted, notice_version, age_confirmed, created_at")
           .eq("student_id", str(student_id)).eq("partner_id", partner_id)
           .order("id", desc=True).limit(1).execute())
    return (res.data or [None])[0]


def decision_is_valid(decision: Optional[Dict[str, Any]], partner_id: str) -> bool:
    n = NOTICES.get(partner_id)
    return bool(n and decision and decision.get("granted") and decision.get("age_confirmed")
                and decision.get("notice_version") in n["accepted_versions"])


def has_consent(client, student_id, partner_id: str) -> bool:
    if not student_id:
        return False
    try:
        return decision_is_valid(latest_decision(client, student_id, partner_id), partner_id)
    except Exception as e:  # table missing, DB error: fail closed
        logger.warning("consent lookup failed for %s/%s: %s", student_id, partner_id, e)
        return False


def check_grant(partner_id: str, *, notice_version: Optional[str], age_confirmed: bool, partner_enabled: bool) -> None:
    n = NOTICES.get(partner_id)
    if not n:
        raise ConsentError("Unknown partner.", 404)
    if not partner_enabled:
        raise ConsentError(f"Your college has not turned on {n['partner_name']}.", 409)
    if notice_version != n["version"]:
        raise ConsentError("The information about data sharing has changed. Please read it again.", 409)
    if not age_confirmed:
        raise ConsentError("Please confirm you are 18 or older. If you are under 18, ask your TPO about "
                           "consent from a parent or guardian.", 400)
