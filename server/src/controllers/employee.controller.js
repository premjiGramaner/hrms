import * as EmployeeModel from "../models/employee.model.js";
import { success, created, error } from "../utils/response.js";
import { writeAuditLog } from "../services/audit.service.js";

const listEmployees = async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
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
    const employee = await EmployeeModel.findEmployeeById(parseInt(req.params.id));
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
    const email = (req.body.work_email || req.body.email || "").trim();

    if (!email) return error(res, "Work email is required", 422);

    const existing = await EmployeeModel.findByEmail(email);
    if (existing)
      return error(res, "An employee with this email already exists", 422);

    const avatarPath = req.file ? `uploads/${req.file.filename}` : undefined;
    const emp = await EmployeeModel.createEmployee(
      { ...req.body, email, created_by: req.user?.id },
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

    const avatarPath = req.file ? `uploads/${req.file.filename}` : undefined;
    const body = { ...req.body, email: req.body.work_email || req.body.email };

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

export {
  listEmployees,
  getMyInfo,
  getEmployee,
  getSupervisors,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
