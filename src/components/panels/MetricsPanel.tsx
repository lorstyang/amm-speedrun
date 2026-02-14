import { PoolState } from '../../core/types';
import { formatFp, formatPercentFp, fpDiv, toNumber } from '../../core/math';

interface MetricsPanelProps {
  state: PoolState;
}

function estimateOnePercentImpactInputX(state: PoolState): bigint {
  if (state.reserveX <= 0n) {
    return 0n;
  }
  const ratio = Math.sqrt(1 / 0.99) - 1;
  const estimate = BigInt(Math.floor(toNumber(state.reserveX) * ratio * 1e18));
  return estimate > 0n ? estimate : 0n;
}

export function MetricsPanel({ state }: MetricsPanelProps) {
  const spot = state.reserveX > 0n ? fpDiv(state.reserveY, state.reserveX) : 0n;
  const lpShare = state.lpTotalSupply > 0n ? fpDiv(state.lpUserBalance, state.lpTotalSupply) : 0n;
  const k = toNumber(state.reserveX) * toNumber(state.reserveY);
  const trade = state.lastTrade;
  const impactInput = estimateOnePercentImpactInputX(state);
  const spotText = `${formatFp(spot, 8)} ${state.tokenY.symbol}`;
  const reservesText = `${formatFp(state.reserveX, 6)} ${state.tokenX.symbol} / ${formatFp(state.reserveY, 6)} ${state.tokenY.symbol}`;
  const kText = k.toFixed(6);
  const feeRateText = `${formatPercentFp(state.feeRate, 4)}%`;
  const directionText = trade ? (trade.direction === 'X_TO_Y' ? 'X->Y' : 'Y->X') : '--';
  const avgPriceText = trade ? formatFp(trade.avgPriceYPerX, 8) : '--';
  const totalSlippageText = trade ? `${formatPercentFp(trade.slippageTotal, 4)}%` : '--';
  const curveFeeText = trade
    ? `${formatPercentFp(trade.slippageCurve, 4)}% / ${formatPercentFp(trade.feeImpactRate, 4)}%`
    : '--';
  const feeLossText = trade
    ? `${formatFp(trade.feeImpactOutToken, 8)} ${trade.direction === 'X_TO_Y' ? state.tokenY.symbol : state.tokenX.symbol}`
    : '--';
  const lpTotalText = formatFp(state.lpTotalSupply, 8);
  const lpUserText = formatFp(state.lpUserBalance, 8);
  const lpShareText = `${formatPercentFp(lpShare, 4)}%`;
  const feeAccXText = formatFp(state.feeAccX, 8);
  const feeAccYText = formatFp(state.feeAccY, 8);
  const impactInputText = `~${formatFp(impactInput, 6)} ${state.tokenX.symbol}`;

  return (
    <section className="metrics-panel">
      <article className="metric-card">
        <h4>Spot & Pool</h4>
        <dl>
          <div>
            <dt>Spot (1 {state.tokenX.symbol})</dt>
            <dd title={spotText}>{spotText}</dd>
          </div>
          <div>
            <dt>Reserves</dt>
            <dd title={reservesText}>{reservesText}</dd>
          </div>
          <div>
            <dt>k</dt>
            <dd title={kText}>{kText}</dd>
          </div>
          <div>
            <dt>Fee Rate</dt>
            <dd title={feeRateText}>{feeRateText}</dd>
          </div>
        </dl>
      </article>

      <article className="metric-card">
        <h4>Last Trade</h4>
        <dl>
          <div>
            <dt>Direction</dt>
            <dd title={directionText}>{directionText}</dd>
          </div>
          <div>
            <dt>Avg Price (Y/X)</dt>
            <dd title={avgPriceText}>{avgPriceText}</dd>
          </div>
          <div>
            <dt>Total Slippage</dt>
            <dd title={totalSlippageText}>{totalSlippageText}</dd>
          </div>
          <div>
            <dt>Curve / Fee</dt>
            <dd title={curveFeeText}>{curveFeeText}</dd>
          </div>
          <div>
            <dt>Fee Loss (out token)</dt>
            <dd title={feeLossText}>{feeLossText}</dd>
          </div>
        </dl>
      </article>

      <article className="metric-card">
        <h4>LP & Fees</h4>
        <dl>
          <div>
            <dt>LP Total</dt>
            <dd title={lpTotalText}>{lpTotalText}</dd>
          </div>
          <div>
            <dt>User LP</dt>
            <dd title={lpUserText}>{lpUserText}</dd>
          </div>
          <div>
            <dt>User Share</dt>
            <dd title={lpShareText}>{lpShareText}</dd>
          </div>
          <div>
            <dt>Fee Acc ({state.tokenX.symbol})</dt>
            <dd title={feeAccXText}>{feeAccXText}</dd>
          </div>
          <div>
            <dt>Fee Acc ({state.tokenY.symbol})</dt>
            <dd title={feeAccYText}>{feeAccYText}</dd>
          </div>
          <div>
            <dt>1% Price Impact Input</dt>
            <dd title={impactInputText}>{impactInputText}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
