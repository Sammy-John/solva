export const dependencyUxLabels = {
  firstTask: 'Task that must finish first',
  followingTask: 'Task that starts after',
  gapDays: 'Gap after first task (days)',
  links: 'Task Links',
} as const;

export const formatDependencyRule = (lagDays: number): string => {
  if (lagDays <= 0) {
    return 'Following task starts when first task finishes.';
  }
  if (lagDays === 1) {
    return 'Following task starts 1 day after first task finishes.';
  }
  return `Following task starts ${lagDays} days after first task finishes.`;
};

export const formatAutoMoveSummary = (autoShift: boolean): string =>
  autoShift
    ? 'Auto-move ON: following task will move later if needed.'
    : 'Auto-move OFF: schedule conflicts are allowed but highlighted.';

export const formatAutoMoveTag = (autoShift: boolean): string =>
  autoShift ? 'Auto-move' : 'Manual move';
