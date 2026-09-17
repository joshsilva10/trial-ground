import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Download, FilePlus2, Paperclip, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { EmptyState, Field, Panel, btnOutline, btnPrimary, inputClass } from "@/components/Ui";
import { PERMISSOES, formatBRL, formatData, useApp } from "@/lib/store";
import type { Contract } from "@/lib/types";

export const Route = createFileRoute("/contratos")({
  head: () => ({
    meta: [
      { title: "Contratos | Sistema Administrativo" },
      {
        name: "description",
        content: "Cadastre contratos administrativos, consulte vigências, anexe documentos e gere versões para impressão.",
      },
      { property: "og:title", content: "Contratos | Sistema Administrativo" },
      { property: "og:description", content: "Gestão de contratos administrativos e documentos." },
    ],
  }),
  component: ContratosPage,
});

const PAGINA = 6;

function ContratosPage() {
  const { contracts, addContract, attachContractFile } = useApp();
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [selecionado, setSelecionado] = useState<Contract | null>(null);
  const [novo, setNovo] = useState(false);
  const [numero, setNumero] = useState("");
  const [objeto, setObjeto] = useState("");
  const [fornecedor, setFornecedor] = useState("");
  const [valor, setValor] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return contracts.filter(
      (c) =>
        !termo ||
        c.numero.toLowerCase().includes(termo) ||
        c.objeto.toLowerCase().includes(termo) ||
        c.fornecedor.toLowerCase().includes(termo),
    );
  }, [contracts, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * PAGINA, paginaAtual * PAGINA);
  const atual = selecionado ? contracts.find((c) => c.id === selecionado.id) ?? selecionado : null;

  function gerarDocumento(c: Contract) {
    const conteudo = `CONTRATO ${c.numero}\n\nOBJETO\n${c.objeto}\n\nCONTRATADA\n${c.fornecedor}\n\nVALOR\n${formatBRL(c.valorCentavos)}\n\nVIGÊNCIA\n${formatData(c.inicio)} a ${formatData(c.fim)}\n\nDocumento gerado no ambiente de validação.`;
    const blob = new Blob([conteudo], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${c.numero.replaceAll("/", "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Documento gerado para download");
  }

  return (
    <AppLayout
      titulo="Contratos"
      descricao="Registro, documentos e geração para impressão"
      requer={PERMISSOES["contratos"]}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Contratos registrados"
          action={
            <button type="button" className={btnPrimary} onClick={() => setNovo(true)}>
              <FilePlus2 className="size-4" aria-hidden /> Novo contrato
            </button>
          }
        >
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              className={`${inputClass} pl-9`}
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              placeholder="Buscar por número, objeto ou fornecedor"
              aria-label="Buscar contratos"
            />
          </div>

          {visiveis.length === 0 ? (
            <EmptyState title="Nenhum contrato encontrado" description="Ajuste a busca ou registre um contrato." />
          ) : (
            <ul className="divide-y divide-border">
              {visiveis.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{c.numero}</p>
                    <p className="truncate text-sm text-muted-foreground">{c.objeto}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.fornecedor} · até {formatData(c.fim)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={
                        c.situacao === "vigente"
                          ? "rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success-strong"
                          : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {c.situacao === "vigente" ? "Vigente" : "Encerrado"}
                    </span>
                    <button type="button" className={btnOutline} onClick={() => setSelecionado(c)}>
                      Detalhes
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filtrados.length} contrato(s) · página {paginaAtual} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button className={btnOutline} disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>
                Anterior
              </button>
              <button className={btnOutline} disabled={paginaAtual === totalPaginas} onClick={() => setPagina(paginaAtual + 1)}>
                Próxima
              </button>
            </div>
          </div>
        </Panel>

        <Panel title={novo ? "Novo contrato" : atual ? atual.numero : "Detalhes do contrato"}>
          {novo ? (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                const valorNormalizado = valor.replace(/\./g, "").replace(",", ".");
                addContract({
                  numero,
                  objeto,
                  fornecedor,
                  valorCentavos: Math.round(Number(valorNormalizado) * 100),
                  inicio,
                  fim,
                  situacao: new Date(fim) >= new Date() ? "vigente" : "encerrado",
                  anexos: [],
                });
                setNumero("");
                setObjeto("");
                setFornecedor("");
                setValor("");
                setInicio("");
                setFim("");
                setNovo(false);
                toast.success("Contrato registrado");
              }}
            >
              <Field label="Número do contrato">
                <input className={inputClass} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="CT-2026/001" required />
              </Field>
              <Field label="Objeto">
                <textarea className={`${inputClass} min-h-20`} value={objeto} onChange={(e) => setObjeto(e.target.value)} required />
              </Field>
              <Field label="Fornecedor">
                <input className={inputClass} value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} required />
              </Field>
              <Field label="Valor (R$)">
                <input className={inputClass} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="10000,00" required />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Início">
                  <input className={inputClass} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
                </Field>
                <Field label="Fim">
                  <input className={inputClass} type="date" min={inicio} value={fim} onChange={(e) => setFim(e.target.value)} required />
                </Field>
              </div>
              <div className="flex gap-2">
                <button type="submit" className={btnPrimary}>Salvar contrato</button>
                <button type="button" className={btnOutline} onClick={() => setNovo(false)}>Cancelar</button>
              </div>
            </form>
          ) : atual ? (
            <div className="space-y-4">
              <dl className="space-y-2 text-sm">
                <div><dt className="text-muted-foreground">Objeto</dt><dd className="mt-0.5 text-foreground">{atual.objeto}</dd></div>
                <div><dt className="text-muted-foreground">Fornecedor</dt><dd className="mt-0.5 text-foreground">{atual.fornecedor}</dd></div>
                <div><dt className="text-muted-foreground">Valor</dt><dd className="mt-0.5 font-medium text-foreground">{formatBRL(atual.valorCentavos)}</dd></div>
                <div><dt className="text-muted-foreground">Vigência</dt><dd className="mt-0.5 text-foreground">{formatData(atual.inicio)} a {formatData(atual.fim)}</dd></div>
              </dl>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Documentos anexados</p>
                {atual.anexos.length ? (
                  <ul className="space-y-2">
                    {atual.anexos.map((a, i) => (
                      <li key={`${a.nome}-${i}`} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                        <Paperclip className="size-4 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 truncate text-foreground">{a.nome}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{Math.max(1, Math.round(a.tamanho / 1024))} KB</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum documento anexado.</p>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error("O arquivo deve ter no máximo 10 MB.");
                    return;
                  }
                  attachContractFile(atual.id, { nome: file.name, tamanho: file.size });
                  toast.success("Documento anexado à sessão");
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnOutline} onClick={() => fileRef.current?.click()}>
                  <Paperclip className="size-4" aria-hidden /> Anexar
                </button>
                <button type="button" className={btnOutline} onClick={() => gerarDocumento(atual)}>
                  <Download className="size-4" aria-hidden /> Gerar documento
                </button>
                <button type="button" className={btnOutline} onClick={() => window.print()}>
                  <Printer className="size-4" aria-hidden /> Imprimir
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                No protótipo, o documento é gerado como texto para download; a versão final será PDF.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Selecione um contrato ou registre um novo.</p>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}
