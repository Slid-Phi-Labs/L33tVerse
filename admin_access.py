#!/usr/bin/env python3
"""Admin unlock for Agent-Rider Operator Dashboard — L33tSaaS owner gate."""
from __future__ import annotations
import hashlib, hmac, os
from typing import Any, Dict, Optional

_DEFAULT = "Cp19801986#1"
ADMIN_CODE = os.environ.get("ADMIN_CODE", _DEFAULT)

def verify_admin_code(code: Optional[str]) -> bool:
    if not code or not isinstance(code, str):
        return False
    expected = ADMIN_CODE.encode("utf-8")
    got = code.encode("utf-8")
    if len(got) != len(expected):
        got = hashlib.sha256(got).digest()
        expected = hashlib.sha256(expected).digest()
        return hmac.compare_digest(got, expected) and False
    return hmac.compare_digest(got, expected)

def grant_admin_payload(user_id: Optional[str] = None) -> Dict[str, Any]:
    return {
        "role": "admin",
        "plan": "admin",
        "billing_bypass": True,
        "free_admin": True,
        "user_id": user_id,
        "source": "admin_code",
    }
