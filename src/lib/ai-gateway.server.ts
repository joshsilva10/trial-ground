import { createOpenAI } from "@ai-sdk/openai";

const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createInvoiceAiProvider(apiKey: string) {
  let runId: string | undefined;

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID_HEADER, runId);
      const response = await fetch(input, { ...init, headers });
      runId = response.headers.get(RUN_ID_HEADER)?.trim() || runId;
      return response;
    },
  });

  return provider;
}