# scic-webgui

Generic, ready-to-use web application for [`scic-framework`](https://github.com/specter327/scic-framework).

`scic-webgui` discovers the SCIC tree, renders contexts and executables, generates parameter forms, executes functions and presents validated results. It ships as a Python package with a self-contained SPA: no Node.js build is required by applications consuming it.

## Features

- Generic navigation generated from `SCIC.export_tree()`.
- One independent `SCICSession` per browser session.
- Dynamic forms from `Executable.parameters` schemas.
- Structured execution through `/invoke` and textual execution through `/execute`.
- Built-in responsive light and dark themes.
- Theme packages discovered through Python entry points.
- JSON-safe result serialization.
- Embeddable FastAPI application.
- Generic command-line launcher.
- No frontend framework or npm dependency required at runtime.

## Install

```bash
pip install scic-webgui
```

## Basic use

```python
from scic_webgui import SCICWebGUI, WebGUIConfig

webgui = SCICWebGUI(
    scic,
    WebGUIConfig(
        application_name="OpenShell Manager",
        application_description="OSAM administrative interface",
        host="127.0.0.1",
        port=8080,
        default_variant="system",
        open_browser=True,
    ),
)
webgui.run()
```

The FastAPI application can also be mounted or served by an existing process:

```python
webgui = SCICWebGUI(scic)
app = webgui.app
```

## Generic launcher

Expose a SCIC instance or a zero-argument factory:

```python
# application.py
application = build_scic()
```

Run:

```bash
scic-webgui application:application --name "My application" --port 8080 --open-browser
```

Equivalent:

```bash
python -m scic_webgui application:application
```

## HTTP API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/scic/v1/tree` | Export complete SCIC tree |
| GET | `/api/scic/v1/context` | Current browser session context |
| GET | `/api/scic/v1/describe?path=...` | Describe a resource |
| POST | `/api/scic/v1/invoke` | Invoke an executable with textual arguments |
| POST | `/api/scic/v1/execute` | Execute a complete textual instruction |
| POST | `/api/scic/v1/navigate` | Navigate to a context |
| POST | `/api/scic/v1/back` | Move to the parent context |
| POST | `/api/scic/v1/reset` | Return to root |
| GET | `/api/scic/v1/themes` | Discover theme packages |

The browser stores the `X-SCIC-Session` identifier returned by the server. The registry remains shared while navigation state stays isolated.

## Theme packages

A theme package is installed like any other Python dependency and exports a `ThemePackage` through an entry point:

```toml
[project.entry-points."scic_webgui.themes"]
openshell = "scic_webgui_theme_openshell:theme_package"
```

```python
from scic_webgui import Theme, ThemePackage

light = Theme(
    identifier="openshell-light",
    name="OpenShell Light",
    variant="light",
    tokens={
        "background": "#f4f6f9",
        "surface": "#ffffff",
        "text": "#152033",
        "primary": "#3f51e8",
        # Include the complete token set for best results.
    },
)

theme_package = ThemePackage(
    identifier="openshell",
    name="OpenShell",
    themes=(light, dark),
)
```

A package can provide `light`, `dark`, or both variants. Themes only define visual tokens; they do not alter application logic.

## Development

```bash
chmod +x check.sh publish.sh
./check.sh
```

Publish to TestPyPI:

```bash
./publish.sh --test
```

Publish to PyPI:

```bash
./publish.sh
```

## Current scope

Version 0.1.0 is intentionally focused on the generic application shell. Authentication, authorization, remote SCIC clients, streaming progress, specialized views and custom widget entry points are extension points for later versions.
