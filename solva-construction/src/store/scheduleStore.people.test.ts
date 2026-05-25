import { beforeEach, describe, expect, it } from 'vitest';

import { useScheduleStore } from '@/store/scheduleStore';
import type { Person, Section, Task } from '@/types/scheduling';

const section: Section = { id: 'sec', name: 'Section', order: 0 };

const alex: Person = {
  id: 'person-alex',
  name: 'Alex Builder',
  userGroup: 'Internal',
};

const supplier: Person = {
  id: 'person-supplier',
  name: 'Tile Supplier',
  userGroup: 'Suppliers',
};

const activeTask: Task = {
  id: 'task-active',
  name: 'Order tiles',
  taskType: 'Ordering',
  sectionId: section.id,
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  duration: 5,
  assignedTo: ['person-supplier'],
  userGroup: 'Suppliers',
  status: 'Booked',
  comments: [],
};

describe('scheduleStore people directory behavior', () => {
  beforeEach(() => {
    useScheduleStore.setState({
      excludeWeekends: true,
      tasks: [],
      sections: [],
      dependencies: [],
      people: [],
      cascadeNotification: null,
      blockedTaskEdit: null,
    });
  });

  it('keeps legacy people unchanged when loading schedule data so upgrade can require approval', () => {
    useScheduleStore.getState().setScheduleData([], [section], [], [alex, supplier]);

    expect(useScheduleStore.getState().people).toEqual([alex, supplier]);
  });

  it('deactivates people from future selection without removing existing task assignments', () => {
    useScheduleStore.getState().setScheduleData([activeTask], [section], [], [supplier]);

    useScheduleStore.getState().removePerson('person-supplier');

    expect(useScheduleStore.getState().people[0]).toMatchObject({
      id: 'person-supplier',
      projectActive: false,
    });
    expect(useScheduleStore.getState().tasks[0].assignedTo).toEqual(['person-supplier']);
  });

  it('archives people without removing existing task assignments', () => {
    useScheduleStore.getState().setScheduleData([activeTask], [section], [], [supplier]);

    useScheduleStore.getState().archivePerson('person-supplier');

    expect(useScheduleStore.getState().people[0]).toMatchObject({
      id: 'person-supplier',
      archived: true,
      projectActive: false,
    });
    expect(useScheduleStore.getState().tasks[0].assignedTo).toEqual(['person-supplier']);
  });
});
