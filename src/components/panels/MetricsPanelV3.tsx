import { formatFp, formatPercentFp, fpDiv } from '../../core/math';
import { spotPriceV3YPerX } from '../../core/ammV3';
import { V3PoolState } from '../../core/types';

interface MetricsPanelV3Props {
  state: V3PoolState;
}

export function MetricsPanelV3({ state }: MetricsPanelV3Props) {
  const spot = spotPriceV3YPerX(state);
  const trade = state.lastTrade;
  const rangeText = `[${state.position.tickLower}, ${state.position.tickUpper})`;
  const feeTierText = `${(Number(state.feeTier) / 10000).toFixed(2)}%`;
  const activeLiquidityText = formatFp(state.liquidity, 8);
  const positionLiquidityText = formatFp(state.position.liquidity, 8);

  const directionText = trade ? (trade.direction === 'X_TO_Y' ? 'X->Y' : 'Y->X') : '--';
  const avgPriceText = trade ? formatFp(trade.avgPriceYPerX, 8) : '--';
  const slippageText = trade ? `${formatPercentFp(trade.slippageTotal, 4)}%` : '--';
  const consumedText = trade
    ? `${formatFp(trade.amountInConsumed, 8)} ${trade.direction === 'X_TO_Y' ? state.tokenX.symbol : state.tokenY.symbol}`
    : '--';
  const unfilledText = trade
    ? `${formatFp(trade.amountInUnfilled, 8)} ${trade.direction === 'X_TO_Y' ? state.tokenX.symbol : state.tokenY.symbol}`
    : '--';
  const outText = trade
    ? `${formatFp(trade.amountOut, 8)} ${trade.direction === 'X_TO_Y' ? state.tokenY.symbol : state.tokenX.symbol}`
    : '--';
  const boundaryText = trade ? (trade.crossedBoundary ? 'Crossed' : 'No') : '--';

  const positionFeeXText = formatFp(state.position.feeOwedX, 8);
  const positionFeeYText = formatFp(state.position.feeOwedY, 8);
  const globalFeeXText = formatFp(state.feeAccX, 8);
  const globalFeeYText = formatFp(state.feeAccY, 8);
  const inRangeText = state.liquidity > 0n ? 'Yes' : 'No';
  const shareActiveText =
    state.position.liquidity > 0n ? `${formatPercentFp(fpDiv(state.liquidity, state.position.liquidity), 2)}%` : '--';

  return (
    <section className="metrics-panel">
      <article className="metric-card">
        <h4>Spot & Range</h4>
        <dl>
          <div>
            <dt>Spot (1 {state.tokenX.symbol})</dt>
            <dd>{`${formatFp(spot, 8)} ${state.tokenY.symbol}`}</dd>
          </div>
          <div>
            <dt>Current Tick</dt>
            <dd>{state.tickCurrent}</dd>
          </div>
          <div>
            <dt>Range</dt>
            <dd title={rangeText}>{rangeText}</dd>
          </div>
          <div>
            <dt>Fee Tier</dt>
            <dd>{feeTierText}</dd>
          </div>
          <div>
            <dt>In Range</dt>
            <dd>{inRangeText}</dd>
          </div>
        </dl>
      </article>

      <article className="metric-card">
        <h4>Last Trade</h4>
        <dl>
          <div>
            <dt>Direction</dt>
            <dd>{directionText}</dd>
          </div>
          <div>
            <dt>Avg Price (Y/X)</dt>
            <dd>{avgPriceText}</dd>
          </div>
          <div>
            <dt>Total Slippage</dt>
            <dd>{slippageText}</dd>
          </div>
          <div>
            <dt>Input Consumed</dt>
            <dd>{consumedText}</dd>
          </div>
          <div>
            <dt>Input Unfilled</dt>
            <dd>{unfilledText}</dd>
          </div>
          <div>
            <dt>Output</dt>
            <dd>{outText}</dd>
          </div>
          <div>
            <dt>Boundary Crossed</dt>
            <dd>{boundaryText}</dd>
          </div>
        </dl>
      </article>

      <article className="metric-card">
        <h4>Liquidity & Fees</h4>
        <dl>
          <div>
            <dt>Position Liquidity</dt>
            <dd>{positionLiquidityText}</dd>
          </div>
          <div>
            <dt>Active Liquidity</dt>
            <dd>{activeLiquidityText}</dd>
          </div>
          <div>
            <dt>Active / Position</dt>
            <dd>{shareActiveText}</dd>
          </div>
          <div>
            <dt>Fee Owed ({state.tokenX.symbol})</dt>
            <dd>{positionFeeXText}</dd>
          </div>
          <div>
            <dt>Fee Owed ({state.tokenY.symbol})</dt>
            <dd>{positionFeeYText}</dd>
          </div>
          <div>
            <dt>Pool Fee Acc ({state.tokenX.symbol})</dt>
            <dd>{globalFeeXText}</dd>
          </div>
          <div>
            <dt>Pool Fee Acc ({state.tokenY.symbol})</dt>
            <dd>{globalFeeYText}</dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
