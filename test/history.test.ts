import { describe, expect, it } from 'vitest';
import {
  applySwapExactIn,
  quoteSwapExactIn
} from '../src/core/ammV2';
import { parseFp } from '../src/core/math';
import {
  commitEntry,
  currentSnapshot,
  initTimelineState,
  jumpToTimeline,
  redoTimeline,
  undoTimeline
} from '../src/store/useAmmStore';

describe('timeline history', () => {
  it('supports commit + undo + redo + jump', () => {
    const initial = initTimelineState('deep');
    const snap0 = currentSnapshot(initial);

    const quote1 = quoteSwapExactIn(snap0, 'X_TO_Y', parseFp('10'));
    expect(quote1.ok).toBe(true);
    if (!quote1.ok) {
      return;
    }

    const state1 = applySwapExactIn(snap0, quote1);
    const committed1 = commitEntry(initial, {
      kind: 'swap',
      label: 'swap1',
      snapshot: state1
    });

    const quote2 = quoteSwapExactIn(currentSnapshot(committed1), 'Y_TO_X', parseFp('1000'));
    expect(quote2.ok).toBe(true);
    if (!quote2.ok) {
      return;
    }

    const state2 = applySwapExactIn(currentSnapshot(committed1), quote2);
    const committed2 = commitEntry(committed1, {
      kind: 'swap',
      label: 'swap2',
      snapshot: state2
    });

    expect(committed2.cursor).toBe(2);
    expect(committed2.timeline.length).toBe(3);

    const undone = undoTimeline(committed2);
    expect(undone.cursor).toBe(1);

    const redone = redoTimeline(undone);
    expect(redone.cursor).toBe(2);

    const jumped = jumpToTimeline(redone, 0);
    expect(jumped.cursor).toBe(0);

    const jumpedOutOfRange = jumpToTimeline(jumped, 99);
    expect(jumpedOutOfRange.cursor).toBe(0);
  });
});
