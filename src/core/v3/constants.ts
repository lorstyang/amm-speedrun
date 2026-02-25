import { V3FeeTier } from '../types';

export const MIN_TICK = -887272;
export const MAX_TICK = 887272;

export const Q96 = 1n << 96n;
export const Q128 = 1n << 128n;
export const Q192 = Q96 * Q96;

export const MIN_SQRT_RATIO = 4295128739n;
export const MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342n;

export const FEE_UNITS = 1_000_000n;
export const LIQUIDITY_DUST_X18 = 10_000_000_000n; // 1e-8 on 1e18 scale

export const FEE_TIER_TO_TICK_SPACING: Record<V3FeeTier, number> = {
  500: 10,
  3000: 60,
  10000: 200
};
