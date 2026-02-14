import { serializePoolState } from '../../core/serialization';
import { PoolState } from '../../core/types';

interface SnapshotViewerProps {
  state: PoolState;
}

export function SnapshotViewer({ state }: SnapshotViewerProps) {
  const json = JSON.stringify(serializePoolState(state), null, 2);

  return (
    <section className="card snapshot-panel">
      <header className="card-header">
        <h3>State Snapshot</h3>
      </header>
      <div className="card-content">
        <pre>{json}</pre>
      </div>
    </section>
  );
}
