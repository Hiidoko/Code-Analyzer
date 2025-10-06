import { HtmlAnalysis } from "../types.js";

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function normalize(source: string): string[] {
  return source.replace(/\r\n?/g, "\n").split("\n");
}

export function analyzeHtml(source: string): HtmlAnalysis {
  const lines = normalize(source);
  const stack: Array<{ tag: string; line: number }> = [];
  const unclosedTags: Array<{ tag: string; line: number }> = [];
  const missingCloseTags: Array<{ tag: string; line: number }> = [];
  const incompleteTags: Array<{ snippet: string; line: number }> = [];
  const imgsWithoutAlt: Array<{ snippet: string; line: number }> = [];
  const linksWithoutHref: Array<{ snippet: string; line: number }> = [];

  const code = lines.join("\n");
  const idMatches = Array.from(code.matchAll(/id="([^"]+)"/g)).map((match) => match[1]);
  const idCount = new Map<string, number>();
  idMatches.forEach((id) => {
    idCount.set(id, (idCount.get(id) ?? 0) + 1);
  });
  const duplicatedIds = Array.from(idCount.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const openTagRegex = /<([a-zA-Z0-9]+)([^>]*)>/g;
    const closeTagRegex = /<\/([a-zA-Z0-9]+)\s*>/g;

    for (const match of line.matchAll(openTagRegex)) {
      const tagName = match[1].toLowerCase();
      const attrs = match[2];
      const selfClosing = /\/>$/.test(match[0]) || attrs.trim().endsWith("/");
      if (tagName === "img" && !/\balt\b/i.test(match[0])) {
        imgsWithoutAlt.push({ snippet: match[0], line: lineNumber });
      }
      if (tagName === "a" && !/\bhref\b/i.test(match[0])) {
        linksWithoutHref.push({ snippet: match[0], line: lineNumber });
      }
      if (VOID_ELEMENTS.has(tagName) || selfClosing) {
        continue;
      }
      stack.push({ tag: tagName, line: lineNumber });
    }

    for (const match of line.matchAll(closeTagRegex)) {
      const tagName = match[1].toLowerCase();
      const stackIndex = stack.map((entry) => entry.tag).lastIndexOf(tagName);
      if (stackIndex === -1) {
        missingCloseTags.push({ tag: tagName, line: lineNumber });
      } else {
        stack.splice(stackIndex, 1);
      }
    }

    if (/<([a-zA-Z0-9]+)[^>]*$/.test(line.trim())) {
      incompleteTags.push({ snippet: line.trim(), line: lineNumber });
    }
  });

  unclosedTags.push(...stack);

  return {
    unclosedTags,
    missingCloseTags,
    incompleteTags,
    duplicatedIds,
    imgsWithoutAlt,
    linksWithoutHref,
  };
}
