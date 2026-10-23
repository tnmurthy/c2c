"""Demo/dev identities must be refused unless ALLOW_DEMO_AUTH=true."""
import asyncio

import pytest
from fastapi import HTTPException

from api.deps import demo_auth_allowed, get_current_user


def _call(token, client=object()):
    return asyncio.run(get_current_user(authorization=f"Bearer {token}", client=client))


@pytest.mark.parametrize("token", ["demo-access-token", "mock-access-token", "demo-anything"])
def test_demo_tokens_refused_by_default(monkeypatch, token):
    monkeypatch.delenv("ALLOW_DEMO_AUTH", raising=False)

    with pytest.raises(HTTPException) as exc:
        _call(token)
    assert exc.value.status_code == 401


def test_missing_auth_client_does_not_grant_admin(monkeypatch):
    monkeypatch.delenv("ALLOW_DEMO_AUTH", raising=False)

    with pytest.raises(HTTPException) as exc:
        _call("some-real-looking-token", client=None)
    assert exc.value.status_code == 503


def test_demo_tokens_accepted_when_enabled(monkeypatch):
    monkeypatch.setenv("ALLOW_DEMO_AUTH", "true")

    user = _call("demo-access-token")
    assert user.app_metadata["role"] == "admin"


@pytest.mark.parametrize("value, allowed", [("true", True), ("TRUE", True), ("1", False), ("", False), ("false", False)])
def test_flag_parsing(monkeypatch, value, allowed):
    monkeypatch.setenv("ALLOW_DEMO_AUTH", value)
    assert demo_auth_allowed() is allowed
