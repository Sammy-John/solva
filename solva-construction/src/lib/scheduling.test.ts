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
