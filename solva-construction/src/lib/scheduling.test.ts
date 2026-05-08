import { describe, expect, it } from 'vitest';
import {
  cascadeDependencies,
  createsDependencyCycle,
  getConservativeStatusForDate,
  getDependencyConflictDetails,
  getUrgency,
  getUrgencyTooltip,
  hasMissingSupplyDates,
  isPastDue,
} from '@/lib/scheduling';
import { Dependency, Task } from '@/types/scheduling';

const baseTask = (overrides: Partial<Task>): Task => ({
  id: 'task',
  name: 'Task',
  taskType: 'Internal',
  sectionId: 'sec-1',
  startDate: '',
  endDate: '',
  duration: 1,
  assignedTo: [],
  userGroup: 'Internal',
  status: 'Planned',
  comments: [],
  ...overrides,
});

describe('cascadeDependencies', () => {
  it('re-enforces auto-shift constraints when a successor is edited too early', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'pred',
        name: 'Predecessor',
        startDate: '2026-01-01',
        endDate: '2026-01-05',
        duration: 5,
      }),
      baseTask({
        id: 'succ',
        name: 'Successor',
        startDate: '2026-01-02',
        endDate: '2026-01-03',
        duration: 2,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd1',
        predecessorId: 'pred',
        successorId: 'succ',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'succ');
    const successor = result.updatedTasks.find((task) => task.id === 'succ');

    expect(successor?.startDate).toBe('2026-01-05');
    expect(successor?.endDate).toBe('2026-01-06');
    expect(result.affectedIds).toContain('succ');
    expect(result.movementSummaries).toEqual([
      {
        taskId: 'succ',
        taskName: 'Successor',
        fromStartDate: '2026-01-02',
        toStartDate: '2026-01-05',
        constrainedByTaskId: 'pred',
        constrainedByTaskName: 'Predecessor',
        dependencyId: 'd1',
        lagDays: 0,
      },
    ]);
  });

  it('uses the latest constrained start when a task has multiple auto-shift predecessors', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'pred-1',
        name: 'Pred 1',
        startDate: '2026-02-01',
        endDate: '2026-02-04',
        duration: 4,
      }),
      baseTask({
        id: 'pred-2',
        name: 'Pred 2',
        startDate: '2026-02-01',
        endDate: '2026-02-08',
        duration: 8,
      }),
      baseTask({
        id: 'succ',
        name: 'Successor',
        startDate: '2026-02-04',
        endDate: '2026-02-05',
        duration: 2,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd1',
        predecessorId: 'pred-1',
        successorId: 'succ',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
      {
        id: 'd2',
        predecessorId: 'pred-2',
        successorId: 'succ',
        lagDays: 2,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'pred-1');
    const successor = result.updatedTasks.find((task) => task.id === 'succ');

    expect(successor?.startDate).toBe('2026-02-10');
    expect(successor?.endDate).toBe('2026-02-11');
    expect(result.movementSummaries[0]).toMatchObject({
      taskId: 'succ',
      fromStartDate: '2026-02-04',
      toStartDate: '2026-02-10',
      constrainedByTaskId: 'pred-2',
      constrainedByTaskName: 'Pred 2',
      dependencyId: 'd2',
      lagDays: 2,
    });
  });

  it('does not pull a buffered auto-shift successor earlier', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'pred',
        name: 'Predecessor',
        startDate: '2026-02-01',
        endDate: '2026-02-05',
        duration: 5,
      }),
      baseTask({
        id: 'succ',
        name: 'Buffered Successor',
        startDate: '2026-02-10',
        endDate: '2026-02-11',
        duration: 2,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd-buffer',
        predecessorId: 'pred',
        successorId: 'succ',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'pred');
    const successor = result.updatedTasks.find((task) => task.id === 'succ');

    expect(successor?.startDate).toBe('2026-02-10');
    expect(successor?.endDate).toBe('2026-02-11');
    expect(result.affectedIds).not.toContain('succ');
    expect(result.movementSummaries.map((item) => item.taskId)).not.toContain('succ');
  });

  it('does not auto-move completed successors or continue cascading through them', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'pred',
        name: 'Predecessor',
        startDate: '2026-03-01',
        endDate: '2026-03-10',
        duration: 10,
      }),
      baseTask({
        id: 'done',
        name: 'Completed Successor',
        startDate: '2026-03-02',
        endDate: '2026-03-03',
        duration: 2,
        status: 'Completed',
      }),
      baseTask({
        id: 'tail',
        name: 'Downstream Successor',
        startDate: '2026-03-01',
        endDate: '2026-03-01',
        duration: 1,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd-completed',
        predecessorId: 'pred',
        successorId: 'done',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
      {
        id: 'd-tail',
        predecessorId: 'done',
        successorId: 'tail',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'pred');
    const completed = result.updatedTasks.find((task) => task.id === 'done');
    const downstream = result.updatedTasks.find((task) => task.id === 'tail');

    expect(completed?.startDate).toBe('2026-03-02');
    expect(completed?.endDate).toBe('2026-03-03');
    expect(downstream?.startDate).toBe('2026-03-01');
    expect(downstream?.endDate).toBe('2026-03-01');
    expect(result.affectedIds).toEqual([]);
    expect(result.movementSummaries).toEqual([]);
  });

  it('lets a completed changed predecessor push incomplete auto-shift successors', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'done-pred',
        name: 'Completed Predecessor',
        startDate: '2026-03-01',
        endDate: '2026-03-10',
        duration: 10,
        status: 'Completed',
      }),
      baseTask({
        id: 'succ',
        name: 'Incomplete Successor',
        startDate: '2026-03-02',
        endDate: '2026-03-03',
        duration: 2,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd-completed-pred',
        predecessorId: 'done-pred',
        successorId: 'succ',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'done-pred');
    const predecessor = result.updatedTasks.find((task) => task.id === 'done-pred');
    const successor = result.updatedTasks.find((task) => task.id === 'succ');

    expect(predecessor?.startDate).toBe('2026-03-01');
    expect(predecessor?.endDate).toBe('2026-03-10');
    expect(successor?.startDate).toBe('2026-03-10');
    expect(successor?.endDate).toBe('2026-03-11');
    expect(result.affectedIds).toEqual(['succ']);
    expect(result.movementSummaries[0]).toMatchObject({
      taskId: 'succ',
      fromStartDate: '2026-03-02',
      toStartDate: '2026-03-10',
      constrainedByTaskId: 'done-pred',
      dependencyId: 'd-completed-pred',
    });
  });

  it('returns deterministic affected order regardless of dependency input order', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'pred',
        name: 'Pred',
        startDate: '2026-03-01',
        endDate: '2026-03-05',
        duration: 5,
      }),
      baseTask({
        id: 'succ-b',
        name: 'Successor B',
        startDate: '2026-03-01',
        endDate: '2026-03-02',
        duration: 2,
      }),
      baseTask({
        id: 'succ-a',
        name: 'Successor A',
        startDate: '2026-03-01',
        endDate: '2026-03-02',
        duration: 2,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd-b',
        predecessorId: 'pred',
        successorId: 'succ-b',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
      {
        id: 'd-a',
        predecessorId: 'pred',
        successorId: 'succ-a',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'pred');

    expect(result.affectedIds).toEqual(['succ-a', 'succ-b']);
    expect(result.movementSummaries.map((item) => item.taskId)).toEqual([
      'succ-a',
      'succ-b',
    ]);
  });

  it('does not duplicate movement summaries when a task is revisited in cascade paths', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'a',
        name: 'A',
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        duration: 3,
      }),
      baseTask({
        id: 'b',
        name: 'B',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        duration: 2,
      }),
      baseTask({
        id: 'c',
        name: 'C',
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        duration: 2,
      }),
      baseTask({
        id: 'd',
        name: 'D',
        startDate: '2026-04-01',
        endDate: '2026-04-01',
        duration: 1,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd1',
        predecessorId: 'a',
        successorId: 'b',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
      {
        id: 'd2',
        predecessorId: 'a',
        successorId: 'c',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
      {
        id: 'd3',
        predecessorId: 'b',
        successorId: 'd',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
      {
        id: 'd4',
        predecessorId: 'c',
        successorId: 'd',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'a');
    const summaryTaskIds = result.movementSummaries.map((item) => item.taskId);

    expect(summaryTaskIds.filter((id) => id === 'd')).toHaveLength(1);
    expect(new Set(summaryTaskIds).size).toBe(summaryTaskIds.length);
  });


  it('keeps buffered auto-shift successors in place when a predecessor moves earlier', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'pred',
        name: 'Pred',
        startDate: '2026-04-01',
        endDate: '2026-04-01',
        duration: 1,
      }),
      baseTask({
        id: 'succ',
        name: 'Succ',
        startDate: '2026-04-10',
        endDate: '2026-04-10',
        duration: 1,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd1',
        predecessorId: 'pred',
        successorId: 'succ',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'pred');
    const successor = result.updatedTasks.find((task) => task.id === 'succ');

    expect(successor?.startDate).toBe('2026-04-10');
    expect(successor?.endDate).toBe('2026-04-10');
    expect(result.affectedIds).not.toContain('succ');
  });

  it('leaves unrelated tasks unchanged', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'pred',
        name: 'Pred',
        startDate: '2026-05-01',
        endDate: '2026-05-04',
        duration: 4,
      }),
      baseTask({
        id: 'succ',
        name: 'Succ',
        startDate: '2026-05-01',
        endDate: '2026-05-02',
        duration: 2,
      }),
      baseTask({
        id: 'untouched',
        name: 'Untouched',
        startDate: '2026-06-01',
        endDate: '2026-06-02',
        duration: 2,
      }),
    ];

    const deps: Dependency[] = [
      {
        id: 'd1',
        predecessorId: 'pred',
        successorId: 'succ',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    const result = cascadeDependencies(tasks, deps, 'pred');
    const untouched = result.updatedTasks.find((task) => task.id === 'untouched');

    expect(untouched?.startDate).toBe('2026-06-01');
    expect(untouched?.endDate).toBe('2026-06-02');
    expect(result.affectedIds).not.toContain('untouched');
    expect(result.movementSummaries.map((item) => item.taskId)).not.toContain('untouched');
  });
});

describe('date-critical urgency parity', () => {
  it('treats inspection like other date-critical tasks for missing dates', () => {
    expect(hasMissingSupplyDates('Inspection', '', '', 'Planned')).toBe(true);
    expect(hasMissingSupplyDates('Inspection', '2026-04-10', '2026-04-11', 'Planned')).toBe(false);
  });

  it('flags overdue inspection tasks', () => {
    expect(isPastDue('Inspection', '2020-01-01', 'Planned')).toBe(true);
    expect(isPastDue('Inspection', '2099-01-01', 'Planned')).toBe(false);
  });

  it('returns urgency and tooltip copy for inspection', () => {
    expect(getUrgency('Inspection', '2099-01-10', 'Planned', '2099-01-01')).toBe('green');
    expect(getUrgencyTooltip('Inspection', '2099-01-10', 'Planned', '2099-01-01')).toContain('Inspection due in');
  });
});

describe('getConservativeStatusForDate', () => {
  it('marks incomplete non-delayed tasks as in progress when today is within the date range', () => {
    const task = baseTask({
      startDate: '2026-05-05',
      endDate: '2026-05-07',
      status: 'Planned',
    });

    expect(getConservativeStatusForDate(task, '2026-05-05')).toBe('In Progress');
    expect(getConservativeStatusForDate(task, '2026-05-06')).toBe('In Progress');
    expect(getConservativeStatusForDate(task, '2026-05-07')).toBe('In Progress');
  });

  it('marks incomplete non-delayed tasks as due for review after the end date', () => {
    const task = baseTask({
      startDate: '2026-05-01',
      endDate: '2026-05-05',
      status: 'Booked',
    });

    expect(getConservativeStatusForDate(task, '2026-05-06')).toBe('Due for Review');
  });

  it('does not auto-overwrite completed or delayed tasks', () => {
    const task = baseTask({
      startDate: '2026-05-01',
      endDate: '2026-05-05',
      status: 'Completed',
    });

    expect(getConservativeStatusForDate(task, '2026-05-06')).toBe('Completed');
    expect(getConservativeStatusForDate({ ...task, status: 'Delayed' }, '2026-05-06')).toBe('Delayed');
  });

  it('keeps the current status when dates are missing', () => {
    const task = baseTask({
      startDate: '',
      endDate: '2026-05-05',
      status: 'Booked',
    });

    expect(getConservativeStatusForDate(task, '2026-05-06')).toBe('Booked');
    expect(getConservativeStatusForDate({ ...task, startDate: '2026-05-01', endDate: '' }, '2026-05-06')).toBe('Booked');
  });

  it('keeps the current status when dates are invalid', () => {
    const task = baseTask({
      startDate: '2026-05-01',
      endDate: '2026-05-05',
      status: 'Booked',
    });

    expect(getConservativeStatusForDate({ ...task, startDate: 'not-a-date' }, '2026-05-06')).toBe('Booked');
    expect(getConservativeStatusForDate({ ...task, endDate: 'not-a-date' }, '2026-05-06')).toBe('Booked');
    expect(getConservativeStatusForDate(task, 'not-a-date')).toBe('Booked');
  });
});

describe('getDependencyConflictDetails', () => {
  it('suggests Auto-shift wording for warning-only dependency conflicts', () => {
    const tasks: Task[] = [
      baseTask({
        id: 'pred',
        name: 'First Task',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        duration: 5,
      }),
      baseTask({
        id: 'succ',
        name: 'Following Task',
        startDate: '2026-06-03',
        endDate: '2026-06-04',
        duration: 2,
      }),
    ];
    const deps: Dependency[] = [
      {
        id: 'd-warning',
        predecessorId: 'pred',
        successorId: 'succ',
        lagDays: 0,
        autoShift: false,
        notes: '',
      },
    ];

    expect(getDependencyConflictDetails(tasks, deps)[0]?.suggestion).toBe(
      'Move Following Task to 2026-06-05 or turn on Auto-shift.',
    );
  });
});

describe('createsDependencyCycle', () => {
  it('detects a cycle when adding a backward link', () => {
    const deps: Dependency[] = [
      {
        id: 'd1',
        predecessorId: 'a',
        successorId: 'b',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
      {
        id: 'd2',
        predecessorId: 'b',
        successorId: 'c',
        lagDays: 0,
        autoShift: true,
        notes: '',
      },
    ];

    expect(createsDependencyCycle(deps, 'c', 'a')).toBe(true);
    expect(createsDependencyCycle(deps, 'a', 'c')).toBe(false);
  });
});
