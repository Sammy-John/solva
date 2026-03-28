export type TaskType = "Internal" | "Ordering" | "Delivery" | "Inspection";
export type UserGroup = "Internal" | "Suppliers";
export type TaskStatus =
  | "Planned"
  | "Booked"
  | "In Progress"
  | "Completed"
  | "Delayed";

export interface Section {
  id: string;
  name: string;
  order: number;
}

export interface Person {
  id: string;
  name: string;
  userGroup: UserGroup;
  company?: string;
  trade?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface Task {
  id: string;
  name: string;
  taskType: TaskType;
  sectionId: string;
  startDate: string;
  endDate: string;
  duration: number;
  assignedTo: string[];
  userGroup: UserGroup;
  status: TaskStatus;
  comments: string[];
}

export interface Dependency {
  id: string;
  predecessorId: string;
  successorId: string;
  lagDays: number;
  autoShift: boolean;
  notes: string;
}

export type UrgencyLevel = "green" | "orange" | "red" | "none";
