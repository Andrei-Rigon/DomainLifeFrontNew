import { Link } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Check, CreditCard, Sparkles, Target, Wallet } from 'lucide-react';
import { EmptyState, PageHeading, PanelHeading } from '../components/PageHeading';
import { getBalance } from '../api/finance';
import { getDashboard } from '../api/dashboard';
import { listObjectives } from '../api/objectives';
import { formatDateShort, formatMoney, todayISO } from '../lib/format';
import { useLoad } from '../lib/useLoad';
import { somar } from '../features/finance/math';

const MARKERS = ['lavender', 'peach', 'mint'] as const;

/** "R$ 12.480,50" -> ["R$ 12.480", "50"] (os centavos aparecem menores no cartão) */
function splitCents(value: number): [string, string] {
  const text = formatMoney(value);
  const index = text.lastIndexOf(',');
  return [text.slice(0, index), text.slice(index + 1)];
}

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
}

/** Tela inicial: o que importa agora (dados de GET /dashboard + saldo + objetivos). */
export function DashboardPage() {
  const dashboard = useLoad(getDashboard, []);
  const balance = useLoad(() => getBalance(), []);
  const objectives = useLoad(listObjectives, []);

  const d = dashboard.data;
  const finance = d?.financeiro_mes;
  const today = todayISO();
  const todayLabel = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const agendaToday = (d?.agenda_proximos_7_dias ?? []).filter((a) => a.data_evento === today).length;
  const goals = d?.metas_da_semana ?? [];
  const goalsDone = goals.filter((m) => m.concluida).length;
  const activeObjectives = (objectives.data ?? []).filter((o) => !o.checked).length;
  const dueSoon = d?.parcelas_vencendo_7_dias ?? [];
  const dueTotal = somar(dueSoon.map((p) => p.valor_parcela));

  // /dashboard demora ~1,7 s. Enquanto não chega, mostramos "…" em vez de zeros
  // e "Nada pendente", que pareciam dados reais e davam a impressão de tela quebrada.
  const loadingDash = !d && !dashboard.error;
  const loadingBalance = !balance.data && !balance.error;
  const loadingObjectives = !objectives.data && !objectives.error;
  const wait = (text: string, loading: boolean) => (loading ? '…' : text);

  const [units, cents] = splitCents(balance.data?.saldo ?? 0);
  const monthResult = finance?.saldo ?? 0;
  const error = dashboard.error ?? balance.error;

  return (
    <>
      <PageHeading eyebrow={todayLabel} title={`${greeting()}, Andrei`} subtitle="Um novo dia para cuidar do que importa." />

      {error && <div className="error-banner">{error}</div>}

      <section className="hero-card">
        <div className="hero-copy">
          <div className="hero-label">
            <Wallet size={15} /> SEU RESUMO FINANCEIRO
          </div>
          <p className="hero-title">Saldo acumulado</p>
          <div className="hero-value">
            {loadingBalance ? (
              'R$ …'
            ) : (
              <>
                {units}
                <span className="cents">,{cents}</span>
              </>
            )}
            {!loadingDash && (
              <span className={`hero-trend${monthResult < 0 ? ' is-negative' : ''}`}>
                {monthResult < 0 ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                {formatMoney(Math.abs(monthResult))} no mês
              </span>
            )}
          </div>
          <p className="hero-footnote">saldo inicial + tudo que entrou − tudo que saiu, até hoje</p>
          <div className="hero-stats">
            <div>
              <span className="stat-icon stat-in">
                <ArrowDownLeft size={15} />
              </span>
              <div>
                <small>Entradas do mês</small>
                <strong>{wait(formatMoney(finance?.entradas), loadingDash)}</strong>
              </div>
            </div>
            <div>
              <span className="stat-icon stat-out">
                <ArrowUpRight size={15} />
              </span>
              <div>
                <small>Saídas do mês</small>
                <strong>{wait(formatMoney(finance?.saidas), loadingDash)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-visual" aria-hidden="true">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-core">+</div>
          <div className="visual-dot dot-one" />
          <div className="visual-dot dot-two" />
          <div className="visual-dot dot-three" />
          <div className="visual-caption">
            suas finanças
            <br />
            em equilíbrio
          </div>
        </div>
        <div className="hero-decoration">✳</div>
      </section>

      <section className="quick-stats">
        <article className="quick-card">
          <div className="quick-top">
            <span className="quick-icon coral">
              <CalendarDays size={17} />
            </span>
            <span className="quick-note">HOJE</span>
          </div>
          <strong className="quick-number">{wait(String(agendaToday), loadingDash)}</strong>
          <span className="quick-label">{agendaToday === 1 ? 'compromisso na agenda' : 'compromissos na agenda'}</span>
          <Link className="text-link" to="/agendamentos">
            Ver agenda →
          </Link>
        </article>

        <article className="quick-card">
          <div className="quick-top">
            <span className="quick-icon lilac">
              <Check size={17} />
            </span>
            <span className="quick-note">ESTA SEMANA</span>
          </div>
          <strong className="quick-number">{wait(`${goalsDone}/${goals.length}`, loadingDash)}</strong>
          <span className="quick-label">metas concluídas</span>
          <div className="mini-progress">
            <span style={{ width: `${goals.length ? (goalsDone / goals.length) * 100 : 0}%` }} />
          </div>
        </article>

        <article className="quick-card">
          <div className="quick-top">
            <span className="quick-icon green">
              <Target size={17} />
            </span>
            <span className="quick-note">EM ANDAMENTO</span>
          </div>
          <strong className="quick-number">{wait(String(activeObjectives), loadingObjectives)}</strong>
          <span className="quick-label">{activeObjectives === 1 ? 'objetivo ativo' : 'objetivos ativos'}</span>
          <Link className="text-link" to="/objetivos">
            Acompanhar →
          </Link>
        </article>

        <article className="quick-card">
          <div className="quick-top">
            <span className="quick-icon yellow">
              <CreditCard size={17} />
            </span>
            <span className="quick-note">PRÓXIMOS 7 DIAS</span>
          </div>
          <strong className="quick-number">{wait(formatMoney(dueTotal), loadingDash)}</strong>
          <span className="quick-label">em contas a vencer</span>
          <Link className="text-link" to="/pagar">
            Conferir contas →
          </Link>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <PanelHeading kicker="PRÓXIMOS 7 DIAS" title="Agenda" />
          {loadingDash ? (
            <p className="muted-caption">Carregando…</p>
          ) : (d?.agenda_proximos_7_dias ?? []).length === 0 ? (
            <EmptyState icon={<CalendarDays size={22} />} title="Nenhum compromisso por perto" text="Que tal aproveitar para descansar?" />
          ) : (
            <div className="agenda-list">
              {d!.agenda_proximos_7_dias.slice(0, 5).map((a, i) => (
                <div className="timeline-row" key={a.id}>
                  <div className="timeline-time">{a.hora_evento ? a.hora_evento.slice(0, 5) : formatDateShort(a.data_evento)}</div>
                  <div className={`timeline-marker ${MARKERS[i % MARKERS.length]}`}>
                    <span />
                  </div>
                  <div className="timeline-event">
                    <strong>{a.titulo}</strong>
                    <span>{[a.hora_evento ? formatDateShort(a.data_evento) : null, a.localizacao].filter(Boolean).join(' · ') || 'Dia todo'}</span>
                  </div>
                  {i === 0 && <span className="now-tag">A seguir</span>}
                </div>
              ))}
            </div>
          )}
          <Link className="panel-footer-link" to="/agendamentos">
            Ver agenda completa →
          </Link>
        </article>

        <article className="panel">
          <PanelHeading kicker="SEU FOCO" title="Tarefas e metas" />
          <div className="task-list">
            {(d?.tarefas_em_andamento ?? []).map((t) => (
              <div className="task-row" key={`t${t.id}`}>
                <span className="check-box" />
                <span>{t.titulo}</span>
                <span className="task-date">{t.prazo ? formatDateShort(t.prazo) : t.prioridade}</span>
              </div>
            ))}
            {goals.map((m) => (
              <div className={`task-row ${m.concluida ? 'task-done' : ''}`} key={`m${m.id}`}>
                <span className="check-box">{m.concluida && <Check size={13} />}</span>
                <span>{m.titulo}</span>
                <span className="task-date">meta da semana</span>
              </div>
            ))}
            {loadingDash && <p className="muted-caption">Carregando…</p>}
            {!loadingDash && (d?.tarefas_em_andamento ?? []).length + goals.length === 0 && (
              <EmptyState icon={<Sparkles size={22} />} title="Nada pendente por aqui" text="Seu foco está livre." />
            )}
          </div>
          {dueSoon.length > 0 && (
            <>
              <div className="panel-kicker" style={{ marginTop: 16 }}>CONTAS VENCENDO</div>
              {dueSoon.slice(0, 3).map((p) => (
                <div className="task-row" key={`p${p.id}`}>
                  <span className="check-box" />
                  <span>{p.descricao ?? 'Conta'}</span>
                  <span className="task-date">
                    {formatDateShort(p.data_vencimento)} · {formatMoney(p.valor_parcela)}
                  </span>
                </div>
              ))}
            </>
          )}
        </article>
      </section>
    </>
  );
}
