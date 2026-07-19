import { state } from "./core/state.js";
import { api } from "./core/api.js";
import {
  esc,
  metadataOf,
  resourceIcon,
  titleize,
  flattenTree,
  findResource,
  executableCount,
  contextCount,
  directExecutables,
  topLevelModules,
  parentPath,
  isStatusOperation,
  isQuickAction,
  formatDuration,
  formatTimestamp,
  summarizeResult,
} from "./core/helpers.js";
import { extensions } from "./core/dashboard-extensions.js";
import { applyTheme } from "./core/theme.js";
import { recordActivity, clearActivity, toggleFavorite, isFavorite } from "./core/activity.js";
import { renderInput, bindInputEnhancements, collectArguments } from "./renderers/input.js";
import { renderResults, renderValue } from "./renderers/result.js";

const app = document.querySelector("#app");

function allResources() {
  return flattenTree(state.tree).map(item => item.node);
}

function allExecutables() {
  return allResources().filter(resource => resource.type !== "context");
}

function modules() {
  return topLevelModules(state.tree);
}

function themeOptions() {
  return state.themes.flatMap(pack => ["system", "light", "dark"].map(variant =>
    `<option value="${pack.identifier}:${variant}">${esc(pack.name)} · ${variant}</option>`
  )).join("");
}

function primaryNavigation() {
  const items = [
    ["dashboard", "⌂", "Dashboard", true],
    ["explorer", "⌘", "Explorer", true],
    ["activity", "◷", "Activity", state.config.activityEnabled],
    ["favorites", "☆", "Favorites", state.config.favoritesEnabled],
  ].filter(([, , , enabled]) => enabled);
  return items.map(([view, icon, label]) => `
    <button class="primary-nav-item ${state.currentView === view ? "active" : ""}" data-view="${view}">
      <span>${icon}</span><em>${label}</em>
      ${view === "activity" && state.activity.length ? `<b>${Math.min(state.activity.length, 99)}</b>` : ""}
      ${view === "favorites" && state.favorites.size ? `<b>${state.favorites.size}</b>` : ""}
    </button>`).join("");
}

function moduleNavigation() {
  return modules().map(module => {
    const active = state.activeModule?.path === module.path || state.selected?.path?.startsWith(`${module.path}/`);
    return `<button class="module-nav-item ${active ? "active" : ""}" data-resource="${esc(module.path)}" data-type="context">
      <span class="module-nav-icon">${resourceIcon(module)}</span>
      <span class="module-nav-copy"><strong>${esc(titleize(module.name))}</strong><small>${executableCount(module)} operations</small></span>
      <i>›</i>
    </button>`;
  }).join("");
}

function shell(content, options = {}) {
  app.className = state.config.applicationClass || "";
  const collapsed = state.sidebarCollapsed ? "sidebar-collapsed" : "";
  const open = state.sidebarOpen ? "sidebar-open" : "";
  app.innerHTML = `<div class="application-shell ${collapsed} ${open}">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">${esc(state.config.brandMark || "S")}</div>
        <div class="brand-copy"><strong>${esc(state.config.applicationName)}</strong><small>${esc(state.config.applicationDescription)}</small></div>
        <button class="sidebar-collapse" data-collapse title="Collapse navigation">‹</button>
      </div>
      <nav class="primary-navigation">${primaryNavigation()}</nav>
      <div class="sidebar-section-title"><span>Modules</span><small>${modules().length}</small></div>
      <nav class="module-navigation">${moduleNavigation() || '<div class="sidebar-empty">No modules</div>'}</nav>
      <div class="sidebar-footer">
        <span class="connection-dot"></span>
        <div><strong>Connected</strong><small>SCIC session active</small></div>
        <span class="version">0.3</span>
      </div>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div class="topbar-left">
          <button class="icon-button menu-button" data-menu aria-label="Open navigation">☰</button>
          <div class="location">
            <span>${esc(options.section || "Workspace")}</span>
            <strong>${esc(options.title || state.config.applicationName)}</strong>
          </div>
        </div>
        <div class="topbar-actions">
          ${state.config.searchEnabled ? '<button class="command-search" data-palette><span>⌕</span><em>Search commands</em><kbd>Ctrl K</kbd></button>' : ""}
          ${state.config.allowThemeSelection ? `<select class="theme-select" data-theme aria-label="Theme">${themeOptions()}</select>` : ""}
          <button class="icon-button" data-refresh title="Refresh current view">↻</button>
        </div>
      </header>
      <main class="workspace-content">${content}</main>
    </section>

    <button class="scrim" data-menu aria-label="Close navigation"></button>
    <div class="command-palette ${state.paletteOpen ? "open" : ""}" data-palette-shell>
      <button class="palette-backdrop" data-close-palette aria-label="Close search"></button>
      <section class="palette-panel">
        <div class="palette-input-row"><span>⌕</span><input data-palette-input autocomplete="off" placeholder="Search modules and commands…"><kbd>Esc</kbd></div>
        <div class="palette-results" data-palette-results></div>
      </section>
    </div>
    <div class="toast-region" data-toasts></div>
  </div>`;
  bindShell(options.refresh || renderCurrentView);
}

function bindShell(refreshHandler) {
  app.querySelectorAll("[data-view]").forEach(element => {
    element.onclick = () => navigateView(element.dataset.view);
  });
  app.querySelectorAll("[data-resource]").forEach(element => {
    element.onclick = () => selectResource(element.dataset.resource, element.dataset.type);
  });
  app.querySelectorAll("[data-menu]").forEach(element => {
    element.onclick = () => {
      state.sidebarOpen = !state.sidebarOpen;
      app.querySelector(".application-shell")?.classList.toggle("sidebar-open", state.sidebarOpen);
    };
  });
  app.querySelector("[data-collapse]")?.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    localStorage.setItem("scic-sidebar-collapsed", String(state.sidebarCollapsed));
    app.querySelector(".application-shell")?.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  });
  app.querySelector("[data-refresh]")?.addEventListener("click", refreshHandler);
  app.querySelector("[data-palette]")?.addEventListener("click", openPalette);
  app.querySelector("[data-close-palette]")?.addEventListener("click", closePalette);

  const paletteInput = app.querySelector("[data-palette-input]");
  if (paletteInput) {
    paletteInput.value = state.searchQuery;
    paletteInput.oninput = () => {
      state.searchQuery = paletteInput.value;
      renderPaletteResults();
    };
    paletteInput.onkeydown = event => {
      if (event.key === "Escape") closePalette();
      if (event.key === "Enter") app.querySelector("[data-palette-result]")?.click();
    };
  }

  const theme = app.querySelector("[data-theme]");
  if (theme) {
    const pack = localStorage.getItem("scic-theme-package") || state.config.defaultTheme;
    const variant = localStorage.getItem("scic-theme-variant") || state.config.defaultVariant;
    theme.value = `${pack}:${variant}`;
    theme.onchange = () => {
      const [packageName, selectedVariant] = theme.value.split(":");
      applyTheme(packageName, selectedVariant);
    };
  }
  if (state.paletteOpen) queueMicrotask(() => {
    renderPaletteResults();
    paletteInput?.focus();
  });
}

function toast(message, kind = "success") {
  const region = app.querySelector("[data-toasts]");
  if (!region) return;
  const element = document.createElement("div");
  element.className = `toast ${kind}`;
  element.innerHTML = `<span>${kind === "success" ? "✓" : kind === "error" ? "!" : "i"}</span><p>${esc(message)}</p>`;
  region.appendChild(element);
  requestAnimationFrame(() => element.classList.add("visible"));
  setTimeout(() => {
    element.classList.remove("visible");
    setTimeout(() => element.remove(), 220);
  }, 3200);
}

function openPalette() {
  state.paletteOpen = true;
  app.querySelector("[data-palette-shell]")?.classList.add("open");
  renderPaletteResults();
  queueMicrotask(() => app.querySelector("[data-palette-input]")?.focus());
}

function closePalette() {
  state.paletteOpen = false;
  state.searchQuery = "";
  app.querySelector("[data-palette-shell]")?.classList.remove("open");
}

function renderPaletteResults() {
  const mount = app.querySelector("[data-palette-results]");
  if (!mount) return;
  const query = state.searchQuery.trim().toLowerCase();
  const resources = allResources()
    .filter(resource => !query || `${resource.name} ${resource.path} ${resource.description || ""}`.toLowerCase().includes(query))
    .slice(0, 14);
  mount.innerHTML = resources.length ? resources.map(resource => `
    <button class="palette-result" data-palette-result data-path="${esc(resource.path)}" data-type="${resource.type}">
      <span class="palette-icon">${resourceIcon(resource)}</span>
      <div><strong>${esc(titleize(resource.name))}</strong><small>${esc(resource.path)}</small></div>
      <em>${resource.type === "context" ? "Module" : "Command"}</em>
    </button>`).join("") : '<div class="palette-empty">No matching resources</div>';
  mount.querySelectorAll("[data-palette-result]").forEach(element => {
    element.onclick = () => {
      const { path, type } = element.dataset;
      closePalette();
      selectResource(path, type);
    };
  });
}

function metricCard(icon, label, value, caption, tone = "primary") {
  return `<article class="metric-card ${tone}"><span class="metric-icon">${icon}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong><p>${esc(caption)}</p></div></article>`;
}

function moduleProbe(module) {
  return state.probes.get(module.path);
}

function moduleStatus(module) {
  const probe = moduleProbe(module);
  if (!probe) return '<span class="status-chip neutral"><i></i>Available</span>';
  if (probe.pending) return '<span class="status-chip neutral"><i></i>Checking</span>';
  if (probe.ok) return '<span class="status-chip success"><i></i>Healthy</span>';
  return '<span class="status-chip danger"><i></i>Attention</span>';
}

function moduleCards() {
  return modules().map(module => {
    const contexts = contextCount(module);
    const operations = executableCount(module);
    const description = module.description || `Manage ${titleize(module.name)} capabilities.`;
    return `<article class="module-card" data-resource="${esc(module.path)}" data-type="context">
      <div class="module-card-header"><span class="module-card-icon">${resourceIcon(module)}</span>${moduleStatus(module)}</div>
      <h3>${esc(titleize(module.name))}</h3>
      <p>${esc(description)}</p>
      <footer><span><strong>${operations}</strong> operations</span><span><strong>${contexts}</strong> groups</span><button aria-label="Open module">→</button></footer>
    </article>`;
  }).join("");
}

function quickActions() {
  const favorites = state.config.favoritesEnabled
    ? [...state.favorites].map(path => findResource(state.tree, path)).filter(Boolean)
    : [];
  const discovered = allExecutables().filter(isQuickAction);
  const combined = [...favorites, ...discovered].filter((resource, index, array) => array.findIndex(item => item.path === resource.path) === index).slice(0, 6);
  if (!combined.length) return '<div class="empty-panel"><span>＋</span><strong>No quick actions yet</strong><p>Favorite commands or mark them with <code>quick_action</code> metadata.</p></div>';
  return combined.map(resource => `<button class="quick-action" data-resource="${esc(resource.path)}" data-type="${resource.type}">
    <span>${resourceIcon(resource)}</span><div><strong>${esc(titleize(resource.name))}</strong><small>${esc(parentPath(resource.path) || resource.path)}</small></div><i>→</i>
  </button>`).join("");
}

function activityRows(limit = 7) {
  const entries = state.activity.slice(0, limit);
  if (!entries.length) return '<div class="empty-panel"><span>◷</span><strong>No activity recorded</strong><p>Executed commands will appear here.</p></div>';
  return entries.map(entry => `<button class="activity-row" data-resource="${esc(entry.path)}" data-type="executable">
    <span class="activity-status ${entry.ok ? "success" : "danger"}">${entry.ok ? "✓" : "!"}</span>
    <div><strong>${esc(titleize(entry.name || entry.path?.split("/").pop()))}</strong><small>${esc(entry.summary || entry.path)}</small></div>
    <time>${esc(formatTimestamp(entry.timestamp))}</time>
    <em>${esc(formatDuration(entry.duration))}</em>
  </button>`).join("");
}

function dashboardWidgets() {
  const context = { state, api, helpers: window.SCICWebGUI };
  return extensions.getDashboardWidgets().map(widget => {
    try {
      return `<section class="dashboard-panel extension-widget" data-widget="${esc(widget.id)}">${widget.renderer(context)}</section>`;
    } catch (error) {
      return `<section class="dashboard-panel error-card"><strong>Widget ${esc(widget.id)} failed</strong><p>${esc(error.message)}</p></section>`;
    }
  }).join("");
}

function renderDashboard() {
  state.currentView = "dashboard";
  state.selected = null;
  state.activeModule = null;
  const operationTotal = allExecutables().length;
  const successful = state.activity.filter(entry => entry.ok).length;
  const successRate = state.activity.length ? `${Math.round(successful / state.activity.length * 100)}%` : "—";
  shell(`<section class="dashboard-page">
    <section class="dashboard-hero">
      <div class="hero-copy"><span class="eyebrow">Command center</span><h1>${esc(state.config.dashboardTitle || state.config.homeTitle || state.config.applicationName)}</h1><p>${esc(state.config.dashboardDescription || state.config.homeDescription || state.config.applicationDescription)}</p><div class="hero-actions"><button class="button primary" data-probe>Run health scan</button><button class="button glass" data-open-explorer>Open explorer</button></div></div>
      <div class="hero-visual"><div class="orb one"></div><div class="orb two"></div><div class="system-ring"><span>${modules().length}</span><small>modules online</small></div></div>
    </section>

    <section class="metric-grid">
      ${metricCard("▦", "Modules", modules().length, "Top-level SCIC contexts", "violet")}
      ${metricCard("⌘", "Operations", operationTotal, "Registered executable commands", "blue")}
      ${metricCard("✓", "Success rate", successRate, `${state.activity.length} recorded executions`, "green")}
      ${state.config.favoritesEnabled
        ? metricCard("☆", "Favorites", state.favorites.size, "Pinned commands and workflows", "amber")
        : metricCard("▦", "Contexts", contextCount(state.tree), "Registered nested contexts", "amber")}
    </section>

    <section class="dashboard-grid">
      <section class="dashboard-panel modules-panel">
        <header class="panel-heading"><div><span class="eyebrow">System map</span><h2>Modules</h2></div><button class="text-button" data-open-explorer>View explorer →</button></header>
        <div class="module-grid">${moduleCards() || '<div class="empty-panel">No SCIC contexts registered.</div>'}</div>
      </section>

      <section class="dashboard-panel quick-panel">
        <header class="panel-heading"><div><span class="eyebrow">Shortcuts</span><h2>Quick actions</h2></div></header>
        <div class="quick-action-list">${quickActions()}</div>
      </section>

      ${state.config.activityEnabled ? `<section class="dashboard-panel activity-panel">
        <header class="panel-heading"><div><span class="eyebrow">Execution log</span><h2>Recent activity</h2></div><button class="text-button" data-view-activity>All activity →</button></header>
        <div class="activity-list">${activityRows()}</div>
      </section>` : ""}

      ${dashboardWidgets()}
    </section>
  </section>`, { section: "Overview", title: "Dashboard", refresh: renderDashboard });

  app.querySelectorAll("[data-resource]").forEach(element => element.onclick = () => selectResource(element.dataset.resource, element.dataset.type));
  app.querySelectorAll("[data-open-explorer]").forEach(element => element.onclick = () => navigateView("explorer"));
  app.querySelector("[data-view-activity]")?.addEventListener("click", () => navigateView("activity"));
  app.querySelector("[data-probe]")?.addEventListener("click", probeModules);
}

async function probeModules() {
  const button = app.querySelector("[data-probe]");
  if (button) {
    button.disabled = true;
    button.textContent = "Scanning…";
  }
  const targets = modules().map(module => ({
    module,
    operation: flattenTree(module).map(item => item.node).find(isStatusOperation),
  })).filter(item => item.operation);

  targets.forEach(({ module }) => state.probes.set(module.path, { pending: true }));
  renderDashboard();

  await Promise.all(targets.map(async ({ module, operation }) => {
    const start = performance.now();
    try {
      const response = await api("/invoke", {
        method: "POST",
        body: JSON.stringify({ path: operation.path, arguments: [] }),
      });
      state.probes.set(module.path, {
        ok: true,
        value: response.results,
        duration: performance.now() - start,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      state.probes.set(module.path, {
        ok: false,
        error,
        duration: performance.now() - start,
        timestamp: new Date().toISOString(),
      });
    }
  }));
  toast(`Health scan completed for ${targets.length} module${targets.length === 1 ? "" : "s"}.`, "info");
  renderDashboard();
}

function groupOperations(resource) {
  const groups = new Map();
  for (const child of resource.children || []) {
    const meta = metadataOf(child);
    const key = meta.category || (child.type === "context" ? "Submodules" : "Operations");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(child);
  }
  return [...groups.entries()];
}

function moduleOperationCards(resource) {
  return groupOperations(resource).map(([group, children]) => `<section class="operation-group">
    <header><h3>${esc(group)}</h3><span>${children.length}</span></header>
    <div class="operation-card-grid">${children.map(child => `<button class="operation-tile" data-resource="${esc(child.path)}" data-type="${child.type}">
      <span class="operation-tile-icon">${resourceIcon(child)}</span><div><strong>${esc(titleize(child.name))}</strong><p>${esc(child.description || (child.type === "context" ? "Open submodule" : "Run command"))}</p></div><i>${isFavorite(child.path) ? "★" : "→"}</i>
    </button>`).join("")}</div>
  </section>`).join("");
}

function renderModule(resource) {
  state.currentView = "module";
  state.selected = resource;
  state.activeModule = modules().find(module => resource.path === module.path || resource.path.startsWith(`${module.path}/`)) || resource;
  const meta = metadataOf(resource);
  const probe = moduleProbe(state.activeModule);
  const recent = state.activity.filter(entry => entry.path?.startsWith(resource.path)).slice(0, 5);
  const extensionPanels = extensions.findModulePanels({ resource, state, api }).map(renderer => renderer({ resource, state, api, renderValue })).join("");

  shell(`<section class="module-page">
    <section class="module-banner">
      <div class="module-banner-icon">${resourceIcon(resource)}</div>
      <div class="module-banner-copy"><span class="eyebrow">${esc(meta.category || "Module")}</span><h1>${esc(meta.title || titleize(resource.name))}</h1><p>${esc(resource.description || `Manage ${titleize(resource.name)} capabilities and operations.`)}</p></div>
      <div class="module-banner-status">${moduleStatus(state.activeModule)}<small>${probe?.timestamp ? `Checked ${formatTimestamp(probe.timestamp)}` : "Status not scanned"}</small></div>
    </section>

    <section class="module-metrics">
      ${metricCard("⌘", "Operations", executableCount(resource), "Executable commands", "blue")}
      ${metricCard("▦", "Submodules", contextCount(resource), "Nested contexts", "violet")}
      ${metricCard("◷", "Recent runs", recent.length, "Recorded for this module", "green")}
    </section>

    <div class="module-layout">
      <section class="module-main dashboard-panel">
        <header class="panel-heading"><div><span class="eyebrow">Capabilities</span><h2>Available operations</h2></div></header>
        ${moduleOperationCards(resource) || '<div class="empty-panel">This context has no child resources.</div>'}
      </section>
      <aside class="module-aside">
        <section class="dashboard-panel"><header class="panel-heading"><div><span class="eyebrow">Module activity</span><h2>Latest runs</h2></div></header><div class="activity-list">${recent.length ? recent.map(entry => activityRowsForEntry(entry)).join("") : '<div class="empty-panel compact">No runs for this module.</div>'}</div></section>
        ${probe?.ok ? `<section class="dashboard-panel"><header class="panel-heading"><div><span class="eyebrow">Health snapshot</span><h2>Status result</h2></div></header><div class="compact-result">${renderValue(probe.value, resource)}</div></section>` : ""}
        ${extensionPanels}
      </aside>
    </div>
  </section>`, { section: "Module", title: meta.title || titleize(resource.name), refresh: () => renderModule(resource) });

  app.querySelectorAll("[data-resource]").forEach(element => element.onclick = () => selectResource(element.dataset.resource, element.dataset.type));
}

function activityRowsForEntry(entry) {
  return `<button class="activity-row compact" data-resource="${esc(entry.path)}" data-type="executable"><span class="activity-status ${entry.ok ? "success" : "danger"}">${entry.ok ? "✓" : "!"}</span><div><strong>${esc(titleize(entry.name || entry.path?.split("/").pop()))}</strong><small>${esc(entry.summary || entry.path)}</small></div><time>${esc(formatTimestamp(entry.timestamp))}</time></button>`;
}

function renderExplorer() {
  state.currentView = "explorer";
  state.selected = null;
  const query = state.searchQuery.trim().toLowerCase();
  const resources = flattenTree(state.tree).filter(({ node }) => !query || `${node.name} ${node.path} ${node.description || ""}`.toLowerCase().includes(query));
  shell(`<section class="page-shell">
    <header class="page-header"><div><span class="eyebrow">Resource browser</span><h1>SCIC Explorer</h1><p>Inspect every registered context and executable from one searchable workspace.</p></div><label class="inline-search"><span>⌕</span><input data-explorer-search value="${esc(state.searchQuery)}" placeholder="Filter resources…"></label></header>
    <section class="explorer-panel dashboard-panel">
      <div class="explorer-header"><span>Resource</span><span>Type</span><span>Path</span><span></span></div>
      <div class="explorer-list">${resources.map(({ node, depth }) => `<button class="explorer-row" data-resource="${esc(node.path)}" data-type="${node.type}">
        <span class="explorer-resource" style="--depth:${depth}"><i>${resourceIcon(node)}</i><strong>${esc(titleize(node.name))}</strong></span><span class="type-chip ${node.type}">${node.type === "context" ? "Context" : "Command"}</span><code>${esc(node.path)}</code><em>→</em>
      </button>`).join("") || '<div class="empty-panel">No matching resources.</div>'}</div>
    </section>
  </section>`, { section: "Workspace", title: "Explorer", refresh: renderExplorer });
  app.querySelector("[data-explorer-search]")?.addEventListener("input", event => {
    state.searchQuery = event.target.value;
    renderExplorer();
    queueMicrotask(() => {
      const field = app.querySelector("[data-explorer-search]");
      field?.focus();
      field?.setSelectionRange(field.value.length, field.value.length);
    });
  });
  app.querySelectorAll("[data-resource]").forEach(element => element.onclick = () => selectResource(element.dataset.resource, element.dataset.type));
}

function renderActivity() {
  state.currentView = "activity";
  shell(`<section class="page-shell">
    <header class="page-header"><div><span class="eyebrow">Audit trail</span><h1>Execution activity</h1><p>Local history of commands executed from this browser session.</p></div>${state.activity.length ? '<button class="button danger-outline" data-clear-activity>Clear history</button>' : ""}</header>
    <section class="dashboard-panel activity-table-panel">
      <div class="activity-table-header"><span>Status</span><span>Command</span><span>Result</span><span>Duration</span><span>Time</span></div>
      <div class="activity-table">${state.activity.length ? state.activity.map(entry => `<button class="activity-table-row" data-resource="${esc(entry.path)}" data-type="executable"><span class="activity-status ${entry.ok ? "success" : "danger"}">${entry.ok ? "✓" : "!"}</span><strong>${esc(titleize(entry.name || entry.path?.split("/").pop()))}<small>${esc(entry.path)}</small></strong><span>${esc(entry.summary || "—")}</span><code>${esc(formatDuration(entry.duration))}</code><time>${esc(formatTimestamp(entry.timestamp))}</time></button>`).join("") : '<div class="empty-panel"><span>◷</span><strong>No activity recorded</strong><p>Execute a command to populate this timeline.</p></div>'}</div>
    </section>
  </section>`, { section: "Workspace", title: "Activity", refresh: renderActivity });
  app.querySelectorAll("[data-resource]").forEach(element => element.onclick = () => selectResource(element.dataset.resource, element.dataset.type));
  app.querySelector("[data-clear-activity]")?.addEventListener("click", () => {
    clearActivity();
    toast("Activity history cleared.", "info");
    renderActivity();
  });
}

function renderFavorites() {
  state.currentView = "favorites";
  const resources = [...state.favorites].map(path => findResource(state.tree, path)).filter(Boolean);
  shell(`<section class="page-shell">
    <header class="page-header"><div><span class="eyebrow">Pinned workflows</span><h1>Favorites</h1><p>Keep frequently used commands within immediate reach.</p></div></header>
    <section class="favorite-grid">${resources.length ? resources.map(resource => `<article class="favorite-card"><button class="favorite-open" data-resource="${esc(resource.path)}" data-type="${resource.type}"><span>${resourceIcon(resource)}</span><div><strong>${esc(titleize(resource.name))}</strong><p>${esc(resource.description || resource.path)}</p><code>${esc(resource.path)}</code></div></button><button class="favorite-remove" data-unfavorite="${esc(resource.path)}" title="Remove favorite">×</button></article>`).join("") : '<div class="empty-panel large"><span>☆</span><strong>No favorite commands</strong><p>Open a command and use the star button to pin it here.</p><button class="button primary" data-open-explorer>Browse commands</button></div>'}</section>
  </section>`, { section: "Workspace", title: "Favorites", refresh: renderFavorites });
  app.querySelectorAll("[data-resource]").forEach(element => element.onclick = () => selectResource(element.dataset.resource, element.dataset.type));
  app.querySelectorAll("[data-unfavorite]").forEach(element => element.onclick = event => {
    event.stopPropagation();
    toggleFavorite(element.dataset.unfavorite);
    renderFavorites();
  });
  app.querySelector("[data-open-explorer]")?.addEventListener("click", () => navigateView("explorer"));
}

async function renderExecutable(resource) {
  state.currentView = "command";
  state.selected = resource;
  state.activeModule = modules().find(module => resource.path.startsWith(module.path)) || null;
  const customView = extensions.getView(resource.path);
  if (customView) {
    shell('<section class="page-shell"><div id="custom-view"></div></section>', { section: "Command", title: titleize(resource.name), refresh: () => renderExecutable(resource) });
    await customView({ resource, api, mount: app.querySelector("#custom-view"), helpers: window.SCICWebGUI });
    return;
  }

  const meta = metadataOf(resource);
  const parameters = resource.parameters || [];
  const danger = meta.danger === "destructive" || meta.confirmation_required;
  const favorite = state.config.favoritesEnabled && isFavorite(resource.path);
  shell(`<section class="command-page">
    <header class="command-header">
      <div class="command-icon">${resourceIcon(resource)}</div>
      <div><span class="eyebrow">${esc(meta.category || "Command")}</span><h1>${esc(meta.title || titleize(resource.name))}</h1><p>${esc(resource.description || "Execute this SCIC operation.")}</p><code>${esc(resource.path)}</code></div>
      ${state.config.favoritesEnabled ? `<button class="favorite-button ${favorite ? "active" : ""}" data-favorite title="${favorite ? "Remove favorite" : "Add favorite"}">${favorite ? "★" : "☆"}</button>` : ""}
    </header>

    <div class="command-layout">
      <section class="command-form-panel dashboard-panel">
        <header class="panel-heading"><div><span class="eyebrow">Input</span><h2>Parameters</h2></div><span class="parameter-count">${parameters.length}</span></header>
        <form id="invoke" class="form">${parameters.length ? parameters.map((schema, index) => renderInput(schema, index, resource)).join("") : '<div class="no-arguments"><span>✓</span><div><strong>Ready to execute</strong><p>This command does not require arguments.</p></div></div>'}${danger ? '<label class="confirmation"><input type="checkbox" name="confirmation"><span><strong>Confirm destructive operation</strong><small>I understand that this command may modify or remove data.</small></span></label>' : ""}<div class="form-actions"><button class="button primary execute-button" type="submit"><span>${esc(meta.submit_label || "Execute command")}</span><i>→</i></button></div></form>
      </section>
      <section class="command-output-panel dashboard-panel"><header class="panel-heading"><div><span class="eyebrow">Output</span><h2>Execution result</h2></div><span class="output-state" data-output-state>Waiting</span></header><div id="output" class="output-slot"><div class="output-placeholder"><span>⌘</span><strong>No result yet</strong><p>Configure the parameters and run the command.</p></div></div></section>
    </div>
  </section>`, { section: state.activeModule ? titleize(state.activeModule.name) : "Command", title: meta.title || titleize(resource.name), refresh: () => renderExecutable(resource) });

  app.querySelector("[data-favorite]")?.addEventListener("click", () => {
    const enabled = toggleFavorite(resource.path);
    toast(enabled ? "Command added to favorites." : "Command removed from favorites.", "info");
    renderExecutable(resource);
  });

  const form = app.querySelector("#invoke");
  bindInputEnhancements(form, parameters);
  form.onsubmit = async event => {
    event.preventDefault();
    if (danger && !form.elements.confirmation.checked) {
      showInlineError("Confirm the operation before continuing.");
      return;
    }
    const output = app.querySelector("#output");
    const outputState = app.querySelector("[data-output-state]");
    const submit = form.querySelector("button[type=submit]");
    outputState.textContent = "Running";
    outputState.className = "output-state running";
    submit.disabled = true;
    output.innerHTML = '<div class="loading-card"><div class="spinner"></div><div><strong>Executing command</strong><span>Waiting for the SCIC result…</span></div></div>';
    const start = performance.now();
    try {
      const response = await api("/invoke", {
        method: "POST",
        body: JSON.stringify({ path: resource.path, arguments: collectArguments(form, parameters) }),
      });
      const duration = performance.now() - start;
      output.innerHTML = renderResults(response.results, resource, state.config.showRawResults);
      outputState.textContent = "Completed";
      outputState.className = "output-state success";
      recordActivity({ path: resource.path, name: resource.name, ok: true, duration, summary: summarizeResult(response.results) });
      bindRawToggle(output);
      toast(`${titleize(resource.name)} completed in ${formatDuration(duration)}.`);
    } catch (error) {
      const duration = performance.now() - start;
      output.innerHTML = errorMarkup(error);
      outputState.textContent = "Failed";
      outputState.className = "output-state danger";
      recordActivity({ path: resource.path, name: resource.name, ok: false, duration, summary: error?.message || "Execution failed" });
      toast(`${titleize(resource.name)} failed.`, "error");
    } finally {
      submit.disabled = false;
    }
  };
}

function bindRawToggle(output) {
  const toggle = output.querySelector("[data-toggle-raw]");
  if (toggle) toggle.onclick = () => output.querySelector(".raw-result")?.classList.toggle("hidden");
}

function showInlineError(message) {
  const output = app.querySelector("#output");
  if (output) output.innerHTML = errorMarkup({ message });
}

function errorMarkup(error) {
  const message = error?.message || error?.detail?.message || JSON.stringify(error);
  return `<section class="error-card"><span class="error-icon">!</span><div><strong>Execution failed</strong><p>${esc(message)}</p><details><summary>Technical details</summary><pre>${esc(JSON.stringify(error, null, 2))}</pre></details></div></section>`;
}

async function selectResource(path, type) {
  state.sidebarOpen = false;
  try {
    const response = await api(`/describe?path=${encodeURIComponent(path)}`);
    const resource = response.resource;
    if (type === "context" || resource.type === "context") renderModule(resource);
    else await renderExecutable(resource);
  } catch (error) {
    shell(`<section class="page-shell">${errorMarkup(error)}</section>`, { section: "Error", title: "Resource unavailable" });
  }
}

function navigateView(view) {
  state.searchQuery = "";
  state.selected = null;
  state.activeModule = null;
  if (view === "dashboard") renderDashboard();
  else if (view === "explorer") renderExplorer();
  else if (view === "activity") renderActivity();
  else if (view === "favorites") renderFavorites();
}

function renderCurrentView() {
  if (state.currentView === "dashboard") renderDashboard();
  else if (state.currentView === "explorer") renderExplorer();
  else if (state.currentView === "activity") renderActivity();
  else if (state.currentView === "favorites") renderFavorites();
  else if (state.currentView === "module" && state.selected) renderModule(state.selected);
  else if (state.currentView === "command" && state.selected) renderExecutable(state.selected);
  else renderDashboard();
}

async function loadExtensions() {
  for (const script of state.config.extensionScripts || []) await import(script);
}

function installKeyboardShortcuts() {
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && state.config?.searchEnabled) {
      event.preventDefault();
      openPalette();
    }
    if (event.key === "Escape" && state.paletteOpen) closePalette();
  });
}

async function boot() {
  try {
    state.config = await fetch("/config.json").then(response => response.json());
    const [tree, themes] = await Promise.all([api("/tree"), api("/themes")]);
    state.tree = tree.tree;
    state.themes = themes.themes;
    document.title = state.config.applicationName;
    applyTheme(
      localStorage.getItem("scic-theme-package") || state.config.defaultTheme,
      localStorage.getItem("scic-theme-variant") || state.config.defaultVariant,
    );
    await loadExtensions();
    installKeyboardShortcuts();
    renderDashboard();
    if (state.config.dashboardAutoProbe) probeModules();
  } catch (error) {
    app.innerHTML = `<div class="fatal-error">${errorMarkup(error)}</div>`;
  }
}

Object.assign(window.SCICWebGUI, {
  api,
  renderValue,
  selectResource,
  navigateView,
  toast,
  getState: () => state,
});

boot();
