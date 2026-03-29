import { useEffect, useMemo, useRef, useState } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { addDays, format, isValid, parseISO } from 'date-fns';
import {
  ArrowRightLeft,
  Link2,
  Pencil,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react';
import { createsDependencyCycle } from '@/lib/scheduling';
import {
  dependencyUxLabels,
  formatAutoMoveSummary,
  formatAutoMoveTag,
  formatDependencyRule,
} from '@/lib/dependencyUx';

interface LinkTasksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTaskId?: string | null;
  initialRole?: 'predecessor' | 'successor';
}

const parseLagDays = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

const computeEarliestStartFromPredecessor = (
  predecessorEndDate: string,
  lagDays: number,
): string | null => {
  const parsed = parseISO(predecessorEndDate);
  if (!isValid(parsed)) return null;
  return format(addDays(parsed, lagDays), 'yyyy-MM-dd');
};

export function LinkTasksModal({
  open,
  onOpenChange,
  initialTaskId = null,
  initialRole = 'predecessor',
}: LinkTasksModalProps) {
  const {
    tasks,
    sections,
    dependencies,
    addDependency,
    updateDependency,
    removeDependency,
  } = useScheduleStore();

  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const [lagDaysInput, setLagDaysInput] = useState('0');
  const [autoShift, setAutoShift] = useState(true);
  const [notes, setNotes] = useState('');
  const [predecessorQuery, setPredecessorQuery] = useState('');
  const [successorQuery, setSuccessorQuery] = useState('');
  const [linksQuery, setLinksQuery] = useState('');
  const [editingDependencyId, setEditingDependencyId] = useState<string | null>(
    null,
  );
  const [formError, setFormError] = useState<string>('');

  const predecessorQueryRef = useRef<HTMLInputElement | null>(null);
  const successorQueryRef = useRef<HTMLInputElement | null>(null);

  const lagDays = parseLagDays(lagDaysInput);

  const sectionById = useMemo(
    () => new Map(sections.map((section) => [section.id, section])),
    [sections],
  );

  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  const predecessorTask = predecessorId ? taskById.get(predecessorId) : undefined;
  const successorTask = successorId ? taskById.get(successorId) : undefined;

  const normalizedPredQuery = predecessorQuery.trim().toLowerCase();
  const normalizedSuccQuery = successorQuery.trim().toLowerCase();
  const normalizedLinksQuery = linksQuery.trim().toLowerCase();

  const predecessorOptions = tasks.filter((task) =>
    normalizedPredQuery
      ? task.name.toLowerCase().includes(normalizedPredQuery)
      : true,
  );

  const successorOptions = tasks.filter((task) => {
    if (task.id === predecessorId) return false;
    return normalizedSuccQuery
      ? task.name.toLowerCase().includes(normalizedSuccQuery)
      : true;
  });

  const isEditing = editingDependencyId !== null;

  const isSelfLink = predecessorId !== '' && predecessorId === successorId;
  const isDuplicateLink = dependencies.some(
    (dep) =>
      dep.id !== editingDependencyId &&
      dep.predecessorId === predecessorId &&
      dep.successorId === successorId,
  );
  const createsCycle =
    predecessorId !== '' &&
    successorId !== '' &&
    createsDependencyCycle(
      dependencies,
      predecessorId,
      successorId,
      editingDependencyId ?? undefined,
    );

  const canCreate =
    predecessorId !== '' &&
    successorId !== '' &&
    !isSelfLink &&
    !isDuplicateLink &&
    !createsCycle;

  const sortedDependencies = [...dependencies].sort((a, b) => {
    const aPred = taskById.get(a.predecessorId)?.name ?? '';
    const bPred = taskById.get(b.predecessorId)?.name ?? '';
    if (aPred !== bPred) return aPred.localeCompare(bPred);
    const aSucc = taskById.get(a.successorId)?.name ?? '';
    const bSucc = taskById.get(b.successorId)?.name ?? '';
    return aSucc.localeCompare(bSucc);
  });

  const filteredDependencies = sortedDependencies.filter((dep) => {
    if (!normalizedLinksQuery) return true;
    const predecessorName =
      taskById.get(dep.predecessorId)?.name.toLowerCase() ?? '';
    const successorName = taskById.get(dep.successorId)?.name.toLowerCase() ?? '';
    const notesValue = dep.notes.toLowerCase();
    return (
      predecessorName.includes(normalizedLinksQuery) ||
      successorName.includes(normalizedLinksQuery) ||
      notesValue.includes(normalizedLinksQuery)
    );
  });

  const earliestAllowedStart = predecessorTask
    ? computeEarliestStartFromPredecessor(predecessorTask.endDate, lagDays)
    : null;
  const successorStartsTooEarly =
    !!successorTask?.startDate &&
    !!earliestAllowedStart &&
    successorTask.startDate < earliestAllowedStart;

  const clearForm = () => {
    setPredecessorId('');
    setSuccessorId('');
    setLagDaysInput('0');
    setAutoShift(true);
    setNotes('');
    setPredecessorQuery('');
    setSuccessorQuery('');
    setEditingDependencyId(null);
    setFormError('');
  };

  useEffect(() => {
    if (!open || !initialTaskId) return;

    clearForm();

    if (initialRole === 'successor') {
      setSuccessorId(initialTaskId);
      setTimeout(() => predecessorQueryRef.current?.focus(), 0);
      return;
    }

    setPredecessorId(initialTaskId);
    setTimeout(() => successorQueryRef.current?.focus(), 0);
  }, [open, initialRole, initialTaskId]);

  const loadDependencyForEdit = (depId: string) => {
    const dep = dependencies.find((item) => item.id === depId);
    if (!dep) return;

    setEditingDependencyId(dep.id);
    setPredecessorId(dep.predecessorId);
    setSuccessorId(dep.successorId);
    setLagDaysInput(String(dep.lagDays));
    setAutoShift(dep.autoShift);
    setNotes(dep.notes ?? '');
    setFormError('');
  };

  const handleSwap = () => {
    if (!predecessorId || !successorId) return;
    setPredecessorId(successorId);
    setSuccessorId(predecessorId);
    setFormError('');
  };

  const handleSave = () => {
    setFormError('');

    if (!canCreate) {
      if (isSelfLink) {
        setFormError('A task cannot depend on itself.');
      } else if (isDuplicateLink) {
        setFormError('This link already exists.');
      } else if (createsCycle) {
        setFormError('This link would create a circular dependency.');
      } else {
        setFormError('Select both tasks before saving the link.');
      }
      return;
    }

    if (isEditing && editingDependencyId) {
      const result = updateDependency(editingDependencyId, {
        predecessorId,
        successorId,
        lagDays,
        autoShift,
        notes: notes.trim(),
      });

      if (!result.ok) {
        setFormError(result.error ?? 'Unable to update link.');
        return;
      }

      clearForm();
      return;
    }

    const result = addDependency({
      id: `d${Date.now()}`,
      predecessorId,
      successorId,
      lagDays,
      autoShift,
      notes: notes.trim(),
    });

    if (!result.ok) {
      setFormError(result.error ?? 'Unable to create link.');
      return;
    }

    setSuccessorId('');
    setLagDaysInput('0');
    setNotes('');
    setSuccessorQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px] max-h-[84vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold tracking-wide flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Task Links
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-1">
          <div className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">
                  {isEditing ? 'Edit Dependency' : 'Create Dependency'}
                </Label>
                <div className="flex items-center gap-1.5">
                  {isEditing ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={clearForm}
                    >
                      Cancel Edit
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={clearForm}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">{dependencyUxLabels.firstTask}</Label>
                <div className="relative mt-1">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                  <input
                    ref={predecessorQueryRef}
                    className="w-full border rounded-md pl-7 pr-2 py-1.5 text-xs bg-card outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Search tasks"
                    value={predecessorQuery}
                    onChange={(e) => setPredecessorQuery(e.target.value)}
                  />
                </div>
                <Select
                  value={predecessorId}
                  onValueChange={(value) => {
                    setPredecessorId(value);
                    setFormError('');
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose first task" />
                  </SelectTrigger>
                  <SelectContent>
                    {predecessorOptions.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">No matching tasks</div>
                    ) : (
                      predecessorOptions.map((task) => {
                        const section = sectionById.get(task.sectionId);
                        return (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                            {section ? ` (${section.name})` : ''}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">{dependencyUxLabels.followingTask}</Label>
                <div className="relative mt-1">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
                  <input
                    ref={successorQueryRef}
                    className="w-full border rounded-md pl-7 pr-2 py-1.5 text-xs bg-card outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Search tasks"
                    value={successorQuery}
                    onChange={(e) => setSuccessorQuery(e.target.value)}
                  />
                </div>
                <Select
                  value={successorId}
                  onValueChange={(value) => {
                    setSuccessorId(value);
                    setFormError('');
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose following task" />
                  </SelectTrigger>
                  <SelectContent>
                    {successorOptions.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">No matching tasks</div>
                    ) : (
                      successorOptions.map((task) => {
                        const section = sectionById.get(task.sectionId);
                        return (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                            {section ? ` (${section.name})` : ''}
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleSwap}
                  disabled={!predecessorId || !successorId}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                  Swap direction
                </Button>
                <span className="text-xs text-muted-foreground">Rule: finish then start</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{dependencyUxLabels.gapDays}</Label>
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary bg-card"
                    value={lagDaysInput}
                    onChange={(e) => {
                      setLagDaysInput(e.target.value);
                      setFormError('');
                    }}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2">
                    <Switch checked={autoShift} onCheckedChange={setAutoShift} />
                    <Label className="text-xs">Auto-move following task</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <input
                  className="mt-1 w-full border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary bg-card"
                  placeholder="Optional note about this dependency"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="rounded-md border bg-card px-2.5 py-2 text-xs space-y-1">
                <div>
                  <span className="text-muted-foreground">Preview:</span>{' '}
                  <span className="font-medium">{predecessorTask?.name ?? 'Select first task'}</span>
                  {' -> '}
                  <span className="font-medium">{successorTask?.name ?? 'Select following task'}</span>
                  {lagDays > 0 ? ` (+${lagDays}d)` : ''}
                </div>
                <div className="text-muted-foreground">
                  {formatAutoMoveSummary(autoShift)}
                </div>
                {earliestAllowedStart ? (
                  <div className="text-muted-foreground">
                    Earliest allowed start for following task: <span className="font-medium text-foreground">{earliestAllowedStart}</span>
                  </div>
                ) : null}
                {successorStartsTooEarly ? (
                  <div className="text-[11px] text-amber-700 flex items-center gap-1">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    {autoShift
                      ? 'Saving will move the following task to meet this rule.'
                      : 'This creates a schedule conflict warning.'}
                  </div>
                ) : null}
              </div>

              {(isSelfLink || isDuplicateLink || createsCycle || formError) && (
                <p className="text-xs text-destructive">{formError || (isSelfLink
                    ? 'A task cannot depend on itself.'
                    : isDuplicateLink
                      ? 'This link already exists.'
                      : 'This link would create a circular dependency.')}</p>
              )}

              <Button className="w-full" onClick={handleSave} disabled={!canCreate && !isEditing}>
                {isEditing ? 'Save Dependency' : 'Create Dependency'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">
                Existing Dependencies
              </h4>
              <span className="text-xs text-muted-foreground">{dependencies.length}</span>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2 top-2.5 text-muted-foreground" />
              <input
                className="w-full border rounded-md pl-7 pr-2 py-1.5 text-xs bg-card outline-none focus:ring-1 focus:ring-primary"
                placeholder="Find dependencies"
                value={linksQuery}
                onChange={(e) => setLinksQuery(e.target.value)}
              />
            </div>

            {dependencies.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                No dependencies yet. Create one from the form.
              </div>
            ) : filteredDependencies.length === 0 ? (
              <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                No dependencies match your search.
              </div>
            ) : (
              <div className="rounded-md border max-h-[460px] overflow-y-auto divide-y">
                {filteredDependencies.map((dep) => {
                  const predecessor = taskById.get(dep.predecessorId);
                  const successor = taskById.get(dep.successorId);
                  const predecessorSection = predecessor
                    ? sectionById.get(predecessor.sectionId)
                    : undefined;
                  const successorSection = successor
                    ? sectionById.get(successor.sectionId)
                    : undefined;
                  const isRowEditing = editingDependencyId === dep.id;

                  return (
                    <div key={dep.id} className="px-3 py-2.5 space-y-1.5 bg-card/70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-5 break-words">
                            {predecessor?.name ?? 'Unknown'}
                            <span className="text-muted-foreground mx-1">{'->'}</span>
                            {successor?.name ?? 'Unknown'}
                            {isRowEditing ? (
                              <span className="ml-2 text-[10px] rounded bg-primary/10 px-1.5 py-0.5 text-primary align-middle">
                                Editing
                              </span>
                            ) : null}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {predecessorSection ? (
                              <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                From: {predecessorSection.name}
                              </span>
                            ) : null}
                            {successorSection ? (
                              <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                                To: {successorSection.name}
                              </span>
                            ) : null}
                            <span className="text-[10px] rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                              {formatDependencyRule(dep.lagDays)}
                            </span>
                            <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                              {formatAutoMoveTag(dep.autoShift)}
                            </span>
                          </div>
                          {dep.notes ? (
                            <p className="text-xs text-muted-foreground mt-1 break-words">{dep.notes}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => loadDependencyForEdit(dep.id)}
                            title="Edit dependency"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive h-7 px-2"
                            onClick={() => {
                              removeDependency(dep.id);
                              if (editingDependencyId === dep.id) {
                                clearForm();
                              }
                            }}
                            title="Remove dependency"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

