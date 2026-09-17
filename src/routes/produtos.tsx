import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Camera, PackagePlus, Search } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { EmptyState, Field, Panel, btnOutline, btnPrimary, inputClass } from "@/components/Ui";
import { PERMISSOES, formatDataHora, useApp } from "@/lib/store";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos e estoque | Sistema Administrativo" },
      {
        name: "description",
        content: "Cadastre produtos, acompanhe saldos e registre entradas por captura de nota fiscal.",
      },
      { property: "og:title", content: "Produtos e estoque | Sistema Administrativo" },
      { property: "og:description", content: "Cadastro de produtos, saldos e entradas de estoque." },
    ],
  }),
  component: ProdutosPage,
});

type LinhaOcr = { nome: string; quantidade: number; produtoId?: string };

const PAGINA = 8;

function ProdutosPage() {
  const { products, movements, addProduct, registerEntry } = useApp();
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [aba, setAba] = useState<"manual" | "ocr">("manual");

  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [quantidade, setQuantidade] = useState("0");
  const [minimo, setMinimo] = useState("0");

  const [arquivo, setArquivo] = useState<string>("");
  const [processando, setProcessando] = useState(false);
  const [linhas, setLinhas] = useState<LinhaOcr[]>([]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return products.filter(
      (p) =>
        !termo ||
        p.nome.toLowerCase().includes(termo) ||
        p.codigo.toLowerCase().includes(termo) ||
        p.categoria.toLowerCase().includes(termo),
    );
  }, [products, busca]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * PAGINA, paginaAtual * PAGINA);

  function simularOcr(fileName: string) {
    setProcessando(true);
    setArquivo(fileName);
    window.setTimeout(() => {
      const base = products.slice(0, 2);
      setLinhas([
        ...base.map((p) => ({ nome: p.nome, quantidade: 10, produtoId: p.id })),
        { nome: "Grampeador metálico 26/6", quantidade: 5 },
      ]);
      setProcessando(false);
      toast.info("Leitura simulada concluída — confira e confirme os itens.");
    }, 900);
  }

  return (
    <AppLayout
      titulo="Produtos e estoque"
      descricao="Cadastro de produtos, saldos e entradas"
      requer={PERMISSOES.estoque}
    >
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Estoque atual">
          <div className="relative mb-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              className={`${inputClass} pl-9`}
              placeholder="Buscar por nome, código ou categoria"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              aria-label="Buscar produtos"
            />
          </div>

          {visiveis.length === 0 ? (
            <EmptyState title="Nenhum produto encontrado" description="Ajuste a busca ou cadastre um novo produto." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">Produto</th>
                    <th className="py-2 pr-3 font-medium">Código</th>
                    <th className="py-2 pr-3 font-medium">Categoria</th>
                    <th className="py-2 pr-3 text-right font-medium">Saldo</th>
                    <th className="py-2 text-right font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visiveis.map((p) => {
                    const situacao =
                      p.quantidade === 0
                        ? { texto: "Ruptura", cor: "text-destructive" }
                        : p.quantidade < p.minimo
                          ? { texto: "Abaixo do mínimo", cor: "text-warning-strong" }
                          : { texto: "Regular", cor: "text-success-strong" };
                    return (
                      <tr key={p.id}>
                        <td className="py-2.5 pr-3 font-medium text-foreground">{p.nome}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{p.codigo}</td>
                        <td className="py-2.5 pr-3 text-muted-foreground">{p.categoria}</td>
                        <td className="py-2.5 pr-3 text-right text-foreground">
                          {p.quantidade} {p.unidade}
                        </td>
                        <td className={`py-2.5 text-right font-medium ${situacao.cor}`}>{situacao.texto}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {filtrados.length} produto(s) · página {paginaAtual} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <button className={btnOutline} disabled={paginaAtual === 1} onClick={() => setPagina(paginaAtual - 1)}>
                Anterior
              </button>
              <button
                className={btnOutline}
                disabled={paginaAtual === totalPaginas}
                onClick={() => setPagina(paginaAtual + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Registrar produto / entrada">
            <div className="mb-4 flex gap-2">
              <button
                className={aba === "manual" ? btnPrimary : btnOutline}
                onClick={() => setAba("manual")}
                type="button"
              >
                <PackagePlus className="size-4" aria-hidden /> Manual
              </button>
              <button
                className={aba === "ocr" ? btnPrimary : btnOutline}
                onClick={() => setAba("ocr")}
                type="button"
              >
                <Camera className="size-4" aria-hidden /> Nota fiscal
              </button>
            </div>

            {aba === "manual" ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  addProduct({
                    nome,
                    codigo: codigo || `GEN-${Math.floor(Math.random() * 900 + 100)}`,
                    categoria: categoria || "A classificar",
                    unidade,
                    quantidade: Number(quantidade) || 0,
                    minimo: Number(minimo) || 0,
                  });
                  toast.success("Produto cadastrado");
                  setNome("");
                  setCodigo("");
                  setCategoria("");
                  setQuantidade("0");
                  setMinimo("0");
                }}
              >
                <Field label="Nome do produto">
                  <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} required />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Código">
                    <input className={inputClass} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
                  </Field>
                  <Field label="Unidade">
                    <input className={inputClass} value={unidade} onChange={(e) => setUnidade(e.target.value)} />
                  </Field>
                </div>
                <Field label="Categoria">
                  <input className={inputClass} value={categoria} onChange={(e) => setCategoria(e.target.value)} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Quantidade inicial">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={quantidade}
                      onChange={(e) => setQuantidade(e.target.value)}
                    />
                  </Field>
                  <Field label="Estoque mínimo">
                    <input
                      className={inputClass}
                      type="number"
                      min={0}
                      value={minimo}
                      onChange={(e) => setMinimo(e.target.value)}
                    />
                  </Field>
                </div>
                <button type="submit" className={`${btnPrimary} w-full`}>
                  Cadastrar produto
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="rounded-md bg-info-soft px-3 py-2 text-xs text-info-strong">
                  Leitura de nota fiscal simulada nesta validação: a captura funciona, mas os dados
                  extraídos são de exemplo e devem ser conferidos antes de confirmar.
                </p>
                <Field label="Capturar ou selecionar a nota fiscal">
                  <input
                    className={inputClass}
                    type="file"
                    accept="image/*,application/pdf"
                    capture="environment"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) simularOcr(f.name);
                    }}
                  />
                </Field>

                {processando ? <p className="text-sm text-muted-foreground">Lendo documento...</p> : null}

                {linhas.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">Documento: {arquivo}</p>
                    {linhas.map((l, i) => (
                      <div key={i} className="grid grid-cols-[1fr_5rem] gap-2">
                        <input
                          className={inputClass}
                          value={l.nome}
                          aria-label={`Item ${i + 1}`}
                          onChange={(e) =>
                            setLinhas((prev) => prev.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)))
                          }
                        />
                        <input
                          className={inputClass}
                          type="number"
                          min={0}
                          value={l.quantidade}
                          aria-label={`Quantidade do item ${i + 1}`}
                          onChange={(e) =>
                            setLinhas((prev) =>
                              prev.map((x, j) => (j === i ? { ...x, quantidade: Number(e.target.value) } : x)),
                            )
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className={`${btnPrimary} w-full`}
                      onClick={() => {
                        registerEntry(linhas, `Nota fiscal ${arquivo}`);
                        setLinhas([]);
                        setArquivo("");
                        toast.success("Entrada registrada e estoque atualizado");
                      }}
                    >
                      Confirmar entrada no estoque
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </Panel>

          <Panel title="Movimentações recentes">
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma movimentação nesta sessão.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {movements.slice(0, 6).map((m) => {
                  const prod = products.find((p) => p.id === m.produtoId);
                  return (
                    <li key={m.id} className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-foreground">{prod?.nome ?? "Produto"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {m.origem} · {formatDataHora(m.data)}
                        </span>
                      </span>
                      <span className={m.tipo === "entrada" ? "text-success-strong" : "text-destructive"}>
                        {m.tipo === "entrada" ? "+" : "-"}
                        {m.quantidade}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </AppLayout>
  );
}
