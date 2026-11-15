"""Append-only audit trail for tenancy actions (activation, invites, verification).

audit_logs.user_id references CRM users, so the acting login (auth user id) is
recorded inside `changes.actor`. Writing the audit row never breaks the action.
"""
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("c2c_api.audit")


def record(client, action: str, *, actor_id, entity_type: str, entity_id: Optional[str] = None,
           tenant_id: Optional[str] = None, details: Optional[Dict[str, Any]] = None) -> None:
    changes = {"actor": str(actor_id) if actor_id else None, **(details or {})}
    row = {"action": action, "entity_type": entity_type, "changes": changes,
           "tenant_id": str(tenant_id) if tenant_id else None}
    if entity_id:
        row["entity_id"] = str(entity_id)
    try:
        client.table("audit_logs").insert(row).execute()
    except Exception as e:
        logger.error("audit write failed action=%s entity=%s: %s", action, entity_type, e)
