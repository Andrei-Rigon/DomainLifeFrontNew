import { addMonths, endOfMonth, format, parse, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** 1234.5 -> "R$ 1.234,50" */
export function formatMoney(value: number | null | undefined): string {
  return brl.format(value ?? 0);
}

/** Lê o que o usuário digitou: "50", "50,5", "1.234,56". Devolve undefined se vazio e NaN se inválido. */
export function parseMoneyInput(text: string): number | undefined {
  const clean = text.replace(/R\$|\s/g, '');
  if (!clean) return undefined;
  const normalized = clean.includes(',') ? clean.replace(/\./g, '').replace(',', '.') : clean;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : Number.NaN;
}

/** Dinheiro -> texto de campo com 2 casas: 23.9 -> "23,90" (o inverso de parseMoneyInput). */
export function moneyToInput(value: number | string): string {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(2).replace('.', ',') : String(value);
}

export function hasTooManyDecimals(value: number): boolean {
  return Math.round(value * 100) / 100 !== value;
}

/** Data local de hoje (YYYY-MM-DD). */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Mês (YYYY-MM) da data local de hoje. */
export function currentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

function monthDate(month: string): Date {
  return parse(`${month}-01`, 'yyyy-MM-dd', new Date());
}

export function shiftMonth(month: string, delta: number): string {
  return format(addMonths(monthDate(month), delta), 'yyyy-MM');
}

export function monthRange(month: string): { start: string; end: string } {
  const date = monthDate(month);
  return { start: format(startOfMonth(date), 'yyyy-MM-dd'), end: format(endOfMonth(date), 'yyyy-MM-dd') };
}

/** "2026-11" -> "novembro de 2026" */
export function monthLabel(month: string): string {
  return format(monthDate(month), "MMMM 'de' yyyy", { locale: ptBR });
}

/** "2026-11" -> "Novembro de 2026" (para títulos) */
export function monthTitle(month: string): string {
  const label = monthLabel(month);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "2026-11" -> "nov" */
export function monthShort(month: string): string {
  return format(monthDate(month), 'MMM', { locale: ptBR }).replace('.', '');
}

/** "2026-11-19" -> "19/11/2026" (sem passar por Date, para não sofrer com fuso) */
export function formatDateBR(value: string | null | undefined): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function formatDateShort(value: string): string {
  const [, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}`;
}
