import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type {
  AuditEntry,
  Contract,
  Movement,
  Product,
  Requisition,
  RequisitionStatus,
  Role,
  User,
} from "./types";

/**
 * Protótipo de validação: todo o estado vive em memória (nenhum backend).
 * Ao recarregar a página os dados voltam ao conjunto inicial de demonstração.
 */

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
const hoje = () => new Date().toISOString();

function seedUsers(): User[] {
  return [
    {
      id: "u1",
      nome: "Ana Ribeiro",
      email: "ana.dev@empresa.com",
      role: "desenvolvimento",
      setor: "Tecnologia",
      telefone: "(11) 98888-1010",
    },
    {
      id: "u2",
      nome: "Carlos Menezes",
      email: "carlos.gestao@empresa.com",
      role: "gestao",
      setor: "Gestão administrativa",
      telefone: "(11) 98888-2020",
    },
    {
      id: "u3",
      nome: "Beatriz Souza",
      email: "beatriz.operacao@empresa.com",
      role: "operador",
      setor: "Administrativo",
      telefone: "(11) 98888-3030",
    },
    {
      id: "u4",
      nome: "Diego Alves",
      email: "diego.usuario@empresa.com",
      role: "final",
      setor: "Atendimento",
      telefone: "(11) 98888-4040",
    },
  ];
}

function seedProducts(): Product[] {
  return [
    { id: "p1", nome: "Papel A4 75g (resma)", codigo: "PAP-001", categoria: "Papelaria", unidade: "resma", quantidade: 42, minimo: 20 },
    { id: "p2", nome: "Caneta esferográfica azul", codigo: "PAP-014", categoria: "Papelaria", unidade: "un", quantidade: 8, minimo: 30 },
    { id: "p3", nome: "Toner impressora HP 58A", codigo: "INF-007", categoria: "Informática", unidade: "un", quantidade: 0, minimo: 4 },
    { id: "p4", nome: "Álcool 70% 1L", codigo: "LIM-003", categoria: "Limpeza", unidade: "un", quantidade: 25, minimo: 10 },
    { id: "p5", nome: "Café torrado e moído 500g", codigo: "COP-002", categoria: "Copa", unidade: "pacote", quantidade: 14, minimo: 12 },
  ];
}

function seedRequisitions(): Requisition[] {
  return [
    {
      id: "r1",
      solicitanteId: "u4",
      data: "2026-09-10T13:20:00.000Z",
      itens: [
        { produtoId: "p1", quantidadeSolicitada: 4, quantidadeAprovada: 4 },
        { produtoId: "p2", quantidadeSolicitada: 10, quantidadeAprovada: 4 },
      ],
      observacao: "Reposição do atendimento.",
      status: "aprovada_parcial",
      analise: {
        analistaId: "u3",
        data: "2026-09-11T11:05:00.000Z",
        decisao: "aprovada_parcial",
        justificativa: "Canetas com saldo reduzido; liberada quantidade parcial.",
      },
    },
    {
      id: "r2",
      solicitanteId: "u2",
      data: "2026-09-15T17:40:00.000Z",
      itens: [{ produtoId: "p3", quantidadeSolicitada: 2, quantidadeAprovada: 0 }],
      observacao: "Toner para impressora da diretoria (item em ruptura).",
      status: "pendente",
    },
    {
      id: "r3",
      solicitanteId: "u3",
      data: "2026-09-16T12:00:00.000Z",
      itens: [{ produtoId: "p5", quantidadeSolicitada: 6, quantidadeAprovada: 0 }],
      observacao: "Copa do 3º andar.",
      status: "pendente",
    },
  ];
}

function seedContracts(): Contract[] {
  return [
    {
      id: "c1",
      numero: "CT-2026/014",
      objeto: "Fornecimento de material de escritório",
      fornecedor: "Distribuidora Papel & Cia",
      valorCentavos: 4850000,
      inicio: "2026-03-01",
      fim: "2027-02-28",
      situacao: "vigente",
      anexos: [{ nome: "contrato-assinado.pdf", tamanho: 284000 }],
      criadoPor: "u2",
      criadoEm: "2026-02-20T10:00:00.000Z",
    },
    {
      id: "c2",
      numero: "CT-2025/091",
      objeto: "Manutenção de impressoras e outsourcing de impressão",
      fornecedor: "TecnoPrint Serviços",
      valorCentavos: 12600000,
      inicio: "2025-08-01",
      fim: "2026-07-31",
      situacao: "encerrado",
      anexos: [],
      criadoPor: "u3",
      criadoEm: "2025-07-18T09:30:00.000Z",
    },
  ];
}

type Ctx = {
  users: User[];
  currentUser: User | null;
  products: Product[];
  movements: Movement[];
  requisitions: Requisition[];
  contracts: Contract[];
  audit: AuditEntry[];
  login: (email: string) => { ok: boolean; erro?: string };
  logout: () => void;
  updateProfile: (patch: Partial<Pick<User, "nome" | "setor" | "telefone">>) => void;
  addProduct: (p: Omit<Product, "id">) => void;
  registerEntry: (entries: { produtoId?: string; nome: string; quantidade: number }[], origem: string) => void;
  createRequisition: (
    itens: { produtoId: string; quantidadeSolicitada: number }[],
    observacao: string,
  ) => string;
  decideRequisition: (
    id: string,
    decisao: RequisitionStatus,
    aprovadas: Record<string, number>,
    justificativa: string,
  ) => void;
  addContract: (c: Omit<Contract, "id" | "criadoPor" | "criadoEm">) => void;
  attachContractFile: (id: string, file: { nome: string; tamanho: number }) => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>(seedRequisitions);
  const [contracts, setContracts] = useState<Contract[]>(seedContracts);
  const [audit, setAudit] = useState<AuditEntry[]>([]);

  const registerAudit = useCallback((usuarioId: string, acao: string, recurso: string, resultado: string) => {
    setAudit((prev) => [
      { id: uid("a"), usuarioId, acao, recurso, data: hoje(), resultado },
      ...prev,
    ]);
  }, []);

  const login = useCallback<Ctx["login"]>(
    (email) => {
      const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!user) return { ok: false, erro: "E-mail não encontrado no ambiente de teste." };
      setCurrentUser(user);
      registerAudit(user.id, "login", "sessão", "sucesso");
      return { ok: true };
    },
    [users, registerAudit],
  );

  const logout = useCallback(() => {
    if (currentUser) registerAudit(currentUser.id, "logout", "sessão", "sucesso");
    setCurrentUser(null);
  }, [currentUser, registerAudit]);

  const updateProfile = useCallback<Ctx["updateProfile"]>(
    (patch) => {
      if (!currentUser) return;
      const atualizado = { ...currentUser, ...patch };
      setCurrentUser(atualizado);
      setUsers((prev) => prev.map((u) => (u.id === atualizado.id ? atualizado : u)));
      registerAudit(atualizado.id, "atualizar", "perfil", "sucesso");
    },
    [currentUser, registerAudit],
  );

  const addProduct = useCallback<Ctx["addProduct"]>(
    (p) => {
      const novo = { ...p, id: uid("p") };
      setProducts((prev) => [novo, ...prev]);
      if (currentUser) registerAudit(currentUser.id, "cadastrar", `produto ${novo.nome}`, "sucesso");
    },
    [currentUser, registerAudit],
  );

  const registerEntry = useCallback<Ctx["registerEntry"]>(
    (entries, origem) => {
      const novosMov: Movement[] = [];
      setProducts((prev) => {
        let lista = [...prev];
        for (const e of entries) {
          if (e.quantidade <= 0) continue;
          let alvo = e.produtoId ? lista.find((p) => p.id === e.produtoId) : undefined;
          if (!alvo) {
            alvo = {
              id: uid("p"),
              nome: e.nome,
              codigo: `NF-${Math.floor(Math.random() * 9000 + 1000)}`,
              categoria: "A classificar",
              unidade: "un",
              quantidade: 0,
              minimo: 0,
            };
            lista = [alvo, ...lista];
          }
          const id = alvo.id;
          lista = lista.map((p) => (p.id === id ? { ...p, quantidade: p.quantidade + e.quantidade } : p));
          novosMov.push({
            id: uid("m"),
            produtoId: id,
            tipo: "entrada",
            quantidade: e.quantidade,
            origem,
            data: hoje(),
          });
        }
        return lista;
      });
      setMovements((prev) => [...novosMov, ...prev]);
      if (currentUser) registerAudit(currentUser.id, "entrada de estoque", origem, `${novosMov.length} item(ns)`);
    },
    [currentUser, registerAudit],
  );

  const createRequisition = useCallback<Ctx["createRequisition"]>(
    (itens, observacao) => {
      if (!currentUser) return "";
      const nova: Requisition = {
        id: uid("r"),
        solicitanteId: currentUser.id,
        data: hoje(),
        itens: itens.map((i) => ({ ...i, quantidadeAprovada: 0 })),
        status: "pendente",
        observacao,
      };
      setRequisitions((prev) => [nova, ...prev]);
      registerAudit(currentUser.id, "criar", `requisição ${nova.id}`, "pendente");
      return nova.id;
    },
    [currentUser, registerAudit],
  );

  const decideRequisition = useCallback<Ctx["decideRequisition"]>(
    (id, decisao, aprovadas, justificativa) => {
      if (!currentUser) return;
      let baixas: { produtoId: string; quantidade: number }[] = [];
      setRequisitions((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const itens = r.itens.map((i) => ({
            ...i,
            quantidadeAprovada: decisao === "rejeitada" ? 0 : (aprovadas[i.produtoId] ?? 0),
          }));
          baixas = itens
            .filter((i) => i.quantidadeAprovada > 0)
            .map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidadeAprovada }));
          return {
            ...r,
            itens,
            status: decisao,
            analise: { analistaId: currentUser.id, data: hoje(), decisao, justificativa },
          };
        }),
      );
      if (baixas.length) {
        setProducts((prev) =>
          prev.map((p) => {
            const b = baixas.find((x) => x.produtoId === p.id);
            return b ? { ...p, quantidade: Math.max(0, p.quantidade - b.quantidade) } : p;
          }),
        );
        setMovements((prev) => [
          ...baixas.map((b) => ({
            id: uid("m"),
            produtoId: b.produtoId,
            tipo: "saida" as const,
            quantidade: b.quantidade,
            origem: `Requisição ${id}`,
            data: hoje(),
          })),
          ...prev,
        ]);
      }
      registerAudit(currentUser.id, "analisar", `requisição ${id}`, decisao);
    },
    [currentUser, registerAudit],
  );

  const addContract = useCallback<Ctx["addContract"]>(
    (c) => {
      if (!currentUser) return;
      const novo: Contract = { ...c, id: uid("c"), criadoPor: currentUser.id, criadoEm: hoje() };
      setContracts((prev) => [novo, ...prev]);
      registerAudit(currentUser.id, "cadastrar", `contrato ${novo.numero}`, "sucesso");
    },
    [currentUser, registerAudit],
  );

  const attachContractFile = useCallback<Ctx["attachContractFile"]>(
    (id, file) => {
      setContracts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, anexos: [...c.anexos, file] } : c)),
      );
      if (currentUser) registerAudit(currentUser.id, "anexar documento", `contrato ${id}`, file.nome);
    },
    [currentUser, registerAudit],
  );

  const value = useMemo<Ctx>(
    () => ({
      users,
      currentUser,
      products,
      movements,
      requisitions,
      contracts,
      audit,
      login,
      logout,
      updateProfile,
      addProduct,
      registerEntry,
      createRequisition,
      decideRequisition,
      addContract,
      attachContractFile,
    }),
    [
      users,
      currentUser,
      products,
      movements,
      requisitions,
      contracts,
      audit,
      login,
      logout,
      updateProfile,
      addProduct,
      registerEntry,
      createRequisition,
      decideRequisition,
      addContract,
      attachContractFile,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp deve ser usado dentro de AppProvider");
  return ctx;
}

export const PERMISSOES: Record<"estoque" | "requisicoesAnalise" | "contratos" | "relatorios", Role[]> = {
  estoque: ["desenvolvimento", "operador"],
  requisicoesAnalise: ["desenvolvimento", "operador"],
  contratos: ["desenvolvimento", "gestao", "operador"],
  relatorios: ["desenvolvimento", "gestao"],
};

export function podeAcessar(role: Role | undefined, area: keyof typeof PERMISSOES) {
  return role ? PERMISSOES[area].includes(role) : false;
}

export const formatBRL = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatData = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatDataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
