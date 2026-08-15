## 2026-07-05T03:50:46Z
You are a worker agent assigned to finalize code layout compliance for the C2C Talent Platform Refactoring codebase in the workspace C:\tt-ai-stack\01_projects\makeover-talent-agency.

Your tasks:
1. Move the file `api/crm_router.py` to `api/routers/crm_router.py`.
2. Update `api/main.py` to change the import statement:
   - From: `from api.crm_router import router as crm_router`
   - To: `from api.routers.crm_router import router as crm_router`
3. Verify the FastAPI application loads successfully after the move:
   - Run: `python -c "import api.main; print('FastAPI loaded successfully after layout fix')"`
4. Verify layout compliance with PROJECT.md.
5. Write your handoff report to `.agents/worker_layout_fix/handoff.md` detailing the actions taken.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
