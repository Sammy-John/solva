import { beforeEach, describe, expect, it } from 'vitest';
import { useScheduleStore } from '@/store/scheduleStore';
import type { Section, Task } from '@/types/scheduling';

const task = (overrides: Partial<Task>): Task => ({
  id: 't',
  name: 'Task',
  taskType: 'Internal',
  sectionId: 'sec-a',
  startDate: '2026-04-01',
  endDate: '2026-04-01',
  duration: 1,
  assignedTo: [],
  userGroup: 'Internal',
  status: 'Planned',
  comments: [],
  ...overrides,
});

describe('scheduleStore task placement', () => {
  beforeEach(() => {
    useScheduleStore.setState({
      excludeWeekends: true,
      sections: [],
      dependencies: [],
      people: [],
      cascadeNotification: null,
      blockedTaskEdit: null,
      tasks: [],
    });
  });

  it('moves a task to another section when targetTaskId is null', () => {
    const sections: Section[] = [
      { id: 'sec-a', name: 'A', order: 0 },
      { id: 'sec-b', name: 'B', order: 1 },
    ];

    useScheduleStore.setState({
      excludeWeekends: true,
      sections,
      dependencies: [],
      people: [],
      cascadeNotification: null,
      blockedTaskEdit: null,
      tasks: [
        task({ id: 'a1', name: 'A1', sectionId: 'sec-a' }),
        task({ id: 'a2', name: 'A2', sectionId: 'sec-a' }),
        task({ id: 'b1', name: 'B1', sectionId: 'sec-b' }),
      ],
    });

    useScheduleStore.getState().reorderTask('a1', null, 'sec-b');

    const tasks = useScheduleStore.getState().tasks;
    const moved = tasks.find((t) => t.id === 'a1');

    expect(moved?.sectionId).toBe('sec-b');

    const inB = tasks.filter((t) => t.sectionId === 'sec-b').map((t) => t.id);
    expect(inB[inB.length - 1]).toBe('a1');
  });

  it('inserts a new task directly below the source task in the same section', () => {
    const sections: Section[] = [
      { id: 'sec-a', name: 'A', order: 0 },
      { id: 'sec-b', name: 'B', order: 1 },
    ];

    useScheduleStore.setState({
      excludeWeekends: true,
      sections,
      dependencies: [],
      people: [],
      cascadeNotification: null,
      blockedTaskEdit: null,
      tasks: [
        task({ id: 'a1', name: 'A1', sectionId: 'sec-a' }),
        task({ id: 'a2', name: 'A2', sectionId: 'sec-a' }),
        task({ id: 'b1', name: 'B1', sectionId: 'sec-b' }),
      ],
    });

    useScheduleStore.getState().addTaskBelow(
      'a1',
      task({
        id: 'a1-child',
        name: 'A1 child',
        sectionId: 'sec-a',
        startDate: '',
        endDate: '',
        duration: 0,
      }),
    );

    const orderedIds = useScheduleStore.getState().tasks.map((entry) => entry.id);
    expect(orderedIds).toEqual(['a1', 'a1-child', 'a2', 'b1']);
  });
});
