# scic-webgui 0.2.0

Adaptive and extensible WebGUI for `scic-framework`.

The library provides a complete application shell automatically, while allowing applications to replace individual input controls, result renderers, or complete resource views without changing SCIC or business services.

## Capabilities

- Responsive desktop/mobile application shell.
- Navigation generated from the SCIC resource tree.
- Adaptive forms for text, numbers, booleans, secrets, selections, JSON, and files.
- Drag-and-drop JSON/text files.
- Structured results: tables, property grids, lists, primitive values, and optional raw JSON.
- Confirmation for destructive operations through SCIC metadata.
- Light/dark theme packages.
- Browser extension API for specialized interfaces.
- FastAPI application ready to mount or serve.

## Basic use

```python
from scic_webgui import SCICWebGUI, WebGUIConfig

webgui = SCICWebGUI(
    scic,
    WebGUIConfig(
        application_name="OpenShell Manager",
        application_description="OSAM administrative interface",
        default_variant="dark",
    ),
)

app = webgui.app
```

## Semantic metadata

```python
metadata={
    "title": "Import Root Authority",
    "category": "Trust",
    "icon": "◈",
    "submit_label": "Import",
}
```

Parameter:

```python
metadata={
    "label": "Public profile",
    "input_kind": "json-file",
    "accepted_extensions": [".json"],
}
```

Destructive operation:

```python
metadata={
    "danger": "destructive",
    "confirmation_required": True,
}
```

## Specialized extensions

Configure ES modules:

```python
WebGUIConfig(
    extension_scripts=("/static/osam-webgui.js",),
)
```

Register a result renderer:

```javascript
SCICWebGUI.registerResultRenderer(
  ({ resource, value }) =>
    resource?.path.endsWith("/services/list") && Array.isArray(value),
  ({ value }) => `<div class="service-list">...</div>`,
  100,
);
```

Register an input renderer:

```javascript
SCICWebGUI.registerInputRenderer(
  ({ metadata }) => metadata.format === "uuid",
  ({ index }) => `<input class="control" name="arg-${index}" pattern="[0-9a-f-]+">`,
  100,
);
```

Replace a complete command view:

```javascript
SCICWebGUI.registerView(
  "/osam/root-authority/list",
  async ({ resource, api, mount }) => {
    const response = await api("/invoke", {
      method: "POST",
      body: JSON.stringify({ path: resource.path, arguments: [] }),
    });
    mount.innerHTML = `<section>...</section>`;
  },
);
```

The generic renderer remains available as a fallback for every uncustomized resource.

## Development

```bash
./check.sh
```
