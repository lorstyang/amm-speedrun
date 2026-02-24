import { SerializedV3PoolState, V3PoolState } from './types';

function stringifyBigInt(value: bigint): string {
  return value.toString();
}

function parseBigInt(value: string): bigint {
  return BigInt(value);
}

export function serializeV3PoolState(state: V3PoolState): SerializedV3PoolState {
  return {
    tokenX: { ...state.tokenX },
    tokenY: { ...state.tokenY },
    feeTier: state.feeTier,
    tickSpacing: state.tickSpacing,
    sqrtPriceX96: stringifyBigInt(state.sqrtPriceX96),
    tickCurrent: state.tickCurrent,
    liquidity: stringifyBigInt(state.liquidity),
    position: {
      tickLower: state.position.tickLower,
      tickUpper: state.position.tickUpper,
      liquidity: stringifyBigInt(state.position.liquidity),
      feeOwedX: stringifyBigInt(state.position.feeOwedX),
      feeOwedY: stringifyBigInt(state.position.feeOwedY)
    },
    feeGrowthGlobalX128X: stringifyBigInt(state.feeGrowthGlobalX128X),
    feeGrowthGlobalX128Y: stringifyBigInt(state.feeGrowthGlobalX128Y),
    feeAccX: stringifyBigInt(state.feeAccX),
    feeAccY: stringifyBigInt(state.feeAccY),
    t: state.t,
    lastTrade: state.lastTrade
      ? {
          direction: state.lastTrade.direction,
          amountIn: stringifyBigInt(state.lastTrade.amountIn),
          amountInConsumed: stringifyBigInt(state.lastTrade.amountInConsumed),
          amountInUnfilled: stringifyBigInt(state.lastTrade.amountInUnfilled),
          amountOut: stringifyBigInt(state.lastTrade.amountOut),
          feeAmountInToken: stringifyBigInt(state.lastTrade.feeAmountInToken),
          avgPriceYPerX: stringifyBigInt(state.lastTrade.avgPriceYPerX),
          spotPriceBeforeYPerX: stringifyBigInt(state.lastTrade.spotPriceBeforeYPerX),
          spotPriceAfterYPerX: stringifyBigInt(state.lastTrade.spotPriceAfterYPerX),
          slippageTotal: stringifyBigInt(state.lastTrade.slippageTotal),
          sqrtPriceBeforeX96: stringifyBigInt(state.lastTrade.sqrtPriceBeforeX96),
          sqrtPriceAfterX96: stringifyBigInt(state.lastTrade.sqrtPriceAfterX96),
          tickBefore: state.lastTrade.tickBefore,
          tickAfter: state.lastTrade.tickAfter,
          liquidityBefore: stringifyBigInt(state.lastTrade.liquidityBefore),
          liquidityAfter: stringifyBigInt(state.lastTrade.liquidityAfter),
          crossedBoundary: state.lastTrade.crossedBoundary,
          partialFill: state.lastTrade.partialFill,
          kBefore: stringifyBigInt(state.lastTrade.kBefore),
          kAfter: stringifyBigInt(state.lastTrade.kAfter)
        }
      : null
  };
}

export function deserializeV3PoolState(raw: SerializedV3PoolState): V3PoolState {
  return {
    tokenX: { ...raw.tokenX },
    tokenY: { ...raw.tokenY },
    feeTier: raw.feeTier,
    tickSpacing: raw.tickSpacing,
    sqrtPriceX96: parseBigInt(raw.sqrtPriceX96),
    tickCurrent: raw.tickCurrent,
    liquidity: parseBigInt(raw.liquidity),
    position: {
      tickLower: raw.position.tickLower,
      tickUpper: raw.position.tickUpper,
      liquidity: parseBigInt(raw.position.liquidity),
      feeOwedX: parseBigInt(raw.position.feeOwedX),
      feeOwedY: parseBigInt(raw.position.feeOwedY)
    },
    feeGrowthGlobalX128X: parseBigInt(raw.feeGrowthGlobalX128X),
    feeGrowthGlobalX128Y: parseBigInt(raw.feeGrowthGlobalX128Y),
    feeAccX: parseBigInt(raw.feeAccX),
    feeAccY: parseBigInt(raw.feeAccY),
    t: raw.t,
    lastTrade: raw.lastTrade
      ? {
          direction: raw.lastTrade.direction,
          amountIn: parseBigInt(raw.lastTrade.amountIn),
          amountInConsumed: parseBigInt(raw.lastTrade.amountInConsumed),
          amountInUnfilled: parseBigInt(raw.lastTrade.amountInUnfilled),
          amountOut: parseBigInt(raw.lastTrade.amountOut),
          feeAmountInToken: parseBigInt(raw.lastTrade.feeAmountInToken),
          avgPriceYPerX: parseBigInt(raw.lastTrade.avgPriceYPerX),
          spotPriceBeforeYPerX: parseBigInt(raw.lastTrade.spotPriceBeforeYPerX),
          spotPriceAfterYPerX: parseBigInt(raw.lastTrade.spotPriceAfterYPerX),
          slippageTotal: parseBigInt(raw.lastTrade.slippageTotal),
          sqrtPriceBeforeX96: parseBigInt(raw.lastTrade.sqrtPriceBeforeX96),
          sqrtPriceAfterX96: parseBigInt(raw.lastTrade.sqrtPriceAfterX96),
          tickBefore: raw.lastTrade.tickBefore,
          tickAfter: raw.lastTrade.tickAfter,
          liquidityBefore: parseBigInt(raw.lastTrade.liquidityBefore),
          liquidityAfter: parseBigInt(raw.lastTrade.liquidityAfter),
          crossedBoundary: raw.lastTrade.crossedBoundary,
          partialFill: raw.lastTrade.partialFill,
          kBefore: parseBigInt(raw.lastTrade.kBefore),
          kAfter: parseBigInt(raw.lastTrade.kAfter)
        }
      : null
  };
}

export function isSerializedV3PoolState(data: unknown): data is SerializedV3PoolState {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;
  const required = [
    'tokenX',
    'tokenY',
    'feeTier',
    'tickSpacing',
    'sqrtPriceX96',
    'tickCurrent',
    'liquidity',
    'position',
    'feeGrowthGlobalX128X',
    'feeGrowthGlobalX128Y',
    'feeAccX',
    'feeAccY',
    't',
    'lastTrade'
  ];

  return required.every((key) => key in obj);
}
