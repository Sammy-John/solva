import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import type { Person } from '@/types/scheduling';
import { shouldUseBrowserFallback } from '@/lib/storageRuntime';

type MasterPeopleRecord = {
  people_json: string;
  updated_at: string;
};

const MASTER_PEOPLE_FALLBACK_KEY = 'construction-planner-desktop.master-people.v1';

const errorText = (error: unknown): string => {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const parsePeople = (raw: string): Person[] => {
  try {
    const parsed = JSON.parse(raw) as Person[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const loadFallbackPeople = (): Person[] => {
  const raw = localStorage.getItem(MASTER_PEOPLE_FALLBACK_KEY);
  if (!raw) return [];
  return parsePeople(raw);
};

const saveFallbackPeople = (people: Person[]): void => {
  localStorage.setItem(MASTER_PEOPLE_FALLBACK_KEY, JSON.stringify(people));
};

export const listMasterPeople = async (): Promise<Person[]> => {
  try {
    const row = await tauriInvoke<MasterPeopleRecord>('list_master_people');
    const people = parsePeople(row.people_json);

    if (people.length === 0) {
      const fallbackPeople = loadFallbackPeople();
      if (fallbackPeople.length > 0) {
        await saveMasterPeople(fallbackPeople);
        return fallbackPeople;
      }
    }

    return people;
  } catch (error) {
    const message = errorText(error);
    console.error(`[people] list_master_people failed: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    return loadFallbackPeople();
  }
};

export const saveMasterPeople = async (people: Person[]): Promise<void> => {
  try {
    await tauriInvoke<MasterPeopleRecord>('save_master_people', {
      peopleJson: JSON.stringify(people),
    });
  } catch (error) {
    const message = errorText(error);
    console.error(`[people] save_master_people failed: ${message}`);
    if (!shouldUseBrowserFallback()) {
      throw error;
    }

    saveFallbackPeople(people);
  }
};
