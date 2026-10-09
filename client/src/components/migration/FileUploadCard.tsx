import { useRef, useState } from "react";
import { FileSpreadsheet, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import Card from "../common/Card";
import Button from "../common/Button";

interface Props {
  file: File | null;
  uploadedAt?: string;
  validationStatus?: string;
  uploading: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
};

export default function FileUploadCard({
  file,
  uploadedAt,
  validationStatus,
  uploading,
  onFile,
  onRemove,
}: Props) {
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const choose = (selected?: File) => {
    if (selected) onFile(selected);
  };

  return (
    <Card className="overflow-hidden border border-slate-200">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="font-bold text-slate-800">Upload Excel Workbook</h2>
        <p className="mt-1 text-xs text-slate-500">
          Maximum 25 MB · Microsoft Excel .xlsx only
        </p>
      </div>
      {!file ? (
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            choose(event.dataTransfer.files[0]);
          }}
          className={`m-5 flex min-h-[230px] flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
            dragging
              ? "border-teal-500 bg-teal-50"
              : "border-slate-300 bg-slate-50 hover:border-teal-400"
          }`}
        >
          <span className="mb-4 rounded-2xl bg-gradient-to-br from-blue-950 to-teal-500 p-4 text-white shadow-lg">
            <UploadCloud size={32} />
          </span>
          <p className="text-base font-bold text-slate-800">
            Drag and drop your workbook here
          </p>
          <p className="my-2 text-sm text-slate-500">
            or select it from your computer
          </p>
          <Button onClick={() => inputRef.current?.click()}>
            Browse .xlsx File
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(event) => choose(event.target.files?.[0])}
          />
        </div>
      ) : (
        <div className="m-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center">
          <span className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
            <FileSpreadsheet size={30} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-slate-800">{file.name}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>{formatBytes(file.size)}</span>
              {uploadedAt ? (
                <span>Uploaded {new Date(uploadedAt).toLocaleString()}</span>
              ) : null}
              <span
                className={
                  validationStatus === "READY"
                    ? "font-semibold text-emerald-600"
                    : "font-semibold text-blue-700"
                }
              >
                {uploading
                  ? "Uploading and validating…"
                  : validationStatus || "Selected"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<RotateCcw size={15} />}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              Replace
            </Button>
            <Button
              variant="danger"
              icon={<Trash2 size={15} />}
              disabled={uploading}
              onClick={onRemove}
            >
              Remove
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(event) => choose(event.target.files?.[0])}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
