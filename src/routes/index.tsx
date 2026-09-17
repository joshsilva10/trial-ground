import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/store";
import { ROLE_LABEL, type Role } from "@/lib/types";
import { Field, btnPrimary, inputClass } from "@/components/Ui";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar | Estoque, Requisições e Contratos" },
      {
        name: "description",
        content:
          "Acesse o sistema interno de estoque, requisições e contratos com o seu perfil de teste.",
      },
      { property: "og:title", content: "Entrar | Estoque, Requisições e Contratos" },
      {
        property: "og:description",
        content: "Acesse o sistema interno de estoque, requisições e contratos.",
      },
    ],
  }),
  component: LoginPage,
});

const CONTAS: { role: Role; email: string; resumo: string }[] = [
  { role: "desenvolvimento", email: "ana.dev@empresa.com", resumo: "Acesso integral" },
  { role: "gestao", email: "carlos.gestao@empresa.com", resumo: "Contratos e relatórios" },
  { role: "operador", email: "beatriz.operacao@empresa.com", resumo: "Estoque e análise" },
  { role: "final", email: "diego.usuario@empresa.com", resumo: "Requisições e histórico" },
];

function LoginPage() {
  const { login, currentUser } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (currentUser) void navigate({ to: "/dashboard" });
  }, [currentUser, navigate]);

  function entrar(mail: string) {
    setErro("");
    setCarregando(true);
    const res = login(mail);
    setCarregando(false);
    if (!res.ok) {
      setErro(res.erro ?? "Não foi possível entrar.");
      return;
    }
    toast.success("Sessão iniciada");
    void navigate({ to: "/dashboard" });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar px-10 py-12 text-sidebar-foreground lg:flex">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-primary">
            Suprimentos
          </p>
          <h1 className="mt-3 max-w-md text-3xl font-semibold leading-tight">
            Estoque, requisições e contratos em um só lugar
          </h1>
          <p className="mt-4 max-w-md text-sm text-sidebar-foreground/80">
            Cadastro de produtos, entrada por nota fiscal, requisições com aprovação total ou
            parcial, contratos com anexos e geração de documento em PDF.
          </p>
        </div>
        <ul className="space-y-2 text-sm text-sidebar-foreground/80">
          <li>• Acesso e telas conforme o perfil do usuário</li>
          <li>• Requisição permitida mesmo com item em ruptura</li>
          <li>• Histórico e trilha das decisões</li>
        </ul>
        <p className="text-xs text-sidebar-foreground/60">
          Protótipo de validação — dados de demonstração mantidos apenas na sessão atual.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-semibold text-foreground">Entrar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe um e-mail de teste. A senha é livre neste protótipo.
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              entrar(email);
            }}
          >
            <Field label="E-mail">
              <input
                className={inputClass}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                required
              />
            </Field>
            <Field label="Senha" hint="Não validada no ambiente de teste.">
              <input
                className={inputClass}
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
              />
            </Field>

            {erro ? (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {erro}
              </p>
            ) : null}

            <button type="submit" className={`${btnPrimary} w-full`} disabled={carregando}>
              {carregando ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Perfis disponíveis para teste
            </p>
            <div className="mt-3 space-y-2">
              {CONTAS.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onClick={() => {
                    setEmail(c.email);
                    entrar(c.email);
                  }}
                  className="flex w-full items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <span>
                    <span className="block text-sm font-medium">{ROLE_LABEL[c.role]}</span>
                    <span className="block text-xs text-muted-foreground">{c.email}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{c.resumo}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
