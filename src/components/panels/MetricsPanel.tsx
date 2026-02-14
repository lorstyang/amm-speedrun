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

  return (
    <section className="metrics-panel">
      <article className="metric-card">
        <h4>Spot & Pool</h4>
        <dl>
          <div>
            <dt>Spot (1 {state.tokenX.symbol})</dt>
            <dd>
              {formatFp(spot, 8)} {state.tokenY.symbol}
            </dd>
          </div>
          <div>
            <dt>Reserves</dt>
            <dd>
              {formatFp(state.reserveX, 6)} {state.tokenX.symbol} / {formatFp(state.reserveY, 6)} {state.tokenY.symbol}
            </dd>
          </div>
          <div>
            <dt>k</dt>
            <dd>{k.toFixed(6)}</dd>
          </div>
          <div>
            <dt>Fee Rate</dt>
            <dd>{formatPercentFp(state.feeRate, 4)}%</dd>
          </div>
        </dl>
      </article>

      <article className="metric-card">
        <h4>Last Trade</h4>
        <dl>
          <div>
            <dt>Direction</dt>
            <dd>{trade ? (trade.direction === 'X_TO_Y' ? 'X->Y' : 'Y->X') : '--'}</dd>
          </div>
          <div>
            <dt>Avg Price (Y/X)</dt>
            <dd>{trade ? formatFp(trade.avgPriceYPerX, 8) : '--'}</dd>
          </div>
          <div>
            <dt>Total Slippage</dt>
            <dd>{trade ? `${formatPercentFp(trade.slippageTotal, 4)}%` : '--'}</dd>
          </div>
          <div>
            <dt>Curve / Fee</dt>
            <dd>
              {trade
                ? `${formatPercentFp(trade.slippageCurve, 4)}% / ${formatPercentFp(trade.feeImpactRate, 4)}%`
                : '--'}
            </dd>
          </div>
          <div>
            <dt>Fee Loss (out token)</dt>
            <dd>
              {trade
                ? `${formatFp(trade.feeImpactOutToken, 8)} ${trade.direction === 'X_TO_Y' ? state.tokenY.symbol : state.tokenX.symbol}`
                : '--'}
            </dd>
          </div>
        </dl>
      </article>

      <article className="metric-card">
        <h4>LP & Fees</h4>
        <dl>
          <div>
            <dt>LP Total</dt>
            <dd>{formatFp(state.lpTotalSupply, 8)}</dd>
          </div>
          <div>
            <dt>User LP</dt>
            <dd>{formatFp(state.lpUserBalance, 8)}</dd>
          </div>
          <div>
            <dt>User Share</dt>
            <dd>{formatPercentFp(lpShare, 4)}%</dd>
          </div>
          <div>
            <dt>Fee Acc ({state.tokenX.symbol})</dt>
            <dd>{formatFp(state.feeAccX, 8)}</dd>
          </div>
          <div>
            <dt>Fee Acc ({state.tokenY.symbol})</dt>
            <dd>{formatFp(state.feeAccY, 8)}</dd>
          </div>
          <div>
            <dt>1% Price Impact Input</dt>
            <dd>
              ~{formatFp(impactInput, 6)} {state.tokenX.symbol}
            </dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
