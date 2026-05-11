import { describe, expect, it } from 'vitest';

import appCss from '../App.css?raw';
import appSource from '../App.tsx?raw';
import scheduleTableSource from '../components/schedule/ScheduleTable.tsx?raw';
import indexCss from '../index.css?raw';
import tailwindConfig from '../../tailwind.config.ts?raw';

const legacyScheduleTables = import.meta.glob('../components/schedule/ScheduleTableDnd.tsx');

describe('design system cleanup guardrails', () => {
  it('does not load editorial display fonts or expose heading utility drift', () => {
    const combined = [
      indexCss,
      tailwindConfig,
      appSource,
      appCss,
    ].join('\n');

    expect(combined).not.toContain('Playfair Display');
    expect(combined).not.toContain('font-heading');
  });

  it('uses the active schedule table as the single table implementation', () => {
    expect(Object.keys(legacyScheduleTables)).toHaveLength(0);
  });

  it('keeps the primary schedule table above 10px micro-type', () => {
    expect(scheduleTableSource).not.toContain('text-[10px]');
  });

  it('keeps Tailwind default text sizing intact', () => {
    expect(tailwindConfig).not.toContain('fontSize:');
  });
});
