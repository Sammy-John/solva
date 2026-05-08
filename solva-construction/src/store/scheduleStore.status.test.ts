import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScheduleStore } from '@/store/scheduleStore';
import type { Section, Task } from '@/types/scheduling';

const sections: Section[] = [{ id: 'sec-a', name: 'A', order: 0 }];

const task = (overrides: Partial<Task>): Task => ({
  id: 'task',
  name: 'Task',
  taskType: 'Internal',
  sectionId: 'sec-a',
  startDate: '2026-04-01',
  endDate: '2026-04-05',
  duration: 5,
  assignedTo: [],
  userGroup: 'Internal',
  status: 'Booked',
  comments: [],
  ...overrides,
});

describe('scheduleStore setScheduleData status normalization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00Z'));
    useScheduleStore.setState({
      excludeWeekends: true,
      tasks: [],
      sections: [],
      dependencies: [],
      people: [],
      cascadeNotification: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks past-ended incomplete tasks as Due for Review', () => {
    useScheduleStore.getState().setScheduleData(
      [task({ id: 'past', status: 'Booked' })],
      sections,
      [],
      [],
    );

    expect(useScheduleStore.getState().tasks[0].status).toBe('Due for Review');
  });

  it('keeps completed past-ended tasks completed', () => {
    useScheduleStore.getState().setScheduleData(
      [task({ id: 'completed', status: 'Completed' })],
      sections,
      [],
      [],
    );

    expect(useScheduleStore.getState().tasks[0].status).toBe('Completed');
  });

  it('keeps delayed past-ended tasks delayed', () => {
    useScheduleStore.getState().setScheduleData(
      [task({ id: 'delayed', status: 'Delayed' })],
      sections,
      [],
      [],
    );

    expect(useScheduleStore.getState().tasks[0].status).toBe('Delayed');
  });

  it('preserves current status when dates are missing', () => {
    useScheduleStore.getState().setScheduleData(
      [
        task({ id: 'missing-start', startDate: '', status: 'Booked' }),
        task({ id: 'missing-end', endDate: '', status: 'Planned' }),
      ],
      sections,
      [],
      [],
    );

    expect(useScheduleStore.getState().tasks.map((storedTask) => storedTask.status)).toEqual([
      'Booked',
      'Planned',
    ]);
  });

  it('preserves current status when dates are invalid', () => {
    useScheduleStore.getState().setScheduleData(
      [
        task({ id: 'invalid-start', startDate: 'not-a-date', status: 'Booked' }),
        task({ id: 'invalid-end', endDate: 'not-a-date', status: 'Planned' }),
      ],
      sections,
      [],
      [],
    );

    expect(useScheduleStore.getState().tasks.map((storedTask) => storedTask.status)).toEqual([
      'Booked',
      'Planned',
    ]);
  });
});
