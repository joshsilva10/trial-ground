import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import {
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  BarChart3,
  UserRound,
} from "lucide-react";
import { PERMISSOES, useApp } from "@/lib/store";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles?: Role[] };

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos e estoque", icon: Boxes, roles: PERMISSOES.estoque },
  { to: "/nova-requisicao", label: "Nova requisição", icon: PlusCircle },
  { to: "/requisicoes", label: "Requisições", icon: ClipboardList },
  { to: "/contratos", label: "Contratos", icon: FileText, roles: PERMISSOES.contratos },
  { to: "/relatorios", label: "Relatórios gerenciais", icon: BarChart3, roles: PERMISSOES.relatorios },
  { to: "/perfil", label: "Meu perfil", icon: UserRound },
];

export function AppLayout({
  children,
  titulo,
  descricao,
  requer,
}: {
  children: ReactNode;
  titulo: string;
  descricao?: string;
  requer?: Role[];
}) {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const semAcesso = !!currentUser && !!requer && !requer.includes(currentUser.role);

  useEffect(() => {
    if (!currentUser) void navigate({ to: "/" });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const itens = NAV.filter((i) => !i.roles || i.roles.includes(currentUser.role));

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-primary">
            Suprimentos
          </p>
          <p className="mt-1 text-lg font-semibold leading-tight">
            Estoque, Requisições e Contratos
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-6">
          {itens.map((item) => {
            const ativo = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/70 lg:block">
          Ambiente de validação — dados em memória, reiniciados ao recarregar a página.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-foreground">{titulo}</h1>
            {descricao ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{currentUser.nome}</p>
              <p className="text-xs text-muted-foreground">{ROLE_LABEL[currentUser.role]}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                logout();
                void navigate({ to: "/" });
              }}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 py-6">
          {semAcesso ? (
            <div className="mx-auto max-w-lg rounded-lg border border-border bg-card p-6 text-center">
              <h2 className="text-lg font-semibold text-card-foreground">Acesso não permitido</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Seu perfil ({ROLE_LABEL[currentUser.role]}) não tem autorização para esta área.
              </p>
              <Link
                to="/dashboard"
                className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Voltar ao painel
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
