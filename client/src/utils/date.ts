const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  if (ISO_DATE_PATTERN.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}
