export type SwapDirection = 'X_TO_Y' | 'Y_TO_X';

export type OperationKind = 'init' | 'swap' | 'add' | 'remove' | 'reset' | 'import';

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

export interface TimelineEntry {
  id: number;
  kind: OperationKind;
  label: string;
  snapshot: PoolState;
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
