import { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Search } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState, PageHeading } from '../../components/PageHeading';
import { MonthPicker, OffCashTag } from './components';
import { EntryFormModal } from './EntryFormModal';
import {
  type Entry,
  type EntryKind,
  type EntryPayload,
  createEntry,
  deleteEntry,
  exportCsv,
  listCategories,
  listEntries,
  updateEntry,
} from '../../api/finance';
import { currentMonth, formatDateShort, formatMoney, monthRange } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';
import { somar } from './math';
import './finance.css';

type KindFilter = 'todos' | EntryKind;

const TABS: { value: KindFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'despesa', label: 'Despesas' },
  { value: 'receita', label: 'Receitas' },
];

const PAGE_LIMIT = 200; // a API devolve no máximo 200 por consulta

const METHOD_LABEL: Record<string, string> = { pix: 'Pix', debito: 'Débito', credito: 'Crédito', dinheiro: 'Dinheiro', outro: 'Outro' };

export function EntriesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [kind, setKind] = useState<KindFilter>('todos');
  const [categoryId, setCategoryId] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<{ entry?: Entry } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { start, end } = monthRange(month);
  const entries = useLoad(() => listEntries({ start, end }), [start, end]);
  const categories = useLoad(listCategories, []);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (entries.data ?? []).filter((entry) => {
      if (kind !== 'todos' && entry.tipo !== kind) return false;
      if (categoryId && String(entry.id_categoria) !== categoryId) return false;
      if (!term) return true;
      return [entry.descricao, entry.categoria?.nome, entry.observacao].some((f) => f?.toLowerCase().includes(term));
    });
  }, [entries.data, kind, categoryId, search]);

  // Totais só com o que conta no caixa; o resto aparece na lista, cinza e riscado.
  const counted = visible.filter((e) => e.contabilizar !== false);
  const totalIn = somar(counted.filter((e) => e.tipo === 'receita').map((e) => e.valor));
  const totalOut = somar(counted.filter((e) => e.tipo === 'despesa').map((e) => e.valor));
  const offCash = somar(visible.filter((e) => e.contabilizar === false).map((e) => e.valor));

  async function handleSubmit(payload: EntryPayload) {
    if (form?.entry) await updateEntry(form.entry.id, payload);
    else await createEntry(payload);
    await entries.reload();
  }

  async function handleExport() {
    setActionError(null);
    try {
      await exportCsv(start, end);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Não foi possível exportar.');
    }
  }

  const error = entries.error ?? actionError;

  return (
    <>
      <PageHeading
        eyebrow="Entradas e saídas"
        title="Lançamentos"
        subtitle="Tudo o que entrou e saiu, em um só lugar."
        actionLabel="Novo lançamento"
        onAction={() => setForm({})}
      />

      <div className="page-toolbar">
        <div className="toolbar-group">
          <MonthPicker month={month} onChange={setMonth} />
          <label className="search-field">
            <Search size={16} />
            <input type="search" placeholder="Buscar lançamento…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
        <div className="toolbar-group">
          <div className="segmented">
            {TABS.map((tab) => (
              <button key={tab.value} type="button" className={kind === tab.value ? 'selected' : ''} onClick={() => setKind(tab.value)}>
                {tab.label}
              </button>
            ))}
          </div>
          <select className="select-field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <button type="button" className="secondary-button" onClick={handleExport}>
            <Download size={15} /> CSV
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="transaction-summary">
        <span>
          Resultado <strong className={totalIn - totalOut < 0 ? 'negative-text' : ''}>{formatMoney(somar([totalIn, -totalOut]))}</strong>
        </span>
        <span>
          Entradas <strong className="positive-text">{formatMoney(totalIn)}</strong>
        </span>
        <span>
          Saídas <strong className="negative-text">{formatMoney(totalOut)}</strong>
        </span>
        {offCash > 0 && (
          <span title="Lançamentos marcados para não contabilizar no caixa">
            Fora do caixa <strong className="muted-caption">{formatMoney(offCash)}</strong>
          </span>
        )}
      </div>

      <section className="panel list-panel">
        <div className="list-heading transaction-list-heading">
          <span />
          <span>DESCRIÇÃO</span>
          <span>CATEGORIA</span>
          <span>DATA</span>
          <span style={{ textAlign: 'right' }}>VALOR</span>
          <span />
        </div>

        {visible.map((entry) => (
          <div className={`transaction-row${entry.contabilizar === false ? ' is-uncounted' : ''}`} key={entry.id}>
            <span className={`transaction-symbol ${entry.tipo === 'receita' ? 'income-symbol' : 'expense-symbol'}`}>
              {entry.tipo === 'receita' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
            </span>
            <strong>
              {entry.descricao || entry.categoria?.nome || 'Sem descrição'}
              {entry.contabilizar === false && <OffCashTag />}
              {(entry.forma_pagamento || entry.origem !== 'manual') && (
                <small>{[entry.forma_pagamento && METHOD_LABEL[entry.forma_pagamento], entry.origem !== 'manual' && entry.origem].filter(Boolean).join(' · ')}</small>
              )}
            </strong>
            <span className="transaction-category">
              {entry.categoria ? (
                <>
                  <i className="chip-dot" style={{ background: entry.categoria.cor ?? 'var(--line-strong)' }} />
                  {entry.categoria.nome}
                </>
              ) : (
                '—'
              )}
            </span>
            <span className="transaction-date">{formatDateShort(entry.data)}</span>
            <b className={`transaction-amount ${entry.tipo === 'receita' ? 'positive-text' : 'negative-text'}`}>
              {entry.tipo === 'receita' ? '+' : '−'} {formatMoney(entry.valor)}
            </b>
            <ActionMenu onEdit={() => setForm({ entry })} onDelete={() => setDeleteTarget(entry)} />
          </div>
        ))}

        {visible.length === 0 && (
          <EmptyState
            icon={<Search size={23} />}
            title={entries.loading ? 'Carregando…' : 'Nenhum lançamento encontrado'}
            text={entries.loading ? 'Buscando seus lançamentos.' : 'Tente outro mês ou uma busca diferente.'}
          />
        )}
      </section>

      {(entries.data?.length ?? 0) >= PAGE_LIMIT && (
        <p className="muted-caption" style={{ marginTop: 10 }}>
          Mostrando os {PAGE_LIMIT} lançamentos mais recentes do mês.
        </p>
      )}

      {form && (
        <EntryFormModal
          entry={form.entry}
          categories={categories.data ?? []}
          onClose={() => setForm(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir lançamento"
          message={`Excluir "${deleteTarget.descricao || deleteTarget.categoria?.nome || 'lançamento'}" de ${formatMoney(deleteTarget.valor)}?`}
          confirmLabel="Excluir"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await deleteEntry(deleteTarget.id);
            setDeleteTarget(null);
            await entries.reload();
          }}
        />
      )}
    </>
  );
}
