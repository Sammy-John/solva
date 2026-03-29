import { useState } from 'react';
import { Task } from '@/types/scheduling';
import { useScheduleStore } from '@/store/scheduleStore';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface TaskRowDrawerProps {
  task: Task;
}

export function TaskRowDrawer({ task }: TaskRowDrawerProps) {
  const { updateTask, deleteTask, dependencies, tasks } = useScheduleStore();
  const [newComment, setNewComment] = useState('');

  const taskDeps = dependencies.filter(d => d.predecessorId === task.id || d.successorId === task.id);

  const addComment = () => {
    if (!newComment.trim()) return;
    updateTask(task.id, { comments: [...task.comments, newComment.trim()] });
    setNewComment('');
  };

  return (
    <div className="bg-accent/30 border-t px-6 py-4 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Task Details
          </h3>
          <p className="text-sm">
            <span className="text-muted-foreground">Type:</span> {task.taskType}
            {task.taskType === 'Inspection' && <span className="ml-2 text-xs text-muted-foreground">(Milestone)</span>}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-urgency-red-bg"
          onClick={() => deleteTask(task.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Dependencies */}
      {taskDeps.length > 0 && (
        <div>
          <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Dependencies
          </h4>
          <ul className="space-y-1">
            {taskDeps.map(d => {
              const other = d.predecessorId === task.id
                ? tasks.find(t => t.id === d.successorId)
                : tasks.find(t => t.id === d.predecessorId);
              const direction = d.predecessorId === task.id ? '→' : '←';
              return (
                <li key={d.id} className="text-xs text-muted-foreground">
                  {direction} {other?.name || 'Unknown'}{d.lagDays > 0 ? ` (+${d.lagDays}d lag)` : ''}
                  {!d.autoShift && <span className="ml-1 text-urgency-orange">(manual)</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Comments */}
      <div>
        <h4 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          Comments
        </h4>
        {task.comments.length === 0 && (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        )}
        <ul className="space-y-1 mb-2">
          {task.comments.map((c, i) => (
            <li key={i} className="text-xs bg-card rounded px-2 py-1.5">{c}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-card border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addComment(); }}
          />
          <Button size="sm" variant="ghost" className="text-xs" onClick={addComment}>
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
