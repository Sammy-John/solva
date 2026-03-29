import { useEffect, useMemo, useState } from 'react';
import { ScheduleHeader } from '@/components/schedule/ScheduleHeader';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { ScheduleHealthSummary } from '@/components/schedule/ScheduleHealthSummary';
import { LinkTasksModal } from '@/components/schedule/LinkTasksModal';
import { PeopleModal } from '@/components/schedule/PeopleModal';
import { CascadeNotification } from '@/components/schedule/CascadeNotification';
import { TaskDetailPanel } from '@/components/schedule/TaskDetailPanel';
import { DependencyChainModal } from '@/components/schedule/DependencyChainModal';
import {
  clearProjectSnapshots,
  deleteProjectSnapshot,
  listProjectSnapshots,
  loadProjectSchedule,
  loadProjectSnapshot,
  saveProjectSchedule,
  saveProjectSnapshot,
  type ScheduleSnapshotSummary,
} from '@/lib/scheduleDb';
import { useScheduleStore } from '@/store/scheduleStore';
import { TaskType, UserGroup, TaskStatus } from '@/types/scheduling';
import { shouldAutoDelayTask } from '@/lib/scheduling';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface IndexProps {
  onBackToDashboard: () => void;
  projectId: string;
  projectName: string;
  projectDescription?: string;
}

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const escapeCsvValue = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

const formatSnapshotTimestamp = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const Index = ({ onBackToDashboard, projectId, projectName, projectDescription }: IndexProps) => {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [peopleModalOpen, setPeopleModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<TaskType | 'All'>('All');
  const [filterGroup, setFilterGroup] = useState<UserGroup | 'All'>('All');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
  const [filterUrgent, setFilterUrgent] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [depChainTaskId, setDepChainTaskId] = useState<string | null>(null);
  const [isScheduleReady, setIsScheduleReady] = useState(false);
  const [scheduleLoadError, setScheduleLoadError] = useState<string | null>(null);
  const [scheduleSaveError, setScheduleSaveError] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotInfo, setSnapshotInfo] = useState<string | null>(null);
  const [snapshotModalOpen, setSnapshotModalOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<ScheduleSnapshotSummary[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');

  const tasks = useScheduleStore((state) => state.tasks);
  const sections = useScheduleStore((state) => state.sections);
  const dependencies = useScheduleStore((state) => state.dependencies);
  const people = useScheduleStore((state) => state.people);
  const setScheduleData = useScheduleStore((state) => state.setScheduleData);
  const updateTask = useScheduleStore((state) => state.updateTask);

  useEffect(() => {
    let isCancelled = false;
    setIsScheduleReady(false);
    setScheduleLoadError(null);
    setScheduleSaveError(null);
    setSnapshotError(null);
    setSnapshotInfo(null);
    setSelectedTaskId(null);
    setDepChainTaskId(null);
    setSnapshotModalOpen(false);
    setSnapshots([]);
    setSelectedSnapshotId('');
    setScheduleData([], [], [], []);

    const loadSchedule = async () => {
      let loadedSuccessfully = false;

      try {
        const schedule = await loadProjectSchedule(projectId);
        if (isCancelled) return;
        setScheduleData(
          schedule.tasks,
          schedule.sections,
          schedule.dependencies,
          schedule.people,
        );
        loadedSuccessfully = true;
      } catch (error) {
        const message = formatError(error);
        console.error('Failed to load project schedule from SQLite:', error);
        if (!isCancelled) {
          setScheduleLoadError(message);
        }
      } finally {
        if (!isCancelled) {
          setIsScheduleReady(loadedSuccessfully);
        }
      }
    };

    void loadSchedule();

    return () => {
      isCancelled = true;
    };
  }, [projectId, setScheduleData]);

  useEffect(() => {
    if (!isScheduleReady) return;

    tasks.forEach((task) => {
      if (task.status !== 'Delayed' && shouldAutoDelayTask(task)) {
        updateTask(task.id, { status: 'Delayed' });
      }
    });
  }, [isScheduleReady, tasks, updateTask]);

  useEffect(() => {
    if (!isScheduleReady) return;

    const timeout = setTimeout(() => {
      void saveProjectSchedule(projectId, tasks, sections, dependencies, people)
        .then(() => {
          setScheduleSaveError(null);
        })
        .catch((error) => {
          const message = formatError(error);
          setScheduleSaveError(message);
          console.error('Failed to save project schedule to SQLite:', error);
        });
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
  }, [isScheduleReady, projectId, tasks, sections, dependencies, people]);

  const refreshSnapshots = async () => {
    setSnapshotsLoading(true);
    try {
      const result = await listProjectSnapshots(projectId);
      setSnapshots(result);
      setSnapshotError(null);
      if (result.length > 0) {
        setSelectedSnapshotId((current) =>
          current && result.some((snapshot) => snapshot.id === current)
            ? current
            : result[0].id,
        );
      } else {
        setSelectedSnapshotId('');
      }
      return result;
    } catch (error) {
      const message = formatError(error);
      setSnapshotError(message);
      console.error('Failed to list schedule snapshots:', error);
      return [];
    } finally {
      setSnapshotsLoading(false);
    }
  };

  const restoreSnapshotById = async (snapshotId: string) => {
    const snapshot = await loadProjectSnapshot(snapshotId);
    if (snapshot.projectId !== projectId) {
      throw new Error('Selected snapshot belongs to another project.');
    }

    const shouldLoad = window.confirm(
      `Load snapshot "${snapshot.label}" from ${formatSnapshotTimestamp(snapshot.createdAt)}? This will replace the current schedule view.`,
    );

    if (!shouldLoad) {
      return;
    }

    setScheduleData(
      snapshot.tasks,
      snapshot.sections,
      snapshot.dependencies,
      snapshot.people,
    );
    setSnapshotError(null);
    setSnapshotInfo(`Loaded ${snapshot.label}`);
  };

  const handleOpenLoadSnapshot = async () => {
    setSnapshotModalOpen(true);
    await refreshSnapshots();
  };

  const handleSaveSnapshot = async () => {
    try {
      const label = `Snapshot ${new Date().toLocaleString()}`;
      const saved = await saveProjectSnapshot(
        projectId,
        label,
        tasks,
        sections,
        dependencies,
        people,
      );
      setSnapshotError(null);
      setSnapshotInfo(`Saved ${saved.label}`);
      if (snapshotModalOpen) {
        await refreshSnapshots();
      }
    } catch (error) {
      const message = formatError(error);
      setSnapshotError(message);
      setSnapshotInfo(null);
      console.error('Failed to save schedule snapshot:', error);
    }
  };

  const handleLoadSelectedSnapshot = async () => {
    if (!selectedSnapshotId) return;

    try {
      await restoreSnapshotById(selectedSnapshotId);
      setSnapshotModalOpen(false);
    } catch (error) {
      const message = formatError(error);
      setSnapshotError(message);
      console.error('Failed to load schedule snapshot:', error);
    }
  };

  const handleQuickRestoreSnapshot = async () => {
    try {
      const latest = await listProjectSnapshots(projectId);
      if (latest.length === 0) {
        setSnapshotInfo('No snapshots found to restore.');
        return;
      }

      await restoreSnapshotById(latest[0].id);
    } catch (error) {
      const message = formatError(error);
      setSnapshotError(message);
      console.error('Failed to quick restore snapshot:', error);
    }
  };

  const handleDeleteSelectedSnapshot = async () => {
    if (!selectedSnapshotId) return;

    const selected = snapshots.find((snapshot) => snapshot.id === selectedSnapshotId);
    const confirmed = window.confirm(
      `Delete snapshot "${selected?.label ?? selectedSnapshotId}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteProjectSnapshot(selectedSnapshotId);
      setSnapshotInfo(`Deleted ${selected?.label ?? 'snapshot'}`);
      await refreshSnapshots();
    } catch (error) {
      const message = formatError(error);
      setSnapshotError(message);
      console.error('Failed to delete snapshot:', error);
    }
  };

  const handleClearSnapshots = async () => {
    if (snapshots.length === 0) return;

    const confirmed = window.confirm(
      `Delete all ${snapshots.length} snapshots for this project?`,
    );
    if (!confirmed) return;

    try {
      await clearProjectSnapshots(projectId);
      setSnapshotInfo('Cleared all snapshots for this project.');
      await refreshSnapshots();
    } catch (error) {
      const message = formatError(error);
      setSnapshotError(message);
      console.error('Failed to clear snapshots:', error);
    }
  };

  const handleExportCsv = () => {
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);
    const peopleById = new Map(people.map((person) => [person.id, person.name]));

    const lines: string[] = [];
    lines.push([
      'Section',
      'Task',
      'Start',
      'Days',
      'End',
      'Assigned',
      'Status',
      'Comment',
    ].join(','));

    sortedSections.forEach((section) => {
      const sectionTasks = tasks.filter((task) => task.sectionId === section.id);

      lines.push([
        escapeCsvValue(section.name),
        escapeCsvValue('[Section]'),
        '',
        '',
        '',
        '',
        '',
        '',
      ].join(','));

      sectionTasks.forEach((task) => {
        const assignedNames = task.assignedTo
          .map((id) => peopleById.get(id) ?? id)
          .join('; ');

        const row = [
          section.name,
          task.name,
          task.startDate || '',
          String(task.duration ?? 0),
          task.endDate || '',
          assignedNames,
          task.status,
          task.comments.join(' | '),
        ].map((value) => escapeCsvValue(value));

        lines.push(row.join(','));
      });
    });

    const csv = lines.join('\r\n');
    const dateStamp = new Date().toISOString().slice(0, 10);
    const base = (projectName || 'schedule')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const filename = `${base || 'schedule'}-${dateStamp}.csv`;

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const selectedSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? null,
    [snapshots, selectedSnapshotId],
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      <ScheduleHeader
        onLinkTasks={() => setLinkModalOpen(true)}
        onOpenPeople={() => setPeopleModalOpen(true)}
        onExportCsv={handleExportCsv}
        onSaveSnapshot={handleSaveSnapshot}
        onLoadSnapshot={handleOpenLoadSnapshot}
        onQuickRestoreSnapshot={handleQuickRestoreSnapshot}
        onBackToDashboard={onBackToDashboard}
        projectName={projectName}
        projectDescription={projectDescription}
        filterType={filterType}
        setFilterType={setFilterType}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterUrgent={filterUrgent}
        setFilterUrgent={setFilterUrgent}
      />
      <ScheduleHealthSummary />
      {scheduleLoadError ? (
        <section className="px-4 md:px-6 lg:px-8 pt-4">
          <div className="status-alert status-alert-error">
            <strong>Schedule Load Failed</strong>
            <p>{scheduleLoadError}</p>
          </div>
        </section>
      ) : null}
      {scheduleSaveError ? (
        <section className="px-4 md:px-6 lg:px-8 pt-4">
          <div className="status-alert status-alert-error">
            <strong>Schedule Save Failed</strong>
            <p>{scheduleSaveError}</p>
          </div>
        </section>
      ) : null}
      {snapshotError ? (
        <section className="px-4 md:px-6 lg:px-8 pt-4">
          <div className="status-alert status-alert-error">
            <strong>Snapshot Error</strong>
            <p>{snapshotError}</p>
          </div>
        </section>
      ) : null}
      {snapshotInfo ? (
        <section className="px-4 md:px-6 lg:px-8 pt-4">
          <div className="status-alert border-emerald-200 bg-emerald-50">
            <strong className="text-emerald-800">Snapshot</strong>
            <p className="text-emerald-800">{snapshotInfo}</p>
          </div>
        </section>
      ) : null}
      <div className="flex-1 overflow-auto px-4 md:px-6 lg:px-8 pb-4">
        <ScheduleTable
          filterType={filterType}
          filterGroup={filterGroup}
          filterStatus={filterStatus}
          filterUrgent={filterUrgent}
          onSelectTask={setSelectedTaskId}
          onOpenDependencyChain={setDepChainTaskId}
        />
      </div>
      <LinkTasksModal open={linkModalOpen} onOpenChange={setLinkModalOpen} />
      <PeopleModal open={peopleModalOpen} onOpenChange={setPeopleModalOpen} />
      <CascadeNotification />
      <TaskDetailPanel taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      <DependencyChainModal
        taskId={depChainTaskId}
        open={!!depChainTaskId}
        onOpenChange={(open) => {
          if (!open) setDepChainTaskId(null);
        }}
      />

      <Dialog open={snapshotModalOpen} onOpenChange={setSnapshotModalOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Load Snapshot</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {snapshotsLoading ? (
              <p className="text-sm text-muted-foreground">Loading snapshots...</p>
            ) : snapshots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No snapshots available for this project yet.</p>
            ) : (
              <>
                <div>
                  <label htmlFor="snapshot-select" className="text-xs text-muted-foreground">
                    Snapshot
                  </label>
                  <select
                    id="snapshot-select"
                    className="mt-1 w-full border rounded-md px-2 py-2 text-sm bg-card"
                    value={selectedSnapshotId}
                    onChange={(event) => setSelectedSnapshotId(event.target.value)}
                  >
                    {snapshots.map((snapshot) => (
                      <option key={snapshot.id} value={snapshot.id}>
                        {snapshot.label} ({formatSnapshotTimestamp(snapshot.createdAt)})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedSnapshot ? (
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{selectedSnapshot.label}</span> · {formatSnapshotTimestamp(selectedSnapshot.createdAt)}
                  </p>
                ) : null}
              </>
            )}

            <div className="flex justify-between gap-2 pt-1">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleDeleteSelectedSnapshot}
                  disabled={!selectedSnapshotId || snapshotsLoading || snapshots.length === 0}
                >
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClearSnapshots}
                  disabled={snapshotsLoading || snapshots.length === 0}
                >
                  Clear All
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSnapshotModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleLoadSelectedSnapshot}
                  disabled={!selectedSnapshotId || snapshotsLoading || snapshots.length === 0}
                >
                  Load Snapshot
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
