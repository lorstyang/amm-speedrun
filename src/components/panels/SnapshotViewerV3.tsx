import { serializeV3PoolState } from '../../core/serializationV3';
import { V3PoolState } from '../../core/types';

interface SnapshotViewerV3Props {
  state: V3PoolState;
}

export function SnapshotViewerV3({ state }: SnapshotViewerV3Props) {
  const json = JSON.stringify(serializeV3PoolState(state), null, 2);

  return (
    <section className="card snapshot-panel">
      <header className="card-header">
        <h3>State Snapshot (V3)</h3>
      </header>
      <div className="card-content">
        <pre>{json}</pre>
      </div>
    </section>
  );
}
