// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { WorkspaceSettingsDialog } from '@/components/schedule/WorkspaceSettingsDialog';

describe('WorkspaceSettingsDialog', () => {
  it('renders active scheduling and storage settings instead of inactive placeholder copy', () => {
    render(
      <WorkspaceSettingsDialog
        open
        onOpenChange={() => undefined}
        excludeWeekends={true}
        onToggleWorkdaysOnly={vi.fn()}
      />,
    );

    expect(screen.getByText('Scheduling')).toBeInTheDocument();
    expect(screen.getByText('Storage')).toBeInTheDocument();
    expect(screen.getByText(/Installed app uses SQLite/i)).toBeInTheDocument();
    expect(screen.queryByText(/Settings isn't active/i)).not.toBeInTheDocument();
  });
});
