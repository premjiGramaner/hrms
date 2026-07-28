export enum SortDirection {
  ASCENDING = "asc",
  DESCENDING = "desc",
}

export enum GenderType {
  ALL = "",
  MALE = "Male",
  FEMALE = "Female",
  OTHER = "Other",
}

export enum EmploymentStatusType {
  ALL = "",
  FULL_TIME = "Full-Time",
  PART_TIME = "Part-Time",
  CONTRACT = "Contract",
  PROBATION = "Probation",
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface ReportFilters {
  location: string;
  gender: string;
  employmentStatus: string;
  subUnit: string;
  jobTitle: string;
}

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export interface PaginationConfig {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalRecords: number;
}

export interface EmployeeContactReportState {
  reportData: any[];
  isLoading: boolean;
  pagination: PaginationConfig;
  searchQuery: string;
  sort: SortConfig;
  filters: ReportFilters;
}
