import os
import base64
import logging
import secrets
from typing import Dict, Any, Optional
from urllib.parse import urlencode, quote_plus
from fastapi import APIRouter, Request, Response, Form, HTTPException, status
from fastapi.responses import JSONResponse, RedirectResponse
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
import jwt

router = APIRouter(prefix="/lti", tags=["LTI 1.3"])
logger = logging.getLogger("c2c_api.lti")

# Key ID and singleton cache for RSA keypair
KID = "c2c-lti-v1"
_RSA_KEY: Optional[rsa.RSAPrivateKey] = None


def _int_to_base64url(val: int) -> str:
    """Encodes a positive integer into base64url string without padding."""
    val_bytes = val.to_bytes((val.bit_length() + 7) // 8, byteorder="big")
    return base64.urlsafe_b64encode(val_bytes).decode("utf-8").rstrip("=")


def get_or_generate_key() -> rsa.RSAPrivateKey:
    """Retrieves configured LTI_PRIVATE_KEY or generates a 2048-bit RSA key."""
    global _RSA_KEY
    if _RSA_KEY is not None:
        return _RSA_KEY

    pem_env = os.environ.get("LTI_PRIVATE_KEY")
    if pem_env:
        try:
            _RSA_KEY = serialization.load_pem_private_key(pem_env.encode("utf-8"), password=None)
            logger.info("Loaded LTI private key from LTI_PRIVATE_KEY env var.")
            return _RSA_KEY
        except Exception as e:
            logger.warning(f"Could not parse LTI_PRIVATE_KEY: {e}. Generating fallback key.")

    _RSA_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    logger.info("Generated in-memory RSA keypair for LTI 1.3.")
    return _RSA_KEY


def get_base_url(request: Request) -> str:
    """Determines canonical C2C base URL."""
    env_url = os.environ.get("NEXT_PUBLIC_APP_URL") or os.environ.get("APP_URL")
    if env_url:
        return env_url.rstrip("/")
    # Infer from request headers if Behind reverse proxy
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", "c2c.mytestbed.tech"))
    return f"{proto}://{host}".rstrip("/")


@router.get("/jwks")
def get_jwks():
    """
    Public JWKS endpoint for LTI 1.3 Platforms (Moodle/Canvas).
    Used to verify messages signed by C2C.
    """
    key = get_or_generate_key()
    pub = key.public_key().public_numbers()
    return {
        "keys": [
            {
                "kty": "RSA",
                "alg": "RS256",
                "use": "sig",
                "kid": KID,
                "n": _int_to_base64url(pub.n),
                "e": _int_to_base64url(pub.e),
            }
        ]
    }


@router.get("/config")
def get_tool_config(request: Request):
    """
    Auto-discovery metadata endpoint for registering C2C in Moodle External Tool settings.
    """
    base_url = get_base_url(request)
    return {
        "title": "Campus-to-Corporate (C2C) Assessment",
        "description": "5Q Psychometric Benchmark & Employability Assessment",
        "oidc_initiation_url": f"{base_url}/api/lti/login",
        "target_link_uri": f"{base_url}/api/lti/launch",
        "public_jwk_url": f"{base_url}/api/lti/jwks",
        "extensions": [
            {
                "platform": "moodle",
                "privacy_level": "public",
                "messages": [
                    {
                        "type": "LtiResourceLinkRequest",
                        "target_link_uri": f"{base_url}/api/lti/launch",
                        "label": "5Q Placement Readiness Assessment",
                    }
                ],
            }
        ],
    }


@router.api_route("/login", methods=["GET", "POST"])
async def lti_login_initiation(request: Request):
    """
    LTI 1.3 Third-Party Initiated Login (OIDC step 1).
    Moodle calls this to start the login flow, passing iss, login_hint, client_id, etc.
    C2C redirects the browser back to Moodle's auth.php endpoint.
    """
    if request.method == "POST":
        form_data = await request.form()
        params = dict(form_data)
    else:
        params = dict(request.query_params)

    iss = params.get("iss")
    login_hint = params.get("login_hint")
    client_id = params.get("client_id")
    target_link_uri = params.get("target_link_uri")
    lti_message_hint = params.get("lti_message_hint")

    if not iss or not login_hint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required parameters 'iss' and 'login_hint' for LTI login.",
        )

    base_url = get_base_url(request)
    redirect_uri = f"{base_url}/api/lti/launch"

    state = secrets.token_urlsafe(24)
    nonce = secrets.token_urlsafe(24)

    # Standard Moodle LTI OIDC authorization endpoint
    auth_endpoint = f"{iss.rstrip('/')}/mod/lti/auth.php"

    auth_params = {
        "response_type": "id_token",
        "scope": "openid",
        "response_mode": "form_post",
        "prompt": "none",
        "client_id": client_id or "",
        "redirect_uri": redirect_uri,
        "login_hint": login_hint,
        "state": state,
        "nonce": nonce,
    }
    if lti_message_hint:
        auth_params["lti_message_hint"] = lti_message_hint

    redirect_url = f"{auth_endpoint}?{urlencode(auth_params)}"
    logger.info(f"LTI OIDC Login initiation: redirecting to {auth_endpoint} for iss={iss}")
    return RedirectResponse(url=redirect_url, status_code=status.HTTP_302_FOUND)


@router.post("/launch")
async def lti_launch(
    request: Request,
    id_token: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
):
    """
    LTI 1.3 Resource Link Launch (OIDC step 2).
    Moodle form-posts the signed id_token containing candidate claims and target link.
    """
    if not id_token:
        # Check if posted as JSON
        try:
            body = await request.json()
            id_token = body.get("id_token")
            state = body.get("state")
        except Exception:
            pass

    if not id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing 'id_token' in LTI launch request.",
        )

    # Decode claims from JWT
    try:
        # In LTI 1.3, id_token header contains kid, and claims specify user details
        unverified_claims = jwt.decode(
            id_token,
            options={"verify_signature": False, "verify_aud": False, "verify_exp": False},
        )
    except Exception as e:
        logger.error(f"Failed to decode LTI id_token: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid id_token: {e}")

    # Extract user identity and contextual claims
    user_id = unverified_claims.get("sub", "")
    email = unverified_claims.get("email") or f"moodle_{user_id}@c2c.local"
    name = unverified_claims.get("name") or unverified_claims.get("given_name") or "LMS Candidate"
    roles = unverified_claims.get("https://purl.imsglobal.org/spec/lti/claim/roles", [])
    target = unverified_claims.get("https://purl.imsglobal.org/spec/lti/claim/target_link_uri") or "/assessment"
    deployment_id = unverified_claims.get("https://purl.imsglobal.org/spec/lti/claim/deployment_id")
    ags_endpoint = unverified_claims.get("https://purl.imsglobal.org/spec/lti-ags/claim/endpoint", {})

    logger.info(
        f"LTI Launch received: user={user_id} ({email}), name={name}, roles={roles}, target={target}"
    )

    base_url = get_base_url(request)
    dest_path = "/assessment" if "/assessment" in target else target

    # Form destination redirect with launch query parameters for Next.js
    query_args = {
        "lti": "1",
        "email": email,
        "name": name,
        "uid": user_id,
    }
    if deployment_id:
        query_args["deployment_id"] = str(deployment_id)
    lineitem = ags_endpoint.get("lineitem")
    if lineitem:
        query_args["lineitem"] = str(lineitem)

    destination_url = f"{base_url}{dest_path}?{urlencode(query_args)}"

    # Return 303 See Other redirect so browser issues a GET to destination_url
    return RedirectResponse(url=destination_url, status_code=status.HTTP_303_SEE_OTHER)


from pydantic import BaseModel
from api.services.lti_ags import send_lti_grade


class LTIGradePassbackRequest(BaseModel):
    lineitem_url: str
    user_id: str
    score: float
    max_score: float = 100.0
    comment: Optional[str] = None
    access_token: Optional[str] = None


@router.post("/grade-passback")
def trigger_grade_passback(req: LTIGradePassbackRequest):
    """Direct or automated trigger for LTI 1.3 AGS Grade Passback."""
    result = send_lti_grade(
        lineitem_url=req.lineitem_url,
        user_id=req.user_id,
        score=req.score,
        max_score=req.max_score,
        comment=req.comment,
        access_token=req.access_token,
    )
    return result


from api.services.moodle_client import moodle_client


class AutoEnrolRequest(BaseModel):
    student_id: str
    student_email: str
    audit_gaps: list[str]


@router.post("/auto-enrol")
def auto_enrol_remediation(req: AutoEnrolRequest):
    """Auto-enrols student into Moodle remediation courses based on assessment gaps."""
    res = moodle_client.auto_remediate_gaps(
        student_id=req.student_id,
        student_email=req.student_email,
        audit_gaps=req.audit_gaps,
    )
    return res
