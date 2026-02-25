import {
  SwapDirection,
  TokenInfo,
  V3AddLiquidityParams,
  V3AddLiquidityQuote,
  V3PoolState,
  V3RemoveLiquidityQuote,
  V3SwapQuote
} from './types';
import {
  ONE,
  SCALE,
  ZERO,
  fpDiv,
  maxBig,
  minBig,
  mulDiv,
  parseFp,
  sqrtBigInt
} from './math';
import {
  FEE_TIER_TO_TICK_SPACING,
  LIQUIDITY_DUST_X18,
  MAX_SQRT_RATIO,
  MAX_TICK,
  MIN_SQRT_RATIO,
  MIN_TICK,
  Q128,
  Q192
} from './v3/constants';
import {
  getAmount0Delta,
  getAmount1Delta,
  getAmountsForLiquidity,
  getLiquidityForAmounts
} from './v3/liquidityAmounts';
import { computeSwapStep } from './v3/swapMath';
import { getSqrtRatioAtTick, getTickAtSqrtRatio } from './v3/tickMath';

function clampTick(tick: number): number {
  return Math.max(MIN_TICK, Math.min(MAX_TICK, tick));
}

function alignTickDown(tick: number, spacing: number): number {
  const safeTick = clampTick(tick);
  const remainder = ((safeTick % spacing) + spacing) % spacing;
  return clampTick(safeTick - remainder);
}

function alignTickUp(tick: number, spacing: number): number {
  const down = alignTickDown(tick, spacing);
  if (down >= tick) {
    return down;
  }
  return clampTick(down + spacing);
}

function normalizeRange(tickLower: number, tickUpper: number, spacing: number): { tickLower: number; tickUpper: number } {
  let lower = alignTickDown(tickLower, spacing);
  let upper = alignTickUp(tickUpper, spacing);

  if (lower < MIN_TICK) {
    lower = MIN_TICK;
  }
  if (upper > MAX_TICK) {
    upper = MAX_TICK;
  }

  if (upper <= lower) {
    upper = Math.min(MAX_TICK, lower + spacing);
  }

  if (upper <= lower) {
    lower = Math.max(MIN_TICK, upper - spacing);
  }

  return { tickLower: lower, tickUpper: upper };
}

function isTickInRange(tick: number, tickLower: number, tickUpper: number): boolean {
  return tick >= tickLower && tick < tickUpper;
}

function normalizeLiquidity(value: bigint): bigint {
  return value <= LIQUIDITY_DUST_X18 ? ZERO : value;
}

export function cloneV3State(state: V3PoolState): V3PoolState {
  return {
    ...state,
    tokenX: { ...state.tokenX },
    tokenY: { ...state.tokenY },
    position: { ...state.position },
    lastTrade: state.lastTrade ? { ...state.lastTrade } : null
  };
}

function buildInvalidSwapQuote(direction: SwapDirection, amountIn: bigint, error: string): V3SwapQuote {
  return {
    ok: false,
    error,
    direction,
    amountIn,
    amountInConsumed: ZERO,
    amountInUnfilled: ZERO,
    amountOut: ZERO,
    feeAmountInToken: ZERO,
    avgPriceYPerX: ZERO,
    spotPriceBeforeYPerX: ZERO,
    spotPriceAfterYPerX: ZERO,
    slippageTotal: ZERO,
    sqrtPriceBeforeX96: ZERO,
    sqrtPriceAfterX96: ZERO,
    tickBefore: 0,
    tickAfter: 0,
    liquidityBefore: ZERO,
    liquidityAfter: ZERO,
    crossedBoundary: false,
    partialFill: false,
    kBefore: ZERO,
    kAfter: ZERO
  };
}

function buildInvalidAddQuote(params: V3AddLiquidityParams, error: string): V3AddLiquidityQuote {
  return {
    ok: false,
    error,
    amountXIn: params.amountXIn,
    amountYIn: params.amountYIn,
    amountXUsed: ZERO,
    amountYUsed: ZERO,
    refundX: ZERO,
    refundY: ZERO,
    liquidityDelta: ZERO,
    tickLower: 0,
    tickUpper: 0,
    positionLiquidityAfter: ZERO,
    activeLiquidityAfter: ZERO,
    rangeUpdated: false
  };
}

function buildInvalidRemoveQuote(liquidityDelta: bigint, error: string): V3RemoveLiquidityQuote {
  return {
    ok: false,
    error,
    liquidityDelta,
    amountXOut: ZERO,
    amountYOut: ZERO,
    positionLiquidityAfter: ZERO,
    activeLiquidityAfter: ZERO
  };
}

function spotPriceFromSqrtX96(sqrtPriceX96: bigint): bigint {
  if (sqrtPriceX96 <= ZERO) {
    return ZERO;
  }
  return mulDiv(sqrtPriceX96 * sqrtPriceX96, SCALE, Q192);
}

function virtualReservesInRange(state: V3PoolState, sqrtPriceX96: bigint, liquidity: bigint): { x: bigint; y: bigint } {
  if (liquidity <= ZERO) {
    return { x: ZERO, y: ZERO };
  }

  const sqrtLower = getSqrtRatioAtTick(state.position.tickLower);
  const sqrtUpper = getSqrtRatioAtTick(state.position.tickUpper);

  return {
    x: getAmount0Delta(sqrtPriceX96, sqrtUpper, liquidity, false),
    y: getAmount1Delta(sqrtLower, sqrtPriceX96, liquidity, false)
  };
}

export function spotPriceV3YPerX(state: V3PoolState): bigint {
  return spotPriceFromSqrtX96(state.sqrtPriceX96);
}

function defaultRangeAroundTick(tickCurrent: number, spacing: number): { tickLower: number; tickUpper: number } {
  return normalizeRange(tickCurrent - spacing * 10, tickCurrent + spacing * 10, spacing);
}

export function createInitialV3PoolState(params?: {
  tokenX?: TokenInfo;
  tokenY?: TokenInfo;
  feeTier?: 500 | 3000 | 10000;
  initialPriceYPerX?: string;
  tickLower?: number;
  tickUpper?: number;
  initialAmountX?: string;
  initialAmountY?: string;
}): V3PoolState {
  const feeTier = params?.feeTier ?? 3000;
  const tickSpacing = FEE_TIER_TO_TICK_SPACING[feeTier];

  const initialPriceYPerX = parseFp(params?.initialPriceYPerX ?? '1');
  const sqrtPriceRaw = sqrtBigInt((maxBig(initialPriceYPerX, 1n) * Q192) / SCALE);
  const sqrtPriceX96 = maxBig(MIN_SQRT_RATIO, minBig(MAX_SQRT_RATIO - 1n, sqrtPriceRaw));

  const tickCurrent = getTickAtSqrtRatio(sqrtPriceX96);
  const fallbackRange = defaultRangeAroundTick(tickCurrent, tickSpacing);
  const { tickLower, tickUpper } = normalizeRange(
    params?.tickLower ?? fallbackRange.tickLower,
    params?.tickUpper ?? fallbackRange.tickUpper,
    tickSpacing
  );

  const sqrtLower = getSqrtRatioAtTick(tickLower);
  const sqrtUpper = getSqrtRatioAtTick(tickUpper);

  const initialAmountX = parseFp(params?.initialAmountX ?? '10000');
  const initialAmountY = parseFp(params?.initialAmountY ?? '10000');
  const positionLiquidity = getLiquidityForAmounts(
    initialAmountX,
    initialAmountY,
    sqrtPriceX96,
    sqrtLower,
    sqrtUpper
  );

  const position = {
    tickLower,
    tickUpper,
    liquidity: positionLiquidity,
    feeOwedX: ZERO,
    feeOwedY: ZERO
  };

  return {
    tokenX: params?.tokenX ?? { symbol: 'X', decimals: 18 },
    tokenY: params?.tokenY ?? { symbol: 'Y', decimals: 18 },
    feeTier,
    tickSpacing,
    sqrtPriceX96,
    tickCurrent,
    liquidity: isTickInRange(tickCurrent, tickLower, tickUpper) ? positionLiquidity : ZERO,
    position,
    feeGrowthGlobalX128X: ZERO,
    feeGrowthGlobalX128Y: ZERO,
    feeAccX: ZERO,
    feeAccY: ZERO,
    t: 0,
    lastTrade: null
  };
}

export function quoteV3SwapExactIn(state: V3PoolState, direction: SwapDirection, amountIn: bigint): V3SwapQuote {
  if (amountIn <= ZERO) {
    return buildInvalidSwapQuote(direction, amountIn, 'Input amount must be greater than zero');
  }
  const activeLiquidity = normalizeLiquidity(state.liquidity);
  if (activeLiquidity <= ZERO) {
    return buildInvalidSwapQuote(direction, amountIn, 'No active liquidity at current tick');
  }

  const zeroForOne = direction === 'X_TO_Y';
  const sqrtBefore = state.sqrtPriceX96;
  const tickBefore = state.tickCurrent;
  const liquidityBefore = activeLiquidity;
  const targetTick = zeroForOne ? state.position.tickLower : state.position.tickUpper;
  const targetSqrt = getSqrtRatioAtTick(targetTick);

  if (zeroForOne && targetSqrt >= sqrtBefore) {
    return buildInvalidSwapQuote(direction, amountIn, 'Price already at or below lower range bound');
  }
  if (!zeroForOne && targetSqrt <= sqrtBefore) {
    return buildInvalidSwapQuote(direction, amountIn, 'Price already at or above upper range bound');
  }

  const step = computeSwapStep(
    sqrtBefore,
    targetSqrt,
    liquidityBefore,
    amountIn,
    BigInt(state.feeTier),
    zeroForOne
  );

  const consumed = step.amountIn + step.feeAmount;
  if (consumed <= ZERO || step.amountOut <= ZERO) {
    return buildInvalidSwapQuote(direction, amountIn, 'Swap amount too small at current precision');
  }

  const amountInUnfilled = maxBig(ZERO, amountIn - consumed);
  const sqrtAfter = step.sqrtRatioNextX96;
  const tickAfter = getTickAtSqrtRatio(sqrtAfter);
  const crossedBoundary = step.reachedTarget;
  const liquidityAfter = normalizeLiquidity(crossedBoundary ? ZERO : liquidityBefore);

  const spotBefore = spotPriceFromSqrtX96(sqrtBefore);
  const spotAfter = spotPriceFromSqrtX96(sqrtAfter);
  const avgPriceYPerX =
    direction === 'X_TO_Y' ? fpDiv(step.amountOut, consumed) : fpDiv(consumed, step.amountOut);

  const slippageTotal =
    direction === 'X_TO_Y'
      ? maxBig(ZERO, ONE - fpDiv(avgPriceYPerX, spotBefore))
      : maxBig(ZERO, fpDiv(avgPriceYPerX, spotBefore) - ONE);

  const reserveBefore = virtualReservesInRange(state, sqrtBefore, liquidityBefore);
  const reserveAfter = virtualReservesInRange(state, sqrtAfter, liquidityAfter);

  return {
    ok: true,
    direction,
    amountIn,
    amountInConsumed: consumed,
    amountInUnfilled,
    amountOut: step.amountOut,
    feeAmountInToken: step.feeAmount,
    avgPriceYPerX,
    spotPriceBeforeYPerX: spotBefore,
    spotPriceAfterYPerX: spotAfter,
    slippageTotal,
    sqrtPriceBeforeX96: sqrtBefore,
    sqrtPriceAfterX96: sqrtAfter,
    tickBefore,
    tickAfter,
    liquidityBefore,
    liquidityAfter,
    crossedBoundary,
    partialFill: amountInUnfilled > ZERO,
    kBefore: reserveBefore.x * reserveBefore.y,
    kAfter: reserveAfter.x * reserveAfter.y
  };
}

export function applyV3SwapExactIn(state: V3PoolState, quote: V3SwapQuote): V3PoolState {
  if (!quote.ok) {
    return state;
  }

  const next = cloneV3State(state);
  next.sqrtPriceX96 = quote.sqrtPriceAfterX96;
  next.tickCurrent = quote.tickAfter;
  next.liquidity = normalizeLiquidity(quote.liquidityAfter);
  next.t = state.t + 1;

  if (quote.direction === 'X_TO_Y') {
    next.feeAccX += quote.feeAmountInToken;
    if (quote.liquidityBefore > ZERO) {
      next.feeGrowthGlobalX128X += mulDiv(quote.feeAmountInToken, Q128, quote.liquidityBefore);
    }
    next.position.feeOwedX += quote.feeAmountInToken;
  } else {
    next.feeAccY += quote.feeAmountInToken;
    if (quote.liquidityBefore > ZERO) {
      next.feeGrowthGlobalX128Y += mulDiv(quote.feeAmountInToken, Q128, quote.liquidityBefore);
    }
    next.position.feeOwedY += quote.feeAmountInToken;
  }

  next.lastTrade = {
    direction: quote.direction,
    amountIn: quote.amountIn,
    amountInConsumed: quote.amountInConsumed,
    amountInUnfilled: quote.amountInUnfilled,
    amountOut: quote.amountOut,
    feeAmountInToken: quote.feeAmountInToken,
    avgPriceYPerX: quote.avgPriceYPerX,
    spotPriceBeforeYPerX: quote.spotPriceBeforeYPerX,
    spotPriceAfterYPerX: quote.spotPriceAfterYPerX,
    slippageTotal: quote.slippageTotal,
    sqrtPriceBeforeX96: quote.sqrtPriceBeforeX96,
    sqrtPriceAfterX96: quote.sqrtPriceAfterX96,
    tickBefore: quote.tickBefore,
    tickAfter: quote.tickAfter,
    liquidityBefore: quote.liquidityBefore,
    liquidityAfter: quote.liquidityAfter,
    crossedBoundary: quote.crossedBoundary,
    partialFill: quote.partialFill,
    kBefore: quote.kBefore,
    kAfter: quote.kAfter
  };

  return next;
}

export function quoteV3AddLiquidity(state: V3PoolState, params: V3AddLiquidityParams): V3AddLiquidityQuote {
  if (params.amountXIn <= ZERO && params.amountYIn <= ZERO) {
    return buildInvalidAddQuote(params, 'At least one token amount must be greater than zero');
  }

  const requestedRange = normalizeRange(
    params.tickLower ?? state.position.tickLower,
    params.tickUpper ?? state.position.tickUpper,
    state.tickSpacing
  );

  const currentPositionLiquidity = normalizeLiquidity(state.position.liquidity);
  const rangeUpdated =
    requestedRange.tickLower !== state.position.tickLower || requestedRange.tickUpper !== state.position.tickUpper;

  if (rangeUpdated && currentPositionLiquidity > ZERO) {
    return buildInvalidAddQuote(
      params,
      'Range can only be updated when existing position liquidity is zero'
    );
  }

  const sqrtLower = getSqrtRatioAtTick(requestedRange.tickLower);
  const sqrtUpper = getSqrtRatioAtTick(requestedRange.tickUpper);

  const liquidityDelta = getLiquidityForAmounts(
    params.amountXIn,
    params.amountYIn,
    state.sqrtPriceX96,
    sqrtLower,
    sqrtUpper
  );

  if (liquidityDelta <= ZERO) {
    return buildInvalidAddQuote(params, 'Liquidity delta too small, increase deposit amounts');
  }

  const used = getAmountsForLiquidity(liquidityDelta, state.sqrtPriceX96, sqrtLower, sqrtUpper);
  const baseLiquidity = rangeUpdated ? ZERO : currentPositionLiquidity;
  const positionLiquidityAfter = normalizeLiquidity(baseLiquidity + liquidityDelta);

  return {
    ok: true,
    amountXIn: params.amountXIn,
    amountYIn: params.amountYIn,
    amountXUsed: used.amount0,
    amountYUsed: used.amount1,
    refundX: params.amountXIn - used.amount0,
    refundY: params.amountYIn - used.amount1,
    liquidityDelta,
    tickLower: requestedRange.tickLower,
    tickUpper: requestedRange.tickUpper,
    positionLiquidityAfter,
    activeLiquidityAfter: isTickInRange(state.tickCurrent, requestedRange.tickLower, requestedRange.tickUpper)
      ? positionLiquidityAfter
      : ZERO,
    rangeUpdated
  };
}

export function applyV3AddLiquidity(state: V3PoolState, quote: V3AddLiquidityQuote): V3PoolState {
  if (!quote.ok) {
    return state;
  }

  const next = cloneV3State(state);
  if (quote.rangeUpdated) {
    next.position.tickLower = quote.tickLower;
    next.position.tickUpper = quote.tickUpper;
  }

  next.position.liquidity = normalizeLiquidity(quote.positionLiquidityAfter);
  next.liquidity = normalizeLiquidity(quote.activeLiquidityAfter);
  next.t = state.t + 1;
  next.lastTrade = null;
  return next;
}

export function quoteV3RemoveLiquidity(state: V3PoolState, liquidityDelta: bigint): V3RemoveLiquidityQuote {
  const currentPositionLiquidity = normalizeLiquidity(state.position.liquidity);
  if (liquidityDelta <= ZERO) {
    return buildInvalidRemoveQuote(liquidityDelta, 'Liquidity burn amount must be greater than zero');
  }
  if (currentPositionLiquidity <= ZERO) {
    return buildInvalidRemoveQuote(liquidityDelta, 'No position liquidity to remove');
  }
  if (liquidityDelta > currentPositionLiquidity) {
    return buildInvalidRemoveQuote(liquidityDelta, 'Cannot remove more than current position liquidity');
  }

  const sqrtLower = getSqrtRatioAtTick(state.position.tickLower);
  const sqrtUpper = getSqrtRatioAtTick(state.position.tickUpper);

  const out = getAmountsForLiquidity(liquidityDelta, state.sqrtPriceX96, sqrtLower, sqrtUpper);
  if (out.amount0 <= ZERO && out.amount1 <= ZERO) {
    return buildInvalidRemoveQuote(liquidityDelta, 'Withdraw amount too small at current precision');
  }

  const positionLiquidityAfter = normalizeLiquidity(currentPositionLiquidity - liquidityDelta);

  return {
    ok: true,
    liquidityDelta,
    amountXOut: out.amount0,
    amountYOut: out.amount1,
    positionLiquidityAfter,
    activeLiquidityAfter: isTickInRange(state.tickCurrent, state.position.tickLower, state.position.tickUpper)
      ? positionLiquidityAfter
      : ZERO
  };
}

export function applyV3RemoveLiquidity(state: V3PoolState, quote: V3RemoveLiquidityQuote): V3PoolState {
  if (!quote.ok) {
    return state;
  }

  const next = cloneV3State(state);
  next.position.liquidity = normalizeLiquidity(quote.positionLiquidityAfter);
  next.liquidity = normalizeLiquidity(quote.activeLiquidityAfter);
  next.t = state.t + 1;
  next.lastTrade = null;
  return next;
}
