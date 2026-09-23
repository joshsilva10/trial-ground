import { createWorker, PSM } from "tesseract.js";

export type InvoiceLine = { nome: string; quantidade: number; produtoId?: string };
export type InvoiceRead = { numero: string; linhas: InvoiceLine[]; texto: string };

const MAX_PDF_PAGES = 4;

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

const PRODUCT_TABLE_HEADER = /(?:c[oó]d(?:igo)?\s*(?:produto)?|descri[cç][aã]o|produto\/servi[cç]o|qtd|qtde|quantidade|vlr?\.?\s*unit)/i;
const PRODUCT_TABLE_END = /^(?:c[aá]lculo|base de c[aá]lculo|valor total|transportador|dados adicionais|informa[cç][oõ]es|reservado ao fisco)/i;
const PRODUCT_NOISE = /^(?:item|c[oó]d(?:igo)?|ncm|cst|cfop|un(?:id)?|qtd|qtde|quantidade|vlr|valor|bc|icms|ipi)(?:\s|$)/i;

function cleanProductName(value: string) {
  return normalizeSpaces(value)
    .replace(/^\d{5,14}\s+/, "")
    .replace(/\s+(?:un|und|unid|pc|pct|cx|kg|lt|l)$/i, "")
    .replace(/^[|:;.,\-\s]+|[|:;,\-\s]+$/g, "")
    .trim();
}

function validQuantity(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/\s/g, "").replace(".", "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100000 ? parsed : null;
}

function parseFragmentedTable(lines: string[]) {
  const parsed: InvoiceLine[] = [];
  let insideTable = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (PRODUCT_TABLE_HEADER.test(line)) {
      insideTable = true;
      continue;
    }
    if (!insideTable || PRODUCT_TABLE_END.test(line)) {
      if (insideTable && PRODUCT_TABLE_END.test(line)) break;
      continue;
    }
    if (PRODUCT_NOISE.test(line) || line.length < 4) continue;

    const inlineQuantity = line.match(/(?:qtd|qtde|quantidade)\s*[:x-]?\s*(\d+(?:[.,]\d+)?)/i);
    const trailingColumns = line.match(/^(.{3,}?[A-Za-zÀ-ÿ][^|]{2,}?)\s+(?:un|und|unid|pc|pct|cx|kg|lt|l)?\s*(\d+(?:[.,]\d+)?)\s+(?:\d+[.,]\d{2})(?:\s+\d+[.,]\d{2})/i);
    let nome = cleanProductName(trailingColumns?.[1] ?? line.replace(inlineQuantity?.[0] ?? "", ""));
    let quantidade = validQuantity(trailingColumns?.[2] ?? inlineQuantity?.[1]);

    if (quantidade === null && /[A-Za-zÀ-ÿ]{3}/.test(nome)) {
      for (let lookAhead = index + 1; lookAhead <= Math.min(index + 4, lines.length - 1); lookAhead += 1) {
        const candidate = lines[lookAhead] ?? "";
        if (PRODUCT_TABLE_END.test(candidate) || PRODUCT_TABLE_HEADER.test(candidate)) break;
        const labelled = candidate.match(/(?:qtd|qtde|quantidade)\s*[:x-]?\s*(\d+(?:[.,]\d+)?)/i);
        const unitColumn = candidate.match(/^(?:un|und|unid|pc|pct|cx|kg|lt|l)\s+(\d+(?:[.,]\d+)?)(?:\s|$)/i);
        const numericColumns = candidate.match(/^(\d+(?:[.,]\d+)?)\s+\d+[.,]\d{2}(?:\s|$)/);
        quantidade = validQuantity(labelled?.[1] ?? unitColumn?.[1] ?? numericColumns?.[1]);
        if (quantidade !== null) break;
        if (/[A-Za-zÀ-ÿ]{3}/.test(candidate) && !PRODUCT_NOISE.test(candidate)) {
          nome = cleanProductName(`${nome} ${candidate}`);
        }
      }
    }

    if (nome.length >= 3 && quantidade !== null) parsed.push({ nome, quantidade });
  }

  return parsed;
}

export function parseInvoiceText(text: string): InvoiceRead {
  const clean = text.replace(/\r/g, "");
  const numberPatterns = [
    /(?:n(?:ú|u|º|°|o)?\.?\s*(?:da\s*)?(?:nota|nf(?:-?e|c-?e)?)|nota\s*fiscal)\s*[:#-]?\s*(\d{3,12})/i,
    /(?:número|numero)\s*(?:da\s+nota(?:\s+fiscal)?)?\s*[:#-]?\s*(\d{3,12})/i,
    /^\s*n[º°.]?\s*[:#-]?\s*(\d{3,12})\s*$/im,
  ];
  const numero = numberPatterns.map((pattern) => clean.match(pattern)?.[1]).find(Boolean) ?? "";
  const ignored = /^(danfe|documento auxiliar|chave de acesso|emitente|destinat|cnpj|cpf|subtotal|total|tribut|imposto|data|hora|série|serie)/i;
  const lines = clean.split("\n").map(normalizeSpaces).filter((line) => line.length >= 4 && !ignored.test(line));
  const parsed: InvoiceLine[] = [];

  for (const line of lines) {
    const danfeMatch = line.match(
      /^(?:\d{1,14}\s+)?(.{3,}?)\s+\d{8}\s+\d{3,4}\s+\d{4}\s+(?:un|und|unid|pc|pct|cx|kg|lt|l)\s+(\d+(?:[.,]\d+)?)/i,
    );
    const patterns = [
      /^(?:\d+\s+)?(.{3,}?)\s+(\d+(?:[.,]\d+)?)\s*(?:un|und|unid|pc|pct|cx|kg|lt|l)?(?:\s+\d+[.,]\d{2}){1,3}$/i,
      /^(.{3,}?)\s+(?:qtd|qtde|quantidade)\s*[:x]?\s*(\d+(?:[.,]\d+)?)/i,
      /^(.{3,}?)\s+[xX]\s*(\d+(?:[.,]\d+)?)\b/,
    ];
    const match = danfeMatch ?? patterns.map((pattern) => line.match(pattern)).find(Boolean);
    if (!match?.[1] || !match[2]) continue;
    const quantidade = Number(match[2].replace(",", "."));
    const nome = normalizeSpaces(match[1]).replace(/^\d{3,14}\s+/, "").replace(/\s+(un|und|pc|pct|cx|kg|lt|l)$/i, "");
    if (nome.length >= 3 && Number.isFinite(quantidade) && quantidade > 0 && quantidade <= 100000) {
      parsed.push({ nome, quantidade });
    }
  }

  parsed.push(...parseFragmentedTable(clean.split("\n").map(normalizeSpaces).filter(Boolean)));

  const unique = parsed.filter((item, index, all) =>
    all.findIndex((candidate) => candidate.nome.toLowerCase() === item.nome.toLowerCase() && candidate.quantidade === item.quantidade) === index,
  );
  return { numero, linhas: unique.slice(0, 80), texto: clean };
}

async function imageCanvas(source: Blob) {
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  const maxSide = 3600;
  const scale = Math.min(3, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error("Não foi possível preparar a imagem.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray = (pixels.data[index] ?? 0) * 0.299 + (pixels.data[index + 1] ?? 0) * 0.587 + (pixels.data[index + 2] ?? 0) * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.65 + 128));
    pixels.data[index] = contrasted;
    pixels.data[index + 1] = contrasted;
    pixels.data[index + 2] = contrasted;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

function productBand(source: HTMLCanvasElement) {
  const canvas = document.createElement("canvas");
  const top = Math.round(source.height * 0.5);
  const height = Math.round(source.height * 0.32);
  canvas.width = source.width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context?.drawImage(source, 0, top, source.width, height, 0, 0, source.width, height);
  return canvas;
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
      await worker.setParameters({ tessedit_pageseg_mode: index === 0 ? PSM.AUTO : PSM.SPARSE_TEXT, preserve_interword_spaces: "1" });
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
  let sources: (Blob | HTMLCanvasElement)[];
  if (file.type === "application/pdf" && file instanceof File) {
    sources = await pdfCanvases(file);
  } else {
    const prepared = await imageCanvas(file);
    sources = [prepared, productBand(prepared)];
  }
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