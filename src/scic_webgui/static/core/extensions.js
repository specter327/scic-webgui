const views = new Map();
const inputRenderers = [];
const resultRenderers = [];

function registerOrdered(collection, match, renderer, priority = 0) {
  if (typeof match !== "function" || typeof renderer !== "function") {
    throw new TypeError("match and renderer must be functions");
  }
  collection.push({ match, renderer, priority });
  collection.sort((a, b) => b.priority - a.priority);
}

export const extensions = {
  registerView(path, renderer) {
    if (!path || typeof renderer !== "function") throw new TypeError("Invalid view registration");
    views.set(path, renderer);
  },
  registerInputRenderer(match, renderer, priority = 0) {
    registerOrdered(inputRenderers, match, renderer, priority);
  },
  registerResultRenderer(match, renderer, priority = 0) {
    registerOrdered(resultRenderers, match, renderer, priority);
  },
  getView(path) { return views.get(path); },
  findInput(context) { return inputRenderers.find(item => item.match(context))?.renderer; },
  findResult(context) { return resultRenderers.find(item => item.match(context))?.renderer; },
};

window.SCICWebGUI = {
  registerView: extensions.registerView,
  registerInputRenderer: extensions.registerInputRenderer,
  registerResultRenderer: extensions.registerResultRenderer,
};
