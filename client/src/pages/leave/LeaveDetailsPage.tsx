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
import "./Style/LeaveDetailsPage.css";

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
    <div className="leave-details-reject-overlay">
      <div className="leave-details-reject-modal">
        <h3 className="leave-details-reject-title">Reject Leave Request</h3>
        <label className="leave-details-reject-label">
          Rejection Reason <span className="leave-details-required">*</span>
        </label>
        <textarea
          value={reason}
          onChange={handleReasonChange}
          rows={4}
          autoFocus
          placeholder="Enter reason for rejection…"
          className="leave-details-reject-textarea"
        />
        <div className="leave-details-reject-actions">
          <button
            onClick={onClose}
            className="leave-details-modal-cancel-button"
          >
            Cancel
          </button>
          <button
            disabled={!reason.trim()}
            onClick={handleRejectClick}
            className="leave-details-modal-reject-button"
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
  const [showCommentTooltip, setShowCommentTooltip] = useState(false);
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
  const COMMENT_PREVIEW_LENGTH = 10;

  const rejectionReason = leave?.rejection_reason ?? "";
  const rejectionReasonPreview =
    rejectionReason.length > STATUS_PREVIEW_LENGTH
      ? `${rejectionReason.slice(0, STATUS_PREVIEW_LENGTH)}...`
      : rejectionReason;

  const commentText = leave?.comments || leave?.reason || "";
  const commentPreview =
    commentText.length > COMMENT_PREVIEW_LENGTH
      ? `${commentText.slice(0, COMMENT_PREVIEW_LENGTH)}...`
      : commentText;
  const hasLongComment = commentText.length > COMMENT_PREVIEW_LENGTH;

  return (
    <LeaveLayout>
      <Toast toasts={toasts} onRemove={removeToast} />
      {showApprove && (
        <LeaveConfirmationModal
          title="Approve Leave Request"
          message="Are you sure you want to approve this leave request?"
          confirmLabel="Yes, Approve"
          cancelLabel="No, Keep Pending"
          confirmButtonClassName="leave-details-confirm-button--approve"
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
          confirmButtonClassName="leave-details-confirm-button--cancel"
          loading={actionLoading}
          onConfirm={handleCancelConfirm}
          onClose={handleCloseCancelModal}
        />
      )}

      <button onClick={handleBackClick} className="leave-details-back-button">
        <ArrowLeft
          size={14}
          aria-hidden="true"
          className="leave-details-back-icon"
        />{" "}
        Back
      </button>

      {loading ? (
        <div className="leave-details-loading">
          <div className="leave-details-loading-spinner" />
        </div>
      ) : !leave ? (
        <div className="leave-details-empty-state">
          <div className="leave-details-empty-icon">📋</div>
          <p className="leave-details-empty-message">
            Leave request not found.
          </p>
        </div>
      ) : (
        <>
          <div className="leave-details-profile-card">
            <div className="leave-details-profile-content">
              {user && leave.user_id === user.id ? (
                <UserAvatar size={48} className="leave-details-avatar" />
              ) : (
                <div className="leave-details-avatar-fallback">
                  {leave.avatar ? (
                    <img
                      src={leave.avatar}
                      className="leave-details-avatar-image"
                      alt=""
                    />
                  ) : (
                    initials(leave.employee_name)
                  )}
                </div>
              )}

              <div className="leave-details-flex-content">
                <h2 className="leave-details-employee-name">
                  {leave.employee_name || "—"}
                </h2>
                {leave.job_title && (
                  <p className="leave-details-job-title">{leave.job_title}</p>
                )}
                <div className="leave-details-meta">
                  <span>
                    <span className="leave-details-meta-label">
                      Requested for:{" "}
                    </span>
                    {leave.start_date}
                    {leave.start_date !== leave.end_date &&
                      ` to ${leave.end_date}`}
                  </span>
                  <span>
                    <span className="leave-details-meta-label">
                      Applied on:{" "}
                    </span>
                    {leave.applied_on ? leave.applied_on.substring(0, 10) : "—"}
                  </span>
                  {leave.employee_id && (
                    <span>
                      <span className="leave-details-meta-label">
                        Employee ID:{" "}
                      </span>
                      {leave.employee_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="leave-details-header-status">
                <StatusBadge status={leave.status} />
              </div>
            </div>
          </div>

          <div className="leave-details-table-card">
            <div className="leave-details-table-wrapper">
              <table className="leave-details-table">
                <colgroup>
                  <col className="leave-details-column leave-details-column--date" />
                  <col className="leave-details-column leave-details-column--type" />
                  <col className="leave-details-column leave-details-column--balance" />
                  <col className="leave-details-column leave-details-column--duration" />
                  <col className="leave-details-column leave-details-column--status" />
                  <col className="leave-details-column leave-details-column--comments" />
                  <col className="leave-details-column leave-details-column--actions" />
                </colgroup>
                <thead>
                  <tr className="leave-details-table-head-row">
                    {[
                      "Date",
                      "Leave Type",
                      "Net Leave Balance",
                      "Duration (Days)",
                      "Status",
                      "Comments",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="leave-details-table-heading">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="leave-details-table-row">
                    <td className="leave-details-table-cell leave-details-table-cell--nowrap">
                      {leave.start_date}
                      {leave.start_date !== leave.end_date && (
                        <span className="leave-details-muted">
                          {" "}
                          → {leave.end_date}
                        </span>
                      )}
                    </td>
                    <td className="leave-details-table-cell">
                      {leave.leave_type}
                    </td>
                    <td className="leave-details-table-cell leave-details-table-cell--compact">
                      <span className="leave-details-balance-value">
                        {Number(leave.net_leave_balance ?? 0).toFixed(2)}
                      </span>
                      <span className="leave-details-balance-unit">day(s)</span>
                    </td>
                    <td className="leave-details-table-cell">
                      {Number(leave.requested_days).toFixed(2)} day(s)
                    </td>
                    <td className="leave-details-table-cell leave-details-table-cell--plain">
                      <StatusBadge status={leave.status} />
                      <br></br>
                      {rejectionReason && (
                        <div className="leave-details-rejection-group">
                          <p>
                            <span className="leave-details-rejection-label">
                              Reason:
                            </span>{" "}
                            {rejectionReasonPreview}
                          </p>
                          <p className="leave-details-rejection-tooltip">
                            {rejectionReason}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="leave-details-table-cell leave-details-comments-cell">
                      {commentText ? (
                        <div
                          tabIndex={hasLongComment ? 0 : undefined}
                          onMouseEnter={() =>
                            hasLongComment && setShowCommentTooltip(true)
                          }
                          onMouseLeave={() => setShowCommentTooltip(false)}
                          onFocus={() =>
                            hasLongComment && setShowCommentTooltip(true)
                          }
                          onBlur={() => setShowCommentTooltip(false)}
                          style={{
                            position: "relative",
                            display: "inline-block",
                            maxWidth: "100%",
                            outline: "none",
                            cursor: hasLongComment ? "pointer" : "default",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              maxWidth: "100%",
                              color: "#475569",
                              whiteSpace: "normal",
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                            }}
                          >
                            {commentPreview}
                          </span>

                          {hasLongComment && (
                            <p
                              role="tooltip"
                              style={{
                                position: "absolute",
                                top: "calc(100% + 0.5rem)",
                                right: 0,
                                zIndex: 60,
                                display: showCommentTooltip ? "block" : "none",
                                width: "max-content",
                                minWidth: "250px",
                                maxWidth: "min(24rem, 70vw)",
                                margin: 0,
                                padding: "0.75rem",
                                color: "#334155",
                                fontSize: "13px",
                                lineHeight: 1.4,
                                whiteSpace: "normal",
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "0.5rem",
                                boxShadow:
                                  "0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%)",
                              }}
                            >
                              {commentText}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="leave-details-placeholder">—</span>
                      )}
                    </td>
                    <td className="leave-details-table-cell leave-details-table-cell--plain leave-details-actions-cell">
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
          </div>

          <div className="leave-details-attachment-card">
            <h3 className="leave-details-attachment-title">Attachment</h3>
            {leave.attachment_path ? (
              <div className="leave-details-attachment-item">
                <div className="leave-details-flex-content">
                  <a
                    href={`/${leave.attachment_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="leave-details-attachment-name"
                  >
                    {leave.attachment_path.split("/").pop()}
                  </a>
                  <span
                    className={`leave-details-attachment-status ${
                      leave.attachment_status === "Available"
                        ? "leave-details-attachment-status--available"
                        : "leave-details-attachment-status--unavailable"
                    }`}
                  >
                    {leave.attachment_status || "Available"}
                  </span>
                </div>
                <a
                  href={`/${leave.attachment_path}`}
                  target="_blank"
                  rel="noreferrer"
                  className="leave-details-download-link"
                >
                  Download
                </a>
              </div>
            ) : (
              <p className="leave-details-no-attachment">
                No attachment uploaded yet.
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xlsx,.xls"
              className="leave-details-file-input"
              onChange={handleFileChange}
            />
            <button
              onClick={handleOpenFilePicker}
              disabled={uploading}
              className="leave-details-upload-button"
            >
              {uploading ? (
                <>
                  <div className="leave-details-upload-spinner" />
                  Uploading…
                </>
              ) : (
                <>
                  <Paperclip
                    size={14}
                    strokeWidth={2.5}
                    className="leave-details-attachment-icon"
                    aria-hidden="true"
                  />
                  FILE ATTACHMENT
                </>
              )}
            </button>
            <p className="leave-details-upload-note">Accepts up to 5 MB</p>
          </div>
        </>
      )}
    </LeaveLayout>
  );
}
