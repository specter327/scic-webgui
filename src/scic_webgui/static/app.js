import { state } from "./core/state.js";
import { api } from "./core/api.js";
import { esc, metadataOf, resourceIcon, titleize } from "./core/helpers.js";
import { extensions } from "./core/extensions.js";
import { applyTheme } from "./core/theme.js";
import { renderInput, bindInputEnhancements, collectArguments } from "./renderers/input.js";
import { renderResults } from "./renderers/result.js";

const app = document.querySelector("#app");

function flatten(node, depth = 0, out = []) {
  for (const child of node.children || []) {
    out.push({ node: child, depth });
    if (child.type === "context") flatten(child, depth + 1, out);
  }
  return out;
}

function themeOptions() {
  return state.themes.flatMap(pack => ["system", "light", "dark"].map(variant =>
    `<option value="${pack.identifier}:${variant}">${esc(pack.name)} · ${variant}</option>`
  )).join("");
}

function navigation() {
  return flatten(state.tree).map(({ node, depth }) => {
    const active = state.selected?.path === node.path ? "active" : "";
    return `<button class="nav-item ${active} ${node.type}" data-path="${esc(node.path)}" data-type="${node.type}" style="--depth:${depth}"><span>${resourceIcon(node)}</span><em>${esc(titleize(node.name))}</em></button>`;
  }).join("");
}

function shell(content, options = {}) {
  app.className = state.config.applicationClass || "";
  app.innerHTML = `<div class="application-shell ${state.sidebarOpen ? "sidebar-open" : ""}">
    <aside class="sidebar">
      <div class="brand"><div class="brand-mark">S</div><div><strong>${esc(state.config.applicationName)}</strong><small>${esc(state.config.applicationDescription)}</small></div></div>
      <nav>${navigation()}</nav>
      <div class="sidebar-footer">SCIC WebGUI <span>0.2</span></div>
    </aside>
    <div class="workspace">
      <header class="topbar"><button class="icon-button menu-button" data-menu aria-label="Menu">☰</button><div class="crumb">${esc(options.path || state.selected?.path || state.tree?.path || "scic")}</div><div class="top-actions"><button class="button subtle" data-home>Home</button>${state.config.allowThemeSelection ? `<select class="theme-select" data-theme>${themeOptions()}</select>` : ""}</div></header>
      <main>${content}</main>
    </div>
    <button class="scrim" data-menu aria-label="Close menu"></button>
  </div>`;
  bindShell();
}

function bindShell() {
  app.querySelectorAll(".nav-item").forEach(el => el.onclick = () => selectResource(el.dataset.path, el.dataset.type));
  app.querySelectorAll("[data-home]").forEach(el => el.onclick = renderHome);
  app.querySelectorAll("[data-menu]").forEach(el => el.onclick = () => { state.sidebarOpen = !state.sidebarOpen; app.querySelector(".application-shell")?.classList.toggle("sidebar-open", state.sidebarOpen); });
  const theme = app.querySelector("[data-theme]");
  if (theme) {
    const pack = localStorage.getItem("scic-theme-package") || state.config.defaultTheme;
    const variant = localStorage.getItem("scic-theme-variant") || state.config.defaultVariant;
    theme.value = `${pack}:${variant}`;
    theme.onchange = () => { const [p, v] = theme.value.split(":"); applyTheme(p, v); };
  }
}

function cards(resources = []) {
  return `<div class="resource-grid">${resources.map(resource => `<button class="resource-card" data-resource="${esc(resource.path)}" data-type="${resource.type}"><span class="resource-icon">${resourceIcon(resource)}</span><div><strong>${esc(titleize(resource.name))}</strong><p>${esc(resource.description || (resource.type === "context" ? "Open context" : "Execute operation"))}</p></div><span class="arrow">→</span></button>`).join("")}</div>`;
}

function renderHome() {
  state.selected = null;
  shell(`<section class="page"><div class="page-heading home-heading"><span class="eyebrow">Application</span><h1>${esc(state.config.homeTitle || state.config.applicationName)}</h1><p>${esc(state.config.homeDescription || state.config.applicationDescription)}</p></div>${cards(state.tree.children || [])}</section>`, { path: state.tree.path });
}

function renderContext(resource) {
  const meta = metadataOf(resource);
  shell(`<section class="page"><div class="page-heading"><span class="eyebrow">${esc(meta.category || "Context")}</span><h1>${esc(meta.title || titleize(resource.name))}</h1><p>${esc(resource.description || "Available operations")}</p></div>${cards(resource.children || [])}</section>`, { path: resource.path });
}

async function renderExecutable(resource) {
  const customView = extensions.getView(resource.path);
  if (customView) {
    shell('<section class="page"><div id="custom-view"></div></section>', { path: resource.path });
    await customView({ resource, api, mount: document.querySelector("#custom-view"), helpers: window.SCICWebGUI });
    return;
  }
  const meta = metadataOf(resource);
  const parameters = resource.parameters || [];
  const danger = meta.danger === "destructive" || meta.confirmation_required;
  shell(`<section class="page executable-page"><div class="page-heading"><span class="eyebrow">${esc(meta.category || "Operation")}</span><h1>${esc(meta.title || titleize(resource.name))}</h1><p>${esc(resource.description || "Execute this SCIC operation")}</p></div><div class="operation-layout"><section class="operation-card"><form id="invoke" class="form">${parameters.length ? parameters.map((schema, i) => renderInput(schema, i, resource)).join("") : '<div class="no-arguments"><strong>Ready to execute</strong><span>This operation does not require arguments.</span></div>'}${danger ? '<label class="confirmation"><input type="checkbox" name="confirmation"><span>I understand this operation may modify or remove data.</span></label>' : ""}<div class="form-actions"><button class="button primary" type="submit">${esc(meta.submit_label || "Execute")}</button></div></form></section><div id="output" class="output-slot"></div></div></section>`, { path: resource.path });
  const form = document.querySelector("#invoke");
  bindInputEnhancements(form, parameters);
  form.onsubmit = async event => {
    event.preventDefault();
    if (danger && !form.elements.confirmation.checked) return showInlineError("Confirm the operation before continuing.");
    const output = document.querySelector("#output");
    output.innerHTML = '<div class="loading-card"><div class="spinner"></div><span>Executing operation…</span></div>';
    try {
      const response = await api("/invoke", { method: "POST", body: JSON.stringify({ path: resource.path, arguments: collectArguments(form, parameters) }) });
      output.innerHTML = renderResults(response.results, resource, state.config.showRawResults);
      const toggle = output.querySelector("[data-toggle-raw]");
      if (toggle) toggle.onclick = () => output.querySelector(".raw-result").classList.toggle("hidden");
    } catch (error) { output.innerHTML = errorMarkup(error); }
  };
}

function showInlineError(message) {
  const output = document.querySelector("#output");
  if (output) output.innerHTML = errorMarkup({ message });
}

function errorMarkup(error) {
  const message = error?.message || error?.detail?.message || JSON.stringify(error);
  return `<section class="error-card"><strong>Execution failed</strong><p>${esc(message)}</p><details><summary>Technical details</summary><pre>${esc(JSON.stringify(error, null, 2))}</pre></details></section>`;
}

async function selectResource(path, type) {
  state.sidebarOpen = false;
  try {
    const response = await api(`/describe?path=${encodeURIComponent(path)}`);
    state.selected = response.resource;
    if (type === "context" || response.resource.type === "context") renderContext(response.resource);
    else await renderExecutable(response.resource);
  } catch (error) { shell(`<section class="page">${errorMarkup(error)}</section>`, { path }); }
}

async function loadExtensions() {
  for (const script of state.config.extensionScripts || []) await import(script);
}

async function boot() {
  try {
    state.config = await fetch("/config.json").then(response => response.json());
    const [tree, themes] = await Promise.all([api("/tree"), api("/themes")]);
    state.tree = tree.tree;
    state.themes = themes.themes;
    document.title = state.config.applicationName;
    applyTheme(localStorage.getItem("scic-theme-package") || state.config.defaultTheme, localStorage.getItem("scic-theme-variant") || state.config.defaultVariant);
    await loadExtensions();
    renderHome();
  } catch (error) { app.innerHTML = `<div class="fatal-error">${errorMarkup(error)}</div>`; }
}

boot();
