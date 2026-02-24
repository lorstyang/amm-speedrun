import { useMemo, useState } from 'react';
import {
  applyV3AddLiquidity,
  applyV3RemoveLiquidity,
  applyV3SwapExactIn,
  cloneV3State,
  createInitialV3PoolState,
  quoteV3AddLiquidity,
  quoteV3RemoveLiquidity,
  quoteV3SwapExactIn,
  spotPriceV3YPerX
} from '../core/ammV3';
import { deserializeV3PoolState, serializeV3PoolState } from '../core/serializationV3';
import { FEE_TIER_TO_TICK_SPACING, MAX_TICK, MIN_TICK } from '../core/v3/constants';
import {
  OperationKind,
  SwapDirection,
  TimelineEntry,
  TokenInfo,
  V3AddLiquidityParams,
  V3AddLiquidityQuote,
  V3FeeTier,
  V3PoolState,
  V3RemoveLiquidityQuote,
  V3SwapQuote,
  V3TimelineEntry
} from '../core/types';

export type V3PresetId = 'balanced' | 'narrow' | 'wide';

interface V3PresetConfig {
  id: V3PresetId;
  label: string;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  feeTier: V3FeeTier;
  initialPriceYPerX: string;
  tickLower: number;
  tickUpper: number;
  initialAmountX: string;
  initialAmountY: string;
}

const PRESETS: V3PresetConfig[] = [
  {
    id: 'balanced',
    label: 'Balanced 0.3%',
    tokenX: { symbol: 'ETH', decimals: 18 },
    tokenY: { symbol: 'USDC', decimals: 6 },
    feeTier: 3000,
    initialPriceYPerX: '2000',
    tickLower: 74400,
    tickUpper: 78000,
    initialAmountX: '50',
    initialAmountY: '100000'
  },
  {
    id: 'narrow',
    label: 'Narrow 0.05%',
    tokenX: { symbol: 'ETH', decimals: 18 },
    tokenY: { symbol: 'USDC', decimals: 6 },
    feeTier: 500,
    initialPriceYPerX: '2000',
    tickLower: 75800,
    tickUpper: 76200,
    initialAmountX: '20',
    initialAmountY: '40000'
  },
  {
    id: 'wide',
    label: 'Wide 1%',
    tokenX: { symbol: 'ETH', decimals: 18 },
    tokenY: { symbol: 'USDC', decimals: 6 },
    feeTier: 10000,
    initialPriceYPerX: '2000',
    tickLower: 70000,
    tickUpper: 82000,
    initialAmountX: '100',
    initialAmountY: '200000'
  }
];

export interface V3TimelineState {
  selectedPreset: V3PresetId;
  timeline: V3TimelineEntry[];
  cursor: number;
  nextId: number;
}

export interface V3CommitPayload {
  kind: OperationKind;
  label: string;
  snapshot: V3PoolState;
}

function clampTickToSpacing(tick: number, spacing: number, mode: 'down' | 'up'): number {
  const safe = Math.max(MIN_TICK, Math.min(MAX_TICK, tick));
  const remainder = ((safe % spacing) + spacing) % spacing;
  if (mode === 'down') {
    return Math.max(MIN_TICK, safe - remainder);
  }
  if (remainder === 0) {
    return safe;
  }
  return Math.min(MAX_TICK, safe + (spacing - remainder));
}

function normalizeRange(tickLower: number, tickUpper: number, spacing: number): { tickLower: number; tickUpper: number } {
  let lower = clampTickToSpacing(tickLower, spacing, 'down');
  let upper = clampTickToSpacing(tickUpper, spacing, 'up');

  if (upper <= lower) {
    upper = Math.min(MAX_TICK, lower + spacing);
  }
  if (upper <= lower) {
    lower = Math.max(MIN_TICK, upper - spacing);
  }

  return { tickLower: lower, tickUpper: upper };
}

export function presetByIdV3(id: V3PresetId): V3PresetConfig {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0];
}

export function stateFromPresetV3(id: V3PresetId): V3PoolState {
  const preset = presetByIdV3(id);
  return createInitialV3PoolState({
    tokenX: preset.tokenX,
    tokenY: preset.tokenY,
    feeTier: preset.feeTier,
    initialPriceYPerX: preset.initialPriceYPerX,
    tickLower: preset.tickLower,
    tickUpper: preset.tickUpper,
    initialAmountX: preset.initialAmountX,
    initialAmountY: preset.initialAmountY
  });
}

export function initTimelineStateV3(id: V3PresetId): V3TimelineState {
  const initial = stateFromPresetV3(id);
  return {
    selectedPreset: id,
    timeline: [
      {
        id: 0,
        kind: 'init',
        label: `Init (${presetByIdV3(id).label})`,
        snapshot: cloneV3State(initial),
        createdAt: Date.now()
      }
    ],
    cursor: 0,
    nextId: 1
  };
}

export function commitEntryV3(state: V3TimelineState, payload: V3CommitPayload): V3TimelineState {
  const base = state.timeline.slice(0, state.cursor + 1);
  const entry: TimelineEntry<V3PoolState> = {
    id: state.nextId,
    kind: payload.kind,
    label: payload.label,
    snapshot: cloneV3State(payload.snapshot),
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

export function currentSnapshotV3(state: V3TimelineState): V3PoolState {
  return state.timeline[state.cursor].snapshot;
}

export function undoTimelineV3(state: V3TimelineState): V3TimelineState {
  if (state.cursor === 0) {
    return state;
  }
  return {
    ...state,
    cursor: state.cursor - 1
  };
}

export function redoTimelineV3(state: V3TimelineState): V3TimelineState {
  if (state.cursor >= state.timeline.length - 1) {
    return state;
  }
  return {
    ...state,
    cursor: state.cursor + 1
  };
}

export function jumpToTimelineV3(state: V3TimelineState, index: number): V3TimelineState {
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

export function useAmmV3Store() {
  const [timelineState, setTimelineState] = useState<V3TimelineState>(() => initTimelineStateV3('balanced'));
  const present = timelineState.timeline[timelineState.cursor].snapshot;

  const actions = useMemo(
    () => ({
      quoteSwap(direction: SwapDirection, amountIn: bigint): V3SwapQuote {
        return quoteV3SwapExactIn(present, direction, amountIn);
      },
      applySwap(direction: SwapDirection, amountIn: bigint): V3SwapQuote {
        const quote = quoteV3SwapExactIn(present, direction, amountIn);
        if (!quote.ok) {
          return quote;
        }

        setTimelineState((prev) => {
          const current = currentSnapshotV3(prev);
          const verifiedQuote = quoteV3SwapExactIn(current, direction, amountIn);
          if (!verifiedQuote.ok) {
            return prev;
          }

          const next = applyV3SwapExactIn(current, verifiedQuote);
          const symbolIn = direction === 'X_TO_Y' ? current.tokenX.symbol : current.tokenY.symbol;
          const symbolOut = direction === 'X_TO_Y' ? current.tokenY.symbol : current.tokenX.symbol;
          return commitEntryV3(prev, {
            kind: 'swap',
            label: `Swap ${symbolIn}->${symbolOut}`,
            snapshot: next
          });
        });

        return quote;
      },
      quoteAddLiquidity(params: V3AddLiquidityParams): V3AddLiquidityQuote {
        return quoteV3AddLiquidity(present, params);
      },
      applyAddLiquidity(params: V3AddLiquidityParams): V3AddLiquidityQuote {
        const quote = quoteV3AddLiquidity(present, params);
        if (!quote.ok) {
          return quote;
        }

        setTimelineState((prev) => {
          const current = currentSnapshotV3(prev);
          const verified = quoteV3AddLiquidity(current, params);
          if (!verified.ok) {
            return prev;
          }

          const next = applyV3AddLiquidity(current, verified);
          return commitEntryV3(prev, {
            kind: 'add',
            label: `Add Liquidity (${current.tokenX.symbol}/${current.tokenY.symbol})`,
            snapshot: next
          });
        });

        return quote;
      },
      quoteRemoveLiquidity(liquidityDelta: bigint): V3RemoveLiquidityQuote {
        return quoteV3RemoveLiquidity(present, liquidityDelta);
      },
      applyRemoveLiquidity(liquidityDelta: bigint): V3RemoveLiquidityQuote {
        const quote = quoteV3RemoveLiquidity(present, liquidityDelta);
        if (!quote.ok) {
          return quote;
        }

        setTimelineState((prev) => {
          const current = currentSnapshotV3(prev);
          const verified = quoteV3RemoveLiquidity(current, liquidityDelta);
          if (!verified.ok) {
            return prev;
          }

          const next = applyV3RemoveLiquidity(current, verified);
          return commitEntryV3(prev, {
            kind: 'remove',
            label: `Remove Liquidity (${current.tokenX.symbol}/${current.tokenY.symbol})`,
            snapshot: next
          });
        });

        return quote;
      },
      setPreset(nextPreset: V3PresetId) {
        setTimelineState(initTimelineStateV3(nextPreset));
      },
      reset() {
        setTimelineState((prev) => initTimelineStateV3(prev.selectedPreset));
      },
      undo() {
        setTimelineState((prev) => undoTimelineV3(prev));
      },
      redo() {
        setTimelineState((prev) => redoTimelineV3(prev));
      },
      jumpTo(index: number) {
        setTimelineState((prev) => jumpToTimelineV3(prev, index));
      },
      updateTokenMeta(tokenX: TokenInfo, tokenY: TokenInfo) {
        setTimelineState((prev) => {
          const current = currentSnapshotV3(prev);
          const nextSnapshot: V3PoolState = {
            ...cloneV3State(current),
            tokenX: validateTokenInfo(tokenX),
            tokenY: validateTokenInfo(tokenY)
          };
          return commitEntryV3(prev, {
            kind: 'reset',
            label: 'Update Token Meta',
            snapshot: nextSnapshot
          });
        });
      },
      updateFeeTier(feeTier: V3FeeTier): { ok: boolean; error?: string } {
        const current = present;
        if (current.position.liquidity > 0n) {
          return { ok: false, error: 'Set position liquidity to zero before changing fee tier' };
        }

        setTimelineState((prev) => {
          const snapshot = cloneV3State(currentSnapshotV3(prev));
          if (snapshot.position.liquidity > 0n) {
            return prev;
          }

          const nextSpacing = FEE_TIER_TO_TICK_SPACING[feeTier];
          const nextRange = normalizeRange(snapshot.position.tickLower, snapshot.position.tickUpper, nextSpacing);
          snapshot.feeTier = feeTier;
          snapshot.tickSpacing = nextSpacing;
          snapshot.position.tickLower = nextRange.tickLower;
          snapshot.position.tickUpper = nextRange.tickUpper;
          snapshot.liquidity = 0n;

          return commitEntryV3(prev, {
            kind: 'reset',
            label: `Update Fee Tier (${(Number(feeTier) / 10000).toFixed(2)}%)`,
            snapshot
          });
        });

        return { ok: true };
      },
      exportState() {
        const payload = {
          model: 'v3' as const,
          exportedAt: new Date().toISOString(),
          selectedPreset: timelineState.selectedPreset,
          cursor: timelineState.cursor,
          timeline: timelineState.timeline.map((entry) => ({
            id: entry.id,
            kind: entry.kind,
            label: entry.label,
            createdAt: entry.createdAt,
            snapshot: serializeV3PoolState(entry.snapshot)
          }))
        };
        return JSON.stringify(payload, null, 2);
      },
      importState(raw: string): { ok: boolean; error?: string } {
        try {
          const parsed = JSON.parse(raw) as {
            model?: string;
            timeline?: Array<{
              id: number;
              kind: OperationKind;
              label: string;
              createdAt: number;
              snapshot: ReturnType<typeof serializeV3PoolState>;
            }>;
            cursor?: number;
            selectedPreset?: V3PresetId;
          };

          if (parsed.model && parsed.model !== 'v3') {
            return { ok: false, error: `Import model mismatch: expected v3, got ${parsed.model}` };
          }
          if (!parsed.timeline || parsed.timeline.length === 0) {
            return { ok: false, error: 'Import payload has no timeline entries' };
          }

          const timeline: V3TimelineEntry[] = parsed.timeline.map((item, index) => ({
            id: Number.isFinite(item.id) ? item.id : index,
            kind: item.kind,
            label: item.label,
            createdAt: item.createdAt,
            snapshot: deserializeV3PoolState(item.snapshot)
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
        return spotPriceV3YPerX(present);
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
