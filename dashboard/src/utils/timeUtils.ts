/**
 * Safely parse a backend timestamp into a local Date object.
 * If the string lacks timezone indicators ('Z' or offset), it treats it as UTC.
 */
export const parseUtcDate = (timestamp: string): Date => {
  if (!timestamp) return new Date();
  const trimmed = timestamp.trim();
  // Check if string already contains timezone offset (Z or +/-HH:MM or +/-HHMM)
  const hasTimezone =
    trimmed.endsWith("Z") ||
    /[+-]\d{2}:\d{2}$/.test(trimmed) ||
    /[+-]\d{4}$/.test(trimmed);

  const normalized = hasTimezone ? trimmed : `${trimmed.replace(" ", "T")}Z`;
  const parsed = new Date(normalized);
  return isNaN(parsed.getTime()) ? new Date(trimmed) : parsed;
};

export const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const time = parseUtcDate(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 5) {
    return "just now";
  }
  if (diffSecs < 60) {
    return `${diffSecs}s ago`;
  }
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export const formatDateTime = (timestamp: string): string => {
  return parseUtcDate(timestamp).toLocaleString();
};

/**
 * Convert a Date object (or timestamp) to "YYYY-MM-DDTHH:mm" in the user's LOCAL timezone.
 * Suitable for `<input type="datetime-local" />`.
 */
export const toLocalDatetimeInputString = (dateInput?: Date | string | number): string => {
  const date = dateInput
    ? typeof dateInput === "object"
      ? dateInput
      : parseUtcDate(String(dateInput))
    : new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Parses a local datetime string from `<input type="datetime-local">` ("YYYY-MM-DDTHH:mm")
 * into a UTC ISO string ("...Z") for backend queries without timezone shift errors.
 */
export const parseLocalDatetimeToUtcIso = (localStr: string): string => {
  if (!localStr) return "";
  const parts = localStr.split("T");
  if (parts.length < 2) return new Date(localStr).toISOString();
  const [year, month, day] = parts[0].split("-").map(Number);
  const [hours, minutes] = parts[1].split(":").map(Number);
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0);
  return localDate.toISOString();
};

