import { useMemo, useState } from 'react';
import { RemoveLiquidityQuote } from '../../core/types';
import { formatFp, formatPercentFp, safeParseFp } from '../../core/math';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';
import { NumberField } from '../common/NumberField';

interface RemoveLiquidityCardProps {
  tokenXSymbol: string;
  tokenYSymbol: string;
  lpUserBalance: bigint;
  onQuote: (burnLp: bigint) => RemoveLiquidityQuote;
  onRemove: (burnLp: bigint) => RemoveLiquidityQuote;
}

export function RemoveLiquidityCard({
  tokenXSymbol,
  tokenYSymbol,
  lpUserBalance,
  onQuote,
  onRemove
}: RemoveLiquidityCardProps) {
  const [burnText, setBurnText] = useState('1');
  const [message, setMessage] = useState<string | null>(null);

  const burnLp = safeParseFp(burnText);
  const quote = useMemo(() => {
    if (burnLp === null) {
      return null;
    }
    return onQuote(burnLp);
  }, [burnLp, onQuote]);

  const onMax = () => {
    setBurnText((Number(lpUserBalance) / 1e18).toString());
  };

  const onSubmit = () => {
    if (burnLp === null) {
      setMessage('请输入合法数字');
      return;
    }
    const result = onRemove(burnLp);
    if (!result.ok) {
      setMessage(result.error ?? 'Remove liquidity failed');
      return;
    }
    setMessage('赎回成功，历史已更新');
  };

  return (
    <Card title="Remove Liquidity">
      <NumberField
        label="Burn LP"
        value={burnText}
        onChange={setBurnText}
        step="0.0001"
        min="0"
        helper={`User LP Balance: ${formatFp(lpUserBalance, 8)}`}
      />

      <div className="quick-actions">
        <button type="button" onClick={onMax}>
          MAX
        </button>
      </div>

      <div className="preview-grid">
        <div>
          <span>Out {tokenXSymbol}</span>
          <strong>{quote?.ok ? formatFp(quote.outX, 8) : '--'}</strong>
        </div>
        <div>
          <span>Out {tokenYSymbol}</span>
          <strong>{quote?.ok ? formatFp(quote.outY, 8) : '--'}</strong>
        </div>
        <div>
          <span>User LP Share After</span>
          <strong>{quote?.ok ? `${formatPercentFp(quote.lpShareAfter, 4)}%` : '--'}</strong>
        </div>
      </div>

      {quote && !quote.ok ? <p className="hint error">{quote.error}</p> : null}
      {message ? <p className="hint success">{message}</p> : null}

      <ActionButton onClick={onSubmit} disabled={!quote?.ok}>
        Remove Liquidity
      </ActionButton>
    </Card>
  );
}
