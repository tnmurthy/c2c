import logging
from fastapi import APIRouter, Depends
from api.deps import get_supabase_client
from api.schemas.portfolio import PortfolioRequest

router = APIRouter(tags=["Portfolio"])
logger = logging.getLogger("c2c_api.portfolio")

@router.get("/portfolio/placeholder")
async def get_portfolio_placeholder():
    """Placeholder endpoint for portfolio routers."""
    return {"message": "Portfolio router placeholder"}
