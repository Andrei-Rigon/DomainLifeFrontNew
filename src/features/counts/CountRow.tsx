import { CreditCard, RefreshCw, Tv } from 'lucide-react';
import { ActionMenu } from '../../components/ActionMenu';
import { formatMoney, toNumber } from './countsUi';
import { OffCashTag } from '../finance/components';
import type { Count, CountType } from '../../api/counts';

interface CountRowProps {
  count: Count;
  onEdit: () => void;
  onDelete: () => void;
}

const TONE: Record<CountType, string> = { Recorrente: 'lilac', Assinatura: 'coral', Conta: 'yellow' };
const ICON: Record<CountType, typeof CreditCard> = { Recorrente: RefreshCw, Assinatura: Tv, Conta: CreditCard };

/** Cartão de uma conta (o "molde": Luz, Netflix...). As parcelas ficam em "A pagar". */
export function CountRow({ count, onEdit, onDelete }: CountRowProps) {
  const expected = toNumber(count.valor_esperado);
  const Icon = ICON[count.tipo] ?? CreditCard;
  const installments = count.tipo === 'Conta' && count.qtde_parceladas ? `${count.qtde_parceladas}x` : null;

  return (
    <article className="panel account-card">
      <div className="account-top">
        <span className={`quick-icon ${TONE[count.tipo] ?? 'lilac'}`}>
          <Icon size={17} />
        </span>
        <ActionMenu onEdit={onEdit} onDelete={onDelete} />
      </div>

      <span>
        <span className="note-tag">{count.tipo}</span>
        {count.contabilizar === false && <OffCashTag />}
      </span>
      <h2>{count.nome}</h2>
      <div className="account-info">
        {count.descricao && <span>{count.descricao}</span>}
        {installments && <span>{installments} parcelas</span>}
        {/* Valor pago oculto: a conta é só o molde; pagamentos ficam em "A pagar". */}
        {!count.descricao && !installments && <span>Sem detalhes</span>}
      </div>

      <div className="account-value">
        <strong>{formatMoney(expected)}</strong>
        <span>{count.tipo === 'Conta' ? 'esperado' : 'por mês'}</span>
      </div>
    </article>
  );
}
