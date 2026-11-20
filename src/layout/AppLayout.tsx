import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { sectionLabel } from './navItems';
import { useTheme } from '../lib/theme';
import '../styles/ui.css';

export function AppLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { pathname } = useLocation();

  return (
    <div className="app-shell">
      {isSidebarOpen && <button type="button" className="mobile-scrim" aria-label="Fechar menu" onClick={() => setSidebarOpen(false)} />}

      <Sidebar
        isOpen={isSidebarOpen}
        onNavigate={() => setSidebarOpen(false)}
        onClose={() => setSidebarOpen(false)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <div className="main-area">
        <header className="topbar">
          <button type="button" className="hamburger" aria-label="Abrir menu" onClick={() => setSidebarOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="breadcrumb">
            Meu espaço <span>/</span> <strong>{sectionLabel(pathname)}</strong>
          </div>
          <div className="top-avatar">A</div>
        </header>

        <main className="page-content">
          <Outlet />
          <footer className="page-footer">
            <span>Feito com carinho para a sua vida real.</span>
            <span>
              DOMAIN LIFE <i>·</i> SEU ESPAÇO, NO SEU TEMPO
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
