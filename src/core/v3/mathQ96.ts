export function assertPositive(value: bigint, label: string): void {
  if (value <= 0n) {
    throw new Error(`${label} must be greater than zero`);
  }
}

export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  assertPositive(denominator, 'denominator');
  return (a * b) / denominator;
}

export function mulDivRoundingUp(a: bigint, b: bigint, denominator: bigint): bigint {
  assertPositive(denominator, 'denominator');
  const product = a * b;
  const result = product / denominator;
  return product % denominator === 0n ? result : result + 1n;
}

export function divRoundingUp(numerator: bigint, denominator: bigint): bigint {
  assertPositive(denominator, 'denominator');
  const result = numerator / denominator;
  return numerator % denominator === 0n ? result : result + 1n;
}

export function maxBig(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function minBig(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
