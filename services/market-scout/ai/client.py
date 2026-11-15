import os
import json
import time
import requests

try:  # imported as the scout's `ai` package, or loaded by file path from the c2c API
    from ai import budget
except ImportError:  # pragma: no cover - exercised when loaded by path
    import importlib.util as _ilu
    _spec = _ilu.spec_from_file_location("c2c_gemini_budget", os.path.join(os.path.dirname(__file__), "budget.py"))
    budget = _ilu.module_from_spec(_spec)
    _spec.loader.exec_module(budget)

_last_call = 0.0

# Gemini 2.0 / 1.5 models were shut down on 2026-06-01 (Gemini API deprecations page);
# every call to them failed. Keep this list to current models only.
# Override with GEMINI_MODEL without a code change.
DEFAULT_MODEL = (os.environ.get("GEMINI_MODEL") or "gemini-3.5-flash-lite").strip()
MODEL_FALLBACK = [DEFAULT_MODEL] + [m for m in ("gemini-3.5-flash-lite", "gemini-3.5-flash") if m != DEFAULT_MODEL]

# Models that returned 404 in this process (retired / unknown): never retried, so a
# dead model cannot burn the daily call cap on every batch.
_dead_models = set()

def generate(prompt: str, model: str = "", rate_limit: float = 7.0, source: str = "gemini_scout") -> dict:
    """
    Call Gemini with auto-fallback on 429. Returns parsed JSON or {}.
    Every HTTP attempt (including fallback models) is billable, so each one is
    claimed against the daily cap for `source` first; a refusal returns {}.
    """
    global _last_call

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("[AI] GEMINI_API_KEY not set.")
        return {}

    elapsed = time.time() - _last_call
    if elapsed < rate_limit:
        time.sleep(rate_limit - elapsed)

    models = [model] + [m for m in MODEL_FALLBACK if m != model] if model else list(MODEL_FALLBACK)
    models = [m for m in models if m not in _dead_models]
    if not models:
        print("[AI] No usable Gemini model (all returned 404). Set GEMINI_MODEL to a current model.")
        return {}
    _last_call = time.time()

    for m in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
                "maxOutputTokens": 2048,
            },
        }
        try:
            ledger_id = budget.claim(source)
        except budget.BudgetRefused as e:
            print(f"[AI] Gemini call not made ({source}): {e.reason}")
            return {}
        try:
            resp = requests.post(url, json=payload, timeout=30)
            budget.finish(ledger_id, ok=resp.status_code == 200)
            if resp.status_code == 200:
                return _parse(resp)
            if resp.status_code == 404:
                _dead_models.add(m)
                print(f"[AI] Model {m} not found (retired or unknown) - skipping it for this run.")
                continue
            if resp.status_code == 429:
                print(f"[AI] Model {m} throttled, falling back...")
                time.sleep(1)
                continue
            print(f"[AI] Error {resp.status_code}: {resp.text[:300]}")
            return {}
        except requests.RequestException as e:
            budget.finish(ledger_id, ok=False)
            print(f"[AI] Request failed: {e}")
            continue

    return {}

def _parse(resp) -> dict:
    try:
        text = (
            resp.json()
            .get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
            .strip()
        )
        if text.startswith("```"):
            text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
        return json.loads(text)
    except (json.JSONDecodeError, KeyError) as e:
        print(f"[AI] Parse error: {e}")
        return {}
