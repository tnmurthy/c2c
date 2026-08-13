"""
Assessment item bank endpoints: browsing the psychometric item bank and
generating a randomized assessment from it.
"""
import json
import random
from typing import Optional
from fastapi import APIRouter, Depends

from api.deps import require_admin_supabase, get_current_user
from api.exceptions import APIException, NotFoundError, DatabaseConnectionError
from api.routers.assessment.common import (
    logger,
    normalize_bank_item,
    get_fallback_bank_path,
)

router = APIRouter(tags=["Assessment"])


@router.get("/assessment/bank")
async def get_assessment_bank(
    page: int = 1,
    limit: int = 10,
    dimension: Optional[str] = None,
    client = Depends(require_admin_supabase),
    current_user = Depends(get_current_user)
):
    try:
        items = []
        try:
            query = client.table("psychometric_items").select("*")
            if dimension:
                query = query.eq("primary_dimension", dimension)
            res = query.execute()
            items = res.data or []
        except Exception as e:
            logger.warning(f"Failed to query psychometric_items: {e}")

        if not items:
            try:
                fallback_path = get_fallback_bank_path()
                with open(fallback_path, "r", encoding="utf-8") as f:
                    raw_bank = json.load(f)
                    items = [normalize_bank_item(item) for item in raw_bank]
                if dimension:
                    items = [item for item in items if item.get("primary_dimension") == dimension]
            except Exception as e:
                logger.error(f"Failed to load fallback bank: {e}")

        total = len(items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = items[start_idx:end_idx]

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "items": paginated_items
        }
    except Exception as e:
        logger.error(f"ERROR get_assessment_bank: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))

@router.get("/assessment/generate")
async def generate_assessment(num_per_section: int = 25, client = Depends(require_admin_supabase), current_user = Depends(get_current_user)):
    dimensions = ["IQ", "EQ", "SQ", "AQ", "SpQ"]
    final_items = []
    try:
        bank_data = []
        try:
            fallback_path = get_fallback_bank_path()
            with open(fallback_path, "r", encoding="utf-8") as f:
                raw_bank = json.load(f)
                bank_data = [normalize_bank_item(item) for item in raw_bank]
        except Exception as e:
            logger.warning(f"Failed to load fallback bank: {e}")

        for dim in dimensions:
            items = []
            try:
                res = client.table("psychometric_items").select("*").eq("primary_dimension", dim).execute()
                items = res.data
            except Exception as e:
                logger.warning(f"Failed to fetch psychometric_items for {dim}: {e}")

            if not items and bank_data:
                items = [item for item in bank_data if item.get("primary_dimension") == dim]

            if items:
                count = min(len(items), random.randint(25, 30) if num_per_section == 25 else num_per_section)
                final_items.extend(random.sample(items, count))

        if not final_items:
            raise NotFoundError("Database empty and fallback JSON missing")

        return final_items
    except APIException:
        raise
    except Exception as e:
        logger.error(f"ERROR generate_assessment: {e}", exc_info=True)
        raise DatabaseConnectionError(str(e))
