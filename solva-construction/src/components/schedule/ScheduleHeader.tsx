import { TaskType, UserGroup, TaskStatus } from '@/types/scheduling';
import { Button } from '@/components/ui/button';
import { Link, Users, Filter, Download, Save, History, RotateCcw } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ScheduleHeaderProps {
  onLinkTasks: () => void;
  onOpenPeople: () => void;
  onExportCsv: () => void;
  onSaveSnapshot: () => void;
  onLoadSnapshot: () => void;
  onQuickRestoreSnapshot: () => void;
  onBackToDashboard: () => void;
  projectName: string;
  projectDescription?: string;
  filterType: TaskType | 'All';
  setFilterType: (v: TaskType | 'All') => void;
  filterGroup: UserGroup | 'All';
  setFilterGroup: (v: UserGroup | 'All') => void;
  filterStatus: TaskStatus | 'All';
  setFilterStatus: (v: TaskStatus | 'All') => void;
  filterUrgent: boolean;
  setFilterUrgent: (v: boolean) => void;
}

export function ScheduleHeader({
  onLinkTasks,
  onOpenPeople,
  onExportCsv,
  onSaveSnapshot,
  onLoadSnapshot,
  onQuickRestoreSnapshot,
  onBackToDashboard,
  projectName,
  projectDescription,
  filterType,
  setFilterType,
  filterGroup,
  setFilterGroup,
  filterStatus,
  setFilterStatus,
  filterUrgent,
  setFilterUrgent,
}: ScheduleHeaderProps) {
  return (
    <header className="shrink-0 flex items-center justify-between px-6 md:px-8 py-3.5 border-b bg-card shadow-sm">
      <div>
        <h1 className="text-base md:text-lg font-semibold tracking-tight text-foreground">{projectName}</h1>
        {projectDescription ? (
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{projectDescription}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2.5">
        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={onBackToDashboard}>
          Back to Dashboard
        </Button>

        <Filter className="h-3.5 w-3.5 text-muted-foreground" />

        <Select value={filterType} onValueChange={(v) => setFilterType(v as TaskType | 'All')}>
          <SelectTrigger className="w-[110px] h-7 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Types</SelectItem>
            <SelectItem value="Internal">Internal</SelectItem>
            <SelectItem value="Ordering">Ordering</SelectItem>
            <SelectItem value="Delivery">Delivery</SelectItem>
            <SelectItem value="Inspection">Inspection</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as TaskStatus | 'All')}>
          <SelectTrigger className="w-[110px] h-7 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Status</SelectItem>
            <SelectItem value="Planned">Planned</SelectItem>
            <SelectItem value="Booked">Booked</SelectItem>
            <SelectItem value="In Progress">In Progress</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Delayed">Delayed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterGroup} onValueChange={(v) => setFilterGroup(v as UserGroup | 'All')}>
          <SelectTrigger className="w-[110px] h-7 text-xs">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Groups</SelectItem>
            <SelectItem value="Internal">Internal</SelectItem>
            <SelectItem value="Suppliers">Suppliers</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Switch
            id="urgent-filter"
            checked={filterUrgent}
            onCheckedChange={setFilterUrgent}
            className="scale-75"
          />
          <Label htmlFor="urgent-filter" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
            Urgent
          </Label>
        </div>

        <div className="w-px h-5 bg-border" />

        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={onSaveSnapshot}>
          <Save className="h-3.5 w-3.5" />
          Save Snapshot
        </Button>

        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={onLoadSnapshot}>
          <History className="h-3.5 w-3.5" />
          Load Snapshot
        </Button>

        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={onQuickRestoreSnapshot}>
          <RotateCcw className="h-3.5 w-3.5" />
          Restore Last
        </Button>

        <Button variant="outline" size="sm" className="text-xs gap-1.5 h-7" onClick={onExportCsv}>
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>

        <Button variant="ghost" size="sm" className="text-xs gap-1.5 h-7" onClick={onOpenPeople}>
          <Users className="h-3.5 w-3.5" />
          People
        </Button>

        <Button size="sm" className="text-xs gap-1.5 h-7" onClick={onLinkTasks}>
          <Link className="h-3.5 w-3.5" />
          Link Tasks
        </Button>
      </div>
    </header>
  );
}
