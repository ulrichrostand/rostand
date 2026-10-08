type Attributes = Record<string, string>;

interface ElementOptions {
  className?: string;
  text?: string;
  attributes?: Attributes;
}

/**
 * Crée un élément DOM. Le texte passe TOUJOURS par textContent :
 * aucun contenu n'est interprété comme HTML (pas de surface XSS).
 */
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
  children: (Node | null)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  for (const [name, value] of Object.entries(options.attributes ?? {})) node.setAttribute(name, value);
  for (const child of children) if (child) node.append(child);
  return node;
}

/** Rend `du texte avec du \`code\`` en nœuds texte + <code>, sans innerHTML. */
export function richText<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className?: string): HTMLElementTagNameMap[K] {
  const node = element(tag, className ? { className } : {});
  text.split("`").forEach((segment, index) => {
    if (segment.length === 0) return;
    node.append(index % 2 === 1 ? element("code", { text: segment }) : document.createTextNode(segment));
  });
  return node;
}

export function button(label: string, onClick: () => void, className = "btn"): HTMLButtonElement {
  const node = element("button", { className, text: label, attributes: { type: "button" } });
  node.addEventListener("click", onClick);
  return node;
}

export function requireElement<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Élément introuvable dans index.html : ${selector}`);
  return found;
}
