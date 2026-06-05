import { describe, expect, it } from 'vitest';

import {
  analyzeProjectPersonDeactivation,
  applyLegacyPeopleUpgrade,
  getActiveProjectPeople,
  getAssignedPeople,
  getProjectAssignablePeople,
  planLegacyPeopleUpgrade,
} from '@/lib/peopleDirectory';
import type { Person, Task } from '@/types/scheduling';

const legacyPeople: Person[] = [
  {
    id: 'p-internal',
    name: 'Alex Builder',
    userGroup: 'Internal',
    company: 'Solva Homes',
    trade: 'Site manager',
  },
  {
    id: 'p-supplier',
    name: 'Tile Supplier',
    userGroup: 'Suppliers',
    company: 'Tiles Ltd',
    trade: 'Tiles',
  },
];

const tasks: Task[] = [
  {
    id: 'task-active',
    name: 'Order tiles',
    taskType: 'Ordering',
    sectionId: 'sec',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    duration: 5,
    assignedTo: ['p-supplier'],
    userGroup: 'Suppliers',
    status: 'Booked',
    comments: [],
  },
  {
    id: 'task-completed',
    name: 'Site setup',
    taskType: 'Internal',
    sectionId: 'sec',
    startDate: '2026-05-01',
    endDate: '2026-05-01',
    duration: 1,
    assignedTo: ['p-internal'],
    userGroup: 'Internal',
    status: 'Completed',
    comments: [],
  },
];

describe('people directory helpers', () => {
  it('plans and applies an idempotent legacy people upgrade', () => {
    const plan = planLegacyPeopleUpgrade(legacyPeople);

    expect(plan.requiresUpgrade).toBe(true);
    expect(plan.peopleToActivate.map((person) => person.id)).toEqual([
      'p-internal',
      'p-supplier',
    ]);
    expect(plan.peopleToCreate.map((person) => person.name)).toEqual([
      'Alex Builder',
      'Tile Supplier',
    ]);

    const upgraded = applyLegacyPeopleUpgrade(legacyPeople);
    const upgradedAgain = applyLegacyPeopleUpgrade(upgraded);

    expect(upgraded).toEqual(upgradedAgain);
    expect(upgraded.every((person) => person.masterPersonId === person.id)).toBe(true);
    expect(upgraded.every((person) => person.projectActive === true)).toBe(true);
    expect(upgraded.map((person) => person.personType)).toEqual(['Internal', 'Supplier']);
  });

  it('does not require upgrade when people already have master and project state', () => {
    const upgraded = applyLegacyPeopleUpgrade(legacyPeople);

    expect(planLegacyPeopleUpgrade(upgraded).requiresUpgrade).toBe(false);
  });

  it('uses active project people for new assignments but keeps inactive assigned people visible', () => {
    const projectPeople: Person[] = [
      { ...legacyPeople[0], masterPersonId: 'p-internal', projectActive: false },
      { ...legacyPeople[1], masterPersonId: 'p-supplier', projectActive: true },
      {
        id: 'p-archived',
        name: 'Old Supplier',
        userGroup: 'Suppliers',
        personType: 'Supplier',
        projectActive: true,
        archived: true,
      },
    ];

    expect(getActiveProjectPeople(projectPeople).map((person) => person.id)).toEqual(['p-supplier']);
    expect(getProjectAssignablePeople(projectPeople, ['p-supplier']).map((person) => person.id)).toEqual([]);
    expect(getAssignedPeople(projectPeople, ['p-internal', 'missing-id']).map((person) => person.name)).toEqual([
      'Alex Builder',
      'missing-id',
    ]);
  });

  it('separates active-task and completed-task deactivation impacts', () => {
    expect(analyzeProjectPersonDeactivation('p-supplier', tasks)).toEqual({
      activeTasks: ['Order tiles'],
      completedTasks: [],
    });
    expect(analyzeProjectPersonDeactivation('p-internal', tasks)).toEqual({
      activeTasks: [],
      completedTasks: ['Site setup'],
    });
  });
});
