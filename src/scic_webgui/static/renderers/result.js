import { esc, isPlainObject, titleize, unwrapResult } from "../core/helpers.js";
import { extensions } from "../core/extensions.js";

function primitive(value) {
  if (typeof value === "boolean") return `<span class="badge ${value ? "success" : "muted"}">${value ? "Yes" : "No"}</span>`;
  if (value === null || value === undefined) return '<span class="muted-value">—</span>';
  if (typeof value === "string" && /^https?:\/\//.test(value)) return `<a href="${esc(value)}" target="_blank" rel="noreferrer">${esc(value)}</a>`;
  return `<span>${esc(value)}</span>`;
}

function objectGrid(value, depth) {
  return `<dl class="property-grid">${Object.entries(value).map(([key, item]) => `<div><dt>${esc(titleize(key))}</dt><dd>${renderValue(item, null, depth + 1)}</dd></div>`).join("")}</dl>`;
}

function table(value, resource) {
  const keys = [...new Set(value.flatMap(row => Object.keys(row)))];
  return `<div class="table-wrap"><table><thead><tr>${keys.map(k => `<th>${esc(titleize(k))}</th>`).join("")}</tr></thead><tbody>${value.map(row => `<tr>${keys.map(k => `<td>${renderValue(row[k], resource, 1)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

export function renderValue(value, resource = null, depth = 0) {
  const custom = extensions.findResult({ value, resource, depth });
  if (custom) return custom({ value, resource, depth, renderValue });
  if (depth > 4) return `<code>${esc(JSON.stringify(value))}</code>`;
  if (Array.isArray(value)) {
    if (!value.length) return '<div class="empty-state compact">No results</div>';
    if (value.every(isPlainObject)) return table(value, resource);
    return `<ul class="value-list">${value.map(item => `<li>${renderValue(item, resource, depth + 1)}</li>`).join("")}</ul>`;
  }
  if (isPlainObject(value)) return objectGrid(value, depth);
  return primitive(value);
}

export function renderResults(results, resource, showRaw = true) {
  const value = unwrapResult(results);
  return `<section class="result-section"><div class="section-heading"><div><span class="eyebrow">Result</span><h2>Execution output</h2></div>${showRaw ? '<button class="button subtle" type="button" data-toggle-raw>Raw JSON</button>' : ""}</div><div class="structured-result">${renderValue(value, resource)}</div>${showRaw ? `<pre class="raw-result hidden">${esc(JSON.stringify(results, null, 2))}</pre>` : ""}</section>`;
}
