export const dependencyQuickGuide = [
  {
    title: "A link means order",
    body: "Use a link when one job should happen before another. The task you choose must finish first.",
  },
  {
    title: "Auto-shift",
    body: "Use this for hard order. If the first task moves later, the following task moves later too.",
  },
  {
    title: "Warning only",
    body: "Use this when work can overlap or you just want a reminder. The link stays, but dates do not move by themselves.",
  },
  {
    title: "Completed tasks",
    body: "Completed tasks stay in the chain as a record of what happened, but the app will not move them automatically.",
  },
  {
    title: "Warnings",
    body: "A warning means the dates no longer match the link. Check the site plan and choose whether to move the task, leave it, or update the status.",
  },
] as const;
