import { Q96 } from './constants';
import { divRoundingUp, mulDiv, mulDivRoundingUp } from './mathQ96';

function sortSqrtRatios(a: bigint, b: bigint): [bigint, bigint] {
  return a <= b ? [a, b] : [b, a];
}

export function getAmount0Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp: boolean
): bigint {
  const [sqrtA, sqrtB] = sortSqrtRatios(sqrtRatioAX96, sqrtRatioBX96);
  if (sqrtA <= 0n || sqrtB <= sqrtA || liquidity <= 0n) {
    return 0n;
  }

  const numerator1 = liquidity << 96n;
  const numerator2 = sqrtB - sqrtA;

  if (roundUp) {
    const intermediate = mulDivRoundingUp(numerator1, numerator2, sqrtB);
    return divRoundingUp(intermediate, sqrtA);
  }

  return mulDiv(numerator1, numerator2, sqrtB) / sqrtA;
}

export function getAmount1Delta(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint,
  roundUp: boolean
): bigint {
  const [sqrtA, sqrtB] = sortSqrtRatios(sqrtRatioAX96, sqrtRatioBX96);
  if (sqrtA <= 0n || sqrtB <= sqrtA || liquidity <= 0n) {
    return 0n;
  }

  return roundUp
    ? mulDivRoundingUp(liquidity, sqrtB - sqrtA, Q96)
    : mulDiv(liquidity, sqrtB - sqrtA, Q96);
}

export function getLiquidityForAmount0(
  amount0: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint
): bigint {
  const [sqrtA, sqrtB] = sortSqrtRatios(sqrtRatioAX96, sqrtRatioBX96);
  if (amount0 <= 0n || sqrtA <= 0n || sqrtB <= sqrtA) {
    return 0n;
  }

  const intermediate = mulDiv(sqrtA, sqrtB, Q96);
  return mulDiv(amount0, intermediate, sqrtB - sqrtA);
}

export function getLiquidityForAmount1(
  amount1: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint
): bigint {
  const [sqrtA, sqrtB] = sortSqrtRatios(sqrtRatioAX96, sqrtRatioBX96);
  if (amount1 <= 0n || sqrtA <= 0n || sqrtB <= sqrtA) {
    return 0n;
  }

  return mulDiv(amount1, Q96, sqrtB - sqrtA);
}

export function getLiquidityForAmounts(
  amount0: bigint,
  amount1: bigint,
  sqrtRatioX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint
): bigint {
  const [sqrtA, sqrtB] = sortSqrtRatios(sqrtRatioAX96, sqrtRatioBX96);
  if (amount0 <= 0n || amount1 <= 0n || sqrtRatioX96 <= 0n || sqrtB <= sqrtA) {
    return 0n;
  }

  if (sqrtRatioX96 <= sqrtA) {
    return getLiquidityForAmount0(amount0, sqrtA, sqrtB);
  }

  if (sqrtRatioX96 >= sqrtB) {
    return getLiquidityForAmount1(amount1, sqrtA, sqrtB);
  }

  const liq0 = getLiquidityForAmount0(amount0, sqrtRatioX96, sqrtB);
  const liq1 = getLiquidityForAmount1(amount1, sqrtA, sqrtRatioX96);
  return liq0 < liq1 ? liq0 : liq1;
}

export function getAmountsForLiquidity(
  liquidity: bigint,
  sqrtRatioX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint
): { amount0: bigint; amount1: bigint } {
  const [sqrtA, sqrtB] = sortSqrtRatios(sqrtRatioAX96, sqrtRatioBX96);
  if (liquidity <= 0n || sqrtRatioX96 <= 0n || sqrtB <= sqrtA) {
    return { amount0: 0n, amount1: 0n };
  }

  if (sqrtRatioX96 <= sqrtA) {
    return {
      amount0: getAmount0Delta(sqrtA, sqrtB, liquidity, true),
      amount1: 0n
    };
  }

  if (sqrtRatioX96 >= sqrtB) {
    return {
      amount0: 0n,
      amount1: getAmount1Delta(sqrtA, sqrtB, liquidity, true)
    };
  }

  return {
    amount0: getAmount0Delta(sqrtRatioX96, sqrtB, liquidity, true),
    amount1: getAmount1Delta(sqrtA, sqrtRatioX96, liquidity, true)
  };
}
