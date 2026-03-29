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
  Trash2,
  ChevronDown,
  ChevronRight,
  Phone,
  Mail,
  Pencil,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PeopleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PeopleModal({ open, onOpenChange }: PeopleModalProps) {
  const { people, addPerson, updatePerson, removePerson } = useScheduleStore();
  const [tab, setTab] = useState<UserGroup>("Internal");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [trade, setTrade] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  const filtered = people.filter((p) => p.userGroup === tab);

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
      addPerson({
        id: `p${Date.now()}`,
        userGroup: tab,
        ...data,
      } as Person);
    }
    resetForm();
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
          {filtered.map((p) => (
            <div key={p.id} className="rounded-lg border bg-card group">
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
                    <span className="text-[10px] text-muted-foreground">
                      {p.trade}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100"
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
                    className="h-6 w-6 p-0 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePerson(p.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
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
          ))}
        </div>

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
