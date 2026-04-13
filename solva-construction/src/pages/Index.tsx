import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import brownTownDefault from '@/assets/brown-town.jpg';
import { BookOpen, Download, FileSpreadsheet, Image as ImageIcon, LayoutGrid, Link2, RotateCcw, Save, Settings as SettingsIcon, Users } from 'lucide-react';

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
  const [linkModalContext, setLinkModalContext] = useState<{ taskId: string | null; role: 'predecessor' | 'successor' }>({
    taskId: null,
    role: 'predecessor',
  });
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
  const excludeWeekends = useScheduleStore((state) => state.excludeWeekends);
  const setExcludeWeekends = useScheduleStore((state) => state.setExcludeWeekends);

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sidebarImageUrl, setSidebarImageUrl] = useState<string>(brownTownDefault);
  const [sidebarObjectUrl, setSidebarObjectUrl] = useState<string | null>(null);
  const sidebarFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (sidebarObjectUrl) URL.revokeObjectURL(sidebarObjectUrl);
    };
  }, [sidebarObjectUrl]);

  const handleSidebarImageUpload = (file: File | null) => {
    if (!file) return;
    if (sidebarObjectUrl) URL.revokeObjectURL(sidebarObjectUrl);
    const nextUrl = URL.createObjectURL(file);
    setSidebarObjectUrl(nextUrl);
    setSidebarImageUrl(nextUrl);
  };

  const handleToggleWorkdaysOnly = (nextValue: boolean) => {
    const message = nextValue
      ? "Enable Workdays only? This will exclude weekends from scheduling calculations and may shift task dates."
      : "Disable Workdays only? This may change task dates.";

    if (!window.confirm(message)) return;
    setExcludeWeekends(nextValue);
  };
  const selectedSnapshot = useMemo(
    () => snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ?? null,
    [snapshots, selectedSnapshotId],
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <aside className="w-[280px] shrink-0 bg-solva-wine text-solva-porcelain flex flex-col">
        <div className="p-4 border-b border-solva-porcelain/10">
          <button
            type="button"
            className="group relative w-full overflow-hidden rounded-xl border border-solva-porcelain/15 bg-black/10"
            onClick={() => sidebarFileInputRef.current?.click()}
          >
            <img
              src={sidebarImageUrl}
              alt="Workspace"
              className="h-[160px] w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              draggable={false}
            />
            <div className="absolute inset-0 flex items-end justify-end p-2">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-black/35 px-2 py-1 text-[11px] font-semibold">
                <ImageIcon className="h-3.5 w-3.5" />
                Change
              </span>
            </div>
          </button>
          <input
            ref={sidebarFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleSidebarImageUpload(event.target.files?.[0] ?? null)}
          />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button
            type="button"
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10"
            onClick={onBackToDashboard}
          >
            <LayoutGrid className="h-4 w-4" />
            Projects
          </button>

          <div className="mt-3 pt-3 border-t border-solva-porcelain/10 space-y-1">
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10"
              onClick={handleSaveSnapshot}
            >
              <Save className="h-4 w-4" />
              Save Snapshot
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10"
              onClick={handleOpenLoadSnapshot}
            >
              <Download className="h-4 w-4" />
              Load Snapshot
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10"
              onClick={handleQuickRestoreSnapshot}
            >
              <RotateCcw className="h-4 w-4" />
              Restore Last
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10"
              onClick={handleExportCsv}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-solva-porcelain/10 space-y-1">
  <button
    type="button"
    className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10"
    onClick={() => setGuideOpen(true)}
  >
    <BookOpen className="h-4 w-4" />
    Guide
  </button>
  <button
    type="button"
    className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold hover:bg-white/10"
    onClick={() => setSettingsOpen(true)}
  >
    <SettingsIcon className="h-4 w-4" />
    Settings
  </button>
</div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="px-6 py-4 border-b border-border bg-solva-porcelain">
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="min-w-0 flex items-baseline gap-3">
      <h1 className="font-heading text-3xl text-solva-smart truncate">{projectName}</h1>
      {projectDescription ? (
        <p className="text-sm text-solva-smart/70 truncate">{projectDescription}</p>
      ) : null}
    </div>

    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="outline"
        className="h-9 border-solva-smart/25 text-solva-smart hover:bg-solva-smart/5"
        onClick={() => {
          setLinkModalContext({ taskId: null, role: 'predecessor' });
          setLinkModalOpen(true);
        }}
      >
        <Link2 className="h-4 w-4 mr-2" />
        Links
      </Button>

      <Button
        variant="outline"
        className="h-9 border-solva-smart/25 text-solva-smart hover:bg-solva-smart/5"
        onClick={() => setPeopleModalOpen(true)}
      >
        <Users className="h-4 w-4 mr-2" />
        People
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-solva-smart/70">Type</span>
        <select
          className="h-9 rounded-md border border-solva-smart/20 bg-white px-3 text-sm text-solva-smart"
          value={filterType}
          onChange={(event) => setFilterType(event.target.value as TaskType | 'All')}
        >
          <option value="All">All</option>
          <option value="Internal">Internal</option>
          <option value="Inspection">Inspection</option>
          <option value="Ordering">Ordering</option>
          <option value="Delivery">Delivery</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-solva-smart/70">Group</span>
        <select
          className="h-9 rounded-md border border-solva-smart/20 bg-white px-3 text-sm text-solva-smart"
          value={filterGroup}
          onChange={(event) => setFilterGroup(event.target.value as UserGroup | 'All')}
        >
          <option value="All">All</option>
          <option value="Internal">Internal</option>
          <option value="Suppliers">Suppliers</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-solva-smart/70">Status</span>
        <select
          className="h-9 rounded-md border border-solva-smart/20 bg-white px-3 text-sm text-solva-smart"
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value as TaskStatus | 'All')}
        >
          <option value="All">All</option>
          <option value="Planned">Planned</option>
          <option value="Booked">Booked</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Delayed">Delayed</option>
        </select>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-solva-smart/15 bg-white px-3 py-2">
        <Switch id="filter-urgent" checked={filterUrgent} onCheckedChange={setFilterUrgent} />
        <Label htmlFor="filter-urgent" className="text-sm text-solva-smart">Urgent</Label>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-solva-smart/15 bg-white px-3 py-2">
        <Switch
          id="filter-workdays"
          checked={excludeWeekends}
          onCheckedChange={handleToggleWorkdaysOnly}
        />
        <Label htmlFor="filter-workdays" className="text-sm text-solva-smart">Workdays only</Label>
      </div>
    </div>
  </div>
</header>

        <div className="px-6 pt-4">
          <ScheduleHealthSummary />
        </div>

        {scheduleLoadError ? (
          <section className="px-6 pt-4">
            <div className="status-alert status-alert-error">
              <strong>Schedule Load Failed</strong>
              <p>{scheduleLoadError}</p>
            </div>
          </section>
        ) : null}
        {scheduleSaveError ? (
          <section className="px-6 pt-4">
            <div className="status-alert status-alert-error">
              <strong>Schedule Save Failed</strong>
              <p>{scheduleSaveError}</p>
            </div>
          </section>
        ) : null}
        {snapshotError ? (
          <section className="px-6 pt-4">
            <div className="status-alert status-alert-error">
              <strong>Snapshot Error</strong>
              <p>{snapshotError}</p>
            </div>
          </section>
        ) : null}
        {snapshotInfo ? (
          <section className="px-6 pt-4">
            <div className="status-alert border-emerald-200 bg-emerald-50">
              <strong className="text-emerald-800">Snapshot</strong>
              <p className="text-emerald-800">{snapshotInfo}</p>
            </div>
          </section>
        ) : null}

        <div className="flex-1 overflow-auto px-6 pb-6 pt-4">
          <ScheduleTable
            filterType={filterType}
            filterGroup={filterGroup}
            filterStatus={filterStatus}
            filterUrgent={filterUrgent}
            onSelectTask={setSelectedTaskId}
            onOpenDependencyChain={setDepChainTaskId}
          />
        </div>
      </div>
      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent side="left" className="w-[280px] sm:max-w-none p-0 bg-solva-porcelain text-solva-smart">
          <div className="h-full flex flex-col">
            <div className="px-4 py-4 border-b border-solva-smart/10">
              <SheetHeader className="space-y-0 text-left">
                <SheetTitle className="font-label uppercase tracking-[0.14em] text-solva-smart">Guide</SheetTitle>
              </SheetHeader>
              <p className="mt-2 text-sm text-solva-smart/75">
                Quick tips for using the scheduler.
              </p>
            </div>

            <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
              <details className="rounded-lg border border-solva-smart/15 bg-white p-3">
                <summary className="cursor-pointer font-semibold">Moving tasks</summary>
                <p className="mt-2 text-sm text-solva-smart/80">
                  Click the grip in the Move column to enter Move mode, then click another task to place it before that row.
                  Click a section header to move the task to the end of that section. Press Esc to cancel.
                </p>
              </details>

              <details className="rounded-lg border border-solva-smart/15 bg-white p-3">
                <summary className="cursor-pointer font-semibold">Dependencies &amp; Waiting On</summary>
                <p className="mt-2 text-sm text-solva-smart/80">
                  Use Links to add predecessor/successor relationships. The Waiting On column shows the predecessor task names for each task (read-only).
                </p>
              </details>

              <details className="rounded-lg border border-solva-smart/15 bg-white p-3">
                <summary className="cursor-pointer font-semibold">Snapshots</summary>
                <p className="mt-2 text-sm text-solva-smart/80">
                  Save Snapshot captures the current schedule. Load Snapshot lets you pick a snapshot to load. Restore Last quickly restores the most recent snapshot.
                </p>
              </details>

              <details className="rounded-lg border border-solva-smart/15 bg-white p-3">
                <summary className="cursor-pointer font-semibold">Filters</summary>
                <p className="mt-2 text-sm text-solva-smart/80">
                  Use Type/Group/Status to narrow the table. Urgent highlights tasks needing attention.
                  Workdays only changes scheduling calculations and asks for confirmation.
                </p>
              </details>

              <details className="rounded-lg border border-solva-smart/15 bg-white p-3">
                <summary className="cursor-pointer font-semibold">Export CSV</summary>
                <p className="mt-2 text-sm text-solva-smart/80">
                  Export CSV downloads your schedule as a spreadsheet-friendly file.
                </p>
              </details>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Settings isn't active yet in this version.</p>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LinkTasksModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        initialTaskId={linkModalContext.taskId}
        initialRole={linkModalContext.role}
      />
      <PeopleModal open={peopleModalOpen} onOpenChange={setPeopleModalOpen} />
      <CascadeNotification />
      <TaskDetailPanel
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onQuickAddDependency={(taskId, role) => {
          // Block2 manual check: open task detail, click Add Dependency, verify modal opens prefilled for this task.
          setLinkModalContext({ taskId, role });
          setLinkModalOpen(true);
        }}
      />
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









