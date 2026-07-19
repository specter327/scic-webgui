from __future__ import annotations
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Mapping

@dataclass(frozen=True, slots=True)
class Theme:
    identifier: str
    name: str
    variant: str
    tokens: Mapping[str, str]
    description: str | None = None

    def __post_init__(self) -> None:
        if self.variant not in {"light", "dark"}:
            raise ValueError("Theme variant must be light or dark")
        object.__setattr__(self, "tokens", MappingProxyType(dict(self.tokens)))

    def to_dict(self) -> dict:
        return {
            "identifier": self.identifier,
            "name": self.name,
            "variant": self.variant,
            "description": self.description,
            "tokens": dict(self.tokens),
        }

@dataclass(frozen=True, slots=True)
class ThemePackage:
    identifier: str
    name: str
    themes: tuple[Theme, ...] = field(default_factory=tuple)
    version: str = "1.0.0"

    def __post_init__(self) -> None:
        if not self.themes:
            raise ValueError("ThemePackage requires at least one theme")

    def get(self, variant: str) -> Theme:
        for theme in self.themes:
            if theme.variant == variant:
                return theme
        raise KeyError(variant)

    def to_dict(self) -> dict:
        return {
            "identifier": self.identifier,
            "name": self.name,
            "version": self.version,
            "variants": [theme.to_dict() for theme in self.themes],
        }
