import { describe, expect, it } from 'vitest';
import { getLatestChanges } from '@/lib/releaseNotes';

describe('getLatestChanges', () => {
  it('returns release items for 1.0.6', () => {
    const result = getLatestChanges('1.0.6');
    expect(result.version).toBe('1.0.6');
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.join(' ')).toContain('Workdays');
  });

  it('falls back to an empty list for unknown versions', () => {
    const result = getLatestChanges('0.0.0');
    expect(result.items).toEqual([]);
  });
});