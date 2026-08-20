from pydantic import BaseModel
from typing import Optional

class LeadConvertRequest(BaseModel):
    account_name: Optional[str] = None
    account_type: Optional[str] = "individual"
