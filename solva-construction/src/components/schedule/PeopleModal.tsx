import { useState } from "react";
import { useScheduleStore } from "@/store/scheduleStore";
import { Person, UserGroup } from "@/types/scheduling";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Pencil,
  X,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createEntityId } from "@/lib/ids";
import {
  analyzeProjectPersonDeactivation,
  normalizeProjectPerson,
} from "@/lib/peopleDirectory";

interface PeopleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  masterPeople?: Person[];
  onAddMasterPerson?: (person: Person) => void;
}

export function PeopleModal({
  open,
  onOpenChange,
  masterPeople = [],
  onAddMasterPerson,
}: PeopleModalProps) {
  const { people, tasks, addPerson, updatePerson, removePerson } = useScheduleStore();
  const [tab, setTab] = useState<UserGroup>("Internal");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const projectMasterIds = new Set(people.map((person) => person.masterPersonId ?? person.id));
  const filtered = people.filter((p) => p.userGroup === tab);
  const availableMasterPeople = masterPeople.filter(
    (person) =>
      person.userGroup === tab &&
      person.archived !== true &&
      !projectMasterIds.has(person.masterPersonId ?? person.id),
  );

  const resetForm = () => {
    setName("");
    setCompany("");
    setTrade("");
    setPhone("");
    setEmail("");
    setNotes("");
    setEditingId(null);
  };

  const startEdit = (p: Person) => {
    setEditingId(p.id);
    setName(p.name);
    setCompany(p.company || "");
    setTrade(p.trade || "");
    setPhone(p.phone || "");
    setEmail(p.email || "");
    setNotes(p.notes || "");
    setExpandedId(null);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      company: company.trim() || undefined,
      trade: trade.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (editingId) {
      updatePerson(editingId, data);
    } else {
      const id = createEntityId("person");
      const person: Person = {
        id,
        userGroup: tab,
        masterPersonId: id,
        projectActive: true,
        ...data,
      };
      addPerson(person);
      onAddMasterPerson?.(person);
    }
    resetForm();
  };

  const handleAddMasterToProject = (person: Person) => {
    addPerson({
      ...person,
      masterPersonId: person.masterPersonId ?? person.id,
      projectActive: true,
      archived: false,
    });
  };

  const handleRemoveFromProject = (person: Person) => {
    const impact = analyzeProjectPersonDeactivation(person.id, tasks);
    const activeCopy = impact.activeTasks.length > 0
      ? ` They are assigned to active tasks: ${impact.activeTasks.join(", ")}.`
      : "";
    const completedCopy = impact.completedTasks.length > 0
      ? ` They will remain on completed tasks: ${impact.completedTasks.join(", ")}.`
      : "";
    const confirmed = window.confirm(
      `Remove "${person.name}" from future project assignment?${activeCopy}${completedCopy} Existing task assignments will be kept.`,
    );

    if (!confirmed) return;
    removePerson(person.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            People Directory
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 bg-muted rounded-lg p-0.5 mt-1">
          {(["Internal", "Suppliers"] as UserGroup[]).map((g) => (
            <button
              key={g}
              className={cn(
                "flex-1 text-xs py-1.5 rounded-md transition-colors font-medium",
                tab === g
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => {
                setTab(g);
                resetForm();
              }}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/25 px-3 py-4">
              <p className="text-sm font-medium text-foreground">
                No people selected for this project yet.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add from the master directory below or create a new project person.
              </p>
            </div>
          ) : null}
          {filtered.map((rawPerson) => {
            const p = normalizeProjectPerson(rawPerson);
            return (
            <div key={p.id} className={cn("rounded-lg border bg-card group", p.projectActive === false && "opacity-75")}>
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/30 transition-colors"
                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedId === p.id ? (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">{p.name}</span>
                  {p.trade && (
                    <span className="text-xs text-muted-foreground">
                      {p.trade}
                    </span>
                  )}
                  {p.projectActive === false ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Inactive
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100"
                    aria-label={`Edit ${p.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(p);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                    aria-label={`Remove ${p.name} from project`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFromProject(p);
                    }}
                  >
                    <UserMinus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {expandedId === p.id && (
                <div className="px-3 pb-3 pt-1 space-y-1 text-xs text-muted-foreground border-t">
                  {p.company && <p>{p.company}</p>}
                  {p.trade && <p>{p.trade}</p>}
                  {p.phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {p.phone}
                    </p>
                  )}
                  {p.email && (
                    <p className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {p.email}
                    </p>
                  )}
                  {p.notes && <p className="whitespace-pre-wrap">{p.notes}</p>}
                  {!p.company && !p.phone && !p.email && !p.notes && (
                    <p className="italic">No contact details</p>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>

        {availableMasterPeople.length > 0 ? (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Add from Master Directory
            </p>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {availableMasterPeople.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {person.company || person.trade || person.userGroup}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleAddMasterToProject(person)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-t pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {editingId ? "Edit Person" : `Add to ${tab}`}
            </p>
            {editingId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0"
                onClick={resetForm}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="col-span-2 border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card"
              placeholder="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card"
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card"
              placeholder="Trade"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <input
              className="border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <textarea
              className="col-span-2 border rounded px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary bg-card min-h-[56px]"
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            className="w-full h-7 text-xs"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            {editingId ? "Save Changes" : "Add Person"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
