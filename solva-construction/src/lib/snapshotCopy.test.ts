import { describe, expect, it } from 'vitest';

import { getSnapshotRestoreConfirmationMessage } from '@/lib/snapshotCopy';

describe('snapshot restore copy', () => {
  it('states that restoring overwrites the active saved schedule', () => {
    expect(
      getSnapshotRestoreConfirmationMessage({
        label: 'Snapshot 1',
        createdAtLabel: 'May 8, 2026, 10:00 AM',
      }),
    ).toBe(
      'Restore snapshot "Snapshot 1" from May 8, 2026, 10:00 AM? This will overwrite the active saved schedule for this project.',
    );
  });
});
