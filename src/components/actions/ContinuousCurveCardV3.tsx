import { formatFp } from '../../core/math';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';

interface ContinuousCurveCardV3Props {
  tokenXSymbol: string;
  tokenYSymbol: string;
  baseTick: number;
  liveTick: number;
  tickLower: number;
  tickUpper: number;
  tickSpacing: number;
  baseSpotYPerX: bigint;
  liveSpotYPerX: bigint;
  tickDelta: number;
  minTickDelta: number;
  maxTickDelta: number;
  onTickDeltaChange: (value: number) => void;
  onReset: () => void;
}

export function ContinuousCurveCardV3({
  tokenXSymbol,
  tokenYSymbol,
  baseTick,
  liveTick,
  tickLower,
  tickUpper,
  tickSpacing,
  baseSpotYPerX,
  liveSpotYPerX,
  tickDelta,
  minTickDelta,
  maxTickDelta,
  onTickDeltaChange,
  onReset
}: ContinuousCurveCardV3Props) {
  const step = Math.max(1, tickSpacing);
  const baseSpotText = `${formatFp(baseSpotYPerX, 8)} ${tokenYSymbol}/${tokenXSymbol}`;
  const liveSpotText = `${formatFp(liveSpotYPerX, 8)} ${tokenYSymbol}/${tokenXSymbol}`;

  const setQuickDelta = (multiplier: number) => {
    const raw = multiplier * step;
    const safe = Math.max(minTickDelta, Math.min(maxTickDelta, raw));
    onTickDeltaChange(safe);
  };

  return (
    <Card title="Continuous Curve Driver (V3)">
      <p className="hint">
        拖动滑条连续改变当前 tick（与价格），仅用于观察区间内外变化；不触发 swap/add/remove，不写入 History。
      </p>

      <div className="slider-block">
        <div className="slider-meta">
          <span>Tick Delta</span>
          <strong title={`${tickDelta}`}>{tickDelta}</strong>
        </div>
        <input
          className="slider-input"
          type="range"
          min={minTickDelta}
          max={maxTickDelta}
          step={step}
          value={tickDelta}
          onChange={(event) => onTickDeltaChange(Number.parseInt(event.target.value, 10))}
        />
        <div className="slider-meta">
          <span>Tick Spacing</span>
          <strong>{tickSpacing}</strong>
        </div>
      </div>

      <div className="quick-actions">
        <button type="button" onClick={() => setQuickDelta(-200)}>
          -200s
        </button>
        <button type="button" onClick={() => setQuickDelta(-100)}>
          -100s
        </button>
        <button type="button" onClick={() => setQuickDelta(0)}>
          0
        </button>
        <button type="button" onClick={() => setQuickDelta(100)}>
          +100s
        </button>
        <button type="button" onClick={() => setQuickDelta(200)}>
          +200s
        </button>
      </div>

      <div className="preview-grid">
        <div>
          <span>Base Tick</span>
          <strong title={`${baseTick}`}>{baseTick}</strong>
        </div>
        <div>
          <span>Live Tick</span>
          <strong title={`${liveTick}`}>{liveTick}</strong>
        </div>
        <div>
          <span>Range</span>
          <strong title={`[${tickLower}, ${tickUpper})`}>[{tickLower}, {tickUpper})</strong>
        </div>
        <div>
          <span>In Range</span>
          <strong>{liveTick >= tickLower && liveTick < tickUpper ? 'Yes' : 'No'}</strong>
        </div>
        <div>
          <span>Base Spot</span>
          <strong title={baseSpotText}>{baseSpotText}</strong>
        </div>
        <div>
          <span>Live Spot</span>
          <strong title={liveSpotText}>{liveSpotText}</strong>
        </div>
      </div>

      <ActionButton variant="secondary" onClick={onReset}>
        重置到 Base Tick
      </ActionButton>
    </Card>
  );
}
