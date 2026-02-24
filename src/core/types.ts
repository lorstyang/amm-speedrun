export type SwapDirection = 'X_TO_Y' | 'Y_TO_X';
export type AmmModel = 'v2' | 'v3';
export type V3FeeTier = 500 | 3000 | 10000;

export type OperationKind = 'init' | 'swap' | 'add' | 'remove' | 'arb' | 'reset' | 'import';

export type PresetId = 'deep' | 'shallow' | 'imbalanced' | 'zeroFee';

export interface TokenInfo {
  symbol: string;
  decimals: number;
}

export interface LastTradeMetrics {
  direction: SwapDirection;
  reserveXBefore: bigint;
  reserveYBefore: bigint;
  reserveXAfter: bigint;
  reserveYAfter: bigint;
  amountIn: bigint;
  amountOut: bigint;
  amountOutNoFee: bigint;
  feeAmountInToken: bigint;
  avgPriceYPerX: bigint;
  spotPriceBeforeYPerX: bigint;
  spotPriceAfterYPerX: bigint;
  slippageTotal: bigint;
  slippageCurve: bigint;
  feeImpactRate: bigint;
  feeImpactOutToken: bigint;
  kBefore: bigint;
  kAfter: bigint;
}

export interface PoolState {
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  reserveX: bigint;
  reserveY: bigint;
  feeRate: bigint;
  lpTotalSupply: bigint;
  lpUserBalance: bigint;
  feeAccX: bigint;
  feeAccY: bigint;
  t: number;
  lastTrade: LastTradeMetrics | null;
}

export interface SwapQuote {
  ok: boolean;
  error?: string;
  direction: SwapDirection;
  reserveXBefore: bigint;
  reserveYBefore: bigint;
  amountIn: bigint;
  amountInAfterFee: bigint;
  amountOut: bigint;
  amountOutNoFee: bigint;
  feeAmountInToken: bigint;
  reserveXAfter: bigint;
  reserveYAfter: bigint;
  avgPriceYPerX: bigint;
  spotPriceBeforeYPerX: bigint;
  spotPriceAfterYPerX: bigint;
  slippageTotal: bigint;
  slippageCurve: bigint;
  feeImpactRate: bigint;
  feeImpactOutToken: bigint;
  kBefore: bigint;
  kAfter: bigint;
}

export interface AddLiquidityQuote {
  ok: boolean;
  error?: string;
  amountXIn: bigint;
  amountYIn: bigint;
  amountXUsed: bigint;
  amountYUsed: bigint;
  refundX: bigint;
  refundY: bigint;
  lpMint: bigint;
  lpShareAfter: bigint;
}

export interface RemoveLiquidityQuote {
  ok: boolean;
  error?: string;
  burnLp: bigint;
  outX: bigint;
  outY: bigint;
  lpShareAfter: bigint;
}

export interface ArbitrageQuote {
  ok: boolean;
  error?: string;
  externalPriceYPerX: bigint;
  direction: SwapDirection;
  amountIn: bigint;
  amountOut: bigint;
  spotPriceBeforeYPerX: bigint;
  spotPriceAfterYPerX: bigint;
  spreadBefore: bigint;
  spreadAfter: bigint;
  expectedProfitInY: bigint;
  swapQuote: SwapQuote;
}

export interface AutoArbitrageResult {
  ok: boolean;
  error?: string;
  steps: number;
  finalSpread: bigint;
}

export interface TimelineEntry<TSnapshot = PoolState> {
  id: number;
  kind: OperationKind;
  label: string;
  snapshot: TSnapshot;
  createdAt: number;
}

export interface PresetConfig {
  id: PresetId;
  label: string;
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  reserveX: string;
  reserveY: string;
  feeRate: string;
}

export interface SerializedPoolState {
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  reserveX: string;
  reserveY: string;
  feeRate: string;
  lpTotalSupply: string;
  lpUserBalance: string;
  feeAccX: string;
  feeAccY: string;
  t: number;
  lastTrade: null | {
    direction: SwapDirection;
    reserveXBefore: string;
    reserveYBefore: string;
    reserveXAfter: string;
    reserveYAfter: string;
    amountIn: string;
    amountOut: string;
    amountOutNoFee: string;
    feeAmountInToken: string;
    avgPriceYPerX: string;
    spotPriceBeforeYPerX: string;
    spotPriceAfterYPerX: string;
    slippageTotal: string;
    slippageCurve: string;
    feeImpactRate: string;
    feeImpactOutToken: string;
    kBefore: string;
    kAfter: string;
  };
}

export interface V3Position {
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  feeOwedX: bigint;
  feeOwedY: bigint;
}

export interface V3LastTradeMetrics {
  direction: SwapDirection;
  amountIn: bigint;
  amountInConsumed: bigint;
  amountInUnfilled: bigint;
  amountOut: bigint;
  feeAmountInToken: bigint;
  avgPriceYPerX: bigint;
  spotPriceBeforeYPerX: bigint;
  spotPriceAfterYPerX: bigint;
  slippageTotal: bigint;
  sqrtPriceBeforeX96: bigint;
  sqrtPriceAfterX96: bigint;
  tickBefore: number;
  tickAfter: number;
  liquidityBefore: bigint;
  liquidityAfter: bigint;
  crossedBoundary: boolean;
  partialFill: boolean;
  kBefore: bigint;
  kAfter: bigint;
}

export interface V3PoolState {
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  feeTier: V3FeeTier;
  tickSpacing: number;
  sqrtPriceX96: bigint;
  tickCurrent: number;
  liquidity: bigint;
  position: V3Position;
  feeGrowthGlobalX128X: bigint;
  feeGrowthGlobalX128Y: bigint;
  feeAccX: bigint;
  feeAccY: bigint;
  t: number;
  lastTrade: V3LastTradeMetrics | null;
}

export interface V3SwapQuote {
  ok: boolean;
  error?: string;
  direction: SwapDirection;
  amountIn: bigint;
  amountInConsumed: bigint;
  amountInUnfilled: bigint;
  amountOut: bigint;
  feeAmountInToken: bigint;
  avgPriceYPerX: bigint;
  spotPriceBeforeYPerX: bigint;
  spotPriceAfterYPerX: bigint;
  slippageTotal: bigint;
  sqrtPriceBeforeX96: bigint;
  sqrtPriceAfterX96: bigint;
  tickBefore: number;
  tickAfter: number;
  liquidityBefore: bigint;
  liquidityAfter: bigint;
  crossedBoundary: boolean;
  partialFill: boolean;
  kBefore: bigint;
  kAfter: bigint;
}

export interface V3AddLiquidityParams {
  amountXIn: bigint;
  amountYIn: bigint;
  tickLower?: number;
  tickUpper?: number;
}

export interface V3AddLiquidityQuote {
  ok: boolean;
  error?: string;
  amountXIn: bigint;
  amountYIn: bigint;
  amountXUsed: bigint;
  amountYUsed: bigint;
  refundX: bigint;
  refundY: bigint;
  liquidityDelta: bigint;
  tickLower: number;
  tickUpper: number;
  positionLiquidityAfter: bigint;
  activeLiquidityAfter: bigint;
  rangeUpdated: boolean;
}

export interface V3RemoveLiquidityQuote {
  ok: boolean;
  error?: string;
  liquidityDelta: bigint;
  amountXOut: bigint;
  amountYOut: bigint;
  positionLiquidityAfter: bigint;
  activeLiquidityAfter: bigint;
}

export interface SerializedV3PoolState {
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  feeTier: V3FeeTier;
  tickSpacing: number;
  sqrtPriceX96: string;
  tickCurrent: number;
  liquidity: string;
  position: {
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    feeOwedX: string;
    feeOwedY: string;
  };
  feeGrowthGlobalX128X: string;
  feeGrowthGlobalX128Y: string;
  feeAccX: string;
  feeAccY: string;
  t: number;
  lastTrade: null | {
    direction: SwapDirection;
    amountIn: string;
    amountInConsumed: string;
    amountInUnfilled: string;
    amountOut: string;
    feeAmountInToken: string;
    avgPriceYPerX: string;
    spotPriceBeforeYPerX: string;
    spotPriceAfterYPerX: string;
    slippageTotal: string;
    sqrtPriceBeforeX96: string;
    sqrtPriceAfterX96: string;
    tickBefore: number;
    tickAfter: number;
    liquidityBefore: string;
    liquidityAfter: string;
    crossedBoundary: boolean;
    partialFill: boolean;
    kBefore: string;
    kAfter: string;
  };
}

export type V3TimelineEntry = TimelineEntry<V3PoolState>;
