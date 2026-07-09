from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import logging

from api.deps import get_supabase_client, require_role, get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])
logger = logging.getLogger("c2c_api.analytics")

def get_tenant_id_from_user(user, supabase) -> str:
    """
    Extracts the tenant_id from the user metadata or database.
    """
    tenant_id = None
    if isinstance(user, dict):
        tenant_id = user.get("tenant_id")
        if not tenant_id:
            metadata = user.get("app_metadata", {}) or {}
            tenant_id = metadata.get("tenant_id")
    else:
        metadata = getattr(user, "app_metadata", {}) or {}
        tenant_id = metadata.get("tenant_id") or getattr(user, "tenant_id", None)
        
    if not tenant_id:
        user_id = getattr(user, "id", None) or (user.get("id") if isinstance(user, dict) else None) or (user.get("sub") if isinstance(user, dict) else None)
        if user_id:
            try:
                crm_user_res = supabase.table("crm_users").select("tenant_id").eq("user_id", user_id).execute()
                if crm_user_res.data:
                    tenant_id = crm_user_res.data[0].get("tenant_id")
            except Exception as e:
                logger.error(f"Failed to fetch user tenant from database: {e}")
                
    return tenant_id

@router.get("/funnel")
def get_funnel_metrics(
    user = Depends(require_role(["tenant_admin", "sales_exec"])),
    supabase = Depends(get_supabase_client)
):
    """
    For the authenticated tenant, query leads, contacts, and opportunities tables.
    Calculate funnel counts:
      - Lead (total count in leads)
      - Contact (total count in contacts)
      - Opportunity - Total (total count in opportunities)
      - Opportunity - Interview (count in opportunities where stage is Interview)
      - Opportunity - Closed Won (count in opportunities where stage is Closed Won / Offer Accepted)
    Compute stage-to-stage conversion rates and return a structured JSON response.
    """
    tenant_id = get_tenant_id_from_user(user, supabase)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tenant associated with your user account"
        )

    try:
        # 1. Leads Count
        leads_res = supabase.table("leads").select("lead_id", count="exact").eq("tenant_id", tenant_id).execute()
        leads_count = leads_res.count if leads_res.count is not None else len(leads_res.data or [])

        # 2. Contacts Count
        contacts_res = supabase.table("contacts").select("contact_id", count="exact").eq("tenant_id", tenant_id).execute()
        contacts_count = contacts_res.count if contacts_res.count is not None else len(contacts_res.data or [])

        # 3. Opportunities & Pipeline Stages Join
        opps_res = supabase.table("opportunities").select("opportunity_id, amount, status, stage_id, pipeline_stages(name)").eq("tenant_id", tenant_id).execute()
        opps = opps_res.data or []

        opps_total = len(opps)
        opps_interview = 0
        opps_closed_won = 0

        for opp in opps:
            stage = opp.get("pipeline_stages")
            stage_name = ""
            if isinstance(stage, dict):
                stage_name = stage.get("name") or ""
            elif isinstance(stage, list) and len(stage) > 0:
                stage_name = stage[0].get("name") or ""
                
            stage_name_lower = stage_name.lower()
            status_lower = (opp.get("status") or "").lower()
            
            # Check if stage name is Interview
            if "interview" in stage_name_lower:
                opps_interview += 1
                
            # Check if stage/status is Closed Won or Offer Accepted
            if status_lower == "closed won" or "closed won" in stage_name_lower or "offer accepted" in stage_name_lower:
                opps_closed_won += 1

        # Compute Conversion Rates
        lead_to_contact = (contacts_count / leads_count * 100) if leads_count > 0 else 0.0
        contact_to_opportunity = (opps_total / contacts_count * 100) if contacts_count > 0 else 0.0
        opportunity_to_interview = (opps_interview / opps_total * 100) if opps_total > 0 else 0.0
        interview_to_closed_won = (opps_closed_won / opps_interview * 100) if opps_interview > 0 else 0.0

        return {
            "leads": leads_count,
            "contacts": contacts_count,
            "opportunities_total": opps_total,
            "opportunities_interview": opps_interview,
            "opportunities_closed_won": opps_closed_won,
            "conversion_rates": {
                "lead_to_contact": round(lead_to_contact, 2),
                "contact_to_opportunity": round(contact_to_opportunity, 2),
                "opportunity_to_interview": round(opportunity_to_interview, 2),
                "interview_to_closed_won": round(interview_to_closed_won, 2)
            }
        }
    except Exception as e:
        logger.error(f"Error computing funnel metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error computing funnel metrics"
        )

@router.get("/summary")
def get_summary_metrics(
    user = Depends(require_role(["tenant_admin", "sales_exec"])),
    supabase = Depends(get_supabase_client)
):
    """
    Return total leads count, active opportunities value sum, win rate percentage, and average opportunity value.
    """
    tenant_id = get_tenant_id_from_user(user, supabase)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tenant associated with your user account"
        )

    try:
        # 1. Total Leads Count
        leads_res = supabase.table("leads").select("lead_id", count="exact").eq("tenant_id", tenant_id).execute()
        leads_count = leads_res.count if leads_res.count is not None else len(leads_res.data or [])

        # 2. Opportunities Value & Rates
        opps_res = supabase.table("opportunities").select("amount, status").eq("tenant_id", tenant_id).execute()
        opps = opps_res.data or []

        pipeline_value = 0.0
        closed_won_count = 0
        closed_lost_count = 0
        total_value = 0.0
        opps_count = len(opps)

        for opp in opps:
            amount = float(opp.get("amount") or 0)
            status_str = (opp.get("status") or "").lower()
            
            total_value += amount
            
            # Active opportunities are not Closed Won/Lost
            if status_str not in ["closed won", "closed lost"]:
                pipeline_value += amount
                
            if status_str == "closed won":
                closed_won_count += 1
            elif status_str == "closed lost":
                closed_lost_count += 1

        total_closed = closed_won_count + closed_lost_count
        win_rate = (closed_won_count / total_closed * 100) if total_closed > 0 else 0.0
        avg_opportunity_value = (total_value / opps_count) if opps_count > 0 else 0.0

        return {
            "total_leads": leads_count,
            "pipeline_value": round(pipeline_value, 2),
            "win_rate": round(win_rate, 2),
            "avg_opportunity_value": round(avg_opportunity_value, 2)
        }
    except Exception as e:
        logger.error(f"Error computing summary metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error computing summary metrics"
        )
