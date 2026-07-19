export const esc = value => String(value ?? "").replace(/[&<>'"]/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[char]));

export function titleize(value) {
  return String(value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

export function schemaType(schema = {}) {
  const value = schema.data_type || schema.type || schema.dataType;
  return String(typeof value === "string" ? value : value?.name || "str").toLowerCase();
}

export function metadataOf(value = {}) {
  return value.metadata || {};
}

export function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function unwrapResult(results) {
  return Array.isArray(results) && results.length === 1 ? results[0] : results;
}

const ICONS = [
  [/runtime|system|health|status/i, "◉"],
  [/service|module|component/i, "▦"],
  [/storage|database|repository|data/i, "◫"],
  [/deploy|release|publish|install/i, "⇧"],
  [/log|audit|event|history/i, "≡"],
  [/identity|user|account|profile/i, "◎"],
  [/authority|security|certificate|trust|auth/i, "◇"],
  [/domain|network|connection|tunnel/i, "⌁"],
  [/setting|config|preference/i, "⚙"],
  [/remove|delete|revoke|disable/i, "−"],
  [/create|add|import|enable|start/i, "+"],
  [/list|search|find|query/i, "⌕"],
  [/get|read|inspect|show|info/i, "↗"],
];

export function resourceIcon(resource = {}) {
  const meta = metadataOf(resource);
  if (meta.icon) return esc(meta.icon);
  const name = `${resource.name || ""} ${resource.path || ""}`;
  const matched = ICONS.find(([pattern]) => pattern.test(name));
  if (matched) return matched[1];
  return resource.type === "context" ? "▦" : "›";
}

export function flattenTree(node, depth = 0, out = []) {
  for (const child of node?.children || []) {
    out.push({ node: child, depth });
    if (child.type === "context") flattenTree(child, depth + 1, out);
  }
  return out;
}

export function findResource(tree, path) {
  if (!tree) return null;
  if (tree.path === path) return tree;
  for (const { node } of flattenTree(tree)) if (node.path === path) return node;
  return null;
}

export function executableCount(resource) {
  return flattenTree(resource).filter(({ node }) => node.type !== "context").length;
}

export function contextCount(resource) {
  return flattenTree(resource).filter(({ node }) => node.type === "context").length;
}

export function directExecutables(resource) {
  return (resource?.children || []).filter(child => child.type !== "context");
}

export function topLevelModules(tree) {
  return (tree?.children || []).filter(child => child.type === "context");
}

export function parentPath(path) {
  const segments = String(path || "").split("/").filter(Boolean);
  if (segments.length <= 1) return null;
  segments.pop();
  return `/${segments.join("/")}`;
}

export function isStatusOperation(resource) {
  if (!resource || resource.type === "context") return false;
  if ((resource.parameters || []).length) return false;
  const meta = metadataOf(resource);
  if (meta.dashboard_probe === true || meta.health_probe === true) return true;
  return /^(status|health|summary|info)$/i.test(resource.name || "");
}

export function isQuickAction(resource) {
  if (!resource || resource.type === "context") return false;
  const meta = metadataOf(resource);
  if (meta.quick_action === true || meta.dashboard_action === true) return true;
  return /^(create|add|import|deploy|start|enable|issue|open)$/i.test(resource.name || "");
}

export function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "—";
  if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
  return `${(milliseconds / 1000).toFixed(milliseconds < 10000 ? 1 : 0)} s`;
}

export function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
}

export function summarizeResult(value) {
  const unwrapped = unwrapResult(value);
  if (Array.isArray(unwrapped)) return `${unwrapped.length} item${unwrapped.length === 1 ? "" : "s"}`;
  if (isPlainObject(unwrapped)) return `${Object.keys(unwrapped).length} field${Object.keys(unwrapped).length === 1 ? "" : "s"}`;
  if (typeof unwrapped === "boolean") return unwrapped ? "Completed" : "False";
  if (unwrapped === null || unwrapped === undefined) return "No data";
  const text = String(unwrapped);
  return text.length > 64 ? `${text.slice(0, 61)}…` : text;
}
