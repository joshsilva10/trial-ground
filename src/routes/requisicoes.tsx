import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { EmptyState, Field, Panel, StatusBadge, btnOutline, btnPrimary, inputClass } from "@/components/Ui";
import { formatDataHora, podeAcessar, useApp } from "@/lib/store";
import { STATUS_LABEL, type Requisition, type RequisitionStatus } from "@/lib/types";

export const Route = createFileRoute("/requisicoes")({
  head: () => ({
    meta: [
      { title: "Requisições | Sistema Administrativo" },
      {
        name: "description",
        content: "Acompanhe requisições, status e decisões de aprovação total, parcial ou rejeição.",
      },
      { property: "og:title", content: "Requisições | Sistema Administrativo" },
      { property: "og:description", content: "Lista, histórico e análise de requisições de itens." },
    ],
  }),
  component: RequisicoesPage,
});

const PAGINA = 6;

function RequisicoesPage() {
  const { currentUser, users, products, requisitions, decideRequisition } = useApp();
  const podeAnalisar = podeAcessar(currentUser?.role, "requisicoesAnalise");
  const [filtro, setFiltro] = useState<"todas" | RequisitionStatus>("todas");
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState<Requisition | null>(null);
  const [aprovadas, setAprovadas] = useState<Record<string, number>>({});
  const [justificativa, setJustificativa] = useState("");

  const base = useMemo(
    () =>
      requisitions
        .filter((r) => podeAnalisar || r.solicitanteId === currentUser?.id)
        .filter((r) => filtro === "todas" || r.status === filtro)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [requisitions, podeAnalisar, currentUser?.id, filtro],
  );

  const totalPaginas = Math.max(1, Math.ceil(base.length / PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = base.slice((paginaAtual - 1) * PAGINA, paginaAtual * PAGINA);

  const nomeDe = (id: string) => users.find((u) => u.id === id)?.nome ?? "—";
  const prodDe = (id: string) => products.find((p) => p.id === id);
  const podeRevisar = (r: Requisition) =>
    podeAnalisar && ["pendente", "aprovada_parcial", "rejeitada"].includes(r.status);

  function abrir(r: Requisition) {
    setAberta(r);
    setAprovadas(
      Object.fromEntries(
        r.itens.map((i) => [
          i.id,
          i.quantidadeAprovada,
        ]),
      ),
    );
    setJustificativa("");
  }

  function decidir(decisao: RequisitionStatus) {
    if (!aberta) return;
    if (decisao !== "rejeitada") {
      const alguma = aberta.itens.some((i) => (aprovadas[i.id] ?? 0) > i.quantidadeAprovada);
      const todasCheias = aberta.itens.every(
        (i) => (aprovadas[i.id] ?? 0) === i.quantidadeSolicitada,
      );
      if (!alguma) {
        toast.error("Informe ao menos uma nova quantidade para liberar.");
        return;
      }
      if (decisao === "aprovada_total" && !todasCheias) {
        toast.error("Para aprovação total, libere toda a quantidade solicitada.");
        return;
      }
    }
    let resultado;
    if (decisao === "aprovada_total") {
      resultado = decideRequisition(
        aberta.id,
        decisao,
        Object.fromEntries(aberta.itens.map((i) => [i.id, i.quantidadeSolicitada])),
        justificativa,
      );
    } else {
      resultado = decideRequisition(aberta.id, decisao, aprovadas, justificativa);
    }
    if (!resultado.ok) {
      toast.error(resultado.erro ?? "Não foi possível registrar a decisão.");
      return;
    }
    toast.success(decisao === "rejeitada" ? "Recusa registrada" : "Liberação registrada");
    setAberta(null);
  }

  return (
    <AppLayout
      titulo="Requisições"
      descricao={podeAnalisar ? "Lista completa com ações de análise" : "Seu histórico de requisições"}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title={`${base.length} requisição(ões)`}>
          <div className="mb-4 flex flex-wrap gap-2">
            {(["todas", "pendente", "aprovada_total", "aprovada_parcial", "rejeitada"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFiltro(f);
                  setPagina(1);
                }}
                className={
                  filtro === f
                    ? "rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                    : "rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }
              >
                {f === "todas" ? "Todas" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>

          {visiveis.length === 0 ? (
            <EmptyState title="Nenhuma requisição" description="Nada encontrado para o filtro selecionado." />
          ) : (
            <ul className="divide-y divide-border">
              {visiveis.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.id.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {nomeDe(r.solicitanteId)} · {formatDataHora(r.data)} · {r.itens.length} item(ns)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <button type="button" className={btnOutline} onClick={() => abrir(r)}>
                      {podeRevisar(r) ? (r.status === "pendente" ? "Analisar" : "Revisar") : "Detalhes"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Página {paginaAtual} de {totalPaginas}
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

        <Panel title={aberta ? `Requisição ${aberta.id.toUpperCase()}` : "Detalhes"}>
          {!aberta ? (
            <p className="text-sm text-muted-foreground">
              Selecione uma requisição na lista para ver os itens e a decisão registrada.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Solicitante: <span className="text-foreground">{nomeDe(aberta.solicitanteId)}</span>
                </p>
                <p className="text-muted-foreground">
                  Data: <span className="text-foreground">{formatDataHora(aberta.data)}</span>
                </p>
                <div className="pt-1">
                  <StatusBadge status={aberta.status} />
                </div>
                {aberta.observacao ? (
                  <p className="pt-2 text-muted-foreground">Observação: {aberta.observacao}</p>
                ) : null}
              </div>

              <div className="space-y-3">
                {aberta.itens.map((i) => {
                  const p = i.produtoId ? prodDe(i.produtoId) : undefined;
                  const nome = p?.nome ?? i.nomeAvulso ?? "Produto não informado";
                  const unidade = p?.unidade ?? i.unidadeAvulsa ?? "un";
                  const editavel = podeRevisar(aberta);
                  const restante = i.quantidadeSolicitada - i.quantidadeAprovada;
                  return (
                    <div key={i.id} className="rounded-md border border-border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{nome}</p>
                        {!p ? <span className="rounded-full bg-warning-soft px-2 py-1 text-xs font-medium text-warning-strong">Não cadastrado</span> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Solicitado {i.quantidadeSolicitada} {unidade} · liberado {i.quantidadeAprovada} · falta {restante}
                        {p ? ` · saldo ${p.quantidade}` : " · sem baixa automática no estoque"}
                        {p?.quantidade === 0 ? " (ruptura)" : ""}
                      </p>
                      {editavel ? (
                        <div className="mt-2">
                          <Field label="Total a liberar">
                            <input
                              className={inputClass}
                              type="number"
                              min={i.quantidadeAprovada}
                              max={i.quantidadeSolicitada}
                              value={aprovadas[i.id] ?? i.quantidadeAprovada}
                              onChange={(e) =>
                                setAprovadas((prev) => ({
                                  ...prev,
                                  [i.id]: Math.max(
                                    i.quantidadeAprovada,
                                    Math.min(i.quantidadeSolicitada, Number(e.target.value) || 0),
                                  ),
                                }))
                              }
                            />
                          </Field>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-foreground">
                          Liberado: {i.quantidadeAprovada} {unidade}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {podeRevisar(aberta) ? (
                <div className="space-y-3">
                  <Field label="Justificativa da decisão ou complemento">
                    <textarea
                      className={`${inputClass} min-h-20`}
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={btnPrimary} onClick={() => decidir("aprovada_total")}>
                      Liberar tudo
                    </button>
                    <button type="button" className={btnOutline} onClick={() => decidir("aprovada_parcial")}>
                      Salvar liberação
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
                      onClick={() => decidir("rejeitada")}
                    >
                      {aberta.status === "rejeitada" ? "Manter recusada" : "Recusar restante"}
                    </button>
                  </div>
                </div>
              ) : aberta.analises.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aguardando análise da equipe administrativa.</p>
              ) : null}

              {aberta.analises.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Histórico de decisões</p>
                  {[...aberta.analises].reverse().map((analise, indice) => {
                    const totalComplementado = analise.complementos.reduce((soma, item) => soma + item.quantidade, 0);
                    return (
                      <div key={`${analise.data}-${indice}`} className="rounded-md bg-muted p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{STATUS_LABEL[analise.decisao]}</span>
                          <span className="text-xs text-muted-foreground">{formatDataHora(analise.data)}</span>
                        </div>
                        <p className="mt-1 text-muted-foreground">{nomeDe(analise.analistaId)}</p>
                        {totalComplementado > 0 ? (
                          <p className="mt-1 text-muted-foreground">Complemento liberado: {totalComplementado} unidade(s)</p>
                        ) : null}
                        {analise.justificativa ? <p className="mt-1 text-muted-foreground">{analise.justificativa}</p> : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </AppLayout>
  );
}
