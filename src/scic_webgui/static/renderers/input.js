import { esc, metadataOf, schemaType, titleize } from "../core/helpers.js";
import { extensions } from "../core/extensions.js";

function options(meta) {
  const values = meta.options || meta.choices || meta.enum;
  if (!Array.isArray(values)) return null;
  return values.map(v => typeof v === "object" ? v : { value: v, label: v });
}

export function renderInput(schema, index, resource) {
  const meta = metadataOf(schema);
  const context = { schema, index, resource, metadata: meta };
  const custom = extensions.findInput(context);
  if (custom) return custom(context);

  const name = schema.name || `argument_${index}`;
  const label = meta.label || meta.title || titleize(name);
  const description = meta.description || schema.description || "";
  const type = schemaType(schema);
  const kind = meta.input_kind || meta.widget || "";
  const required = meta.required === false ? "" : "required";
  let control;

  const selectOptions = options(meta);
  if (selectOptions) {
    control = `<select class="control" name="arg-${index}" ${required}>${selectOptions.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join("")}</select>`;
  } else if (kind === "json-file" || kind === "file") {
    const accept = (meta.accepted_extensions || []).join(",");
    control = `<div class="file-drop" data-file-drop="${index}"><input name="arg-file-${index}" type="file" accept="${esc(accept)}"><strong>Choose or drop a file</strong><span>${esc(accept || "Any text file")}</span></div><textarea class="control code-control" name="arg-${index}" ${required} placeholder="File content or inline JSON"></textarea>`;
  } else if (type.includes("bool")) {
    control = `<label class="switch"><input name="arg-${index}" type="checkbox"><span></span><em>Enabled</em></label>`;
  } else if (kind === "password" || meta.secret) {
    control = `<input class="control" name="arg-${index}" type="password" ${required} autocomplete="new-password">`;
  } else if (kind === "multiline" || type.includes("dict") || type.includes("list") || type.includes("tuple") || type.includes("complex")) {
    control = `<textarea class="control code-control" name="arg-${index}" ${required} placeholder="Enter valid JSON"></textarea>`;
  } else if (type.includes("int") || type.includes("float") || type.includes("number")) {
    control = `<input class="control" name="arg-${index}" type="number" ${type.includes("float") ? 'step="any"' : 'step="1"'} ${required}>`;
  } else {
    control = `<input class="control" name="arg-${index}" type="text" ${required} placeholder="${esc(meta.placeholder || "")}">`;
  }

  return `<div class="field"><div class="field-heading"><label>${esc(label)}</label>${meta.optional ? '<span class="optional">Optional</span>' : ""}</div>${control}${description ? `<p class="hint">${esc(description)}</p>` : ""}</div>`;
}

export function bindInputEnhancements(form, parameters) {
  form.querySelectorAll("[data-file-drop]").forEach(drop => {
    const index = drop.dataset.fileDrop;
    const file = drop.querySelector("input[type=file]");
    const target = form.elements[`arg-${index}`];
    const read = selected => {
      if (!selected) return;
      const reader = new FileReader();
      reader.onload = () => { target.value = String(reader.result || ""); drop.classList.add("has-file"); drop.querySelector("strong").textContent = selected.name; };
      reader.readAsText(selected);
    };
    file.onchange = () => read(file.files[0]);
    drop.ondragover = event => { event.preventDefault(); drop.classList.add("dragging"); };
    drop.ondragleave = () => drop.classList.remove("dragging");
    drop.ondrop = event => { event.preventDefault(); drop.classList.remove("dragging"); read(event.dataTransfer.files[0]); };
  });
}

export function collectArguments(form, parameters) {
  return parameters.map((schema, index) => {
    const type = schemaType(schema);
    const element = form.elements[`arg-${index}`];
    if (type.includes("bool")) return element.checked ? "true" : "false";
    return element.value;
  });
}
