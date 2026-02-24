import { formatFp } from '../../core/math';
import { spotPriceV3YPerX } from '../../core/ammV3';
import { V3PoolState } from '../../core/types';

interface PoolStateStripV3Props {
  state: V3PoolState;
}

export function PoolStateStripV3({ state }: PoolStateStripV3Props) {
  const spot = spotPriceV3YPerX(state);
  const spotText = `1 ${state.tokenX.symbol} = ${formatFp(spot, 8)} ${state.tokenY.symbol}`;
  const rangeText = `[${state.position.tickLower}, ${state.position.tickUpper})`;
  const feeTierText = `${(Number(state.feeTier) / 10000).toFixed(2)}%`;
  const liqText = formatFp(state.liquidity, 8);

  return (
    <section className="pool-strip">
      <article>
        <span>Spot</span>
        <strong title={spotText}>{spotText}</strong>
      </article>
      <article>
        <span>Current Tick</span>
        <strong title={`${state.tickCurrent}`}>{state.tickCurrent}</strong>
      </article>
      <article>
        <span>Range</span>
        <strong title={rangeText}>{rangeText}</strong>
      </article>
      <article>
        <span>Fee Tier</span>
        <strong title={feeTierText}>{feeTierText}</strong>
      </article>
      <article>
        <span>Active Liquidity</span>
        <strong title={liqText}>{liqText}</strong>
      </article>
    </section>
  );
}
