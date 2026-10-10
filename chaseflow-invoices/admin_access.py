from __future__ import annotations
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/admin", tags=["admin"])
ADMIN_CODE = os.environ.get("ADMIN_CODE", "lab-owner-change-me")

class UnlockBody(BaseModel):
    code: str
    email: str | None = None

@router.post("/unlock")
def unlock(body: UnlockBody):
    if body.code != ADMIN_CODE:
        raise HTTPException(401, "invalid code")
    return {"ok": True, "role": "admin", "plan": "admin", "billing_bypass": True}
