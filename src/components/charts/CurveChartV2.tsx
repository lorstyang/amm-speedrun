import { PoolState } from '../../core/types';
import { toNumber } from '../../core/math';

interface CurveChartV2Props {
  state: PoolState;
  xDomain?: {
    min: number;
    max: number;
  };
  referencePoint?: {
    x: bigint;
    y: bigint;
    label?: string;
  };
}

interface Point {
  x: number;
  y: number;
}

interface PixelPoint {
  px: number;
  py: number;
}

interface LabelLayout {
  x: number;
  y: number;
  anchor: 'start' | 'end';
}

interface PlotArea {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface Domain {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function deriveDomain(points: Point[]): Domain {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  return { minX, maxX, minY, maxY };
}

function projectPoint(point: Point, plot: PlotArea, domain: Domain): PixelPoint {
  const xRange = domain.maxX - domain.minX || 1;
  const yRange = domain.maxY - domain.minY || 1;
  const px = plot.left + ((point.x - domain.minX) / xRange) * (plot.right - plot.left);
  const py = plot.bottom - ((point.y - domain.minY) / yRange) * (plot.bottom - plot.top);
  return { px, py };
}

function pathFromPoints(points: Point[], plot: PlotArea, domain: Domain): string {
  return points
    .map((point, index) => {
      const projected = projectPoint(point, plot, domain);
      return `${index === 0 ? 'M' : 'L'} ${projected.px.toFixed(2)} ${projected.py.toFixed(2)}`;
    })
    .join(' ');
}

function placeLabel(point: PixelPoint, plot: PlotArea, dx: number, dy: number): LabelLayout {
  const rawX = point.px + dx;
  const x = clamp(rawX, plot.left + 8, plot.right - 8);
  const y = clamp(point.py + dy, plot.top + 14, plot.bottom - 8);
  const anchor: 'start' | 'end' = rawX > plot.right - 70 ? 'end' : 'start';
  return { x, y, anchor };
}

function resolveTradeLabelLayouts(
  before: PixelPoint,
  after: PixelPoint,
  plot: PlotArea
): { beforeLabel: LabelLayout; afterLabel: LabelLayout } {
  const dx = after.px - before.px;
  const dy = after.py - before.py;
  const dist = Math.hypot(dx, dy);

  if (dist < 32) {
    return {
      beforeLabel: placeLabel(before, plot, 10, -14),
      afterLabel: placeLabel(after, plot, 10, 18)
    };
  }

  const nx = -dy / dist;
  const ny = dx / dist;
  const spread = 14;

  return {
    beforeLabel: placeLabel(before, plot, 10 + nx * spread, -8 + ny * spread),
    afterLabel: placeLabel(after, plot, 10 - nx * spread, -8 - ny * spread)
  };
}

function generateTicks(min: number, max: number, count: number): number[] {
  if (count <= 1 || max <= min) {
    return [min, max];
  }
  return Array.from({ length: count }, (_, index) => min + ((max - min) * index) / (count - 1));
}

function formatAxisNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (abs >= 1) {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

export function CurveChartV2({ state, xDomain, referencePoint }: CurveChartV2Props) {
  const width = 520;
  const height = 280;
  const plot: PlotArea = {
    left: 52,
    right: width - 12,
    top: 12,
    bottom: height - 34
  };

  const reserveX = toNumber(state.reserveX);
  const reserveY = toNumber(state.reserveY);
  const k = reserveX * reserveY;

  const minX = Math.max(1e-9, xDomain?.min ?? reserveX * 0.25);
  const maxX = Math.max(minX * 1.2, xDomain?.max ?? reserveX * 2.2);
  const sampleCount = 100;

  const curvePoints: Point[] = Array.from({ length: sampleCount }, (_, index) => {
    const ratio = index / (sampleCount - 1);
    const x = minX + (maxX - minX) * ratio;
    return { x, y: k / x };
  });

  const beforePoint = state.lastTrade
    ? {
        x: toNumber(state.lastTrade.reserveXBefore),
        y: toNumber(state.lastTrade.reserveYBefore)
      }
    : null;
  const afterPoint = state.lastTrade
    ? {
        x: toNumber(state.lastTrade.reserveXAfter),
        y: toNumber(state.lastTrade.reserveYAfter)
      }
    : null;
  const basePoint = referencePoint
    ? {
        x: toNumber(referencePoint.x),
        y: toNumber(referencePoint.y)
      }
    : null;

  const allPoints = [...curvePoints, { x: reserveX, y: reserveY }];
  if (beforePoint) {
    allPoints.push(beforePoint);
  }
  if (afterPoint) {
    allPoints.push(afterPoint);
  }
  if (basePoint) {
    allPoints.push(basePoint);
  }

  const domain = deriveDomain(allPoints);
  const curvePath = pathFromPoints(curvePoints, plot, domain);

  const current = projectPoint({ x: reserveX, y: reserveY }, plot, domain);
  const before = beforePoint ? projectPoint(beforePoint, plot, domain) : null;
  const after = afterPoint ? projectPoint(afterPoint, plot, domain) : null;
  const base = basePoint ? projectPoint(basePoint, plot, domain) : null;

  const labels = before && after ? resolveTradeLabelLayouts(before, after, plot) : null;
  const beforeLabel = before ? labels?.beforeLabel ?? placeLabel(before, plot, 10, -10) : null;
  const afterLabel = after ? labels?.afterLabel ?? placeLabel(after, plot, 10, -10) : null;
  const currentLabel = !after ? placeLabel(current, plot, 10, 16) : null;

  const xTicks = generateTicks(domain.minX, domain.maxX, 5);
  const yTicks = generateTicks(domain.minY, domain.maxY, 5);
  const xTitle = `reserveX (${state.tokenX.symbol})`;
  const yTitle = `reserveY (${state.tokenY.symbol})`;

  return (
    <section className="viz-card">
      <div className="viz-header">
        <h3>x * y = k Curve</h3>
        <p>交易沿双曲线移动，手续费使 k 缓慢增长</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="curve-svg" role="img" aria-label="AMM curve">
        {xTicks.map((tick) => {
          const p = projectPoint({ x: tick, y: domain.minY }, plot, domain);
          return (
            <g key={`x-${tick}`}>
              <line x1={p.px} y1={plot.top} x2={p.px} y2={plot.bottom} className="axis-grid" />
              <line x1={p.px} y1={plot.bottom} x2={p.px} y2={plot.bottom + 4} className="axis-tick" />
              <text x={p.px} y={plot.bottom + 16} textAnchor="middle" className="axis-text">
                {formatAxisNumber(tick)}
              </text>
            </g>
          );
        })}

        {yTicks.map((tick) => {
          const p = projectPoint({ x: domain.minX, y: tick }, plot, domain);
          return (
            <g key={`y-${tick}`}>
              <line x1={plot.left} y1={p.py} x2={plot.right} y2={p.py} className="axis-grid" />
              <line x1={plot.left - 4} y1={p.py} x2={plot.left} y2={p.py} className="axis-tick" />
              <text x={plot.left - 7} y={p.py + 3} textAnchor="end" className="axis-text">
                {formatAxisNumber(tick)}
              </text>
            </g>
          );
        })}

        <line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} className="axis-line" />
        <line x1={plot.left} y1={plot.bottom} x2={plot.left} y2={plot.top} className="axis-line" />

        <text x={(plot.left + plot.right) / 2} y={height - 6} textAnchor="middle" className="axis-title">
          {xTitle}
        </text>
        <text
          x={14}
          y={(plot.top + plot.bottom) / 2}
          textAnchor="middle"
          transform={`rotate(-90 14 ${(plot.top + plot.bottom) / 2})`}
          className="axis-title"
        >
          {yTitle}
        </text>

        <path d={curvePath} fill="none" stroke="var(--accent)" strokeWidth="3" />

        {base ? (
          <g>
            <circle cx={base.px} cy={base.py} r="4" className="point-base" />
            <text x={base.px - 8} y={base.py - 8} textAnchor="end" className="point-label">
              {referencePoint?.label ?? 'Base'}
            </text>
          </g>
        ) : null}

        {before ? (
          <g>
            <circle cx={before.px} cy={before.py} r="5" fill="var(--warning)" />
            {beforeLabel ? (
              <line x1={before.px} y1={before.py} x2={beforeLabel.x} y2={beforeLabel.y} className="point-guide" />
            ) : null}
            <text
              x={beforeLabel?.x}
              y={beforeLabel?.y}
              textAnchor={beforeLabel?.anchor}
              className="point-label"
            >
              Before
            </text>
          </g>
        ) : null}

        {after ? (
          <g>
            <circle cx={after.px} cy={after.py} r="5" fill="var(--ok)" />
            {afterLabel ? (
              <line x1={after.px} y1={after.py} x2={afterLabel.x} y2={afterLabel.y} className="point-guide" />
            ) : null}
            <text x={afterLabel?.x} y={afterLabel?.y} textAnchor={afterLabel?.anchor} className="point-label">
              After / Current
            </text>
          </g>
        ) : null}

        {!after ? (
          <g>
            <circle cx={current.px} cy={current.py} r="5" fill="var(--text-strong)" />
            <text x={currentLabel?.x} y={currentLabel?.y} textAnchor={currentLabel?.anchor} className="point-label">
              Current
            </text>
          </g>
        ) : null}
      </svg>
    </section>
  );
}
