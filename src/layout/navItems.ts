import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Home,
  Receipt,
  Settings2,
  Target,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Menu lateral, agrupado. A ordem aqui é a ordem na tela. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'INÍCIO',
    items: [{ label: 'Visão geral', path: '/', icon: Home }],
  },
  {
    label: 'DIA A DIA',
    items: [
      { label: 'Agenda', path: '/agendamentos', icon: CalendarDays },
      { label: 'Notas', path: '/notas', icon: FileText },
      { label: 'Objetivos', path: '/objetivos', icon: Target },
    ],
  },
  {
    label: 'DINHEIRO',
    items: [
      { label: 'Financeiro', path: '/financeiro', icon: Wallet },
      { label: 'Lançamentos', path: '/lancamentos', icon: ArrowLeftRight },
      { label: 'A pagar', path: '/pagar', icon: ArrowUpRight },
      { label: 'A receber', path: '/receber', icon: ArrowDownLeft },
      { label: 'Contas', path: '/contas', icon: Receipt },
      { label: 'Ajustes', path: '/ajustes-financeiros', icon: Settings2 },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Nome da tela para o "breadcrumb" do topo. */
export function sectionLabel(pathname: string): string {
  const found = NAV_ITEMS.find((item) => (item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)));
  return found?.label ?? 'Visão geral';
}
