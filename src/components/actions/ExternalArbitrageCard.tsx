import { useMemo, useState } from 'react';
import { ArbitrageQuote, AutoArbitrageResult } from '../../core/types';
import { formatFp, formatPercentFp, fpDiv, parseFp, safeParseFp } from '../../core/math';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';
import { NumberField } from '../common/NumberField';

interface ExternalArbitrageCardProps {
  tokenXSymbol: string;
  tokenYSymbol: string;
  spotPriceYPerX: bigint;
  onQuote: (externalPriceYPerX: bigint) => ArbitrageQuote;
  onApplyStep: (externalPriceYPerX: bigint) => ArbitrageQuote;
  onApplyAuto: (externalPriceYPerX: bigint, maxSteps: number, toleranceRate: bigint) => AutoArbitrageResult;
}

export function ExternalArbitrageCard({
  tokenXSymbol,
  tokenYSymbol,
  spotPriceYPerX,
  onQuote,
  onApplyStep,
  onApplyAuto
}: ExternalArbitrageCardProps) {
  const [externalPriceText, setExternalPriceText] = useState(formatFp(spotPriceYPerX, 8));
  const [tolerancePercentText, setTolerancePercentText] = useState('0.1');
  const [maxStepsText, setMaxStepsText] = useState('5');
  const [message, setMessage] = useState<string | null>(null);

  const externalPrice = safeParseFp(externalPriceText);
  const tolerancePercent = safeParseFp(tolerancePercentText);
  const toleranceRate = tolerancePercent === null ? null : fpDiv(tolerancePercent, parseFp('100'));

  const quote = useMemo(() => {
    if (externalPrice === null) {
      return null;
    }
    return onQuote(externalPrice);
  }, [externalPrice, onQuote]);

  const poolSpotText = `${formatFp(spotPriceYPerX, 8)} ${tokenYSymbol}/${tokenXSymbol}`;
  const externalSpotText =
    externalPrice === null ? '--' : `${formatFp(externalPrice, 8)} ${tokenYSymbol}/${tokenXSymbol}`;
  const directionText = quote?.ok
    ? quote.direction === 'X_TO_Y'
      ? `${tokenXSymbol} -> ${tokenYSymbol}`
      : `${tokenYSymbol} -> ${tokenXSymbol}`
    : '--';
  const amountInText = quote?.ok
    ? `${formatFp(quote.amountIn, 8)} ${quote.direction === 'X_TO_Y' ? tokenXSymbol : tokenYSymbol}`
    : '--';
  const amountOutText = quote?.ok
    ? `${formatFp(quote.amountOut, 8)} ${quote.direction === 'X_TO_Y' ? tokenYSymbol : tokenXSymbol}`
    : '--';
  const spreadBeforeText = quote?.ok ? `${formatPercentFp(quote.spreadBefore, 4)}%` : '--';
  const spreadAfterText = quote?.ok ? `${formatPercentFp(quote.spreadAfter, 4)}%` : '--';
  const expectedProfitText = quote?.ok ? `${formatFp(quote.expectedProfitInY, 8)} ${tokenYSymbol}` : '--';

  const onSyncFromPool = () => {
    setExternalPriceText(formatFp(spotPriceYPerX, 8));
  };

  const onStepArbitrage = () => {
    if (externalPrice === null) {
      setMessage('请输入合法外部价格');
      return;
    }
    const result = onApplyStep(externalPrice);
    if (!result.ok) {
      setMessage(result.error ?? '无法执行套利');
      return;
    }
    setMessage(`已执行一步套利：${result.direction === 'X_TO_Y' ? tokenXSymbol : tokenYSymbol} 输入 ${formatFp(result.amountIn, 6)}`);
  };

  const onAutoArbitrage = () => {
    if (externalPrice === null) {
      setMessage('请输入合法外部价格');
      return;
    }
    if (toleranceRate === null) {
      setMessage('请输入合法容差百分比');
      return;
    }
    const maxSteps = Number.parseInt(maxStepsText, 10);
    if (!Number.isFinite(maxSteps) || maxSteps <= 0) {
      setMessage('最大步数需为正整数');
      return;
    }

    const result = onApplyAuto(externalPrice, maxSteps, toleranceRate);
    if (!result.ok) {
      setMessage(result.error ?? '自动套利未执行');
      return;
    }
    setMessage(`自动套利完成：${result.steps} 步，最终价差 ${formatPercentFp(result.finalSpread, 4)}%`);
  };

  return (
    <Card title="External Price & Arbitrage">
      <NumberField
        label={`External Price (${tokenYSymbol} per ${tokenXSymbol})`}
        value={externalPriceText}
        onChange={setExternalPriceText}
        step="0.0001"
        min="0"
      />

      <div className="quick-actions">
        <button type="button" onClick={onSyncFromPool}>
          使用当前池价格
        </button>
      </div>

      <div className="inline-fields">
        <NumberField
          label="Tolerance (%)"
          value={tolerancePercentText}
          onChange={setTolerancePercentText}
          step="0.0001"
          min="0"
        />
        <NumberField
          label="Max Steps"
          value={maxStepsText}
          onChange={setMaxStepsText}
          step="1"
          min="1"
        />
      </div>

      <div className="preview-grid">
        <div>
          <span>Pool Spot</span>
          <strong title={poolSpotText}>{poolSpotText}</strong>
        </div>
        <div>
          <span>External Spot</span>
          <strong title={externalSpotText}>{externalSpotText}</strong>
        </div>
        <div>
          <span>Direction</span>
          <strong title={directionText}>{directionText}</strong>
        </div>
        <div>
          <span>Input</span>
          <strong title={amountInText}>{amountInText}</strong>
        </div>
        <div>
          <span>Output</span>
          <strong title={amountOutText}>{amountOutText}</strong>
        </div>
        <div>
          <span>Spread Before</span>
          <strong title={spreadBeforeText}>{spreadBeforeText}</strong>
        </div>
        <div>
          <span>Spread After</span>
          <strong title={spreadAfterText}>{spreadAfterText}</strong>
        </div>
        <div>
          <span>Expected Profit (in {tokenYSymbol})</span>
          <strong title={expectedProfitText}>{expectedProfitText}</strong>
        </div>
      </div>

      {quote && !quote.ok ? <p className="hint error">{quote.error}</p> : null}
      {message ? <p className="hint success">{message}</p> : null}

      <div className="action-row">
        <ActionButton onClick={onStepArbitrage} disabled={!quote?.ok}>
          Arbitrage Step
        </ActionButton>
        <ActionButton onClick={onAutoArbitrage} variant="secondary" disabled={!quote?.ok}>
          Auto Arbitrage
        </ActionButton>
      </div>
    </Card>
  );
}
