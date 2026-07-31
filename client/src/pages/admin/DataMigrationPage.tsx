import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Eye,
  FileWarning,
  Gauge,
  Search,
  ShieldCheck,
  Timer,
  XCircle,
} from "lucide-react";
import Layout from "../../components/Layout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import Modal from "../../components/common/Modal";
import Pagination from "../../components/Pagination";
import FileUploadCard from "../../components/migration/FileUploadCard";
import SheetPreviewSection from "../../components/migration/SheetPreviewSection";
import MigrationProgressPanel from "../../components/migration/MigrationProgressPanel";
import { DataTableColumn } from "../../types/table.types";
import {
  downloadMigrationReport,
  getMigrationErrors,
  getMigrationHistory,
  MigrationStatus,
  MigrationUploadResult,
  MigrationValidationError,
  startMigration,
  uploadMigration,
} from "../../api/migration.api";
import useMigrationProgress from "../../hooks/useMigrationProgress";
import Toast from "../../utils/toast";
const terminalStatuses = new Set(["COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"]);

function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function StatusPill({ status }: { status: string }) {
  const tone = status === "COMPLETED"
    ? "bg-emerald-100 text-emerald-700"
    : status === "FAILED" || status === "INVALID"
      ? "bg-rose-100 text-rose-700"
      : status.includes("ERROR")
        ? "bg-amber-100 text-amber-700"
        : status === "RUNNING" || status === "QUEUED"
          ? "bg-blue-100 text-blue-700"
          : "bg-slate-100 text-slate-700";
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${tone}`}>{status.replace(/_/g, " ")}</span>;
}

function MetricCard({ label, value, icon, tone }: { label: string; value: number; icon: React.ReactNode; tone: string }) {
  return (
    <Card className="flex items-center gap-3 border border-slate-200 p-4">
      <span className={`rounded-xl p-2.5 ${tone}`}>{icon}</span>
      <div><p className="text-2xl font-black text-slate-800">{value}</p><p className="text-xs text-slate-500">{label}</p></div>
    </Card>
  );
}

export default function DataMigrationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<MigrationUploadResult | null>(null);
  const [initialStatus, setInitialStatus] = useState<MigrationStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const completedJob = useRef<number | null>(null);
  const startedMigration = useRef<number | null>(null);
  const { status, setStatus, pollError } = useMigrationProgress(initialStatus?.id || null, initialStatus);

  const [errors, setErrors] = useState<MigrationValidationError[]>([]);
  const [errorPage, setErrorPage] = useState(1);
  const [errorLimit, setErrorLimit] = useState(10);
  const [errorTotal, setErrorTotal] = useState(0);
  const [errorSearch, setErrorSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [errorsLoading, setErrorsLoading] = useState(false);

  const [history, setHistory] = useState<MigrationStatus[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit, setHistoryLimit] = useState(10);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const result = await getMigrationHistory({ page: historyPage, limit: historyLimit, search: historySearch });
      setHistory(result.rows);
      setHistoryTotal(result.total);
    } catch {
      Toast.error("Failed to load migration history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void loadHistory(), 250);
    return () => window.clearTimeout(timer);
  }, [historyPage, historyLimit, historySearch]);

  useEffect(() => {
    if (!status?.id) return;
    setErrorsLoading(true);
    const timer = window.setTimeout(() => {
      getMigrationErrors(status.id, {
        page: errorPage,
        limit: errorLimit,
        search: errorSearch,
        severity,
      })
        .then((result) => {
          setErrors(result.rows);
          setErrorTotal(result.total);
        })
        .catch(() => Toast.error("Failed to load validation errors"))
        .finally(() => setErrorsLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [status?.id, status?.status, errorPage, errorLimit, errorSearch, severity]);

  useEffect(() => {
    if (!status || !terminalStatuses.has(status.status) || completedJob.current === status.id) return;
    completedJob.current = status.id;
    if (status.status !== "FAILED" && startedMigration.current === status.id) {
      setShowSuccess(true);
      startedMigration.current = null;
    }
    void loadHistory();
  }, [status?.id, status?.status]);

  const handleFile = async (selected: File) => {
    if (!selected.name.toLowerCase().endsWith(".xlsx")) {
      Toast.error("Select a Microsoft Excel .xlsx file");
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      Toast.error("Excel file must not exceed 25 MB");
      return;
    }
    setFile(selected);
    setUploadResult(null);
    setInitialStatus(null);
    setStatus(null);
    setUploading(true);
    try {
      const result = await uploadMigration(selected);
      setUploadResult(result);
      setInitialStatus(result.migration);
      setStatus(result.migration);
      setErrorTotal(result.validation.errors);
      setErrors(result.errors);
      Toast.success(`Validated ${result.validation.totalRecords} records`);
      void loadHistory();
    } catch (error: any) {
      setFile(null);
      Toast.error(error?.response?.data?.message || "Excel upload or validation failed");
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    if (status?.status === "RUNNING" || status?.status === "QUEUED") {
      Toast.warning("The active migration remains visible until it finishes");
      return;
    }
    setFile(null);
    setUploadResult(null);
    setInitialStatus(null);
    setStatus(null);
    setErrors([]);
    setErrorTotal(0);
  };
  const confirmStart = async () => {
    if (!status) return;
    setStarting(true);
    try {
      await startMigration(status.id, overwriteExisting);
      startedMigration.current = status.id;
      const queued = { ...status, status: "QUEUED" as const };
      setInitialStatus(queued);
      setStatus(queued);
      setShowConfirmation(false);
      Toast.success("Migration queued. Live progress is now active.");
    } catch (error: any) {
      Toast.error(error?.response?.data?.message || "Could not start migration");
    } finally {
      setStarting(false);
    }
  };

  const download = async (id: number, type: "all" | "errors" | "validation" | "skipped" | "failed", format: "xlsx" | "csv") => {
    try {
      await downloadMigrationReport(id, type, format);
    } catch {
      Toast.error("Could not download the migration report");
    }
  };

  const errorColumns: DataTableColumn<MigrationValidationError>[] = [
    { key: "sheet", header: "Sheet", sortable: true },
    { key: "row", header: "Row", sortable: true },
    { key: "column", header: "Column", sortable: true },
    { key: "invalidValue", header: "Invalid Value", render: (item) => <span className="block max-w-[220px] truncate" title={String(item.invalidValue ?? "")}>{String(item.invalidValue ?? "—")}</span> },
    { key: "reason", header: "Reason", render: (item) => <span className="block min-w-[220px]">{item.reason}</span> },
    { key: "severity", header: "Severity", sortable: true, render: (item) => <StatusPill status={item.severity} /> },
  ];

  const historyColumns: DataTableColumn<MigrationStatus>[] = [
    { key: "file_name", header: "File Name", sortable: true, render: (item) => <div><p className="max-w-[220px] truncate font-semibold text-slate-800">{item.file_name}</p><p className="text-[11px] text-slate-400">#{item.id}</p></div> },
    { key: "uploaded_by_name", header: "Uploaded By", sortable: true },
    { key: "created_at", header: "Uploaded Date", sortable: true, render: (item) => new Date(item.created_at).toLocaleString() },
    { key: "inserted_records", header: "Inserted", sortable: true },
    { key: "failed_records", header: "Failed", sortable: true },
    { key: "duration_seconds", header: "Duration", sortable: true, render: (item) => formatDuration(item.duration_seconds ?? item.execution_time_seconds) },
    { key: "status", header: "Status", sortable: true, render: (item) => <StatusPill status={item.status} /> },
  ];

  const validation = uploadResult?.validation;
  const canStart = status?.status === "READY" && Boolean(status.valid_records);
  const historyPages = Math.max(1, Math.ceil(historyTotal / historyLimit));
  const errorPages = Math.max(1, Math.ceil(errorTotal / errorLimit));
  const summaryMetrics = useMemo(() => validation ? [
    ["Total Records", validation.totalRecords, <Database size={20} />, "bg-blue-100 text-blue-700"],
    ["Valid Records", validation.validRecords, <ShieldCheck size={20} />, "bg-emerald-100 text-emerald-700"],
    ["Invalid Records", validation.invalidRecords, <XCircle size={20} />, "bg-rose-100 text-rose-700"],
    ["Ignored Reports", validation.ignoredRecords, <FileWarning size={20} />, "bg-slate-100 text-slate-700"],
    ["Duplicates", validation.duplicateRecords, <Copy size={20} />, "bg-violet-100 text-violet-700"],
    ["Warnings", validation.warnings, <AlertTriangle size={20} />, "bg-amber-100 text-amber-700"],
    ["Errors", validation.errors, <FileWarning size={20} />, "bg-red-100 text-red-700"],
  ] as const : [], [validation]);
  return (
    <Layout title="Data Migration">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <nav className="mb-2 text-xs font-medium text-slate-400">Dashboard <span className="mx-1">›</span> Administration <span className="mx-1">›</span> <span className="text-teal-600">Data Migration</span></nav>
            <h1 className="text-2xl font-black text-slate-900">Data Migration</h1>
            <p className="mt-1 text-sm text-slate-500">Import legacy HRMS employee and master data into the new HRMS database.</p>
          </div>
          {canStart ? (
            <Button icon={<Database size={17} />} onClick={() => setShowConfirmation(true)}>Start Database Insertion</Button>
          ) : null}
        </div>

        <FileUploadCard
          file={file}
          uploadedAt={uploadResult?.file.uploadedAt}
          validationStatus={status?.status}
          uploading={uploading}
          onFile={handleFile}
          onRemove={removeFile}
        />

        {status?.status === "READY" ? (
          <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 text-blue-900 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-bold">Validation complete — records are not inserted yet</p>
              <p className="mt-1 text-xs text-blue-700">{status.valid_records} records are ready. Start database insertion to write them to PostgreSQL.</p>
            </div>
            <Button icon={<Database size={16} />} onClick={() => setShowConfirmation(true)}>Start Database Insertion</Button>
          </div>
        ) : null}

        {validation ? (
          <section>
            <div className="mb-3 flex items-end justify-between">
              <div><h2 className="font-bold text-slate-800">Validation Summary</h2><p className="text-xs text-slate-500">Checks include required fields, data types, lookups, duplicates, and constraints.</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
              {summaryMetrics.map(([label, value, icon, tone]) => <MetricCard key={label} label={label} value={value} icon={icon} tone={tone} />)}
            </div>
          </section>
        ) : null}

        {uploadResult?.sheets.length ? <SheetPreviewSection sheets={uploadResult.sheets} /> : null}

        {status && (status.status === "QUEUED" || status.status === "RUNNING" || terminalStatuses.has(status.status)) ? (
          <>
            {pollError ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{pollError}</div> : null}
            <MigrationProgressPanel status={status} />
          </>
        ) : null}

        {status && terminalStatuses.has(status.status) ? (
          <Card className="border border-slate-200 p-5">
            <div className="mb-4 flex items-center gap-2"><Gauge size={19} className="text-teal-600" /><div><h2 className="font-bold text-slate-800">Migration Summary</h2><p className="text-xs text-slate-500">Final execution totals for this workbook.</p></div></div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
              {[
                ["Total Sheets", status.total_sheets], ["Total Rows", status.total_records],
                ["Inserted", status.inserted_records], ["Updated", status.updated_records],
                ["Skipped", status.skipped_records], ["Failed", status.failed_records],
                ["Execution", formatDuration(status.execution_time_seconds)],
                ["Status", status.status.replace(/_/g, " ")],
              ].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="truncate text-lg font-black text-slate-800" title={String(value)}>{value}</p><p className="text-[11px] text-slate-500">{label}</p></div>)}
            </div>
          </Card>
        ) : null}

        {status ? (
          <Card className="overflow-hidden border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div><h2 className="font-bold text-slate-800">Validation & Processing Errors</h2><p className="mt-1 text-xs text-slate-500">Search, sort, filter, and export row-level exceptions.</p></div>
              <div className="flex flex-wrap gap-2">
                <label className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input value={errorSearch} onChange={(event) => { setErrorSearch(event.target.value); setErrorPage(1); }} placeholder="Search errors…" className="cf-input py-2 pl-9" /></label>
                <select value={severity} onChange={(event) => { setSeverity(event.target.value); setErrorPage(1); }} className="cf-input w-auto py-2"><option value="">All severities</option><option value="ERROR">Errors</option><option value="WARNING">Warnings</option></select>
                <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => download(status.id, "errors", "xlsx")}>Export Errors</Button>
              </div>
            </div>
            <DataTable columns={errorColumns} data={errors} loading={errorsLoading} getRowId={(item) => item.id || `${item.sheet}-${item.row}-${item.column}`} emptyMessage="No validation or processing errors" />
            <Pagination currentPage={errorPage} totalPages={errorPages} totalRecords={errorTotal} pageSize={errorLimit} onPageChange={setErrorPage} onPageSizeChange={(size) => { setErrorLimit(size); setErrorPage(1); }} itemLabel="error rows" />
          </Card>
        ) : null}
        <Card className="overflow-hidden border border-slate-200">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-bold text-slate-800">Migration History</h2><p className="mt-1 text-xs text-slate-500">Previous uploads, outcomes, and downloadable audit reports.</p></div>
            <label className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 text-slate-400" size={16} /><input value={historySearch} onChange={(event) => { setHistorySearch(event.target.value); setHistoryPage(1); }} placeholder="Search file or uploader…" className="cf-input py-2 pl-9" /></label>
          </div>
          <DataTable
            columns={historyColumns}
            data={history}
            loading={historyLoading}
            getRowId={(item) => String(item.id)}
            actions={(item) => (
              <div className="flex min-w-[210px] gap-1.5">
                <button type="button" title="View status" onClick={() => {
                  setFile(null);
                  setUploadResult(null);
                  setOverwriteExisting(false);
                  setShowConfirmation(false);
                  setInitialStatus(item);
                  setStatus(item);
                }} className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100"><Eye size={14} /></button>
                <button type="button" title="Download Excel report" onClick={() => download(item.id, "all", "xlsx")} className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"><Download size={14} /></button>
                <button type="button" title="Download CSV log" onClick={() => download(item.id, "all", "csv")} className="rounded-lg bg-slate-100 px-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200">LOG</button>
              </div>
            )}
            emptyMessage="No migration history yet"
          />
          <Pagination currentPage={historyPage} totalPages={historyPages} totalRecords={historyTotal} pageSize={historyLimit} onPageChange={setHistoryPage} onPageSizeChange={(size) => { setHistoryLimit(size); setHistoryPage(1); }} itemLabel="migrations" />
        </Card>
      </div>

      {showConfirmation && status ? (
        <Modal
          title="Confirm Data Migration"
          onClose={() => setShowConfirmation(false)}
          footer={<><Button variant="secondary" disabled={starting} onClick={() => setShowConfirmation(false)}>Cancel</Button><Button loading={starting} icon={<Database size={16} />} onClick={confirmStart}>Start Migration</Button></>}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Total Records</p><p className="text-2xl font-black text-slate-800">{status.total_records}</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Valid for Processing</p><p className="text-2xl font-black text-emerald-700">{status.valid_records}</p></div>
            </div>
            {uploadResult?.tablesAffected.length ? <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Tables affected</p><div className="flex flex-wrap gap-2">{uploadResult.tablesAffected.map((table) => <code key={table} className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-800">{table}</code>)}</div></div> : null}
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><input type="checkbox" checked={overwriteExisting} onChange={(event) => setOverwriteExisting(event.target.checked)} className="mt-1 h-4 w-4 accent-amber-600" /><span><strong className="block text-sm text-amber-900">Overwrite matching records</strong><span className="text-xs leading-5 text-amber-700">When enabled, existing records with the same unique key are updated. Otherwise they are safely skipped.</span></span></label>
            {status.invalid_records ? <p className="flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700"><AlertTriangle size={16} className="shrink-0" />{status.invalid_records} invalid records will be skipped and included in the report.</p> : null}
          </div>
        </Modal>
      ) : null}
      {showSuccess && status ? (
        <Modal
          title="Migration Completed"
          onClose={() => setShowSuccess(false)}
          footer={<><Button variant="secondary" onClick={() => setShowSuccess(false)}>Close</Button><Button icon={<Download size={16} />} onClick={() => download(status.id, "all", "xlsx")}>Download Report</Button></>}
        >
          <div className="text-center">
            <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 size={36} /></span>
            <h3 className="text-xl font-black text-slate-800">{status.status === "COMPLETED" ? "Migration Completed Successfully" : "Migration Completed with Exceptions"}</h3>
            <p className="mt-2 text-sm text-slate-500">All valid records were processed. Download the report for row-level details.</p>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xl font-black text-emerald-700">{status.inserted_records}</p><p className="text-xs text-slate-500">Inserted</p></div>
              <div className="rounded-xl bg-amber-50 p-3"><p className="text-xl font-black text-amber-700">{status.skipped_records}</p><p className="text-xs text-slate-500">Skipped</p></div>
              <div className="rounded-xl bg-rose-50 p-3"><p className="text-xl font-black text-rose-700">{status.failed_records}</p><p className="text-xs text-slate-500">Failed</p></div>
              <div className="rounded-xl bg-blue-50 p-3"><p className="flex items-center justify-center gap-1 text-xl font-black text-blue-700"><Timer size={18} />{formatDuration(status.execution_time_seconds)}</p><p className="text-xs text-slate-500">Execution</p></div>
            </div>
          </div>
        </Modal>
      ) : null}
    </Layout>
  );
}
