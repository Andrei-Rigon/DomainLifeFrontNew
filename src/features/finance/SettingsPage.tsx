import { useEffect, useState, type FormEvent } from 'react';
import { Check, Plus } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Modal } from '../../components/Modal';
import { PageHeading, PanelHeading } from '../../components/PageHeading';
import '../../components/forms.css';
import {
  type BankAccount,
  type BankAccountKind,
  type BankAccountPayload,
  type Category,
  type CategoryKind,
  createBankAccount,
  createCategory,
  deleteBankAccount,
  deleteCategory,
  listBankAccounts,
  updateBankAccount,
  getProfile,
  listCategories,
  saveProfile,
  updateCategory,
} from '../../api/finance';
import { formatMoney, hasTooManyDecimals, moneyToInput, parseMoneyInput } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';
import { BANK_KIND_LABEL } from './bankAccounts';
import './finance.css';

const KINDS: { value: CategoryKind; label: string }[] = [
  { value: 'despesa', label: 'Despesa' },
  { value: 'receita', label: 'Receita' },
  { value: 'ambos', label: 'Ambos' },
];

const COLORS = ['#8679db', '#7c8fe0', '#70b89b', '#e0b55f', '#e7a07c', '#dd8c9c', '#d47767', '#a9afbb'];

export function SettingsPage() {
  return (
    <>
      <PageHeading
        eyebrow="Ajuste ao seu jeito"
        title="Ajustes financeiros"
        subtitle="Personalize os detalhes que ajudam a organizar sua vida financeira."
      />
      <div className="settings-layout">
        <ProfileSection />
        <BankAccountsSection />
        <CategoriesSection />
      </div>
    </>
  );
}

function ProfileSection() {
  const profile = useLoad(getProfile, []);
  const [initial, setInitial] = useState('');
  const [salary, setSalary] = useState('');
  const [days, setDays] = useState('22');
  const [hours, setHours] = useState('8');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setInitial(moneyToInput(p.saldo_inicial ?? 0));
    setSalary(p.salario_liquido != null ? moneyToInput(p.salario_liquido) : '');
    setDays(String(p.dias_trabalhados_mes ?? 22));
    setHours(String(p.horas_por_dia ?? 8).replace('.', ','));
  }, [profile.data]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const saldo = parseMoneyInput(initial);
    const sal = parseMoneyInput(salary);
    const d = Number(days);
    const h = parseMoneyInput(hours);

    const bad = (v: number | undefined) => v !== undefined && (Number.isNaN(v) || hasTooManyDecimals(v));
    if (bad(saldo) || bad(sal) || (sal !== undefined && sal < 0)) return setMessage({ ok: false, text: 'Valores inválidos (use até 2 casas decimais).' });
    if (!Number.isInteger(d) || d < 1 || d > 31) return setMessage({ ok: false, text: 'Dias trabalhados deve ser de 1 a 31.' });
    if (h === undefined || Number.isNaN(h) || h < 0.5 || h > 24) return setMessage({ ok: false, text: 'Horas por dia deve ser de 0,5 a 24.' });

    setSaving(true);
    setMessage(null);
    try {
      // Salário em branco vai como null para apagar o valor salvo (undefined não mudava nada).
      await saveProfile({ saldo_inicial: saldo ?? 0, salario_liquido: sal ?? null, dias_trabalhados_mes: d, horas_por_dia: h });
      setMessage({ ok: true, text: 'Alterações salvas.' });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Não foi possível salvar.' });
    } finally {
      setSaving(false);
    }
  }

  const sal = parseMoneyInput(salary);
  const hrs = parseMoneyInput(hours);
  const hourly = sal && Number(days) > 0 && hrs ? sal / (Number(days) * hrs) : null;

  return (
    <section className="panel settings-panel">
      <PanelHeading kicker="SEU PLANEJAMENTO" title="Perfil financeiro" />
      <p className="settings-intro">Essas informações ajudam a compor seus resumos e o cálculo de quanto uma compra custa em horas de trabalho.</p>
      {profile.error && <div className="error-banner">{profile.error}</div>}
      <form className="fin-form" onSubmit={handleSubmit}>
        {message && <div className={message.ok ? 'gentle-note' : 'form-error'}>{message.text}</div>}
        <div className="field">
          <label htmlFor="perfil-saldo">Saldo inicial</label>
          <input id="perfil-saldo" inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} placeholder="0,00" />
          <span className="fin-hint">
            Quanto você já tinha ao começar a usar o sistema. Entra no saldo acumulado. Se cadastrar contas bancárias, prefira o saldo
            inicial de cada conta e deixe este em zero.
          </span>
        </div>
        <div className="field">
          <label htmlFor="perfil-salario">Salário líquido</label>
          <input id="perfil-salario" inputMode="decimal" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0,00" />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="perfil-dias">Dias trabalhados por mês</label>
            <input id="perfil-dias" type="number" min="1" max="31" value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="perfil-horas">Horas por dia</label>
            <input id="perfil-horas" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
          </div>
        </div>
        {hourly !== null && (
          <span className="fin-hint">
            Sua hora de trabalho vale cerca de <strong>{formatMoney(hourly)}</strong>.
          </span>
        )}
        <div>
          <button type="submit" className="primary-button" disabled={saving}>
            <Check size={15} /> {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </section>
  );
}

function CategoriesSection() {
  const categories = useLoad(listCategories, []);
  const [form, setForm] = useState<{ category?: Category } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <section className="panel settings-panel">
      <PanelHeading
        kicker="ORGANIZE SEUS GASTOS"
        title="Categorias"
        action={
          <button type="button" className="secondary-button" onClick={() => setForm({})}>
            <Plus size={14} /> Nova categoria
          </button>
        }
      />
      {categories.error && <div className="error-banner">{categories.error}</div>}

      <div className="settings-category">
        {(categories.data ?? []).map((c) => (
          <div key={c.id}>
            <i style={{ background: c.cor ?? 'var(--line-strong)' }} />
            <span className="grow">{c.nome}</span>
            <span className="note-tag">{c.tipo}</span>
            <ActionMenu
              onEdit={() => setForm({ category: c })}
              onDelete={() => {
                setDeleteError(null);
                setDeleteTarget(c);
              }}
            />
          </div>
        ))}
      </div>

      {form && (
        <CategoryModal
          category={form.category}
          onClose={() => setForm(null)}
          onSubmit={async (payload) => {
            if (form.category) await updateCategory(form.category.id, payload);
            else await createCategory(payload);
            await categories.reload();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir categoria"
          message={deleteError ?? `Excluir a categoria "${deleteTarget.nome}"? Só é possível se ela não tiver lançamentos.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await deleteCategory(deleteTarget.id);
              setDeleteTarget(null);
              await categories.reload();
            } catch (err) {
              setDeleteError(err instanceof Error ? err.message : 'Não foi possível excluir.');
            }
          }}
        />
      )}
    </section>
  );
}

function CategoryModal({
  category,
  onClose,
  onSubmit,
}: {
  category?: Category;
  onClose: () => void;
  onSubmit: (payload: { nome: string; tipo: CategoryKind; cor?: string | null }) => Promise<unknown>;
}) {
  const [nome, setNome] = useState(category?.nome ?? '');
  const [tipo, setTipo] = useState<CategoryKind>(category?.tipo ?? 'despesa');
  const [cor, setCor] = useState(category?.cor ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nome.trim()) return setError('Informe o nome.');
    setSubmitting(true);
    setError(null);
    try {
      // Na edição, cor desmarcada vai como null para a API apagar a cor antiga.
      await onSubmit({ nome: nome.trim(), tipo, cor: cor || (category ? null : undefined) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={category ? 'Editar categoria' : 'Nova categoria'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="category-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="category-form" className="fin-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="cat-nome">Nome</label>
          <input id="cat-nome" value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="cat-tipo">Tipo</label>
          <select id="cat-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as CategoryKind)}>
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Cor</label>
          <div className="fin-color-picker">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor ${c}`}
                className={`fin-color-dot${cor === c ? ' fin-color-dot--active' : ''}`}
                style={{ background: c }}
                onClick={() => setCor(cor === c ? '' : c)}
              />
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

const BANK_KINDS: BankAccountKind[] = ['corrente', 'investimento', 'cartao'];

function BankAccountsSection() {
  const accounts = useLoad(listBankAccounts, []);
  const [form, setForm] = useState<{ account?: BankAccount } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <section className="panel settings-panel">
      <PanelHeading
        kicker="ONDE ESTÁ O SEU DINHEIRO"
        title="Contas bancárias"
        action={
          <button type="button" className="secondary-button" onClick={() => setForm({})}>
            <Plus size={14} /> Nova conta
          </button>
        }
      />
      <p className="settings-intro">
        Sicoob, Nubank, investimentos, cartão… Cada lançamento pode dizer de qual conta saiu, e transferências entre elas não contam como
        gasto.
      </p>
      {accounts.error && <div className="error-banner">{accounts.error}</div>}

      <div className="settings-category">
        {(accounts.data ?? []).map((a) => (
          <div key={a.id} style={a.ativa ? undefined : { opacity: 0.55 }}>
            <span className="grow">
              {a.nome}
              {!a.ativa && ' (inativa)'}
            </span>
            <span className="note-tag">{BANK_KIND_LABEL[a.tipo] ?? a.tipo}</span>
            <span className="muted-caption">inicial {formatMoney(a.saldo_inicial)}</span>
            <ActionMenu
              onEdit={() => setForm({ account: a })}
              onDelete={() => {
                setDeleteError(null);
                setDeleteTarget(a);
              }}
            />
          </div>
        ))}
        {accounts.data?.length === 0 && <p className="muted-caption">Nenhuma conta cadastrada ainda.</p>}
      </div>

      {form && (
        <BankAccountModal
          account={form.account}
          onClose={() => setForm(null)}
          onSubmit={async (payload) => {
            if (form.account) await updateBankAccount(form.account.id, payload);
            else await createBankAccount(payload);
            await accounts.reload();
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Excluir conta bancária"
          message={deleteError ?? `Excluir a conta "${deleteTarget.nome}"? Só é possível se ela não tiver movimentação; senão, desative.`}
          confirmLabel="Excluir"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            try {
              await deleteBankAccount(deleteTarget.id);
              setDeleteTarget(null);
              await accounts.reload();
            } catch (err) {
              setDeleteError(err instanceof Error ? err.message : 'Não foi possível excluir.');
            }
          }}
        />
      )}
    </section>
  );
}

function BankAccountModal({
  account,
  onClose,
  onSubmit,
}: {
  account?: BankAccount;
  onClose: () => void;
  onSubmit: (payload: BankAccountPayload) => Promise<unknown>;
}) {
  const [nome, setNome] = useState(account?.nome ?? '');
  const [tipo, setTipo] = useState<BankAccountKind>(account?.tipo ?? 'corrente');
  const [inicial, setInicial] = useState(account ? moneyToInput(account.saldo_inicial) : '');
  const [ativa, setAtiva] = useState(account?.ativa ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!nome.trim()) return setError('Informe o nome.');
    // Aceita negativo (ex.: cartão com fatura em aberto)
    const negative = inicial.trim().startsWith('-');
    const parsed = parseMoneyInput(inicial.replace('-', ''));
    if (parsed !== undefined && (Number.isNaN(parsed) || hasTooManyDecimals(parsed))) return setError('Saldo inicial inválido.');
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ nome: nome.trim(), tipo, saldo_inicial: (parsed ?? 0) * (negative ? -1 : 1), ativa });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={account ? 'Editar conta bancária' : 'Nova conta bancária'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="bank-account-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <form id="bank-account-form" className="fin-form" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}
        <div className="field">
          <label htmlFor="bank-nome">Nome</label>
          <input id="bank-nome" value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Nubank" autoFocus />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="bank-tipo">Tipo</label>
            <select id="bank-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as BankAccountKind)}>
              {BANK_KINDS.map((k) => (
                <option key={k} value={k}>
                  {BANK_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="bank-inicial">Saldo inicial</label>
            <input id="bank-inicial" inputMode="decimal" value={inicial} onChange={(e) => setInicial(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <span className="fin-hint">Saldo da conta no dia em que você começou a lançar nela.</span>
        {account && (
          <label className="caixa-check">
            <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} />
            <span>
              <strong>Conta ativa</strong>
              <small>Desative para esconder dos formulários sem perder o histórico.</small>
            </span>
          </label>
        )}
      </form>
    </Modal>
  );
}
