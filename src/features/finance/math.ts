/** Soma valores em reais passando por centavos (evita 0.1 + 0.2 = 0.30000000000000004). */
export function somar(valores: Array<number | null | undefined>): number {
  return valores.reduce<number>((total, v) => total + Math.round((v ?? 0) * 100), 0) / 100;
}

/** Percentual inteiro de `parte` sobre `total` (0 se total for 0). */
export function percentual(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}
