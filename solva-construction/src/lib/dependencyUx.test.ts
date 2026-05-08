import { describe, expect, it } from 'vitest';
import {
  dependencyUxLabels,
  formatDependencyRule,
  formatAutoMoveSummary,
  formatAutoMoveTag,
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

  it('formats auto-shift summary', () => {
    expect(formatAutoMoveSummary(true)).toBe(
      'Auto-shift: when the first task moves later, the linked following task moves later to keep this rule.',
    );
    expect(formatAutoMoveSummary(false)).toBe(
      'Warning only: the link stays visible, dates stay put, and conflicts are highlighted.',
    );
  });

  it('formats auto-shift tags', () => {
    expect(formatAutoMoveTag(true)).toBe('Auto-shift');
    expect(formatAutoMoveTag(false)).toBe('Warning only');
  });
});
