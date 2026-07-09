from fastapi import APIRouter, Depends, HTTPException, Response
from typing import Dict, Any
import logging

from api.deps import get_supabase_client, require_role, get_current_user, require_admin_supabase
from api.pdf_generator import generate_student_pdf, generate_interview_guide_pdf

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

@router.get("/candidates")
def get_candidates(user = Depends(require_role(["tenant_admin", "sales_exec"])), supabase = Depends(require_admin_supabase)):
    """
    Returns all candidates for the CRM talent pool.
    """
    try:
        # Note: Depending on the tenant structure for B2C, we might just return all students 
        # or filter by a specific criteria if the CRM is isolated per agency.
        # Here we just fetch all students and their latest assessments.
        students_res = supabase.table("students").select("*").execute()
        if not students_res.data:
            return []
            
        student_ids = [s["id"] for s in students_res.data]
        assessments_res = supabase.table("assessments").select("*").in_("student_id", student_ids).order("created_at", desc=True).execute()
        
        # Map latest assessment to student
        latest_assessments = {}
        for a in (assessments_res.data or []):
            sid = a["student_id"]
            if sid not in latest_assessments:
                latest_assessments[sid] = a
                
        results = []
        for s in students_res.data:
            ass = latest_assessments.get(s["id"])
            if not ass:
                continue
                
            scores = ass.get("dimension_scores", {})
            results.append({
                "id": s["id"],
                "full_name": s["full_name"],
                "email": s["email"],
                "department": s["department"],
                "archetype": ass.get("primary_profile", "Unknown"),
                "scores": scores,
                "fit_scores": ass.get("founder_fit", {})
            })
            
        return results
    except Exception as e:
        logger.error(f"Error fetching CRM candidates: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching candidates")

@router.get("/candidates/{student_id}/pdf/profile")
def get_candidate_profile_pdf(student_id: str, user = Depends(require_role(["tenant_admin", "sales_exec"])), supabase = Depends(require_admin_supabase)):
    try:
        student_res = supabase.table("students").select("*").eq("id", student_id).single().execute()
        if not student_res.data:
            raise HTTPException(status_code=404, detail="Student not found")
            
        ass_res = supabase.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        ass_data = ass_res.data[0] if ass_res.data else {}
        
        pdf_bytes = generate_student_pdf(student_res.data, ass_data)
        
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=profile_{student_id}.pdf"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating profile PDF for {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating PDF")

@router.get("/candidates/{student_id}/pdf/interview-guide")
def get_candidate_interview_guide_pdf(student_id: str, user = Depends(require_role(["tenant_admin", "sales_exec"])), supabase = Depends(require_admin_supabase)):
    try:
        student_res = supabase.table("students").select("*").eq("id", student_id).single().execute()
        if not student_res.data:
            raise HTTPException(status_code=404, detail="Student not found")
            
        ass_res = supabase.table("assessments").select("*").eq("student_id", student_id).order("created_at", desc=True).limit(1).execute()
        ass_data = ass_res.data[0] if ass_res.data else {}
        
        pdf_bytes = generate_interview_guide_pdf(student_res.data, ass_data)
        
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=interview_guide_{student_id}.pdf"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating interview guide PDF for {student_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating PDF")
