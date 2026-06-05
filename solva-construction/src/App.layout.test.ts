import { describe, expect, it } from 'vitest';
import source from './App.tsx?raw';

describe('dashboard layout source order', () => {
  it('keeps projects before the secondary people directory section', () => {
    expect(source.indexOf('className="dashboard-projects"')).toBeGreaterThan(-1);
    expect(source.indexOf('className="dashboard-people"')).toBeGreaterThan(-1);
    expect(source.indexOf('className="dashboard-projects"')).toBeLessThan(
      source.indexOf('className="dashboard-people"'),
    );
  });
});
