import { extensions } from "./extensions.js";

const dashboardWidgets = [];
const modulePanels = [];

function registerOrdered(collection, match, renderer, priority = 0) {
  if (typeof match !== "function" || typeof renderer !== "function") {
    throw new TypeError("match and renderer must be functions");
  }
  collection.push({ match, renderer, priority });
  collection.sort((a, b) => b.priority - a.priority);
}

Object.assign(extensions, {
  registerDashboardWidget(id, renderer, priority = 0) {
    if (!id || typeof renderer !== "function") throw new TypeError("Invalid dashboard widget");
    dashboardWidgets.push({ id, renderer, priority });
    dashboardWidgets.sort((a, b) => b.priority - a.priority);
  },
  registerModulePanel(match, renderer, priority = 0) {
    registerOrdered(modulePanels, match, renderer, priority);
  },
  getDashboardWidgets() {
    return [...dashboardWidgets];
  },
  findModulePanels(context) {
    return modulePanels.filter(item => item.match(context)).map(item => item.renderer);
  },
});

Object.assign(window.SCICWebGUI, {
  registerDashboardWidget: extensions.registerDashboardWidget,
  registerModulePanel: extensions.registerModulePanel,
});

export { extensions };
