import { describe, expect, it } from 'vitest';
import {
  applyV3SwapExactIn,
  createInitialV3PoolState,
  quoteV3SwapExactIn
} from '../src/core/ammV3';
import { parseFp } from '../src/core/math';

describe('ammV3 swap', () => {
  it('quotes and applies in-range exact-in swap', () => {
    const state = createInitialV3PoolState({
      feeTier: 3000,
      initialPriceYPerX: '1',
      tickLower: -1200,
      tickUpper: 1200,
      initialAmountX: '1000',
      initialAmountY: '1000'
    });

    expect(state.liquidity).toBeGreaterThan(0n);

    const quote = quoteV3SwapExactIn(state, 'X_TO_Y', parseFp('10'));
    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.amountOut).toBeGreaterThan(0n);
    expect(quote.amountInUnfilled).toBe(0n);
    expect(quote.crossedBoundary).toBe(false);

    const next = applyV3SwapExactIn(state, quote);
    expect(next.feeAccX).toBeGreaterThan(0n);
    expect(next.tickCurrent).toBeLessThanOrEqual(state.tickCurrent);
  });

  it('returns partial fill when crossing boundary and no next liquidity', () => {
    const state = createInitialV3PoolState({
      feeTier: 3000,
      initialPriceYPerX: '1',
      tickLower: -120,
      tickUpper: 120,
      initialAmountX: '30',
      initialAmountY: '30'
    });

    const quote = quoteV3SwapExactIn(state, 'X_TO_Y', parseFp('5000'));
    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.crossedBoundary).toBe(true);
    expect(quote.partialFill).toBe(true);
    expect(quote.amountInUnfilled).toBeGreaterThan(0n);
    expect(quote.liquidityAfter).toBe(0n);

    const next = applyV3SwapExactIn(state, quote);
    expect(next.liquidity).toBe(0n);
  });
});
