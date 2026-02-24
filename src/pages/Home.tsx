import { useEffect, useMemo, useState } from 'react';
import { ContinuousCurveCard } from '../components/actions/ContinuousCurveCard';
import { ExternalArbitrageCard } from '../components/actions/ExternalArbitrageCard';
import { LiquidityCard } from '../components/actions/LiquidityCard';
import { LiquidityCardV3 } from '../components/actions/LiquidityCardV3';
import { SwapCard } from '../components/actions/SwapCard';
import { SwapCardV3 } from '../components/actions/SwapCardV3';
import { CurveChartV2 } from '../components/charts/CurveChartV2';
import { LiquidityRangeChartV3 } from '../components/charts/LiquidityRangeChartV3';
import { PoolStateStrip } from '../components/charts/PoolStateStrip';
import { PoolStateStripV3 } from '../components/charts/PoolStateStripV3';
import { PriceTimelineChart } from '../components/charts/PriceTimelineChart';
import { AppShell } from '../components/layout/AppShell';
import { HeaderBar } from '../components/layout/HeaderBar';
import { HistoryPanel } from '../components/panels/HistoryPanel';
import { MetricsPanel } from '../components/panels/MetricsPanel';
import { MetricsPanelV3 } from '../components/panels/MetricsPanelV3';
import { SnapshotViewer } from '../components/panels/SnapshotViewer';
import { SnapshotViewerV3 } from '../components/panels/SnapshotViewerV3';
import { cloneState, spotPriceYPerX } from '../core/ammV2';
import { formatFp, toNumber } from '../core/math';
import { AmmModel } from '../core/types';
import { useAmmStore } from '../store/useAmmStore';
import { useAmmV3Store } from '../store/useAmmV3Store';

export function Home() {
  const v2Store = useAmmStore();
  const v3Store = useAmmV3Store();

  const [model, setModel] = useState<AmmModel>('v2');
  const [activeTab, setActiveTab] = useState<'trade' | 'continuous'>('trade');
  const [continuousRatioBps, setContinuousRatioBps] = useState(10000);

  const baseState = v2Store.present;

  useEffect(() => {
    setContinuousRatioBps(10000);
  }, [baseState.reserveX, baseState.reserveY, baseState.t]);

  useEffect(() => {
    setActiveTab('trade');
  }, [model]);

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

  const v2Header = (
    <HeaderBar
      model={model}
      onModelChange={setModel}
      presets={v2Store.presets}
      selectedPreset={v2Store.selectedPreset}
      tokenX={baseState.tokenX}
      tokenY={baseState.tokenY}
      feeRate={baseState.feeRate}
      onPresetChange={(preset) => v2Store.actions.setPreset(preset as typeof v2Store.selectedPreset)}
      onReset={v2Store.actions.reset}
      onExport={v2Store.actions.exportState}
      onImport={v2Store.actions.importState}
      onUpdateTokenMeta={v2Store.actions.updateTokenMeta}
      onUpdateFeeRate={v2Store.actions.updateFeeRate}
    />
  );

  const v2Toolbar = (
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

  if (model === 'v2' && activeTab === 'continuous') {
    return (
      <AppShell
        header={v2Header}
        toolbar={v2Toolbar}
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

  if (model === 'v2') {
    return (
      <AppShell
        header={v2Header}
        toolbar={v2Toolbar}
        left={
          <>
            <SwapCard
              tokenXSymbol={baseState.tokenX.symbol}
              tokenYSymbol={baseState.tokenY.symbol}
              reserveX={baseState.reserveX}
              reserveY={baseState.reserveY}
              onQuote={v2Store.actions.quoteSwap}
              onSwap={v2Store.actions.applySwap}
            />
            <ExternalArbitrageCard
              tokenXSymbol={baseState.tokenX.symbol}
              tokenYSymbol={baseState.tokenY.symbol}
              spotPriceYPerX={v2Store.actions.spotPrice()}
              onQuote={v2Store.actions.quoteArbitrage}
              onApplyStep={v2Store.actions.applyArbitrage}
              onApplyAuto={v2Store.actions.applyArbitrageAuto}
            />
            <LiquidityCard
              tokenXSymbol={baseState.tokenX.symbol}
              tokenYSymbol={baseState.tokenY.symbol}
              reserveX={baseState.reserveX}
              reserveY={baseState.reserveY}
              lpUserBalance={baseState.lpUserBalance}
              onQuoteDeposit={v2Store.actions.quoteAddLiquidity}
              onDeposit={v2Store.actions.applyAddLiquidity}
              onQuoteWithdraw={v2Store.actions.quoteRemoveLiquidity}
              onWithdraw={v2Store.actions.applyRemoveLiquidity}
            />
          </>
        }
        center={
          <>
            <PoolStateStrip state={baseState} />
            <CurveChartV2 state={baseState} />
            <PriceTimelineChart timeline={v2Store.timeline} cursor={v2Store.cursor} />
          </>
        }
        right={
          <>
            <MetricsPanel state={baseState} />
            <HistoryPanel
              timeline={v2Store.timeline}
              cursor={v2Store.cursor}
              canUndo={v2Store.canUndo}
              canRedo={v2Store.canRedo}
              onUndo={v2Store.actions.undo}
              onRedo={v2Store.actions.redo}
              onJumpTo={v2Store.actions.jumpTo}
            />
            <SnapshotViewer state={baseState} />
          </>
        }
      />
    );
  }

  const v3State = v3Store.present;
  const v3Header = (
    <HeaderBar
      model={model}
      onModelChange={setModel}
      presets={v3Store.presets}
      selectedPreset={v3Store.selectedPreset}
      tokenX={v3State.tokenX}
      tokenY={v3State.tokenY}
      feeTier={v3State.feeTier}
      onPresetChange={(preset) => v3Store.actions.setPreset(preset as typeof v3Store.selectedPreset)}
      onReset={v3Store.actions.reset}
      onExport={v3Store.actions.exportState}
      onImport={v3Store.actions.importState}
      onUpdateTokenMeta={v3Store.actions.updateTokenMeta}
      onUpdateFeeTier={v3Store.actions.updateFeeTier}
    />
  );

  const v3Toolbar = (
    <section className="tab-switch">
      <button type="button" className={activeTab === 'trade' ? 'active' : ''} onClick={() => setActiveTab('trade')}>
        交易实验
      </button>
      <button type="button" className={activeTab === 'continuous' ? 'active disabled' : 'disabled'} disabled>
        连续曲线（V3 首版未支持）
      </button>
    </section>
  );

  if (activeTab === 'continuous') {
    return (
      <AppShell
        header={v3Header}
        toolbar={v3Toolbar}
        columns="two"
        left={<section className="card"><header className="card-header"><h3>V3 Continuous Mode</h3></header><div className="card-content"><p className="hint">V3 首版不包含连续曲线模式，请在交易实验页进行 swap 与流动性操作。</p></div></section>}
        center={<LiquidityRangeChartV3 state={v3State} />}
      />
    );
  }

  return (
    <AppShell
      header={v3Header}
      toolbar={v3Toolbar}
      left={
        <>
          <SwapCardV3
            tokenXSymbol={v3State.tokenX.symbol}
            tokenYSymbol={v3State.tokenY.symbol}
            activeLiquidity={v3State.liquidity}
            tickCurrent={v3State.tickCurrent}
            onQuote={v3Store.actions.quoteSwap}
            onSwap={v3Store.actions.applySwap}
          />
          <LiquidityCardV3
            tokenXSymbol={v3State.tokenX.symbol}
            tokenYSymbol={v3State.tokenY.symbol}
            tickSpacing={v3State.tickSpacing}
            tickLower={v3State.position.tickLower}
            tickUpper={v3State.position.tickUpper}
            positionLiquidity={v3State.position.liquidity}
            onQuoteAdd={v3Store.actions.quoteAddLiquidity}
            onAdd={v3Store.actions.applyAddLiquidity}
            onQuoteRemove={v3Store.actions.quoteRemoveLiquidity}
            onRemove={v3Store.actions.applyRemoveLiquidity}
          />
        </>
      }
      center={
        <>
          <PoolStateStripV3 state={v3State} />
          <LiquidityRangeChartV3 state={v3State} />
          <section className="card">
            <header className="card-header">
              <h3>V3 Mode Notes</h3>
            </header>
            <div className="card-content">
              <p className="hint">支持集中流动性、单仓位 LP、跨 tick 边界与 partial fill（超范围输入保留）。</p>
              <p className="hint">首版不包含外部套利和连续曲线模式。</p>
              <p className="hint">当前 Spot: {formatFp(v3Store.actions.spotPrice(), 8)} {v3State.tokenY.symbol}/{v3State.tokenX.symbol}</p>
            </div>
          </section>
        </>
      }
      right={
        <>
          <MetricsPanelV3 state={v3State} />
          <HistoryPanel
            timeline={v3Store.timeline}
            cursor={v3Store.cursor}
            canUndo={v3Store.canUndo}
            canRedo={v3Store.canRedo}
            onUndo={v3Store.actions.undo}
            onRedo={v3Store.actions.redo}
            onJumpTo={v3Store.actions.jumpTo}
          />
          <SnapshotViewerV3 state={v3State} />
        </>
      }
    />
  );
}
