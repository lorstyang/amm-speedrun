import { TimelineEntry } from '../../core/types';
import { toNumber } from '../../core/math';

interface PriceTimelineChartProps {
  timeline: TimelineEntry[];
  cursor: number;
}

interface Point {
  x: number;
  y: number;
}

function createPath(points: Point[]): string {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

export function PriceTimelineChart({ timeline, cursor }: PriceTimelineChartProps) {
  const width = 520;
  const height = 140;
  const margin = 8;

  const prices = timeline.map((entry) => {
    const x = toNumber(entry.snapshot.reserveX);
    const y = toNumber(entry.snapshot.reserveY);
    return x > 0 ? y / x : 0;
  });

  const maxPrice = Math.max(...prices, 1);
  const minPrice = Math.min(...prices, 0);
  const xSpan = Math.max(1, timeline.length - 1);
  const ySpan = Math.max(1e-9, maxPrice - minPrice);

  const points = prices.map((price, index) => {
    const x = margin + (index / xSpan) * (width - margin * 2);
    const y = height - margin - ((price - minPrice) / ySpan) * (height - margin * 2);
    return { x, y };
  });

  const path = createPath(points);
  const active = points[cursor] ?? points[points.length - 1] ?? { x: margin, y: height / 2 };

  return (
    <section className="viz-card">
      <div className="viz-header">
        <h3>Spot Price Timeline (Y / X)</h3>
        <p>历史回放时会同步高亮当前时间点</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="timeline-svg" role="img" aria-label="Price timeline">
        <path d={path} fill="none" stroke="var(--accent-soft)" strokeWidth="2.5" />
        <circle cx={active.x} cy={active.y} r="5" fill="var(--danger)" />
      </svg>
    </section>
  );
}
