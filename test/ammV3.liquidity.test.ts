import { describe, expect, it } from 'vitest';
import {
  applyV3AddLiquidity,
  applyV3RemoveLiquidity,
  createInitialV3PoolState,
  quoteV3AddLiquidity,
  quoteV3RemoveLiquidity
} from '../src/core/ammV3';
import { parseFp } from '../src/core/math';

describe('ammV3 add/remove liquidity', () => {
  it('adds liquidity and returns used/refund amounts', () => {
    const state = createInitialV3PoolState({
      initialPriceYPerX: '1',
      tickLower: -600,
      tickUpper: 600,
      initialAmountX: '0',
      initialAmountY: '0'
    });

    const quote = quoteV3AddLiquidity(state, {
      amountXIn: parseFp('50'),
      amountYIn: parseFp('50'),
      tickLower: -600,
      tickUpper: 600
    });

    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.liquidityDelta).toBeGreaterThan(0n);
    expect(quote.amountXUsed).toBeGreaterThan(0n);
    expect(quote.amountYUsed).toBeGreaterThan(0n);

    const next = applyV3AddLiquidity(state, quote);
    expect(next.position.liquidity).toBeGreaterThan(0n);
    expect(next.liquidity).toBeGreaterThan(0n);
  });

  it('supports single-sided deposit when current price is outside range', () => {
    const state = createInitialV3PoolState({
      initialPriceYPerX: '1',
      initialAmountX: '0',
      initialAmountY: '0'
    });

    const quoteToken0Only = quoteV3AddLiquidity(state, {
      amountXIn: parseFp('25'),
      amountYIn: 0n,
      tickLower: 600,
      tickUpper: 1200
    });
    expect(quoteToken0Only.ok).toBe(true);
    if (quoteToken0Only.ok) {
      expect(quoteToken0Only.amountXUsed).toBeGreaterThan(0n);
      expect(quoteToken0Only.amountYUsed).toBe(0n);
    }

    const quoteToken1Only = quoteV3AddLiquidity(state, {
      amountXIn: 0n,
      amountYIn: parseFp('25'),
      tickLower: -1200,
      tickUpper: -600
    });
    expect(quoteToken1Only.ok).toBe(true);
    if (quoteToken1Only.ok) {
      expect(quoteToken1Only.amountXUsed).toBe(0n);
      expect(quoteToken1Only.amountYUsed).toBeGreaterThan(0n);
    }
  });

  it('still requires both tokens for in-range single position', () => {
    const state = createInitialV3PoolState({
      initialPriceYPerX: '1',
      initialAmountX: '0',
      initialAmountY: '0'
    });

    const quote = quoteV3AddLiquidity(state, {
      amountXIn: parseFp('10'),
      amountYIn: 0n,
      tickLower: -600,
      tickUpper: 600
    });

    expect(quote.ok).toBe(false);
  });

  it('removes liquidity pro-rata by liquidity delta', () => {
    const state = createInitialV3PoolState({
      initialPriceYPerX: '1',
      tickLower: -600,
      tickUpper: 600,
      initialAmountX: '100',
      initialAmountY: '100'
    });

    const burn = state.position.liquidity / 2n;
    const quote = quoteV3RemoveLiquidity(state, burn);
    expect(quote.ok).toBe(true);
    if (!quote.ok) {
      return;
    }

    expect(quote.amountXOut).toBeGreaterThan(0n);
    expect(quote.amountYOut).toBeGreaterThan(0n);

    const next = applyV3RemoveLiquidity(state, quote);
    expect(next.position.liquidity).toBe(state.position.liquidity - burn);
  });

  it('rejects range update when existing position liquidity is non-zero', () => {
    const state = createInitialV3PoolState({
      initialPriceYPerX: '1',
      tickLower: -600,
      tickUpper: 600,
      initialAmountX: '100',
      initialAmountY: '100'
    });

    const failQuote = quoteV3AddLiquidity(state, {
      amountXIn: parseFp('10'),
      amountYIn: parseFp('10'),
      tickLower: -1200,
      tickUpper: 1200
    });

    expect(failQuote.ok).toBe(false);

    const clearQuote = quoteV3RemoveLiquidity(state, state.position.liquidity);
    expect(clearQuote.ok).toBe(true);
    if (!clearQuote.ok) {
      return;
    }

    const cleared = applyV3RemoveLiquidity(state, clearQuote);
    const successQuote = quoteV3AddLiquidity(cleared, {
      amountXIn: parseFp('10'),
      amountYIn: parseFp('10'),
      tickLower: -1200,
      tickUpper: 1200
    });

    expect(successQuote.ok).toBe(true);
    if (!successQuote.ok) {
      return;
    }
    expect(successQuote.rangeUpdated).toBe(true);
  });
});
