import { createServerFn } from "@tanstack/react-start";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

const InputSchema = z.object({
  fileName: z.string().trim().min(1).max(180),
  mediaType: z.enum(acceptedTypes),
  base64: z.string().min(1),
});

const InvoiceSchema = z.object({
  numero: z.string(),
  itens: z.array(z.object({ nome: z.string(), quantidade: z.number() })),
});

type InvoiceAiResult = z.infer<typeof InvoiceSchema>;

function normalizeResult(value: InvoiceAiResult): InvoiceAiResult {
  return {
    numero: value.numero.replace(/\D/g, "").slice(0, 12),
    itens: value.itens
      .map((item) => ({
        nome: item.nome.replace(/\s+/g, " ").trim().slice(0, 240),
        quantidade: Number(item.quantidade),
      }))
      .filter((item) => item.nome.length >= 3 && Number.isFinite(item.quantidade) && item.quantidade > 0 && item.quantidade <= 100000)
      .slice(0, 80),
  };
}

function messageFromError(error: unknown) {
  const candidate = error as { statusCode?: number; status?: number; message?: string };
  const status = candidate?.statusCode ?? candidate?.status;
  if (status === 402) return candidate.message || "Os créditos de IA acabaram. Adicione créditos ao workspace para continuar.";
  if (status === 403) return candidate.message || "O uso de IA está bloqueado nas configurações do workspace.";
  if (status === 429) return "A leitura por IA está temporariamente sobrecarregada. Tente novamente em alguns instantes.";
  if (status === 400) return candidate.message || "A IA não conseguiu processar este arquivo. Confira o formato e tente outra imagem.";
  if (status === 401) return "A leitura por IA não está configurada corretamente.";
  return candidate?.message || "A leitura por IA não está disponível agora.";
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
    const dataUrl = `data:${data.mediaType};base64,${data.base64}`;
    const attachment = data.mediaType === "application/pdf"
      ? { type: "file" as const, data: dataUrl, mediaType: data.mediaType, filename: data.fileName }
      : { type: "image" as const, image: dataUrl, mediaType: data.mediaType };

    try {
      const result = streamText({
        model: lovable.responses("openai/gpt-6-astra"),
        maxRetries: 2,
        output: Output.object({ schema: InvoiceSchema }),
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: "Leia esta nota fiscal brasileira. Extraia o número da nota (não a chave de acesso, série, pedido ou protocolo) e todos os produtos da tabela, com descrição completa e quantidade. Ignore emitente, destinatário, impostos, frete, totais e textos fora da tabela. Se um dado não estiver legível, use string vazia ou lista vazia. Retorne no máximo 80 itens.",
            },
            attachment,
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
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("A IA leu o documento, mas não conseguiu organizar os dados. Tente uma foto mais nítida.");
      }
      throw new Error(messageFromError(error));
    }
  });