# Domain Life — resumo do front (para remodelar o visual)

App pessoal para facilitar a vida: **agenda, notas, objetivos, contas e controle financeiro**. Uso individual (uma pessoa), no PC e no celular. Quer-se algo **bonito, simples e rápido de usar**, não um sistema corporativo.

## Objetivo do pedido
Melhorar **só o visual e a experiência** (layout, espaçamento, tipografia, cores, ícones, estados vazios, mobile). **Não mudar** o que cada tela faz, os dados, as rotas da API nem a lógica.

## Stack
- React 19 + TypeScript 6 + Vite 8, `react-router-dom` 7 (BrowserRouter).
- **CSS puro** (um `.css` por componente/tela, sem Tailwind e sem biblioteca de UI). Ícones: `lucide-react`. Datas: `date-fns` (pt-BR).
- Editor de notas: TipTap 3 (markdown). Renderização: `react-markdown` + `remark-gfm`.
- Lint: `oxlint`. Rodar: `npm run dev` (porta 5173). Conferir: `npx tsc -p tsconfig.app.json --noEmit` e `npm run build`.
- A API fica em `/api` (proxy do Vite → `localhost:3000`). O proxy injeta o header `X-API-Key` a partir de `API_KEY` no `.env`; **não mexer em `vite.config.ts` nem em `src/api/`**.

## Telas (rotas) e o que cada uma faz
Layout: menu lateral fixo (240px, escuro) + conteúdo. Em ≤768px vira barra superior com menu "hambúrguer" e a lateral abre como gaveta. Não há barra de abas inferior.

| Rota | Tela | O que tem |
|---|---|---|
| `/` | Dashboard | Saldo acumulado, entradas/saídas do mês, último peso; blocos: contas vencendo, agenda 7 dias, tarefas, lembretes/metas |
| `/agendamentos` | Agenda | Calendário com visões **mês / semana / dia**, painel do dia, criar/editar/excluir compromisso (modal) |
| `/notas` | Notas | Grade de cartões coloridos em **2 estilos** (post-it e minimalista), busca, 12 cores + seletor, editor rico no modal, checklists clicáveis |
| `/notas/:id` | Nota em tela cheia | Estilo "Google Docs": barra de formatação fixa, **salva sozinho** (debounce), título e cor editáveis; fica **fora** do layout com menu |
| `/objetivos` | Objetivos | Cartões com barra de progresso (valor guardado/meta), prioridade, filtros Todos/Em andamento/Concluídos |
| `/financeiro` | Visão geral | 4 cartões (entradas, saídas, saldo do mês, saldo acumulado), gastos por categoria (barras), gráfico dos últimos 6 meses, status de contas a pagar/receber |
| `/lancamentos` | Lançamentos | Lista do mês, filtros (tipo, categoria, busca), nova despesa/receita, exportar CSV |
| `/pagar` | Contas a pagar | Parcelas do mês com abas de status, botão "Pagar", gerar parcelas |
| `/receber` | Contas a receber | Igual a pagar, para cobranças (salário, aluguel) |
| `/contas` | Contas (cadastro) | Lista de contas/assinaturas (Recorrente, Conta, Assinatura) |
| `/ajustes-financeiros` | Ajustes | Perfil financeiro (saldo inicial, salário, horas) e categorias com cor |


## Onde está cada coisa
```
src/
  App.tsx                 rotas
  index.css               TOKENS de design (cores claro/escuro, fontes, raios): mude o visual por aqui
  styles/ui.css           componentes visuais compartilhados (menu, topo, painéis, cartões, listas, chips, hero, responsivo)
  layout/                 AppLayout (casca + topo com breadcrumb), Sidebar (menu agrupado), navItems (grupos do menu)
  components/             PageHeading (+PanelHeading, EmptyState), Modal, ConfirmDialog, ActionMenu, forms.css, RichTextEditor, MarkdownContent
  pages/DashboardPage.tsx
  features/agenda|notes|objectives|counts/   telas (objetivos e contas usam as classes de ui.css; agenda e notas ainda têm CSS próprio)
  features/finance/       telas financeiras (usam ui.css); finance.css só tem estilos de formulário
  lib/                    format.ts (dinheiro e datas), useLoad.ts, theme.ts, date.ts
  api/                    chamadas HTTP e tipos  (NÃO ALTERAR)
```

## Sistema visual atual
Baseado no protótipo `Downloads\project` (Next.js/v0), portado para este app **sem mudar funcionalidades**.
- **Fontes:** DM Sans (texto) e Manrope (títulos e números), via Google Fonts em `index.css`.
- **Tokens** (`index.css`): `--canvas`, `--surface`, `--ink`, `--muted`, `--line`, `--purple` (+ `-dark`, `-pale`), `--sidebar` e os tons `--pos`, `--neg`, `--coral`, `--mint`, `--sun`, `--warn`. Tema escuro por `data-theme="dark"`. Os nomes antigos (`--color-*`) são apelidos desses tokens.
- **Estrutura de página:** `<PageHeading eyebrow title subtitle actionLabel onAction />`, depois a barra de filtros (`.page-toolbar` com `.month-switch`, `.segmented`, `.search-field`) e o conteúdo (`.panel`, `.card-grid`, `.list-panel`).
- **Padrões prontos:** cartão hero do saldo, `.quick-card`, `.metric-card`, gráfico de barras, linhas de lançamento e de conta, `.status-pill`, `.note-tag`, estado vazio, menu em gaveta no celular.
- **Botões:** `.primary-button` e `.secondary-button` (telas); `.btn-*` (modais).

## O que ainda pode melhorar
- **Agenda** (calendário mês/semana/dia) e **editor de notas em tela cheia** mantêm o CSS próprio; só herdam cores e fontes dos tokens.
- A linha do tempo do dashboard e o gráfico de evolução são simples (CSS puro, sem eixos).
- Não há barra de abas inferior nem botão flutuante "+" no celular (a ação principal fica no topo da página).
- O perfil e o avatar no menu são fixos ("Andrei" e "A").

## Regras para quem for mexer
1. **Não alterar** `src/api/*`, `vite.config.ts`, rotas nem tipos de dados.
2. Manter o comportamento: modais **não fecham ao clicar fora**; a nota em tela cheia **salva sozinha**; checklists clicáveis; troca de mês; exportar CSV.
3. Usar os **tokens** (nunca cor fixa) e testar **claro, escuro e 375px**.
4. Interface em **português do Brasil**; dinheiro sempre via `formatMoney` (`lib/format.ts`).
5. Depois de mexer: `npx tsc -p tsconfig.app.json --noEmit` e `npm run build` devem passar.
