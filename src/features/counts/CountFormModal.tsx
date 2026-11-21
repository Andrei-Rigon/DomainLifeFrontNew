import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import '../../components/forms.css';
import { COUNT_TYPES } from './countsUi';
import type { Count, CountPayload, CountType } from '../../api/counts';
import './CountFormModal.css';
import { CaixaCheck } from '../finance/components';

interface CountFormModalProps {
  count?: Count;
  onClose: () => void;
  onSubmit: (payload: CountPayload) => Promise<unknown>;
}

/** Converte o texto do campo em número. Vazio = undefined; inválido = NaN. */
function parseMoney(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
}

/** Valor vindo da API (número ou texto) -> texto do campo. */
function moneyToField(value: number | string | null | undefined): string {
  return value === null || value === undefined ? '' : String(value);
}

function hasTooManyDecimals(value: number): boolean {
  return Math.round(value * 100) / 100 !== value;
}

export function CountFormModal({ count, onClose, onSubmit }: CountFormModalProps) {
  const [nome, setNome] = useState(count?.nome ?? '');
  const [descricao, setDescricao] = useState(count?.descricao ?? '');
  const [tipo, setTipo] = useState<CountType>(count?.tipo ?? 'Recorrente');
  // A API devolve dinheiro como número (ex.: 100). O campo trabalha com texto,
  // então convertemos aqui; sem isso o .trim() do parseMoney quebrava ao editar.
  const [valorEsperado, setValorEsperado] = useState(moneyToField(count?.valor_esperado));
  const [parcelas, setParcelas] = useState(count?.qtde_parceladas ? String(count.qtde_parceladas) : '');
  const [contabilizar, setContabilizar] = useState(count?.contabilizar ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(count);
  const isInstallment = tipo === 'Conta';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!nome.trim()) {
      setError('Informe o nome da conta.');
      return;
    }

    const esperado = parseMoney(valorEsperado);
    if (esperado !== undefined && (Number.isNaN(esperado) || esperado < 0 || hasTooManyDecimals(esperado))) {
      setError('Valor esperado inválido: use um número positivo com no máximo 2 casas decimais.');
      return;
    }

    let qtde: number | undefined;
    if (isInstallment) {
      qtde = parcelas.trim() ? Number(parcelas) : undefined;
      if (qtde === undefined || !Number.isInteger(qtde) || qtde < 1) {
        setError('Informe em quantas parcelas a conta será paga (mínimo 1).');
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      // Na edição, campo vazio vira null para a API apagar o valor antigo.
      // Na criação, vazio vai como undefined (simplesmente não é enviado).
      const empty = isEditing ? null : undefined;
      await onSubmit({
        nome: nome.trim(),
        descricao: descricao.trim() || empty,
        tipo,
        valor_esperado: esperado ?? empty,
        // valor_pago não é enviado: o campo foi ocultado e o valor já salvo fica como está.
        // Parcelas só valem para o tipo "Conta"; ao trocar de tipo, limpa.
        qtde_parceladas: qtde ?? empty,
        contabilizar,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a conta.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={isEditing ? 'Editar conta' : 'Nova conta'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="count-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="count-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {error && <div className="form-error">{error}</div>}

        <div className="field">
          <label htmlFor="nome">Nome</label>
          <input
            id="nome"
            value={nome}
            maxLength={255}
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex.: Conta de luz, Netflix..."
            autoFocus
          />
        </div>

        <div className="field">
          <label>Tipo</label>
          <div className="count-type-picker" role="group" aria-label="Tipo da conta">
            {COUNT_TYPES.map((option) => (
              <button
                key={option.value}
                type="button"
                className={['count-type-btn', tipo === option.value ? 'count-type-btn--active' : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setTipo(option.value)}
              >
                <span className="count-type-name">{option.label}</span>
                <span className="count-type-hint">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* O valor pago fica oculto aqui: a conta é só o molde. O pagamento é registrado em "A pagar". */}
        <div className="field">
          <label htmlFor="valor_esperado">Valor esperado</label>
          <input
            id="valor_esperado"
            type="number"
            step="0.01"
            min="0"
            value={valorEsperado}
            onChange={(event) => setValorEsperado(event.target.value)}
            placeholder="0,00"
          />
        </div>

        {isInstallment && (
          <div className="field">
            <label htmlFor="parcelas">Quantidade de parcelas</label>
            <input
              id="parcelas"
              type="number"
              min="1"
              step="1"
              value={parcelas}
              onChange={(event) => setParcelas(event.target.value)}
              placeholder="Ex.: 12"
            />
          </div>
        )}

        <CaixaCheck
          checked={contabilizar}
          onChange={setContabilizar}
          hint="Desmarque se esta conta é paga no cartão (a fatura já entra no caixa). As parcelas novas já vêm fora do caixa."
        />

        <div className="field">
          <label htmlFor="descricao">Descrição</label>
          <textarea
            id="descricao"
            value={descricao}
            maxLength={255}
            onChange={(event) => setDescricao(event.target.value)}
            rows={3}
            placeholder="Detalhes da conta"
          />
        </div>
      </form>
    </Modal>
  );
}
