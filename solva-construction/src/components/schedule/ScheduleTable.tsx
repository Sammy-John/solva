import { useState } from "react";
import { useScheduleStore } from "@/store/scheduleStore";
import {
  Task,
  TaskType,
  TaskStatus,
  UserGroup,
  Section,
} from "@/types/scheduling";
import {
  getUrgency,
  getUrgencyTooltip,
  getInvalidDependencies,
  getWorkflowChainCount,
  getDependencyConflictDetails,
  hasMissingSupplyDates,
  isPastDue,
} from "@/lib/scheduling";
import {
  MessageSquare,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Workflow,
  GripVertical,
  Plus,
  Trash2,
  Hammer,
  Truck,
  ShoppingCart,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface ScheduleTableProps {
  filterType: TaskType | "All";
  filterGroup: UserGroup | "All";
  filterStatus: TaskStatus | "All";
  filterUrgent: boolean;
  onSelectTask: (id: string) => void;
  onOpenDependencyChain: (id: string) => void;
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
const urgencyClass = (level: string) => {
  if (level === "red") return "urgency-red";
  if (level === "orange") return "urgency-orange";
  if (level === "green") return "urgency-green";
  return "";
};
const taskRowClass = (taskType: TaskType) => {
  const map: Record<TaskType, string> = {
    Internal: "task-row-internal",
    Delivery: "task-row-delivery",
    Ordering: "task-row-ordering",
    Inspection: "task-row-inspection",
  };
  return map[taskType];
};
const taskTypeNameClass = (taskType: TaskType) => {
  const map: Record<TaskType, string> = {
    Internal: "text-foreground font-semibold",
    Delivery: "text-[hsl(var(--task-delivery))] font-bold",
    Ordering: "text-[hsl(var(--task-ordering))] font-bold",
    Inspection: "text-[hsl(var(--task-inspection))] font-bold",
  };
  return map[taskType];
};
const taskTypeIcon = (taskType: TaskType) => {
  const iconMap: Record<TaskType, string> = {
    Internal: "text-foreground/90",
    Delivery: "text-[hsl(var(--task-delivery))]",
    Ordering: "text-[hsl(var(--task-ordering))]",
    Inspection: "text-[hsl(var(--task-inspection))]",
  };
  const iconClass = cn("h-4 w-4 shrink-0", iconMap[taskType]);
  if (taskType === "Internal") return <Hammer className={iconClass} />;
  if (taskType === "Delivery") return <Truck className={iconClass} />;
  if (taskType === "Ordering") return <ShoppingCart className={iconClass} />;
  return <ClipboardCheck className={iconClass} />;
};
export function ScheduleTable({
  filterType,
  filterGroup,
  filterStatus,
  filterUrgent,
  onSelectTask,
  onOpenDependencyChain,
}: ScheduleTableProps) {
  const {
    tasks,
    people,
    dependencies,
    sections,
    updateTask,
    addTask,
    addSection,
    deleteSection,
    reorderTask,
    cascadeNotification,
    excludeWeekends,
  } = useScheduleStore();
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const invalidDeps = getInvalidDependencies(tasks, dependencies, excludeWeekends);
  const conflictDetails = getDependencyConflictDetails(tasks, dependencies, excludeWeekends);
  const conflictByDepId = new Map(conflictDetails.map((detail) => [detail.dependencyId, detail]));
  const filteredTasks = tasks.filter((t) => {
    if (filterType !== "All" && t.taskType !== filterType) return false;
    if (filterGroup !== "All" && t.userGroup !== filterGroup) return false;
    if (filterStatus !== "All" && t.status !== filterStatus) return false;
    if (filterUrgent) {
      const u = getUrgency(t.taskType, t.endDate, t.status, t.startDate);
      if (u !== "red") return false;
    }
    return true;
  });
  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };
  const handleInlineEdit = (
    taskId: string,
    field: string,
    value: string | number | string[],
  ) => {
    const updates: Partial<Task> = {};
    if (field === "name") updates.name = value as string;
    if (field === "startDate") updates.startDate = value as string;
    if (field === "endDate") updates.endDate = value as string;
    if (field === "duration") updates.duration = Number(value);
    if (field === "assignedTo") updates.assignedTo = value as string[];
    if (field === "userGroup") updates.userGroup = value as UserGroup;
    if (field === "status") updates.status = value as TaskStatus;
    updateTask(taskId, updates);
    setEditingCell(null);
  };
  const handleDropOnTask = (
    sourceTaskId: string | null,
    targetTaskId: string,
    targetSectionId: string,
  ) => {
    if (!sourceTaskId || sourceTaskId === targetTaskId) return;
    reorderTask(sourceTaskId, targetTaskId, targetSectionId);
  };
  const handleDropOnSection = (
    sourceTaskId: string | null,
    targetSectionId: string,
  ) => {
    if (!sourceTaskId) return;
    reorderTask(sourceTaskId, null, targetSectionId);
  };
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const sectionGroups = sortedSections.map((section) => {
    const sectionTasks = tasks.filter((task) => task.sectionId === section.id);
    const criticalCount = sectionTasks.filter(
      (task) =>
        hasMissingSupplyDates(
          task.taskType,
          task.startDate,
          task.endDate,
          task.status,
        ) || isPastDue(task.taskType, task.endDate, task.status),
    ).length;

    return {
      section,
      tasks: filteredTasks.filter((task) => task.sectionId === section.id),
      criticalCount,
    };
  });
  const affectedIds = cascadeNotification?.affectedIds || [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-sans text-[10px] leading-4" onPointerUpCapture={() => { if (!draggingTaskId) return; setDraggingTaskId(null); setDragOverTaskId(null); }}>
        <thead>
          <tr className="border-b bg-muted/60">
            <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-[50px]">
              Move
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-auto">
              Task
            </th>
            <th className="px-[0.4rem] py-2.5 text-left text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-[100px]">
              Start
            </th>
            <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-[48px]">
              Days
            </th>
            <th className="px-[0.4rem] py-2.5 text-left text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-[100px]">
              End
            </th>
            <th className="px-[0.4rem] py-2.5 text-left text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-auto">
              Assigned
            </th>
            <th className="px-[0.4rem] py-2.5 text-left text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-[132px] min-w-[132px]">
              Status
            </th>
            <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-[200px]">
              Comment
            </th>
            <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-foreground/80 uppercase tracking-[0.08em] w-[60px]">
              Chain
            </th>
          </tr>
        </thead>
        <tbody>
          {tasks.length === 0 ? (
            <tr className="border-b">
              <td
                colSpan={9}
                className="px-3 py-6 text-sm text-muted-foreground"
              >
                No tasks yet. Create your first task to begin.
              </td>
            </tr>
          ) : null}
          {sectionGroups.map(({ section, tasks: sectionTasks, criticalCount }) => {
            const isCollapsed = collapsedSections.has(section.id);
            const hasTasksInSection = tasks.some(
              (task) => task.sectionId === section.id,
            );
            return (
              <SectionBlock
                key={section.id}
                section={section}
                tasks={sectionTasks}
                isCollapsed={isCollapsed}
                hasTasksInSection={hasTasksInSection}
                criticalCount={criticalCount}
                onToggle={() => toggleSection(section.id)}
                onDelete={() => deleteSection(section.id)}
                onDropOnSection={(sourceTaskId) => handleDropOnSection(sourceTaskId, section.id)}
                people={people}
                dependencies={dependencies}
                invalidDeps={invalidDeps}
            conflictByDepId={conflictByDepId}
                affectedIds={affectedIds}
                editingCell={editingCell}
                setEditingCell={setEditingCell}
                onInlineEdit={handleInlineEdit}
                onSelectTask={onSelectTask}
                onOpenDependencyChain={onOpenDependencyChain}
                allTasks={tasks}
                draggingTaskId={draggingTaskId}
                dragOverTaskId={dragOverTaskId}
                setDraggingTaskId={setDraggingTaskId}
                setDragOverTaskId={setDragOverTaskId}
                onDropOnTask={handleDropOnTask}
              />
            );
          })}
          <NewTaskRow
            disabled={sortedSections.length === 0}
            onAdd={(name) => {
              if (sortedSections.length === 0) return;
              addTask({
                id: `t${Date.now()}`,
                name: name.trim(),
                taskType: "Internal",
                sectionId: sortedSections[sortedSections.length - 1].id,
                startDate: "",
                endDate: "",
                duration: 0,
                assignedTo: [],
                userGroup: "Internal",
                status: "Planned",
                comments: [],
              });
            }}
          />
          <NewSectionRow onAdd={(name) => addSection(name)} />
        </tbody>
      </table>
    </div>
  );
}
interface SectionBlockProps {
  section: Section;
  tasks: Task[];
  isCollapsed: boolean;
  hasTasksInSection: boolean;
  criticalCount: number;
  onToggle: () => void;
  onDelete: () => void;
  onDropOnSection: (sourceTaskId: string | null) => void;
  people: any[];
  dependencies: any[];
  invalidDeps: string[];
  conflictByDepId: Map<string, { message: string; suggestion: string }>;
  affectedIds: string[];
  editingCell: { id: string; field: string } | null;
  setEditingCell: (v: { id: string; field: string } | null) => void;
  onInlineEdit: (
    id: string,
    field: string,
    value: string | number | string[],
  ) => void;
  onSelectTask: (id: string) => void;
  onOpenDependencyChain: (id: string) => void;
  allTasks: Task[];
  draggingTaskId: string | null;
  dragOverTaskId: string | null;
  setDraggingTaskId: (id: string | null) => void;
  setDragOverTaskId: (id: string | null) => void;
  onDropOnTask: (
    sourceTaskId: string | null,
    targetTaskId: string,
    targetSectionId: string,
  ) => void;
}
function SectionBlock({
  section,
  tasks,
  isCollapsed,
  hasTasksInSection,
  criticalCount,
  onToggle,
  onDelete,
  onDropOnSection,
  people,
  dependencies,
  invalidDeps,
  conflictByDepId,
  affectedIds,
  editingCell,
  setEditingCell,
  onInlineEdit,
  onSelectTask,
  onOpenDependencyChain,
  allTasks,
  draggingTaskId,
  dragOverTaskId,
  setDraggingTaskId,
  setDragOverTaskId,
  onDropOnTask,
}: SectionBlockProps) {
  return (
    <>
      <tr
        className={cn("bg-muted/70 border-b border-border/60 cursor-pointer hover:bg-muted transition-colors", draggingTaskId && dragOverTaskId === section.id && "ring-2 ring-primary/40")}
        onClick={onToggle}
        onPointerEnter={() => {
          if (!draggingTaskId) return;
          setDragOverTaskId(section.id);
        }}
        onPointerUp={() => {
          if (!draggingTaskId) return;
          onDropOnSection(draggingTaskId);
          setDragOverTaskId(null);
          setDraggingTaskId(null);
        }}
      >
        <td colSpan={9} className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-foreground/85">
                {section.name}
              </span>
              {criticalCount > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    Critical warning in this section ({criticalCount})
                  </TooltipContent>
                </Tooltip>
              ) : null}
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-background px-1.5 text-[10px] font-semibold text-muted-foreground">
                {tasks.length}
              </span>
            </div>
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors",
                  hasTasksInSection
                    ? "text-muted-foreground/60 bg-muted cursor-not-allowed"
                    : "text-destructive hover:bg-destructive/10",
                )}
                disabled={hasTasksInSection}
                title={
                  hasTasksInSection
                    ? "Remove all tasks from this section before deleting it."
                    : "Delete section"
                }
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" /> Delete Section
              </button>
              {hasTasksInSection ? (
                <span className="text-[10px] text-muted-foreground">
                  Contains tasks
                </span>
              ) : null}
            </div>
          </div>
        </td>
      </tr>
      {!isCollapsed &&
        tasks.map((task, rowIndex) => (
          <TaskRow
            key={task.id}
            task={task}
            rowIndex={rowIndex}
            people={people}
            dependencies={dependencies}
            invalidDeps={invalidDeps}
            conflictByDepId={conflictByDepId}
            isAffected={affectedIds.includes(task.id)}
            editingCell={editingCell}
            setEditingCell={setEditingCell}
            onInlineEdit={onInlineEdit}
            onSelectTask={onSelectTask}
            onOpenDependencyChain={onOpenDependencyChain}
            allTasks={allTasks}
            draggingTaskId={draggingTaskId}
            dragOverTaskId={dragOverTaskId}
            setDraggingTaskId={setDraggingTaskId}
            setDragOverTaskId={setDragOverTaskId}
            onDropOnTask={onDropOnTask}
          />
        ))}
    </>
  );
}
interface TaskRowProps {
  task: Task;
  rowIndex: number;
  people: any[];
  dependencies: any[];
  invalidDeps: string[];
  conflictByDepId: Map<string, { message: string; suggestion: string }>;
  isAffected: boolean;
  editingCell: { id: string; field: string } | null;
  setEditingCell: (v: { id: string; field: string } | null) => void;
  onInlineEdit: (
    id: string,
    field: string,
    value: string | number | string[],
  ) => void;
  onSelectTask: (id: string) => void;
  onOpenDependencyChain: (id: string) => void;
  allTasks: Task[];
  draggingTaskId: string | null;
  dragOverTaskId: string | null;
  setDraggingTaskId: (id: string | null) => void;
  setDragOverTaskId: (id: string | null) => void;
  onDropOnTask: (
    sourceTaskId: string | null,
    targetTaskId: string,
    targetSectionId: string,
  ) => void;
}
function TaskRow({
  task,
  rowIndex,
  people,
  dependencies,
  invalidDeps,
  conflictByDepId,
  isAffected,
  editingCell,
  setEditingCell,
  onInlineEdit,
  onSelectTask,
  onOpenDependencyChain,
  allTasks,
  draggingTaskId,
  dragOverTaskId,
  setDraggingTaskId,
  setDragOverTaskId,
  onDropOnTask,
}: TaskRowProps) {
  const urgency = getUrgency(
    task.taskType,
    task.endDate,
    task.status,
    task.startDate,
  );
  const tooltip = getUrgencyTooltip(
    task.taskType,
    task.endDate,
    task.status,
    task.startDate,
  );
  const conflictingDependencies = dependencies.filter((d: any) => d.successorId === task.id && invalidDeps.includes(d.id));
  const hasWarning = conflictingDependencies.length > 0;
  const conflictTooltipLines = conflictingDependencies
    .map((dep: any) => conflictByDepId.get(dep.id))
    .filter((detail): detail is { message: string; suggestion: string } => Boolean(detail));
  const chainCount = getWorkflowChainCount(task.id, dependencies);
  const isDragOver = dragOverTaskId === task.id && draggingTaskId !== task.id;
  const assignedPeople = people.filter((p: any) =>
    task.assignedTo.includes(p.id),
  );
  const assignablePeople = people.filter(
    (p: any) => !task.assignedTo.includes(p.id),
  );
  return (
    <tr
      className={cn(
        "border-b border-border/60 cursor-pointer transition-colors group text-foreground text-[10px] leading-4",
        taskRowClass(task.taskType),
        "hover:brightness-[0.98]",
        isAffected && "cascade-highlight",
        isDragOver && "ring-2 ring-primary/40",
      )}
      onClick={() => onSelectTask(task.id)}
      onPointerEnter={() => {
        if (!draggingTaskId || draggingTaskId === task.id) return;
        setDragOverTaskId(task.id);
      }}
      onPointerLeave={() => {
        if (dragOverTaskId === task.id) setDragOverTaskId(null);
      }}
      onPointerUp={() => {
        if (!draggingTaskId || draggingTaskId === task.id) return;
        onDropOnTask(draggingTaskId, task.id, task.sectionId);
        setDragOverTaskId(null);
        setDraggingTaskId(null);
      }}
    >
      <td
        className="px-2 py-1.5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"

          className="inline-flex h-6 w-6 cursor-grab active:cursor-grabbing items-center justify-center rounded border border-border text-muted-foreground hover:bg-accent"
          aria-label="Drag task"
          title="Drag to reorder or move to another section"
          onPointerDown={(e) => {
            e.stopPropagation();
            setDraggingTaskId(task.id);
          }}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </td>
      <td className="px-[0.4rem] py-[0.2rem] w-auto max-w-none">
        <div className="flex items-center gap-2">
          {hasWarning ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertTriangle className="h-3.5 w-3.5 text-[hsl(var(--urgency-orange))] shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                {conflictTooltipLines.length > 0 ? conflictTooltipLines.map((line) => line.message).join(" ") : "Schedule conflict — dependency violated"}
              </TooltipContent>
            </Tooltip>
          ) : null}
          {taskTypeIcon(task.taskType)}
          {editingCell?.id === task.id && editingCell?.field === "name" ? (
            <input
              autoFocus
              className="bg-transparent border-b border-primary outline-none w-full text-[10px]"
              defaultValue={task.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => onInlineEdit(task.id, "name", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter")
                  onInlineEdit(task.id, "name", e.currentTarget.value);
                if (e.key === "Escape") setEditingCell(null);
              }}
            />
          ) : (
            <span
              className={cn(
                "whitespace-nowrap text-[10px] leading-4",
                taskTypeNameClass(task.taskType),
              )}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingCell({ id: task.id, field: "name" });
              }}
            >
              {task.name}
            </span>
          )}
          {task.comments.length > 0 ? (
            <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />
          ) : null}
        </div>
      </td>
      <td
        className="px-[0.4rem] py-1.5 w-[100px] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "rounded pl-0 pr-[0.4rem] py-[0.2rem] text-[10px] inline-flex justify-center",
                urgencyClass(urgency),
              )}
            >
              <input
                type="date"
                className="bg-transparent outline-none text-[10px] w-[92px] cursor-pointer"
                value={task.startDate}
                onChange={(e) =>
                  onInlineEdit(task.id, "startDate", e.target.value)
                }
              />
            </div>
          </TooltipTrigger>
          {tooltip ? <TooltipContent>{tooltip}</TooltipContent> : null}
        </Tooltip>
      </td>
      <td
        className="px-2 py-1.5 w-[48px] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {editingCell?.id === task.id && editingCell?.field === "duration" ? (
          <input
            autoFocus
            type="number"
            min={0}
            className="bg-transparent border-b border-primary outline-none w-10 text-[10px] text-center"
            defaultValue={task.duration}
            onBlur={(e) => onInlineEdit(task.id, "duration", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                onInlineEdit(task.id, "duration", e.currentTarget.value);
              if (e.key === "Escape") setEditingCell(null);
            }}
          />
        ) : (
          <span
            className="text-[10px] cursor-text text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setEditingCell({ id: task.id, field: "duration" })}
          >
            {task.duration}d
          </span>
        )}
      </td>
      <td
        className="px-[0.4rem] py-1.5 w-[100px] text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "rounded pl-0 pr-[0.4rem] py-[0.2rem] text-[10px] inline-flex justify-center",
                urgencyClass(urgency),
              )}
            >
              <input
                type="date"
                className="bg-transparent outline-none text-[10px] w-[92px] cursor-pointer"
                value={task.endDate}
                onChange={(e) =>
                  onInlineEdit(task.id, "endDate", e.target.value)
                }
              />
            </div>
          </TooltipTrigger>
          {tooltip ? <TooltipContent>{tooltip}</TooltipContent> : null}
        </Tooltip>
      </td>
      <td className="px-[0.4rem] py-1.5 w-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1 whitespace-nowrap">
          {assignedPeople.length > 0 ? (
            assignedPeople.map((p: any, idx: number) => (
              <span key={p.id} className="inline-flex items-center gap-[2px] text-[10px] text-foreground/90">
                <span>{p.name}</span>
                <button
                  type="button"
                  className="text-[10px] leading-none text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    onInlineEdit(
                      task.id,
                      "assignedTo",
                      task.assignedTo.filter((id) => id !== p.id),
                    )
                  }
                  title="Remove assignee"
                >
                  −
                </button>
                {idx < assignedPeople.length - 1 ? <span className="text-muted-foreground">,</span> : null}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-muted-foreground">Unassigned</span>
          )}

          <Select
            value="__add__"
            onValueChange={(v) => {
              if (v === "__add__") return;
              onInlineEdit(task.id, "assignedTo", [...task.assignedTo, v]);
            }}
          >
            <SelectTrigger className="h-5 w-5 min-w-[20px] border-0 bg-transparent shadow-none px-0 justify-center text-muted-foreground hover:text-foreground">
              <span className="text-[11px] leading-none">+</span>
            </SelectTrigger>
            <SelectContent>
              {assignablePeople.length > 0 ? (
                assignablePeople.map((p: any) => (
                  <SelectItem key={`add-${p.id}`} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No more people
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
      </td>
      <td className="px-[0.4rem] py-1.5" onClick={(e) => e.stopPropagation()}>
        <Select
          value={task.status}
          onValueChange={(v) => onInlineEdit(task.id, "status", v)}
        >
          <SelectTrigger className="h-6 text-[10px] border-0 bg-transparent shadow-none px-0 [&>span]:whitespace-nowrap">
            <span
              className={cn(
                "px-[0.4rem] py-[0.2rem] rounded-full font-medium text-[10px] whitespace-nowrap",
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
      </td>
      <td className="px-3 py-1.5 w-[200px] max-w-[200px]">
        <span className="text-[10px] text-muted-foreground truncate block max-w-[190px]">
          {task.comments[0] || ""}
        </span>
      </td>
      <td
        className="px-3 py-1.5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={cn(
            "inline-flex items-center gap-1 text-[10px] px-[0.4rem] py-[0.2rem] rounded-md transition-colors",
            chainCount > 0
              ? "text-primary hover:bg-primary/10"
              : "text-muted-foreground/40 hover:text-muted-foreground",
          )}
          onClick={() => onOpenDependencyChain(task.id)}
        >
          <Workflow className="h-3 w-3" />
          {chainCount > 0 ? (
            <span className="text-[10px] font-medium">{chainCount}</span>
          ) : null}
        </button>
      </td>
    </tr>
  );
}
function NewTaskRow({
  onAdd,
  disabled,
}: {
  onAdd: (name: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <tr className="border-b opacity-40 hover:opacity-70 transition-opacity">
      <td className="px-3 py-2" colSpan={9}>
        <input
          className="bg-transparent outline-none text-[12px] text-muted-foreground w-full placeholder:text-muted-foreground/60"
          placeholder={disabled ? "Create a section first..." : "+ New Task..."}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim() && !disabled) {
              onAdd(value);
              setValue("");
            }
          }}
        />
      </td>
    </tr>
  );
}
function NewSectionRow({ onAdd }: { onAdd: (name: string) => Section | null }) {
  const [value, setValue] = useState("");
  return (
    <tr className="border-b">
      <td colSpan={9} className="px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs rounded-md px-2 py-1 transition-colors text-primary hover:bg-primary/10"
            onClick={() => {
              const created = onAdd(value || "New Section");
              if (created) setValue("");
            }}
          >
            <Plus className="h-3.5 w-3.5" /> New Section
          </button>
          <input
            className="h-7 px-2 text-xs border rounded bg-card"
            placeholder="Section name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const created = onAdd(value || "New Section");
                if (created) setValue("");
              }
            }}
          />
        </div>
      </td>
    </tr>
  );
}


























