import { describe, expect, it } from 'vitest';
import { applyV3SwapExactIn, quoteV3SwapExactIn } from '../src/core/ammV3';
import { parseFp } from '../src/core/math';
import {
  commitEntryV3,
  currentSnapshotV3,
  initTimelineStateV3,
  jumpToTimelineV3,
  redoTimelineV3,
  undoTimelineV3
} from '../src/store/useAmmV3Store';

describe('v3 timeline history', () => {
  it('supports commit + undo + redo + jump', () => {
    const initial = initTimelineStateV3('balanced');
    const snap0 = currentSnapshotV3(initial);

    const quote1 = quoteV3SwapExactIn(snap0, 'X_TO_Y', parseFp('1'));
    expect(quote1.ok).toBe(true);
    if (!quote1.ok) {
      return;
    }

    const state1 = applyV3SwapExactIn(snap0, quote1);
    const committed1 = commitEntryV3(initial, {
      kind: 'swap',
      label: 'swap1',
      snapshot: state1
    });

    const quote2 = quoteV3SwapExactIn(currentSnapshotV3(committed1), 'Y_TO_X', parseFp('1'));
    expect(quote2.ok).toBe(true);
    if (!quote2.ok) {
      return;
    }

    const state2 = applyV3SwapExactIn(currentSnapshotV3(committed1), quote2);
    const committed2 = commitEntryV3(committed1, {
      kind: 'swap',
      label: 'swap2',
      snapshot: state2
    });

    expect(committed2.cursor).toBe(2);
    expect(committed2.timeline.length).toBe(3);

    const undone = undoTimelineV3(committed2);
    expect(undone.cursor).toBe(1);

    const redone = redoTimelineV3(undone);
    expect(redone.cursor).toBe(2);

    const jumped = jumpToTimelineV3(redone, 0);
    expect(jumped.cursor).toBe(0);

    const jumpedOutOfRange = jumpToTimelineV3(jumped, 99);
    expect(jumpedOutOfRange.cursor).toBe(0);
  });
});
