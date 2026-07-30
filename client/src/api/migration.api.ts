import api from "./axios";
import { MIGRATION_PATHS } from "../constants/apiPaths";

export type MigrationStatusName =
  | "VALIDATING"
  | "READY"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "COMPLETED_WITH_ERRORS"
  | "FAILED";

export interface MigrationStatus {
  id: number;
  file_name: string;
  file_size: number;
  uploaded_by_name: string;
  status: MigrationStatusName;
  overwrite_existing: boolean;
  total_sheets: number;
  total_records: number;
  valid_records: number;
  invalid_records: number;
  duplicate_records: number;
  warning_count: number;
  error_count: number;
  processed_records: number;
  inserted_records: number;
  updated_records: number;
  skipped_records: number;
  failed_records: number;
  current_sheet: string | null;
  current_row: number | null;
  percentage: number;
  remaining_records: number;
  estimated_remaining_seconds: number | null;
  execution_time_seconds: number;
  error_message?: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  duration_seconds?: number;
}

export interface ValidationSummary {
  totalSheets: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  ignoredRecords: number;
  skippedDuplicateRecords: number;
  duplicateRecords: number;
  warnings: number;
  errors: number;
}
export interface MigrationValidationError {
  id?: string;
  sheet: string;
  row: number;
  column: string;
  invalidValue: unknown;
  reason: string;
  severity: "ERROR" | "WARNING";
  status?: string;
}

export interface MigrationSheetPreview {
  name: string;
  recordCount: number;
  totalColumns: number;
  headers: string[];
  preview: Record<string, unknown>[];
  status: "VALID" | "INVALID" | "SKIPPED";
}

export interface MigrationUploadResult {
  migration: MigrationStatus;
  file: { name: string; size: number; uploadedAt: string };
  sheets: MigrationSheetPreview[];
  validation: ValidationSummary;
  errors: MigrationValidationError[];
  tablesAffected: string[];
}

export interface PaginatedMigrationErrors {
  rows: MigrationValidationError[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedMigrationHistory {
  rows: MigrationStatus[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function uploadMigration(file: File): Promise<MigrationUploadResult> {
  const formData = new FormData();
  formData.append("fileExcel", file);
  const response = await api.post<{ success: boolean; data: MigrationUploadResult }>(
    MIGRATION_PATHS.UPLOAD,
    formData,
    { timeout: 120000 },
  );
  return response.data.data;
}

export async function startMigration(id: number, overwriteExisting: boolean) {
  const response = await api.post<{ success: boolean; data: { migrationId: number; status: string } }>(
    MIGRATION_PATHS.start(id),
    { overwriteExisting },
  );
  return response.data.data;
}

export async function getMigrationStatus(id: number): Promise<MigrationStatus> {
  const response = await api.get<{ success: boolean; data: MigrationStatus }>(MIGRATION_PATHS.status(id));
  return response.data.data;
}
export async function getMigrationErrors(
  id: number,
  params: { page?: number; limit?: number; search?: string; severity?: string; status?: string } = {},
): Promise<PaginatedMigrationErrors> {
  const response = await api.get<{ success: boolean; data: PaginatedMigrationErrors }>(
    MIGRATION_PATHS.errors(id),
    { params },
  );
  return response.data.data;
}

export async function getMigrationHistory(
  params: { page?: number; limit?: number; search?: string } = {},
): Promise<PaginatedMigrationHistory> {
  const response = await api.get<{ success: boolean; data: PaginatedMigrationHistory }>(
    MIGRATION_PATHS.HISTORY,
    { params },
  );
  return response.data.data;
}

export async function downloadMigrationReport(
  id: number,
  type: "all" | "errors" | "validation" | "skipped" | "failed" = "all",
  format: "xlsx" | "csv" = "xlsx",
) {
  const response = await api.get(MIGRATION_PATHS.report(id), {
    params: { type, format },
    responseType: "blob",
    timeout: 120000,
  });
  const mime = format === "csv"
    ? "text/csv;charset=utf-8"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: mime }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `migration-${id}-${type}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
