/** A single row from tbl_holiday_matrix as returned by GET /holidays/matrix */
export interface Holiday {
  /** PostgreSQL BIGSERIAL — returned as string by node-postgres */
  id?: string;
  title: string;
  /** Plain "YYYY-MM-DD" string (server uses TO_CHAR, no timezone shift) */
  holiday_date: string;
  day_name: string;
  is_bangalore: boolean;
  is_coimbatore: boolean;
  is_hyderabad: boolean;
}

export type OfficeLocation = "ALL" | "BANGALORE" | "COIMBATORE" | "HYDERABAD";

export interface HolidayFilters {
  year?: number;
  location?: OfficeLocation;
}

/**
 * The shape returned by uploadHolidayPdf — matches the Holiday interface
 * because the controller now normalises field names before inserting.
 */
export interface UploadHolidayResponse {
  success: boolean;
  message: string;
  data: Holiday[];
}
