import { ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import type { BankAccount } from '../../api/finance';
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

/**
 * Check "Contabilizar no caixa". Desmarcado = o registro aparece nas listas, mas fica
 * fora das entradas, saídas e saldo (ex.: assinatura paga no cartão, para não duplicar).
 */
export function CaixaCheck({ checked, onChange, hint }: { checked: boolean; onChange: (value: boolean) => void; hint: string }) {
  return (
    <label className="caixa-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <strong>Contabilizar no caixa</strong>
        <small>{hint}</small>
      </span>
    </label>
  );
}

/** Etiqueta cinza para registros fora do caixa (não confundir ao bater com o extrato). */
export function OffCashTag() {
  return (
    <span className="off-cash-tag" title="Fora do caixa: não entra nas entradas, saídas nem no saldo">
      <EyeOff size={11} /> fora do caixa
    </span>
  );
}

/** Select de conta bancária. Contas inativas só aparecem se já estiverem selecionadas. */
export function BankAccountSelect({
  id,
  label,
  accounts,
  value,
  onChange,
  emptyLabel = 'Sem conta',
  exclude,
}: {
  id: string;
  label: string;
  accounts: BankAccount[];
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string | null;
  exclude?: string;
}) {
  const options = accounts.filter((a) => (a.ativa || String(a.id) === value) && String(a.id) !== exclude);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {emptyLabel !== null && <option value="">{emptyLabel}</option>}
        {emptyLabel === null && <option value="">Escolha…</option>}
        {options.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nome}
            {a.ativa ? '' : ' (inativa)'}
          </option>
        ))}
      </select>
    </div>
  );
}
