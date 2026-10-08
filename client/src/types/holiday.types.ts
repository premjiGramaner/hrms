export interface Holiday {
  id?: number;
  title: string;
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

export interface UploadHolidayResponse {
  success: boolean;
  data: Holiday[];
  message: string;
}
