// Neurai Wallet — Safe DOM construction helpers
//
// Building nodes with createElement + text nodes avoids assigning dynamic values
// to `innerHTML` (flagged as "Unsafe assignment to innerHTML" by the Firefox/AMO
// validator) and escapes any interpolated text automatically.

type Attrs = Record<string, string | number | boolean | null | undefined>;
type DomChild = Node | string | number | null | undefined | false | DomChild[];

function appendChild(parent: Node, child: DomChild): void {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) {
    child.forEach((c) => appendChild(parent, c));
    return;
  }
  parent.appendChild(
    typeof child === 'string' || typeof child === 'number'
      ? document.createTextNode(String(child))
      : child
  );
}

// Create an element. `attrs.class`/`className` sets the class; `attrs.text` sets
// textContent; every other key becomes an attribute. `children` may be a node, a
// string/number (→ text node), or an (optionally nested) array of those.
export function elem(tag: string, attrs?: Attrs | null, children?: DomChild): HTMLElement {
  const node = document.createElement(tag);
  if (attrs) {
    for (const key in attrs) {
      const value = attrs[key];
      if (value === null || value === undefined || value === false) continue;
      if (key === 'class' || key === 'className') node.className = String(value);
      else if (key === 'text') node.textContent = String(value);
      else node.setAttribute(key, String(value));
    }
  }
  if (children !== undefined) appendChild(node, children);
  return node;
}

// Replace all children of `parent` with the supplied nodes/strings.
export function setChildren(parent: Element, children: DomChild): void {
  parent.replaceChildren();
  appendChild(parent, children);
}

// Build an <option> element (value + visible label text).
export function option(value: string, label: string): HTMLOptionElement {
  const o = document.createElement('option');
  o.value = value;
  o.textContent = label;
  return o;
}

// Build a `.utxo-row` used by the signing screens: an index plus label/value
// fields rendered as <span>label</span><code>value</code>.
export function utxoRow(
  index: string | number,
  fields: Array<{ label: string; value: string }>
): HTMLElement {
  return elem('div', { class: 'utxo-row' }, [
    elem('div', { class: 'utxo-index' }, '#' + index),
    elem('div', { class: 'utxo-fields' }, fields.map((f) =>
      elem('div', { class: 'utxo-field' }, [
        elem('span', null, f.label),
        elem('code', null, f.value),
      ])
    )),
  ]);
}

// ── Restore-default buttons ─────────────────────────────────────────────────
//
// A field whose empty value means "use the default" (shown as its placeholder)
// can carry a restore button, `<button data-reset-for="<input id>">`. The
// button shows while the field holds a value of its own; pressing it empties
// the field, so the default applies again once the form is saved.

function syncResetButton(button: HTMLElement): void {
  const input = document.getElementById(button.dataset.resetFor || '') as HTMLInputElement | null;
  if (!input) return;
  button.classList.toggle('hidden', !input.value.trim());
  if (input.placeholder) button.title = `Restore the default (${input.placeholder})`;
}

// Show or hide every restore button under `root`. Call it after filling the
// fields from code: setting `value` fires no input event.
export function syncResetButtons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-reset-for]').forEach(syncResetButton);
}

// Wire the restore buttons under `root`. `onReset` runs after a field is
// emptied, with that field.
export function bindResetButtons(root: ParentNode = document, onReset?: (input: HTMLInputElement) => void): void {
  root.querySelectorAll<HTMLElement>('[data-reset-for]').forEach((button) => {
    const input = document.getElementById(button.dataset.resetFor || '') as HTMLInputElement | null;
    if (!input) return;
    input.addEventListener('input', () => syncResetButton(button));
    button.addEventListener('click', () => {
      input.value = '';
      syncResetButton(button);
      input.focus();
      onReset?.(input);
    });
    syncResetButton(button);
  });
}
