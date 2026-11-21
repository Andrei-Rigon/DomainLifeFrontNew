import { useRef, useState, type FormEvent } from 'react';
import { Modal } from '../../components/Modal';
import '../../components/forms.css';
import './finance.css';
import type { BankAccount, Category } from '../../api/finance';
import { BankAccountSelect, CaixaCheck } from './components';
import { lastBankAccount, rememberBankAccount } from './bankAccounts';
import type { Count } from '../../api/counts';
import { formatMoney, hasTooManyDecimals, moneyToInput, parseMoneyInput, todayISO } from '../../lib/format';

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
  contabilizar: boolean;
  bankAccountId?: number | null; // conta bancária de onde saiu/entrou
}

export interface GenerateForm {
  accountId?: number;
  categoryId?: number;
  descricao?: string;
  valor?: number;
  primeiro: string;
  qtde?: number;
  contabilizar: boolean;
}

export interface InstallmentInitial {
  accountId?: number;
  categoryId?: number | null;
  descricao: string;
  valor: number;
  vencimento: string;
  baixa: number | null;
  dataBaixa: string | null;
  contabilizar: boolean;
  bankAccountId?: number | null;
}

const CAIXA_HINT = {
  pagar: 'Desmarque se esta conta já é paga por outro meio lançado (ex.: assinatura no cartão), para não duplicar no saldo.',
  receber: 'Desmarque se este valor já entra no caixa por outro lançamento, para não duplicar.',
};

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
  bankAccounts?: BankAccount[];
  onClose: () => void;
  onSubmit: (form: InstallmentForm) => Promise<unknown>;
}

export function InstallmentFormModal({ kind, initial, accounts, categories, bankAccounts = [], onClose, onSubmit }: FormModalProps) {
  const words = WORDS[kind];
  const [accountId, setAccountId] = useState(initial?.accountId ? String(initial.accountId) : '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ? String(initial.categoryId) : '');
  const [descricao, setDescricao] = useState(initial?.descricao ?? '');
  const [valor, setValor] = useState(initial ? moneyToInput(initial.valor) : '');
  const [vencimento, setVencimento] = useState(initial?.vencimento ?? todayISO());
  const [baixa, setBaixa] = useState(initial?.baixa != null ? moneyToInput(initial.baixa) : '');
  const [dataBaixa, setDataBaixa] = useState(initial?.dataBaixa ?? '');
  const [contabilizar, setContabilizar] = useState(initial?.contabilizar ?? true);
  const [bank, setBank] = useState(initial ? (initial.bankAccountId ? String(initial.bankAccountId) : '') : lastBankAccount());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Último valor preenchido automaticamente: se o usuário digitou outro, não sobrescreve.
  const autoFilled = useRef('');

  /**
   * Nova parcela de "A pagar": ao escolher a conta, já traz o valor esperado dela
   * como valor e valor pago (e a data de hoje), para registrar o pagamento com um clique.
   * Na edição não mexe em nada, para não alterar um registro existente sem querer.
   */
  function handleAccountChange(id: string) {
    setAccountId(id);
    if (initial) return;
    const account = accounts.find((a) => String(a.id) === id);
    // Herda da conta: assinatura paga no cartão já vem desmarcada
    setContabilizar(account?.contabilizar ?? true);
    const expected = account?.valor_esperado;
    if (expected === null || expected === undefined || expected === '') return;
    const text = moneyToInput(expected);
    const previous = autoFilled.current;
    if (!valor || valor === previous) setValor(text);
    if (!baixa || baixa === previous) setBaixa(text);
    if (!dataBaixa) setDataBaixa(todayISO());
    autoFilled.current = text;
  }

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
        contabilizar,
        bankAccountId: bank ? Number(bank) : null,
      });
      rememberBankAccount(bank);
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
            <select id="inst-conta" value={accountId} onChange={(e) => handleAccountChange(e.target.value)} autoFocus>
              <option value="">Selecione…</option>
              {/* Parcela de uma conta já excluída: mantém o vínculo, senão a edição travava em "Escolha a conta". */}
              {accountId && !accounts.some((a) => String(a.id) === accountId) && (
                <option value={accountId}>Conta excluída (#{accountId})</option>
              )}
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

        {bankAccounts.length > 0 && (
          <BankAccountSelect id="inst-banco" label="Conta bancária" accounts={bankAccounts} value={bank} onChange={setBank} />
        )}

        <CaixaCheck checked={contabilizar} onChange={setContabilizar} hint={CAIXA_HINT[kind]} />
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
  const [contabilizar, setContabilizar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const account = accounts.find((a) => String(a.id) === accountId);
  // Último valor preenchido automaticamente: se o usuário digitou outro, não sobrescreve.
  const autoFilled = useRef('');

  /** Ao escolher a conta, já traz o valor esperado dela como valor de cada parcela. */
  function handleAccountChange(id: string) {
    setAccountId(id);
    setContabilizar(accounts.find((a) => String(a.id) === id)?.contabilizar ?? true);
    const expected = accounts.find((a) => String(a.id) === id)?.valor_esperado;
    if (expected === null || expected === undefined || expected === '') return;
    const text = moneyToInput(expected);
    if (!valor || valor === autoFilled.current) setValor(text);
    autoFilled.current = text;
  }

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
        contabilizar,
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
            <select id="gen-conta" value={accountId} onChange={(e) => handleAccountChange(e.target.value)} autoFocus>
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
              placeholder={kind === 'pagar' && account?.valor_esperado ? `Da conta: ${moneyToInput(account.valor_esperado)}` : '0,00'}
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

        <CaixaCheck checked={contabilizar} onChange={setContabilizar} hint={CAIXA_HINT[kind]} />

        <p className="fin-hint" style={{ margin: 0 }}>
          {kind === 'pagar'
            ? 'Cria uma parcela por mês a partir do primeiro vencimento. Recorrente e Assinatura geram 12; Conta gera a quantidade cadastrada.'
            : 'Cria uma cobrança por mês, mantendo o dia do vencimento.'}
        </p>
      </form>
    </Modal>
  );
}

// ------------------------------------------------------------------ dar baixa

export interface SettleForm {
  valor: number;
  data: string;
  bankAccountId?: number | null;
}

interface SettleModalProps {
  kind: InstallmentKind;
  title: string;
  expected: number;
  offCash?: boolean;
  bankAccounts?: BankAccount[];
  defaultBankAccountId?: number | null;
  onClose: () => void;
  onSubmit: (form: SettleForm) => Promise<unknown>;
}

/**
 * Confirmação do botão "Pagar"/"Receber": a conta nem sempre vem com o mesmo valor
 * (luz, água...), então o usuário confirma ou corrige o valor e a data antes de dar baixa.
 */
export function SettleModal({
  kind,
  title,
  expected,
  offCash = false,
  bankAccounts = [],
  defaultBankAccountId,
  onClose,
  onSubmit,
}: SettleModalProps) {
  const words = WORDS[kind];
  const [valor, setValor] = useState(moneyToInput(expected));
  const [data, setData] = useState(todayISO());
  const [bank, setBank] = useState(defaultBankAccountId ? String(defaultBankAccountId) : lastBankAccount());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const amount = parseMoneyInput(valor);
  const changed = amount !== undefined && !Number.isNaN(amount) && amount !== expected;
  const confirmLabel = kind === 'pagar' ? 'Confirmar pagamento' : 'Confirmar recebimento';

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validMoney(amount, true)) return setError('Informe um valor maior que zero, com até 2 casas decimais.');
    if (!data) return setError(`Informe a ${words.data.toLowerCase()}.`);

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ valor: amount as number, data, bankAccountId: bank ? Number(bank) : null });
      rememberBankAccount(bank);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível dar baixa.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={confirmLabel}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="settle-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : confirmLabel}
          </button>
        </>
      }
    >
      <form id="settle-form" className="fin-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <p className="fin-hint" style={{ margin: 0 }}>
          <strong>{title}</strong> · valor previsto {formatMoney(expected)}
        </p>

        <div className="field-row">
          <div className="field">
            <label htmlFor="settle-valor">{words.baixa}</label>
            <input id="settle-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" autoFocus />
          </div>
          <div className="field">
            <label htmlFor="settle-data">{words.data}</label>
            <input id="settle-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        {bankAccounts.length > 0 && (
          <BankAccountSelect
            id="settle-banco"
            label={kind === 'pagar' ? 'Pago com a conta' : 'Recebido na conta'}
            accounts={bankAccounts}
            value={bank}
            onChange={setBank}
          />
        )}

        {offCash && (
          <p className="fin-hint" style={{ margin: 0 }}>
            Está marcada como <strong>fora do caixa</strong>: fica registrada como {kind === 'pagar' ? 'paga' : 'recebida'}, mas não entra
            no saldo.
          </p>
        )}

        {changed && (
          <p className="fin-hint" style={{ margin: 0 }}>
            O valor é diferente do previsto. Ao confirmar, {kind === 'pagar' ? 'a parcela' : 'a cobrança'} deste mês passa a valer{' '}
            {formatMoney(amount as number)} e fica como {kind === 'pagar' ? 'paga' : 'recebida'}.
          </p>
        )}
      </form>
    </Modal>
  );
}
