import { describe, expect, it } from 'vitest';
import { getReorderInstruction } from '@/lib/dndReorder';
import type { Task } from '@/types/scheduling';

describe('getReorderInstruction', () => {
  const tasks: Task[] = [
    {
      id: 'a1',
      name: 'A1',
      taskType: 'Internal',
      sectionId: 'sec-a',
      startDate: '',
      endDate: '',
      duration: 0,
      assignedTo: [],
      userGroup: 'Internal',
      status: 'Planned',
      comments: [],
    },
    {
      id: 'a2',
      name: 'A2',
      taskType: 'Internal',
      sectionId: 'sec-a',
      startDate: '',
      endDate: '',
      duration: 0,
      assignedTo: [],
      userGroup: 'Internal',
      status: 'Planned',
      comments: [],
    },
    {
      id: 'b1',
      name: 'B1',
      taskType: 'Internal',
      sectionId: 'sec-b',
      startDate: '',
      endDate: '',
      duration: 0,
      assignedTo: [],
      userGroup: 'Internal',
      status: 'Planned',
      comments: [],
    },
  ];

  it('reorders onto a task row', () => {
    expect(getReorderInstruction({ activeId: 'a1', overId: 'a2', tasks })).toEqual({
      sourceTaskId: 'a1',
      targetTaskId: 'a2',
      targetSectionId: 'sec-a',
    });
  });

  it('moves to a section drop zone', () => {
    expect(getReorderInstruction({ activeId: 'a1', overId: 'section:sec-b', tasks })).toEqual({
      sourceTaskId: 'a1',
      targetTaskId: null,
      targetSectionId: 'sec-b',
    });
  });

  it('returns null for invalid over target', () => {
    expect(getReorderInstruction({ activeId: 'a1', overId: 'unknown', tasks })).toBeNull();
  });
});