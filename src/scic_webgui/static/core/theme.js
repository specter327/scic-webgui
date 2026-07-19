import { state } from "./state.js";

export function applyTheme(packageId, requestedVariant) {
  const pack = state.themes.find(item => item.identifier === packageId) || state.themes[0];
  let variant = requestedVariant;
  if (variant === "system") {
    variant = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  const theme = pack?.variants.find(item => item.variant === variant) || pack?.variants[0];
  if (theme) {
    Object.entries(theme.tokens).forEach(([key, value]) => {
      document.documentElement.style.setProperty(`--${key}`, value);
    });
    document.documentElement.dataset.theme = theme.variant;
  }
  localStorage.setItem("scic-theme-package", pack?.identifier || "default");
  localStorage.setItem("scic-theme-variant", requestedVariant);
}
