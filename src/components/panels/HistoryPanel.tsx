import { TimelineEntry } from '../../core/types';
import { ActionButton } from '../common/ActionButton';

interface HistoryPanelProps {
  timeline: TimelineEntry[];
  cursor: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onJumpTo: (index: number) => void;
}

export function HistoryPanel({
  timeline,
  cursor,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onJumpTo
}: HistoryPanelProps) {
  return (
    <section className="history-panel card">
      <header className="card-header history-header">
        <h3>Operation History</h3>
        <div className="history-actions">
          <ActionButton variant="secondary" onClick={onUndo} disabled={!canUndo}>
            Undo
          </ActionButton>
          <ActionButton variant="secondary" onClick={onRedo} disabled={!canRedo}>
            Redo
          </ActionButton>
        </div>
      </header>
      <ol className="history-list">
        {timeline.map((entry, index) => (
          <li key={entry.id}>
            <button
              type="button"
              className={index === cursor ? 'history-item active' : 'history-item'}
              onClick={() => onJumpTo(index)}
            >
              <span className="history-index">#{index}</span>
              <strong>{entry.label}</strong>
              <small>{new Date(entry.createdAt).toLocaleTimeString()}</small>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
