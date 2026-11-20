import { useMemo, useState } from 'react';
import { PageHeading } from '../../components/PageHeading';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { NoteCard } from './NoteCard';
import { NoteFormModal } from './NoteFormModal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useNotes } from './useNotes';
import { useNotesViewMode } from './useNotesViewMode';
import { toggleTaskInMarkdown } from '../../lib/markdownTasks';
import type { Note } from '../../api/notes';
import './NotesPage.css';

function matchesSearch(note: Note, search: string): boolean {
  const term = search.trim().toLowerCase();
  if (!term) return true;
  return [note.titulo, note.descricao]
    .filter(Boolean)
    .some((field) => field!.toLowerCase().includes(term));
}

export function NotesPage() {
  const { notes, error, create, update, updateOptimistic, remove } = useNotes();
  const navigate = useNavigate();
  const { mode, setMode } = useNotesViewMode();
  const [search, setSearch] = useState('');
  const [formNote, setFormNote] = useState<Note | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);

  const filteredNotes = useMemo(
    () => notes.filter((note) => matchesSearch(note, search)),
    [notes, search],
  );

  async function handleSubmit(payload: Parameters<typeof create>[0]) {
    if (formNote && formNote !== 'new') {
      await update(formNote.id, payload);
    } else {
      await create(payload);
    }
  }

  function handleToggleTask(note: Note, taskIndex: number) {
    if (!note.descricao) return;
    const next = toggleTaskInMarkdown(note.descricao, taskIndex);
    if (next !== note.descricao) {
      void updateOptimistic(note.id, { descricao: next });
    }
  }

  return (
    <div className="notes-page">
      <PageHeading
        eyebrow="Suas ideias, sempre à mão"
        title="Notas"
        subtitle="Guarde uma ideia antes que ela escape."
        actionLabel="Nova nota"
        onAction={() => setFormNote('new')}
      />

      <div className="page-toolbar">
        <label className="search-field">
          <Search size={15} />
          <input type="text" placeholder="Buscar nas notas…" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        <div className="segmented" role="group" aria-label="Estilo de visualização">
          <button type="button" className={mode === 'postit' ? 'selected' : ''} onClick={() => setMode('postit')}>
            Cartões
          </button>
          <button type="button" className={mode === 'minimal' ? 'selected' : ''} onClick={() => setMode('minimal')}>
            Minimalista
          </button>
        </div>
      </div>

      {error && <div className="notes-error">{error}</div>}

      <div className={`notes-grid notes-grid--${mode}`}>
        {filteredNotes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            variant={mode}
            onAdd={() => setFormNote('new')}
            onOpen={() => navigate(`/notas/${note.id}`)}
            onEdit={() => setFormNote(note)}
            onDelete={() => setDeleteTarget(note)}
            onToggleTask={(taskIndex) => handleToggleTask(note, taskIndex)}
          />
        ))}

        <button type="button" className="notes-add-card" onClick={() => setFormNote('new')}>
          <Plus size={18} />
          <span>Adicionar nota</span>
        </button>
      </div>

      {formNote && (
        <NoteFormModal
          note={formNote === 'new' ? undefined : formNote}
          onClose={() => setFormNote(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir nota"
          message={`Tem certeza que deseja excluir "${deleteTarget.titulo}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            await remove(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
