import { AddLiquidityCard } from '../components/actions/AddLiquidityCard';
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
import { useAmmStore } from '../store/useAmmStore';

export function Home() {
  const store = useAmmStore();
  const state = store.present;

  return (
    <AppShell
      header={
        <HeaderBar
          presets={store.presets}
          selectedPreset={store.selectedPreset}
          tokenX={state.tokenX}
          tokenY={state.tokenY}
          feeRate={state.feeRate}
          onPresetChange={store.actions.setPreset}
          onReset={store.actions.reset}
          onExport={store.actions.exportState}
          onImport={store.actions.importState}
          onUpdateTokenMeta={store.actions.updateTokenMeta}
          onUpdateFeeRate={store.actions.updateFeeRate}
        />
      }
      left={
        <>
          <SwapCard
            tokenXSymbol={state.tokenX.symbol}
            tokenYSymbol={state.tokenY.symbol}
            reserveX={state.reserveX}
            reserveY={state.reserveY}
            onQuote={store.actions.quoteSwap}
            onSwap={store.actions.applySwap}
          />
          <AddLiquidityCard
            tokenXSymbol={state.tokenX.symbol}
            tokenYSymbol={state.tokenY.symbol}
            reserveX={state.reserveX}
            reserveY={state.reserveY}
            onQuote={store.actions.quoteAddLiquidity}
            onAdd={store.actions.applyAddLiquidity}
          />
          <RemoveLiquidityCard
            tokenXSymbol={state.tokenX.symbol}
            tokenYSymbol={state.tokenY.symbol}
            lpUserBalance={state.lpUserBalance}
            onQuote={store.actions.quoteRemoveLiquidity}
            onRemove={store.actions.applyRemoveLiquidity}
          />
        </>
      }
      center={
        <>
          <PoolStateStrip state={state} />
          <CurveChartV2 state={state} />
          <PriceTimelineChart timeline={store.timeline} cursor={store.cursor} />
        </>
      }
      right={
        <>
          <MetricsPanel state={state} />
          <HistoryPanel
            timeline={store.timeline}
            cursor={store.cursor}
            canUndo={store.canUndo}
            canRedo={store.canRedo}
            onUndo={store.actions.undo}
            onRedo={store.actions.redo}
            onJumpTo={store.actions.jumpTo}
          />
          <SnapshotViewer state={state} />
        </>
      }
    />
  );
}
