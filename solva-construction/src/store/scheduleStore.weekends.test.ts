import { beforeEach, describe, expect, it } from 'vitest';
import { useScheduleStore } from '@/store/scheduleStore';
import type { Dependency, Section, Task } from '@/types/scheduling';

const sections: Section[] = [{ id: 'sec-a', name: 'A', order: 0 }];

const task = (overrides: Partial<Task>): Task => ({
  id: 'task',
  name: 'Task',
  taskType: 'Internal',
  sectionId: 'sec-a',
  startDate: '2026-03-06',
  endDate: '2026-03-09',
  duration: 2,
  assignedTo: [],
  userGroup: 'Internal',
  status: 'Planned',
  comments: [],
  ...overrides,
});

const dependency = (overrides: Partial<Dependency>): Dependency => ({
  id: 'dep',
  predecessorId: 'pred',
  successorId: 'succ',
  lagDays: 0,
  autoShift: true,
  notes: '',
  ...overrides,
});

describe('scheduleStore.setExcludeWeekends', () => {
  beforeEach(() => {
    useScheduleStore.setState({
      excludeWeekends: true,
      tasks: [],
      sections,
      dependencies: [],
      people: [],
      cascadeNotification: null,
    });
  });

  it('keeps completed task dates when workdays-only mode changes', () => {
    useScheduleStore.setState({
      tasks: [
        task({
          id: 'done',
          name: 'Completed',
          status: 'Completed',
          startDate: '2026-03-06',
          endDate: '2026-03-09',
          duration: 2,
        }),
      ],
    });

    useScheduleStore.getState().setExcludeWeekends(false);

    const completed = useScheduleStore
      .getState()
      .tasks.find((storedTask) => storedTask.id === 'done');

    expect(completed?.startDate).toBe('2026-03-06');
    expect(completed?.endDate).toBe('2026-03-09');
  });

  it('does not use completed auto-shift predecessors as bulk cascade roots', () => {
    useScheduleStore.setState({
      tasks: [
        task({
          id: 'done-pred',
          name: 'Completed Predecessor',
          status: 'Completed',
          startDate: '2026-03-01',
          endDate: '2026-03-10',
          duration: 10,
        }),
        task({
          id: 'succ',
          name: 'Incomplete Successor',
          startDate: '2026-03-02',
          endDate: '2026-03-03',
          duration: 2,
        }),
      ],
      dependencies: [
        dependency({
          id: 'd-completed-root',
          predecessorId: 'done-pred',
          successorId: 'succ',
        }),
      ],
    });

    useScheduleStore.getState().setExcludeWeekends(false);

    const successor = useScheduleStore
      .getState()
      .tasks.find((storedTask) => storedTask.id === 'succ');

    expect(successor?.startDate).toBe('2026-03-02');
    expect(successor?.endDate).toBe('2026-03-03');
  });

  it('does not use completed predecessor constraints selected through incomplete bulk roots', () => {
    useScheduleStore.setState({
      tasks: [
        task({
          id: 'completed-a',
          name: 'Completed A',
          status: 'Completed',
          startDate: '2026-03-01',
          endDate: '2026-03-20',
          duration: 20,
        }),
        task({
          id: 'incomplete-c',
          name: 'Incomplete C',
          startDate: '2026-03-01',
          endDate: '2026-03-05',
          duration: 5,
        }),
        task({
          id: 'b',
          name: 'Shared Successor B',
          startDate: '2026-03-10',
          endDate: '2026-03-11',
          duration: 2,
        }),
      ],
      dependencies: [
        dependency({
          id: 'd-completed-a-b',
          predecessorId: 'completed-a',
          successorId: 'b',
        }),
        dependency({
          id: 'd-incomplete-c-b',
          predecessorId: 'incomplete-c',
          successorId: 'b',
        }),
      ],
    });

    useScheduleStore.getState().setExcludeWeekends(false);

    const successor = useScheduleStore
      .getState()
      .tasks.find((storedTask) => storedTask.id === 'b');

    expect(successor?.startDate).toBe('2026-03-10');
    expect(successor?.endDate).toBe('2026-03-11');
  });
});
