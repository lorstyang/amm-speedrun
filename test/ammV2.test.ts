import { describe, expect, it } from 'vitest';
import {
  applyAddLiquidity,
  applyRemoveLiquidity,
  applySwapExactIn,
  createInitialPoolState,
  quoteArbitrageToExternalPrice,
  quoteAddLiquidity,
  quoteRemoveLiquidity,
  quoteSwapExactIn,
  relativeSpread,
  spotPriceYPerX
} from '../src/core/ammV2';
import { parseFp } from '../src/core/math';

describe('ammV2 swap', () => {
  it('quotes and applies swap exact-in with fee and k growth', () => {
    const state = createInitialPoolState({ reserveX: '1000', reserveY: '1000', feeRate: '0.003' });
    const amountIn = parseFp('10');

    const quote = quoteSwapExactIn(state, 'X_TO_Y', amountIn);
    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.amountOut).toBeGreaterThan(0n);
    expect(quote.amountOutNoFee).toBeGreaterThan(quote.amountOut);
    expect(quote.slippageTotal).toBeGreaterThan(0n);
    expect(quote.kAfter).toBeGreaterThan(quote.kBefore);

    const next = applySwapExactIn(state, quote);
    expect(next.reserveX).toBe(state.reserveX + amountIn);
    expect(next.reserveY).toBe(state.reserveY - quote.amountOut);
    expect(next.feeAccX).toBeGreaterThan(0n);
  });

  it('handles reverse direction swap', () => {
    const state = createInitialPoolState({ reserveX: '500', reserveY: '2000', feeRate: '0.003' });
    const quote = quoteSwapExactIn(state, 'Y_TO_X', parseFp('250'));
    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    const next = applySwapExactIn(state, quote);
    expect(next.reserveY).toBe(state.reserveY + quote.amountIn);
    expect(next.reserveX).toBe(state.reserveX - quote.amountOut);
    expect(next.feeAccY).toBeGreaterThan(0n);
  });
});

describe('ammV2 add/remove liquidity', () => {
  it('clips add liquidity amounts to pool ratio and returns refund', () => {
    const state = createInitialPoolState({ reserveX: '1000', reserveY: '2000' });
    const quote = quoteAddLiquidity(state, parseFp('100'), parseFp('300'));

    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.amountXUsed).toBe(parseFp('100'));
    expect(quote.amountYUsed).toBe(parseFp('200'));
    expect(quote.refundX).toBe(0n);
    expect(quote.refundY).toBe(parseFp('100'));

    const next = applyAddLiquidity(state, quote);
    expect(next.reserveX).toBe(state.reserveX + parseFp('100'));
    expect(next.reserveY).toBe(state.reserveY + parseFp('200'));
    expect(next.lpUserBalance).toBeGreaterThan(state.lpUserBalance);
  });

  it('removes liquidity pro-rata', () => {
    const state = createInitialPoolState({ reserveX: '800', reserveY: '1600' });
    const burnHalf = state.lpUserBalance / 2n;
    const quote = quoteRemoveLiquidity(state, burnHalf);

    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.outX).toBe(state.reserveX / 2n);
    expect(quote.outY).toBe(state.reserveY / 2n);

    const next = applyRemoveLiquidity(state, quote);
    expect(next.reserveX).toBe(state.reserveX - quote.outX);
    expect(next.reserveY).toBe(state.reserveY - quote.outY);
    expect(next.lpUserBalance).toBe(state.lpUserBalance - burnHalf);
  });
});

describe('ammV2 arbitrage', () => {
  it('finds profitable Y->X arbitrage when external price is higher', () => {
    const state = createInitialPoolState({ reserveX: '1000', reserveY: '2000', feeRate: '0.003' });
    const external = parseFp('2.4');

    const quote = quoteArbitrageToExternalPrice(state, external);
    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.direction).toBe('Y_TO_X');
    expect(quote.expectedProfitInY).toBeGreaterThan(0n);
    expect(quote.spreadAfter).toBeLessThan(quote.spreadBefore);

    const next = applySwapExactIn(state, quote.swapQuote);
    const nextSpread = relativeSpread(spotPriceYPerX(next), external);
    expect(nextSpread).toBeLessThan(quote.spreadBefore);
  });

  it('finds profitable X->Y arbitrage when external price is lower', () => {
    const state = createInitialPoolState({ reserveX: '1000', reserveY: '2000', feeRate: '0.003' });
    const external = parseFp('1.6');

    const quote = quoteArbitrageToExternalPrice(state, external);
    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.direction).toBe('X_TO_Y');
    expect(quote.expectedProfitInY).toBeGreaterThan(0n);
    expect(quote.spreadAfter).toBeLessThan(quote.spreadBefore);
  });

  it('rejects arbitrage when external price equals pool price', () => {
    const state = createInitialPoolState({ reserveX: '1000', reserveY: '2000', feeRate: '0.003' });
    const quote = quoteArbitrageToExternalPrice(state, parseFp('2'));
    expect(quote.ok).toBe(false);
  });
});
