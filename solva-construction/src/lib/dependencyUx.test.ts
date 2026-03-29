import { describe, expect, it } from 'vitest';
import {
  dependencyUxLabels,
  formatDependencyRule,
  formatAutoMoveSummary,
} from '@/lib/dependencyUx';

describe('dependencyUx', () => {
  it('exposes builder-friendly labels', () => {
    expect(dependencyUxLabels.firstTask).toBe('Task that must finish first');
    expect(dependencyUxLabels.followingTask).toBe('Task that starts after');
    expect(dependencyUxLabels.gapDays).toBe('Gap after first task (days)');
  });

  it('formats finish-to-start rule in plain language', () => {
    expect(formatDependencyRule(0)).toBe(
      'Following task starts when first task finishes.',
    );
    expect(formatDependencyRule(2)).toBe(
      'Following task starts 2 days after first task finishes.',
    );
  });

  it('formats auto-move summary', () => {
    expect(formatAutoMoveSummary(true)).toBe(
      'Auto-move ON: following task will move later if needed.',
    );
    expect(formatAutoMoveSummary(false)).toBe(
      'Auto-move OFF: schedule conflicts are allowed but highlighted.',
    );
  });
});
