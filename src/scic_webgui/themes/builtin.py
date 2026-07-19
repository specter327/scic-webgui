from .model import Theme, ThemePackage

_COMMON = {
    "font-family": "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    "font-mono": "JetBrains Mono, SFMono-Regular, Consolas, monospace",
    "radius-sm": "7px", "radius-md": "12px", "radius-lg": "18px",
    "shadow": "0 18px 55px rgba(0, 0, 0, .14)",
    "space": "1rem",
}

LIGHT = Theme(
    identifier="default-light", name="Default Light", variant="light",
    description="Clean neutral light interface",
    tokens={**_COMMON,
        "background": "#f5f7fb", "surface": "#ffffff", "surface-alt": "#eef2f8",
        "text": "#172033", "text-muted": "#667085", "border": "#dbe2ec",
        "primary": "#4f46e5", "primary-hover": "#4338ca", "primary-text": "#ffffff",
        "success": "#07884a", "danger": "#c93131", "warning": "#b06d00",
        "sidebar": "#111827", "sidebar-text": "#e5e7eb", "sidebar-muted": "#9ca3af",
    },
)
DARK = Theme(
    identifier="default-dark", name="Default Dark", variant="dark",
    description="Refined dark interface",
    tokens={**_COMMON,
        "background": "#0b0f17", "surface": "#121925", "surface-alt": "#182231",
        "text": "#e8edf5", "text-muted": "#9aa8bc", "border": "#273448",
        "primary": "#7c83ff", "primary-hover": "#969bff", "primary-text": "#090c13",
        "success": "#42cf83", "danger": "#ff6b6b", "warning": "#ffc857",
        "sidebar": "#080b11", "sidebar-text": "#e8edf5", "sidebar-muted": "#8492a6",
        "shadow": "0 20px 70px rgba(0, 0, 0, .38)",
    },
)

theme_package = ThemePackage(identifier="default", name="Default", themes=(LIGHT, DARK))
