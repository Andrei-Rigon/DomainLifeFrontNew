import { api } from './client';
import type { Summary } from './finance';

export interface Dashboard {
  data: string;
  agenda_proximos_7_dias: { id: number; titulo: string; data_evento: string; hora_evento: string | null; localizacao: string | null }[];
  tarefas_em_andamento: { id: number; titulo: string; prazo: string | null; prioridade: string }[];
  lembretes_hoje: { id: number; texto: string; lembrar_em: string; repetir: string }[];
  financeiro_mes: Summary;
  parcelas_vencendo_7_dias: { id: number; descricao: string | null; valor_parcela: number; data_vencimento: string; status: string }[];
  metas_da_semana: { id: number; titulo: string; concluida: boolean }[];
  ultimo_peso: { data: string; peso_kg: number } | null;
}

export const getDashboard = () => api.get<Dashboard>('/dashboard');
