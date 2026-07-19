from __future__ import annotations
import importlib
from scic import SCIC

def load_scic(specification: str) -> SCIC:
    if ":" not in specification:
        raise ValueError("Application specification must use module:attribute")
    module_name, attribute_name = specification.split(":", 1)
    value = getattr(importlib.import_module(module_name), attribute_name)
    value = value() if callable(value) and not isinstance(value, SCIC) else value
    if not isinstance(value, SCIC):
        raise TypeError(f"{specification!r} did not resolve to SCIC")
    return value
