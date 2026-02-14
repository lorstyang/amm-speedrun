import { useMemo, useState } from 'react';
import { SwapDirection, SwapQuote } from '../../core/types';
import { formatFp, formatPercentFp, safeParseFp } from '../../core/math';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';
import { NumberField } from '../common/NumberField';

interface SwapCardProps {
  tokenXSymbol: string;
  tokenYSymbol: string;
  reserveX: bigint;
  reserveY: bigint;
  onQuote: (direction: SwapDirection, amountIn: bigint) => SwapQuote;
  onSwap: (direction: SwapDirection, amountIn: bigint) => SwapQuote;
}

export function SwapCard({
  tokenXSymbol,
  tokenYSymbol,
  reserveX,
  reserveY,
  onQuote,
  onSwap
}: SwapCardProps) {
  const [direction, setDirection] = useState<SwapDirection>('X_TO_Y');
  const [amountInText, setAmountInText] = useState('1');
  const [message, setMessage] = useState<string | null>(null);

  const parsed = safeParseFp(amountInText);
  const quote = useMemo(() => {
    if (parsed === null) {
      return null;
    }
    return onQuote(direction, parsed);
  }, [direction, onQuote, parsed]);

  const currentMax = direction === 'X_TO_Y' ? reserveX : reserveY;
  const quickSet = (ratio: number) => {
    const value = (Number(currentMax) / 1e18) * ratio;
    setAmountInText(value.toFixed(6));
  };

  const onSubmit = () => {
    if (parsed === null) {
      setMessage('请输入合法数字');
      return;
    }
    const result = onSwap(direction, parsed);
    if (!result.ok) {
      setMessage(result.error ?? 'Swap failed');
      return;
    }
    setMessage('Swap 已执行并记录到历史');
  };

  const inSymbol = direction === 'X_TO_Y' ? tokenXSymbol : tokenYSymbol;
  const outSymbol = direction === 'X_TO_Y' ? tokenYSymbol : tokenXSymbol;

  return (
    <Card title="Swap">
      <div className="swap-direction">
        <ActionButton
          variant={direction === 'X_TO_Y' ? 'primary' : 'secondary'}
          onClick={() => setDirection('X_TO_Y')}
        >
          {tokenXSymbol}
          {' -> '}
          {tokenYSymbol}
        </ActionButton>
        <ActionButton
          variant={direction === 'Y_TO_X' ? 'primary' : 'secondary'}
          onClick={() => setDirection('Y_TO_X')}
        >
          {tokenYSymbol}
          {' -> '}
          {tokenXSymbol}
        </ActionButton>
      </div>

      <NumberField
        label={`Input ${inSymbol}`}
        value={amountInText}
        onChange={setAmountInText}
        step="0.0001"
        min="0"
      />

      <div className="quick-actions">
        <button type="button" onClick={() => quickSet(0.01)}>
          1%
        </button>
        <button type="button" onClick={() => quickSet(0.05)}>
          5%
        </button>
        <button type="button" onClick={() => quickSet(0.1)}>
          10%
        </button>
      </div>

      <div className="preview-grid">
        <div>
          <span>Output</span>
          <strong>
            {quote?.ok ? `${formatFp(quote.amountOut, 8)} ${outSymbol}` : '--'}
          </strong>
        </div>
        <div>
          <span>Avg Price (Y/X)</span>
          <strong>{quote?.ok ? formatFp(quote.avgPriceYPerX, 8) : '--'}</strong>
        </div>
        <div>
          <span>Fee</span>
          <strong>
            {quote?.ok ? `${formatFp(quote.feeAmountInToken, 8)} ${inSymbol}` : '--'}
          </strong>
        </div>
        <div>
          <span>Total Slippage</span>
          <strong>{quote?.ok ? `${formatPercentFp(quote.slippageTotal, 4)}%` : '--'}</strong>
        </div>
        <div>
          <span>Curve Impact</span>
          <strong>{quote?.ok ? `${formatPercentFp(quote.slippageCurve, 4)}%` : '--'}</strong>
        </div>
        <div>
          <span>Fee Impact</span>
          <strong>{quote?.ok ? `${formatPercentFp(quote.feeImpactRate, 4)}%` : '--'}</strong>
        </div>
      </div>

      {quote && !quote.ok ? <p className="hint error">{quote.error}</p> : null}
      {message ? <p className="hint success">{message}</p> : null}

      <ActionButton onClick={onSubmit} disabled={!quote?.ok}>
        Execute Swap
      </ActionButton>
    </Card>
  );
}
