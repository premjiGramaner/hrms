export const AVATAR_PLACEHOLDER_SERVICE = "ui-avatars.com";

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
export const SUPPORTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export const TERMINATION_REASON_OTHER = "Other";

export const TERMINATION_REASONS = [
  "Contract Not Renewed",
  "Deceased",
  "Dismissed",
  "Laid-off",
  TERMINATION_REASON_OTHER,
  "Physically Disabled/Compensated",
  "Resigned",
  "Resigned - Company Requested",
  "Resigned - Self Proposed",
  "Retired",
] as const;

export type TerminationReason = (typeof TERMINATION_REASONS)[number];

export const TERMINATION_TYPES = [
  "Voluntary",
  "Involuntary",
  "Retirement",
  "Layoff",
  "End of Contract",
] as const;

export type TerminationType = (typeof TERMINATION_TYPES)[number];
