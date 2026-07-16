import * as EntitlementModel from "../models/entitlement.model.js";
import { success, created, error } from "../utils/response.js";

const getEmployees = async (req, res, next) => {
  try {
    const searchQuery = String(req.query.q || "").trim();
    const employees = await EntitlementModel.findActiveEmployees(searchQuery);
    return success(res, employees);
  } catch (err) {
    next(err);
  }
};

const getLeaveTypes = async (req, res, next) => {
  try {
    const types = await EntitlementModel.findActiveLeaveTypes();
    return success(res, types);
  } catch (err) {
    next(err);
  }
};

const createEntitlements = async (req, res, next) => {
  try {
    const {
      employee_ids,
      employee_id,
      leave_type_id,
      leave_period_start,
      entitlement_days,
      comments,
    } = req.body;

    const periodStart = new Date(leave_period_start);
    if (isNaN(periodStart.getTime())) {
      return error(res, "Invalid leave period start date", 422);
    }
    const year =
      periodStart.getMonth() >= 3
        ? periodStart.getFullYear() + 1
        : periodStart.getFullYear();

    const days = parseFloat(entitlement_days);
    if (!days || days <= 0)
      return error(res, "Entitlement days must be greater than 0", 422);
    if (!leave_type_id) return error(res, "Leave type is required", 422);

    const isMultiple = Array.isArray(employee_ids) && employee_ids.length > 0;
    const ids = isMultiple ? employee_ids.map(Number) : [Number(employee_id)];

    if (!ids.length || ids.some((id) => !id || id <= 0)) {
      return error(res, "At least one valid employee is required", 422);
    }

    const results = await EntitlementModel.bulkCreateEntitlements(
      ids,
      parseInt(leave_type_id),
      year,
      days,
      comments || null,
      req.user?.id || null,
    );

    // After every save, reset used_days for any periods that have already ended
    // so that leave balance cards on /leave/apply show 0 for expired periods.
    await EntitlementModel.resetExpiredEntitlements().catch(() => {});

    const created_count = results.created.length;
    const msg = `${created_count} entitlement(s) saved successfully.`;
    return created(res, { message: msg, created: created_count, skipped: 0 });
  } catch (err) {
    next(err);
  }
};

const listEntitlements = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);

    const filters = {
      employee_id: req.query.employee_id
        ? parseInt(req.query.employee_id)
        : null,
      leave_type_id: req.query.leave_type_id
        ? parseInt(req.query.leave_type_id)
        : null,
      year: req.query.year ? parseInt(req.query.year) : null,
    };

    if (req.user.role === "employee") {
      filters.employee_id = req.user.id;
    }

    const result = await EntitlementModel.findEntitlements({
      ...filters,
      page,
      limit,
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const myEntitlements = async (req, res, next) => {
  try {
    if (!req.user.id || req.user.id <= 0) {
      return success(res, []);
    }
    const rows = await EntitlementModel.findMyEntitlements(req.user.id);
    return success(res, rows);
  } catch (err) {
    next(err);
  }
};

export {
  getEmployees,
  getLeaveTypes,
  createEntitlements,
  listEntitlements,
  myEntitlements,
};
