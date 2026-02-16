import {
  AddLiquidityQuote,
  ArbitrageQuote,
  PoolState,
  RemoveLiquidityQuote,
  SwapDirection,
  SwapQuote,
  TokenInfo
} from './types';
import {
  ONE,
  SCALE,
  ZERO,
  fpDiv,
  fpMul,
  maxBig,
  minBig,
  mulDiv,
  parseFp,
  sqrtBigInt
} from './math';

export function cloneState(state: PoolState): PoolState {
  return {
    ...state,
    tokenX: { ...state.tokenX },
    tokenY: { ...state.tokenY },
    lastTrade: state.lastTrade ? { ...state.lastTrade } : null
  };
}

export function createInitialPoolState(params?: {
  tokenX?: TokenInfo;
  tokenY?: TokenInfo;
  reserveX?: string;
  reserveY?: string;
  feeRate?: string;
}): PoolState {
  const reserveX = parseFp(params?.reserveX ?? '10000');
  const reserveY = parseFp(params?.reserveY ?? '10000');
  const lpSeed = sqrtBigInt((reserveX * reserveY) / SCALE);
  return {
    tokenX: params?.tokenX ?? { symbol: 'X', decimals: 18 },
    tokenY: params?.tokenY ?? { symbol: 'Y', decimals: 18 },
    reserveX,
    reserveY,
    feeRate: parseFp(params?.feeRate ?? '0.003'),
    lpTotalSupply: lpSeed,
    lpUserBalance: lpSeed,
    feeAccX: ZERO,
    feeAccY: ZERO,
    t: 0,
    lastTrade: null
  };
}

export function spotPriceYPerX(state: PoolState): bigint {
  return fpDiv(state.reserveY, state.reserveX);
}

function buildInvalidSwapQuote(direction: SwapDirection, amountIn: bigint, error: string): SwapQuote {
  return {
    ok: false,
    error,
    direction,
    reserveXBefore: ZERO,
    reserveYBefore: ZERO,
    amountIn,
    amountInAfterFee: ZERO,
    amountOut: ZERO,
    amountOutNoFee: ZERO,
    feeAmountInToken: ZERO,
    reserveXAfter: ZERO,
    reserveYAfter: ZERO,
    avgPriceYPerX: ZERO,
    spotPriceBeforeYPerX: ZERO,
    spotPriceAfterYPerX: ZERO,
    slippageTotal: ZERO,
    slippageCurve: ZERO,
    feeImpactRate: ZERO,
    feeImpactOutToken: ZERO,
    kBefore: ZERO,
    kAfter: ZERO
  };
}

export function quoteSwapExactIn(state: PoolState, direction: SwapDirection, amountIn: bigint): SwapQuote {
  if (amountIn <= ZERO) {
    return buildInvalidSwapQuote(direction, amountIn, 'Input amount must be greater than zero');
  }
  if (state.reserveX <= ZERO || state.reserveY <= ZERO) {
    return buildInvalidSwapQuote(direction, amountIn, 'Pool reserves are empty');
  }
  if (state.feeRate < ZERO || state.feeRate >= ONE) {
    return buildInvalidSwapQuote(direction, amountIn, 'Invalid fee rate');
  }

  const inReserve = direction === 'X_TO_Y' ? state.reserveX : state.reserveY;
  const outReserve = direction === 'X_TO_Y' ? state.reserveY : state.reserveX;
  const amountInAfterFee = fpMul(amountIn, ONE - state.feeRate);
  const feeAmount = amountIn - amountInAfterFee;
  if (amountInAfterFee <= ZERO) {
    return buildInvalidSwapQuote(direction, amountIn, 'Effective amount after fee is too small');
  }

  const denominator = inReserve + amountInAfterFee;
  const amountOut = mulDiv(outReserve, amountInAfterFee, denominator);
  if (amountOut <= ZERO || amountOut >= outReserve) {
    return buildInvalidSwapQuote(direction, amountIn, 'Output amount is too small or drains pool');
  }

  const amountOutNoFee = mulDiv(outReserve, amountIn, inReserve + amountIn);
  const reserveXAfter = direction === 'X_TO_Y' ? state.reserveX + amountIn : state.reserveX - amountOut;
  const reserveYAfter = direction === 'X_TO_Y' ? state.reserveY - amountOut : state.reserveY + amountIn;

  if (reserveXAfter <= ZERO || reserveYAfter <= ZERO) {
    return buildInvalidSwapQuote(direction, amountIn, 'Resulting reserves must stay positive');
  }

  const spotBefore = spotPriceYPerX(state);
  const spotAfter = fpDiv(reserveYAfter, reserveXAfter);

  const avgPriceYPerX =
    direction === 'X_TO_Y' ? fpDiv(amountOut, amountIn) : fpDiv(amountIn, amountOut);
  const avgPriceNoFeeYPerX =
    direction === 'X_TO_Y' ? fpDiv(amountOutNoFee, amountIn) : fpDiv(amountIn, amountOutNoFee);

  const slippageTotal =
    direction === 'X_TO_Y'
      ? maxBig(ZERO, ONE - fpDiv(avgPriceYPerX, spotBefore))
      : maxBig(ZERO, fpDiv(avgPriceYPerX, spotBefore) - ONE);
  const slippageCurve =
    direction === 'X_TO_Y'
      ? maxBig(ZERO, ONE - fpDiv(avgPriceNoFeeYPerX, spotBefore))
      : maxBig(ZERO, fpDiv(avgPriceNoFeeYPerX, spotBefore) - ONE);

  const feeImpactRate = maxBig(ZERO, slippageTotal - slippageCurve);
  const feeImpactOutToken = maxBig(ZERO, amountOutNoFee - amountOut);

  const kBefore = state.reserveX * state.reserveY;
  const kAfter = reserveXAfter * reserveYAfter;

  return {
    ok: true,
    direction,
    reserveXBefore: state.reserveX,
    reserveYBefore: state.reserveY,
    amountIn,
    amountInAfterFee,
    amountOut,
    amountOutNoFee,
    feeAmountInToken: feeAmount,
    reserveXAfter,
    reserveYAfter,
    avgPriceYPerX,
    spotPriceBeforeYPerX: spotBefore,
    spotPriceAfterYPerX: spotAfter,
    slippageTotal,
    slippageCurve,
    feeImpactRate,
    feeImpactOutToken,
    kBefore,
    kAfter
  };
}

export function applySwapExactIn(state: PoolState, quote: SwapQuote): PoolState {
  if (!quote.ok) {
    return state;
  }

  const next = cloneState(state);
  next.reserveX = quote.reserveXAfter;
  next.reserveY = quote.reserveYAfter;
  next.t = state.t + 1;

  if (quote.direction === 'X_TO_Y') {
    next.feeAccX += quote.feeAmountInToken;
  } else {
    next.feeAccY += quote.feeAmountInToken;
  }

  next.lastTrade = {
    direction: quote.direction,
    reserveXBefore: quote.reserveXBefore,
    reserveYBefore: quote.reserveYBefore,
    reserveXAfter: quote.reserveXAfter,
    reserveYAfter: quote.reserveYAfter,
    amountIn: quote.amountIn,
    amountOut: quote.amountOut,
    amountOutNoFee: quote.amountOutNoFee,
    feeAmountInToken: quote.feeAmountInToken,
    avgPriceYPerX: quote.avgPriceYPerX,
    spotPriceBeforeYPerX: quote.spotPriceBeforeYPerX,
    spotPriceAfterYPerX: quote.spotPriceAfterYPerX,
    slippageTotal: quote.slippageTotal,
    slippageCurve: quote.slippageCurve,
    feeImpactRate: quote.feeImpactRate,
    feeImpactOutToken: quote.feeImpactOutToken,
    kBefore: quote.kBefore,
    kAfter: quote.kAfter
  };

  return next;
}

function buildInvalidAddQuote(amountXIn: bigint, amountYIn: bigint, error: string): AddLiquidityQuote {
  return {
    ok: false,
    error,
    amountXIn,
    amountYIn,
    amountXUsed: ZERO,
    amountYUsed: ZERO,
    refundX: ZERO,
    refundY: ZERO,
    lpMint: ZERO,
    lpShareAfter: ZERO
  };
}

export function quoteAddLiquidity(state: PoolState, amountXIn: bigint, amountYIn: bigint): AddLiquidityQuote {
  if (amountXIn <= ZERO || amountYIn <= ZERO) {
    return buildInvalidAddQuote(amountXIn, amountYIn, 'Both token inputs must be greater than zero');
  }

  let amountXUsed = amountXIn;
  let amountYUsed = amountYIn;

  if (state.reserveX > ZERO && state.reserveY > ZERO && state.lpTotalSupply > ZERO) {
    const amountYOptimal = mulDiv(amountXIn, state.reserveY, state.reserveX);
    if (amountYOptimal <= amountYIn) {
      amountYUsed = amountYOptimal;
    } else {
      amountXUsed = mulDiv(amountYIn, state.reserveX, state.reserveY);
    }
  }

  const refundX = amountXIn - amountXUsed;
  const refundY = amountYIn - amountYUsed;

  let lpMint = ZERO;
  if (state.lpTotalSupply <= ZERO || state.reserveX <= ZERO || state.reserveY <= ZERO) {
    lpMint = sqrtBigInt((amountXUsed * amountYUsed) / SCALE);
  } else {
    const mintX = mulDiv(amountXUsed, state.lpTotalSupply, state.reserveX);
    const mintY = mulDiv(amountYUsed, state.lpTotalSupply, state.reserveY);
    lpMint = minBig(mintX, mintY);
  }

  if (lpMint <= ZERO) {
    return buildInvalidAddQuote(amountXIn, amountYIn, 'LP mint amount too small, increase inputs');
  }

  const nextLpSupply = state.lpTotalSupply + lpMint;
  const nextUserLp = state.lpUserBalance + lpMint;

  return {
    ok: true,
    amountXIn,
    amountYIn,
    amountXUsed,
    amountYUsed,
    refundX,
    refundY,
    lpMint,
    lpShareAfter: fpDiv(nextUserLp, nextLpSupply)
  };
}

export function applyAddLiquidity(state: PoolState, quote: AddLiquidityQuote): PoolState {
  if (!quote.ok) {
    return state;
  }
  const next = cloneState(state);
  next.reserveX += quote.amountXUsed;
  next.reserveY += quote.amountYUsed;
  next.lpTotalSupply += quote.lpMint;
  next.lpUserBalance += quote.lpMint;
  next.t = state.t + 1;
  next.lastTrade = null;
  return next;
}

function buildInvalidRemoveQuote(burnLp: bigint, error: string): RemoveLiquidityQuote {
  return {
    ok: false,
    error,
    burnLp,
    outX: ZERO,
    outY: ZERO,
    lpShareAfter: ZERO
  };
}

export function quoteRemoveLiquidity(state: PoolState, burnLp: bigint): RemoveLiquidityQuote {
  if (burnLp <= ZERO) {
    return buildInvalidRemoveQuote(burnLp, 'LP burn amount must be greater than zero');
  }
  if (state.lpTotalSupply <= ZERO) {
    return buildInvalidRemoveQuote(burnLp, 'No LP supply in pool');
  }
  if (burnLp > state.lpUserBalance) {
    return buildInvalidRemoveQuote(burnLp, 'Cannot burn more LP than user balance');
  }

  const outX = mulDiv(state.reserveX, burnLp, state.lpTotalSupply);
  const outY = mulDiv(state.reserveY, burnLp, state.lpTotalSupply);

  if (outX <= ZERO && outY <= ZERO) {
    return buildInvalidRemoveQuote(burnLp, 'Withdraw amount too small');
  }

  const nextLpSupply = state.lpTotalSupply - burnLp;
  const nextUserLp = state.lpUserBalance - burnLp;

  return {
    ok: true,
    burnLp,
    outX,
    outY,
    lpShareAfter: nextLpSupply > ZERO ? fpDiv(nextUserLp, nextLpSupply) : ZERO
  };
}

export function applyRemoveLiquidity(state: PoolState, quote: RemoveLiquidityQuote): PoolState {
  if (!quote.ok) {
    return state;
  }

  const next = cloneState(state);
  next.reserveX -= quote.outX;
  next.reserveY -= quote.outY;
  next.lpTotalSupply -= quote.burnLp;
  next.lpUserBalance -= quote.burnLp;
  next.t = state.t + 1;
  next.lastTrade = null;
  return next;
}

export function poolValueInY(state: PoolState): bigint {
  if (state.reserveX <= ZERO) {
    return state.reserveY;
  }
  return state.reserveY + fpMul(state.reserveX, spotPriceYPerX(state));
}

function absBig(value: bigint): bigint {
  return value < ZERO ? -value : value;
}

export function relativeSpread(base: bigint, target: bigint): bigint {
  if (target <= ZERO) {
    return ZERO;
  }
  return fpDiv(absBig(base - target), target);
}

function buildInvalidArbQuote(
  externalPriceYPerX: bigint,
  direction: SwapDirection,
  error: string
): ArbitrageQuote {
  return {
    ok: false,
    error,
    externalPriceYPerX,
    direction,
    amountIn: ZERO,
    amountOut: ZERO,
    spotPriceBeforeYPerX: ZERO,
    spotPriceAfterYPerX: ZERO,
    spreadBefore: ZERO,
    spreadAfter: ZERO,
    expectedProfitInY: ZERO,
    swapQuote: buildInvalidSwapQuote(direction, ZERO, error)
  };
}

function shouldIncreaseInput(
  direction: SwapDirection,
  quote: SwapQuote,
  externalPriceYPerX: bigint
): boolean {
  if (direction === 'X_TO_Y') {
    return quote.spotPriceAfterYPerX > externalPriceYPerX;
  }
  return quote.spotPriceAfterYPerX < externalPriceYPerX;
}

function isBetterSwapCandidate(
  candidate: SwapQuote,
  currentBest: SwapQuote | null,
  externalPriceYPerX: bigint
): boolean {
  if (!candidate.ok) {
    return false;
  }
  if (!currentBest || !currentBest.ok) {
    return true;
  }
  const candidateDiff = absBig(candidate.spotPriceAfterYPerX - externalPriceYPerX);
  const bestDiff = absBig(currentBest.spotPriceAfterYPerX - externalPriceYPerX);
  if (candidateDiff < bestDiff) {
    return true;
  }
  if (candidateDiff > bestDiff) {
    return false;
  }
  return candidate.amountIn < currentBest.amountIn;
}

function expectedProfitInY(quote: SwapQuote, externalPriceYPerX: bigint): bigint {
  if (!quote.ok) {
    return ZERO;
  }
  if (quote.direction === 'X_TO_Y') {
    const spentY = fpMul(quote.amountIn, externalPriceYPerX);
    return quote.amountOut - spentY;
  }
  const receivedY = fpMul(quote.amountOut, externalPriceYPerX);
  return receivedY - quote.amountIn;
}

export function quoteArbitrageToExternalPrice(
  state: PoolState,
  externalPriceYPerX: bigint
): ArbitrageQuote {
  if (externalPriceYPerX <= ZERO) {
    return buildInvalidArbQuote(externalPriceYPerX, 'X_TO_Y', 'External price must be greater than zero');
  }
  if (state.reserveX <= ZERO || state.reserveY <= ZERO) {
    return buildInvalidArbQuote(externalPriceYPerX, 'X_TO_Y', 'Pool reserves are empty');
  }

  const spotBefore = spotPriceYPerX(state);
  if (spotBefore === externalPriceYPerX) {
    return buildInvalidArbQuote(externalPriceYPerX, 'X_TO_Y', 'Pool price already equals external price');
  }

  const direction: SwapDirection = externalPriceYPerX > spotBefore ? 'Y_TO_X' : 'X_TO_Y';
  const inReserve = direction === 'X_TO_Y' ? state.reserveX : state.reserveY;

  if (inReserve <= ZERO) {
    return buildInvalidArbQuote(externalPriceYPerX, direction, 'Invalid input reserve');
  }

  const maxBound = maxBig(1n, inReserve * 1_000_000n);
  let low = 1n;
  let high = maxBig(1n, inReserve / 1_000n);
  let best: SwapQuote | null = null;

  for (let i = 0; i < 90; i += 1) {
    const q = quoteSwapExactIn(state, direction, high);
    if (!q.ok) {
      break;
    }
    if (isBetterSwapCandidate(q, best, externalPriceYPerX)) {
      best = q;
    }
    if (!shouldIncreaseInput(direction, q, externalPriceYPerX)) {
      break;
    }
    low = high;
    high = high * 2n;
    if (high > maxBound) {
      high = maxBound;
      break;
    }
  }

  let left = minBig(low, high);
  let right = maxBig(low, high);

  for (let i = 0; i < 90 && left <= right; i += 1) {
    const mid = (left + right) / 2n;
    if (mid <= ZERO) {
      break;
    }
    const q = quoteSwapExactIn(state, direction, mid);
    if (!q.ok) {
      right = mid - 1n;
      continue;
    }
    if (isBetterSwapCandidate(q, best, externalPriceYPerX)) {
      best = q;
    }
    if (shouldIncreaseInput(direction, q, externalPriceYPerX)) {
      left = mid + 1n;
    } else {
      right = mid - 1n;
    }
  }

  if (!best || !best.ok) {
    return buildInvalidArbQuote(externalPriceYPerX, direction, 'Unable to find an arbitrage trade');
  }

  const spreadBefore = relativeSpread(spotBefore, externalPriceYPerX);
  const spreadAfter = relativeSpread(best.spotPriceAfterYPerX, externalPriceYPerX);
  const profitInY = expectedProfitInY(best, externalPriceYPerX);

  if (profitInY <= ZERO) {
    return buildInvalidArbQuote(
      externalPriceYPerX,
      direction,
      'No profitable arbitrage after fees at this external price'
    );
  }

  return {
    ok: true,
    externalPriceYPerX,
    direction,
    amountIn: best.amountIn,
    amountOut: best.amountOut,
    spotPriceBeforeYPerX: spotBefore,
    spotPriceAfterYPerX: best.spotPriceAfterYPerX,
    spreadBefore,
    spreadAfter,
    expectedProfitInY: profitInY,
    swapQuote: best
  };
}
