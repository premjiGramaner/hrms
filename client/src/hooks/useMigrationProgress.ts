import { useEffect, useState } from "react";
import { getMigrationStatus, MigrationStatus } from "../api/migration.api";

const ACTIVE_STATUSES = new Set(["QUEUED", "RUNNING"]);

export default function useMigrationProgress(
  migrationId: number | null,
  initialStatus: MigrationStatus | null,
) {
  const [status, setStatus] = useState<MigrationStatus | null>(initialStatus);
  const [pollError, setPollError] = useState("");

  useEffect(() => setStatus(initialStatus), [initialStatus]);

  useEffect(() => {
    if (!migrationId || !status || !ACTIVE_STATUSES.has(status.status)) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getMigrationStatus(migrationId);
        if (!cancelled) {
          setStatus(next);
          setPollError("");
        }
      } catch {
        if (!cancelled)
          setPollError("Live progress is temporarily unavailable. Retrying…");
      }
    };
    void poll();
    const timer = window.setInterval(poll, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [migrationId, status?.status]);

  return { status, setStatus, pollError };
}
