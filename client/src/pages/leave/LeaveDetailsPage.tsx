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
import {
  ADMIN_ROLES,
  SUPERVISOR_ROLES,
  type UserRole,
} from "../../config/roles";

import LeaveActionDropdown from "./components/LeaveActionDropdown";
import LeaveConfirmationModal from "./components/LeaveConfirmationModal";
import { Paperclip, ArrowLeft } from "lucide-react";

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

  const handleReasonChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setReason(event.target.value);
  };

  const handleRejectClick = () => {
    const trimmedReason = reason.trim();

    if (!trimmedReason) return;

    onConfirm(trimmedReason);
  };
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
          onChange={handleReasonChange}
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
            onClick={handleRejectClick}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer transition disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
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
  const [showApprove, setShowApprove] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const leaveId = Number.parseInt(id || "0", 10);

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

  const isAdminOrHR =
    ADMIN_ROLES.includes((user?.role || "") as (typeof ADMIN_ROLES)[number]) ||
    SUPERVISOR_ROLES.includes((user?.role || "") as UserRole);

  const isRequester = !!(
    leave?.user_id &&
    user?.id &&
    String(leave.user_id) === String(user.id)
  );

  const isPending = leave?.status === "Pending Approval";
  const canApproveReject = Boolean(isAdminOrHR && !isRequester && isPending);
  const canCancel = Boolean(isPending && (isRequester || isAdminOrHR));

  const handleApproveConfirm = async () => {
    setShowApprove(false);
    setActionLoading(true);
    try {
      await approveLeave(leaveId);
      addToast("Leave approved successfully.", "success");
      await load();
    } catch (err: any) {
      const errorMessage = getApiErrorMessage(err, "Failed to approve leave.");
      addToast(errorMessage, "error");
      // If conflict error (409), refresh to show current status
      if (err?.response?.status === 409) {
        await load();
      }
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
    } catch (err: any) {
      const errorMessage = getApiErrorMessage(err, "Failed to reject leave.");
      addToast(errorMessage, "error");
      // If conflict error (409), refresh to show current status
      if (err?.response?.status === 409) {
        await load();
      }
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
    } catch (err: any) {
      const errorMessage = getApiErrorMessage(err, "Failed to cancel leave.");
      addToast(errorMessage, "error");
      // If conflict error (409), refresh to show current status
      if (err?.response?.status === 409) {
        await load();
      }
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

  const handleOpenApproveModal = () => {
    setShowApprove(true);
  };

  const handleCloseApproveModal = () => {
    setShowApprove(false);
  };

  const handleOpenRejectModal = () => {
    setShowReject(true);
  };

  const handleCloseRejectModal = () => {
    setShowReject(false);
  };

  const handleOpenCancelModal = () => {
    setShowCancel(true);
  };

  const handleCloseCancelModal = () => {
    setShowCancel(false);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const STATUS_PREVIEW_LENGTH = 10;
  const rejectionReason = leave?.rejection_reason ?? "";
  const rejectionReasonPreview =
    leave?.rejection_reason &&
    leave.rejection_reason.length > STATUS_PREVIEW_LENGTH
      ? `${leave.rejection_reason?.slice(0, STATUS_PREVIEW_LENGTH)}...`
      : leave?.rejection_reason;

  const LeaveLength =
    leave?.comments?.trim() ?? "".length > STATUS_PREVIEW_LENGTH;
  const LeaveCommandSlice = `${leave?.comments?.slice(0, 10)}...`;

  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />
      {showApprove && (
        <LeaveConfirmationModal
          title="Approve Leave Request"
          message="Are you sure you want to approve this leave request?"
          confirmLabel="Yes, Approve"
          cancelLabel="No, Keep Pending"
          confirmButtonClassName="bg-green-600 hover:bg-green-700"
          loading={actionLoading}
          onConfirm={handleApproveConfirm}
          onClose={handleCloseApproveModal}
        />
      )}
      {showReject && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onClose={handleCloseRejectModal}
        />
      )}
      {showCancel && (
        <LeaveConfirmationModal
          title="Cancel Leave Request"
          message="Are you sure you want to cancel this leave request?"
          confirmLabel="Yes, Cancel"
          cancelLabel="No, Keep It"
          confirmButtonClassName="bg-red-600 hover:bg-red-700"
          loading={actionLoading}
          onConfirm={handleCancelConfirm}
          onClose={handleCloseCancelModal}
        />
      )}

      <button
        onClick={handleBackClick}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-700 mb-4 cursor-pointer bg-transparent border-none transition"
      >
        <ArrowLeft
          size={14}
          aria-hidden="true"
          style={{ position: "relative", top: "1px" }}
        />{" "}
        Back
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
              <div className="flex-shrink-0 font-medium text-slate-500">
                <StatusBadge status={leave.status} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-visible">
            <div className="overflow-visible">
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
                      <br></br>
                      {rejectionReason && (
                        <div className="relative inline-block group">
                          <p>
                            <span className="text-xs text-red-500 mt-1 max-w-40 break-words cursor-pointer">
                              Reason:
                            </span>{" "}
                            {rejectionReasonPreview}
                          </p>
                          <p className="absolute left-0 top-full z-50 mt-2 hidden min-w-[250px] max-w-sm rounded-lg border border-slate-200 bg-white p-3 text-[13px] text-slate-700 shadow-lg whitespace-normal break-words group-hover:block">
                            {rejectionReason}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="relative max-w-40 px-4 py-3 text-xs text-slate-600">
                      {LeaveLength ? (
                        <div className="group relative">
                          <p className="cursor-pointer truncate">
                            {LeaveCommandSlice}
                          </p>
                          <div className="absolute left-0 top-full z-50 mt-2 hidden w-64 whitespace-normal break-words rounded-lg border border-slate-200 bg-white p-3 text-[13px] text-slate-700 shadow-lg group-hover:block">
                            {leave.comments || leave.reason}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <LeaveActionDropdown
                        canApproveReject={canApproveReject}
                        canCancel={canCancel}
                        loading={actionLoading}
                        onApprove={handleOpenApproveModal}
                        onReject={handleOpenRejectModal}
                        onCancel={handleOpenCancelModal}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
              <button className="text-xs text-teal-600 hover:underline cursor-pointer bg-transparent border-none">
                View Leave Request Comments
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">
              Attachment
            </h3>
            {leave.attachment_path ? (
              <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
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
                  Download
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
              onClick={handleOpenFilePicker}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-900 to-teal-600 text-white text-xs font-semibold rounded-lg cursor-pointer hover:opacity-90 transition disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Paperclip
                    size={14}
                    strokeWidth={2.5}
                    className="text-white"
                    aria-hidden="true"
                  />
                  FILE ATTACHMENT
                </>
              )}
            </button>
            <p className="text-xs text-slate-400 mt-2">Accepts up to 5 MB</p>
          </div>
        </>
      )}
    </LeaveLayout>
  );
}
