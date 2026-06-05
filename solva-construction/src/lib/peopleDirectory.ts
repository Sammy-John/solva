import type { Person, PersonType, Task } from '@/types/scheduling';

export interface LegacyPeopleUpgradePlan {
  requiresUpgrade: boolean;
  peopleToCreate: Person[];
  peopleToActivate: Person[];
}

export interface DeactivationImpact {
  activeTasks: string[];
  completedTasks: string[];
}

const personTypeFromLegacyGroup = (person: Person): PersonType =>
  person.personType ?? (person.userGroup === 'Suppliers' ? 'Supplier' : 'Internal');

export const normalizeProjectPerson = (person: Person): Person => ({
  ...person,
  personType: personTypeFromLegacyGroup(person),
  masterPersonId: person.masterPersonId ?? person.id,
  projectActive: person.projectActive ?? true,
  archived: person.archived ?? false,
});

export const planLegacyPeopleUpgrade = (people: Person[]): LegacyPeopleUpgradePlan => {
  const normalized = people.map(normalizeProjectPerson);
  const requiresUpgrade = people.some(
    (person) =>
      !person.masterPersonId ||
      typeof person.projectActive !== 'boolean' ||
      !person.personType,
  );

  return {
    requiresUpgrade,
    peopleToCreate: requiresUpgrade ? normalized : [],
    peopleToActivate: requiresUpgrade
      ? normalized.filter((person) => person.projectActive !== false && !person.archived)
      : [],
  };
};

export const applyLegacyPeopleUpgrade = (people: Person[]): Person[] =>
  people.map(normalizeProjectPerson);

export const isActiveProjectPerson = (person: Person): boolean =>
  person.projectActive !== false && person.archived !== true;

export const getActiveProjectPeople = (people: Person[]): Person[] =>
  people.filter(isActiveProjectPerson);

export const getProjectAssignablePeople = (
  people: Person[],
  assignedTo: string[],
): Person[] => {
  const assigned = new Set(assignedTo);
  return getActiveProjectPeople(people).filter((person) => !assigned.has(person.id));
};

export const getAssignedPeople = (
  people: Person[],
  assignedTo: string[],
): Person[] => {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  return assignedTo.map((personId) => peopleById.get(personId) ?? {
    id: personId,
    name: personId,
    userGroup: 'Internal',
    personType: 'Other',
    projectActive: false,
    archived: true,
  });
};

export const analyzeProjectPersonDeactivation = (
  personId: string,
  tasks: Task[],
): DeactivationImpact => {
  const impactedTasks = tasks.filter((task) => task.assignedTo.includes(personId));

  return {
    activeTasks: impactedTasks
      .filter((task) => task.status !== 'Completed')
      .map((task) => task.name),
    completedTasks: impactedTasks
      .filter((task) => task.status === 'Completed')
      .map((task) => task.name),
  };
};
