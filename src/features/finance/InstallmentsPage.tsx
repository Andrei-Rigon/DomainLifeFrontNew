import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarPlus, CreditCard, Wallet } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState, PageHeading } from '../../components/PageHeading';
import { MonthPicker, StatusBadge } from './components';
import {
  GenerateModal,
  InstallmentFormModal,
  type GenerateForm,
  type InstallmentForm,
  type InstallmentInitial,
  type InstallmentKind,
} from './InstallmentModals';
import {
  createInstallment,
  createReceivable,
  deleteInstallment,
  deleteReceivable,
  generateInstallments,
  generateReceivables,
  listCategories,
  listInstallments,
  listReceivables,
  updateInstallment,
  updateReceivable,
} from '../../api/finance';
import { listCounts } from '../../api/counts';
import { currentMonth, formatDateBR, formatMoney, monthRange, todayISO } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';
import { somar } from './math';
import './finance.css';

/** Linha normalizada: "a pagar" e "a receber" aparecem do mesmo jeito. */
interface Row {
  id: number;
  title: string;
  subtitle: string;
  value: number;
  settled: number | null; // valor pago / recebido
  due: string;
  settledOn: string | null;
  status: string;
  initial: InstallmentInitial;
}

const TEXT = {
  pagar: {
    eyebrow: 'Organize seus vencimentos',
    title: 'Contas a pagar',
    subtitle: 'Saiba o que vence e mantenha tudo em dia.',
    totalLabel: 'Total em aberto neste mês',
    nova: 'Nova parcela',
    done: 'Paga',
    doneLabel: 'Pagas',
    action: 'Pagar',
    doneVerb: 'paga em',
    empty: 'Nenhuma parcela neste mês. Use "Gerar parcelas" para criar as de uma conta.',
  },
  receber: {
    eyebrow: 'Acompanhe suas entradas',
    title: 'Contas a receber',
    subtitle: 'Cobranças e valores previstos para entrar.',
    totalLabel: 'Total previsto para receber',
    nova: 'Nova cobrança',
    done: 'Recebida',
    doneLabel: 'Recebidas',
    action: 'Receber',
    doneVerb: 'recebida em',
    empty: 'Nenhuma cobrança neste mês. Use "Gerar cobranças" para criar as mensais.',
  },
} as const;

export function PayablesPage() {
  return <InstallmentsPage kind="pagar" />;
}

export function ReceivablesPage() {
  return <InstallmentsPage kind="receber" />;
}

function InstallmentsPage({ kind }: { kind: InstallmentKind }) {
  const text = TEXT[kind];
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<string>('todos');
  const [form, setForm] = useState<{ row?: Row } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { start, end } = monthRange(month);
  const accounts = useLoad(listCounts, []);
  const categories = useLoad(listCategories, []);

  const items = useLoad<Row[]>(async () => {
    if (kind === 'pagar') {
      const parcelas = await listInstallments({ start, end });
      const names = new Map((await listCounts()).map((c) => [c.id, c.nome]));
      return parcelas.map((p) => ({
        id: p.id,
        title: p.descricao || names.get(p.id_count) || 'Conta',
        subtitle: names.get(p.id_count) ?? '',
        value: p.valor_parcela,
        settled: p.valor_pago,
        due: p.data_vencimento,
        settledOn: p.data_pagamento,
        status: p.status,
        initial: {
          accountId: p.id_count,
          descricao: p.descricao ?? '',
          valor: p.valor_parcela,
          vencimento: p.data_vencimento,
          baixa: p.valor_pago,
          dataBaixa: p.data_pagamento,
        },
      }));
    }
    const cobrancas = await listReceivables({ start, end });
    return cobrancas.map((r) => ({
      id: r.id,
      title: r.descricao,
      subtitle: r.categoria?.nome ?? '',
      value: r.valor,
      settled: r.valor_recebido,
      due: r.data_vencimento,
      settledOn: r.data_recebimento,
      status: r.status,
      initial: {
        categoryId: r.id_categoria,
        descricao: r.descricao,
        valor: r.valor,
        vencimento: r.data_vencimento,
        baixa: r.valor_recebido,
        dataBaixa: r.data_recebimento,
      },
    }));
  }, [kind, start, end]);

  const rows = useMemo(
    () => (items.data ?? []).filter((r) => status === 'todos' || r.status === status),
    [items.data, status],
  );

  const open = somar(rows.filter((r) => r.status !== text.done).map((r) => r.value));
  const done = somar(rows.filter((r) => r.status === text.done).map((r) => r.settled ?? r.value));

  const tabs = [
    { value: 'todos', label: 'Todas' },
    { value: 'Pendente', label: 'Pendentes' },
    { value: 'Atrasada', label: 'Atrasadas' },
    { value: text.done, label: text.doneLabel },
  ];

  async function save(data: InstallmentForm) {
    const done = data.baixa !== undefined || data.dataBaixa !== undefined;
    if (kind === 'pagar') {
      const payload = {
        id_count: data.accountId as number,
        descricao: data.descricao || undefined,
        valor_parcela: data.valor,
        data_vencimento: data.vencimento,
        valor_pago: data.baixa,
        data_pagamento: done ? data.dataBaixa : undefined,
      };
      if (form?.row) await updateInstallment(form.row.id, payload);
      else await createInstallment(payload);
    } else {
      const payload = {
        descricao: data.descricao,
        id_categoria: data.categoryId,
        valor: data.valor,
        data_vencimento: data.vencimento,
        valor_recebido: data.baixa,
        data_recebimento: done ? data.dataBaixa : undefined,
      };
      if (form?.row) await updateReceivable(form.row.id, payload);
      else await createReceivable(payload);
    }
    await items.reload();
  }

  async function generate(data: GenerateForm) {
    if (kind === 'pagar') {
      await generateInstallments({
        id_count: data.accountId as number,
        data_primeiro_vencimento: data.primeiro,
        qtde_parceladas: data.qtde,
        valor_parcela: data.valor,
      });
    } else {
      await generateReceivables({
        descricao: data.descricao as string,
        valor: data.valor as number,
        primeiro_vencimento: data.primeiro,
        qtde: data.qtde,
        id_categoria: data.categoryId,
      });
    }
    await items.reload();
  }

  // Dá baixa no valor cheio, com data de hoje
  async function settle(row: Row) {
    setActionError(null);
    try {
      if (kind === 'pagar') await updateInstallment(row.id, { valor_pago: row.value, data_pagamento: todayISO() });
      else await updateReceivable(row.id, { valor_recebido: row.value, data_recebimento: todayISO() });
      await items.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível dar baixa.');
    }
  }

  const error = items.error ?? actionError;

  return (
    <>
      <PageHeading
        eyebrow={text.eyebrow}
        title={text.title}
        subtitle={text.subtitle}
        actionLabel={text.nova}
        onAction={() => setForm({})}
      />

      <div className="page-toolbar">
        <MonthPicker month={month} onChange={setMonth} />
        <div className="toolbar-group">
          <div className="segmented">
            {tabs.map((tab) => (
              <button key={tab.value} type="button" className={status === tab.value ? 'selected' : ''} onClick={() => setStatus(tab.value)}>
                {tab.label}
              </button>
            ))}
          </div>
          <button type="button" className="secondary-button" onClick={() => setGenerating(true)}>
            <CalendarPlus size={15} /> {kind === 'pagar' ? 'Gerar parcelas' : 'Gerar cobranças'}
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="bill-total">
        <span className={`quick-icon ${kind === 'pagar' ? 'coral' : 'green'}`}>
          {kind === 'pagar' ? <ArrowUpRight size={17} /> : <ArrowDownLeft size={17} />}
        </span>
        <span>
          {text.totalLabel}
          <strong>{formatMoney(open)}</strong>
        </span>
        <span className="bill-count">
          {formatMoney(done)} {text.doneLabel.toLowerCase()} · {rows.length} no mês
        </span>
      </div>

      <section className="panel list-panel">
        <div className="list-heading bill-list-heading">
          <span />
          <span>{kind === 'pagar' ? 'CONTA' : 'COBRANÇA'}</span>
          <span>VENCIMENTO</span>
          <span>VALOR</span>
          <span>STATUS</span>
          <span />
          <span />
        </div>

        {rows.map((row) => (
          <div className="bill-row" key={row.id}>
            <span className={`bill-icon ${kind === 'pagar' ? 'coral' : 'green'}`}>
              {kind === 'pagar' ? <CreditCard size={17} /> : <Wallet size={17} />}
            </span>
            <strong>
              {row.title}
              <small>
                {[
                  row.subtitle && !row.title.startsWith(row.subtitle) ? row.subtitle : null,
                  row.settledOn ? `${text.doneVerb} ${formatDateBR(row.settledOn)}` : null,
                  row.status !== text.done && row.settled != null ? `parcial: ${formatMoney(row.settled)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || ' '}
              </small>
            </strong>
            <span>{formatDateBR(row.due).slice(0, 5)}</span>
            <b>{formatMoney(row.value)}</b>
            <span>
              <StatusBadge status={row.status} />
            </span>
            <span className="bill-action">
              {row.status !== text.done && (
                <button type="button" className={row.status === 'Atrasada' ? 'primary-button' : 'secondary-button'} onClick={() => settle(row)}>
                  {text.action}
                </button>
              )}
            </span>
            <ActionMenu onEdit={() => setForm({ row })} onDelete={() => setDeleteTarget(row)} />
          </div>
        ))}

        {rows.length === 0 && (
          <EmptyState
            icon={kind === 'pagar' ? <CreditCard size={23} /> : <Wallet size={23} />}
            title={items.loading ? 'Carregando…' : 'Nada por aqui neste mês'}
            text={items.loading ? 'Buscando seus dados.' : text.empty}
          />
        )}
      </section>

      {form && (
        <InstallmentFormModal
          kind={kind}
          initial={form.row?.initial}
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          onClose={() => setForm(null)}
          onSubmit={save}
        />
      )}

      {generating && (
        <GenerateModal
          kind={kind}
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          onClose={() => setGenerating(false)}
          onSubmit={generate}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir"
          message={`Excluir "${deleteTarget.title}" de ${formatMoney(deleteTarget.value)}?`}
          confirmLabel="Excluir"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (kind === 'pagar') await deleteInstallment(deleteTarget.id);
            else await deleteReceivable(deleteTarget.id);
            setDeleteTarget(null);
            await items.reload();
          }}
        />
      )}
    </>
  );
}
