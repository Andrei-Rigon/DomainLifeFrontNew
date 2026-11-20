import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, CircleDollarSign, Download, Wallet } from 'lucide-react';
import { PageHeading, PanelHeading } from '../../components/PageHeading';
import { MonthPicker } from './components';
import { EntryFormModal } from './EntryFormModal';
import {
  type EntryPayload,
  createEntry,
  exportCsv,
  getBalance,
  getEvolution,
  getSummary,
  listCategories,
} from '../../api/finance';
import { currentMonth, formatMoney, monthLabel, monthRange, monthShort, monthTitle } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';
import { percentual } from './math';
import './finance.css';

// Cores das barras quando a categoria não tem cor própria
const FALLBACK_COLORS = ['#8679db', '#e7a07c', '#70b89b', '#e0b55f', '#dd8c9c', '#a9afbb'];

/** Variação percentual entre dois valores; null se não dá para comparar. */
function delta(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 1000) / 10;
}

function deltaLabel(value: number | null): string {
  if (value === null) return '—';
  return `${value > 0 ? '↑' : value < 0 ? '↓' : ''} ${Math.abs(value).toLocaleString('pt-BR')}%`.trim();
}

export function OverviewPage() {
  const [month, setMonth] = useState(currentMonth());
  const [showForm, setShowForm] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const isCurrent = month === currentMonth();
  const { start, end } = monthRange(month);

  const summary = useLoad(() => getSummary(month), [month]);
  // Mês atual: saldo até hoje. Outros meses: saldo no último dia do mês.
  const balance = useLoad(() => getBalance(isCurrent ? undefined : end), [month]);
  const evolution = useLoad(() => getEvolution(6), []);
  const categories = useLoad(listCategories, []);

  async function handleCreate(payload: EntryPayload) {
    await createEntry(payload);
    await Promise.all([summary.reload(), balance.reload(), evolution.reload()]);
  }

  async function handleExport() {
    setExportError(null);
    try {
      await exportCsv(start, end);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Não foi possível exportar.');
    }
  }

  const s = summary.data;
  const colors = new Map((categories.data ?? []).map((c) => [c.id, c.cor]));
  const expenses = (s?.por_categoria ?? []).filter((c) => c.tipo === 'despesa').slice(0, 5);
  const chartMax = Math.max(1, ...(evolution.data ?? []).flatMap((p) => [p.entradas, p.saidas]));
  const toPay = s ? { qtd: s.parcelas.Pendente.qtd + s.parcelas.Atrasada.qtd, total: s.parcelas.Pendente.total + s.parcelas.Atrasada.total } : null;
  const toReceive = s ? { qtd: s.a_receber.Pendente.qtd + s.a_receber.Atrasada.qtd, total: s.a_receber.Pendente.total + s.a_receber.Atrasada.total } : null;
  const error = summary.error ?? balance.error ?? exportError;

  return (
    <>
      <PageHeading
        eyebrow="Seu dinheiro, com clareza"
        title="Visão financeira"
        subtitle="Um retrato tranquilo das suas finanças."
        actionLabel="Novo lançamento"
        onAction={() => setShowForm(true)}
      />

      <div className="page-toolbar">
        <MonthPicker month={month} onChange={setMonth} />
        <button type="button" className="secondary-button" onClick={handleExport}>
          <Download size={15} /> Exportar resumo
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="finance-metrics">
        <Metric
          label="Entradas do mês"
          value={formatMoney(s?.entradas)}
          delta={s ? deltaLabel(delta(s.entradas, s.comparacao.entradas)) : '—'}
          tone="positive"
          icon={<ArrowDownLeft size={17} />}
        />
        <Metric
          label="Saídas do mês"
          value={formatMoney(s?.saidas)}
          delta={s ? deltaLabel(delta(s.saidas, s.comparacao.saidas)) : '—'}
          tone="negative"
          icon={<ArrowUpRight size={17} />}
        />
        <Metric
          label="Saldo do mês"
          value={formatMoney(s?.saldo)}
          delta={s ? (s.saldo > 0 ? 'No azul' : s.saldo < 0 ? 'No vermelho' : 'Em equilíbrio') : '—'}
          tone="purple"
          icon={<CircleDollarSign size={17} />}
        />
        <Metric
          label="Saldo acumulado"
          value={formatMoney(balance.data?.saldo)}
          delta={balance.data ? `Inicial ${formatMoney(balance.data.saldo_inicial)}` : '—'}
          tone="positive"
          icon={<Wallet size={17} />}
        />
      </div>

      <div className="finance-grid">
        <section className="panel chart-panel">
          <PanelHeading kicker="ÚLTIMOS 6 MESES" title="Entradas e saídas" />
          <div className="chart-legend">
            <span>
              <i className="legend-dot purple-dot" />
              Entradas
            </span>
            <span>
              <i className="legend-dot coral-dot" />
              Saídas
            </span>
          </div>
          <div className="bar-chart">
            {(evolution.data ?? []).map((p) => (
              <div
                className="bar-group"
                key={p.mes}
                title={`${monthLabel(p.mes)}: entradas ${formatMoney(p.entradas)}, saídas ${formatMoney(p.saidas)}`}
              >
                <div className="bar-pair">
                  <span className="bar-income" style={{ height: `${(p.entradas / chartMax) * 100}%` }} />
                  <span className="bar-expense" style={{ height: `${(p.saidas / chartMax) * 100}%` }} />
                </div>
                <small>{monthShort(p.mes)}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel category-panel">
          <PanelHeading kicker="PARA ONDE VAI" title="Gastos por categoria" />
          {expenses.length === 0 && <p className="muted-caption" style={{ marginTop: 18 }}>Sem despesas em {monthTitle(month).toLowerCase()}.</p>}
          {expenses.map((c, i) => (
            <div className="category-row" key={`${c.id_categoria}-${c.categoria}`}>
              <div>
                <span>{c.categoria}</span>
                <strong>{formatMoney(c.total)}</strong>
              </div>
              <div className="category-track">
                <span
                  style={{
                    width: `${percentual(c.total, expenses[0].total)}%`,
                    background: (c.id_categoria != null && colors.get(c.id_categoria)) || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}
        </section>
      </div>

      <section className="panel upcoming-panel">
        <PanelHeading kicker="PRÓXIMO PASSO" title="Contas para acompanhar" />
        <div className="upcoming-cards">
          <Link to="/pagar">
            <span className="quick-icon coral">
              <ArrowUpRight size={16} />
            </span>
            <span>
              <strong>Contas a pagar</strong>
              <small>{toPay ? (toPay.qtd ? `${toPay.qtd} em aberto neste mês` : 'Tudo em dia neste mês') : ' '}</small>
            </span>
            <b>
              {formatMoney(toPay?.total)} <ChevronRight size={15} />
            </b>
          </Link>
          <Link to="/receber">
            <span className="quick-icon green">
              <ArrowDownLeft size={16} />
            </span>
            <span>
              <strong>Contas a receber</strong>
              <small>{toReceive ? (toReceive.qtd ? `${toReceive.qtd} previstas neste mês` : 'Nada pendente neste mês') : ' '}</small>
            </span>
            <b>
              {formatMoney(toReceive?.total)} <ChevronRight size={15} />
            </b>
          </Link>
        </div>
      </section>

      {showForm && (
        <EntryFormModal categories={categories.data ?? []} onClose={() => setShowForm(false)} onSubmit={handleCreate} />
      )}
    </>
  );
}

function Metric({
  label,
  value,
  delta: deltaText,
  tone,
  icon,
}: {
  label: string;
  value: string;
  delta: string;
  tone: 'positive' | 'negative' | 'purple';
  icon: React.ReactNode;
}) {
  return (
    <article className="panel metric-card">
      <div className="metric-head">
        <span className={`metric-icon ${tone}`}>{icon}</span>
        <span className={`metric-delta ${tone}`}>{deltaText}</span>
      </div>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
