import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import '../styles/ui.css';

interface PageHeadingProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Botão principal à direita (ex.: "Nova nota"). */
  actionLabel?: string;
  onAction?: () => void;
  /** Conteúdo extra à direita, no lugar do botão padrão. */
  children?: ReactNode;
}

/** Cabeçalho padrão de todas as telas: etiqueta pequena, título, frase e ação principal. */
export function PageHeading({ eyebrow, title, subtitle, actionLabel, onAction, children }: PageHeadingProps) {
  return (
    <section className="welcome-row">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p className="welcome-sub">{subtitle}</p>
      </div>
      {children}
      {actionLabel && onAction && (
        <button type="button" className="primary-button is-header" onClick={onAction}>
          <Plus size={17} />
          {actionLabel}
        </button>
      )}
    </section>
  );
}

export function PanelHeading({ kicker, title, action }: { kicker: string; title: string; action?: ReactNode }) {
  return (
    <div className="panel-heading">
      <div>
        <div className="panel-kicker">{kicker}</div>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
