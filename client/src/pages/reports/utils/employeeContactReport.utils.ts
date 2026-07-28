import { EmployeeContactRecord } from "../../../types";
import { COLUMN_LABELS } from "../constants/employeeContactReport.constants";

export function formatEmployeeAddress(employee: EmployeeContactRecord): string {
  const addressComponents = [
    employee.address1,
    employee.address2,
    employee.city,
    employee.state,
    employee.country,
    employee.zip,
  ].filter(Boolean);

  return addressComponents.length > 0
    ? addressComponents.join(", ")
    : COLUMN_LABELS.NOT_AVAILABLE;
}

export function getEmployeeInitials(fullName: string): string {
  return fullName
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function extractUniqueValues<T>(
  data: T[],
  fieldExtractor: (item: T) => string | undefined,
): string[] {
  const uniqueValues = new Set<string>();
  data.forEach((item) => {
    const value = fieldExtractor(item);
    if (value) {
      uniqueValues.add(value);
    }
  });
  return Array.from(uniqueValues).sort();
}
