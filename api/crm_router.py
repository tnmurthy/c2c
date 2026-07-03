from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
import logging

from .deps import get_supabase_client, require_role, get_current_user

router = APIRouter(prefix="/crm", tags=["CRM"])
logger = logging.getLogger("c2c_api.crm")

@router.post("/leads/{lead_id}/convert")
def convert_lead(lead_id: str, payload: Dict[str, Any], user: dict = Depends(require_role(["tenant_admin", "sales_exec"])), supabase = Depends(get_supabase_client)):
    """
    Converts a Lead into an Account and Contact.
    Optionally creates an Opportunity if pipeline details are provided.
    """
    tenant_id = user.get("tenant_id")
    
    # 1. Fetch the lead
    lead_res = supabase.table("leads").select("*").eq("lead_id", lead_id).eq("tenant_id", tenant_id).single().execute()
    if not lead_res.data:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    lead = lead_res.data
    
    # Check if already converted
    if lead.get("status") == "converted":
        raise HTTPException(status_code=400, detail="Lead is already converted")
        
    try:
        # Create Account (if not linking to an existing one)
        account_name = payload.get("account_name") or lead.get("account_name") or f"{lead.get('first_name', '')} {lead.get('last_name', '')} Household"
        
        account_data = {
            "tenant_id": tenant_id,
            "name": account_name,
            "type": payload.get("account_type", "individual"),
            "owner_id": user["sub"]
        }
        
        acc_res = supabase.table("accounts").insert(account_data).execute()
        if not acc_res.data:
            raise Exception("Failed to create Account")
        account_id = acc_res.data[0]["account_id"]
        
        # Create Contact
        contact_data = {
            "tenant_id": tenant_id,
            "account_id": account_id,
            "first_name": lead.get("first_name"),
            "last_name": lead.get("last_name"),
            "email": lead.get("email"),
            "phone": lead.get("phone"),
            "owner_id": user["sub"]
        }
        
        contact_res = supabase.table("contacts").insert(contact_data).execute()
        if not contact_res.data:
            raise Exception("Failed to create Contact")
        contact_id = contact_res.data[0]["contact_id"]
        
        # Update Lead Status
        supabase.table("leads").update({"status": "converted"}).eq("lead_id", lead_id).execute()
        
        return {
            "message": "Lead successfully converted",
            "account_id": account_id,
            "contact_id": contact_id
        }
        
    except Exception as e:
        logger.error(f"Error converting lead {lead_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error converting lead")
