import { useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import '../../components/forms.css';
import './finance.css';
import type { Category } from '../../api/finance';
import type { Count } from '../../api/counts';
import { hasTooManyDecimals, parseMoneyInput, todayISO } from '../../lib/format';

export type InstallmentKind = 'pagar' | 'receber';

/** Dados do formulário, iguais para "a pagar" e "a receber" (a página converte para o payload da API). */
export interface InstallmentForm {
  accountId?: number;
  categoryId?: number;
  descricao: string;
  valor: number;
  vencimento: string;
  baixa?: number;
  dataBaixa?: string;
}

export interface GenerateForm {
  accountId?: number;
  categoryId?: number;
  descricao?: string;
  valor?: number;
  primeiro: string;
  qtde?: number;
}

export interface InstallmentInitial {
  accountId?: number;
  categoryId?: number | null;
  descricao: string;
  valor: number;
  vencimento: string;
  baixa: number | null;
  dataBaixa: string | null;
}

const WORDS = {
  pagar: { baixa: 'Valor pago', data: 'Data do pagamento', nova: 'Nova parcela', editar: 'Editar parcela' },
  receber: { baixa: 'Valor recebido', data: 'Data do recebimento', nova: 'Nova cobrança', editar: 'Editar cobrança' },
};

function validMoney(value: number | undefined, required: boolean): boolean {
  if (value === undefined) return !required;
  return !Number.isNaN(value) && value > 0 && !hasTooManyDecimals(value);
}

interface FormModalProps {
  kind: InstallmentKind;
  initial?: InstallmentInitial;
  accounts: Count[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (form: InstallmentForm) => Promise<unknown>;
}

export function InstallmentFormModal({ kind, initial, accounts, categories, onClose, onSubmit }: FormModalProps) {
  const words = WORDS[kind];
  const [accountId, setAccountId] = useState(initial?.accountId ? String(initial.accountId) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ? String(initial.categoryId) : '');
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  const [valor, setValor] = useState(initial ? String(initial.valor).replace('.', ',') : '');
  const [vencimento, setVencimento] = useState(initial?.vencimento ?? todayISO());
  const [baixa, setBaixa] = useState(initial?.baixa != null ? String(initial.baixa).replace('.', ',') : '');
  const [dataBaixa, setDataBaixa] = useState(initial?.dataBaixa ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseMoneyInput(valor);
    const paid = parseMoneyInput(baixa);

    if (kind === 'pagar' && !accountId) return setError('Escolha a conta.');
    if (kind === 'receber' && !descricao.trim()) return setError('Informe a descrição.');
    if (!validMoney(amount, true)) return setError('Valor inválido: use um número maior que zero, com até 2 casas decimais.');
    if (!validMoney(paid, false)) return setError(`${words.baixa} inválido.`);
    if (!vencimento) return setError('Informe o vencimento.');

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        accountId: accountId ? Number(accountId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        descricao: descricao.trim(),
        valor: amount as number,
        vencimento,
        baixa: paid,
        dataBaixa: dataBaixa || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={initial ? words.editar : words.nova}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="installment-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="installment-form" className="fin-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        {kind === 'pagar' ? (
          <div className="field">
            <label htmlFor="inst-conta">Conta</label>
            <select id="inst-conta" value={accountId} onChange={(e) => setAccountId(e.target.value)} autoFocus>
              <option value="">Selecione…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="inst-categoria">Categoria</label>
            <select id="inst-categoria" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories
                .filter((c) => c.tipo !== 'despesa')
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="field">
          <label htmlFor="inst-desc">Descrição</label>
          <input
            id="inst-desc"
            value={descricao}
            maxLength={255}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={kind === 'pagar' ? 'Opcional (ex.: Luz - parcela 3/12)' : 'Ex.: Salário, Aluguel recebido'}
            autoFocus={kind === 'receber'}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="inst-valor">Valor</label>
            <input id="inst-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field">
            <label htmlFor="inst-venc">Vencimento</label>
            <input id="inst-venc" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="inst-baixa">{words.baixa}</label>
            <input id="inst-baixa" inputMode="decimal" value={baixa} onChange={(e) => setBaixa(e.target.value)} placeholder="Vazio = ainda não" />
          </div>
          <div className="field">
            <label htmlFor="inst-data-baixa">{words.data}</label>
            <input id="inst-data-baixa" type="date" value={dataBaixa} onChange={(e) => setDataBaixa(e.target.value)} />
          </div>
        </div>
      </form>
    </Modal>
  );
}

interface GenerateModalProps {
  kind: InstallmentKind;
  accounts: Count[];
  categories: Category[];
  onClose: () => void;
  onSubmit: (form: GenerateForm) => Promise<unknown>;
}

export function GenerateModal({ kind, accounts, categories, onClose, onSubmit }: GenerateModalProps) {
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [primeiro, setPrimeiro] = useState(todayISO());
  const [qtde, setQtde] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const account = accounts.find((a) => String(a.id) === accountId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseMoneyInput(valor);
    const count = qtde.trim() ? Number(qtde) : undefined;

    if (kind === 'pagar' && !accountId) return setError('Escolha a conta.');
    if (kind === 'receber' && !descricao.trim()) return setError('Informe a descrição.');
    if (kind === 'receber' && !validMoney(amount, true)) return setError('Informe o valor de cada cobrança.');
    if (kind === 'pagar' && !validMoney(amount, false)) return setError('Valor inválido.');
    if (count !== undefined && (!Number.isInteger(count) || count < 1 || count > 60)) return setError('Quantidade deve ser de 1 a 60.');
    if (!primeiro) return setError('Informe o primeiro vencimento.');

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        accountId: accountId ? Number(accountId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        descricao: descricao.trim() || undefined,
        valor: amount,
        primeiro,
        qtde: count,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={kind === 'pagar' ? 'Gerar parcelas da conta' : 'Gerar cobranças mensais'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="generate-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Gerando…' : 'Gerar'}
          </button>
        </>
      }
    >
      <form id="generate-form" className="fin-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        {kind === 'pagar' ? (
          <div className="field">
            <label htmlFor="gen-conta">Conta</label>
            <select id="gen-conta" value={accountId} onChange={(e) => setAccountId(e.target.value)} autoFocus>
              <option value="">Selecione…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div className="field">
              <label htmlFor="gen-desc">Descrição</label>
              <input id="gen-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Salário" autoFocus />
            </div>
            <div className="field">
              <label htmlFor="gen-cat">Categoria</label>
              <select id="gen-cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Sem categoria</option>
                {categories
                  .filter((c) => c.tipo !== 'despesa')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}

        <div className="field-row">
          <div className="field">
            <label htmlFor="gen-valor">Valor de cada uma</label>
            <input
              id="gen-valor"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder={kind === 'pagar' && account?.valor_esperado ? `Da conta: ${account.valor_esperado}` : '0,00'}
            />
          </div>
          <div className="field">
            <label htmlFor="gen-qtde">Quantidade</label>
            <input
              id="gen-qtde"
              type="number"
              min="1"
              max="60"
              value={qtde}
              onChange={(e) => setQtde(e.target.value)}
              placeholder={kind === 'pagar' ? 'Da conta' : '1'}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="gen-primeiro">Primeiro vencimento</label>
          <input id="gen-primeiro" type="date" value={primeiro} onChange={(e) => setPrimeiro(e.target.value)} />
        </div>

        <p className="fin-hint" style={{ margin: 0 }}>
          {kind === 'pagar'
            ? 'Cria uma parcela por mês a partir do primeiro vencimento. Recorrente e Assinatura geram 12; Conta gera a quantidade cadastrada.'
            : 'Cria uma cobrança por mês, mantendo o dia do vencimento.'}
        </p>
      </form>
    </Modal>
  );
}
