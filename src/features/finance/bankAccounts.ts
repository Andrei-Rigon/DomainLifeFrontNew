import type { BankAccountKind } from '../../api/finance';

export const BANK_KIND_LABEL: Record<BankAccountKind, string> = {
  corrente: 'Conta corrente',
  investimento: 'Investimento',
  cartao: 'Cartão de crédito',
};

const LAST_ACCOUNT_KEY = 'dl.ultimaContaBancaria';

/** Última conta bancária usada (para já vir selecionada). O navegador pode não deixar guardar. */
export function lastBankAccount(): string {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY) ?? '';
  } catch {
    return '';
  }
}

export function rememberBankAccount(id: string) {
  try {
    if (id) localStorage.setItem(LAST_ACCOUNT_KEY, id);
  } catch {
    /* sem armazenamento: só não lembra */
  }
}
