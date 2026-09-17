import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { EmptyState, Panel, StatCard, StatusBadge } from "@/components/Ui";
import { formatData, podeAcessar, useApp } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel | Estoque, Requisições e Contratos" },
      {
        name: "description",
        content: "Painel inicial com pendências de requisições, saldo de estoque e contratos vigentes.",
      },
      { property: "og:title", content: "Painel | Estoque, Requisições e Contratos" },
      { property: "og:description", content: "Pendências, estoque e contratos do setor administrativo." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { currentUser, products, requisitions, contracts, users } = useApp();
  const role = currentUser?.role;

  const minhas = requisitions.filter((r) => r.solicitanteId === currentUser?.id);
  const pendentes = requisitions.filter((r) => r.status === "pendente");
  const ruptura = products.filter((p) => p.quantidade === 0);
  const abaixoMinimo = products.filter((p) => p.quantidade > 0 && p.quantidade < p.minimo);
  const vigentes = contracts.filter((c) => c.situacao === "vigente");

  const lista = podeAcessar(role, "requisicoesAnalise") ? pendentes : minhas;
  const nomeDe = (id: string) => users.find((u) => u.id === id)?.nome ?? "—";

  return (
    <AppLayout
      titulo={`Olá, ${currentUser?.nome.split(" ")[0] ?? ""}`}
      descricao={`Perfil ativo: ${role ? ROLE_LABEL[role] : ""}`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Minhas requisições" value={minhas.length} hint="Total no histórico" />
        <StatCard
          label="Requisições pendentes"
          value={pendentes.length}
          hint={podeAcessar(role, "requisicoesAnalise") ? "Aguardando sua análise" : "Na fila administrativa"}
        />
        {podeAcessar(role, "estoque") ? (
          <StatCard label="Itens em ruptura" value={ruptura.length} hint={`${abaixoMinimo.length} abaixo do mínimo`} />
        ) : (
          <StatCard label="Produtos disponíveis" value={products.filter((p) => p.quantidade > 0).length} hint="Com saldo em estoque" />
        )}
        {podeAcessar(role, "contratos") ? (
          <StatCard label="Contratos vigentes" value={vigentes.length} hint={`${contracts.length} no total`} />
        ) : (
          <StatCard label="Aprovadas" value={minhas.filter((r) => r.status !== "pendente" && r.status !== "rejeitada").length} hint="Total ou parcial" />
        )}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={podeAcessar(role, "requisicoesAnalise") ? "Requisições aguardando análise" : "Minhas requisições recentes"}
          action={
            <Link to="/requisicoes" className="text-sm font-medium text-primary hover:underline">
              Ver todas
            </Link>
          }
        >
          {lista.length === 0 ? (
            <EmptyState title="Nada por aqui" description="Nenhuma requisição para exibir neste momento." />
          ) : (
            <ul className="divide-y divide-border">
              {lista.slice(0, 6).map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {r.id.toUpperCase()} · {r.itens.length} item(ns)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {nomeDe(r.solicitanteId)} · {formatData(r.data)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <Link
                      to="/requisicoes"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Detalhes
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Atalhos">
            <div className="flex flex-col gap-2">
              <Link to="/nova-requisicao" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                Criar nova requisição
              </Link>
              {podeAcessar(role, "estoque") ? (
                <Link to="/produtos" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  Produtos e estoque
                </Link>
              ) : null}
              {podeAcessar(role, "contratos") ? (
                <Link to="/contratos" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  Contratos
                </Link>
              ) : null}
              {podeAcessar(role, "relatorios") ? (
                <Link to="/relatorios" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                  Relatórios gerenciais
                </Link>
              ) : null}
            </div>
          </Panel>

          {podeAcessar(role, "estoque") ? (
            <Panel title="Atenção no estoque">
              {ruptura.length === 0 && abaixoMinimo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum item crítico.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {[...ruptura, ...abaixoMinimo].slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-foreground">{p.nome}</span>
                      <span className={p.quantidade === 0 ? "text-destructive" : "text-warning-strong"}>
                        {p.quantidade} {p.unidade}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
}
