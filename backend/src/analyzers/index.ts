import {
  FileType,
  PythonAnalysis,
  HtmlAnalysis,
  CssAnalysis,
  JavaScriptAnalysis,
  GenericAnalysis,
} from "../types";
import { analyzePython } from "./pythonAnalyzer.js";
import { analyzeHtml } from "./htmlAnalyzer.js";
import { analyzeCss } from "./cssAnalyzer.js";
import { analyzeJavaScript } from "./javascriptAnalyzer.js";
import { analyzeGeneric } from "./genericAnalyzer.js";

export function analyzeByType(fileType: FileType, code: string):
  | { fileType: "py"; result: PythonAnalysis }
  | { fileType: "html"; result: HtmlAnalysis }
  | { fileType: "css"; result: CssAnalysis }
  | { fileType: "js"; result: JavaScriptAnalysis }
  | { fileType: "rb"; result: GenericAnalysis }
  | { fileType: "php"; result: GenericAnalysis }
  | { fileType: "go"; result: GenericAnalysis } {
  switch (fileType) {
    case "py":
      return { fileType, result: analyzePython(code) };
    case "html":
      return { fileType, result: analyzeHtml(code) };
    case "css":
      return { fileType, result: analyzeCss(code) };
    case "js":
      return { fileType, result: analyzeJavaScript(code) };
    case "rb":
    case "php":
    case "go":
      return { fileType, result: analyzeGeneric(code, fileType) };
    default:
      throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
  }
}
