// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { PeopleModal } from '@/components/schedule/PeopleModal';
import { useScheduleStore } from '@/store/scheduleStore';
import type { Person, Task } from '@/types/scheduling';

const person: Person = {
  id: 'person-1',
  name: 'Alex Supplier',
  userGroup: 'Suppliers',
  company: 'Alex Supply Co',
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

  it('does not remove a person or assignments when delete confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(<PeopleModal open onOpenChange={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: 'Suppliers' }));
    fireEvent.click(screen.getByRole('button', { name: /Delete Alex Supplier/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Delete person "Alex Supplier"? This will remove them from any assigned tasks.',
    );
    expect(useScheduleStore.getState().people.map((entry) => entry.id)).toEqual(['person-1']);
    expect(useScheduleStore.getState().tasks[0].assignedTo).toEqual(['person-1']);
  });
});
