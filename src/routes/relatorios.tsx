import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/AppLayout";
import { Panel, StatCard } from "@/components/Ui";
import { PERMISSOES, formatBRL, formatDataHora, useApp } from "@/lib/store";
import { STATUS_LABEL, type RequisitionStatus } from "@/lib/types";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios gerenciais | Sistema Administrativo" },
      {
        name: "description",
        content: "Indicadores de requisições, estoque crítico e contratos para a gestão administrativa.",
      },
      { property: "og:title", content: "Relatórios gerenciais | Sistema Administrativo" },
      { property: "og:description", content: "Indicadores de requisições, estoque e contratos." },
    ],
  }),
  component: RelatoriosPage,
});

const CORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const MARCADORES = ["bg-chart-1", "bg-chart-2", "bg-chart-3", "bg-chart-4"];

function RelatoriosPage() {
  const { requisitions, products, contracts, audit, users } = useApp();

  const porStatus = useMemo(() => {
    const chaves: RequisitionStatus[] = ["pendente", "aprovada_total", "aprovada_parcial", "rejeitada"];
    return chaves.map((k) => ({
      nome: STATUS_LABEL[k],
      valor: requisitions.filter((r) => r.status === k).length,
    }));
  }, [requisitions]);

  const maisSolicitados = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of requisitions) {
      for (const i of r.itens) {
        mapa.set(i.produtoId, (mapa.get(i.produtoId) ?? 0) + i.quantidadeSolicitada);
      }
    }
    return [...mapa.entries()]
      .map(([id, qtd]) => ({ nome: products.find((p) => p.id === id)?.nome ?? "—", qtd }))
      .sort((a, b) => b.qtd - a.qtd)
      .slice(0, 5);
  }, [requisitions, products]);

  const valorVigente = contracts
    .filter((c) => c.situacao === "vigente")
    .reduce((s, c) => s + c.valorCentavos, 0);

  const nomeDe = (id: string) => users.find((u) => u.id === id)?.nome ?? "—";

  return (
    <AppLayout
      titulo="Relatórios gerenciais"
      descricao="Indicadores do MVP — conjunto inicial para validação"
      requer={PERMISSOES["relatorios"]}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Requisições" value={requisitions.length} hint="Total registrado" />
        <StatCard
          label="Pendentes"
          value={requisitions.filter((r) => r.status === "pendente").length}
          hint="Aguardando análise"
        />
        <StatCard label="Itens em ruptura" value={products.filter((p) => p.quantidade === 0).length} hint="Saldo zerado" />
        <StatCard label="Contratos vigentes" value={formatBRL(valorVigente)} hint="Valor somado" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Requisições por situação">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={porStatus} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={90}>
                  {porStatus.map((_, i) => (
                    <Cell key={i} fill={CORES[i % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {porStatus.map((s, i) => (
              <li key={s.nome} className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${MARCADORES[i % MARCADORES.length]}`} />
                <span className="text-muted-foreground">
                  {s.nome}: <span className="text-foreground">{s.valor}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Itens mais solicitados">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maisSolicitados}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="nome" hide />
                <YAxis width={30} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="qtd" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {maisSolicitados.map((m) => (
              <li key={m.nome} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">{m.nome}</span>
                <span className="text-foreground">{m.qtd}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4" title="Trilha de ações desta sessão">
        {audit.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ação registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Usuário</th>
                  <th className="py-2 pr-3 font-medium">Ação</th>
                  <th className="py-2 pr-3 font-medium">Recurso</th>
                  <th className="py-2 pr-3 font-medium">Resultado</th>
                  <th className="py-2 font-medium">Data/hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {audit.slice(0, 12).map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3 text-foreground">{nomeDe(a.usuarioId)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{a.acao}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{a.recurso}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{a.resultado}</td>
                    <td className="py-2 text-muted-foreground">{formatDataHora(a.data)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-4 text-xs text-muted-foreground">
        Ponto em aberto do PRD: indicadores e filtros definitivos da gestão ainda precisam ser definidos.
      </p>
    </AppLayout>
  );
}
