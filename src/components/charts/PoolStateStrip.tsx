import { PoolState } from '../../core/types';
import { formatFp, fpDiv, toNumber } from '../../core/math';

interface PoolStateStripProps {
  state: PoolState;
}

export function PoolStateStrip({ state }: PoolStateStripProps) {
  const spot = state.reserveX > 0n ? fpDiv(state.reserveY, state.reserveX) : 0n;
  const k = toNumber(state.reserveX) * toNumber(state.reserveY);
  const spotText = `1 ${state.tokenX.symbol} = ${formatFp(spot, 8)} ${state.tokenY.symbol}`;
  const reserveText = `${formatFp(state.reserveX, 6)} ${state.tokenX.symbol} / ${formatFp(state.reserveY, 6)} ${state.tokenY.symbol}`;
  const kText = k.toFixed(6);

  return (
    <section className="pool-strip">
      <article>
        <span>Spot</span>
        <strong title={spotText}>{spotText}</strong>
      </article>
      <article>
        <span>Reserves</span>
        <strong title={reserveText}>{reserveText}</strong>
      </article>
      <article>
        <span>k</span>
        <strong title={kText}>{kText}</strong>
      </article>
    </section>
  );
}
