import { state } from "./state.js";

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.session) headers["X-SCIC-Session"] = state.session;
  const response = await fetch(state.config.apiPrefix + path, { ...options, headers });
  const session = response.headers.get("X-SCIC-Session");
  if (session) {
    state.session = session;
    localStorage.setItem("scic-session", session);
  }
  let payload;
  try { payload = await response.json(); }
  catch { payload = { detail: { message: response.statusText } }; }
  if (!response.ok) throw payload.detail || payload;
  return payload;
}
