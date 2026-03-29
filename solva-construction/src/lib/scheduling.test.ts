import { describe, expect, it } from 'vitest';
import {
  cascadeDependencies,
  createsDependencyCycle,
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
