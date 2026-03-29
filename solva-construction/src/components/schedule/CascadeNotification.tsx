import { useEffect, useState } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';

export function CascadeNotification() {
  const { cascadeNotification, dismissCascadeNotification } = useScheduleStore();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (cascadeNotification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        dismissCascadeNotification();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [cascadeNotification, dismissCascadeNotification]);

  if (!visible || !cascadeNotification) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-card border rounded-lg shadow-lg px-4 py-3 max-w-md space-y-2">
      <p className="text-xs font-semibold text-foreground">
        {cascadeNotification.message}
      </p>
      {cascadeNotification.details.length > 0 ? (
        <ul className="space-y-1">
          {cascadeNotification.details.map((detail, idx) => (
            <li key={`${idx}-${detail}`} className="text-[11px] text-muted-foreground">
              {detail}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
