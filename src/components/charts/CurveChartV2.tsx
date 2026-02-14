import { PoolState } from '../../core/types';
import { toNumber } from '../../core/math';

interface CurveChartV2Props {
  state: PoolState;
}

interface Point {
  x: number;
  y: number;
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

export function CurveChartV2({ state }: CurveChartV2Props) {
  const width = 520;
  const height = 280;

  const reserveX = toNumber(state.reserveX);
  const reserveY = toNumber(state.reserveY);
  const k = reserveX * reserveY;

  const minX = Math.max(1e-9, reserveX * 0.25);
  const maxX = Math.max(minX * 1.2, reserveX * 2.2);
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

  const allPoints = [...curvePoints, { x: reserveX, y: reserveY }];
  if (beforePoint) {
    allPoints.push(beforePoint);
  }
  if (afterPoint) {
    allPoints.push(afterPoint);
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

  return (
    <section className="viz-card">
      <div className="viz-header">
        <h3>x * y = k Curve</h3>
        <p>交易沿双曲线移动，手续费使 k 缓慢增长</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="curve-svg" role="img" aria-label="AMM curve">
        <path d={curvePath} fill="none" stroke="var(--accent)" strokeWidth="3" />

        {before ? (
          <g>
            <circle cx={before.px} cy={before.py} r="5" fill="var(--warning)" />
            <text x={before.px + 8} y={before.py - 8} className="point-label">
              Before
            </text>
          </g>
        ) : null}

        {after ? (
          <g>
            <circle cx={after.px} cy={after.py} r="5" fill="var(--ok)" />
            <text x={after.px + 8} y={after.py - 8} className="point-label">
              After
            </text>
          </g>
        ) : null}

        <circle cx={current.px} cy={current.py} r="5" fill="var(--text-strong)" />
        <text x={current.px + 8} y={current.py + 16} className="point-label">
          Current
        </text>
      </svg>
    </section>
  );
}
