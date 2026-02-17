import { useEffect, useMemo, useState } from 'react';
import { AddLiquidityCard } from '../components/actions/AddLiquidityCard';
import { ContinuousCurveCard } from '../components/actions/ContinuousCurveCard';
import { ExternalArbitrageCard } from '../components/actions/ExternalArbitrageCard';
import { RemoveLiquidityCard } from '../components/actions/RemoveLiquidityCard';
import { SwapCard } from '../components/actions/SwapCard';
import { CurveChartV2 } from '../components/charts/CurveChartV2';
import { PoolStateStrip } from '../components/charts/PoolStateStrip';
import { PriceTimelineChart } from '../components/charts/PriceTimelineChart';
import { AppShell } from '../components/layout/AppShell';
import { HeaderBar } from '../components/layout/HeaderBar';
import { HistoryPanel } from '../components/panels/HistoryPanel';
import { MetricsPanel } from '../components/panels/MetricsPanel';
import { SnapshotViewer } from '../components/panels/SnapshotViewer';
import { cloneState, spotPriceYPerX } from '../core/ammV2';
import { formatFp, toNumber } from '../core/math';
import { useAmmStore } from '../store/useAmmStore';

export function Home() {
  const store = useAmmStore();
  const baseState = store.present;
  const [activeTab, setActiveTab] = useState<'trade' | 'continuous'>('trade');
  const [continuousRatioBps, setContinuousRatioBps] = useState(10000);

  useEffect(() => {
    setContinuousRatioBps(10000);
  }, [baseState.reserveX, baseState.reserveY, baseState.t]);

  const continuousState = useMemo(() => {
    const ratio = BigInt(Math.max(2000, Math.min(30000, continuousRatioBps)));
    const reserveX = (baseState.reserveX * ratio) / 10_000n;
    const safeReserveX = reserveX > 0n ? reserveX : 1n;
    const baseK = baseState.reserveX * baseState.reserveY;
    const reserveY = baseK / safeReserveX;

    const next = cloneState(baseState);
    next.reserveX = safeReserveX;
    next.reserveY = reserveY > 0n ? reserveY : 1n;
    next.lastTrade = null;
    return next;
  }, [baseState, continuousRatioBps]);

  const baseSpotText = `${formatFp(spotPriceYPerX(baseState), 8)} ${baseState.tokenY.symbol}/${baseState.tokenX.symbol}`;
  const liveSpotText = `${formatFp(spotPriceYPerX(continuousState), 8)} ${baseState.tokenY.symbol}/${baseState.tokenX.symbol}`;
  const baseXNum = toNumber(baseState.reserveX);
  const continuousXDomain = {
    min: Math.max(1e-9, baseXNum * 0.2),
    max: Math.max(1e-9, baseXNum * 3)
  };

  const header = (
    <HeaderBar
      presets={store.presets}
      selectedPreset={store.selectedPreset}
      tokenX={baseState.tokenX}
      tokenY={baseState.tokenY}
      feeRate={baseState.feeRate}
      onPresetChange={store.actions.setPreset}
      onReset={store.actions.reset}
      onExport={store.actions.exportState}
      onImport={store.actions.importState}
      onUpdateTokenMeta={store.actions.updateTokenMeta}
      onUpdateFeeRate={store.actions.updateFeeRate}
    />
  );

  const toolbar = (
    <section className="tab-switch">
      <button type="button" className={activeTab === 'trade' ? 'active' : ''} onClick={() => setActiveTab('trade')}>
        交易实验
      </button>
      <button
        type="button"
        className={activeTab === 'continuous' ? 'active' : ''}
        onClick={() => setActiveTab('continuous')}
      >
        连续曲线
      </button>
    </section>
  );

  if (activeTab === 'continuous') {
    return (
      <AppShell
        header={header}
        toolbar={toolbar}
        columns="two"
        left={
          <>
            <ContinuousCurveCard
              tokenXSymbol={baseState.tokenX.symbol}
              tokenYSymbol={baseState.tokenY.symbol}
              baseReserveX={baseState.reserveX}
              baseReserveY={baseState.reserveY}
              liveReserveX={continuousState.reserveX}
              liveReserveY={continuousState.reserveY}
              ratioBps={continuousRatioBps}
              onRatioBpsChange={setContinuousRatioBps}
              onReset={() => setContinuousRatioBps(10000)}
            />
          </>
        }
        center={
          <>
            <PoolStateStrip state={continuousState} />
            <CurveChartV2
              state={continuousState}
              xDomain={continuousXDomain}
              referencePoint={{
                x: baseState.reserveX,
                y: baseState.reserveY,
                label: 'Base'
              }}
            />
            <section className="card">
              <header className="card-header">
                <h3>Continuous Mode</h3>
              </header>
              <div className="card-content">
                <p className="hint" title={liveSpotText}>
                  当前 Spot: {liveSpotText}
                </p>
                <p className="hint" title={baseSpotText}>
                  基准 Spot: {baseSpotText}
                </p>
                <p className="hint">该模式只用于连续观察曲线，不触发 swap/add/remove，也不会更新 History 与 Last Trade。</p>
              </div>
            </section>
          </>
        }
      />
    );
  }

  return (
    <AppShell
      header={header}
      toolbar={toolbar}
      left={
        <>
          <SwapCard
            tokenXSymbol={baseState.tokenX.symbol}
            tokenYSymbol={baseState.tokenY.symbol}
            reserveX={baseState.reserveX}
            reserveY={baseState.reserveY}
            onQuote={store.actions.quoteSwap}
            onSwap={store.actions.applySwap}
          />
          <ExternalArbitrageCard
            tokenXSymbol={baseState.tokenX.symbol}
            tokenYSymbol={baseState.tokenY.symbol}
            spotPriceYPerX={store.actions.spotPrice()}
            onQuote={store.actions.quoteArbitrage}
            onApplyStep={store.actions.applyArbitrage}
            onApplyAuto={store.actions.applyArbitrageAuto}
          />
          <AddLiquidityCard
            tokenXSymbol={baseState.tokenX.symbol}
            tokenYSymbol={baseState.tokenY.symbol}
            reserveX={baseState.reserveX}
            reserveY={baseState.reserveY}
            onQuote={store.actions.quoteAddLiquidity}
            onAdd={store.actions.applyAddLiquidity}
          />
          <RemoveLiquidityCard
            tokenXSymbol={baseState.tokenX.symbol}
            tokenYSymbol={baseState.tokenY.symbol}
            lpUserBalance={baseState.lpUserBalance}
            onQuote={store.actions.quoteRemoveLiquidity}
            onRemove={store.actions.applyRemoveLiquidity}
          />
        </>
      }
      center={
        <>
          <PoolStateStrip state={baseState} />
          <CurveChartV2 state={baseState} />
          <PriceTimelineChart timeline={store.timeline} cursor={store.cursor} />
        </>
      }
      right={
        <>
          <MetricsPanel state={baseState} />
          <HistoryPanel
            timeline={store.timeline}
            cursor={store.cursor}
            canUndo={store.canUndo}
            canRedo={store.canRedo}
            onUndo={store.actions.undo}
            onRedo={store.actions.redo}
            onJumpTo={store.actions.jumpTo}
          />
          <SnapshotViewer state={baseState} />
        </>
      }
    />
  );
}
