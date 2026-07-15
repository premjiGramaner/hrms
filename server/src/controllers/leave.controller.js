import ExcelJS from "exceljs";
import * as LeaveModel from "../models/leave.model.js";
import { resetExpiredEntitlements } from "../models/entitlement.model.js";
import { success, created, error } from "../utils/response.js";

const getLeaveTypes = async (req, res, next) => {
  try {
    const types = await LeaveModel.findAllLeaveTypes();
    return success(res, types);
  } catch (err) {
    next(err);
  }
};

const getLeaveBalance = async (req, res, next) => {
  try {
    // Reset used_days for any entitlement periods that have already ended so
    // the balance cards on /leave/apply always show 0 for expired periods.
    await resetExpiredEntitlements().catch(() => {});
    const employeeId = req.query.employee_id || req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const balance = await LeaveModel.getLeaveBalance(employeeId, year);
    return success(res, balance);
  } catch (err) {
    next(err);
  }
};

const getLeaveFilterOptions = async (_req, res, next) => {
  try {
    const options = await LeaveModel.findLeaveFilterOptions();
    return success(res, options);
  } catch (err) {
    next(err);
  }
};

const searchEmployees = async (req, res, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return success(res, []);
    const employees = await LeaveModel.searchEmployees(q);
    return success(res, employees);
  } catch (err) {
    next(err);
  }
};

const listLeaves = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const role = req.user.role;

    const filters = {
      from_date: req.query.from_date || null,
      to_date: req.query.to_date || null,
      employee_id: req.query.employee_id || null,
      employee_name: req.query.employee_name || null,
      sub_unit: req.query.sub_unit || null,
      location: req.query.location || null,
      leave_type_id: req.query.leave_type_id
        ? parseInt(req.query.leave_type_id)
        : null,
      job_title: req.query.job_title || null,
      employment_status: req.query.employment_status || null,
      job_category: req.query.job_category || null,
      attachment_status: req.query.attachment_status || null,
      include_past: req.query.include_past === "true",
      only_subordinates: req.query.only_subordinates === "true",
      supervisor_id: req.user.id,
    };

    const rawStatuses = req.query.statuses;
    if (rawStatuses) {
      filters.statuses = Array.isArray(rawStatuses)
        ? rawStatuses
        : String(rawStatuses)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    if (role === "employee") {
      // Employees are always restricted to their own leaves only.
      filters.own_employee_id = req.user.id;
    } else if (req.query.own_employee_id) {
      // Admins / supervisors may pass own_employee_id to fetch only their own
      // leaves (e.g. the "Last Leave Taken" card on the Apply Leave page).
      // Use Number() on both sides to avoid strict-equality type mismatches.
      const requestedId = Number(req.query.own_employee_id);
      if (!isNaN(requestedId) && requestedId === Number(req.user.id)) {
        filters.own_employee_id = Number(req.user.id);
      }
    }

    const result = await LeaveModel.findLeaveRequests(filters, page, limit);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getLeave = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, "Leave request not found", 404);
    if (req.user.role === "employee" && leave.employee_id !== req.user.id) {
      return error(res, "Forbidden", 403);
    }
    return success(res, leave);
  } catch (err) {
    next(err);
  }
};

const getLeaveDetails = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return error(res, "Invalid leave ID", 400);
    const leave = await LeaveModel.findLeaveDetails(id);
    if (!leave) return error(res, "Leave request not found", 404);
    if (
      req.user.role === "employee" &&
      Number(leave.user_id) !== Number(req.user.id)
    ) {
      return error(res, "Forbidden", 403);
    }
    return success(res, leave);
  } catch (err) {
    next(err);
  }
};

const uploadLeaveAttachment = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return error(res, "Invalid leave ID", 400);
    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, "Leave request not found", 404);
    if (req.user.role === "employee" && leave.employee_id !== req.user.id) {
      return error(res, "Forbidden", 403);
    }
    if (!req.file) return error(res, "No file uploaded", 400);
    const relativePath = `uploads/${req.file.filename}`;
    await LeaveModel.updateLeaveAttachment(id, relativePath);
    return success(res, {
      message: "Attachment uploaded successfully",
      attachment_path: relativePath,
    });
  } catch (err) {
    next(err);
  }
};

const createLeave = async (req, res, next) => {
  try {
    const employeeId =
      req.user.role === "employee"
        ? req.user.id
        : req.body.employee_id || req.user.id;
    if (!employeeId || parseInt(employeeId) <= 0) {
      return error(
        res,
        "Please specify the employee for this leave request",
        422,
      );
    }
    const data = { ...req.body, employee_id: parseInt(employeeId) };
    const requestedDays = parseFloat(data.requested_days) || 1;
    const leaveTypeId = parseInt(data.leave_type_id);
    const startDate = new Date(data.start_date);
    const year =
      startDate.getMonth() >= 3
        ? startDate.getFullYear() + 1
        : startDate.getFullYear();

    const overlap = await LeaveModel.checkLeaveOverlap(
      data.employee_id,
      data.start_date,
      data.end_date,
    );
    if (overlap) {
      return error(
        res,
        "A leave request already exists for the selected date(s).",
        400,
      );
    }

    const netBalance = await LeaveModel.getNetBalance(
      data.employee_id,
      leaveTypeId,
      year,
    );
    if (netBalance === null) {
      return error(
        res,
        "No entitlement found for the selected leave type and period. Please contact HR.",
        422,
      );
    }
    if (Number(netBalance) < requestedDays) {
      return error(
        res,
        `Insufficient leave balance. Available: ${Number(netBalance).toFixed(2)} day(s), requested: ${requestedDays}.`,
        422,
      );
    }

    const leave = await LeaveModel.createLeaveRequestWithDeduction(
      data,
      leaveTypeId,
      year,
      requestedDays,
    );
    return created(res, {
      message: "Leave request submitted successfully",
      id: leave.id,
    });
  } catch (err) {
    next(err);
  }
};

const approveLeave = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, "Leave request not found", 404);

    const actorId = req.user.id;
    const actorRole = req.user.role;

    const PRIVILEGED_ROLES = ["empmanager", "hradmin", "supervisor", "manager", "line_manager", "reporting_manager"];
    if (!PRIVILEGED_ROLES.includes(actorRole))
      return error(res, "You do not have permission to approve leave requests", 403);
    if (actorId > 0 && String(leave.employee_id) === String(actorId))
      return error(res, "You cannot approve your own leave request", 403);
    if (leave.status === "Cancelled")
      return error(res, "Cannot approve a cancelled leave", 400);

    const approved = await LeaveModel.approveLeave(id, actorId);
    if (!approved) return error(res, "Failed to approve leave", 500);

    return success(res, { message: "Leave approved successfully" });
  } catch (err) {
    next(err);
  }
};

const rejectLeave = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rejection_reason } = req.body;
    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, "Leave request not found", 404);

    const actorId = req.user.id;
    const actorRole = req.user.role;

    const PRIVILEGED_ROLES = ["empmanager", "hradmin", "supervisor", "manager", "line_manager", "reporting_manager"];
    if (!PRIVILEGED_ROLES.includes(actorRole))
      return error(res, "You do not have permission to reject leave requests", 403);
    if (actorId > 0 && String(leave.employee_id) === String(actorId))
      return error(res, "You cannot reject your own leave request", 403);
    if (["Cancelled", "Rejected"].includes(leave.status)) {
      return error(
        res,
        `Cannot reject a leave that is already ${leave.status.toLowerCase()}`,
        400,
      );
    }

    await LeaveModel.rejectLeave(id, actorId, rejection_reason);
    return success(res, { message: "Leave rejected successfully" });
  } catch (err) {
    next(err);
  }
};

const cancelLeave = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, "Leave request not found", 404);

    const actorId = parseInt(req.user.id);
    const actorRole = req.user.role;
    const leaveEmployeeId = parseInt(leave.employee_id);
    const isOwner = leaveEmployeeId === actorId;
    const isPrivileged = ["empmanager", "hradmin", "supervisor", "manager", "line_manager", "reporting_manager"].includes(actorRole);

    if (!isOwner && !isPrivileged) {
      return error(res, "Forbidden", 403);
    }

    if (leave.status === "Cancelled") {
      return error(res, "Leave is already cancelled", 400);
    }

    if (isOwner && !isPrivileged && leave.status !== "Pending Approval") {
      return error(
        res,
        "This leave request has already been processed and cannot be cancelled.",
        400,
      );
    }

    const starting_date = new Date(leave.start_date);
    const year =
      starting_date.getMonth() >= 3
        ? starting_date.getFullYear() + 1
        : starting_date.getFullYear();
    await LeaveModel.restoreLeaveBalance(
      leave.employee_id,
      leave.leave_type_id,
      year,
      leave.requested_days,
    );

    const cancelled = await LeaveModel.cancelLeave(id, actorId);
    if (!cancelled) return error(res, "Failed to cancel leave", 500);

    return success(res, { message: "Leave cancelled successfully" });
  } catch (err) {
    next(err);
  }
};

function buildExportFilters(query, userId, role) {
  const filters = {
    from_date: query.from_date || null,
    to_date: query.to_date || null,
    sub_unit: query.sub_unit || null,
    location: query.location || null,
    leave_type_id: query.leave_type_id ? parseInt(query.leave_type_id) : null,
    job_title: query.job_title || null,
    employment_status: query.employment_status || null,
    job_category: query.job_category || null,
    attachment_status: query.attachment_status || null,
    include_past: query.include_past === "true",
  };
  if (query.statuses) {
    filters.statuses = Array.isArray(query.statuses)
      ? query.statuses
      : String(query.statuses)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
  }
  if (role === "employee") filters.own_employee_id = userId;
  return filters;
}

const exportSummary = async (req, res, next) => {
  try {
    const filters = buildExportFilters(req.query, req.user.id, req.user.role);
    const rows = await LeaveModel.getLeavesSummaryForExport(filters);

    const wb = new ExcelJS.Workbook();
    wb.creator = "HRMS";
    wb.created = new Date();
    const ws = wb.addWorksheet("Leave Summary");

    ws.mergeCells("A1:H1");
    const t = ws.getCell("A1");
    t.value = "Leave Summary Report";
    t.font = { bold: true, size: 14, color: { argb: "FF1B2A6B" } };
    t.alignment = { horizontal: "center" };
    ws.mergeCells("A2:H2");
    const s = ws.getCell("A2");
    s.value = `Generated: ${new Date().toLocaleString()}`;
    s.font = { size: 9, color: { argb: "FF666666" } };
    s.alignment = { horizontal: "center" };
    ws.addRow([]);

    const hdr = ws.addRow([
      "Start Date",
      "End Date",
      "Applied On",
      "Employee Id",
      "Employee Name",
      "Job Title",
      "Employment Status",
      "Sub Unit",
      "Location",
      "Job Category",
      "Work Schedule",
      "Leave Type",
      "Unit",
      "Entitlements",
      "Net Leave Balance",
      "Requested Duration",
      "Status",
      "Attachment Status",
      "Comments",
    ]);
    hdr.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B2A6B" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    hdr.height = 20;
    ws.columns = [
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 16 },
      { width: 14 },
      { width: 24 },
      { width: 20 },
      { width: 20 },
      { width: 20 },
      { width: 18 },
      { width: 20 },
      { width: 18 },
      { width: 18 },
      { width: 8 },
      { width: 12 },
      { width: 8 },
      { width: 18 },
      { width: 18 },
      { width: 16 },
      { width: 18 },
      { width: 30 },
    ];

    rows.forEach((row, idx) => {
      const dr = ws.addRow([
        row.start_date || "",
        row.end_date || "",
        row.applied_on ? row.applied_on.substring(0, 10) : "",
        row.employee_id || "",
        row.employee_name || "",
        row.job_title || "",
        row.employment_status || "",
        row.sub_unit || "",
        row.location || "",
        row.job_category || "",
        row.work_schedule || "",
        row.leave_type || "",
        row.unit || "",
        row.entitlements ? Number(row.entitlements) : "",
        row.net_leave_balance ? Number(row.net_leave_balance) : "",
        row.requested_days ? Number(row.requested_days) : "",
        row.status || "",
        row.attachment_status || "",
        row.comments || "",
      ]);
      const bg = idx % 2 === 0 ? "FFF8F9FA" : "FFFFFFFF";
      dr.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bg },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = { vertical: "middle" };
      });
      dr.height = 16;
    });
    if (rows.length === 0) ws.addRow(["No records found."]);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="leave_summary.xlsx"',
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

const exportDetail = async (req, res, next) => {
  try {
    const filters = buildExportFilters(req.query, req.user.id, req.user.role);
    const rows = await LeaveModel.getLeavesDetailForExport(filters);

    const wb = new ExcelJS.Workbook();
    wb.creator = "HRMS";
    wb.created = new Date();
    const ws = wb.addWorksheet("Leave Detail");

    ws.mergeCells("A1:I1");
    const t = ws.getCell("A1");
    t.value = "Leave Detail Report";
    t.font = { bold: true, size: 14, color: { argb: "FF1B2A6B" } };
    t.alignment = { horizontal: "center" };
    ws.mergeCells("A2:I2");
    const s = ws.getCell("A2");
    s.value = `Generated: ${new Date().toLocaleString()}`;
    s.font = { size: 9, color: { argb: "FF666666" } };
    s.alignment = { horizontal: "center" };
    ws.addRow([]);

    const hdr = ws.addRow([
      "Date",
      "Applied On",
      "Employee Id",
      "Employee Name",
      "Job Title",
      "Employment Status",
      "Sub Unit",
      "Location",
      "Job Category",
      "Work Schedule",
      "Leave Type",
      "Unit",
      "Entitlements",
      "Net Leave Balance",
      "Duration (Hours)",
      "Status",
      "Attachment Status",
      "Comments",
    ]);
    hdr.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B2A6B" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    hdr.height = 20;
    ws.columns = [
      { width: 14 }, // Date
      { width: 16 }, // Applied On
      { width: 14 }, // Employee Id
      { width: 24 }, // Employee Name
      { width: 20 }, // Job Title
      { width: 20 }, // Employment Status
      { width: 20 }, // Sub Unit
      { width: 18 }, // Location
      { width: 20 }, // Job Category
      { width: 18 }, // Work Schedule
      { width: 18 }, // Leave Type
      { width: 8 }, // Unit
      { width: 12 }, // Entitlements
      { width: 18 }, // Net Leave Balance
      { width: 16 }, // Duration (Hours)
      { width: 16 }, // Status
      { width: 18 }, // Attachment Status
      { width: 30 }, // Comments
    ];

    rows.forEach((row, idx) => {
      const dr = ws.addRow([
        row.start_date || "",
        row.applied_on ? row.applied_on.substring(0, 10) : "",
        row.employee_id || "",
        row.employee_name || "",
        row.job_title || "",
        row.employment_status || "",
        row.sub_unit || "",
        row.location || "",
        row.job_category || "",
        row.work_schedule || "",
        row.leave_type || "",
        row.unit || "",
        row.entitlements ? Number(row.entitlements) : "",
        // row.used ? Number(row.used) : "",
        row.net_leave_balance ? Number(row.net_leave_balance) : "",
        row.duration_hours ? Number(row.duration_hours) : "",
        row.status || "",
        row.attachment_status || "",
        row.comments || "",
      ]);
      const bg = idx % 2 === 0 ? "FFF8F9FA" : "FFFFFFFF";
      dr.eachCell((cell, colNum) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: bg },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = { vertical: "middle", wrapText: colNum === 18 };
        if (colNum === 15 && row.status) {
          const statusColors = {
            Approved: "FF16A085",
            "Pending Approval": "FFD97706",
            Rejected: "FFE53E3E",
            Cancelled: "FF94A3B8",
            Scheduled: "FF3B82F6",
            Taken: "FF7C3AED",
          };
          if (statusColors[row.status]) {
            cell.font = {
              color: { argb: statusColors[row.status] },
              bold: true,
            };
          }
        }
      });
      dr.height = 16;
    });
    if (rows.length === 0) ws.addRow(["No records found."]);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="leave_detail.xlsx"',
    );
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

export {
  getLeaveTypes,
  getLeaveBalance,
  getLeaveFilterOptions,
  searchEmployees,
  listLeaves,
  getLeave,
  getLeaveDetails,
  uploadLeaveAttachment,
  createLeave,
  approveLeave,
  rejectLeave,
  cancelLeave,
  exportSummary,
  exportDetail,
};
