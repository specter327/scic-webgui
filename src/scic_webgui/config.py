from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class WebGUIConfig:
    application_name: str = "SCIC"
    application_description: str = "Interactive SCIC application dashboard"
    host: str = "127.0.0.1"
    port: int = 8080
    api_prefix: str = "/api/scic/v1"
    default_theme: str = "default"
    default_variant: str = "system"
    allow_theme_selection: bool = True
    show_metadata: bool = False
    show_raw_results: bool = True
    open_browser: bool = False
    cors_origins: tuple[str, ...] = field(default_factory=tuple)
    extension_scripts: tuple[str, ...] = field(default_factory=tuple)
    application_class: str = ""
    home_title: str | None = None
    home_description: str | None = None
    dashboard_title: str | None = None
    dashboard_description: str | None = None
    brand_mark: str = "S"
    search_enabled: bool = True
    activity_enabled: bool = True
    favorites_enabled: bool = True
    dashboard_auto_probe: bool = False
    max_activity_entries: int = 50

    def __post_init__(self) -> None:
        self.application_name = self.application_name.strip() or "SCIC"
        self.application_description = self.application_description.strip()
        self.api_prefix = "/" + self.api_prefix.strip("/")
        self.application_class = self.application_class.strip()
        self.brand_mark = self.brand_mark.strip()[:3] or "S"
        self.extension_scripts = tuple(
            script.strip() for script in self.extension_scripts if script.strip()
        )
        if not 1 <= self.port <= 65535:
            raise ValueError("port must be between 1 and 65535")
        if self.default_variant not in {"light", "dark", "system"}:
            raise ValueError("default_variant must be light, dark or system")
        if self.max_activity_entries < 1:
            raise ValueError("max_activity_entries must be greater than zero")
