// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useScheduleStore } from '@/store/scheduleStore';
import type { Section, Task } from '@/types/scheduling';

const baseTask = (overrides: Partial<Task>): Task => ({
  id: 't1',
  name: 'Task 1',
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

describe('ScheduleTable pointer move', () => {
  beforeEach(() => {
    const sections: Section[] = [
      { id: 'sec-a', name: 'Section A', order: 0 },
      { id: 'sec-b', name: 'Section B', order: 1 },
    ];

    useScheduleStore.setState({
      excludeWeekends: true,
      sections,
      tasks: [
        baseTask({ id: 't1', name: 'Task 1', sectionId: 'sec-a' }),
        baseTask({ id: 't2', name: 'Task 2', sectionId: 'sec-a' }),
      ],
      dependencies: [],
      people: [],
      cascadeNotification: null,
    });
  });

  it('reorders tasks with pointer interaction on move grip', () => {
    render(
      <TooltipProvider>
        <ScheduleTable
          filterType="All"
          filterGroup="All"
          filterStatus="All"
          filterUrgent={false}
          onSelectTask={() => undefined}
          onOpenDependencyChain={() => undefined}
        />
      </TooltipProvider>,
    );

    const dragButtons = screen.getAllByRole('button', { name: 'Drag task' });
    const task1Row = screen.getByText('Task 1').closest('tr');

    expect(task1Row).not.toBeNull();

    fireEvent.pointerDown(dragButtons[1]);
    fireEvent.pointerEnter(task1Row!);
    fireEvent.pointerUp(task1Row!);

    const orderedIds = useScheduleStore.getState().tasks.map((task) => task.id);
    expect(orderedIds.slice(0, 2)).toEqual(['t2', 't1']);
  });
});
