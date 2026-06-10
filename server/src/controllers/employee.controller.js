const EmployeeModel = require('../models/employee.model');

const listEmployees = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const result = await EmployeeModel.findAllEmployees(page);
    res.json(result);
  } catch (err) {
    console.error('listEmployees:', err);
    res.status(500).json({ message: 'Failed to fetch employees' });
  }
};

const getMyInfo = async (req, res) => {
  if (!req.user) { res.status(401).json({ message: 'Unauthorized' }); return; }
  try {
    if (req.user.id === 0) {
      res.json({
        id: 0, username: 'admin', name: 'Admin', first_name: 'Admin', last_name: '',
        email: 'admin@hrms.local', role: 'empmanager', status: 'Active', is_active: true,
        job_title: 'System Administrator', sub_unit: 'IT', location: 'HQ',
      });
      return;
    }
    const emp = await EmployeeModel.findEmployeeById(req.user.id);
    if (!emp) { res.status(404).json({ message: 'Profile not found for this user' }); return; }
    res.json(emp);
  } catch (err) {
    console.error('getMyInfo:', err);
    res.status(500).json({ message: 'Failed to fetch your info' });
  }
};

const getEmployee = async (req, res) => {
  try {
    const emp = await EmployeeModel.findEmployeeById(parseInt(req.params.id));
    if (!emp) { res.status(404).json({ message: 'Employee not found' }); return; }
    res.json(emp);
  } catch (err) {
    console.error('getEmployee:', err);
    res.status(500).json({ message: 'Failed to fetch employee' });
  }
};

const getSupervisors = async (_req, res) => {
  try {
    const supervisors = await EmployeeModel.getSupervisors();
    res.json(supervisors);
  } catch (err) {
    console.error('getSupervisors:', err);
    res.status(500).json({ message: 'Failed to fetch supervisors' });
  }
};

const createEmployee = async (req, res) => {
  try {
    const body = req.body;
    const email = body.work_email || body.email;

    if (!email || !email.trim()) {
      res.status(422).json({ message: 'Work email is required' });
      return;
    }

    const existing = await EmployeeModel.findByEmail(email.trim());
    if (existing) {
      res.status(422).json({ message: 'An employee with this email already exists' });
      return;
    }

    const avatarPath = req.file ? `uploads/${req.file.filename}` : undefined;
    const emp = await EmployeeModel.createEmployee(
      { ...body, email: email.trim(), created_by: req.user?.id },
      avatarPath
    );

    res.status(201).json({ message: 'Employee created successfully', id: emp.id });
  } catch (err) {
    console.error('createEmployee:', err);
    if (err.code === '23505') {
      res.status(422).json({ message: 'An employee with this email already exists' });
      return;
    }
    res.status(500).json({ message: 'Failed to create employee' });
  }
};

const updateEmployee = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await EmployeeModel.findEmployeeById(id);
    if (!existing) { res.status(404).json({ message: 'Employee not found' }); return; }

    const avatarPath = req.file ? `uploads/${req.file.filename}` : undefined;
    const body = { ...req.body, email: req.body.work_email || req.body.email };

    await EmployeeModel.updateEmployee(id, body, avatarPath, req.user?.id);
    res.json({ message: 'Employee updated successfully' });
  } catch (err) {
    console.error('updateEmployee:', err);
    res.status(500).json({ message: 'Failed to update employee' });
  }
};

const deleteEmployee = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ message: 'Invalid employee ID' });
      return;
    }

    const existing = await EmployeeModel.findEmployeeById(id);
    if (!existing) { res.status(404).json({ message: 'Employee not found' }); return; }

    await EmployeeModel.softDeleteEmployee(id, req.user?.id);
    res.json({ message: 'Employee deleted successfully' });
  } catch (err) {
    console.error('deleteEmployee:', err);
    res.status(500).json({ message: 'Failed to delete employee' });
  }
};

module.exports = { listEmployees, getMyInfo, getEmployee, getSupervisors, createEmployee, updateEmployee, deleteEmployee };
