import { CssAnalysis } from "../types";

const KNOWN_PROPERTIES = new Set([
  "color",
  "background",
  "background-color",
  "font-size",
  "font-family",
  "margin",
  "padding",
  "border",
  "border-radius",
  "width",
  "height",
  "display",
  "position",
  "top",
  "left",
  "right",
  "bottom",
  "text-align",
  "line-height",
  "list-style-type",
  "max-width",
  "min-width",
  "max-height",
  "min-height",
  "overflow",
  "z-index",
  "box-shadow",
  "opacity",
  "transition",
  "cursor",
  "float",
  "clear",
  "padding-left",
  "flex",
  "flex-direction",
  "justify-content",
  "align-items",
  "gap",
]);

function normalize(source: string): string {
  return source.replace(/\r\n?/g, "\n");
}

function getLineNumber(code: string, index: number): number {
  return code.slice(0, index).split("\n").length;
}

export function analyzeCss(code: string, htmlCode?: string): CssAnalysis {
  const normalized = normalize(code);
  const selectors: string[] = [];
  const selectorLines: Record<string, number[]> = {};
  const invalidProperties: Array<{ selector: string; line: number; property: string }> = [];
  const repeatedProperties: Array<{ selector: string; line: number; property: string }> = [];
  const unknownProperties: Array<{ selector: string; line: number; property: string }> = [];

  const blockRegex = /([.#]?[a-zA-Z_][\w-]*)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(normalized)) !== null) {
    const selector = match[1];
    const blockContent = match[2];
    const headerIndex = (match.index ?? 0) + match[0].indexOf(selector);
    const lineNumber = getLineNumber(normalized, headerIndex);

    selectors.push(selector);
    selectorLines[selector] = selectorLines[selector] ?? [];
    selectorLines[selector].push(lineNumber);

    const seenProperties = new Set<string>();
    const blockLines = blockContent.split("\n");
    blockLines.forEach((rawLine, offset) => {
      const line = rawLine.trim();
      if (line === "" || line.startsWith("/*")) {
        return;
      }
      const propertyLineNumber = lineNumber + offset + 1;
      if (!line.includes(":")) {
        invalidProperties.push({ selector, line: propertyLineNumber, property: line });
        return;
      }
      const [propertyName] = line.split(":", 1);
      const property = propertyName.trim();
      if (seenProperties.has(property)) {
        repeatedProperties.push({ selector, line: propertyLineNumber, property });
      } else {
        seenProperties.add(property);
      }
      if (!KNOWN_PROPERTIES.has(property)) {
        unknownProperties.push({ selector, line: propertyLineNumber, property });
      }
    });
  }

  const selectorCounts = selectors.reduce<Record<string, number>>((acc, selector) => {
    acc[selector] = (acc[selector] ?? 0) + 1;
    return acc;
  }, {});

  const duplicatedSelectors = Object.entries(selectorCounts)
    .filter(([, count]) => count > 1)
    .map(([selector]) => selector);

  const invalidSelectors = selectors.filter((selector) => !/^([.#]?[A-Za-z_][\w-]*)$/.test(selector));

  let unusedSelectors: string[] = [];
  if (htmlCode) {
    const classes = Array.from(htmlCode.matchAll(/class="([^"]+)"/g)).flatMap((matchItem) =>
      matchItem[1].split(/\s+/g).filter(Boolean),
    );
    const ids = Array.from(htmlCode.matchAll(/id="([^"]+)"/g)).map((matchItem) => matchItem[1]);
    const classSet = new Set(classes);
    const idSet = new Set(ids);
    unusedSelectors = selectors.filter((selector) => {
      if (selector.startsWith(".")) {
        return !classSet.has(selector.slice(1));
      }
      if (selector.startsWith("#")) {
        return !idSet.has(selector.slice(1));
      }
      return false;
    });
  }

  return {
    selectors,
    selectorLines,
    duplicatedSelectors,
    invalidSelectors,
    invalidProperties,
    repeatedProperties,
    unknownProperties,
    unusedSelectors,
  };
}
