import { useEffect, useState } from "react";
import { TaskStatus, TaskType } from "@/types/scheduling";
import { useScheduleStore } from "@/store/scheduleStore";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Trash2, ArrowDown, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAutoMoveTag, formatDependencyRule } from "@/lib/dependencyUx";
import { getDependencyConflictDetails } from "@/lib/scheduling";

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
  onQuickAddDependency?: (taskId: string, role: "predecessor" | "successor") => void;
}

const statusClass = (s: TaskStatus) => {
  const map: Record<TaskStatus, string> = {
    Planned: "status-planned",
    Booked: "status-booked",
    "In Progress": "status-inprogress",
    Completed: "status-completed",
    Delayed: "status-delayed",
  };
  return map[s];
};

const typeClass = (t: TaskType) => {
  const map: Record<TaskType, string> = {
    Internal: "task-type-internal",
    Delivery: "task-type-delivery",
    Ordering: "task-type-ordering",
    Inspection: "task-type-inspection",
  };
  return map[t];
};

const parseGapDays = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
};

export function TaskDetailPanel({ taskId, onClose, onQuickAddDependency }: TaskDetailPanelProps) {
  const {
    tasks,
    people,
    dependencies,
    sections,
    updateTask,
    deleteTask,
    addDependency,
    updateDependency,
    removeDependency,
  } = useScheduleStore();
  const [newComment, setNewComment] = useState("");
  const [editingCommentIdx, setEditingCommentIdx] = useState<number | null>(
    null,
  );
  const [editingCommentText, setEditingCommentText] = useState("");

  const [dependsOnTaskId, setDependsOnTaskId] = useState<string>("__none__");
  const [gapDaysInput, setGapDaysInput] = useState<string>("0");
  const [autoMoveCurrentTask, setAutoMoveCurrentTask] = useState<boolean>(true);
  const [editingDependencyId, setEditingDependencyId] = useState<string | null>(null);
  const [dependencyFormError, setDependencyFormError] = useState<string>("");

  const task = tasks.find((t) => t.id === taskId);

  useEffect(() => {
    setDependsOnTaskId("__none__");
    setGapDaysInput("0");
    setAutoMoveCurrentTask(true);
    setEditingDependencyId(null);
    setDependencyFormError("");
  }, [taskId]);

  if (!task) return null;

  const assignedPeople = people.filter((p) => task.assignedTo.includes(p.id));
  const assignablePeople = people.filter(
    (p) => !task.assignedTo.includes(p.id),
  );

  const predecessorLinks = dependencies
    .filter((d) => d.successorId === task.id)
    .map((d) => ({
      dep: d,
      task: tasks.find((t) => t.id === d.predecessorId),
    }));

  const successorLinks = dependencies
    .filter((d) => d.predecessorId === task.id)
    .map((d) => ({ dep: d, task: tasks.find((t) => t.id === d.successorId) }));

  const dependencyTaskOptions = tasks
    .filter((t) => t.id !== task.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const conflictByDependencyId = new Map(
    getDependencyConflictDetails(tasks, dependencies).map((detail) => [
      detail.dependencyId,
      detail,
    ]),
  );

  const addComment = () => {
    if (!newComment.trim()) return;
    updateTask(task.id, { comments: [...task.comments, newComment.trim()] });
    setNewComment("");
  };

  const saveEditedComment = (idx: number) => {
    if (!editingCommentText.trim()) return;
    const updated = [...task.comments];
    updated[idx] = editingCommentText.trim();
    updateTask(task.id, { comments: updated });
    setEditingCommentIdx(null);
    setEditingCommentText("");
  };

  const deleteComment = (idx: number) => {
    const updated = task.comments.filter((_, i) => i !== idx);
    updateTask(task.id, { comments: updated });
  };

  const resetDependencyForm = () => {
    setDependsOnTaskId("__none__");
    setGapDaysInput("0");
    setAutoMoveCurrentTask(true);
    setEditingDependencyId(null);
    setDependencyFormError("");
  };

  const handleSaveDependency = () => {
    setDependencyFormError("");

    if (dependsOnTaskId === "__none__") {
      setDependencyFormError("Choose a task this one depends on.");
      return;
    }

    const lagDays = parseGapDays(gapDaysInput);

    if (editingDependencyId) {
      const result = updateDependency(editingDependencyId, {
        predecessorId: dependsOnTaskId,
        successorId: task.id,
        lagDays,
        autoShift: autoMoveCurrentTask,
        notes: "",
      });

      if (!result.ok) {
        setDependencyFormError(result.error ?? "Could not save dependency.");
        return;
      }

      resetDependencyForm();
      return;
    }

    const result = addDependency({
      id: `d${Date.now()}`,
      predecessorId: dependsOnTaskId,
      successorId: task.id,
      lagDays,
      autoShift: autoMoveCurrentTask,
      notes: "",
    });

    if (!result.ok) {
      setDependencyFormError(result.error ?? "Could not add dependency.");
      return;
    }

    resetDependencyForm();
  };

  const loadDependencyIntoForm = (dependencyId: string) => {
    const dependency = predecessorLinks.find((item) => item.dep.id === dependencyId)?.dep;
    if (!dependency) return;

    setEditingDependencyId(dependency.id);
    setDependsOnTaskId(dependency.predecessorId);
    setGapDaysInput(String(dependency.lagDays));
    setAutoMoveCurrentTask(dependency.autoShift);
    setDependencyFormError("");
  };

  return (
    <Sheet
      open={!!taskId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent className="w-[420px] sm:w-[460px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base font-semibold pr-6">
            <input
              className="bg-transparent outline-none w-full text-base font-semibold border-b border-transparent hover:border-muted-foreground/30 focus:border-primary transition-colors"
              value={task.name}
              onChange={(e) => updateTask(task.id, { name: e.target.value })}
            />
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-[10px] text-muted-foreground block mb-1">
                Type
              </span>
              <Select
                value={task.taskType}
                onValueChange={(v) =>
                  updateTask(task.id, { taskType: v as TaskType })
                }
              >
                <SelectTrigger className="h-7 text-xs w-[110px]">
                  <span
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded-full font-medium",
                      typeClass(task.taskType),
                    )}
                  >
                    {task.taskType}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "Internal",
                      "Delivery",
                      "Ordering",
                      "Inspection",
                    ] as TaskType[]
                  ).map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block mb-1">
                Status
              </span>
              <Select
                value={task.status}
                onValueChange={(v) =>
                  updateTask(task.id, { status: v as TaskStatus })
                }
              >
                <SelectTrigger className="h-7 text-xs w-[120px]">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full font-medium text-xs",
                      statusClass(task.status),
                    )}
                  >
                    {task.status}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      "Planned",
                      "Booked",
                      "In Progress",
                      "Completed",
                      "Delayed",
                    ] as TaskStatus[]
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Section</span>
              <Select
                value={task.sectionId}
                onValueChange={(v) => updateTask(task.id, { sectionId: v })}
                disabled={sections.length === 0}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue placeholder="No sections" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">
                Duration (days)
              </span>
              <input
                type="number"
                min={0}
                className="mt-1 w-full border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card h-8"
                value={task.duration}
                onChange={(e) =>
                  updateTask(task.id, { duration: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Start Date</span>
              <input
                type="date"
                className="mt-1 w-full border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card h-8"
                value={task.startDate}
                onChange={(e) =>
                  updateTask(task.id, { startDate: e.target.value })
                }
              />
            </div>
            <div>
              <span className="text-xs text-muted-foreground">End Date</span>
              <input
                type="date"
                className="mt-1 w-full border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card h-8"
                value={task.endDate}
                onChange={(e) =>
                  updateTask(task.id, { endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <span className="text-xs text-muted-foreground">Assigned To</span>
            <div className="mt-1 space-y-2">
              {assignedPeople.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {assignedPeople.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px]"
                      onClick={() =>
                        updateTask(task.id, {
                          assignedTo: task.assignedTo.filter(
                            (assignedId) => assignedId !== person.id,
                          ),
                        })
                      }
                    >
                      {person.name}
                      <span className="text-muted-foreground">×</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Unassigned</p>
              )}

              <Select
                value="__add__"
                onValueChange={(v) => {
                  if (v === "__add__") return;
                  updateTask(task.id, { assignedTo: [...task.assignedTo, v] });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Add assignee" />
                </SelectTrigger>
                <SelectContent>
                  {assignablePeople.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">
                      All people already assigned
                    </div>
                  ) : (
                    assignablePeople.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name}
                        {person.trade ? ` — ${person.trade}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {assignedPeople.length > 0 ? (
            <div className="bg-accent/50 rounded-lg p-3 space-y-2">
              {assignedPeople.map((person) => (
                <div
                  key={person.id}
                  className="space-y-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                >
                  <p className="text-sm font-medium">{person.name}</p>
                  {person.company ? (
                    <p className="text-xs text-muted-foreground">
                      {person.company}
                    </p>
                  ) : null}
                  {person.trade ? (
                    <p className="text-xs text-muted-foreground">
                      {person.trade}
                    </p>
                  ) : null}
                  {person.phone ? (
                    <p className="text-xs text-muted-foreground">
                      📞 {person.phone}
                    </p>
                  ) : null}
                  {person.email ? (
                    <p className="text-xs text-muted-foreground">
                      ✉ {person.email}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dependencies
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onQuickAddDependency?.(task.id, "successor")}
              >
                Advanced
              </Button>
            </div>

            <div className="rounded-md border bg-muted/20 p-3 space-y-2">
              <div>
                <LabelText text="Depends on (must finish first)" />
                <Select
                  value={dependsOnTaskId}
                  onValueChange={(value) => {
                    setDependsOnTaskId(value);
                    setDependencyFormError("");
                  }}
                >
                  <SelectTrigger className="mt-1 h-8 text-xs">
                    <SelectValue placeholder="Choose task" />
                  </SelectTrigger>
                  <SelectContent>
                    {dependencyTaskOptions.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        No other tasks available
                      </div>
                    ) : (
                      dependencyTaskOptions.map((optionTask) => (
                        <SelectItem key={optionTask.id} value={optionTask.id}>
                          {optionTask.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <LabelText text="Gap days" />
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card h-8"
                    value={gapDaysInput}
                    onChange={(e) => {
                      setGapDaysInput(e.target.value);
                      setDependencyFormError("");
                    }}
                  />
                </div>
                <div>
                  <LabelText text="Move this task if needed" />
                  <Select
                    value={autoMoveCurrentTask ? "yes" : "no"}
                    onValueChange={(value) => setAutoMoveCurrentTask(value === "yes")}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {dependencyFormError ? (
                <p className="text-xs text-destructive">{dependencyFormError}</p>
              ) : null}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleSaveDependency}
                >
                  {editingDependencyId ? "Save" : "Add Dependency"}
                </Button>
                {editingDependencyId ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={resetDependencyForm}
                  >
                    Cancel Edit
                  </Button>
                ) : null}
              </div>
            </div>

                                    {predecessorLinks.length > 0 ? (
              <div className="space-y-1">
                <LabelText text="This task depends on" />
                {predecessorLinks.map(({ dep, task: predTask }) => {
                  const conflict = conflictByDependencyId.get(dep.id);
                  return (
                    <div
                      key={dep.id}
                      className="rounded border bg-card px-2.5 py-2 text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="text-foreground">
                          {task.name} starts after <span className="font-medium">{predTask?.name ?? "Unknown task"}</span>
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          {formatDependencyRule(dep.lagDays)} {formatAutoMoveTag(dep.autoShift)}.
                        </p>
                        {conflict ? (
                          <p className="text-[11px] text-amber-700 mt-1">
                            {conflict.message} {conflict.suggestion}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          className="text-muted-foreground hover:text-primary p-0.5"
                          onClick={() => loadDependencyIntoForm(dep.id)}
                          title="Edit"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive p-0.5"
                          onClick={() => removeDependency(dep.id)}
                          title="Remove"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No dependencies yet for this task.</p>
            )}

            {successorLinks.length > 0 ? (
              <div className="space-y-1">
                <LabelText text="Tasks waiting on this task" />
                {successorLinks.map(({ dep, task: succTask }) => (
                  <div key={dep.id} className="rounded border bg-card px-2.5 py-2 text-xs">
                    <p className="text-foreground">
                      <span className="font-medium">{succTask?.name ?? "Unknown task"}</span> starts after {task.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5">
                      {formatDependencyRule(dep.lagDays)} {formatAutoMoveTag(dep.autoShift)}.
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <Separator />

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes & Comments
            </span>
            {task.comments.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">
                No notes yet.
              </p>
            ) : null}
            <ul className="mt-2 space-y-1.5">
              {task.comments.map((c, i) => (
                <li
                  key={i}
                  className="text-xs bg-accent/50 rounded px-3 py-2 group/comment flex items-start justify-between gap-2"
                >
                  {editingCommentIdx === i ? (
                    <div className="flex-1 flex gap-1">
                      <input
                        autoFocus
                        className="flex-1 bg-card border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
                        value={editingCommentText}
                        onChange={(e) => setEditingCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEditedComment(i);
                          if (e.key === "Escape") setEditingCommentIdx(null);
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2"
                        onClick={() => saveEditedComment(i)}
                      >
                        Save
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1">{c}</span>
                      <div className="flex gap-0.5 opacity-0 group-hover/comment:opacity-100 transition-opacity shrink-0">
                        <button
                          className="text-muted-foreground hover:text-primary p-0.5"
                          onClick={() => {
                            setEditingCommentIdx(i);
                            setEditingCommentText(c);
                          }}
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive p-0.5"
                          onClick={() => deleteComment(i)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-2">
              <input
                className="flex-1 bg-accent/30 border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                placeholder="Add a note..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addComment();
                }}
              />
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={addComment}
              >
                Add
              </Button>
            </div>
          </div>

          <Separator />

          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
            onClick={() => {
              deleteTask(task.id);
              onClose();
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete Task
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LabelText({ text }: { text: string }) {
  return <span className="text-[10px] text-muted-foreground">{text}</span>;
}




