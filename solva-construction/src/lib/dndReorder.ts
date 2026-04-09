import type { Task } from '@/types/scheduling';

export type ReorderInstruction = {
  sourceTaskId: string;
  targetTaskId: string | null;
  targetSectionId: string;
};

export function getReorderInstruction({
  activeId,
  overId,
  tasks,
}: {
  activeId: string;
  overId: string;
  tasks: Task[];
}): ReorderInstruction | null {
  if (!activeId || !overId) return null;

  if (overId.startsWith('section:')) {
    const sectionId = overId.slice('section:'.length);
    if (!sectionId) return null;
    return {
      sourceTaskId: activeId,
      targetTaskId: null,
      targetSectionId: sectionId,
    };
  }

  const target = tasks.find((t) => t.id === overId);
  if (!target) return null;

  return {
    sourceTaskId: activeId,
    targetTaskId: target.id,
    targetSectionId: target.sectionId,
  };
}