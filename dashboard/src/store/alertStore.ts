import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { AlertOut } from "../types/safecheck.types";

interface AlertStoreState {
  readAlertIds: Set<number>;
  unreadCount: number;
}

const STORAGE_KEY = "safecheck_read_alerts_v1";

function loadReadAlertsFromStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveReadAlertsToStorage(readSet: Set<number>) {
  try {
    const arr = Array.from(readSet).slice(-500); // keep last 500
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore localstorage errors
  }
}

let currentState: AlertStoreState = {
  readAlertIds: loadReadAlertsFromStorage(),
  unreadCount: 0,
};

// Tracks which alerts have already been processed to trigger toasts only for genuinely new alerts
const seenAlertIds = new Set<number>();
let isInitialPollDone = false;

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const alertStore = {
  // Call this whenever an alert array is fetched/polled
  syncAlerts: (alerts: AlertOut[]) => {
    if (!alerts || alerts.length === 0) {
      if (currentState.unreadCount !== 0) {
        currentState = { ...currentState, unreadCount: 0 };
        emitChange();
      }
      return;
    }

    // On initial poll, populate seenAlertIds without popping toasts for historical alerts
    if (!isInitialPollDone) {
      for (const alert of alerts) {
        seenAlertIds.add(alert.id);
      }
      isInitialPollDone = true;
    } else {
      // Find genuinely new alerts
      const newArrivals = alerts.filter((a) => !seenAlertIds.has(a.id));
      for (const alert of newArrivals) {
        seenAlertIds.add(alert.id);

        // Trigger Sonner toast notification
        const description = `Rule: ${alert.rule_triggered?.toUpperCase()} • ${alert.message}`;
        if (alert.severity === "critical") {
          toast.error(`CRITICAL Security Alert #${alert.id}`, { description });
        } else if (alert.severity === "warning") {
          toast.warning(`WARNING Alert #${alert.id}`, { description });
        } else {
          toast.info(`INFO Alert #${alert.id}`, { description });
        }
      }
    }

    // Calculate unread count (alerts present in the feed not yet marked as read)
    const unread = alerts.filter((a) => !currentState.readAlertIds.has(a.id)).length;
    if (unread !== currentState.unreadCount) {
      currentState = {
        ...currentState,
        unreadCount: unread,
      };
      emitChange();
    }
  },

  markAsRead: (alertId: number) => {
    if (currentState.readAlertIds.has(alertId)) return;
    const newRead = new Set(currentState.readAlertIds);
    newRead.add(alertId);
    saveReadAlertsToStorage(newRead);

    currentState = {
      readAlertIds: newRead,
      unreadCount: Math.max(0, currentState.unreadCount - 1),
    };
    emitChange();
  },

  markAllAsRead: (alertIds: number[]) => {
    const newRead = new Set(currentState.readAlertIds);
    for (const id of alertIds) {
      newRead.add(id);
    }
    saveReadAlertsToStorage(newRead);

    currentState = {
      readAlertIds: newRead,
      unreadCount: 0,
    };
    emitChange();
  },

  isRead: (alertId: number): boolean => {
    return currentState.readAlertIds.has(alertId);
  },
};

export function useAlertStore() {
  const store = useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    () => currentState,
    () => currentState
  );

  return {
    readAlertIds: store.readAlertIds,
    unreadCount: store.unreadCount,
    markAsRead: alertStore.markAsRead,
    markAllAsRead: alertStore.markAllAsRead,
    isAlertRead: alertStore.isRead,
  };
}

