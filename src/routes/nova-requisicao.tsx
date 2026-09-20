import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { EmptyState, Field, Panel, btnOutline, btnPrimary, inputClass } from "@/components/Ui";
import { useApp } from "@/lib/store";

type DraftItem = {
  id: string;
  produtoId?: string;
  nomeAvulso?: string;
  unidadeAvulsa?: string;
  quantidadeSolicitada: number;
};

export const Route = createFileRoute("/nova-requisicao")({
  head: () => ({
    meta: [
      { title: "Nova requisição | Sistema Administrativo" },
      {
        name: "description",
        content: "Selecione itens, informe quantidades e registre sua requisição, mesmo em ruptura de estoque.",
      },
      { property: "og:title", content: "Nova requisição | Sistema Administrativo" },
      { property: "og:description", content: "Registro de requisição de itens de estoque." },
    ],
  }),
  component: NovaRequisicaoPage,
});

function NovaRequisicaoPage() {
  const { products, createRequisition } = useApp();
  const navigate = useNavigate();
  const [itens, setItens] = useState<DraftItem[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [qtd, setQtd] = useState("1");
  const [observacao, setObservacao] = useState("");
  const [modoAvulso, setModoAvulso] = useState(false);
  const [nomeAvulso, setNomeAvulso] = useState("");
  const [unidadeAvulsa, setUnidadeAvulsa] = useState("un");

  const produto = products.find((p) => p.id === produtoId);

  function adicionar() {
    if (!produtoId) {
      toast.error("Selecione um produto.");
      return;
    }
    const quantidade = Number(qtd);
    if (!quantidade || quantidade <= 0) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    setItens((prev) => {
      const existente = prev.find((i) => i.produtoId === produtoId);
      if (existente) {
        return prev.map((i) =>
          i.produtoId === produtoId ? { ...i, quantidadeSolicitada: i.quantidadeSolicitada + quantidade } : i,
        );
      }
      return [...prev, { id: produtoId, produtoId, quantidadeSolicitada: quantidade }];
    });
    setProdutoId("");
    setQtd("1");
  }

  function adicionarAvulso() {
    const nome = nomeAvulso.trim();
    const unidade = unidadeAvulsa.trim();
    const quantidade = Number(qtd);
    if (nome.length < 3) {
      toast.error("Informe o nome do produto.");
      return;
    }
    if (!unidade) {
      toast.error("Informe a unidade.");
      return;
    }
    if (!quantidade || quantidade <= 0) {
      toast.error("Informe uma quantidade maior que zero.");
      return;
    }
    setItens((prev) => [
      ...prev,
      { id: `avulso-${Date.now()}`, nomeAvulso: nome, unidadeAvulsa: unidade, quantidadeSolicitada: quantidade },
    ]);
    setNomeAvulso("");
    setUnidadeAvulsa("un");
    setQtd("1");
  }

  return (
    <AppLayout titulo="Nova requisição" descricao="Disponível para todos os perfis">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Itens da requisição">
          <div className="mb-4 flex gap-2" role="group" aria-label="Tipo de produto">
            <button type="button" className={modoAvulso ? btnOutline : btnPrimary} onClick={() => setModoAvulso(false)}>
              Produto cadastrado
            </button>
            <button type="button" className={modoAvulso ? btnPrimary : btnOutline} onClick={() => setModoAvulso(true)}>
              Produto não cadastrado
            </button>
          </div>

          <div className={`grid gap-3 ${modoAvulso ? "sm:grid-cols-[1fr_7rem_7rem_auto]" : "sm:grid-cols-[1fr_7rem_auto]"} sm:items-end`}>
            {modoAvulso ? (
              <>
                <Field label="Nome do produto">
                  <input className={inputClass} value={nomeAvulso} maxLength={120} onChange={(e) => setNomeAvulso(e.target.value)} />
                </Field>
                <Field label="Unidade">
                  <input className={inputClass} value={unidadeAvulsa} maxLength={20} onChange={(e) => setUnidadeAvulsa(e.target.value)} />
                </Field>
              </>
            ) : (
              <Field label="Produto">
                <select className={inputClass} value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
                  <option value="">Selecione um item</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome} — saldo {p.quantidade} {p.unidade}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Quantidade">
              <input
                className={inputClass}
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </Field>
            <button type="button" className={btnOutline} onClick={modoAvulso ? adicionarAvulso : adicionar}>
              Adicionar
            </button>
          </div>

          {produto && produto.quantidade === 0 ? (
            <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-strong">
              Item em ruptura de estoque. A requisição pode ser registrada e será avaliada pela equipe
              administrativa.
            </p>
          ) : null}

          <div className="mt-5">
            {itens.length === 0 ? (
              <EmptyState title="Nenhum item adicionado" description="Selecione um produto e informe a quantidade." />
            ) : (
              <ul className="divide-y divide-border">
                {itens.map((i) => {
                  const p = i.produtoId ? products.find((x) => x.id === i.produtoId) : undefined;
                  const nome = p?.nome ?? i.nomeAvulso ?? "Produto não informado";
                  const unidade = p?.unidade ?? i.unidadeAvulsa ?? "un";
                  return (
                    <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Solicitado: {i.quantidadeSolicitada} {unidade}
                          {p ? ` · saldo atual ${p.quantidade}` : " · produto não cadastrado"}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remover ${nome}`}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                        onClick={() => setItens((prev) => prev.filter((x) => x.id !== i.id))}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Panel>

        <Panel title="Registro">
          <Field label="Observação (opcional)">
            <textarea
              className={`${inputClass} min-h-28`}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Justificativa, setor de destino, urgência..."
            />
          </Field>
          <button
            type="button"
            className={`${btnPrimary} mt-4 w-full`}
            disabled={itens.length === 0}
            onClick={() => {
              const id = createRequisition(itens.map(({ id: _id, ...item }) => item), observacao);
              if (!id) return;
              toast.success("Requisição registrada como pendente");
              void navigate({ to: "/requisicoes" });
            }}
          >
            Registrar requisição
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            A requisição fica pendente até a análise da equipe administrativa, que pode aprovar de
            forma total, parcial ou rejeitar.
          </p>
        </Panel>
      </div>
    </AppLayout>
  );
}
