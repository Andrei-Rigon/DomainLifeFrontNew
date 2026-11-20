import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import '../../components/forms.css';
import { PRIORITY_OPTIONS } from './objectivesUi';
import {
  createObjectiveCategory,
  listObjectiveCategories,
  type Objective,
  type ObjectiveCategory,
  type ObjectivePayload,
} from '../../api/objectives';

// Valor especial do <select> para "criar uma categoria nova".
const NEW_CATEGORY = '__nova__';

/** Valor vindo da API (número ou texto) -> texto do campo. */
function toField(value: number | string | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

interface ObjectiveFormModalProps {
  objective?: Objective;
  onClose: () => void;
  onSubmit: (payload: ObjectivePayload) => Promise<unknown>;
}

export function ObjectiveFormModal({ objective, onClose, onSubmit }: ObjectiveFormModalProps) {
  const [titulo, setTitulo] = useState(objective?.titulo ?? '');
  const [descricao, setDescricao] = useState(objective?.descricao ?? '');
  const [prazo, setPrazo] = useState(objective?.prazo?.slice(0, 10) ?? '');
  // A API devolve dinheiro como número; os campos trabalham com texto.
  const [valorGuardado, setValorGuardado] = useState(toField(objective?.valor_guardado));
  const [valorObjetivo, setValorObjetivo] = useState(toField(objective?.valor_objetivo));
  const [prioridade, setPrioridade] = useState(objective?.prioridade ?? 'media');
  const [idCategoria, setIdCategoria] = useState(objective ? String(objective.id_categoria) : '');
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState<ObjectiveCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(objective);
  const creatingCategory = idCategoria === NEW_CATEGORY;

  // Carrega as categorias para o <select>. Antes o campo pedia o ID na mão,
  // e quem não sabia o número levava "Categoria X não encontrada".
  useEffect(() => {
    listObjectiveCategories()
      .then((list) => {
        setCategories(list);
        // Novo objetivo: já deixa a primeira categoria escolhida (ou "nova" se não houver nenhuma).
        if (!objective) setIdCategoria((current) => current || (list[0] ? String(list[0].id) : NEW_CATEGORY));
      })
      .catch((err: Error) => setError(`Não foi possível carregar as categorias: ${err.message}`));
  }, [objective]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!titulo.trim() || !idCategoria.trim() || (creatingCategory && !newCategory.trim())) {
      setError('Preencha ao menos o título e a categoria.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // Categoria nova: cria primeiro e usa o id dela no objetivo.
      let categoryId = idCategoria;
      if (creatingCategory) {
        const created = await createObjectiveCategory(newCategory.trim());
        setCategories((list) => [...list, created]);
        setIdCategoria(String(created.id));
        setNewCategory('');
        categoryId = String(created.id);
      }

      await onSubmit({
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        prazo: prazo || undefined,
        valor_guardado: valorGuardado || undefined,
        valor_objetivo: valorObjetivo || undefined,
        prioridade,
        id_categoria: categoryId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o objetivo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEditing ? 'Editar objetivo' : 'Novo objetivo'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="objective-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="objective-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label htmlFor="titulo">Título</label>
          <input
            id="titulo"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ex.: Viagem pra praia"
            autoFocus
          />
        </div>

        <div className="field">
          <label htmlFor="descricao">Descrição</label>
          <textarea
            id="descricao"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            rows={4}
            placeholder="Detalhes do objetivo"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="valor_guardado">Valor guardado</label>
            <input
              id="valor_guardado"
              type="number"
              step="0.01"
              min="0"
              value={valorGuardado}
              onChange={(event) => setValorGuardado(event.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="field">
            <label htmlFor="valor_objetivo">Valor objetivo</label>
            <input
              id="valor_objetivo"
              type="number"
              step="0.01"
              min="0"
              value={valorObjetivo}
              onChange={(event) => setValorObjetivo(event.target.value)}
              placeholder="0,00"
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="prazo">Prazo</label>
            <input id="prazo" type="date" value={prazo} onChange={(event) => setPrazo(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="prioridade">Prioridade</label>
            <select id="prioridade" value={prioridade} onChange={(event) => setPrioridade(event.target.value)}>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="id_categoria">Categoria</label>
          <select id="id_categoria" value={idCategoria} onChange={(event) => setIdCategoria(event.target.value)}>
            {/* Edição de objetivo cuja categoria foi apagada: mantém o id para não perder o vínculo. */}
            {idCategoria && idCategoria !== NEW_CATEGORY && !categories.some((c) => String(c.id) === idCategoria) && (
              <option value={idCategoria}>Categoria #{idCategoria}</option>
            )}
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.titulo}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ Nova categoria…</option>
          </select>
        </div>

        {creatingCategory && (
          <div className="field">
            <label htmlFor="nova_categoria">Nome da nova categoria</label>
            <input
              id="nova_categoria"
              value={newCategory}
              maxLength={255}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Ex.: Viagens, Casa, Estudos"
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
