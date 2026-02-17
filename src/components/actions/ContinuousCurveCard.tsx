import { formatFp } from '../../core/math';
import { ActionButton } from '../common/ActionButton';
import { Card } from '../common/Card';

interface ContinuousCurveCardProps {
  tokenXSymbol: string;
  tokenYSymbol: string;
  baseReserveX: bigint;
  baseReserveY: bigint;
  liveReserveX: bigint;
  liveReserveY: bigint;
  ratioBps: number;
  onRatioBpsChange: (value: number) => void;
  onReset: () => void;
}

export function ContinuousCurveCard({
  tokenXSymbol,
  tokenYSymbol,
  baseReserveX,
  baseReserveY,
  liveReserveX,
  liveReserveY,
  ratioBps,
  onRatioBpsChange,
  onReset
}: ContinuousCurveCardProps) {
  const ratioText = (ratioBps / 100).toFixed(2);

  const setQuickRatio = (nextBps: number) => {
    onRatioBpsChange(nextBps);
  };

  const baseXText = `${formatFp(baseReserveX, 8)} ${tokenXSymbol}`;
  const baseYText = `${formatFp(baseReserveY, 8)} ${tokenYSymbol}`;
  const liveXText = `${formatFp(liveReserveX, 8)} ${tokenXSymbol}`;
  const liveYText = `${formatFp(liveReserveY, 8)} ${tokenYSymbol}`;

  return (
    <Card title="Continuous Curve Driver">
      <p className="hint">
        拖动滑条会连续改变池中 {tokenXSymbol}，并按 x*y=k 自动联动 {tokenYSymbol}，不写入 History。
      </p>

      <div className="slider-block">
        <div className="slider-meta">
          <span>{tokenXSymbol} Reserve Ratio</span>
          <strong title={`${ratioText}%`}>{ratioText}%</strong>
        </div>
        <input
          className="slider-input"
          type="range"
          min="2000"
          max="30000"
          step="10"
          value={ratioBps}
          onChange={(event) => onRatioBpsChange(Number.parseInt(event.target.value, 10))}
        />
        <div className="slider-meta">
          <span>连续变化范围</span>
          <strong>20.00% ~ 300.00%</strong>
        </div>
      </div>

      <div className="quick-actions">
        <button type="button" onClick={() => setQuickRatio(5000)}>
          50%
        </button>
        <button type="button" onClick={() => setQuickRatio(10000)}>
          100%
        </button>
        <button type="button" onClick={() => setQuickRatio(15000)}>
          150%
        </button>
        <button type="button" onClick={() => setQuickRatio(20000)}>
          200%
        </button>
      </div>

      <div className="preview-grid">
        <div>
          <span>Base {tokenXSymbol}</span>
          <strong title={baseXText}>{baseXText}</strong>
        </div>
        <div>
          <span>Live {tokenXSymbol}</span>
          <strong title={liveXText}>{liveXText}</strong>
        </div>
        <div>
          <span>Base {tokenYSymbol}</span>
          <strong title={baseYText}>{baseYText}</strong>
        </div>
        <div>
          <span>Live {tokenYSymbol}</span>
          <strong title={liveYText}>{liveYText}</strong>
        </div>
      </div>

      <ActionButton variant="secondary" onClick={onReset}>
        重置到 100%
      </ActionButton>
    </Card>
  );
}
