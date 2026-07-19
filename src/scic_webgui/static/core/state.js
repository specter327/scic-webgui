function parseLocal(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export const state = {
  config: null,
  tree: null,
  themes: [],
  session: localStorage.getItem("scic-session"),
  selected: null,
  activeModule: null,
  currentView: "dashboard",
  sidebarOpen: false,
  sidebarCollapsed: localStorage.getItem("scic-sidebar-collapsed") === "true",
  paletteOpen: false,
  searchQuery: "",
  favorites: new Set(parseLocal("scic-favorites", [])),
  activity: parseLocal("scic-activity", []),
  probes: new Map(),
};
