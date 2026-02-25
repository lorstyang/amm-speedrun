import { useEffect, useMemo, useState } from 'react';
import { formatFp, safeParseFp } from '../../core/math';
import { V3AddLiquidityParams, V3AddLiquidityQuote, V3RemoveLiquidityQuote } from '../../core/types';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';
import { NumberField } from '../common/NumberField';

interface LiquidityCardV3Props {
  tokenXSymbol: string;
  tokenYSymbol: string;
  tickSpacing: number;
  tickLower: number;
  tickUpper: number;
  positionLiquidity: bigint;
  onQuoteAdd: (params: V3AddLiquidityParams) => V3AddLiquidityQuote;
  onAdd: (params: V3AddLiquidityParams) => V3AddLiquidityQuote;
  onQuoteRemove: (liquidityDelta: bigint) => V3RemoveLiquidityQuote;
  onRemove: (liquidityDelta: bigint) => V3RemoveLiquidityQuote;
}

function parseOptionalTick(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function LiquidityCardV3({
  tokenXSymbol,
  tokenYSymbol,
  tickSpacing,
  tickLower,
  tickUpper,
  positionLiquidity,
  onQuoteAdd,
  onAdd,
  onQuoteRemove,
  onRemove
}: LiquidityCardV3Props) {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [message, setMessage] = useState<string | null>(null);

  const [amountXText, setAmountXText] = useState('10');
  const [amountYText, setAmountYText] = useState('100');
  const [tickLowerText, setTickLowerText] = useState(tickLower.toString());
  const [tickUpperText, setTickUpperText] = useState(tickUpper.toString());

  const [removeLiquidityText, setRemoveLiquidityText] = useState('1');

  useEffect(() => {
    setTickLowerText(tickLower.toString());
    setTickUpperText(tickUpper.toString());
  }, [tickLower, tickUpper]);

  useEffect(() => {
    setMessage(null);
  }, [mode]);

  const amountX = safeParseFp(amountXText);
  const amountY = safeParseFp(amountYText);
  const maybeTickLower = parseOptionalTick(tickLowerText);
  const maybeTickUpper = parseOptionalTick(tickUpperText);

  const addParams = useMemo((): V3AddLiquidityParams | null => {
    if (amountX === null || amountY === null || maybeTickLower === null || maybeTickUpper === null) {
      return null;
    }

    return {
      amountXIn: amountX,
      amountYIn: amountY,
      tickLower: maybeTickLower,
      tickUpper: maybeTickUpper
    };
  }, [amountX, amountY, maybeTickLower, maybeTickUpper]);

  const addQuote = useMemo(() => {
    if (!addParams) {
      return null;
    }
    return onQuoteAdd(addParams);
  }, [addParams, onQuoteAdd]);

  const removeLiquidity = safeParseFp(removeLiquidityText);
  const removeQuote = useMemo(() => {
    if (removeLiquidity === null) {
      return null;
    }
    return onQuoteRemove(removeLiquidity);
  }, [onQuoteRemove, removeLiquidity]);

  const onMaxRemove = () => {
    setRemoveLiquidityText(formatFp(positionLiquidity, 18));
  };

  const onSubmitAdd = () => {
    if (!addParams) {
      setMessage('请输入合法参数');
      return;
    }

    const result = onAdd(addParams);
    if (!result.ok) {
      setMessage(result.error ?? 'Add liquidity failed');
      return;
    }

    setMessage(result.rangeUpdated ? 'Range 已更新并注入流动性' : '流动性已注入');
  };

  const onSubmitRemove = () => {
    if (removeLiquidity === null) {
      setMessage('请输入合法参数');
      return;
    }

    const result = onRemove(removeLiquidity);
    if (!result.ok) {
      setMessage(result.error ?? 'Remove liquidity failed');
      return;
    }

    setMessage('流动性已移除');
  };

  const amountXUsedText = addQuote?.ok ? formatFp(addQuote.amountXUsed, 8) : '--';
  const amountYUsedText = addQuote?.ok ? formatFp(addQuote.amountYUsed, 8) : '--';
  const refundXText = addQuote?.ok ? formatFp(addQuote.refundX, 8) : '--';
  const refundYText = addQuote?.ok ? formatFp(addQuote.refundY, 8) : '--';
  const liqMintText = addQuote?.ok ? formatFp(addQuote.liquidityDelta, 8) : '--';

  const outXText = removeQuote?.ok ? formatFp(removeQuote.amountXOut, 8) : '--';
  const outYText = removeQuote?.ok ? formatFp(removeQuote.amountYOut, 8) : '--';

  return (
    <Card title="Liquidity (V3 Single Position)">
      <div className="liquidity-tabs">
        <button type="button" className={mode === 'deposit' ? 'active' : ''} onClick={() => setMode('deposit')}>
          Deposit
        </button>
        <button type="button" className={mode === 'withdraw' ? 'active' : ''} onClick={() => setMode('withdraw')}>
          Withdraw
        </button>
      </div>

      {mode === 'deposit' ? (
        <>
          <NumberField
            label={`Deposit ${tokenXSymbol}`}
            value={amountXText}
            onChange={setAmountXText}
            step="0.0001"
            min="0"
          />
          <NumberField
            label={`Deposit ${tokenYSymbol}`}
            value={amountYText}
            onChange={setAmountYText}
            step="0.0001"
            min="0"
          />

          <div className="inline-fields">
            <NumberField
              label="Tick Lower"
              value={tickLowerText}
              onChange={setTickLowerText}
              step={tickSpacing.toString()}
            />
            <NumberField
              label="Tick Upper"
              value={tickUpperText}
              onChange={setTickUpperText}
              step={tickSpacing.toString()}
              helper={`Tick spacing: ${tickSpacing}`}
            />
          </div>

          <div className="preview-grid">
            <div>
              <span>Used {tokenXSymbol}</span>
              <strong title={amountXUsedText}>{amountXUsedText}</strong>
            </div>
            <div>
              <span>Used {tokenYSymbol}</span>
              <strong title={amountYUsedText}>{amountYUsedText}</strong>
            </div>
            <div>
              <span>Refund {tokenXSymbol}</span>
              <strong title={refundXText}>{refundXText}</strong>
            </div>
            <div>
              <span>Refund {tokenYSymbol}</span>
              <strong title={refundYText}>{refundYText}</strong>
            </div>
            <div>
              <span>Liquidity Mint</span>
              <strong title={liqMintText}>{liqMintText}</strong>
            </div>
            <div>
              <span>Range Updated</span>
              <strong>{addQuote?.ok ? (addQuote.rangeUpdated ? 'Yes' : 'No') : '--'}</strong>
            </div>
          </div>

          {addQuote && !addQuote.ok ? <p className="hint error">{addQuote.error}</p> : null}

          <ActionButton onClick={onSubmitAdd} disabled={!addQuote?.ok}>
            Deposit
          </ActionButton>
        </>
      ) : (
        <>
          <NumberField
            label="Remove Liquidity"
            value={removeLiquidityText}
            onChange={setRemoveLiquidityText}
            step="0.0001"
            min="0"
            helper={`Position Liquidity: ${formatFp(positionLiquidity, 8)}`}
          />

          <div className="quick-actions">
            <button type="button" onClick={onMaxRemove}>
              MAX
            </button>
          </div>

          <div className="preview-grid">
            <div>
              <span>Out {tokenXSymbol}</span>
              <strong title={outXText}>{outXText}</strong>
            </div>
            <div>
              <span>Out {tokenYSymbol}</span>
              <strong title={outYText}>{outYText}</strong>
            </div>
          </div>

          {removeQuote && !removeQuote.ok ? <p className="hint error">{removeQuote.error}</p> : null}

          <ActionButton onClick={onSubmitRemove} disabled={!removeQuote?.ok}>
            Withdraw
          </ActionButton>
        </>
      )}

      {message ? <p className="hint success">{message}</p> : null}
    </Card>
  );
}
