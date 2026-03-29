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

// --- Date helpers ---
export function recalcEndDate(startDate: string, duration: number): string {
  const parsedStart = parseISO(startDate);
  if (!isValid(parsedStart)) return "";
  const safeDuration = Math.max(0, Math.floor(duration));
  const inclusiveOffset = safeDuration > 0 ? safeDuration - 1 : 0;
  return format(addDays(parsedStart, inclusiveOffset), "yyyy-MM-dd");
}

export function recalcDuration(startDate: string, endDate: string): number {
  const parsedStart = parseISO(startDate);
  const parsedEnd = parseISO(endDate);
  if (!isValid(parsedStart) || !isValid(parsedEnd)) return 0;
  return Math.max(0, differenceInCalendarDays(parsedEnd, parsedStart) + 1);
}

const getDaysToEndDate = (endDate: string): number | null => {
  const parsedEnd = parseISO(endDate);
  if (!isValid(parsedEnd)) return null;
  return differenceInCalendarDays(parsedEnd, new Date());
};

export function isSupplyTaskType(taskType: TaskType): boolean {
  return taskType === "Ordering" || taskType === "Delivery";
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
  const label = taskType === "Ordering" ? "Order" : "Delivery";

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
export interface CascadeResult {
  updatedTasks: Task[];
  movedCount: number;
  sourceTaskName: string;
  affectedIds: string[];
}

const computeEarliestAutoShiftStart = (
  taskId: string,
  dependencies: Dependency[],
  taskMap: Map<string, Task>,
): string | null => {
  let earliestStart: string | null = null;

  for (const dep of dependencies) {
    if (!dep.autoShift || dep.successorId !== taskId) continue;

    const predecessor = taskMap.get(dep.predecessorId);
    if (!predecessor) continue;

    const parsedPredEnd = parseISO(predecessor.endDate);
    if (!isValid(parsedPredEnd)) continue;

    const constrainedStart = format(
      addDays(parsedPredEnd, dep.lagDays),
      "yyyy-MM-dd",
    );

    if (!earliestStart || constrainedStart > earliestStart) {
      earliestStart = constrainedStart;
    }
  }

  return earliestStart;
};

export function cascadeDependencies(
  tasks: Task[],
  dependencies: Dependency[],
  changedTaskId: string,
): CascadeResult {
  const taskMap = new Map(tasks.map((t) => [t.id, { ...t }]));
  const affectedSet = new Set<string>();
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

    const constrainedStart = computeEarliestAutoShiftStart(
      currentId,
      dependencies,
      taskMap,
    );

    if (constrainedStart && current.startDate < constrainedStart) {
      current.startDate = constrainedStart;
      current.endDate = recalcEndDate(constrainedStart, current.duration);
      taskMap.set(current.id, current);
      affectedSet.add(current.id);
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

  const affectedIds = Array.from(affectedSet);

  return {
    updatedTasks: Array.from(taskMap.values()),
    movedCount: affectedIds.length,
    sourceTaskName: sourceTask?.name || "",
    affectedIds,
  };
}

// --- Dependency validation ---
export function getInvalidDependencies(
  tasks: Task[],
  dependencies: Dependency[],
): string[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const invalid: string[] = [];

  for (const dep of dependencies) {
    const pred = taskMap.get(dep.predecessorId);
    const succ = taskMap.get(dep.successorId);
    if (!pred || !succ) continue;

    const parsedPredEnd = parseISO(pred.endDate);
    if (!isValid(parsedPredEnd)) continue;
    const earliestStart = format(
      addDays(parsedPredEnd, dep.lagDays),
      "yyyy-MM-dd",
    );
    if (succ.startDate < earliestStart && !dep.autoShift) {
      invalid.push(dep.id);
    }
  }
  return invalid;
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
