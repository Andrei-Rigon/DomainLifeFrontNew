import { Calendar, Target } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { formatCurrency, formatDate, getPriorityStyle, getProgress } from './objectivesUi';
import type { Objective } from '../../api/objectives';

interface ObjectiveCardProps {
  objective: Objective;
  onToggleChecked: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TONE_BY_PRIORITY: Record<string, string> = { alta: 'coral', media: 'lilac', baixa: 'green' };

export function ObjectiveCard({ objective, onToggleChecked, onEdit, onDelete }: ObjectiveCardProps) {
  const priority = getPriorityStyle(objective.prioridade);
  const progress = getProgress(objective);
  const isChecked = objective.checked;
  const tone = TONE_BY_PRIORITY[(objective.prioridade ?? '').toLowerCase()] ?? 'lilac';

  return (
    <article className={`panel goal-card${isChecked ? ' goal-card--done' : ''}`}>
      <div className="goal-card-top">
        <span className={`goal-icon ${isChecked ? 'green' : tone}`}>
          <Target size={18} />
        </span>
        <ActionMenu onEdit={onEdit} onDelete={onDelete} />
      </div>

      <span className="note-tag" style={{ alignSelf: 'flex-start' }}>
        {isChecked ? 'Concluído' : priority.label}
      </span>
      <h2>{objective.titulo}</h2>
      {objective.descricao && <p className="goal-desc">{objective.descricao}</p>}

      <div className="goal-values">
        <strong>{formatCurrency(objective.valor_guardado)}</strong>
        <span>de {formatCurrency(objective.valor_objetivo)}</span>
        <b>{progress}%</b>
      </div>
      <div className="goal-progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="goal-foot">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Calendar size={13} />
          {isChecked ? `Concluído em ${formatDate(objective.prazo)}` : `Prazo: ${formatDate(objective.prazo)}`}
        </span>
        <button type="button" className="text-link" onClick={onToggleChecked}>
          {isChecked ? 'Reabrir' : 'Concluir'} →
        </button>
      </div>
    </article>
  );
}
