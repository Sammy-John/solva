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
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [cascadeNotification, dismissCascadeNotification]);

  if (!visible || !cascadeNotification) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-card border rounded-lg shadow-lg px-4 py-3 max-w-sm">
      <p className="font-mono text-xs font-medium text-foreground">
        {cascadeNotification.message}
      </p>
    </div>
  );
}
