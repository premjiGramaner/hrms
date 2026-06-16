import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as LeaveModel from '../models/leave.model.js';
import { success, created, error } from '../utils/response.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const employeeId = req.query.employee_id || req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const balance = await LeaveModel.getLeaveBalance(employeeId, year);
    return success(res, balance);
  } catch (err) {
    next(err);
  }
};


const listLeaves = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const role  = req.user.role;

    const filters = {
      from_date:         req.query.from_date         || null,
      to_date:           req.query.to_date           || null,
      employee_id:       req.query.employee_id       || null,
      employee_name:     req.query.employee_name     || null,
      sub_unit:          req.query.sub_unit          || null,
      location:          req.query.location          || null,
      leave_type_id:     req.query.leave_type_id     ? parseInt(req.query.leave_type_id) : null,
      job_title:         req.query.job_title         || null,
      employment_status: req.query.employment_status || null,
      job_category:      req.query.job_category      || null,
      attachment_status: req.query.attachment_status || null,
      include_past:      req.query.include_past === 'true',
      only_subordinates: req.query.only_subordinates === 'true',
      supervisor_id:     req.user.id,
    };

    const rawStatuses = req.query.statuses;
    if (rawStatuses) {
      filters.statuses = Array.isArray(rawStatuses)
        ? rawStatuses
        : String(rawStatuses).split(',').map(s => s.trim()).filter(Boolean);
    }

    if (role === 'employee') {
      filters.own_employee_id = req.user.id;
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
    if (!leave) return error(res, 'Leave request not found', 404);

    if (req.user.role === 'employee' && leave.employee_id !== req.user.id) {
      return error(res, 'Forbidden', 403);
    }
    return success(res, leave);
  } catch (err) {
    next(err);
  }
};

const getLeaveDetails = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return error(res, 'Invalid leave ID', 400);

    const leave = await LeaveModel.findLeaveDetails(id);
    if (!leave) return error(res, 'Leave request not found', 404);

    if (req.user.role === 'employee' && leave.user_id !== req.user.id) {
      return error(res, 'Forbidden', 403);
    }
    return success(res, leave);
  } catch (err) {
    next(err);
  }
};

const uploadLeaveAttachment = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return error(res, 'Invalid leave ID', 400);

    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, 'Leave request not found', 404);

    if (req.user.role === 'employee' && leave.employee_id !== req.user.id) {
      return error(res, 'Forbidden', 403);
    }

    if (!req.file) return error(res, 'No file uploaded', 400);

    const relativePath = `uploads/${req.file.filename}`;
    await LeaveModel.updateLeaveAttachment(id, relativePath);

    return success(res, {
      message: 'Attachment uploaded successfully',
      attachment_path: relativePath,
    });
  } catch (err) {
    next(err);
  }
};

const createLeave = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'employee'
      ? req.user.id
      : (req.body.employee_id || req.user.id);

    if (!employeeId || parseInt(employeeId) <= 0) {
      return error(res, 'Please specify the employee for this leave request', 422);
    }

    const data = {
      ...req.body,
      employee_id: parseInt(employeeId),
    };

    const leave = await LeaveModel.createLeaveRequest(data);
    return created(res, { message: 'Leave request submitted successfully', id: leave.id });
  } catch (err) {
    next(err);
  }
};

const approveLeave = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, 'Leave request not found', 404);

    const requesterId = leave.employee_id;
    const actorId = req.user.id;
    const actorRole = req.user.role;

    if (actorRole === 'employee') {
      return error(res, 'Employees cannot approve leave requests', 403);
    }
    if (actorId > 0 && requesterId === actorId) {
      return error(res, 'You cannot approve your own leave request', 403);
    }
    if (leave.status === 'Cancelled') {
      return error(res, 'Cannot approve a cancelled leave', 400);
    }

    const wasApproved = ['Approved', 'Taken'].includes(leave.status);
    const approved = await LeaveModel.approveLeave(id, actorId);
    if (!approved) return error(res, 'Failed to approve leave', 500);

    if (!wasApproved) {
      try {
        await LeaveModel.deductLeaveBalance(
          approved.employee_id,
          approved.leave_type_id,
          approved.leave_year,
          approved.requested_days
        );
      } catch {}
    }

    return success(res, { message: 'Leave approved successfully' });
  } catch (err) {
    next(err);
  }
};

const rejectLeave = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { rejection_reason } = req.body;

    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, 'Leave request not found', 404);

    const actorId = req.user.id;
    const actorRole = req.user.role;

    if (actorRole === 'employee') {
      return error(res, 'Employees cannot reject leave requests', 403);
    }
    if (actorId > 0 && leave.employee_id === actorId) {
      return error(res, 'You cannot reject your own leave request', 403);
    }
    if (leave.status === 'Cancelled') {
      return error(res, 'Cannot reject a cancelled leave', 400);
    }

    if (['Approved', 'Taken'].includes(leave.status)) {
      try {
        const year = new Date(leave.start_date).getFullYear();
        await LeaveModel.restoreLeaveBalance(leave.employee_id, leave.leave_type_id, year, leave.requested_days);
      } catch {}
    }

    await LeaveModel.rejectLeave(id, actorId, rejection_reason);
    return success(res, { message: 'Leave rejected successfully' });
  } catch (err) {
    next(err);
  }
};

const cancelLeave = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const leave = await LeaveModel.findLeaveById(id);
    if (!leave) return error(res, 'Leave request not found', 404);

    if (req.user.role === 'employee' && leave.employee_id !== req.user.id) {
      return error(res, 'Forbidden', 403);
    }

    const wasApproved = ['Approved', 'Taken'].includes(leave.status);

    const cancelled = await LeaveModel.cancelLeave(id, req.user.id);
    if (!cancelled) return error(res, 'Failed to cancel leave', 500);

    if (wasApproved) {
      try {
        const year = new Date(leave.start_date).getFullYear();
        await LeaveModel.restoreLeaveBalance(
          cancelled.employee_id,
          cancelled.leave_type_id,
          year,
          leave.requested_days
        );
      } catch {
      }
    }

    return success(res, { message: 'Leave cancelled successfully' });
  } catch (err) {
    next(err);
  }
};

function buildExportFilters(query, userId, role) {
  const filters = {
    from_date:         query.from_date         || null,
    to_date:           query.to_date           || null,
    sub_unit:          query.sub_unit          || null,
    location:          query.location          || null,
    leave_type_id:     query.leave_type_id     ? parseInt(query.leave_type_id) : null,
    job_title:         query.job_title         || null,
    employment_status: query.employment_status || null,
    job_category:      query.job_category      || null,
    attachment_status: query.attachment_status || null,
    include_past:      query.include_past === 'true',
  };
  if (query.statuses) {
    filters.statuses = Array.isArray(query.statuses)
      ? query.statuses
      : String(query.statuses).split(',').map(s => s.trim()).filter(Boolean);
  }
  if (role === 'employee') {
    filters.own_employee_id = userId;
  }
  return filters;
}

const exportSummary = async (req, res, next) => {
  try {
    const filters = buildExportFilters(req.query, req.user.id, req.user.role);
    const rows = await LeaveModel.getLeavesSummaryForExport(filters);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'HRMS';
    wb.created = new Date();

    const ws = wb.addWorksheet('Leave Summary');

    ws.mergeCells('A1:H1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'Leave Summary Report';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1B2A6B' } };
    titleCell.alignment = { horizontal: 'center' };

    ws.mergeCells('A2:H2');
    const subCell = ws.getCell('A2');
    subCell.value = `Generated: ${new Date().toLocaleString()}`;
    subCell.font = { size: 9, color: { argb: 'FF666666' } };
    subCell.alignment = { horizontal: 'center' };

    ws.addRow([]); // blank spacer

    const headerRow = ws.addRow([
      'Employee ID', 'Employee Name', 'Leave Type',
      'Total Requests', 'Total Days', 'Approved Days', 'Pending Days', 'Rejected Days',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    headerRow.height = 20;

    ws.columns = [
      { key: 'employee_id',   width: 14 },
      { key: 'employee_name', width: 24 },
      { key: 'leave_type',    width: 22 },
      { key: 'total_requests',width: 14 },
      { key: 'total_days',    width: 12 },
      { key: 'approved_days', width: 14 },
      { key: 'pending_days',  width: 13 },
      { key: 'rejected_days', width: 13 },
    ];

    rows.forEach((row, idx) => {
      const dataRow = ws.addRow([
        row.employee_id || '',
        row.employee_name || '',
        row.leave_type || '',
        Number(row.total_requests || 0),
        Number(Number(row.total_days || 0).toFixed(1)),
        Number(Number(row.approved_days || 0).toFixed(1)),
        Number(Number(row.pending_days || 0).toFixed(1)),
        Number(Number(row.rejected_days || 0).toFixed(1)),
      ]);
      const bg = idx % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
      dataRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { vertical: 'middle' };
      });
      dataRow.height = 16;
    });

    if (rows.length === 0) {
      ws.addRow(['No records found.']);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="leave_summary.xlsx"');
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
    wb.creator = 'HRMS';
    wb.created = new Date();

    const ws = wb.addWorksheet('Leave Detail');

    ws.mergeCells('A1:I1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'Leave Detail Report';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1B2A6B' } };
    titleCell.alignment = { horizontal: 'center' };

    ws.mergeCells('A2:I2');
    const subCell = ws.getCell('A2');
    subCell.value = `Generated: ${new Date().toLocaleString()}`;
    subCell.font = { size: 9, color: { argb: 'FF666666' } };
    subCell.alignment = { horizontal: 'center' };

    ws.addRow([]);

    const headerRow = ws.addRow([
      'Employee ID', 'Employee Name', 'Leave Type',
      'Start Date', 'End Date', 'Days',
      'Applied On', 'Status', 'Reason',
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });
    headerRow.height = 20;

    ws.columns = [
      { key: 'employee_id',   width: 14 },
      { key: 'employee_name', width: 24 },
      { key: 'leave_type',    width: 22 },
      { key: 'start_date',    width: 13 },
      { key: 'end_date',      width: 13 },
      { key: 'days',          width: 8  },
      { key: 'applied_on',    width: 14 },
      { key: 'status',        width: 18 },
      { key: 'reason',        width: 30 },
    ];

    const statusColors = {
      'Approved':        'FF16A085',
      'Pending Approval':'FFD97706',
      'Rejected':        'FFE53E3E',
      'Cancelled':       'FF94A3B8',
      'Scheduled':       'FF3B82F6',
      'Taken':           'FF7C3AED',
    };

    rows.forEach((row, idx) => {
      const dataRow = ws.addRow([
        row.employee_id || '',
        row.employee_name || '',
        row.leave_type || '',
        row.start_date || '',
        row.end_date || '',
        Number(Number(row.requested_days || 0).toFixed(1)),
        row.applied_on ? row.applied_on.substring(0, 10) : '',
        row.status || '',
        row.reason || '',
      ]);

      const bg = idx % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
      dataRow.eachCell((cell, colNum) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        cell.alignment = { vertical: 'middle', wrapText: colNum === 9 };
        if (colNum === 8 && row.status && statusColors[row.status]) {
          cell.font = { color: { argb: statusColors[row.status] }, bold: true };
        }
      });
      dataRow.height = 16;
    });

    if (rows.length === 0) {
      ws.addRow(['No records found.']);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="leave_detail.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

export {
  getLeaveTypes,
  getLeaveBalance,
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
