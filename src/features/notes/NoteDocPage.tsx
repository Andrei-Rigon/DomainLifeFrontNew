import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, ChevronDown, Loader2, Pencil, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { deleteNote, getNote, updateNote, type Note, type NotePayload } from '../../api/notes';
import { formatClockTime } from '../../lib/date';
import { DEFAULT_NOTE_COLOR, NOTE_COLOR_OPTIONS } from './noteColors';
import './NoteDocPage.css';

const RichTextEditor = lazy(() =>
  import('../../components/RichTextEditor').then((module) => ({ default: module.RichTextEditor })),
);

type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';

const AUTOSAVE_DELAY_MS = 800;

const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: 'Salvo automaticamente',
  dirty: 'Alterações não salvas…',
  saving: 'Salvando…',
  error: 'Não foi possível salvar',
};

function StatusIcon({ status }: { status: SaveStatus }) {
  if (status === 'saving') return <Loader2 size={13} className="note-doc-spin" />;
  if (status === 'error') return <AlertCircle size={13} />;
  if (status === 'dirty') return <Pencil size={13} />;
  return <Check size={13} />;
}

function NoteDocument({ note }: { note: Note }) {
  const navigate = useNavigate();
  const [titulo, setTitulo] = useState(note.titulo);
  const [cor, setCor] = useState(note.cor ?? DEFAULT_NOTE_COLOR);
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | undefined>(note.updatedAt ?? note.createdAt);
  const [colorOpen, setColorOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const colorRef = useRef<HTMLDivElement>(null);

  const latest = useRef({ titulo: note.titulo, descricao: note.descricao ?? '', cor: note.cor ?? DEFAULT_NOTE_COLOR });
  const persisted = useRef({ ...latest.current });
  const timer = useRef<number | undefined>(undefined);
  const saving = useRef(false);
  const pendingAgain = useRef(false);
  const deleted = useRef(false);

  const save = useCallback(async (): Promise<void> => {
    if (deleted.current) return;
    if (saving.current) {
      pendingAgain.current = true;
      return;
    }

    const current = latest.current;
    const base = persisted.current;
    const payload: Partial<NotePayload> = {};
    const title = current.titulo.trim();
    if (title && title !== base.titulo) payload.titulo = title;
    if (current.descricao !== base.descricao) payload.descricao = current.descricao;
    if (current.cor !== base.cor) payload.cor = current.cor;

    if (Object.keys(payload).length === 0) {
      setStatus('saved');
      return;
    }

    saving.current = true;
    setStatus('saving');
    try {
      await updateNote(note.id, payload);
      persisted.current = { ...base, ...payload } as typeof base;
      setSavedAt(new Date().toISOString());
      setErrorMessage(null);
      setStatus(pendingAgain.current ? 'dirty' : 'saved');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao salvar.');
      setStatus('error');
    } finally {
      saving.current = false;
      if (pendingAgain.current) {
        pendingAgain.current = false;
        void save();
      }
    }
  }, [note.id]);

  const scheduleSave = useCallback(() => {
    setStatus('dirty');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
  }, [save]);

  async function saveNow() {
    window.clearTimeout(timer.current);
    while (saving.current) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    await save();
    while (saving.current) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      void save();
    },
    [save],
  );

  useEffect(() => {
    if (status === 'saved') return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [status]);

  useEffect(() => {
    if (!colorOpen) return;
    function handleOutside(event: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(event.target as Node)) {
        setColorOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [colorOpen]);

  async function leave() {
    await saveNow();
    if (status === 'error' || persisted.current.descricao !== latest.current.descricao) {
      const exit = window.confirm('Não foi possível salvar as últimas alterações. Sair mesmo assim?');
      if (!exit) return;
    }
    navigate('/notas');
  }

  function handleTitleChange(value: string) {
    setTitulo(value);
    latest.current.titulo = value;
    scheduleSave();
  }

  function handleTitleBlur() {
    if (!titulo.trim()) {
      setTitulo(persisted.current.titulo);
      latest.current.titulo = persisted.current.titulo;
    }
  }

  function handleBodyChange(markdown: string) {
    latest.current.descricao = markdown.trimEnd();
    scheduleSave();
  }

  function handleColorChange(value: string) {
    setCor(value);
    latest.current.cor = value;
    scheduleSave();
  }

  async function handleDelete() {
    deleted.current = true;
    window.clearTimeout(timer.current);
    await deleteNote(note.id);
    navigate('/notas');
  }

  const isCustomColor = !NOTE_COLOR_OPTIONS.some((option) => option.value === cor.toLowerCase());
  const editedAt = formatClockTime(savedAt);

  return (
    <div className="note-doc">
      <header className="note-doc-header">
        <button type="button" className="icon-btn" aria-label="Voltar para as notas" onClick={leave}>
          <ArrowLeft size={20} />
        </button>
        <span className="note-doc-dot" style={{ background: cor }} />
        <div className="note-doc-titlebox">
          <input
            className="note-doc-title"
            value={titulo}
            maxLength={255}
            onChange={(event) => handleTitleChange(event.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Sem título"
            aria-label="Título da nota"
          />
          <span className={`note-doc-status note-doc-status--${status}`} title={errorMessage ?? undefined}>
            <StatusIcon status={status} /> {STATUS_TEXT[status]}
          </span>
        </div>

        <div className="note-doc-color" ref={colorRef}>
          <button type="button" className="note-doc-color-btn" onClick={() => setColorOpen((open) => !open)}>
            <span className="note-doc-color-dot" style={{ background: cor }} />
            Cor
            <ChevronDown size={14} />
          </button>
          {colorOpen && (
            <div className="note-doc-color-panel">
              <div className="note-doc-swatches">
                {NOTE_COLOR_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    className={['note-doc-swatch', cor.toLowerCase() === value ? 'note-doc-swatch--active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    style={{ background: value }}
                    title={label}
                    aria-label={`Cor ${label}`}
                    onClick={() => handleColorChange(value)}
                  />
                ))}
              </div>
              <label className="note-doc-custom">
                <span
                  className={['note-doc-swatch', 'note-doc-swatch--custom', isCustomColor ? 'note-doc-swatch--active' : '']
                    .filter(Boolean)
                    .join(' ')}
                  style={isCustomColor ? { background: cor } : undefined}
                />
                Personalizada
                <input
                  type="color"
                  value={cor}
                  onChange={(event) => handleColorChange(event.target.value)}
                  aria-label="Escolher cor personalizada"
                />
              </label>
            </div>
          )}
        </div>

        <button
          type="button"
          className="icon-btn note-doc-delete"
          aria-label="Excluir nota"
          title="Excluir nota"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 size={18} />
        </button>
        <button type="button" className="icon-btn" aria-label="Fechar" title="Fechar" onClick={leave}>
          <X size={20} />
        </button>
      </header>

      <Suspense fallback={<div className="note-doc-loading">Carregando editor…</div>}>
        <RichTextEditor
          variant="document"
          value={note.descricao ?? ''}
          onChange={handleBodyChange}
          placeholder="Comece a escrever… Selecione o texto para formatar."
          accentColor={cor}
          footerRight={editedAt ? `Editado às ${editedAt}` : ''}
        />
      </Suspense>

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir nota"
          message={`Tem certeza que deseja excluir "${titulo}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onCancel={() => setConfirmDelete(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

export function NoteDocPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setNote(undefined);
    setLoadError(null);
    getNote(id)
      .then((result) => {
        if (!cancelled) setNote(result ?? null);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loadError || note === null) {
    return (
      <div className="note-doc note-doc--center">
        <p>{loadError ?? 'Nota não encontrada.'}</p>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/notas')}>
          Voltar para as notas
        </button>
      </div>
    );
  }

  if (note === undefined) {
    return <div className="note-doc note-doc--center">Carregando nota…</div>;
  }

  return <NoteDocument key={note.id} note={note} />;
}
