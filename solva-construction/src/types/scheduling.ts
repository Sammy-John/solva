export type TaskType = "Internal" | "Ordering" | "Delivery" | "Inspection";
export type UserGroup = "Internal" | "Suppliers";
export type PersonType =
  | "Internal"
  | "Supplier"
  | "Subcontractor"
  | "Inspector"
  | "Client"
  | "Consultant"
  | "Other";
export type TaskStatus =
  | "Planned"
  | "Booked"
  | "In Progress"
  | "Due for Review"
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
  personType?: PersonType;
  company?: string;
  trade?: string;
  phone?: string;
  email?: string;
  notes?: string;
  masterPersonId?: string;
  projectActive?: boolean;
  archived?: boolean;
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
