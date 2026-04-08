import {
  Task,
  Dependency,
  TaskType,
  TaskStatus,
  UrgencyLevel,
} from "@/types/scheduling";
import {
  addDays,
  differenceInCalendarDays,
  parseISO,
  format,
  isValid,
} from "date-fns";

const DATE_FMT = "yyyy-MM-dd";

const isWeekendDate = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const formatDate = (date: Date): string => format(date, DATE_FMT);

const addScheduleDays = (
  startDate: string,
  days: number,
  excludeWeekends = false,
): string | null => {
  const parsed = parseISO(startDate);
  if (!isValid(parsed)) return null;

  const safeDays = Math.max(0, Math.floor(days));
  if (!excludeWeekends) {
    return formatDate(addDays(parsed, safeDays));
  }

  if (safeDays === 0) return formatDate(parsed);

  let cursor = parsed;
  let added = 0;
  while (added < safeDays) {
    cursor = addDays(cursor, 1);
    if (!isWeekendDate(cursor)) {
      added += 1;
    }
  }

  return formatDate(cursor);
};

export function addLagDays(
  startDate: string,
  lagDays: number,
  excludeWeekends = false,
): string | null {
  return addScheduleDays(startDate, lagDays, excludeWeekends);
}

const countWorkingDaysInclusive = (startDate: Date, endDate: Date): number => {
  let cursor = startDate;
  let total = 0;

  while (cursor <= endDate) {
    if (!isWeekendDate(cursor)) {
      total += 1;
    }
    cursor = addDays(cursor, 1);
  }

  return total;
};

// --- Date helpers ---
export function recalcEndDate(
  startDate: string,
  duration: number,
  excludeWeekends = false,
): string {
  const parsedStart = parseISO(startDate);
  if (!isValid(parsedStart)) return "";

  const safeDuration = Math.max(0, Math.floor(duration));
  const inclusiveOffset = safeDuration > 0 ? safeDuration - 1 : 0;

  if (!excludeWeekends) {
    return formatDate(addDays(parsedStart, inclusiveOffset));
  }

  if (inclusiveOffset === 0) {
    if (!isWeekendDate(parsedStart)) {
      return formatDate(parsedStart);
    }

    let nextWorking = parsedStart;
    while (isWeekendDate(nextWorking)) {
      nextWorking = addDays(nextWorking, 1);
    }
    return formatDate(nextWorking);
  }

  let cursor = parsedStart;
  let counted = 0;
  while (counted < inclusiveOffset) {
    cursor = addDays(cursor, 1);
    if (!isWeekendDate(cursor)) {
      counted += 1;
    }
  }

  return formatDate(cursor);
}

export function recalcDuration(
  startDate: string,
  endDate: string,
  excludeWeekends = false,
): number {
  const parsedStart = parseISO(startDate);
  const parsedEnd = parseISO(endDate);
  if (!isValid(parsedStart) || !isValid(parsedEnd)) return 0;

  if (excludeWeekends) {
    if (parsedEnd < parsedStart) return 0;
    return countWorkingDaysInclusive(parsedStart, parsedEnd);
  }

  return Math.max(0, differenceInCalendarDays(parsedEnd, parsedStart) + 1);
}

const getDaysToEndDate = (endDate: string): number | null => {
  const parsedEnd = parseISO(endDate);
  if (!isValid(parsedEnd)) return null;
  return differenceInCalendarDays(parsedEnd, new Date());
};

export function isSupplyTaskType(taskType: TaskType): boolean {
  return (
    taskType === "Ordering" ||
    taskType === "Delivery" ||
    taskType === "Inspection"
  );
}

export function hasMissingSupplyDates(
  taskType: TaskType,
  startDate: string,
  endDate: string,
  status?: TaskStatus,
): boolean {
  if (!isSupplyTaskType(taskType)) return false;
  if (status === "Completed") return false;
  return !startDate || !endDate;
}

export function isPastDue(
  taskType: TaskType,
  endDate: string,
  status?: TaskStatus,
): boolean {
  if (!isSupplyTaskType(taskType)) return false;
  if (status === "Completed") return false;
  const daysToEnd = getDaysToEndDate(endDate);
  if (daysToEnd === null) return false;
  return daysToEnd < 0;
}

export function shouldAutoDelayTask(
  task: Pick<Task, "taskType" | "endDate" | "status">,
): boolean {
  return isPastDue(task.taskType, task.endDate, task.status);
}

// --- Urgency ---
export function getUrgency(
  taskType: TaskType,
  endDate: string,
  status?: TaskStatus,
  startDate = "",
): UrgencyLevel {
  if (!isSupplyTaskType(taskType)) return "none";
  if (status === "Completed") return "none";
  if (hasMissingSupplyDates(taskType, startDate, endDate, status)) return "red";

  const daysRemaining = getDaysToEndDate(endDate);
  if (daysRemaining === null) return "none";

  if (taskType === "Ordering") {
    if (daysRemaining > 14) return "green";
    if (daysRemaining >= 7) return "orange";
    return "red";
  }

  if (daysRemaining > 7) return "green";
  if (daysRemaining >= 3) return "orange";
  return "red";
}

export function getUrgencyTooltip(
  taskType: TaskType,
  endDate: string,
  status?: TaskStatus,
  startDate = "",
): string | null {
  const labelByTaskType: Record<TaskType, string> = {
    Internal: "Task",
    Ordering: "Order",
    Delivery: "Delivery",
    Inspection: "Inspection",
  };
  const label = labelByTaskType[taskType];

  if (hasMissingSupplyDates(taskType, startDate, endDate, status)) {
    return `${label} dates are missing - critical risk. Set start and end dates and check dependency chain.`;
  }

  const urgency = getUrgency(taskType, endDate, status, startDate);
  if (urgency === "none") return null;

  const days = getDaysToEndDate(endDate);
  if (days === null) return null;

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return `${label} is ${overdueDays} day${overdueDays !== 1 ? "s" : ""} past due - critical delay risk. Check dependency chain.`;
  }

  if (urgency === "red")
    return `${label} due in ${days} day${days !== 1 ? "s" : ""} - action required`;
  if (urgency === "orange")
    return `${label} due in ${days} days - approaching deadline`;
  return `${label} due in ${days} days`;
}

// --- Cascade ---
export interface CascadeMovementSummary {
  taskId: string;
  taskName: string;
  fromStartDate: string;
  toStartDate: string;
  constrainedByTaskId: string;
  constrainedByTaskName: string;
  dependencyId: string;
  lagDays: number;
}

export interface CascadeResult {
  updatedTasks: Task[];
  movedCount: number;
  sourceTaskName: string;
  affectedIds: string[];
  movementSummaries: CascadeMovementSummary[];
}

interface AutoShiftConstraint {
  earliestStart: string;
  dependencyId: string;
  predecessorId: string;
  predecessorName: string;
  lagDays: number;
}

const computeEarliestAutoShiftConstraint = (
  taskId: string,
  dependencies: Dependency[],
  taskMap: Map<string, Task>,
  excludeWeekends: boolean,
): AutoShiftConstraint | null => {
  let selected: AutoShiftConstraint | null = null;

  for (const dep of dependencies) {
    if (!dep.autoShift || dep.successorId !== taskId) continue;

    const predecessor = taskMap.get(dep.predecessorId);
    if (!predecessor) continue;

    const constrainedStart = addScheduleDays(
      predecessor.endDate,
      dep.lagDays,
      excludeWeekends,
    );
    if (!constrainedStart) continue;

    if (!selected || constrainedStart > selected.earliestStart) {
      selected = {
        earliestStart: constrainedStart,
        dependencyId: dep.id,
        predecessorId: dep.predecessorId,
        predecessorName: predecessor.name,
        lagDays: dep.lagDays,
      };
    }
  }

  return selected;
};

export function cascadeDependencies(
  tasks: Task[],
  dependencies: Dependency[],
  changedTaskId: string,
  excludeWeekends = false,
): CascadeResult {
  const taskMap = new Map(tasks.map((t) => [t.id, { ...t }]));
  const affectedSet = new Set<string>();
  const movementByTask = new Map<string, CascadeMovementSummary>();
  const sourceTask = taskMap.get(changedTaskId);

  const queue = [changedTaskId];
  const queued = new Set<string>(queue);
  let safetyCounter = 0;
  const safetyLimit = Math.max(
    tasks.length * Math.max(dependencies.length, 1) * 2,
    32,
  );

  while (queue.length > 0 && safetyCounter < safetyLimit) {
    safetyCounter += 1;

    const currentId = queue.shift()!;
    queued.delete(currentId);

    const current = taskMap.get(currentId);
    if (!current) continue;

    const constraint = computeEarliestAutoShiftConstraint(
      currentId,
      dependencies,
      taskMap,
      excludeWeekends,
    );

    if (constraint && current.startDate < constraint.earliestStart) {
      const originalStartDate = current.startDate;
      current.startDate = constraint.earliestStart;
      current.endDate = recalcEndDate(
        constraint.earliestStart,
        current.duration,
        excludeWeekends,
      );
      taskMap.set(current.id, current);
      affectedSet.add(current.id);

      const existingSummary = movementByTask.get(current.id);
      movementByTask.set(current.id, {
        taskId: current.id,
        taskName: current.name,
        fromStartDate: existingSummary?.fromStartDate ?? originalStartDate,
        toStartDate: constraint.earliestStart,
        constrainedByTaskId: constraint.predecessorId,
        constrainedByTaskName: constraint.predecessorName,
        dependencyId: constraint.dependencyId,
        lagDays: constraint.lagDays,
      });
    }

    const successors = dependencies.filter(
      (d) => d.predecessorId === currentId && d.autoShift,
    );

    for (const dep of successors) {
      if (!queued.has(dep.successorId)) {
        queue.push(dep.successorId);
        queued.add(dep.successorId);
      }
    }
  }

  const affectedIds = Array.from(affectedSet).sort((a, b) => a.localeCompare(b));
  const movementSummaries = Array.from(movementByTask.values()).sort((a, b) => {
    if (a.taskName !== b.taskName) return a.taskName.localeCompare(b.taskName);
    return a.taskId.localeCompare(b.taskId);
  });

  return {
    updatedTasks: Array.from(taskMap.values()),
    movedCount: affectedIds.length,
    sourceTaskName: sourceTask?.name || "",
    affectedIds,
    movementSummaries,
  };
}

// --- Dependency validation ---
export function getInvalidDependencies(
  tasks: Task[],
  dependencies: Dependency[],
  excludeWeekends = false,
): string[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const invalid: string[] = [];

  for (const dep of dependencies) {
    const pred = taskMap.get(dep.predecessorId);
    const succ = taskMap.get(dep.successorId);
    if (!pred || !succ) continue;

    const earliestStart = addScheduleDays(pred.endDate, dep.lagDays, excludeWeekends);
    if (!earliestStart) continue;

    if (succ.startDate < earliestStart && !dep.autoShift) {
      invalid.push(dep.id);
    }
  }
  return invalid;
}

export interface DependencyConflictDetail {
  dependencyId: string;
  predecessorId: string;
  predecessorName: string;
  successorId: string;
  successorName: string;
  lagDays: number;
  earliestAllowedStart: string;
  actualStart: string;
  message: string;
  suggestion: string;
}

export function getDependencyConflictDetails(
  tasks: Task[],
  dependencies: Dependency[],
  excludeWeekends = false,
): DependencyConflictDetail[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const details: DependencyConflictDetail[] = [];

  for (const dep of dependencies) {
    if (dep.autoShift) continue;

    const predecessor = taskMap.get(dep.predecessorId);
    const successor = taskMap.get(dep.successorId);
    if (!predecessor || !successor) continue;

    const earliestAllowedStart = addScheduleDays(
      predecessor.endDate,
      dep.lagDays,
      excludeWeekends,
    );
    if (!earliestAllowedStart) continue;

    if (!successor.startDate || successor.startDate >= earliestAllowedStart) {
      continue;
    }

    const lagPhrase =
      dep.lagDays > 0
        ? ` + ${dep.lagDays} day${dep.lagDays === 1 ? "" : "s"}`
        : "";

    details.push({
      dependencyId: dep.id,
      predecessorId: predecessor.id,
      predecessorName: predecessor.name,
      successorId: successor.id,
      successorName: successor.name,
      lagDays: dep.lagDays,
      earliestAllowedStart,
      actualStart: successor.startDate,
      message: `${successor.name} starts ${successor.startDate} but must be ${earliestAllowedStart} or later because ${predecessor.name} finishes first${lagPhrase}.`,
      suggestion: `Move ${successor.name} to ${earliestAllowedStart} or turn on auto-move.`,
    });
  }

  return details;
}

export function getDependencyCount(
  taskId: string,
  dependencies: Dependency[],
): number {
  return dependencies.filter(
    (d) => d.predecessorId === taskId || d.successorId === taskId,
  ).length;
}

// Get total count of tasks in the workflow chain containing this task
export function getWorkflowChainCount(
  taskId: string,
  dependencies: Dependency[],
): number {
  const visited = new Set<string>();

  const findRoots = (currentId: string): string[] => {
    const preds = dependencies.filter((d) => d.successorId === currentId);
    if (preds.length === 0) return [currentId];
    const roots: string[] = [];
    for (const p of preds) {
      if (!visited.has(p.predecessorId)) {
        visited.add(p.predecessorId);
        roots.push(...findRoots(p.predecessorId));
      }
    }
    return roots;
  };

  const roots = findRoots(taskId);
  visited.clear();

  const walk = (currentId: string) => {
    if (visited.has(currentId)) return;
    visited.add(currentId);
    const succs = dependencies.filter((d) => d.predecessorId === currentId);
    for (const s of succs) {
      walk(s.successorId);
    }
  };

  for (const root of roots) {
    walk(root);
  }

  return visited.size;
}

export function createsDependencyCycle(
  dependencies: Dependency[],
  predecessorId: string,
  successorId: string,
  ignoreDependencyId?: string,
): boolean {
  if (predecessorId === successorId) return true;

  const adjacency = new Map<string, string[]>();

  for (const dep of dependencies) {
    if (ignoreDependencyId && dep.id === ignoreDependencyId) continue;
    const outgoing = adjacency.get(dep.predecessorId) ?? [];
    outgoing.push(dep.successorId);
    adjacency.set(dep.predecessorId, outgoing);
  }

  const stack = [successorId];
  const visited = new Set<string>();

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === predecessorId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const outgoing = adjacency.get(current) ?? [];
    for (const next of outgoing) {
      if (!visited.has(next)) stack.push(next);
    }
  }

  return false;
}
