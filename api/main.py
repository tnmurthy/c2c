import os
import sys
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from dotenv import load_dotenv

# Add service directories to sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)
sys.path.append(os.path.join(BASE_DIR, "services", "job-intel-desk", "backend"))
sys.path.append(os.path.join(BASE_DIR, "services", "market-scout"))

load_dotenv(os.path.join(BASE_DIR, ".env.local"))
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Setup logger
logger = logging.getLogger("c2c_api")
logger.setLevel(logging.INFO)

# Create a file handler
fh = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter('%(asctime)s [%(name)s] %(levelname)s: %(message)s')
fh.setFormatter(formatter)
logger.addHandler(fh)

# Also keep console output
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)
ch.setFormatter(formatter)
logger.addHandler(ch)

# Imports from exceptions
from api.exceptions import APIException, DatabaseConnectionError, NotFoundError, PermissionDeniedError

app = FastAPI()

# --- EXCEPTION HANDLERS ---

@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "code": exc.code,
            "message": exc.message
        }
    )

@app.exception_handler(DatabaseConnectionError)
async def db_connection_error_handler(request: Request, exc: DatabaseConnectionError):
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "code": "500",
            "message": exc.message
        }
    )

@app.exception_handler(NotFoundError)
async def not_found_error_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "error": True,
            "code": "404",
            "message": exc.message
        }
    )

@app.exception_handler(PermissionDeniedError)
async def permission_denied_error_handler(request: Request, exc: PermissionDeniedError):
    return JSONResponse(
        status_code=403,
        content={
            "error": True,
            "code": "403",
            "message": exc.message
        }
    )

# --- ROUTERS ---

from api.routers.student_router import router as student_router
from api.routers.employer_router import router as employer_router
from api.routers.assessment_router import router as assessment_router
from api.routers.portfolio_router import router as portfolio_router
from api.routers.crm_router import router as crm_router

app.include_router(student_router, prefix="/api")
app.include_router(employer_router, prefix="/api")
app.include_router(assessment_router, prefix="/api")
app.include_router(portfolio_router, prefix="/api")
app.include_router(crm_router, prefix="/api")

# --- ROOT & HEALTH ENDPOINTS ---

@app.get("/")
def root():
    return {"status": "c2c api root online"}

@app.get("/api")
def api_root():
    return {"status": "c2c api online"}

@app.get("/health")
@app.get("/api/health")
def health():
    try:
        from api.deps import get_supabase_client
        client = get_supabase_client()
        if not client:
            return JSONResponse(
                status_code=500,
                content={"status": "error", "db": "disconnected"}
            )
        # Attempt a fast query
        client.table("institutions").select("id").limit(1).execute()
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        logger.error(f"Health check database query failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "db": "disconnected"}
        )
