import { esc, isPlainObject, titleize, unwrapResult, summarizeResult } from "../core/helpers.js";
import { extensions } from "../core/extensions.js";

function primitive(value) {
  if (typeof value === "boolean") return `<span class="badge ${value ? "success" : "muted"}">${value ? "Yes" : "No"}</span>`;
  if (value === null || value === undefined) return '<span class="muted-value">—</span>';
  if (typeof value === "string" && /^https?:\/\//.test(value)) return `<a href="${esc(value)}" target="_blank" rel="noreferrer">${esc(value)}</a>`;
  if (typeof value === "number") return `<strong class="numeric-value">${esc(value)}</strong>`;
  return `<span>${esc(value)}</span>`;
}

function objectGrid(value, depth) {
  return `<dl class="property-grid">${Object.entries(value).map(([key, item]) => `<div><dt>${esc(titleize(key))}</dt><dd>${renderValue(item, null, depth + 1)}</dd></div>`).join("")}</dl>`;
}

function table(value, resource) {
  const keys = [...new Set(value.flatMap(row => Object.keys(row)))];
  return `<div class="table-wrap"><table><thead><tr>${keys.map(key => `<th>${esc(titleize(key))}</th>`).join("")}</tr></thead><tbody>${value.map(row => `<tr>${keys.map(key => `<td>${renderValue(row[key], resource, 1)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export function renderValue(value, resource = null, depth = 0) {
  const custom = extensions.findResult({ value, resource, depth });
  if (custom) return custom({ value, resource, depth, renderValue });
  if (depth > 4) return `<code>${esc(JSON.stringify(value))}</code>`;
  if (Array.isArray(value)) {
    if (!value.length) return '<div class="empty-panel compact"><span>∅</span><strong>No results</strong></div>';
    if (value.every(isPlainObject)) return table(value, resource);
    return `<ul class="value-list">${value.map(item => `<li>${renderValue(item, resource, depth + 1)}</li>`).join("")}</ul>`;
  }
  if (isPlainObject(value)) return objectGrid(value, depth);
  return primitive(value);
}

export function renderResults(results, resource, showRaw = true) {
  const value = unwrapResult(results);
  return `<section class="result-section">
    <div class="result-toolbar"><span class="result-summary"><i>✓</i>${esc(summarizeResult(results))}</span>${showRaw ? '<button class="text-button" type="button" data-toggle-raw>Raw JSON</button>' : ""}</div>
    <div class="structured-result">${renderValue(value, resource)}</div>
    ${showRaw ? `<pre class="raw-result hidden">${esc(JSON.stringify(results, null, 2))}</pre>` : ""}
  </section>`;
}
