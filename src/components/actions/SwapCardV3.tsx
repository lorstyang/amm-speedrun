import { useMemo, useState } from 'react';
import { SwapDirection, V3SwapQuote } from '../../core/types';
import { formatFp, formatPercentFp, safeParseFp } from '../../core/math';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';
import { NumberField } from '../common/NumberField';

interface SwapCardV3Props {
  tokenXSymbol: string;
  tokenYSymbol: string;
  activeLiquidity: bigint;
  tickCurrent: number;
  onQuote: (direction: SwapDirection, amountIn: bigint) => V3SwapQuote;
  onSwap: (direction: SwapDirection, amountIn: bigint) => V3SwapQuote;
}

export function SwapCardV3({
  tokenXSymbol,
  tokenYSymbol,
  activeLiquidity,
  tickCurrent,
  onQuote,
  onSwap
}: SwapCardV3Props) {
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

    if (result.partialFill) {
      setMessage('Swap 已执行（部分成交，超过范围后的输入已保留）');
      return;
    }

    setMessage('Swap 已执行并记录到历史');
  };

  const inSymbol = direction === 'X_TO_Y' ? tokenXSymbol : tokenYSymbol;
  const outSymbol = direction === 'X_TO_Y' ? tokenYSymbol : tokenXSymbol;
  const outputText = quote?.ok ? `${formatFp(quote.amountOut, 8)} ${outSymbol}` : '--';
  const consumedText = quote?.ok ? `${formatFp(quote.amountInConsumed, 8)} ${inSymbol}` : '--';
  const unfilledText = quote?.ok ? `${formatFp(quote.amountInUnfilled, 8)} ${inSymbol}` : '--';
  const feeText = quote?.ok ? `${formatFp(quote.feeAmountInToken, 8)} ${inSymbol}` : '--';
  const avgPriceText = quote?.ok ? formatFp(quote.avgPriceYPerX, 8) : '--';
  const slippageText = quote?.ok ? `${formatPercentFp(quote.slippageTotal, 4)}%` : '--';
  const tickAfterText = quote?.ok ? `${quote.tickAfter}` : '--';

  return (
    <Card title="Swap (V3 Exact In)">
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
        helper={`Active Liquidity: ${formatFp(activeLiquidity, 8)} | Current Tick: ${tickCurrent}`}
      />

      <div className="preview-grid">
        <div>
          <span>Output</span>
          <strong title={outputText}>{outputText}</strong>
        </div>
        <div>
          <span>Input Consumed</span>
          <strong title={consumedText}>{consumedText}</strong>
        </div>
        <div>
          <span>Input Unfilled</span>
          <strong title={unfilledText}>{unfilledText}</strong>
        </div>
        <div>
          <span>Fee</span>
          <strong title={feeText}>{feeText}</strong>
        </div>
        <div>
          <span>Avg Price (Y/X)</span>
          <strong title={avgPriceText}>{avgPriceText}</strong>
        </div>
        <div>
          <span>Total Slippage</span>
          <strong title={slippageText}>{slippageText}</strong>
        </div>
        <div>
          <span>Tick After</span>
          <strong title={tickAfterText}>{tickAfterText}</strong>
        </div>
        <div>
          <span>Boundary</span>
          <strong>{quote?.ok ? (quote.crossedBoundary ? 'Crossed' : 'No') : '--'}</strong>
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
