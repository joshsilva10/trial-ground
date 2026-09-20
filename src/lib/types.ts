export type Role = "desenvolvimento" | "gestao" | "operador" | "final";

export const ROLE_LABEL: Record<Role, string> = {
  desenvolvimento: "Desenvolvimento",
  gestao: "Gestão administrativa",
  operador: "Operador administrativo",
  final: "Usuário final",
};

export type User = {
  id: string;
  nome: string;
  email: string;
  role: Role;
  setor: string;
  telefone: string;
};

export type Product = {
  id: string;
  nome: string;
  codigo: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  minimo: number;
};

export type Movement = {
  id: string;
  produtoId: string;
  tipo: "entrada" | "saida";
  quantidade: number;
  origem: string;
  data: string;
};

export type RequisitionStatus = "pendente" | "aprovada_total" | "aprovada_parcial" | "rejeitada";

export const STATUS_LABEL: Record<RequisitionStatus, string> = {
  pendente: "Pendente",
  aprovada_total: "Aprovada total",
  aprovada_parcial: "Aprovada parcial",
  rejeitada: "Rejeitada",
};

export type RequisitionItem = {
  id: string;
  produtoId?: string;
  nomeAvulso?: string;
  unidadeAvulsa?: string;
  quantidadeSolicitada: number;
  quantidadeAprovada: number;
};

export type RequisitionAnalysis = {
  analistaId: string;
  data: string;
  decisao: RequisitionStatus;
  justificativa: string;
  complementos: { itemId: string; quantidade: number }[];
};

export type Requisition = {
  id: string;
  solicitanteId: string;
  data: string;
  itens: RequisitionItem[];
  status: RequisitionStatus;
  observacao: string;
  analises: RequisitionAnalysis[];
};

export type Contract = {
  id: string;
  numero: string;
  objeto: string;
  fornecedor: string;
  valorCentavos: number;
  inicio: string;
  fim: string;
  situacao: "vigente" | "encerrado";
  anexos: { nome: string; tamanho: number }[];
  criadoPor: string;
  criadoEm: string;
};

export type AuditEntry = {
  id: string;
  usuarioId: string;
  acao: string;
  recurso: string;
  data: string;
  resultado: string;
};
