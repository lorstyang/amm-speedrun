import { formatFp, mulDiv } from '../../core/math';
import { V3PoolState } from '../../core/types';
import { Q192 } from '../../core/v3/constants';
import { getSqrtRatioAtTick } from '../../core/v3/tickMath';

interface LiquidityRangeChartV3Props {
  state: V3PoolState;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function priceAtTickX18(tick: number): bigint {
  const sqrt = getSqrtRatioAtTick(tick);
  return mulDiv(sqrt * sqrt, 1_000_000_000_000_000_000n, Q192);
}

export function LiquidityRangeChartV3({ state }: LiquidityRangeChartV3Props) {
  const width = 520;
  const height = 180;
  const margin = 20;

  const minTick = Math.min(state.position.tickLower, state.tickCurrent) - state.tickSpacing * 20;
  const maxTick = Math.max(state.position.tickUpper, state.tickCurrent) + state.tickSpacing * 20;
  const span = Math.max(state.tickSpacing, maxTick - minTick);

  const projectX = (tick: number): number => {
    const ratio = (tick - minTick) / span;
    return clamp(margin + ratio * (width - margin * 2), margin, width - margin);
  };

  const lowerX = projectX(state.position.tickLower);
  const upperX = projectX(state.position.tickUpper);
  const currentX = projectX(state.tickCurrent);

  return (
    <section className="viz-card">
      <div className="viz-header">
        <h3>Liquidity Range (Tick Space)</h3>
        <p>单仓位区间展示；跨边界后 Active Liquidity 会变为 0</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="timeline-svg" role="img" aria-label="V3 liquidity range chart">
        <line x1={margin} y1={height / 2} x2={width - margin} y2={height / 2} className="axis-line" />

        <rect
          x={Math.min(lowerX, upperX)}
          y={height / 2 - 26}
          width={Math.abs(upperX - lowerX)}
          height={52}
          fill="var(--accent-soft)"
          opacity="0.22"
          stroke="var(--accent)"
          strokeWidth="1.5"
        />

        <line x1={lowerX} y1={height / 2 - 34} x2={lowerX} y2={height / 2 + 34} className="axis-tick" />
        <line x1={upperX} y1={height / 2 - 34} x2={upperX} y2={height / 2 + 34} className="axis-tick" />

        <line x1={currentX} y1={height / 2 - 44} x2={currentX} y2={height / 2 + 44} stroke="var(--danger)" strokeWidth="2" />

        <text x={lowerX} y={height / 2 + 52} textAnchor="middle" className="axis-text">
          L {state.position.tickLower}
        </text>
        <text x={upperX} y={height / 2 + 52} textAnchor="middle" className="axis-text">
          U {state.position.tickUpper}
        </text>
        <text x={currentX} y={height / 2 - 50} textAnchor="middle" className="point-label">
          Current {state.tickCurrent}
        </text>

        <text x={lowerX} y={height - 8} textAnchor="middle" className="axis-text">
          {formatFp(priceAtTickX18(state.position.tickLower), 4)}
        </text>
        <text x={upperX} y={height - 8} textAnchor="middle" className="axis-text">
          {formatFp(priceAtTickX18(state.position.tickUpper), 4)}
        </text>
      </svg>
    </section>
  );
}
