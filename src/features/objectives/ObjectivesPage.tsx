import { useMemo, useState } from 'react';
import { Search, Target } from 'lucide-react';
import { EmptyState, PageHeading } from '../../components/PageHeading';
import { ObjectiveCard } from './ObjectiveCard';
import { ObjectiveFormModal } from './ObjectiveFormModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useObjectives } from './useObjectives';
import type { Objective } from '../../api/objectives';

type Filter = 'todos' | 'andamento' | 'concluidos';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'andamento', label: 'Em andamento' },
  { value: 'concluidos', label: 'Concluídos' },
];

function matchesSearch(objective: Objective, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [objective.titulo, objective.descricao]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(term));
}

export function ObjectivesPage() {
  const { objectives, error, create, update, remove } = useObjectives();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('todos');
  const [formObjective, setFormObjective] = useState<Objective | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Objective | null>(null);

  const filteredObjectives = useMemo(() => {
    return objectives
      .filter((objective) => matchesSearch(objective, search))
      .filter((objective) => {
        if (filter === 'andamento') return !objective.checked;
        if (filter === 'concluidos') return objective.checked;
        return true;
      });
  }, [objectives, search, filter]);

  async function handleSubmit(payload: Parameters<typeof create>[0]) {
    if (formObjective && formObjective !== 'new') {
      await update(formObjective.id, payload);
    } else {
      await create(payload);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="O que você quer construir?"
        title="Objetivos"
        subtitle="Cada passo conta. Acompanhe o seu progresso."
        actionLabel="Novo objetivo"
        onAction={() => setFormObjective('new')}
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
            <input type="text" placeholder="Pesquisar objetivo" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
        <span className="muted-caption">{filteredObjectives.length} {filteredObjectives.length === 1 ? 'objetivo' : 'objetivos'}</span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card-grid">
        {filteredObjectives.map((objective) => (
          <ObjectiveCard
            key={objective.id}
            objective={objective}
            onToggleChecked={() => update(objective.id, { checked: String(!objective.checked) })}
            onEdit={() => setFormObjective(objective)}
            onDelete={() => setDeleteTarget(objective)}
          />
        ))}
        {filteredObjectives.length === 0 && (
          <EmptyState icon={<Target size={24} />} title="Nenhum objetivo encontrado" text="Crie uma meta e acompanhe quanto falta para chegar lá." />
        )}
      </div>

      {formObjective && (
        <ObjectiveFormModal
          objective={formObjective === 'new' ? undefined : formObjective}
          onClose={() => setFormObjective(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir objetivo"
          message={`Tem certeza que deseja excluir "${deleteTarget.titulo}"? Essa ação não pode ser desfeita.`}
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
