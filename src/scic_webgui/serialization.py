from __future__ import annotations
import base64
from datetime import date, datetime
from enum import Enum
from pathlib import Path
from uuid import UUID

def json_safe(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, bytes):
        return {"$type": "bytes", "encoding": "base64", "value": base64.b64encode(value).decode()}
    if isinstance(value, bytearray):
        return json_safe(bytes(value))
    if isinstance(value, (datetime, date, UUID, Path, Enum)):
        return str(value.value if isinstance(value, Enum) else value)
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set, frozenset)):
        return [json_safe(item) for item in value]
    if hasattr(value, "to_dict"):
        return json_safe(value.to_dict())
    return repr(value)
