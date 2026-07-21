import * as EmployeeModel from "../models/employee.model.js";
import { success, created, error } from "../utils/response.js";
import { writeAuditLog } from "../services/audit.service.js";
import { sendWelcomeEmail } from "../../email.service.js";
import { clientBaseUrl } from "../config/env.js";
import { logInfo, logError } from "../utils/logger.js";
import { ROLES } from "../constants/roles.js";

function getClientUrl(req) {
  if (clientBaseUrl) return clientBaseUrl.replace(/\/$/, "");
  const host = req.get("origin") || `${req.protocol}://${req.get("host")}`;
  return host
    .replace(/\/$/, "")
    .replace(/:5000$/, ":5173")
    .replace(/:5001$/, ":5173");
}

const listEmployees = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const search = (req.query.search || "").trim();
    const result = await EmployeeModel.findAllEmployees(page, limit, search);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const listSuperiorUsers = async (req, res, next) => {
  try {
    const result = await EmployeeModel.findSuperiorUsers({
      page: parseInt(req.query.page || "1", 10),
      limit: parseInt(req.query.limit || "10", 10),
      search: (req.query.search || "").trim(),
      role: (req.query.role || "").trim(),
      status: (req.query.status || "").trim(),
    });
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getMyInfo = async (req, res, next) => {
  try {
    if (!req.user) return error(res, "Unauthorized", 401);

    if (req.user.id === 0) {
      return success(res, {
        id: 0,
        username: "admin",
        name: "Admin",
        first_name: "Admin",
        last_name: "",
        email: "admin@hrms.local",
        role: ROLES.EMP_MANAGER,
        status: "Active",
        is_active: true,
        job_title: "System Administrator",
        sub_unit: "IT",
        location: "HQ",
      });
    }

    const employee = await EmployeeModel.findEmployeeById(req.user.id);
    if (!employee) return error(res, "Profile not found", 404);
    return success(res, employee);
  } catch (err) {
    next(err);
  }
};

const getEmployee = async (req, res, next) => {
  try {
    const employee = await EmployeeModel.findEmployeeById(
      parseInt(req.params.id),
    );
    if (!employee) return error(res, "Employee not found", 404);
    return success(res, employee);
  } catch (err) {
    next(err);
  }
};

const getSupervisors = async (_req, res, next) => {
  try {
    const supervisors = await EmployeeModel.getSupervisors();
    return success(res, supervisors);
  } catch (err) {
    next(err);
  }
};

const getSupervisorsByIds = async (req, res, next) => {
  try {
    const { supervisorIds } = req.body;
    if (!Array.isArray(supervisorIds) || supervisorIds.length === 0) {
      return success(res, []);
    }
    // Convert all IDs to integers and filter out invalid ones
    const validIds = supervisorIds
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id) && id > 0);

    if (validIds.length === 0) {
      return success(res, []);
    }

    const supervisors = await EmployeeModel.getSupervisorsByIds(validIds);
    return success(res, supervisors);
  } catch (err) {
    next(err);
  }
};

const getLocations = async (_req, res, next) => {
  try {
    const locations = await EmployeeModel.getLocations();
    return success(res, locations);
  } catch (err) {
    next(err);
  }
};

const createEmployee = async (req, res, next) => {
  try {
    const workEmail = (req.body.work_email || req.body.email || "").trim();
    const employeeId = (req.body.employee_id || "").trim();

    if (!workEmail) return error(res, "Work email is required", 422);

    const existingWork = await EmployeeModel.findByEmail(workEmail);
    if (existingWork)
      return error(res, "An employee with this work email already exists", 422);

    if (employeeId) {
      const existingEmployeeId =
        await EmployeeModel.findByEmployeeId(employeeId);
      if (existingEmployeeId)
        return error(res, "Employee ID already exists", 409);
    }

    const avatarBase64 = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : undefined;

    const emp = await EmployeeModel.createEmployee(
      { ...req.body, email: workEmail, created_by: req.user?.id },
      avatarBase64,
    );

    await writeAuditLog({
      employeeId: emp.id,
      employeeName: emp.name,
      employeeUsername: emp.username,
      section: req.body.role || "employee",
      action: "CREATE",
      actor: req.user,
      performedScreen: "Employee Management",
      actionDescription: `Employee created: ${emp.name} (${emp.email})`,
    });

    let emailSent = true;
    let emailMessage = "Welcome email sent successfully.";
    const loginUrl = `${getClientUrl(req)}/login`;
    try {
      await sendWelcomeEmail({
        to: emp.email,
        name: emp.name,
        username: emp.username,
        password: emp.temporaryPassword,
        loginUrl,
      });
    } catch (err) {
      logError("Failed to send welcome email", err, {
        employeeEmail: emp.email,
        employeeName: emp.name,
      });
      emailSent = false;
      emailMessage =
        "Employee created, but welcome email could not be sent. Check SMTP configuration.";
    }

    try {
      const { checkAndSendImmediateNotifications } =
        await import("../services/reportNotification.service.js");
      await checkAndSendImmediateNotifications(emp.id);
      logInfo("Checked immediate birthday/anniversary notifications", {
        employeeId: emp.id,
        employeeName: emp.name,
      });
    } catch (notifErr) {
      logError("Failed to check immediate notifications", notifErr, {
        employeeId: emp.id,
        employeeName: emp.name,
      });
    }

    return created(res, {
      message: "Employee created successfully",
      id: emp.id,
      emailSent,
      emailMessage,
    });
  } catch (err) {
    if (err.code === "23505")
      return error(res, "An employee with this email already exists", 422);
    next(err);
  }
};

const updateEmployee = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await EmployeeModel.findEmployeeById(id);
    if (!existing) return error(res, "Employee not found", 404);

    const workEmail = (req.body.work_email || req.body.email || "")
      .trim()
      .toLowerCase();
    const otherEmail = (req.body.other_email || "").trim().toLowerCase();

    if (workEmail && workEmail !== existing.email?.toLowerCase()) {
      const existingWork = await EmployeeModel.findByEmail(workEmail);
      if (existingWork && Number(existingWork.id) !== id)
        return error(
          res,
          "An employee with this work email already exists",
          422,
        );
    }

    if (otherEmail && otherEmail !== existing.other_email?.toLowerCase()) {
      const existingOther = await EmployeeModel.findByEmail(otherEmail);
      if (existingOther && Number(existingOther.id) !== id)
        return error(
          res,
          "An employee with this other email already exists",
          422,
        );
    }

    const avatarBase64 = req.file
      ? `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`
      : undefined;

    const body = { ...req.body, email: workEmail };

    await EmployeeModel.updateEmployee(id, body, avatarBase64, req.user?.id);

    await writeAuditLog({
      employeeId: existing.id,
      employeeName: existing.name,
      employeeUsername: existing.username,
      section: existing.role || "employee",
      action: "UPDATE",
      actor: req.user,
      performedScreen: "Employee Management",
      actionDescription: `Employee updated: ${existing.name}`,
    });
    return success(res, { message: "Employee updated successfully" });
  } catch (err) {
    logError("Update employee failed", err, { employeeId: id });
    next(err);
  }
};

const updateProfileImage = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (!req.file) {
      return error(res, "No image file provided", 422);
    }

    const existing = await EmployeeModel.findEmployeeById(id);
    if (!existing) return error(res, "Employee not found", 404);

    const avatarBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const updatedEmployee = await EmployeeModel.updateProfileImage(
      id,
      avatarBase64,
      req.user?.id,
    );

    await writeAuditLog({
      employeeId: existing.id,
      employeeName: existing.name,
      employeeUsername: existing.username,
      section: existing.role || "employee",
      action: "UPDATE",
      actor: req.user,
      performedScreen: "My Info",
      actionDescription: `Profile picture updated: ${existing.name}`,
    });

    return success(res, updatedEmployee);
  } catch (err) {
    next(err);
  }
};

const deleteEmployee = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) return error(res, "Invalid employee ID", 400);

    const existing = await EmployeeModel.findEmployeeById(id);
    if (!existing) return error(res, "Employee not found", 404);

    await EmployeeModel.softDeleteEmployee(id, req.user?.id);

    await writeAuditLog({
      employeeId: existing.id,
      employeeName: existing.name,
      employeeUsername: existing.username,
      section: existing.role || "employee",
      action: "TERMINATE",
      actor: req.user,
      performedScreen: "Employee Management",
      actionDescription: `Employee terminated: ${existing.name}`,
    });

    return success(res, { message: "Employee deleted successfully" });
  } catch (err) {
    next(err);
  }
};

const checkEmailExists = async (req, res, next) => {
  try {
    const { email, employeeId } = req.body;

    if (!email) {
      return success(res, { exists: false });
    }

    const existing = await EmployeeModel.findByEmail(
      email.trim().toLowerCase(),
    );

    if (!existing) {
      return success(res, { exists: false });
    }

    if (employeeId && existing.id === parseInt(employeeId)) {
      return success(res, { exists: false });
    }

    return success(res, { exists: true });
  } catch (err) {
    next(err);
  }
};

const terminateEmployee = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) return error(res, "Invalid employee ID", 400);

    const {
      terminationReason,
      terminationDateTime,
      terminationType,
      lastWorkingDay,
      noticePeriodDays,
      exitInterviewCompleted,
      rehireEligible,
      notes,
    } = req.body;

    if (!terminationReason || String(terminationReason).trim() === "")
      return error(res, "Termination reason is required", 422);
    if (!terminationDateTime)
      return error(res, "Termination date and time is required", 422);

    const datePart = terminationDateTime.split("T")[0];
    if (!datePart || isNaN(Date.parse(datePart))) {
      return error(res, "Invalid termination date", 422);
    }

    const existing = await EmployeeModel.findEmployeeById(id);
    if (!existing) return error(res, "Employee not found", 404);

    await EmployeeModel.terminateEmployee(
      id,
      String(terminationReason).trim(),
      terminationDateTime,
      datePart,
      String(terminationType || "Voluntary").trim(),
      lastWorkingDay ? String(lastWorkingDay).trim() : datePart,
      parseInt(noticePeriodDays) || 0,
      exitInterviewCompleted === true || exitInterviewCompleted === "true",
      rehireEligible === true || rehireEligible === "true",
      notes !== undefined && notes !== null ? String(notes).trim() : null,
      req.user?.id,
    );

    await writeAuditLog({
      employeeId: existing.id,
      employeeName: existing.name,
      employeeUsername: existing.username,
      section: existing.role || "employee",
      action: "TERMINATE",
      actor: req.user,
      performedScreen: "Employee Management",
      actionDescription: `Employee terminated: ${existing.name}. Reason: ${terminationReason}. Type: ${terminationType || "Voluntary"}`,
    });

    return success(res, { message: "Employee terminated successfully" });
  } catch (err) {
    next(err);
  }
};

const checkEmployeeIdExists = async (req, res, next) => {
  try {
    const { employee_id, excludeId } = req.body;

    if (!employee_id || !String(employee_id).trim()) {
      return success(res, { exists: false });
    }

    const existing = await EmployeeModel.findByEmployeeId(
      String(employee_id).trim().toLowerCase(),
    );

    if (!existing) {
      return success(res, { exists: false });
    }

    if (excludeId && existing.id === parseInt(excludeId)) {
      return success(res, { exists: false });
    }

    return success(res, { exists: true });
  } catch (err) {
    next(err);
  }
};

const getLastEmployeeId = async (req, res, next) => {
  try {
    const lastEmployee = await EmployeeModel.getLastEmployeeId();
    return success(res, { employee_id: lastEmployee?.employee_id || null });
  } catch (err) {
    next(err);
  }
};

export {
  listEmployees,
  listSuperiorUsers,
  getMyInfo,
  getEmployee,
  getSupervisors,
  getSupervisorsByIds,
  getLocations,
  createEmployee,
  updateEmployee,
  updateProfileImage,
  deleteEmployee,
  checkEmailExists,
  checkEmployeeIdExists,
  getLastEmployeeId,
  terminateEmployee,
};
