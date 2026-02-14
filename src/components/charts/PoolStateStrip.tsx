import { PoolState } from '../../core/types';
import { formatFp, fpDiv, toNumber } from '../../core/math';

interface PoolStateStripProps {
  state: PoolState;
}

export function PoolStateStrip({ state }: PoolStateStripProps) {
  const spot = state.reserveX > 0n ? fpDiv(state.reserveY, state.reserveX) : 0n;
  const k = toNumber(state.reserveX) * toNumber(state.reserveY);

  return (
    <section className="pool-strip">
      <article>
        <span>Spot</span>
        <strong>
          1 {state.tokenX.symbol} = {formatFp(spot, 8)} {state.tokenY.symbol}
        </strong>
      </article>
      <article>
        <span>Reserves</span>
        <strong>
          {formatFp(state.reserveX, 6)} {state.tokenX.symbol} / {formatFp(state.reserveY, 6)} {state.tokenY.symbol}
        </strong>
      </article>
      <article>
        <span>k</span>
        <strong>{k.toFixed(6)}</strong>
      </article>
    </section>
  );
}
