import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserAvatar from "../../components/UserAvatar";
import {
  getLeaveDetails,
  approveLeave,
  rejectLeave,
  cancelLeave,
  uploadLeaveAttachment,
} from "../../api/leave.api";
import { LeaveRequest } from "../../types";
import { getApiErrorMessage } from "../../utils/errors";
import { useAppSelector } from "../../app/hooks";
import LeaveLayout from "./LeaveLayout";
import Toast, { useToast } from "../../components/Toast";

function StatusBadge({ status }: { status: string }) {
  return <span>{status}</span>;
}

function RejectModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-slate-800 mb-4">
          Reject Leave Request
        </h3>
        <label className="block text-xs text-slate-500 mb-1">
          Rejection Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          autoFocus
          placeholder="Enter reason for rejection…"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none resize-none focus:border-blue-400 transition"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelModal({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-slate-800 mb-3">
          Cancel Leave Request
        </h3>
        <p className="text-sm text-slate-600 mb-5">
          Are you sure you want to cancel this leave request?
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer transition"
          >
            No, Keep It
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-white hover:bg-slate-800 cursor-pointer transition"
          >
            Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({
  leave,
  isRequester,
  isAdminOrHR,
  onApprove,
  onReject,
  onCancel,
}: {
  leave: LeaveRequest;
  isRequester: boolean;
  isAdminOrHR: boolean;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.right + window.scrollX,
      });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [open]);

  const isPending = leave.status === "Pending Approval";
  const canApproveReject = isAdminOrHR && !isRequester && isPending;
  const canCancel = isPending && (isRequester || isAdminOrHR);
  const hasAnyAction = canApproveReject || canCancel;

  if (!hasAnyAction) {
    return (
      <button
        disabled
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed opacity-50"
      >
        No Actions
      </button>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition whitespace-nowrap"
      >
        Select Action
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translateX(-100%)",
            zIndex: 9999,
          }}
          className="bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-36"
        >
          {canApproveReject && (
            <button
              onClick={() => {
                setOpen(false);
                onApprove();
              }}
              className="w-full text-left px-4 py-2 text-xs text-green-700 hover:bg-green-50 transition cursor-pointer"
            >
              ✓ Approve
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => {
                setOpen(false);
                onCancel();
              }}
              className="w-full text-left px-4 py-2 text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              ⊘ Cancel
            </button>
          )}
          {canApproveReject && (
            <button
              onClick={() => {
                setOpen(false);
                onReject();
              }}
              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              ✕ Reject
            </button>
          )}
        </div>
      )}
    </>
  );
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default function LeaveDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.user);
  const { toasts, addToast, removeToast } = useToast();

  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const leaveId = parseInt(id || "0");

  const load = async () => {
    if (!leaveId) return;
    setLoading(true);
    try {
      setLeave(await getLeaveDetails(leaveId));
    } catch (err) {
      addToast(
        getApiErrorMessage(err, "Failed to load leave details."),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [leaveId]);

  const isAdminOrHR = user?.role === "empmanager" || user?.role === "hradmin";
  const isRequester = !!(
    leave?.user_id &&
    user?.id &&
    String(leave.user_id) === String(user.id)
  );

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveLeave(leaveId);
      addToast("Leave approved successfully.", "success");
      await load();
    } catch (err) {
      addToast(getApiErrorMessage(err, "Failed to approve leave."), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    setShowReject(false);
    setActionLoading(true);
    try {
      await rejectLeave(leaveId, reason);
      addToast("Leave rejected.", "success");
      await load();
    } catch (err) {
      addToast(getApiErrorMessage(err, "Failed to reject leave."), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    setShowCancel(false);
    setActionLoading(true);
    try {
      await cancelLeave(leaveId);
      addToast("Leave cancelled.", "success");
      await load();
    } catch (err) {
      addToast(getApiErrorMessage(err, "Failed to cancel leave."), "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast("File exceeds 5 MB limit.", "error");
      return;
    }
    setUploading(true);
    try {
      await uploadLeaveAttachment(leaveId, file);
      addToast("Attachment uploaded successfully.", "success");
      await load();
    } catch (err) {
      addToast(getApiErrorMessage(err, "Upload failed."), "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />
      {showReject && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onClose={() => setShowReject(false)}
        />
      )}
      {showCancel && (
        <CancelModal
          onConfirm={handleCancelConfirm}
          onClose={() => setShowCancel(false)}
        />
      )}

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 mb-4 cursor-pointer bg-transparent border-none transition"
      >
        ← Back
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !leave ? (
        <div className="text-center py-24 text-slate-400">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm">Leave request not found.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
            <div className="flex items-start gap-4">
              {user && leave.user_id === user.id ? (
                <UserAvatar size={48} className="flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-900 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden">
                  {leave.avatar ? (
                    <img
                      src={leave.avatar}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    initials(leave.employee_name)
                  )}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-slate-900 mb-0.5">
                  {leave.employee_name || "—"}
                </h2>
                {leave.job_title && (
                  <p className="text-xs text-slate-500 mb-2">
                    {leave.job_title}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
                  <span>
                    <span className="font-medium text-slate-500">
                      Requested for:{" "}
                    </span>
                    {leave.start_date}
                    {leave.start_date !== leave.end_date &&
                      ` to ${leave.end_date}`}
                  </span>
                  <span>
                    <span className="font-medium text-slate-500">
                      Applied on:{" "}
                    </span>
                    {leave.applied_on ? leave.applied_on.substring(0, 10) : "—"}
                  </span>
                  {leave.employee_id && (
                    <span>
                      <span className="font-medium text-slate-500">
                        Employee ID:{" "}
                      </span>
                      {leave.employee_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <StatusBadge status={leave.status} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-100">
                    {[
                      "Date",
                      "Leave Type",
                      "Net Leave Balance",
                      "Duration (Days)",
                      "Status",
                      "Comments",
                      "Actions",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-xs font-bold text-slate-600 whitespace-nowrap"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-700 whitespace-nowrap">
                      {leave.start_date}
                      {leave.start_date !== leave.end_date && (
                        <span className="text-slate-400">
                          {" "}
                          → {leave.end_date}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {leave.leave_type}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-blue-700 font-semibold">
                        {Number(leave.net_leave_balance ?? 0).toFixed(2)}
                      </span>
                      <span className="text-slate-400 ml-1">day(s)</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {Number(leave.requested_days).toFixed(2)} day(s)
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={leave.status} />
                      {leave.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1 max-w-40 break-words">
                          Reason: {leave.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-40">
                      {leave.comments || leave.reason || (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {actionLoading ? (
                        <div className="w-4 h-4 border-2 border-blue-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ActionMenu
                          leave={leave}
                          isRequester={isRequester}
                          isAdminOrHR={isAdminOrHR}
                          onApprove={handleApprove}
                          onReject={() => setShowReject(true)}
                          onCancel={() => setShowCancel(true)}
                        />
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <button className="text-xs text-teal-600 hover:underline cursor-pointer bg-transparent border-none">
                View Leave Request Comments
              </button>
              <button
                onClick={load}
                className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-900 to-teal-600 text-white text-xs font-semibold cursor-pointer hover:opacity-90 transition"
              >
                SAVE
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">
              Attachment
            </h3>
            {leave.attachment_path ? (
              <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-2xl">📎</span>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/${leave.attachment_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-700 hover:underline font-medium truncate block"
                  >
                    {leave.attachment_path.split("/").pop()}
                  </a>
                  <span
                    className={`text-xs mt-0.5 inline-block px-2 py-0.5 rounded-full font-medium ${leave.attachment_status === "Available" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}
                  >
                    {leave.attachment_status || "Available"}
                  </span>
                </div>
                <a
                  href={`/${leave.attachment_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-700 hover:text-blue-900 px-3 py-1.5 border border-blue-200 rounded-lg no-underline transition"
                >
                  View
                </a>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4">
                No attachment uploaded yet.
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-900 to-teal-600 text-white text-xs font-semibold rounded-lg cursor-pointer hover:opacity-90 transition disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>📎 FILE ATTACHMENT</>
              )}
            </button>
            <p className="text-xs text-slate-400 mt-2">Accepts up to 5 MB</p>
          </div>
        </>
      )}
    </LeaveLayout>
  );
}
