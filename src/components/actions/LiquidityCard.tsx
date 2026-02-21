import { useEffect, useMemo, useState } from 'react';
import { AddLiquidityQuote, RemoveLiquidityQuote } from '../../core/types';
import { ZERO, formatFp, formatPercentFp, safeParseFp } from '../../core/math';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';
import { NumberField } from '../common/NumberField';

interface LiquidityCardProps {
  tokenXSymbol: string;
  tokenYSymbol: string;
  reserveX: bigint;
  reserveY: bigint;
  lpUserBalance: bigint;
  onQuoteDeposit: (amountX: bigint, amountY: bigint) => AddLiquidityQuote;
  onDeposit: (amountX: bigint, amountY: bigint) => AddLiquidityQuote;
  onQuoteWithdraw: (burnLp: bigint) => RemoveLiquidityQuote;
  onWithdraw: (burnLp: bigint) => RemoveLiquidityQuote;
}

export function LiquidityCard({
  tokenXSymbol,
  tokenYSymbol,
  reserveX,
  reserveY,
  lpUserBalance,
  onQuoteDeposit,
  onDeposit,
  onQuoteWithdraw,
  onWithdraw
}: LiquidityCardProps) {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [message, setMessage] = useState<string | null>(null);

  const [amountXText, setAmountXText] = useState('10');
  const amountX = safeParseFp(amountXText);
  const amountYAuto = useMemo(() => {
    if (amountX === null || amountX <= ZERO) {
      return null;
    }
    if (reserveX <= ZERO || reserveY <= ZERO) {
      return amountX;
    }
    return (amountX * reserveY) / reserveX;
  }, [amountX, reserveX, reserveY]);
  const amountYAutoText = amountYAuto === null ? '' : formatFp(amountYAuto, 8);

  const [burnText, setBurnText] = useState('1');
  const burnLp = safeParseFp(burnText);

  useEffect(() => {
    setMessage(null);
  }, [mode]);

  const depositQuote = useMemo(() => {
    if (amountX === null || amountYAuto === null) {
      return null;
    }
    return onQuoteDeposit(amountX, amountYAuto);
  }, [amountX, amountYAuto, onQuoteDeposit]);

  const withdrawQuote = useMemo(() => {
    if (burnLp === null) {
      return null;
    }
    return onQuoteWithdraw(burnLp);
  }, [burnLp, onQuoteWithdraw]);

  const onMaxWithdraw = () => {
    setBurnText((Number(lpUserBalance) / 1e18).toString());
  };

  const submitDeposit = () => {
    if (amountX === null || amountYAuto === null) {
      setMessage('请输入合法数字');
      return;
    }
    const result = onDeposit(amountX, amountYAuto);
    if (!result.ok) {
      setMessage(result.error ?? 'Deposit failed');
      return;
    }
    setMessage('Deposit 成功，历史已更新');
  };

  const submitWithdraw = () => {
    if (burnLp === null) {
      setMessage('请输入合法数字');
      return;
    }
    const result = onWithdraw(burnLp);
    if (!result.ok) {
      setMessage(result.error ?? 'Withdraw failed');
      return;
    }
    setMessage('Withdraw 成功，历史已更新');
  };

  const usedXText = depositQuote?.ok ? formatFp(depositQuote.amountXUsed, 8) : '--';
  const usedYText = depositQuote?.ok ? formatFp(depositQuote.amountYUsed, 8) : '--';
  const refundXText = depositQuote?.ok ? formatFp(depositQuote.refundX, 8) : '--';
  const refundYText = depositQuote?.ok ? formatFp(depositQuote.refundY, 8) : '--';
  const lpMintText = depositQuote?.ok ? formatFp(depositQuote.lpMint, 8) : '--';
  const lpShareAfterDepositText = depositQuote?.ok ? `${formatPercentFp(depositQuote.lpShareAfter, 4)}%` : '--';

  const outXText = withdrawQuote?.ok ? formatFp(withdrawQuote.outX, 8) : '--';
  const outYText = withdrawQuote?.ok ? formatFp(withdrawQuote.outY, 8) : '--';
  const lpShareAfterWithdrawText = withdrawQuote?.ok ? `${formatPercentFp(withdrawQuote.lpShareAfter, 4)}%` : '--';

  return (
    <Card title="Liquidity">
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
            value={amountYAutoText}
            onChange={() => {}}
            readOnly
            step="0.0001"
            min="0"
            helper={`按当前池比例自动计算 ${tokenYSymbol}`}
          />

          <div className="preview-grid">
            <div>
              <span>Used {tokenXSymbol}</span>
              <strong title={usedXText}>{usedXText}</strong>
            </div>
            <div>
              <span>Used {tokenYSymbol}</span>
              <strong title={usedYText}>{usedYText}</strong>
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
              <span>LP Mint</span>
              <strong title={lpMintText}>{lpMintText}</strong>
            </div>
            <div>
              <span>User LP Share After</span>
              <strong title={lpShareAfterDepositText}>{lpShareAfterDepositText}</strong>
            </div>
          </div>

          {depositQuote && !depositQuote.ok ? <p className="hint error">{depositQuote.error}</p> : null}

          <ActionButton onClick={submitDeposit} disabled={!depositQuote?.ok}>
            Deposit
          </ActionButton>
        </>
      ) : (
        <>
          <NumberField
            label="Withdraw LP"
            value={burnText}
            onChange={setBurnText}
            step="0.0001"
            min="0"
            helper={`User LP Balance: ${formatFp(lpUserBalance, 8)}`}
          />

          <div className="quick-actions">
            <button type="button" onClick={onMaxWithdraw}>
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
            <div>
              <span>User LP Share After</span>
              <strong title={lpShareAfterWithdrawText}>{lpShareAfterWithdrawText}</strong>
            </div>
          </div>

          {withdrawQuote && !withdrawQuote.ok ? <p className="hint error">{withdrawQuote.error}</p> : null}

          <ActionButton onClick={submitWithdraw} disabled={!withdrawQuote?.ok}>
            Withdraw
          </ActionButton>
        </>
      )}

      {message ? <p className="hint success">{message}</p> : null}
    </Card>
  );
}
