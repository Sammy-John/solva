import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { Dependency, Person, Section, Task } from '@/types/scheduling';
import { shouldUseBrowserFallback } from '@/lib/storageRuntime';

type ScheduleRecord = {
  project_id: string;
  tasks_json: string;
  sections_json: string;
  dependencies_json: string;
  people_json: string;
  updated_at: string;
};

type SnapshotRecord = {
  id: string;
  project_id: string;
  label: string;
  tasks_json: string;
  sections_json: string;
  dependencies_json: string;
  people_json: string;
  created_at: string;
};

type FallbackSchedule = {
  tasks: Task[];
  sections: Section[];
  dependencies: Dependency[];
  people: Person[];
};

type FallbackSnapshot = {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  tasks: Task[];
  sections: Section[];
  dependencies: Dependency[];
  people: Person[];
};

export type ScheduleSnapshotSummary = {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
};

export type ScheduleSnapshotPayload = {
  id: string;
  projectId: string;
  label: string;
  createdAt: string;
  tasks: Task[];
  sections: Section[];
  dependencies: Dependency[];
  people: Person[];
};

const SCHEDULE_FALLBACK_KEY = 'construction-planner-desktop.schedule.fallback.v1';
const SNAPSHOT_FALLBACK_KEY = 'construction-planner-desktop.snapshot.fallback.v1';

const SAMPLE_PEOPLE_BY_ID: Record<string, string> = {
  p1: 'Mike Torres',
  p2: 'Sarah Chen',
  p3: 'BuildCo Supply',
  p4: 'Dave Miller',
  p5: 'Spark Electric',
  p6: 'PipePro Plumbing',
  p7: 'ScaffoldKing',
  p8: 'ClearView Windows',
  p9: 'Dream Kitchens',
};

const stripSamplePeople = (people: Person[]): Person[] =>
  people.filter((person) => SAMPLE_PEOPLE_BY_ID[person.id] !== person.name);

const errorText = (error: unknown): string => {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const loadFallbackMap = (): Record<string, FallbackSchedule> => {
  const raw = localStorage.getItem(SCHEDULE_FALLBACK_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, FallbackSchedule>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveFallbackMap = (value: Record<string, FallbackSchedule>): void => {
  localStorage.setItem(SCHEDULE_FALLBACK_KEY, JSON.stringify(value));
};

const loadSnapshotFallbackMap = (): Record<string, FallbackSnapshot[]> => {
  const raw = localStorage.getItem(SNAPSHOT_FALLBACK_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, FallbackSnapshot[]>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveSnapshotFallbackMap = (value: Record<string, FallbackSnapshot[]>): void => {
  localStorage.setItem(SNAPSHOT_FALLBACK_KEY, JSON.stringify(value));
};

const parseJson = <T>(raw: string, fallback: T): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const toSnapshotSummary = (row: SnapshotRecord): ScheduleSnapshotSummary => ({
  id: row.id,
  projectId: row.project_id,
  label: row.label,
  createdAt: row.created_at,
});

const toSnapshotPayload = (row: SnapshotRecord): ScheduleSnapshotPayload => ({
  id: row.id,
  projectId: row.project_id,
  label: row.label,
  createdAt: row.created_at,
  tasks: parseJson<Task[]>(row.tasks_json, []),
  sections: parseJson<Section[]>(row.sections_json, []),
  dependencies: parseJson<Dependency[]>(row.dependencies_json, []),
  people: stripSamplePeople(parseJson<Person[]>(row.people_json, [])),
});

export const loadProjectSchedule = async (
  projectId: string,
): Promise<{ tasks: Task[]; sections: Section[]; dependencies: Dependency[]; people: Person[] }> => {
  if (!projectId.trim()) {
    return { tasks: [], sections: [], dependencies: [], people: [] };
  }

  try {
    const row = await tauriInvoke<ScheduleRecord>('get_project_schedule', {
      projectId: projectId,
    });

    return {
      tasks: parseJson<Task[]>(row.tasks_json, []),
      sections: parseJson<Section[]>(row.sections_json, []),
      dependencies: parseJson<Dependency[]>(row.dependencies_json, []),
      people: stripSamplePeople(parseJson<Person[]>(row.people_json, [])),
    };
  } catch (error) {
    const message = errorText(error);
    console.error(`[schedule] get_project_schedule failed for ${projectId}: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    const fallbackMap = loadFallbackMap();
    const fromMap = fallbackMap[projectId];
    return {
      tasks: fromMap?.tasks ?? [],
      sections: fromMap?.sections ?? [],
      dependencies: fromMap?.dependencies ?? [],
      people: stripSamplePeople(fromMap?.people ?? []),
    };
  }
};

export const saveProjectSchedule = async (
  projectId: string,
  tasks: Task[],
  sections: Section[],
  dependencies: Dependency[],
  people: Person[],
): Promise<void> => {
  if (!projectId.trim()) return;

  try {
    await tauriInvoke('save_project_schedule', {
      projectId: projectId,
      tasksJson: JSON.stringify(tasks),
      sectionsJson: JSON.stringify(sections),
      dependenciesJson: JSON.stringify(dependencies),
      peopleJson: JSON.stringify(people),
    });
  } catch (error) {
    const message = errorText(error);
    console.error(`[schedule] save_project_schedule failed for ${projectId}: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    const fallbackMap = loadFallbackMap();
    fallbackMap[projectId] = { tasks, sections, dependencies, people };
    saveFallbackMap(fallbackMap);
  }
};

export const saveProjectSnapshot = async (
  projectId: string,
  label: string,
  tasks: Task[],
  sections: Section[],
  dependencies: Dependency[],
  people: Person[],
): Promise<ScheduleSnapshotSummary> => {
  if (!projectId.trim()) {
    throw new Error('Project ID is required');
  }

  try {
    const row = await tauriInvoke<SnapshotRecord>('save_project_snapshot', {
      projectId,
      label,
      tasksJson: JSON.stringify(tasks),
      sectionsJson: JSON.stringify(sections),
      dependenciesJson: JSON.stringify(dependencies),
      peopleJson: JSON.stringify(people),
    });
    return toSnapshotSummary(row);
  } catch (error) {
    const message = errorText(error);
    console.error(`[snapshot] save_project_snapshot failed for ${projectId}: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    const now = new Date();
    const createdAt = now.toISOString();
    const fallbackSnapshot: FallbackSnapshot = {
      id: crypto.randomUUID(),
      projectId,
      label: label.trim() || `Snapshot ${now.toLocaleString()}`,
      createdAt,
      tasks,
      sections,
      dependencies,
      people,
    };

    const map = loadSnapshotFallbackMap();
    const existing = map[projectId] ?? [];
    map[projectId] = [fallbackSnapshot, ...existing];
    saveSnapshotFallbackMap(map);

    return {
      id: fallbackSnapshot.id,
      projectId: fallbackSnapshot.projectId,
      label: fallbackSnapshot.label,
      createdAt: fallbackSnapshot.createdAt,
    };
  }
};

export const listProjectSnapshots = async (
  projectId: string,
): Promise<ScheduleSnapshotSummary[]> => {
  if (!projectId.trim()) {
    return [];
  }

  try {
    const rows = await tauriInvoke<SnapshotRecord[]>('list_project_snapshots', {
      projectId,
    });

    return rows.map(toSnapshotSummary);
  } catch (error) {
    const message = errorText(error);
    console.error(`[snapshot] list_project_snapshots failed for ${projectId}: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    const map = loadSnapshotFallbackMap();
    const snapshots = map[projectId] ?? [];
    return [...snapshots]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({
        id: item.id,
        projectId: item.projectId,
        label: item.label,
        createdAt: item.createdAt,
      }));
  }
};

export const loadProjectSnapshot = async (
  snapshotId: string,
): Promise<ScheduleSnapshotPayload> => {
  const trimmedSnapshotId = snapshotId.trim();
  if (!trimmedSnapshotId) {
    throw new Error('Snapshot ID is required');
  }

  try {
    const row = await tauriInvoke<SnapshotRecord>('get_project_snapshot', {
      snapshotId: trimmedSnapshotId,
    });

    return toSnapshotPayload(row);
  } catch (error) {
    const message = errorText(error);
    console.error(`[snapshot] get_project_snapshot failed for ${trimmedSnapshotId}: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    const map = loadSnapshotFallbackMap();
    for (const snapshots of Object.values(map)) {
      const match = snapshots.find((item) => item.id === trimmedSnapshotId);
      if (match) {
        return {
          id: match.id,
          projectId: match.projectId,
          label: match.label,
          createdAt: match.createdAt,
          tasks: match.tasks,
          sections: match.sections,
          dependencies: match.dependencies,
          people: stripSamplePeople(match.people),
        };
      }
    }

    throw error;
  }
};


export const deleteProjectSnapshot = async (snapshotId: string): Promise<void> => {
  const trimmedSnapshotId = snapshotId.trim();
  if (!trimmedSnapshotId) {
    throw new Error('Snapshot ID is required');
  }

  try {
    await tauriInvoke('delete_project_snapshot', { snapshotId: trimmedSnapshotId });
  } catch (error) {
    const message = errorText(error);
    console.error(`[snapshot] delete_project_snapshot failed for ${trimmedSnapshotId}: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    const map = loadSnapshotFallbackMap();
    const next: Record<string, FallbackSnapshot[]> = {};
    for (const [projectId, snapshots] of Object.entries(map)) {
      next[projectId] = snapshots.filter((snapshot) => snapshot.id !== trimmedSnapshotId);
    }
    saveSnapshotFallbackMap(next);
  }
};

export const clearProjectSnapshots = async (projectId: string): Promise<void> => {
  const trimmedProjectId = projectId.trim();
  if (!trimmedProjectId) {
    throw new Error('Project ID is required');
  }

  try {
    await tauriInvoke('clear_project_snapshots', { projectId: trimmedProjectId });
  } catch (error) {
    const message = errorText(error);
    console.error(`[snapshot] clear_project_snapshots failed for ${trimmedProjectId}: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    const map = loadSnapshotFallbackMap();
    map[trimmedProjectId] = [];
    saveSnapshotFallbackMap(map);
  }
};
export const clearProjectPeople = async (projectId: string): Promise<void> => {
  if (!projectId.trim()) return;

  try {
    await tauriInvoke('clear_project_people', { projectId: projectId });
  } catch (error) {
    const message = errorText(error);
    console.error(`[schedule] clear_project_people failed for ${projectId}: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    const fallbackMap = loadFallbackMap();
    const existing = fallbackMap[projectId] ?? { tasks: [], sections: [], dependencies: [], people: [] };
    fallbackMap[projectId] = { ...existing, people: [] };
    saveFallbackMap(fallbackMap);
  }
};

