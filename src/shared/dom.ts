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
