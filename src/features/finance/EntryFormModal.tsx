import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import '../../components/forms.css';
import './finance.css';
import type { Category, Entry, EntryKind, EntryPayload, PaymentMethod } from '../../api/finance';
import { CaixaCheck } from './components';
import { hasTooManyDecimals, moneyToInput, parseMoneyInput, todayISO } from '../../lib/format';

interface EntryFormModalProps {
  entry?: Entry;
  defaultKind?: EntryKind;
  categories: Category[];
  onClose: () => void;
  onSubmit: (payload: EntryPayload) => Promise<unknown>;
}

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'pix', label: 'Pix' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'outro', label: 'Outro' },
];

export function EntryFormModal({ entry, defaultKind = 'despesa', categories, onClose, onSubmit }: EntryFormModalProps) {
  const [tipo, setTipo] = useState<EntryKind>(entry?.tipo ?? defaultKind);
  const [valor, setValor] = useState(entry ? moneyToInput(entry.valor) : '');
  const [data, setData] = useState(entry?.data ?? todayISO());
  const [categoria, setCategoria] = useState(entry?.id_categoria ? String(entry.id_categoria) : '');
  const [descricao, setDescricao] = useState(entry?.descricao ?? '');
  const [forma, setForma] = useState<PaymentMethod | ''>(entry?.forma_pagamento ?? '');
  const [observacao, setObservacao] = useState(entry?.observacao ?? '');
  const [contabilizar, setContabilizar] = useState(entry?.contabilizar ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Só mostra categorias que servem para o tipo escolhido
  const options = categories.filter((c) => c.tipo === 'ambos' || c.tipo === tipo);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseMoneyInput(valor);
    if (amount === undefined || Number.isNaN(amount) || amount <= 0 || hasTooManyDecimals(amount)) {
      setError('Informe um valor maior que zero, com no máximo 2 casas decimais.');
      return;
    }
    if (!data) {
      setError('Informe a data.');
      return;
    }

    setSubmitting(true);
    setError(null);
    // Na edição, campo vazio vai como null para a API apagar o valor antigo
    // (antes, tirar a categoria ou a forma de pagamento não tinha efeito).
    const empty = entry ? null : undefined;
    try {
      await onSubmit({
        tipo,
        valor: amount,
        data,
        id_categoria: categoria ? Number(categoria) : empty,
        descricao: descricao.trim() || empty,
        forma_pagamento: forma || empty,
        observacao: observacao.trim() || empty,
        contabilizar,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o lançamento.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={entry ? 'Editar lançamento' : tipo === 'despesa' ? 'Nova despesa' : 'Nova receita'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="entry-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="entry-form" className="fin-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="fin-kind-toggle" role="group" aria-label="Tipo do lançamento">
          {(['despesa', 'receita'] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              className={`fin-kind-btn fin-kind-btn--${kind}${tipo === kind ? ' fin-kind-btn--active' : ''}`}
              onClick={() => {
                setTipo(kind);
                setCategoria('');
              }}
            >
              {kind === 'despesa' ? 'Despesa' : 'Receita'}
            </button>
          ))}
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="entry-valor">Valor</label>
            <input
              id="entry-valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="entry-data">Data</label>
            <input id="entry-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="entry-categoria">Categoria</label>
            <select id="entry-categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="">Sem categoria</option>
              {options.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="entry-forma">Forma de pagamento</label>
            <select id="entry-forma" value={forma} onChange={(e) => setForma(e.target.value as PaymentMethod | '')}>
              <option value="">Não informada</option>
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="entry-descricao">Descrição</label>
          <input
            id="entry-descricao"
            value={descricao}
            maxLength={255}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: compras da semana"
          />
        </div>

        <div className="field">
          <label htmlFor="entry-obs">Observação</label>
          <textarea
            id="entry-obs"
            style={{ minHeight: 64 }}
            rows={2}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </div>
        <CaixaCheck
          checked={contabilizar}
          onChange={setContabilizar}
          hint="Desmarque se este valor já entra por outro lançamento (ex.: compra no cartão, que vai na fatura)."
        />
      </form>
    </Modal>
  );
}
