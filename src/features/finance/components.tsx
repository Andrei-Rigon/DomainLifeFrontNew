import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentMonth, formatMoney, monthTitle, shiftMonth } from '../../lib/format';
import '../../styles/ui.css';
import './finance.css';

interface MonthPickerProps {
  month: string;
  onChange: (month: string) => void;
}

/** Setas para mudar de mês + botão "Hoje". */
export function MonthPicker({ month, onChange }: MonthPickerProps) {
  return (
    <div className="month-switch">
      <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mês anterior">
        <ChevronLeft size={17} />
      </button>
      <strong>{monthTitle(month)}</strong>
      <button type="button" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Próximo mês">
        <ChevronRight size={17} />
      </button>
      {month !== currentMonth() && (
        <button type="button" className="month-today" onClick={() => onChange(currentMonth())}>
          Hoje
        </button>
      )}
    </div>
  );
}

const PILL_CLASS: Record<string, string> = {
  Paga: 'status-ok',
  Recebida: 'status-ok',
  Pendente: 'status-open',
  Atrasada: 'status-late',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-pill ${PILL_CLASS[status] ?? 'status-open'}`}>{status}</span>;
}

/** Valor em reais; positivo verde, negativo vermelho (quando `signed`). */
export function Money({ value, signed = false }: { value: number; signed?: boolean }) {
  const cls = signed ? (value < 0 ? 'negative-text' : value > 0 ? 'positive-text' : '') : '';
  return <span className={cls}>{formatMoney(value)}</span>;
}
