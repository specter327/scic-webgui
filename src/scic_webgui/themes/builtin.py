from .model import Theme, ThemePackage

_COMMON = {
    "font-family": "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    "font-mono": "JetBrains Mono, SFMono-Regular, Consolas, monospace",
    "radius-sm": "8px",
    "radius-md": "14px",
    "radius-lg": "20px",
    "shadow": "0 16px 48px rgba(20, 31, 56, .10)",
    "space": "1rem",
}

LIGHT = Theme(
    identifier="default-light",
    name="Dashboard Light",
    variant="light",
    description="Clean operational dashboard",
    tokens={
        **_COMMON,
        "background": "#f4f6fb",
        "surface": "#ffffff",
        "surface-alt": "#eef2f8",
        "surface-raised": "#ffffff",
        "text": "#172033",
        "text-muted": "#667085",
        "border": "#dbe2ec",
        "primary": "#5b5ce2",
        "primary-hover": "#4849c7",
        "primary-text": "#ffffff",
        "success": "#07884a",
        "danger": "#c93131",
        "warning": "#b06d00",
        "sidebar": "#101522",
        "sidebar-text": "#e9edf5",
        "sidebar-muted": "#929eb2",
    },
)

DARK = Theme(
    identifier="default-dark",
    name="Dashboard Dark",
    variant="dark",
    description="Operational command center",
    tokens={
        **_COMMON,
        "background": "#080d15",
        "surface": "#111925",
        "surface-alt": "#182331",
        "surface-raised": "#151f2d",
        "text": "#edf2f8",
        "text-muted": "#94a3b8",
        "border": "#273448",
        "primary": "#8188ff",
        "primary-hover": "#9ca1ff",
        "primary-text": "#080b11",
        "success": "#42cf83",
        "danger": "#ff7070",
        "warning": "#ffc857",
        "sidebar": "#060a11",
        "sidebar-text": "#edf2f8",
        "sidebar-muted": "#8492a6",
        "shadow": "0 22px 72px rgba(0, 0, 0, .38)",
    },
)

theme_package = ThemePackage(
    identifier="default",
    name="Dashboard",
    themes=(LIGHT, DARK),
)
