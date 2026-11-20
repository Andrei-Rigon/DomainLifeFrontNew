import { api, downloadFile, qs } from './client';

// ---------------------------------------------------------------- categorias
export type CategoryKind = 'despesa' | 'receita' | 'ambos';

export interface Category {
  id: number;
  nome: string;
  tipo: CategoryKind;
  cor: string | null;
  icone: string | null;
}

export interface CategoryPayload {
  nome: string;
  tipo?: CategoryKind;
  cor?: string;
}

export const listCategories = () => api.get<Category[]>('/categorias-financeiras?limit=200');
export const createCategory = (p: CategoryPayload) => api.post<Category>('/categorias-financeiras', p);
export const updateCategory = (id: number, p: Partial<CategoryPayload>) =>
  api.patch<Category>(`/categorias-financeiras/${id}`, p);
export const deleteCategory = (id: number) => api.delete<void>(`/categorias-financeiras/${id}`);

// --------------------------------------------------------------- lançamentos
export type EntryKind = 'despesa' | 'receita';
export type PaymentMethod = 'pix' | 'debito' | 'credito' | 'dinheiro' | 'outro';

export interface Entry {
  id: number;
  tipo: EntryKind;
  valor: number;
  id_categoria: number | null;
  categoria?: Category | null;
  descricao: string | null;
  data: string;
  forma_pagamento: PaymentMethod | null;
  origem: string;
  observacao: string | null;
}

export interface EntryPayload {
  tipo: EntryKind;
  valor: number;
  id_categoria?: number;
  descricao?: string;
  data?: string;
  forma_pagamento?: PaymentMethod;
  observacao?: string;
}

export const listEntries = (params: { tipo?: string; id_categoria?: number; start?: string; end?: string }) =>
  api.get<Entry[]>(`/lancamentos${qs({ ...params, limit: 200 })}`);
export const createEntry = (p: EntryPayload) => api.post<Entry>('/lancamentos', p);
export const updateEntry = (id: number, p: Partial<EntryPayload>) => api.patch<Entry>(`/lancamentos/${id}`, p);
export const deleteEntry = (id: number) => api.delete<void>(`/lancamentos/${id}`);

// ------------------------------------------------------------------- resumos
export interface CategoryTotal {
  id_categoria: number | null;
  categoria: string;
  tipo: string;
  total: number;
}

export interface StatusGroup {
  qtd: number;
  total: number;
}

export interface Summary {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
  detalhe_entradas: { lancamentos: number; recebimentos: number };
  detalhe_saidas: { lancamentos: number; parcelas_pagas: number };
  por_categoria: CategoryTotal[];
  parcelas: Record<'Paga' | 'Pendente' | 'Atrasada', StatusGroup>;
  a_receber: Record<'Recebida' | 'Pendente' | 'Atrasada', StatusGroup>;
  comparacao: { mes: string; entradas: number; saidas: number; saldo: number; variacao_saidas_pct: number | null };
}

export interface Balance {
  ate: string;
  saldo_inicial: number;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface EvolutionPoint {
  mes: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export const getSummary = (mes: string) => api.get<Summary>(`/financeiro/resumo${qs({ mes })}`);
export const getBalance = (ate?: string) => api.get<Balance>(`/financeiro/saldo${qs({ ate })}`);
export const getEvolution = (meses = 6) => api.get<EvolutionPoint[]>(`/financeiro/evolucao${qs({ meses })}`);
export const exportCsv = (start: string, end: string) =>
  downloadFile(`/financeiro/exportar${qs({ start, end, formato: 'csv' })}`, `financeiro_${start}_${end}.csv`);

// ---------------------------------------------------------- a pagar (parcelas)
export type InstallmentStatus = 'Pendente' | 'Paga' | 'Atrasada';

export interface Installment {
  id: number;
  id_count: number;
  descricao: string | null;
  numero_parcela: number | null;
  valor_parcela: number;
  valor_pago: number | null;
  data_vencimento: string;
  data_pagamento: string | null;
  status: InstallmentStatus;
}

export interface InstallmentPayload {
  id_count: number;
  descricao?: string;
  numero_parcela?: number;
  valor_parcela: number;
  valor_pago?: number;
  data_vencimento: string;
  data_pagamento?: string;
}

export const listInstallments = (params: { status?: string; start?: string; end?: string; id_count?: number }) =>
  api.get<Installment[]>(`/pagar${qs(params)}`);
export const createInstallment = (p: InstallmentPayload) => api.post<Installment>('/pagar', p);
export const updateInstallment = (id: number, p: Partial<InstallmentPayload>) =>
  api.patch<Installment>(`/pagar/${id}`, p);
export const deleteInstallment = (id: number) => api.delete<void>(`/pagar/${id}`);
export const generateInstallments = (p: {
  id_count: number;
  data_primeiro_vencimento: string;
  qtde_parceladas?: number;
  valor_parcela?: number;
}) => api.post<Installment[]>('/pagar/gerar', p);

// -------------------------------------------------------------------- receber
export type ReceivableStatus = 'Pendente' | 'Recebida' | 'Atrasada';

export interface Receivable {
  id: number;
  descricao: string;
  id_categoria: number | null;
  categoria?: Category | null;
  numero_parcela: number | null;
  valor: number;
  valor_recebido: number | null;
  data_vencimento: string;
  data_recebimento: string | null;
  status: ReceivableStatus;
}

export interface ReceivablePayload {
  descricao: string;
  id_categoria?: number;
  valor: number;
  valor_recebido?: number;
  data_vencimento: string;
  data_recebimento?: string;
}

export const listReceivables = (params: { status?: string; start?: string; end?: string }) =>
  api.get<Receivable[]>(`/receber${qs({ ...params, limit: 200 })}`);
export const createReceivable = (p: ReceivablePayload) => api.post<Receivable>('/receber', p);
export const updateReceivable = (id: number, p: Partial<ReceivablePayload>) => api.patch<Receivable>(`/receber/${id}`, p);
export const deleteReceivable = (id: number) => api.delete<void>(`/receber/${id}`);
export const generateReceivables = (p: {
  descricao: string;
  valor: number;
  primeiro_vencimento: string;
  qtde?: number;
  id_categoria?: number;
}) => api.post<Receivable[]>('/receber/gerar', p);

// --------------------------------------------------------------------- perfil
export interface FinanceProfile {
  salario_liquido: number | null;
  saldo_inicial: number;
  dias_trabalhados_mes: number;
  horas_por_dia: number;
}

export const getProfile = () => api.get<FinanceProfile>('/perfil-financeiro');
export const saveProfile = (p: Partial<FinanceProfile>) => api.put<FinanceProfile>('/perfil-financeiro', p);
