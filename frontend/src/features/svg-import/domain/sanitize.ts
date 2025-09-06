// Basic SVG sanitizer: removes script/foreignObject elements, inline event handlers,
// and external hrefs. This is intentionally simple and mirrors logic from the
// legacy importer where sanitisation happened inline. The worker runs this on an
// isolated string before any DOM is created in the main app.
export function sanitize(svg: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');

    // Remove dangerous elements outright
    const badTags = ['script', 'foreignObject'];
    badTags.forEach(tag => {
      const nodes = Array.from(doc.getElementsByTagName(tag));
      nodes.forEach(n => n.parentNode?.removeChild(n));
    });

    // Walk all elements and strip unsafe attributes
    const walker = doc.createTreeWalker(doc, NodeFilter.SHOW_ELEMENT);
    const toRemove: Element[] = [];
    while (walker.nextNode()) {
      const el = walker.currentNode as Element;
      // Remove event handlers (on*)
      Array.from(el.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) el.removeAttribute(attr.name);
        if ((name === 'href' || name === 'xlink:href') && /^(https?:)?\/\//i.test(attr.value)) {
          // External resources are not allowed
          el.removeAttribute(attr.name);
        }
      });
    }

    return new XMLSerializer().serializeToString(doc);
  } catch {
    // If parsing fails, fall back to original string – downstream parse will error
    return svg;
  }
}

