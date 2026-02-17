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

function mapToPath(points: Point[], width: number, height: number): { d: string; minX: number; maxX: number; minY: number; maxY: number } {
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));

  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;

  const project = (point: Point) => {
    const px = ((point.x - minX) / xRange) * width;
    const py = height - ((point.y - minY) / yRange) * height;
    return `${px.toFixed(2)} ${py.toFixed(2)}`;
  };

  const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${project(point)}`).join(' ');
  return { d, minX, maxX, minY, maxY };
}

function projectPoint(point: Point, width: number, height: number, minX: number, maxX: number, minY: number, maxY: number) {
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  const px = ((point.x - minX) / xRange) * width;
  const py = height - ((point.y - minY) / yRange) * height;
  return { px, py };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function placeLabel(
  point: PixelPoint,
  width: number,
  height: number,
  dx: number,
  dy: number
): LabelLayout {
  const rawX = point.px + dx;
  const x = clamp(rawX, 8, width - 8);
  const y = clamp(point.py + dy, 14, height - 8);
  const anchor: 'start' | 'end' = rawX > width - 70 ? 'end' : 'start';
  return { x, y, anchor };
}

function resolveTradeLabelLayouts(
  before: PixelPoint,
  after: PixelPoint,
  width: number,
  height: number
): { beforeLabel: LabelLayout; afterLabel: LabelLayout } {
  const dx = after.px - before.px;
  const dy = after.py - before.py;
  const dist = Math.hypot(dx, dy);

  if (dist < 32) {
    // If two points are very close, split labels vertically for readability.
    return {
      beforeLabel: placeLabel(before, width, height, 10, -14),
      afterLabel: placeLabel(after, width, height, 10, 18)
    };
  }

  const nx = -dy / dist;
  const ny = dx / dist;
  const spread = 14;

  return {
    beforeLabel: placeLabel(before, width, height, 10 + nx * spread, -8 + ny * spread),
    afterLabel: placeLabel(after, width, height, 10 - nx * spread, -8 - ny * spread)
  };
}

export function CurveChartV2({ state, xDomain, referencePoint }: CurveChartV2Props) {
  const width = 520;
  const height = 280;

  const reserveX = toNumber(state.reserveX);
  const reserveY = toNumber(state.reserveY);
  const k = reserveX * reserveY;

  const minX = Math.max(1e-9, xDomain?.min ?? reserveX * 0.25);
  const maxX = Math.max(minX * 1.2, xDomain?.max ?? reserveX * 2.2);
  const sampleCount = 80;

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

  const mapped = mapToPath(allPoints, width, height);
  const curvePath = mapToPath(curvePoints, width, height).d;
  const current = projectPoint({ x: reserveX, y: reserveY }, width, height, mapped.minX, mapped.maxX, mapped.minY, mapped.maxY);
  const before = beforePoint
    ? projectPoint(beforePoint, width, height, mapped.minX, mapped.maxX, mapped.minY, mapped.maxY)
    : null;
  const after = afterPoint
    ? projectPoint(afterPoint, width, height, mapped.minX, mapped.maxX, mapped.minY, mapped.maxY)
    : null;
  const base = basePoint
    ? projectPoint(basePoint, width, height, mapped.minX, mapped.maxX, mapped.minY, mapped.maxY)
    : null;

  const labels = before && after ? resolveTradeLabelLayouts(before, after, width, height) : null;
  const beforeLabel = before
    ? labels?.beforeLabel ?? placeLabel(before, width, height, 10, -10)
    : null;
  const afterLabel = after
    ? labels?.afterLabel ?? placeLabel(after, width, height, 10, -10)
    : null;
  const currentLabel = !after ? placeLabel(current, width, height, 10, 16) : null;

  return (
    <section className="viz-card">
      <div className="viz-header">
        <h3>x * y = k Curve</h3>
        <p>交易沿双曲线移动，手续费使 k 缓慢增长</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="curve-svg" role="img" aria-label="AMM curve">
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
