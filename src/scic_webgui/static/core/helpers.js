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

export function resourceIcon(resource = {}) {
  const meta = metadataOf(resource);
  if (meta.icon) return esc(meta.icon);
  return resource.type === "context" ? "▦" : "›";
}
