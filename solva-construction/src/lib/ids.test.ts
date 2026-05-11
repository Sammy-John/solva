import { describe, expect, it, vi } from 'vitest';

import { createEntityId } from '@/lib/ids';

describe('createEntityId', () => {
  it('uses crypto.randomUUID with a readable entity prefix', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('abc-123' as `${string}-${string}-${string}-${string}-${string}`);

    expect(createEntityId('task')).toBe('task-abc-123');
  });
});
