// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';

import {
  getStarterTemplateSeed,
  instantiateTemplateSeed,
  listTemplates,
} from '@/lib/templatesDb';

describe('templatesDb starter construction template', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('includes a built-in construction starter template when no saved templates exist', async () => {
    const templates = await listTemplates();

    expect(templates[0]).toMatchObject({
      id: 'builtin-construction-starter',
      name: 'Construction Starter Schedule',
    });
    expect(templates[0].seed.sections.map((section) => section.name)).toEqual([
      'Preliminaries',
      'Slab',
      'Frame',
      'Roof',
      'Services',
      'Linings',
      'Fitoff',
      'Inspections',
      'Handover',
    ]);
  });

  it('ships starter ordering, delivery, internal, and inspection rows with dependency links', () => {
    const seed = getStarterTemplateSeed();

    expect(seed.tasks.map((task) => task.taskType)).toEqual(
      expect.arrayContaining(['Ordering', 'Delivery', 'Internal', 'Inspection']),
    );
    expect(seed.tasks.some((task) => task.taskType === 'Inspection' && task.duration === 0)).toBe(true);
    expect(seed.dependencies.length).toBeGreaterThan(5);

    const instantiated = instantiateTemplateSeed(seed);
    expect(instantiated.sections).toHaveLength(9);
    expect(instantiated.dependencies.length).toBe(seed.dependencies.length);
  });

  it('instantiates starter comments as task comment strings', () => {
    const instantiated = instantiateTemplateSeed(getStarterTemplateSeed());
    const setupTask = instantiated.tasks.find((task) => task.id.startsWith('t-') && task.name === 'Site setup and temporary services');

    expect(setupTask?.comments).toEqual([
      'Confirm access, fencing, toilet, power, and water before trades start.',
    ]);
  });
});
