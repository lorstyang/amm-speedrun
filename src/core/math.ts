export const SCALE = 1_000_000_000_000_000_000n;

export const ZERO = 0n;
export const ONE = SCALE;

const DECIMALS = 18;

export function parseFp(value: string | number): bigint {
  const raw = typeof value === 'number' ? value.toString() : value.trim();
  if (raw === '' || raw === '.' || raw === '-' || raw === '+') {
    return ZERO;
  }
  const normalized = raw.replace(/,/g, '');
  const match = normalized.match(/^([+-])?(\d*)(?:\.(\d*))?$/);
  if (!match) {
    return ZERO;
  }
  const sign = match[1] === '-' ? -1n : 1n;
  const intPart = match[2] || '0';
  const fracPart = match[3] || '';
  const fracPadded = (fracPart + '0'.repeat(DECIMALS)).slice(0, DECIMALS);
  const intValue = BigInt(intPart);
  const fracValue = BigInt(fracPadded || '0');
  return sign * (intValue * SCALE + fracValue);
}

export function safeParseFp(value: string): bigint | null {
  const normalized = value.trim().replace(/,/g, '');
  if (!normalized) {
    return ZERO;
  }
  if (!/^([+-])?(\d*)(?:\.(\d*))?$/.test(normalized)) {
    return null;
  }
  return parseFp(normalized);
}

export function formatFp(value: bigint, maxDecimals = 6): string {
  const sign = value < ZERO ? '-' : '';
  const abs = value < ZERO ? -value : value;
  const intPart = abs / SCALE;
  const fracRaw = (abs % SCALE).toString().padStart(DECIMALS, '0');
  const sliced = fracRaw.slice(0, Math.max(0, Math.min(maxDecimals, DECIMALS)));
  const fracTrimmed = sliced.replace(/0+$/, '');
  if (fracTrimmed.length === 0) {
    return `${sign}${intPart.toString()}`;
  }
  return `${sign}${intPart.toString()}.${fracTrimmed}`;
}

export function formatPercentFp(value: bigint, maxDecimals = 2): string {
  return formatFp(fpMul(value, parseFp('100')), maxDecimals);
}

export function fpMul(a: bigint, b: bigint): bigint {
  return (a * b) / SCALE;
}

export function fpDiv(a: bigint, b: bigint): bigint {
  if (b === ZERO) {
    return ZERO;
  }
  return (a * SCALE) / b;
}

export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator === ZERO) {
    return ZERO;
  }
  return (a * b) / denominator;
}

export function minBig(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function maxBig(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function clampBig(value: bigint, min: bigint, max: bigint): bigint {
  return minBig(maxBig(value, min), max);
}

export function sqrtBigInt(value: bigint): bigint {
  if (value <= ZERO) {
    return ZERO;
  }
  if (value < 4n) {
    return 1n;
  }
  let x0 = value;
  let x1 = (x0 + 1n) >> 1n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x1 + value / x1) >> 1n;
  }
  return x0;
}

export function toNumber(value: bigint): number {
  return Number(value) / Number(SCALE);
}

export function isPositive(value: bigint): boolean {
  return value > ZERO;
}

export function toBigIntOrZero(value: bigint | null | undefined): bigint {
  return value ?? ZERO;
}
