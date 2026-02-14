import { PoolState, SerializedPoolState } from './types';

function stringifyBigInt(value: bigint): string {
  return value.toString();
}

function parseBigInt(value: string): bigint {
  return BigInt(value);
}

export function serializePoolState(state: PoolState): SerializedPoolState {
  return {
    tokenX: { ...state.tokenX },
    tokenY: { ...state.tokenY },
    reserveX: stringifyBigInt(state.reserveX),
    reserveY: stringifyBigInt(state.reserveY),
    feeRate: stringifyBigInt(state.feeRate),
    lpTotalSupply: stringifyBigInt(state.lpTotalSupply),
    lpUserBalance: stringifyBigInt(state.lpUserBalance),
    feeAccX: stringifyBigInt(state.feeAccX),
    feeAccY: stringifyBigInt(state.feeAccY),
    t: state.t,
    lastTrade: state.lastTrade
      ? {
          direction: state.lastTrade.direction,
          reserveXBefore: stringifyBigInt(state.lastTrade.reserveXBefore),
          reserveYBefore: stringifyBigInt(state.lastTrade.reserveYBefore),
          reserveXAfter: stringifyBigInt(state.lastTrade.reserveXAfter),
          reserveYAfter: stringifyBigInt(state.lastTrade.reserveYAfter),
          amountIn: stringifyBigInt(state.lastTrade.amountIn),
          amountOut: stringifyBigInt(state.lastTrade.amountOut),
          amountOutNoFee: stringifyBigInt(state.lastTrade.amountOutNoFee),
          feeAmountInToken: stringifyBigInt(state.lastTrade.feeAmountInToken),
          avgPriceYPerX: stringifyBigInt(state.lastTrade.avgPriceYPerX),
          spotPriceBeforeYPerX: stringifyBigInt(state.lastTrade.spotPriceBeforeYPerX),
          spotPriceAfterYPerX: stringifyBigInt(state.lastTrade.spotPriceAfterYPerX),
          slippageTotal: stringifyBigInt(state.lastTrade.slippageTotal),
          slippageCurve: stringifyBigInt(state.lastTrade.slippageCurve),
          feeImpactRate: stringifyBigInt(state.lastTrade.feeImpactRate),
          feeImpactOutToken: stringifyBigInt(state.lastTrade.feeImpactOutToken),
          kBefore: stringifyBigInt(state.lastTrade.kBefore),
          kAfter: stringifyBigInt(state.lastTrade.kAfter)
        }
      : null
  };
}

export function deserializePoolState(raw: SerializedPoolState): PoolState {
  return {
    tokenX: raw.tokenX,
    tokenY: raw.tokenY,
    reserveX: parseBigInt(raw.reserveX),
    reserveY: parseBigInt(raw.reserveY),
    feeRate: parseBigInt(raw.feeRate),
    lpTotalSupply: parseBigInt(raw.lpTotalSupply),
    lpUserBalance: parseBigInt(raw.lpUserBalance),
    feeAccX: parseBigInt(raw.feeAccX),
    feeAccY: parseBigInt(raw.feeAccY),
    t: raw.t,
    lastTrade: raw.lastTrade
      ? {
          direction: raw.lastTrade.direction,
          reserveXBefore: parseBigInt(raw.lastTrade.reserveXBefore),
          reserveYBefore: parseBigInt(raw.lastTrade.reserveYBefore),
          reserveXAfter: parseBigInt(raw.lastTrade.reserveXAfter),
          reserveYAfter: parseBigInt(raw.lastTrade.reserveYAfter),
          amountIn: parseBigInt(raw.lastTrade.amountIn),
          amountOut: parseBigInt(raw.lastTrade.amountOut),
          amountOutNoFee: parseBigInt(raw.lastTrade.amountOutNoFee),
          feeAmountInToken: parseBigInt(raw.lastTrade.feeAmountInToken),
          avgPriceYPerX: parseBigInt(raw.lastTrade.avgPriceYPerX),
          spotPriceBeforeYPerX: parseBigInt(raw.lastTrade.spotPriceBeforeYPerX),
          spotPriceAfterYPerX: parseBigInt(raw.lastTrade.spotPriceAfterYPerX),
          slippageTotal: parseBigInt(raw.lastTrade.slippageTotal),
          slippageCurve: parseBigInt(raw.lastTrade.slippageCurve),
          feeImpactRate: parseBigInt(raw.lastTrade.feeImpactRate),
          feeImpactOutToken: parseBigInt(raw.lastTrade.feeImpactOutToken),
          kBefore: parseBigInt(raw.lastTrade.kBefore),
          kAfter: parseBigInt(raw.lastTrade.kAfter)
        }
      : null
  };
}

export function isSerializedPoolState(data: unknown): data is SerializedPoolState {
  if (!data || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;
  const required = [
    'tokenX',
    'tokenY',
    'reserveX',
    'reserveY',
    'feeRate',
    'lpTotalSupply',
    'lpUserBalance',
    'feeAccX',
    'feeAccY',
    't',
    'lastTrade'
  ];
  return required.every((key) => key in obj);
}
