import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, NoOutputGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

const InputSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mediaType: z.enum(acceptedTypes),
  base64: z.string().min(1),
  headerBase64: z.string().nullable(),
  ocrText: z.string().max(100000),
});

const InvoiceSchema = z.object({
  numero: z.string(),
  itens: z.array(z.object({ nome: z.string(), quantidade: z.number() })),
});

type InvoiceAiResult = z.infer<typeof InvoiceSchema>;
type InvoiceAiResponse = InvoiceAiResult & { analysis: "items_found" | "no_items" };

function normalizeResult(value: InvoiceAiResult): InvoiceAiResponse {
  const normalized = {
    numero: value.numero.replace(/\D/g, "").slice(0, 12),
    itens: value.itens
      .map((item) => ({
        nome: item.nome.replace(/\s+/g, " ").trim().slice(0, 240),
        quantidade: Number(item.quantidade),
      }))
      .filter((item) => item.nome.length >= 3 && Number.isFinite(item.quantidade) && item.quantidade > 0 && item.quantidade <= 100000)
      .slice(0, 80),
  };
  return { ...normalized, analysis: normalized.itens.length > 0 ? "items_found" : "no_items" };
}

function messageFromError(error: unknown) {
  const candidate = error as { statusCode?: number; status?: number; message?: string };
  const status = candidate?.statusCode ?? candidate?.status;
  if (status === 402) return candidate.message || "Os créditos de IA acabaram. Adicione créditos ao workspace para continuar.";
  if (status === 403) return candidate.message || "O uso de IA está bloqueado nas configurações do workspace.";
  if (status === 429) return "A leitura por IA está temporariamente sobrecarregada. Tente novamente em alguns instantes.";
  if (status === 400) return candidate.message || "A IA não conseguiu processar este arquivo. Confira o formato e tente outra imagem.";
  if (status === 401) return "A leitura por IA não está configurada corretamente.";
  return "A análise inteligente não conseguiu concluir a leitura. O texto identificado foi preservado; tente novamente.";
}

function logSafeAiFailure(error: unknown) {
  const candidate = error as { name?: string; statusCode?: number; status?: number; cause?: { name?: string } };
  console.error("Falha na extração da nota por IA", {
    name: candidate?.name ?? "UnknownError",
    status: candidate?.statusCode ?? candidate?.status ?? null,
    cause: candidate?.cause?.name ?? null,
  });
}

export const extractInvoiceWithAi = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const approximateBytes = Math.floor((data.base64.length * 3) / 4);
    if (approximateBytes > MAX_FILE_BYTES) throw new Error("O arquivo excede o limite de 20 MB.");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("A leitura por IA não está configurada corretamente.");

    const { createInvoiceAiProvider } = await import("./ai-gateway.server");
    const lovable = createInvoiceAiProvider(apiKey);
    const attachment = data.mediaType === "application/pdf"
      ? { type: "file" as const, data: data.base64, mediaType: data.mediaType, filename: data.fileName }
      : { type: "image" as const, image: new URL(`data:${data.mediaType};base64,${data.base64}`), mediaType: data.mediaType };
    const headerAttachment = data.headerBase64 && data.mediaType !== "application/pdf"
      ? { type: "image" as const, image: new URL(`data:image/jpeg;base64,${data.headerBase64}`), mediaType: "image/jpeg" as const }
      : null;

    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        maxRetries: 0,
        output: Output.object({ schema: InvoiceSchema }),
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Leia esta nota fiscal brasileira usando em conjunto o documento e o texto de OCR abaixo. O OCR pode conter erros de quebra de linha e caracteres; mesmo assim, use as linhas próximas aos cabeçalhos de produto, descrição e quantidade como pistas. Extraia o número da nota (não a chave de acesso, série, pedido ou protocolo) e todos os produtos da tabela, com descrição completa e quantidade. Ignore emitente, destinatário, impostos, frete, totais e textos fora da tabela. Não trate textos do cabeçalho como produtos. Se um dado não estiver legível, use string vazia ou lista vazia. Retorne no máximo 80 itens.\n\nTEXTO IDENTIFICADO PELO OCR:\n${data.ocrText || "(OCR sem texto legível; analise somente o documento.)"}`,
            },
            attachment,
            ...(headerAttachment ? [headerAttachment] : []),
          ],
        }],
        providerOptions: {
          openai: {
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            store: false,
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      return normalizeResult(await result.output);
    } catch (error) {
      logSafeAiFailure(error);
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("A análise inteligente recebeu o documento, mas não conseguiu organizar os dados. O texto identificado foi preservado.");
      }
      if (NoOutputGeneratedError.isInstance(error)) {
        throw new Error("A análise inteligente não produziu uma resposta utilizável. O texto identificado foi preservado; tente novamente.");
      }
      throw new Error(messageFromError(error));
    }
  });