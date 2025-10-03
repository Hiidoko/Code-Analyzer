import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";
import { Buffer } from "node:buffer";
import { AnalyzeSummary, FileType } from "../types";

export interface PdfReportOptions {
  fileType: FileType;
  summary: AnalyzeSummary;
  fileName?: string;
}

const SEVERITY_COLORS: Record<"info" | "warning" | "success", string> = {
  warning: "#f97316",
  info: "#38bdf8",
  success: "#22c55e",
};

const FILE_TYPE_LABELS: Record<FileType, string> = {
  py: "Python",
  js: "JavaScript",
  html: "HTML",
  css: "CSS",
  rb: "Ruby",
  php: "PHP",
  go: "Go",
};

function ensureSpace(doc: PDFKit.PDFDocument, lines: number): void {
  const bottomMargin = doc.page.margins.bottom ?? 50;
  const required = lines * 16;
  if (doc.y + required > doc.page.height - bottomMargin) {
    doc.addPage();
  }
}

export async function createPdfReport({ fileType, summary, fileName }: PdfReportOptions): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  doc.on("error", reject);
  doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fillColor("#0ea5e9").fontSize(22).text("Relatório de Análise de Código");
    doc.moveDown(0.5);

    doc.fillColor("#1f2937").fontSize(12).text(`Arquivo: ${fileName ?? "não informado"}`);
    doc.text(`Tipo de arquivo: ${FILE_TYPE_LABELS[fileType]}`);
    doc.text(`Emitido em: ${new Date(summary.generatedAt).toLocaleString()}`);
    doc.text(`Categorias com alerta: ${summary.issuesCount}`);
    doc.moveDown(1);

    summary.sections.forEach((section) => {
      ensureSpace(doc, 3);
      doc
        .fillColor(SEVERITY_COLORS[section.severity])
        .font("Helvetica-Bold")
        .fontSize(14)
        .text(section.title);

      if (section.description) {
        doc.moveDown(0.2);
        doc.fillColor("#1f2937").font("Helvetica").fontSize(11).text(section.description);
      }

      doc.moveDown(0.2);
      doc.fillColor("#1f2937").fontSize(11);
      section.items.forEach((item) => {
        ensureSpace(doc, 1);
        doc.text(`• ${item}`, { indent: 10 });
      });

      if (section.hint) {
        ensureSpace(doc, 1);
        doc
          .moveDown(0.2)
          .fillColor("#facc15")
          .font("Helvetica-Oblique")
          .text(`Dica: ${section.hint}`, { indent: 10 });
      }

      doc.moveDown(0.5);
    });

    doc.end();
  });
}
