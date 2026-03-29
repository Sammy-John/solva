import { useScheduleStore } from "@/store/scheduleStore";
import { getUrgency, isPastDue, hasMissingSupplyDates } from "@/lib/scheduling";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Truck } from "lucide-react";

export function ScheduleHealthSummary() {
  const { tasks } = useScheduleStore();

  const overdueSupplyTasks = tasks.filter((t) =>
    isPastDue(t.taskType, t.endDate, t.status),
  );

  const missingSupplyDateTasks = tasks.filter((t) =>
    hasMissingSupplyDates(t.taskType, t.startDate, t.endDate, t.status),
  );

  const urgentDeliveries = tasks.filter(
    (t) =>
      (t.taskType === "Delivery" || t.taskType === "Ordering") &&
      getUrgency(t.taskType, t.endDate, t.status, t.startDate) === "red",
  ).length;

  const dueNext7 = tasks.filter((t) => {
    if (t.status === "Completed") return false;
    const days = differenceInCalendarDays(parseISO(t.endDate), new Date());
    return days >= 0 && days <= 7;
  }).length;

  const delayed = tasks.filter((t) => t.status === "Delayed").length;
  const completed = tasks.filter((t) => t.status === "Completed").length;

  const items = [
    {
      icon: Truck,
      label: "urgent deliveries",
      count: urgentDeliveries,
      className: "text-destructive",
      show: urgentDeliveries > 0,
    },
    {
      icon: Clock,
      label: "tasks due in 7 days",
      count: dueNext7,
      className: "text-[hsl(var(--urgency-orange))]",
      show: dueNext7 > 0,
    },
    {
      icon: AlertTriangle,
      label: "delayed task" + (delayed !== 1 ? "s" : ""),
      count: delayed,
      className: "text-destructive",
      show: delayed > 0,
    },
    {
      icon: CheckCircle2,
      label: "tasks completed",
      count: completed,
      className: "text-[hsl(var(--urgency-green))]",
      show: true,
    },
  ];

  return (
    <div className="px-6 md:px-8 py-3.5 bg-card border-b">
      <div className="flex items-center gap-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground">
          Schedule Health
        </span>
        <div className="flex items-center gap-5">
          {items
            .filter((i) => i.show)
            .map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <item.icon className={`h-3.5 w-3.5 ${item.className}`} />
                <span className="text-[13px] text-foreground">
                  <span className="font-semibold">{item.count}</span>{" "}
                  {item.label}
                </span>
              </div>
            ))}
        </div>
      </div>

      {missingSupplyDateTasks.length > 0 ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>
            Critical: {missingSupplyDateTasks.length} ordering/delivery task
            {missingSupplyDateTasks.length !== 1 ? "s are" : " is"} missing date
            {missingSupplyDateTasks.length !== 1 ? "s" : ""}. Set dates and
            check the chain.
          </span>
        </div>
      ) : null}

      {overdueSupplyTasks.length > 0 ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>
            Critical: {overdueSupplyTasks.length} ordering/delivery task
            {overdueSupplyTasks.length !== 1 ? "s are" : " is"} past due. Other
            tasks may be delayed - check the chain.
          </span>
        </div>
      ) : null}
    </div>
  );
}
