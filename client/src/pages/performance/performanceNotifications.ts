import Toast from "../../utils/toast";

export const CLOSED_CYCLE_MESSAGE =
  "This appraisal cycle is closed. Reopen it before making changes.";

export const APPRAISAL_VALIDATION_TOAST_DURATION_MS = 8000;

export function isClosedCycleStatus(status?: string) {
  return status === "Closed" || status === "Completed";
}

export function getPerformanceErrorMessage(error: unknown, fallback: string) {
  const responseError = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    responseError?.response?.data?.message ||
    responseError?.response?.data?.error ||
    responseError?.message ||
    fallback
  );
}

export function showPerformanceError(
  error: unknown,
  fallback: string,
  duration?: number,
) {
  Toast.error(getPerformanceErrorMessage(error, fallback), duration);
}
