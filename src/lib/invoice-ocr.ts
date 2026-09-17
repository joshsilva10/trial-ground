import { createWorker } from "tesseract.js";

export type InvoiceLine = { nome: string; quantidade: number; produtoId?: string };
export type InvoiceRead = { numero: string; linhas: InvoiceLine[]; texto: string };

const MAX_PDF_PAGES = 4;

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function parseInvoiceText(text: string): InvoiceRead {
  const clean = text.replace(/\r/g, "");
  const numberPatterns = [
    /(?:n(?:ú|u|º|°|o)?\.?\s*(?:da\s*)?(?:nota|nf(?:-?e|c-?e)?)|nota\s*fiscal)\s*[:#-]?\s*(\d{3,12})/i,
    /(?:número|numero)\s*[:#-]?\s*(\d{3,12})/i,
  ];
  const numero = numberPatterns.map((pattern) => clean.match(pattern)?.[1]).find(Boolean) ?? "";
  const ignored = /^(danfe|documento auxiliar|chave de acesso|emitente|destinat|cnpj|cpf|subtotal|total|tribut|imposto|data|hora|série|serie)/i;
  const lines = clean.split("\n").map(normalizeSpaces).filter((line) => line.length >= 4 && !ignored.test(line));
  const parsed: InvoiceLine[] = [];

  for (const line of lines) {
    const patterns = [
      /^(?:\d+\s+)?(.{3,}?)\s+(\d+(?:[.,]\d+)?)\s*(?:un|und|unid|pc|pct|cx|kg|lt|l)?(?:\s+\d+[.,]\d{2}){1,3}$/i,
      /^(.{3,}?)\s+(?:qtd|qtde|quantidade)\s*[:x]?\s*(\d+(?:[.,]\d+)?)/i,
      /^(.{3,}?)\s+[xX]\s*(\d+(?:[.,]\d+)?)\b/,
    ];
    const match = patterns.map((pattern) => line.match(pattern)).find(Boolean);
    if (!match?.[1] || !match[2]) continue;
    const quantidade = Number(match[2].replace(",", "."));
    const nome = normalizeSpaces(match[1]).replace(/^\d{3,14}\s+/, "").replace(/\s+(un|und|pc|pct|cx|kg|lt|l)$/i, "");
    if (nome.length >= 3 && Number.isFinite(quantidade) && quantidade > 0 && quantidade <= 100000) {
      parsed.push({ nome, quantidade });
    }
  }

  const unique = parsed.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.nome.toLowerCase() === item.nome.toLowerCase() && candidate.quantidade === item.quantidade) === index,
  );
  return { numero, linhas: unique.slice(0, 80), texto: clean };
}

async function recognizeSources(sources: (Blob | HTMLCanvasElement)[], onProgress: (progress: number) => void) {
  const worker = await createWorker("por", undefined, {
    logger: (message) => {
      if (message.status === "recognizing text" && typeof message.progress === "number") onProgress(message.progress);
    },
  });
  try {
    const texts: string[] = [];
    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index];
      if (!source) continue;
      const result = await worker.recognize(source);
      texts.push(result.data.text);
      onProgress((index + 1) / sources.length);
    }
    return texts.join("\n");
  } finally {
    await worker.terminate();
  }
}

async function pdfCanvases(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const canvases: HTMLCanvasElement[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PDF_PAGES); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.7 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");
    if (!context) continue;
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    canvases.push(canvas);
  }
  return canvases;
}

export async function readInvoice(file: File | Blob, onProgress: (progress: number) => void) {
  const sources = file.type === "application/pdf" && file instanceof File ? await pdfCanvases(file) : [file];
  return parseInvoiceText(await recognizeSources(sources, onProgress));
}

export function frameLooksLikeDocument(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context || canvas.width < 100 || canvas.height < 100) return false;
  const sample = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let bright = 0;
  let dark = 0;
  let total = 0;
  for (let index = 0; index < sample.length; index += 64) {
    const value = (sample[index] ?? 0) * 0.299 + (sample[index + 1] ?? 0) * 0.587 + (sample[index + 2] ?? 0) * 0.114;
    if (value > 175) bright += 1;
    if (value < 100) dark += 1;
    total += 1;
  }
  return total > 0 && bright / total > 0.42 && dark / total > 0.025;
}