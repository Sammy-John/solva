export const dependencyUxLabels = {
  firstTask: 'Task that must finish first',
  followingTask: 'Task that starts after',
  gapDays: 'Gap after first task (days)',
  links: 'Task Links',
  autoShiftSwitch: 'Auto-shift following task',
  autoShiftMode: 'Auto-shift mode',
} as const;

export const formatDependencyRule = (lagDays: number): string => {
  if (lagDays <= 0) {
    return 'Following task can start the same day the first task finishes.';
  }
  if (lagDays === 1) {
    return 'Following task starts 1 day after first task finishes.';
  }
  return `Following task starts ${lagDays} days after first task finishes.`;
};

export const formatAutoMoveSummary = (autoShift: boolean): string =>
  autoShift
    ? 'Auto-shift: when the first task moves later, the linked following task moves later to keep this rule.'
    : 'Warning only: the link stays visible, dates stay put, and conflicts are highlighted.';

export const formatAutoMoveTag = (autoShift: boolean): string =>
  autoShift ? 'Auto-shift' : 'Warning only';
