import { state } from "./state.js";

function persist() {
  localStorage.setItem("scic-activity", JSON.stringify(state.activity));
  localStorage.setItem("scic-favorites", JSON.stringify([...state.favorites]));
}

export function recordActivity(entry) {
  if (state.config?.activityEnabled === false) return;
  const maximum = Number(state.config?.maxActivityEntries || 50);
  state.activity.unshift({
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    ...entry,
  });
  state.activity = state.activity.slice(0, maximum);
  persist();
}

export function clearActivity() {
  state.activity = [];
  persist();
}

export function toggleFavorite(path) {
  if (state.favorites.has(path)) state.favorites.delete(path);
  else state.favorites.add(path);
  persist();
  return state.favorites.has(path);
}

export function isFavorite(path) {
  return state.favorites.has(path);
}
