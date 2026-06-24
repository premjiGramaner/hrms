import * as EmployeeModel from "../models/employee.model.js";
import { success, created, error } from "../utils/response.js";
import { writeAuditLog } from "../services/audit.service.js";

const listEmployees = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 15));
    const result = await EmployeeModel.findAllEmployees(page, limit);
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
        role: "empmanager",
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

const createEmployee = async (req, res, next) => {
  try {
    const workEmail = (req.body.work_email || req.body.email || "").trim();
    const otherEmail = (req.body.other_email || "").trim();

    if (!workEmail) return error(res, "Work email is required", 422);

    const existingWork = await EmployeeModel.findByEmail(workEmail);
    if (existingWork)
      return error(res, "An employee with this work email already exists", 422);

    if (otherEmail) {
      const existingOther = await EmployeeModel.findByEmail(otherEmail);
      if (existingOther)
        return error(res, "An employee with this other email already exists", 422);
    }

    const avatarPath = req.file ? req.file.filename : undefined;
    const emp = await EmployeeModel.createEmployee(
      { ...req.body, email: workEmail, created_by: req.user?.id },
      avatarPath,
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

    return created(res, {
      message: "Employee created successfully",
      id: emp.id,
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

    const workEmail = (req.body.work_email || req.body.email || "").trim();
    const otherEmail = (req.body.other_email || "").trim();

    if (workEmail) {
      const existingWork = await EmployeeModel.findByEmail(workEmail);
      if (existingWork && existingWork.id !== id)
        return error(res, "An employee with this work email already exists", 422);
    }

    if (otherEmail) {
      const existingOther = await EmployeeModel.findByEmail(otherEmail);
      if (existingOther && existingOther.id !== id)
        return error(res, "An employee with this other email already exists", 422);
    }

    const avatarPath = req.file ? req.file.filename : undefined;
    const body = { ...req.body, email: workEmail };

    await EmployeeModel.updateEmployee(id, body, avatarPath, req.user?.id);

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

    // Store only the filename, not the full path
    const avatarPath = req.file.filename;
    const updated = await EmployeeModel.updateProfileImage(id, avatarPath, req.user?.id);

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

    // Fetch the complete updated employee data
    const updatedEmployee = await EmployeeModel.findEmployeeById(id);
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

    const existing = await EmployeeModel.findByEmail(email.trim());
    
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

    const { terminationReason, terminationDateTime, notes } = req.body;

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
      actionDescription: `Employee terminated: ${existing.name}. Reason: ${terminationReason}`,
    });

    return success(res, { message: "Employee terminated successfully" });
  } catch (err) {
    next(err);
  }
};

export {
  listEmployees,
  getMyInfo,
  getEmployee,
  getSupervisors,
  createEmployee,
  updateEmployee,
  updateProfileImage,
  deleteEmployee,
  checkEmailExists,
  terminateEmployee,
};
