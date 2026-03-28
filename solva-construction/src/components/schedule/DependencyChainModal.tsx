import { useMemo } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowRight, Workflow } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DependencyChainModalProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DependencyChainModal({
  taskId,
  open,
  onOpenChange,
}: DependencyChainModalProps) {
  const { tasks, dependencies } = useScheduleStore();

  const taskById = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  const currentTask = taskId ? taskById.get(taskId) ?? null : null;

  const { chainIds, upstreamIds, downstreamIds } = useMemo(() => {
    if (!taskId) {
      return {
        chainIds: [] as string[],
        upstreamIds: new Set<string>(),
        downstreamIds: new Set<string>(),
      };
    }

    const upstream = new Set<string>();
    const downstream = new Set<string>();

    const walkUpstream = (currentId: string) => {
      const preds = dependencies.filter((dep) => dep.successorId === currentId);
      for (const dep of preds) {
        if (upstream.has(dep.predecessorId)) continue;
        upstream.add(dep.predecessorId);
        walkUpstream(dep.predecessorId);
      }
    };

    const walkDownstream = (currentId: string) => {
      const succs = dependencies.filter((dep) => dep.predecessorId === currentId);
      for (const dep of succs) {
        if (downstream.has(dep.successorId)) continue;
        downstream.add(dep.successorId);
        walkDownstream(dep.successorId);
      }
    };

    walkUpstream(taskId);
    walkDownstream(taskId);

    const combined = new Set<string>([taskId]);
    for (const id of upstream) combined.add(id);
    for (const id of downstream) combined.add(id);

    return {
      chainIds: Array.from(combined),
      upstreamIds: upstream,
      downstreamIds: downstream,
    };
  }, [dependencies, taskId]);

  const chainTasks = chainIds
    .map((id) => taskById.get(id))
    .filter((task): task is NonNullable<typeof task> => Boolean(task))
    .sort((a, b) => {
      if (a.startDate && b.startDate && a.startDate !== b.startDate) {
        return a.startDate.localeCompare(b.startDate);
      }
      if (a.startDate && !b.startDate) return -1;
      if (!a.startDate && b.startDate) return 1;
      return a.name.localeCompare(b.name);
    });

  const chainIdSet = new Set(chainIds);
  const chainDependencies = dependencies
    .filter(
      (dep) =>
        chainIdSet.has(dep.predecessorId) && chainIdSet.has(dep.successorId),
    )
    .sort((a, b) => {
      const aPred = taskById.get(a.predecessorId)?.name ?? '';
      const bPred = taskById.get(b.predecessorId)?.name ?? '';
      if (aPred !== bPred) return aPred.localeCompare(bPred);
      const aSucc = taskById.get(a.successorId)?.name ?? '';
      const bSucc = taskById.get(b.successorId)?.name ?? '';
      return aSucc.localeCompare(bSucc);
    });

  if (!currentTask) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[82vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Dependency Chain - {currentTask.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-xs mt-1">
          <div className="rounded border bg-muted/20 px-2.5 py-2">
            <span className="text-muted-foreground">Upstream</span>
            <div className="text-sm font-semibold mt-0.5">{upstreamIds.size}</div>
          </div>
          <div className="rounded border bg-primary/5 px-2.5 py-2">
            <span className="text-muted-foreground">Selected Task</span>
            <div className="text-sm font-semibold mt-0.5">1</div>
          </div>
          <div className="rounded border bg-muted/20 px-2.5 py-2">
            <span className="text-muted-foreground">Downstream</span>
            <div className="text-sm font-semibold mt-0.5">{downstreamIds.size}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">
              Chain Tasks ({chainTasks.length})
            </h4>
            <div className="rounded-md border max-h-[430px] overflow-y-auto">
              {chainTasks.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  No tasks in this chain.
                </div>
              ) : (
                <div className="divide-y">
                  {chainTasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        'px-3 py-2.5 bg-card/70',
                        task.id === taskId && 'bg-primary/10',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium break-words flex-1">
                          {task.name}
                        </span>
                        {upstreamIds.has(task.id) ? (
                          <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                            Upstream
                          </span>
                        ) : null}
                        {downstreamIds.has(task.id) ? (
                          <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                            Downstream
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {task.startDate || 'No start'} {'->'} {task.endDate || 'No end'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/80">
              Dependencies ({chainDependencies.length})
            </h4>
            <div className="rounded-md border max-h-[430px] overflow-y-auto">
              {chainDependencies.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted-foreground">
                  No dependencies in this chain.
                </div>
              ) : (
                <div className="divide-y">
                  {chainDependencies.map((dep) => {
                    const predecessor = taskById.get(dep.predecessorId);
                    const successor = taskById.get(dep.successorId);
                    const isDirect =
                      dep.predecessorId === taskId || dep.successorId === taskId;

                    return (
                      <div key={dep.id} className="px-3 py-2.5 bg-card/70">
                        <div className="text-sm font-medium break-words flex items-center gap-1">
                          <span>{predecessor?.name ?? 'Unknown'}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span>{successor?.name ?? 'Unknown'}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            Rule: FS +{dep.lagDays}d
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5">
                            {dep.autoShift ? 'Auto-shift' : 'Manual'}
                          </span>
                          {isDirect ? (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                              Direct
                            </span>
                          ) : null}
                          {dep.notes ? (
                            <span className="rounded bg-muted px-1.5 py-0.5">
                              {dep.notes}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          Tip: Open "Task Dependencies" to add, edit, or remove links.
        </p>
      </DialogContent>
    </Dialog>
  );
}
