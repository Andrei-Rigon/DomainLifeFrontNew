import { api } from './client';

export type CountType = 'Recorrente' | 'Conta' | 'Assinatura';

export interface Count {
  id: number;
  nome: string;
  descricao: string | null;
  // A API normaliza dinheiro para número (interceptor normalizar-resposta).
  valor_esperado: number | string | null;
  valor_pago: number | string | null;
  tipo: CountType;
  qtde_parceladas: number | null;
  id_categoria_conta: number | null;
  contabilizar?: boolean; // padrão das parcelas novas (false = paga no cartão, fora do caixa)
  createdAt?: string;
  updatedAt?: string;
}

export interface CountPayload {
  nome: string;
  // null = limpar o campo na edição (a API aceita null nesses campos).
  descricao?: string | null;
  valor_esperado?: number | null;
  valor_pago?: number | null;
  tipo: CountType;
  qtde_parceladas?: number | null;
  contabilizar?: boolean;
}

export function listCounts() {
  return api.get<Count[]>('/counts');
}

export function createCount(payload: CountPayload) {
  return api.post<Count>('/counts', payload);
}

export function updateCount(id: number, payload: Partial<CountPayload>) {
  return api.patch<Count>(`/counts/${id}`, payload);
}

export function deleteCount(id: number) {
  return api.delete<void>(`/counts/${id}`);
}
