import { FEE_UNITS, Q96 } from './constants';
import { divRoundingUp, mulDiv, mulDivRoundingUp } from './mathQ96';
import { getAmount0Delta, getAmount1Delta } from './liquidityAmounts';

export interface V3SwapStepResult {
  sqrtRatioNextX96: bigint;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
  reachedTarget: boolean;
}

function getNextSqrtPriceFromAmount0RoundingUp(
  sqrtPriceX96: bigint,
  liquidity: bigint,
  amount: bigint,
  add: boolean
): bigint {
  if (amount <= 0n) {
    return sqrtPriceX96;
  }

  const numerator1 = liquidity << 96n;

  if (add) {
    const denominator = numerator1 + amount * sqrtPriceX96;
    return mulDivRoundingUp(numerator1, sqrtPriceX96, denominator);
  }

  const product = amount * sqrtPriceX96;
  if (product >= numerator1) {
    throw new Error('amount too large for amount0 price update');
  }
  return mulDivRoundingUp(numerator1, sqrtPriceX96, numerator1 - product);
}

function getNextSqrtPriceFromAmount1RoundingDown(
  sqrtPriceX96: bigint,
  liquidity: bigint,
  amount: bigint,
  add: boolean
): bigint {
  if (amount <= 0n) {
    return sqrtPriceX96;
  }

  if (add) {
    const quotient = (amount << 96n) / liquidity;
    return sqrtPriceX96 + quotient;
  }

  const quotient = divRoundingUp(amount << 96n, liquidity);
  if (quotient >= sqrtPriceX96) {
    throw new Error('amount too large for amount1 price update');
  }
  return sqrtPriceX96 - quotient;
}

function getNextSqrtPriceFromInput(
  sqrtPriceX96: bigint,
  liquidity: bigint,
  amountIn: bigint,
  zeroForOne: boolean
): bigint {
  if (sqrtPriceX96 <= 0n || liquidity <= 0n) {
    throw new Error('invalid swap state');
  }

  return zeroForOne
    ? getNextSqrtPriceFromAmount0RoundingUp(sqrtPriceX96, liquidity, amountIn, true)
    : getNextSqrtPriceFromAmount1RoundingDown(sqrtPriceX96, liquidity, amountIn, true);
}

export function computeSwapStep(
  sqrtRatioCurrentX96: bigint,
  sqrtRatioTargetX96: bigint,
  liquidity: bigint,
  amountRemaining: bigint,
  feePips: bigint,
  zeroForOne: boolean
): V3SwapStepResult {
  if (amountRemaining <= 0n || liquidity <= 0n) {
    return {
      sqrtRatioNextX96: sqrtRatioCurrentX96,
      amountIn: 0n,
      amountOut: 0n,
      feeAmount: 0n,
      reachedTarget: false
    };
  }

  const amountRemainingLessFee = mulDiv(amountRemaining, FEE_UNITS - feePips, FEE_UNITS);

  const amountInToTarget = zeroForOne
    ? getAmount0Delta(sqrtRatioTargetX96, sqrtRatioCurrentX96, liquidity, true)
    : getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioTargetX96, liquidity, true);

  const reachedTarget = amountRemainingLessFee >= amountInToTarget;
  const sqrtRatioNextX96 = reachedTarget
    ? sqrtRatioTargetX96
    : getNextSqrtPriceFromInput(
        sqrtRatioCurrentX96,
        liquidity,
        amountRemainingLessFee,
        zeroForOne
      );

  const amountIn = zeroForOne
    ? getAmount0Delta(sqrtRatioNextX96, sqrtRatioCurrentX96, liquidity, true)
    : getAmount1Delta(sqrtRatioCurrentX96, sqrtRatioNextX96, liquidity, true);

  const amountOut = zeroForOne
    ? getAmount1Delta(sqrtRatioNextX96, sqrtRatioCurrentX96, liquidity, false)
    : getAmount0Delta(sqrtRatioCurrentX96, sqrtRatioNextX96, liquidity, false);

  let feeAmount: bigint;
  if (!reachedTarget) {
    feeAmount = amountRemaining - amountIn;
  } else {
    feeAmount = mulDivRoundingUp(amountIn, feePips, FEE_UNITS - feePips);
  }

  return {
    sqrtRatioNextX96,
    amountIn,
    amountOut,
    feeAmount,
    reachedTarget
  };
}

export function sqrtPriceToPriceX18(sqrtPriceX96: bigint): bigint {
  return mulDiv(sqrtPriceX96, sqrtPriceX96, Q96 * Q96 / 1_000_000_000_000_000_000n);
}
