import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CalendarPlus, CreditCard, Undo2, Wallet } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState, PageHeading } from '../../components/PageHeading';
import { MonthPicker, OffCashTag, StatusBadge } from './components';
import {
  GenerateModal,
  InstallmentFormModal,
  SettleModal,
  type GenerateForm,
  type InstallmentForm,
  type SettleForm,
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
import { currentMonth, formatDateBR, formatMoney, monthRange } from '../../lib/format';
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
  counted: boolean; // false = fora do caixa (a tela ainda soma; só o caixa ignora)
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
    undo: 'Desfazer pagamento',
    doneVerb: 'paga em',
    doneTotal: 'Total pago neste mês',
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
    undo: 'Desfazer recebimento',
    doneVerb: 'recebida em',
    doneTotal: 'Total recebido neste mês',
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
  const [settleTarget, setSettleTarget] = useState<Row | null>(null); // modal do botão "Pagar"/"Receber"
  const [undoTarget, setUndoTarget] = useState<Row | null>(null); // confirmação do "Desfazer"
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
        counted: p.contabilizar !== false,
        initial: {
          accountId: p.id_count,
          descricao: p.descricao ?? '',
          valor: p.valor_parcela,
          vencimento: p.data_vencimento,
          baixa: p.valor_pago,
          dataBaixa: p.data_pagamento,
          contabilizar: p.contabilizar !== false,
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
      counted: r.contabilizar !== false,
      initial: {
        categoryId: r.id_categoria,
        descricao: r.descricao,
        valor: r.valor,
        vencimento: r.data_vencimento,
        baixa: r.valor_recebido,
        dataBaixa: r.data_recebimento,
        contabilizar: r.contabilizar !== false,
      },
    }));
  }, [kind, start, end]);

  const rows = useMemo(
    () => (items.data ?? []).filter((r) => status === 'todos' || r.status === status),
    [items.data, status],
  );

  const open = somar(rows.filter((r) => r.status !== text.done).map((r) => r.value));
  const done = somar(rows.filter((r) => r.status === text.done).map((r) => r.settled ?? r.value));

  // O número grande acompanha a aba: na aba "Pagas" mostra o total pago, e assim por diante.
  const total =
    status === text.done
      ? { label: text.doneTotal, value: done }
      : status === 'Pendente'
        ? { label: 'Total pendente neste mês', value: open }
        : status === 'Atrasada'
          ? { label: 'Total atrasado neste mês', value: open }
          : { label: text.totalLabel, value: open };

  const tabs = [
    { value: 'todos', label: 'Todas' },
    { value: 'Pendente', label: 'Pendentes' },
    { value: 'Atrasada', label: 'Atrasadas' },
    { value: text.done, label: text.doneLabel },
  ];

  async function save(data: InstallmentForm) {
    const done = data.baixa !== undefined || data.dataBaixa !== undefined;
    // Na edição, campo vazio vai como null para a API apagar o valor antigo.
    // Assim dá para desfazer uma baixa apagando o valor pago/recebido.
    const empty = form?.row ? null : undefined;
    if (kind === 'pagar') {
      const payload = {
        id_count: data.accountId as number,
        descricao: data.descricao || empty,
        valor_parcela: data.valor,
        data_vencimento: data.vencimento,
        valor_pago: data.baixa ?? empty,
        data_pagamento: done ? data.dataBaixa : empty,
        contabilizar: data.contabilizar,
      };
      if (form?.row) await updateInstallment(form.row.id, payload);
      else await createInstallment(payload);
    } else {
      const payload = {
        descricao: data.descricao,
        id_categoria: data.categoryId ?? empty,
        valor: data.valor,
        data_vencimento: data.vencimento,
        valor_recebido: data.baixa ?? empty,
        data_recebimento: done ? data.dataBaixa : empty,
        contabilizar: data.contabilizar,
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
        contabilizar: data.contabilizar,
      });
    } else {
      await generateReceivables({
        descricao: data.descricao as string,
        valor: data.valor as number,
        primeiro_vencimento: data.primeiro,
        qtde: data.qtde,
        id_categoria: data.categoryId,
        contabilizar: data.contabilizar,
      });
    }
    await items.reload();
  }

  /**
   * Dá baixa com o valor e a data confirmados no modal. O valor da parcela passa a ser o
   * valor pago: a conta deste mês veio com esse valor (luz e água mudam todo mês).
   * Sem isso, pagar menos que o previsto deixava a parcela "Pendente" (parcial).
   */
  async function settle(row: Row, data: SettleForm) {
    if (kind === 'pagar') {
      await updateInstallment(row.id, { valor_parcela: data.valor, valor_pago: data.valor, data_pagamento: data.data });
    } else {
      await updateReceivable(row.id, { valor: data.valor, valor_recebido: data.valor, data_recebimento: data.data });
    }
    await items.reload();
  }

  /** Volta para pendente: apaga valor e data da baixa (a API recalcula Pendente/Atrasada). */
  async function undo(row: Row) {
    setActionError(null);
    try {
      if (kind === 'pagar') await updateInstallment(row.id, { valor_pago: null, data_pagamento: null });
      else await updateReceivable(row.id, { valor_recebido: null, data_recebimento: null });
      await items.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível desfazer.');
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
          {total.label}
          <strong>{formatMoney(total.value)}</strong>
        </span>
        <span className="bill-count">
          {/* Na aba de pagas o total grande já é o pago; aqui fica só a contagem. */}
          {status === text.done ? '' : `${formatMoney(done)} ${text.doneLabel.toLowerCase()} · `}
          {rows.length} no mês
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
          <div className={`bill-row${row.counted ? '' : ' is-uncounted'}`} key={row.id}>
            <span className={`bill-icon ${kind === 'pagar' ? 'coral' : 'green'}`}>
              {kind === 'pagar' ? <CreditCard size={17} /> : <Wallet size={17} />}
            </span>
            <strong>
              {row.title}
              {!row.counted && <OffCashTag />}
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
              {row.status !== text.done ? (
                <button type="button" className={row.status === 'Atrasada' ? 'primary-button' : 'secondary-button'} onClick={() => setSettleTarget(row)}>
                  {text.action}
                </button>
              ) : (
                <button type="button" className="secondary-button" title={text.undo} onClick={() => setUndoTarget(row)}>
                  <Undo2 size={14} /> Desfazer
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

      {settleTarget && (
        <SettleModal
          kind={kind}
          title={settleTarget.title}
          expected={settleTarget.value}
          offCash={!settleTarget.counted}
          onClose={() => setSettleTarget(null)}
          onSubmit={(data) => settle(settleTarget, data)}
        />
      )}

      {undoTarget && (
        <ConfirmDialog
          title="Voltar para pendente"
          message={`"${undoTarget.title}" volta a ficar pendente. O ${kind === 'pagar' ? 'pagamento' : 'recebimento'} de ${formatMoney(
            undoTarget.settled ?? undoTarget.value,
          )}${undoTarget.settledOn ? ` em ${formatDateBR(undoTarget.settledOn)}` : ''} será removido.`}
          confirmLabel={text.undo}
          onCancel={() => setUndoTarget(null)}
          onConfirm={async () => {
            const row = undoTarget;
            setUndoTarget(null);
            await undo(row);
          }}
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
