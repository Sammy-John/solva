// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { PeopleModal } from '@/components/schedule/PeopleModal';
import { useScheduleStore } from '@/store/scheduleStore';
import type { Person, Task } from '@/types/scheduling';

const person: Person = {
  id: 'person-1',
  name: 'Alex Supplier',
  userGroup: 'Suppliers',
  company: 'Alex Supply Co',
  masterPersonId: 'person-1',
  personType: 'Supplier',
  projectActive: true,
};

const task: Task = {
  id: 'task-1',
  name: 'Order framing timber',
  taskType: 'Ordering',
  sectionId: 'sec-a',
  startDate: '2026-06-01',
  endDate: '2026-06-05',
  duration: 5,
  assignedTo: ['person-1'],
  userGroup: 'Suppliers',
  status: 'Planned',
  comments: [],
};

describe('PeopleModal destructive actions', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    useScheduleStore.setState({
      excludeWeekends: true,
      tasks: [task],
      sections: [{ id: 'sec-a', name: 'Section A', order: 0 }],
      dependencies: [],
      people: [person],
      cascadeNotification: null,
      blockedTaskEdit: null,
    });
  });

  it('does not deactivate a person when removal confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(<PeopleModal open onOpenChange={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suppliers' }));
    fireEvent.click(screen.getByRole('button', { name: /Remove Alex Supplier from project/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Remove "Alex Supplier" from future project assignment? They are assigned to active tasks: Order framing timber. Existing task assignments will be kept.',
    );
    expect(useScheduleStore.getState().people.map((entry) => entry.id)).toEqual(['person-1']);
    expect(useScheduleStore.getState().people[0].projectActive).toBe(true);
    expect(useScheduleStore.getState().tasks[0].assignedTo).toEqual(['person-1']);
  });

  it('deactivates a person for future project assignment while keeping task assignments', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(<PeopleModal open onOpenChange={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suppliers' }));
    fireEvent.click(screen.getByRole('button', { name: /Remove Alex Supplier from project/i }));

    expect(useScheduleStore.getState().people[0]).toMatchObject({
      id: 'person-1',
      projectActive: false,
    });
    expect(useScheduleStore.getState().tasks[0].assignedTo).toEqual(['person-1']);
  });

  it('adds an available master-directory person to the current project', () => {
    const masterPerson: Person = {
      id: 'master-1',
      name: 'Sam Builder',
      userGroup: 'Internal',
      company: 'Solva',
      masterPersonId: 'master-1',
      projectActive: true,
    };

    render(
      <PeopleModal
        open
        onOpenChange={() => undefined}
        masterPeople={[masterPerson]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    expect(useScheduleStore.getState().people).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'master-1',
          name: 'Sam Builder',
          masterPersonId: 'master-1',
          projectActive: true,
        }),
      ]),
    );
  });

  it('shows an empty project people state when the current tab has no project people', () => {
    useScheduleStore.setState({
      excludeWeekends: true,
      tasks: [],
      sections: [],
      dependencies: [],
      people: [],
      cascadeNotification: null,
      blockedTaskEdit: null,
    });

    render(<PeopleModal open onOpenChange={() => undefined} />);

    expect(screen.getByText('No people selected for this project yet.')).toBeInTheDocument();
  });
});
