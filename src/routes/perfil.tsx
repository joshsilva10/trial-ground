import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Field, Panel, btnPrimary, inputClass } from "@/components/Ui";
import { useApp } from "@/lib/store";
import { ROLE_LABEL } from "@/lib/types";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | Estoque, Requisições e Contratos" },
      { name: "description", content: "Consulte e atualize seus dados de contato e veja seu perfil de acesso." },
      { property: "og:title", content: "Meu perfil | Estoque, Requisições e Contratos" },
      { property: "og:description", content: "Dados do usuário e perfil de acesso no sistema." },
    ],
  }),
  component: PerfilPage,
});

function PerfilPage() {
  const { currentUser, updateProfile, requisitions } = useApp();
  const [nome, setNome] = useState(currentUser?.nome ?? "");
  const [setor, setSetor] = useState(currentUser?.setor ?? "");
  const [telefone, setTelefone] = useState(currentUser?.telefone ?? "");

  const minhas = requisitions.filter((r) => r.solicitanteId === currentUser?.id);

  return (
    <AppLayout titulo="Meu perfil" descricao="Dados do usuário e perfil de acesso">
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Dados cadastrais">
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              updateProfile({ nome, setor, telefone });
              toast.success("Perfil atualizado");
            }}
          >
            <Field label="Nome completo">
              <input className={inputClass} value={nome} onChange={(e) => setNome(e.target.value)} required />
            </Field>
            <Field label="E-mail" hint="Alteração de e-mail não disponível no protótipo.">
              <input className={inputClass} value={currentUser?.email ?? ""} disabled />
            </Field>
            <Field label="Setor">
              <input className={inputClass} value={setor} onChange={(e) => setSetor(e.target.value)} />
            </Field>
            <Field label="Telefone">
              <input className={inputClass} value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <button type="submit" className={btnPrimary}>
                Salvar alterações
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Perfil de acesso">
          <p className="text-sm font-medium text-foreground">
            {currentUser ? ROLE_LABEL[currentUser.role] : ""}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            As telas e ações disponíveis são definidas por este perfil.
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Requisições criadas</dt>
              <dd className="font-medium text-foreground">{minhas.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pendentes</dt>
              <dd className="font-medium text-foreground">
                {minhas.filter((r) => r.status === "pendente").length}
              </dd>
            </div>
          </dl>
        </Panel>
      </div>
    </AppLayout>
  );
}
