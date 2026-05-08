// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { TaskDetailPanel } from '@/components/schedule/TaskDetailPanel';
import { useScheduleStore } from '@/store/scheduleStore';
import type { Section, Task } from '@/types/scheduling';

const task = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  name: 'Frame inspection',
  taskType: 'Inspection',
  sectionId: 'sec-a',
  startDate: '2026-06-10',
  endDate: '2026-06-10',
  duration: 0,
  assignedTo: [],
  userGroup: 'Internal',
  status: 'Planned',
  comments: [],
  ...overrides,
});

describe('TaskDetailPanel destructive actions', () => {
  beforeEach(() => {
    const sections: Section[] = [{ id: 'sec-a', name: 'Section A', order: 0 }];
    useScheduleStore.setState({
      excludeWeekends: true,
      tasks: [task()],
      sections,
      dependencies: [],
      people: [],
      cascadeNotification: null,
      blockedTaskEdit: null,
    });
  });

  it('does not delete the task when delete confirmation is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false);

    render(<TaskDetailPanel taskId="task-1" onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Delete Task/i }));

    expect(window.confirm).toHaveBeenCalledWith('Delete task "Frame inspection"? This cannot be undone.');
    expect(useScheduleStore.getState().tasks.map((entry) => entry.id)).toEqual(['task-1']);
  });
});
