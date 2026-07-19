# scic-webgui

Adaptive, ready-to-use web application for [`scic-framework`](https://github.com/specter327/scic-framework).

`scic-webgui` discovers the SCIC tree and provides a complete administrative interface without requiring Node.js. Version 0.2 introduces a hybrid rendering model: every command still has a generic fallback, but inputs, results and complete resource views can be specialized without changing the SCIC application.

## Design model

```text
SCIC registry
    │
    ▼
Generic application shell
    ├── automatic navigation
    ├── adaptive input renderers
    ├── adaptive result renderers
    └── fallback JSON renderer
              │
              ▼
Optional application extensions
    ├── custom input widgets
    ├── custom result views
    └── complete path-specific views
```

The generic layer is a safety net, not a visual restriction.

## Features

- Navigation generated from `SCIC.export_tree()`.
- Independent `SCICSession` per browser session.
- Responsive desktop and mobile application shell.
- Forms generated from parameter schemas and metadata.
- Native widgets for booleans, numbers, passwords, selections, multiline text and JSON files.
- Drag-and-drop file fields.
- Automatic tables for arrays of objects.
- Property grids for object results.
- Structured lists, badges and nested detail views.
- Raw JSON available as an optional secondary view.
- Extension API for custom inputs, custom results and complete views.
- Extension scripts loaded by configuration.
- Light and dark theme packages.
- Embeddable FastAPI application.
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

The FastAPI application can also be mounted:

```python
webgui = SCICWebGUI(scic)
app.mount("/admin", webgui.app)
```

## Semantic metadata

Applications can improve the automatic interface through neutral SCIC metadata.

```python
metadata={
    "title": "Import Root Authority",
    "icon": "shield-plus",
    "category": "Trust",
    "submit_label": "Import authority",
}
```

Parameter metadata:

```python
metadata={
    "title": "Public profile",
    "description": "Select the exported public identity profile.",
    "input_kind": "json-file",
    "accepted_extensions": [".json"],
}
```

Destructive operations:

```python
metadata={
    "danger": "destructive",
    "confirmation_required": True,
    "confirmation_message": "Remove this authority?",
}
```

These values describe intent. They do not couple SCIC to HTML components.

## Specialized browser extensions

Provide one or more ES modules:

```python
WebGUIConfig(
    extension_scripts=(
        "/static/osam-webgui.js",
    ),
)
```

Each module can use the global extension API.

### Custom result renderer

```javascript
SCICWebGUI.registerResultRenderer(
  ({ resource, value }) =>
    resource.path.endsWith("/services/list") && Array.isArray(value),
  ({ value }) => `
    <div class="service-grid">
      ${value.map(service => `
        <article>
          <strong>${service.name}</strong>
          <span>${service.active ? "Running" : "Stopped"}</span>
        </article>
      `).join("")}
    </div>
  `,
  100
);
```

### Custom input renderer

```javascript
SCICWebGUI.registerInputRenderer(
  ({ metadata }) => metadata.input_kind === "entity-uid",
  ({ index, schema }) => `
    <input
      class="input entity-selector"
      name="arg-${index}"
      placeholder="${schema.name}"
    >
  `,
  100
);
```

### Complete specialized view

```javascript
SCICWebGUI.registerView(
  "/osam/root-authority/list",
  async ({ resource, api, mount, helpers }) => {
    const response = await api("/invoke", {
      method: "POST",
      body: JSON.stringify({ path: resource.path, arguments: [] })
    });

    mount.innerHTML = `
      <section class="authority-view">
        <h2>Trusted authorities</h2>
        ${helpers.renderValue(response.results, resource)}
      </section>
    `;
  }
);
```

The specialized view belongs to the application extension package. OSAM business logic and the SCIC registry remain unchanged.

## Result selection order

1. Complete path-specific view.
2. Registered specialized result renderer.
3. Built-in table, property, list or primitive renderer.
4. Optional raw JSON representation.

This guarantees that every SCIC command remains usable even without a specialized implementation.

## HTTP API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/scic/v1/tree` | Export complete SCIC tree |
| GET | `/api/scic/v1/context` | Current browser session context |
| GET | `/api/scic/v1/describe?path=...` | Describe a resource |
| POST | `/api/scic/v1/invoke` | Invoke an executable |
| POST | `/api/scic/v1/execute` | Execute textual instruction |
| POST | `/api/scic/v1/navigate` | Navigate to a context |
| POST | `/api/scic/v1/back` | Move to parent context |
| POST | `/api/scic/v1/reset` | Return to root |
| GET | `/api/scic/v1/themes` | Discover theme packages |

## Theme packages

```toml
[project.entry-points."scic_webgui.themes"]
openshell = "scic_webgui_theme_openshell:theme_package"
```

Themes define visual tokens. Extensions define specialized interaction and presentation.

## Development

```bash
chmod +x check.sh publish.sh
./check.sh
```

## Current scope

Version 0.2 is an extensible application-shell prototype. Authentication, authorization, remote SCIC clients and streaming progress remain future layers.
