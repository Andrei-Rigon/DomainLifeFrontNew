import { NavLink } from 'react-router-dom';
import { Moon, Sparkles, Sun, X } from 'lucide-react';
import { NAV_GROUPS } from './navItems';
import type { Theme } from '../lib/theme';

interface SidebarProps {
  isOpen: boolean;
  onNavigate: () => void;
  onClose: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Sidebar({ isOpen, onNavigate, onClose, theme, onToggleTheme }: SidebarProps) {
  const isDark = theme === 'dark';

  return (
    <aside className={['sidebar', isOpen ? 'sidebar-open' : ''].filter(Boolean).join(' ')}>
      <div className="brand">
        <div className="brand-mark">
          <Sparkles size={19} strokeWidth={2.2} />
        </div>
        <span>
          domain<span className="brand-light">life</span>
        </span>
        <button type="button" className="mobile-close" aria-label="Fechar menu" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      <div className="profile">
        <div className="avatar">A</div>
        <div className="profile-copy">
          <strong>Andrei</strong>
          <span>Meu espaço pessoal</span>
        </div>
      </div>

      <nav className="side-nav" aria-label="Navegação principal">
        {NAV_GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-caption">{group.label}</p>
            {group.items.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                end={path === '/'}
                onClick={onNavigate}
                className={({ isActive }) => ['nav-item', isActive ? 'nav-active' : ''].filter(Boolean).join(' ')}
              >
                <Icon size={17} strokeWidth={1.8} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="sidebar-tip">
          <div className="tip-icon">
            <Sparkles size={15} />
          </div>
          <strong>Um passo de cada vez</strong>
          <p>Pequenos progressos também são progresso.</p>
        </div>
        <button type="button" className="theme-toggle" onClick={onToggleTheme}>
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
          <span>{isDark ? 'Tema claro' : 'Tema escuro'}</span>
          <span className={`switch ${isDark ? 'switch-on' : ''}`} />
        </button>
      </div>
    </aside>
  );
}
