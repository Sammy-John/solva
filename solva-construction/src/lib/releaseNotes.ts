export interface LatestChanges {
  version: string;
  items: string[];
}

const CHANGELOG: Record<string, string[]> = {
  "1.1.0": [
    "Move mode: reliable click-to-reorder tasks (no drag required).",
    "Teams-style project sidebar with snapshots/export + in-app Guide.",
    "Schedule table help tooltips and a read-only Waiting On column.",
    "Solva branding refresh + desktop-first layout; app opens maximized.",
  ],
  "1.0.6": [
    "Project tools split into collapsible panels (Version & Updates, Data & Storage).",
    "Workdays-only mode: optionally exclude weekends for duration and dependency lag counting.",
    "Inline schedule date edits (start/end/days) recalculate more consistently.",
    "Drag and drop task moves are more reliable.",
  ],
};

export function getLatestChanges(version: string | null | undefined): LatestChanges {
  const safeVersion = (version ?? "").trim();
  if (!safeVersion) {
    return { version: "unknown", items: [] };
  }

  return {
    version: safeVersion,
    items: CHANGELOG[safeVersion] ?? [],
  };
}
