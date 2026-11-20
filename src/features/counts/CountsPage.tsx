import { useMemo, useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { EmptyState, PageHeading } from '../../components/PageHeading';
import { CountRow } from './CountRow';
import { CountFormModal } from './CountFormModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useCounts } from './useCounts';
import { COUNT_TYPES } from './countsUi';
import type { Count, CountType } from '../../api/counts';

type Filter = 'todos' | CountType;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'todos', label: 'Todas' },
  ...COUNT_TYPES.map((type) => ({ value: type.value, label: type.label })),
];

function matchesSearch(count: Count, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [count.nome, count.descricao].filter(Boolean).some((field) => field!.toLowerCase().includes(term));
}

export function CountsPage() {
  const { counts, error, create, update, remove } = useCounts();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [formCount, setFormCount] = useState<Count | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Count | null>(null);

  const filteredCounts = useMemo(
    () =>
      counts
        .filter((count) => matchesSearch(count, search))
        .filter((count) => filter === 'todos' || count.tipo === filter),
    [counts, search, filter],
  );

  async function handleSubmit(payload: Parameters<typeof create>[0]) {
    if (formCount && formCount !== 'new') {
      await update(formCount.id, payload);
    } else {
      await create(payload);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Suas contas recorrentes"
        title="Contas e assinaturas"
        subtitle="Uma lista simples do que faz parte do seu mês."
        actionLabel="Adicionar conta"
        onAction={() => setFormCount('new')}
      />

      <div className="page-toolbar">
        <div className="toolbar-group">
          <div className="segmented">
            {FILTERS.map(({ value, label }) => (
              <button key={value} type="button" className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>
                {label}
              </button>
            ))}
          </div>
          <label className="search-field">
            <Search size={15} />
            <input type="text" placeholder="Pesquisar conta" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
        <span className="muted-caption">{filteredCounts.length} {filteredCounts.length === 1 ? 'conta' : 'contas'}</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card-grid card-grid--two">
        {filteredCounts.map((count) => (
          <CountRow key={count.id} count={count} onEdit={() => setFormCount(count)} onDelete={() => setDeleteTarget(count)} />
        ))}
        {filteredCounts.length === 0 && (
          <EmptyState icon={<Receipt size={24} />} title="Nenhuma conta encontrada" text="Cadastre luz, internet, assinaturas e o que se repete todo mês." />
        )}
      </div>

      {formCount && (
        <CountFormModal
          count={formCount === 'new' ? undefined : formCount}
          onClose={() => setFormCount(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir conta"
          message={`Tem certeza que deseja excluir "${deleteTarget.nome}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await remove(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </>
  );
}
