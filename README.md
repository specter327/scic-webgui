# scic-webgui 0.3.0

Interactive dashboard and extensible web application for [`scic-framework`](https://github.com/specter327/scic-framework).

Version 0.3 changes the default interaction model from a command-tree browser into an operational dashboard. The complete SCIC registry is still discovered automatically, but the user starts from modules, system indicators, quick actions, favorites and execution activity.

## Dashboard capabilities

- Operational landing page generated from the SCIC tree.
- Module cards with operation and subcontext counts.
- Interactive health scan for parameterless `status`, `health`, `summary` and `info` commands.
- Quick actions inferred from semantic command names or SCIC metadata.
- Command palette with `Ctrl+K` search.
- Favorites persisted in browser storage.
- Execution activity with result summary, duration and success state.
- Dedicated module pages instead of one flat navigation tree.
- Explorer retained as a secondary complete resource browser.
- Two-panel command workspace for input and structured output.
- Structured tables, property grids, lists, badges and optional raw JSON.
- Responsive desktop, tablet and mobile layouts.
- Theme packages and specialized application extensions.

## Basic use

```python
from scic_webgui import SCICWebGUI, WebGUIConfig

webgui = SCICWebGUI(
    scic,
    WebGUIConfig(
        application_name="OpenShell Manager",
        application_description="OSAM administrative control plane",
        dashboard_title="OpenShell Command Center",
        dashboard_description="Manage runtime, services and trusted infrastructure.",
        brand_mark="OS",
        default_variant="dark",
        dashboard_auto_probe=False,
    ),
)

app = webgui.app
```

The same SCIC registry can be consumed by `scic-cli`; no command is duplicated in the WebGUI.

## Dashboard metadata

The dashboard works without special metadata, but semantic metadata improves placement and behavior.

### Quick action

```python
metadata={
    "title": "Import Root Authority",
    "category": "Trust",
    "icon": "◇",
    "quick_action": True,
    "submit_label": "Import profile",
}
```

### Health probe

A parameterless operation named `status`, `health`, `summary` or `info` is automatically eligible for the health scan. It can also be declared explicitly:

```python
metadata={
    "dashboard_probe": True,
}
```

### Destructive command

```python
metadata={
    "danger": "destructive",
    "confirmation_required": True,
}
```

## Specialized application extensions

The generic dashboard remains the fallback. Applications may add widgets, module panels, renderers or complete views.

```python
WebGUIConfig(
    extension_scripts=("/static/osam-webgui.js",),
)
```

### Dashboard widget

```javascript
SCICWebGUI.registerDashboardWidget(
  "cluster-status",
  ({ state }) => `
    <header class="panel-heading">
      <div><span class="eyebrow">Cluster</span><h2>Manager nodes</h2></div>
    </header>
    <strong>${state.clusterCount ?? 0}</strong>
  `,
  100,
);
```

### Module panel

```javascript
SCICWebGUI.registerModulePanel(
  ({ resource }) => resource.path.endsWith("/root-authority"),
  ({ resource }) => `
    <section class="dashboard-panel">
      <h2>Trust overview</h2>
      <p>Specialized content for ${resource.name}</p>
    </section>
  `,
  100,
);
```

### Complete command view

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

## Configuration

Relevant dashboard fields:

```python
WebGUIConfig(
    dashboard_title="Operations",
    dashboard_description="Administrative command center",
    brand_mark="OS",
    search_enabled=True,
    activity_enabled=True,
    favorites_enabled=True,
    dashboard_auto_probe=False,
    max_activity_entries=50,
)
```

`dashboard_auto_probe` is disabled by default so the WebGUI never invokes an operation automatically unless the application opts in.

## Development

```bash
./check.sh
```
