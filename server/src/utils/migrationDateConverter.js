const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

function pad(value) {
  return String(value).padStart(2, "0");
}

function validParts(year, month, day, hour = 0, minute = 0, second = 0) {
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    && date.getUTCSeconds() === second;
}

function partsFromString(value, dateOrder) {
  const text = String(value).trim();
  const zonedIso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/);
  if (zonedIso) {
    const sourceParts = zonedIso.slice(1, 7).map((part) => Number(part || 0));
    if (!validParts(...sourceParts)) return null;
    const parsed = new Date(text.replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return null;
    return [
      parsed.getUTCFullYear(),
      parsed.getUTCMonth() + 1,
      parsed.getUTCDate(),
      parsed.getUTCHours(),
      parsed.getUTCMinutes(),
      parsed.getUTCSeconds(),
    ];
  }
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?$/);
  if (iso) return iso.slice(1).map((part) => Number(part || 0));
  const local = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!local) return null;
  const first = Number(local[1]);
  const second = Number(local[2]);
  const [day, month] = dateOrder === "MDY" ? [second, first] : [first, second];
  return [Number(local[3]), month, day, Number(local[4] || 0), Number(local[5] || 0), Number(local[6] || 0)];
}

function dateParts(value, dateOrder = "DMY") {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate(), value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds()];
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(EXCEL_EPOCH_UTC + Math.round(value * 86400000));
    return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()];
  }
  return partsFromString(value, dateOrder);
}

export function toPostgresDate(value, dateOrder = "DMY") {
  const parts = dateParts(value, dateOrder);
  if (!parts || !validParts(...parts)) return undefined;
  const [year, month, day] = parts;
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function toPostgresTimestamp(value, dateOrder = "DMY") {
  const parts = dateParts(value, dateOrder);
  if (!parts || !validParts(...parts)) return undefined;
  const [year, month, day, hour = 0, minute = 0, second = 0] = parts;
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

export function hoursToRequestedDays(hours, hoursPerDay, precision = 1) {
  const numericHours = Number(hours);
  if (!Number.isFinite(numericHours) || numericHours <= 0) return undefined;
  if (!Number.isFinite(hoursPerDay) || hoursPerDay <= 0) {
    throw new Error("Configured hours per workday must be positive");
  }
  const factor = 10 ** precision;
  return Math.round((numericHours / hoursPerDay) * factor) / factor;
}
