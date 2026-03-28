import { useState } from "react";
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

interface TaskDetailPanelProps {
  taskId: string | null;
  onClose: () => void;
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

export function TaskDetailPanel({ taskId, onClose }: TaskDetailPanelProps) {
  const { tasks, people, dependencies, sections, updateTask, deleteTask } =
    useScheduleStore();
  const [newComment, setNewComment] = useState("");
  const [editingCommentIdx, setEditingCommentIdx] = useState<number | null>(
    null,
  );
  const [editingCommentText, setEditingCommentText] = useState("");
  const task = tasks.find((t) => t.id === taskId);

  if (!task) return null;

  const assignedPeople = people.filter((p) => task.assignedTo.includes(p.id));
  const assignablePeople = people.filter(
    (p) => !task.assignedTo.includes(p.id),
  );

  const predecessors = dependencies
    .filter((d) => d.successorId === task.id)
    .map((d) => ({
      dep: d,
      task: tasks.find((t) => t.id === d.predecessorId),
    }));

  const successors = dependencies
    .filter((d) => d.predecessorId === task.id)
    .map((d) => ({ dep: d, task: tasks.find((t) => t.id === d.successorId) }));

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

          {predecessors.length > 0 || successors.length > 0 ? (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dependency Chain
              </span>
              <div className="mt-2 space-y-1">
                {predecessors.map(({ dep, task: predTask }) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="text-foreground font-medium">
                      {predTask?.name || "Unknown"}
                    </span>
                    {dep.lagDays > 0 ? (
                      <span className="text-[10px]">(+{dep.lagDays}d)</span>
                    ) : null}
                  </div>
                ))}
                {predecessors.length > 0 ? (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                ) : null}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-primary">
                    {task.name}
                  </span>
                </div>
                {successors.length > 0 ? (
                  <div className="flex justify-center py-0.5">
                    <ArrowDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                ) : null}
                {successors.map(({ dep, task: succTask }) => (
                  <div
                    key={dep.id}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <span className="text-foreground font-medium">
                      {succTask?.name || "Unknown"}
                    </span>
                    {dep.lagDays > 0 ? (
                      <span className="text-[10px]">(+{dep.lagDays}d)</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
