import { useMemo, useState } from 'react';
import { AddLiquidityQuote } from '../../core/types';
import { formatFp, formatPercentFp, safeParseFp } from '../../core/math';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';
import { NumberField } from '../common/NumberField';

interface AddLiquidityCardProps {
  tokenXSymbol: string;
  tokenYSymbol: string;
  reserveX: bigint;
  reserveY: bigint;
  onQuote: (amountX: bigint, amountY: bigint) => AddLiquidityQuote;
  onAdd: (amountX: bigint, amountY: bigint) => AddLiquidityQuote;
}

export function AddLiquidityCard({
  tokenXSymbol,
  tokenYSymbol,
  reserveX,
  reserveY,
  onQuote,
  onAdd
}: AddLiquidityCardProps) {
  const [amountXText, setAmountXText] = useState('10');
  const [amountYText, setAmountYText] = useState('20000');
  const [message, setMessage] = useState<string | null>(null);

  const amountX = safeParseFp(amountXText);
  const amountY = safeParseFp(amountYText);

  const quote = useMemo(() => {
    if (amountX === null || amountY === null) {
      return null;
    }
    return onQuote(amountX, amountY);
  }, [amountX, amountY, onQuote]);

  const ratio = reserveX > 0n ? Number(reserveY) / Number(reserveX) : 0;

  const onAutofill = () => {
    if (!ratio) {
      return;
    }
    const x = Number(amountX ?? 0n) / 1e18;
    setAmountYText((x * ratio).toFixed(4));
  };

  const onSubmit = () => {
    if (amountX === null || amountY === null) {
      setMessage('请输入合法数字');
      return;
    }
    const result = onAdd(amountX, amountY);
    if (!result.ok) {
      setMessage(result.error ?? 'Add liquidity failed');
      return;
    }
    setMessage('流动性已添加并写入历史');
  };

  return (
    <Card title="Add Liquidity">
      <NumberField
        label={`Amount ${tokenXSymbol}`}
        value={amountXText}
        onChange={setAmountXText}
        step="0.0001"
        min="0"
      />
      <NumberField
        label={`Amount ${tokenYSymbol}`}
        value={amountYText}
        onChange={setAmountYText}
        step="0.0001"
        min="0"
        helper="输入不按池子比例时会自动裁剪并退款"
      />

      <div className="quick-actions">
        <button type="button" onClick={onAutofill}>
          按池比例填充 {tokenYSymbol}
        </button>
      </div>

      <div className="preview-grid">
        <div>
          <span>Used {tokenXSymbol}</span>
          <strong>{quote?.ok ? formatFp(quote.amountXUsed, 8) : '--'}</strong>
        </div>
        <div>
          <span>Used {tokenYSymbol}</span>
          <strong>{quote?.ok ? formatFp(quote.amountYUsed, 8) : '--'}</strong>
        </div>
        <div>
          <span>Refund {tokenXSymbol}</span>
          <strong>{quote?.ok ? formatFp(quote.refundX, 8) : '--'}</strong>
        </div>
        <div>
          <span>Refund {tokenYSymbol}</span>
          <strong>{quote?.ok ? formatFp(quote.refundY, 8) : '--'}</strong>
        </div>
        <div>
          <span>LP Mint</span>
          <strong>{quote?.ok ? formatFp(quote.lpMint, 8) : '--'}</strong>
        </div>
        <div>
          <span>User LP Share After</span>
          <strong>{quote?.ok ? `${formatPercentFp(quote.lpShareAfter, 4)}%` : '--'}</strong>
        </div>
      </div>

      {quote && !quote.ok ? <p className="hint error">{quote.error}</p> : null}
      {message ? <p className="hint success">{message}</p> : null}

      <ActionButton onClick={onSubmit} disabled={!quote?.ok}>
        Add Liquidity
      </ActionButton>
    </Card>
  );
}
