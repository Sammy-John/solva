import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface WorkspaceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  excludeWeekends: boolean;
  onToggleWorkdaysOnly: (nextValue: boolean) => void;
}

export function WorkspaceSettingsDialog({
  open,
  onOpenChange,
  excludeWeekends,
  onToggleWorkdaysOnly,
}: WorkspaceSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Scheduling</h3>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="settings-workdays" className="text-sm font-medium">
                  Workdays only
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Exclude weekends from duration and dependency lag calculations.
                </p>
              </div>
              <Switch
                id="settings-workdays"
                checked={excludeWeekends}
                onCheckedChange={onToggleWorkdaysOnly}
              />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Storage</h3>
            <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              Installed app uses SQLite for projects, schedules, and snapshots. Browser preview uses localStorage fallback data, so preview data can differ from installed app data.
            </p>
          </section>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
