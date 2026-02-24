import { describe, expect, it } from 'vitest';
import { parseFp } from '../src/core/math';
import { MAX_TICK, MIN_TICK } from '../src/core/v3/constants';
import {
  getAmountsForLiquidity,
  getLiquidityForAmounts
} from '../src/core/v3/liquidityAmounts';
import { getSqrtRatioAtTick, getTickAtSqrtRatio } from '../src/core/v3/tickMath';

describe('ammV3 tick math', () => {
  it('supports min/max tick boundaries and roundtrip', () => {
    const minSqrt = getSqrtRatioAtTick(MIN_TICK);
    const maxSqrt = getSqrtRatioAtTick(MAX_TICK);

    expect(minSqrt).toBeGreaterThan(0n);
    expect(maxSqrt).toBeGreaterThan(minSqrt);

    expect(() => getSqrtRatioAtTick(MIN_TICK - 1)).toThrow();
    expect(() => getSqrtRatioAtTick(MAX_TICK + 1)).toThrow();

    for (const tick of [-1200, -1, 0, 1, 1200]) {
      const sqrt = getSqrtRatioAtTick(tick);
      const resolved = getTickAtSqrtRatio(sqrt);
      expect(resolved).toBe(tick);
    }
  });
});

describe('ammV3 liquidity amounts', () => {
  it('handles in-range, below-range and above-range paths', () => {
    const sqrtLower = getSqrtRatioAtTick(-600);
    const sqrtUpper = getSqrtRatioAtTick(600);
    const amount0 = parseFp('10');
    const amount1 = parseFp('10');

    const sqrtCurrentInRange = getSqrtRatioAtTick(0);
    const liqInRange = getLiquidityForAmounts(amount0, amount1, sqrtCurrentInRange, sqrtLower, sqrtUpper);
    expect(liqInRange).toBeGreaterThan(0n);

    const inRangeAmounts = getAmountsForLiquidity(liqInRange, sqrtCurrentInRange, sqrtLower, sqrtUpper);
    expect(inRangeAmounts.amount0).toBeGreaterThan(0n);
    expect(inRangeAmounts.amount1).toBeGreaterThan(0n);

    const sqrtCurrentBelow = getSqrtRatioAtTick(-1200);
    const liqBelow = getLiquidityForAmounts(amount0, amount1, sqrtCurrentBelow, sqrtLower, sqrtUpper);
    const belowAmounts = getAmountsForLiquidity(liqBelow, sqrtCurrentBelow, sqrtLower, sqrtUpper);
    expect(belowAmounts.amount1).toBe(0n);
    expect(belowAmounts.amount0).toBeGreaterThan(0n);

    const sqrtCurrentAbove = getSqrtRatioAtTick(1200);
    const liqAbove = getLiquidityForAmounts(amount0, amount1, sqrtCurrentAbove, sqrtLower, sqrtUpper);
    const aboveAmounts = getAmountsForLiquidity(liqAbove, sqrtCurrentAbove, sqrtLower, sqrtUpper);
    expect(aboveAmounts.amount0).toBe(0n);
    expect(aboveAmounts.amount1).toBeGreaterThan(0n);
  });
});
