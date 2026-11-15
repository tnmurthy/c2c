"""RSA signing-key helpers shared by LTI 1.3 and partner SSO."""
import base64
from typing import Any, Dict, Optional

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def int_to_base64url(val: int) -> str:
    """Encodes a positive integer into base64url string without padding."""
    val_bytes = val.to_bytes((val.bit_length() + 7) // 8, byteorder="big")
    return base64.urlsafe_b64encode(val_bytes).decode("utf-8").rstrip("=")


def load_pem_private_key(pem: str) -> rsa.RSAPrivateKey:
    """Parse a PEM private key. Accepts literal '\\n' escapes (Vercel env vars)."""
    pem = pem.strip().replace("\\n", "\n")
    key = serialization.load_pem_private_key(pem.encode("utf-8"), password=None)
    if not isinstance(key, rsa.RSAPrivateKey):
        raise ValueError("Signing key must be an RSA private key")
    if key.key_size < 2048:
        raise ValueError("Signing key must be at least 2048 bits")
    return key


def public_jwk(key: rsa.RSAPrivateKey, kid: str) -> Dict[str, Any]:
    pub = key.public_key().public_numbers()
    return {
        "kty": "RSA",
        "alg": "RS256",
        "use": "sig",
        "kid": kid,
        "n": int_to_base64url(pub.n),
        "e": int_to_base64url(pub.e),
    }


def generate_dev_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)
