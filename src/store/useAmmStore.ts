import { useMemo, useState } from 'react';
import {
  applyAddLiquidity,
  applyRemoveLiquidity,
  applySwapExactIn,
  cloneState,
  createInitialPoolState,
  quoteAddLiquidity,
  quoteRemoveLiquidity,
  quoteSwapExactIn,
  spotPriceYPerX
} from '../core/ammV2';
import { parseFp } from '../core/math';
import { deserializePoolState, serializePoolState } from '../core/serialization';
import {
  AddLiquidityQuote,
  OperationKind,
  PoolState,
  PresetConfig,
  PresetId,
  RemoveLiquidityQuote,
  SerializedPoolState,
  SwapDirection,
  SwapQuote,
  TimelineEntry,
  TokenInfo
} from '../core/types';

const PRESETS: PresetConfig[] = [
  {
    id: 'deep',
    label: 'Deep Pool',
    tokenX: { symbol: 'ETH', decimals: 18 },
    tokenY: { symbol: 'USDC', decimals: 6 },
    reserveX: '10000',
    reserveY: '20000000',
    feeRate: '0.003'
  },
  {
    id: 'shallow',
    label: 'Shallow Pool',
    tokenX: { symbol: 'ETH', decimals: 18 },
    tokenY: { symbol: 'USDC', decimals: 6 },
    reserveX: '100',
    reserveY: '200000',
    feeRate: '0.003'
  },
  {
    id: 'imbalanced',
    label: 'Imbalanced',
    tokenX: { symbol: 'ETH', decimals: 18 },
    tokenY: { symbol: 'USDC', decimals: 6 },
    reserveX: '10000',
    reserveY: '6000000',
    feeRate: '0.003'
  },
  {
    id: 'zeroFee',
    label: '0 Fee',
    tokenX: { symbol: 'TOKEN-A', decimals: 18 },
    tokenY: { symbol: 'TOKEN-B', decimals: 18 },
    reserveX: '10000',
    reserveY: '10000',
    feeRate: '0'
  }
];

export interface TimelineState {
  selectedPreset: PresetId;
  timeline: TimelineEntry[];
  cursor: number;
  nextId: number;
}

export interface CommitPayload {
  kind: OperationKind;
  label: string;
  snapshot: PoolState;
}

export function presetById(id: PresetId): PresetConfig {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

export function stateFromPreset(id: PresetId): PoolState {
  const preset = presetById(id);
  return createInitialPoolState({
    tokenX: preset.tokenX,
    tokenY: preset.tokenY,
    reserveX: preset.reserveX,
    reserveY: preset.reserveY,
    feeRate: preset.feeRate
  });
}

export function initTimelineState(id: PresetId): TimelineState {
  const initial = stateFromPreset(id);
  return {
    selectedPreset: id,
    timeline: [
      {
        id: 0,
        kind: 'init',
        label: `Init (${presetById(id).label})`,
        snapshot: cloneState(initial),
        createdAt: Date.now()
      }
    ],
    cursor: 0,
    nextId: 1
  };
}

export function commitEntry(state: TimelineState, payload: CommitPayload): TimelineState {
  const base = state.timeline.slice(0, state.cursor + 1);
  const entry: TimelineEntry = {
    id: state.nextId,
    kind: payload.kind,
    label: payload.label,
    snapshot: cloneState(payload.snapshot),
    createdAt: Date.now()
  };
  const timeline = [...base, entry];
  return {
    ...state,
    timeline,
    cursor: timeline.length - 1,
    nextId: state.nextId + 1
  };
}

export function currentSnapshot(state: TimelineState): PoolState {
  return state.timeline[state.cursor].snapshot;
}

export function undoTimeline(state: TimelineState): TimelineState {
  if (state.cursor === 0) {
    return state;
  }
  return {
    ...state,
    cursor: state.cursor - 1
  };
}

export function redoTimeline(state: TimelineState): TimelineState {
  if (state.cursor >= state.timeline.length - 1) {
    return state;
  }
  return {
    ...state,
    cursor: state.cursor + 1
  };
}

export function jumpToTimeline(state: TimelineState, index: number): TimelineState {
  if (index < 0 || index >= state.timeline.length) {
    return state;
  }
  return {
    ...state,
    cursor: index
  };
}

function validateTokenInfo(token: TokenInfo): TokenInfo {
  const symbol = token.symbol.trim() || 'TOKEN';
  const decimals = Number.isFinite(token.decimals)
    ? Math.max(0, Math.min(36, Math.trunc(token.decimals)))
    : 18;
  return { symbol, decimals };
}

export function useAmmStore() {
  const [timelineState, setTimelineState] = useState<TimelineState>(() => initTimelineState('deep'));
  const present = timelineState.timeline[timelineState.cursor].snapshot;

  const actions = useMemo(
    () => ({
      quoteSwap(direction: SwapDirection, amountIn: bigint): SwapQuote {
        return quoteSwapExactIn(present, direction, amountIn);
      },
      applySwap(direction: SwapDirection, amountIn: bigint): SwapQuote {
        const quote = quoteSwapExactIn(present, direction, amountIn);
        if (!quote.ok) {
          return quote;
        }
        setTimelineState((prev) => {
          const current = currentSnapshot(prev);
          const verifiedQuote = quoteSwapExactIn(current, direction, amountIn);
          if (!verifiedQuote.ok) {
            return prev;
          }
          const next = applySwapExactIn(current, verifiedQuote);
          const symbolIn = direction === 'X_TO_Y' ? current.tokenX.symbol : current.tokenY.symbol;
          const symbolOut = direction === 'X_TO_Y' ? current.tokenY.symbol : current.tokenX.symbol;
          return commitEntry(prev, {
            kind: 'swap',
            label: `Swap ${symbolIn}->${symbolOut}`,
            snapshot: next
          });
        });
        return quote;
      },
      quoteAddLiquidity(amountXIn: bigint, amountYIn: bigint): AddLiquidityQuote {
        return quoteAddLiquidity(present, amountXIn, amountYIn);
      },
      applyAddLiquidity(amountXIn: bigint, amountYIn: bigint): AddLiquidityQuote {
        const quote = quoteAddLiquidity(present, amountXIn, amountYIn);
        if (!quote.ok) {
          return quote;
        }
        setTimelineState((prev) => {
          const current = currentSnapshot(prev);
          const verifiedQuote = quoteAddLiquidity(current, amountXIn, amountYIn);
          if (!verifiedQuote.ok) {
            return prev;
          }
          const next = applyAddLiquidity(current, verifiedQuote);
          return commitEntry(prev, {
            kind: 'add',
            label: `Add Liquidity (${current.tokenX.symbol}/${current.tokenY.symbol})`,
            snapshot: next
          });
        });
        return quote;
      },
      quoteRemoveLiquidity(burnLp: bigint): RemoveLiquidityQuote {
        return quoteRemoveLiquidity(present, burnLp);
      },
      applyRemoveLiquidity(burnLp: bigint): RemoveLiquidityQuote {
        const quote = quoteRemoveLiquidity(present, burnLp);
        if (!quote.ok) {
          return quote;
        }
        setTimelineState((prev) => {
          const current = currentSnapshot(prev);
          const verifiedQuote = quoteRemoveLiquidity(current, burnLp);
          if (!verifiedQuote.ok) {
            return prev;
          }
          const next = applyRemoveLiquidity(current, verifiedQuote);
          return commitEntry(prev, {
            kind: 'remove',
            label: `Remove Liquidity (${current.tokenX.symbol}/${current.tokenY.symbol})`,
            snapshot: next
          });
        });
        return quote;
      },
      setPreset(nextPreset: PresetId) {
        setTimelineState(initTimelineState(nextPreset));
      },
      reset() {
        setTimelineState((prev) => initTimelineState(prev.selectedPreset));
      },
      undo() {
        setTimelineState((prev) => undoTimeline(prev));
      },
      redo() {
        setTimelineState((prev) => redoTimeline(prev));
      },
      jumpTo(index: number) {
        setTimelineState((prev) => jumpToTimeline(prev, index));
      },
      updateTokenMeta(tokenX: TokenInfo, tokenY: TokenInfo) {
        setTimelineState((prev) => {
          const current = currentSnapshot(prev);
          const nextSnapshot: PoolState = {
            ...cloneState(current),
            tokenX: validateTokenInfo(tokenX),
            tokenY: validateTokenInfo(tokenY)
          };
          return commitEntry(prev, {
            kind: 'reset',
            label: 'Update Token Meta',
            snapshot: nextSnapshot
          });
        });
      },
      updateFeeRate(feeRateInput: string) {
        setTimelineState((prev) => {
          const parsed = parseFp(feeRateInput);
          if (parsed < 0n || parsed >= 1_000_000_000_000_000_000n) {
            return prev;
          }
          const current = currentSnapshot(prev);
          const nextSnapshot: PoolState = {
            ...cloneState(current),
            feeRate: parsed
          };
          return commitEntry(prev, {
            kind: 'reset',
            label: 'Update Fee Rate',
            snapshot: nextSnapshot
          });
        });
      },
      exportState() {
        const payload = {
          exportedAt: new Date().toISOString(),
          selectedPreset: timelineState.selectedPreset,
          cursor: timelineState.cursor,
          timeline: timelineState.timeline.map((entry) => ({
            id: entry.id,
            kind: entry.kind,
            label: entry.label,
            createdAt: entry.createdAt,
            snapshot: serializePoolState(entry.snapshot)
          }))
        };
        return JSON.stringify(payload, null, 2);
      },
      importState(raw: string): { ok: boolean; error?: string } {
        try {
          const parsed = JSON.parse(raw) as {
            timeline?: Array<{
              id: number;
              kind: OperationKind;
              label: string;
              createdAt: number;
              snapshot: SerializedPoolState;
            }>;
            cursor?: number;
            selectedPreset?: PresetId;
          };
          if (!parsed.timeline || parsed.timeline.length === 0) {
            return { ok: false, error: 'Import payload has no timeline entries' };
          }
          const timeline: TimelineEntry[] = parsed.timeline.map((item, index) => ({
            id: Number.isFinite(item.id) ? item.id : index,
            kind: item.kind,
            label: item.label,
            createdAt: item.createdAt,
            snapshot: deserializePoolState(item.snapshot)
          }));
          const cursor =
            typeof parsed.cursor === 'number' && parsed.cursor >= 0 && parsed.cursor < timeline.length
              ? parsed.cursor
              : timeline.length - 1;

          setTimelineState({
            selectedPreset: parsed.selectedPreset ?? timelineState.selectedPreset,
            timeline,
            cursor,
            nextId: Math.max(...timeline.map((entry) => entry.id), 0) + 1
          });
          return { ok: true };
        } catch {
          return { ok: false, error: 'Import failed: invalid JSON payload' };
        }
      },
      spotPrice(): bigint {
        return spotPriceYPerX(present);
      }
    }),
    [present, timelineState]
  );

  return {
    presets: PRESETS,
    selectedPreset: timelineState.selectedPreset,
    timeline: timelineState.timeline,
    cursor: timelineState.cursor,
    present,
    canUndo: timelineState.cursor > 0,
    canRedo: timelineState.cursor < timelineState.timeline.length - 1,
    actions
  };
}
