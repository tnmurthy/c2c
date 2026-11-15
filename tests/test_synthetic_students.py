"""ADR-002 T1: seeded students (is_synthetic) never reach employer/CRM/matching views."""
from types import SimpleNamespace

from api.synthetic import include_synthetic, real_students_only


class Q:
    def __init__(self): self.filters = []
    def eq(self, col, val): self.filters.append((col, val)); return self
    def filter(self, col, op, val): self.filters.append((col, op, val)); return self


def test_excluded_by_default(monkeypatch):
    monkeypatch.delenv("SHOW_SYNTHETIC_STUDENTS", raising=False)
    assert not include_synthetic()
    assert real_students_only(Q()).filters == [("is_synthetic", False), ("auth_id", "not.is", "null")]


def test_demo_environment_can_opt_in(monkeypatch):
    monkeypatch.setenv("SHOW_SYNTHETIC_STUDENTS", "true")
    assert real_students_only(Q()).filters == []


def test_employer_candidates_filters_synthetic(monkeypatch):
    monkeypatch.delenv("SHOW_SYNTHETIC_STUDENTS", raising=False)
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    import api.routers.employer_router as er
    from api.deps import get_current_user, require_admin_supabase

    rows = [{"id": "real", "is_synthetic": False}, {"id": "fake", "is_synthetic": True}]
    seen = {}

    class T:
        def __init__(self, name): self.name, self.f = name, {}
        def select(self, *a, **k): return self
        def eq(self, c, v): self.f[c] = v; return self
        def in_(self, c, v): self.f[c] = v; return self
        def filter(self, c, op, v): seen.setdefault('not_null', []).append(c); return self
        def order(self, *a, **k): return self
        def execute(self):
            if self.name == "students":
                seen["filters"] = dict(self.f)
                return SimpleNamespace(data=[r for r in rows if all(r.get(c) == v for c, v in self.f.items())])
            return SimpleNamespace(data=[])

    db = SimpleNamespace(table=lambda n: T(n))
    app = FastAPI()
    app.include_router(er.router, prefix="/api")
    app.dependency_overrides[require_admin_supabase] = lambda: db
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id="e", email="hr@x.com", app_metadata={"role": "employer"})
    TestClient(app).get("/api/employer/candidates")
    assert seen["filters"].get("is_synthetic") is False
    assert seen.get("not_null") == ["auth_id"]  # M4-3: imported, not-signed-up students hidden
