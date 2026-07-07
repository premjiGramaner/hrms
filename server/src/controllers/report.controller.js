import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import ReportModel from '../models/report.model.js';
import { success, error } from '../utils/response.js';
import AppError from '../utils/AppError.js';

/**
 * Termination Report - Paginated List View
 */
const getTerminationReport = async (req, res, next) => {
  try {
    const filterCriteria = {
      dateFrom: req.query.date_from || null,
      dateTo: req.query.date_to || null,
      groupCompany: req.query.group_company || null,
      location: req.query.location || null,
      employeeId: req.query.employee_id || null,
      employeeName: req.query.employee_name || null,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 15,
      sortColumn: req.query.sort_column || 'updated_at',
      sortDirection: req.query.sort_direction || 'desc',
    };

    const reportResult = await ReportModel.getTerminationReportData(filterCriteria);
    return success(res, reportResult);
  } catch (err) {
    next(err);
  }
};

/**
 * Birthday Report - Paginated List View with Role-Based Filtering
 */
const getBirthdayReport = async (req, res, next) => {
  try {
    const filterCriteria = {
      monthFilter: req.query.month || null,
      dateFrom: req.query.date_from || null,
      dateTo: req.query.date_to || null,
      employeeId: req.query.employee_id || null,
      employeeName: req.query.employee_name || null,
      genderFilter: req.query.gender || null,
      maritalStatusFilter: req.query.marital_status || null,
      roleFilter: req.query.role || null,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 15,
      sortColumn: req.query.sort_column || 'real_dob',
      sortDirection: req.query.sort_direction || 'asc',
    };

    const userContext = {
      userId: req.user.id,
      userRole: req.user.role,
    };

    const reportResult = await ReportModel.getBirthdayReportData(filterCriteria, userContext);
    return success(res, reportResult);
  } catch (err) {
    next(err);
  }
};

/**
 * Work Anniversary Report - Paginated List View with Role-Based Filtering
 */
const getWorkAnniversaryReport = async (req, res, next) => {
  try {
    const filterCriteria = {
      monthFilter: req.query.month || null,
      dateFrom: req.query.date_from || null,
      dateTo: req.query.date_to || null,
      employeeId: req.query.employee_id || null,
      employeeName: req.query.employee_name || null,
      yearFilter: req.query.years_of_service || null,
      departmentFilter: req.query.department || null,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 15,
      sortColumn: req.query.sort_column || 'joined_date',
      sortDirection: req.query.sort_direction || 'asc',
    };

    const userContext = {
      userId: req.user.id,
      userRole: req.user.role,
    };

    const reportResult = await ReportModel.getWorkAnniversaryReportData(filterCriteria, userContext);
    return success(res, reportResult);
  } catch (err) {
    next(err);
  }
};

/**
 * Export Termination Report to Excel
 */
const exportTerminationReportExcel = async (req, res, next) => {
  try {
    const filterCriteria = {
      dateFrom: req.query.date_from || null,
      dateTo: req.query.date_to || null,
      groupCompany: req.query.group_company || null,
      location: req.query.location || null,
      employeeId: req.query.employee_id || null,
      employeeName: req.query.employee_name || null,
      page: 1,
      limit: 10000, // Get all records for export
      sortColumn: req.query.sort_column || 'updated_at',
      sortDirection: req.query.sort_direction || 'desc',
    };

    const reportResult = await ReportModel.getTerminationReportData(filterCriteria);
    const reportData = reportResult.reportData;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HRMS';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Termination Report');

    // Title
    worksheet.mergeCells('A1:N1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Employee Termination Report - Detailed';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1B2A6B' } };
    titleCell.alignment = { horizontal: 'center' };

    // Generated timestamp
    worksheet.mergeCells('A2:N2');
    const timestampCell = worksheet.getCell('A2');
    timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
    timestampCell.font = { size: 9, color: { argb: 'FF666666' } };
    timestampCell.alignment = { horizontal: 'center' };
    worksheet.addRow([]);

    // Header row with all termination details
    const headerRow = worksheet.addRow([
      'EMP ID', 
      'Employee Name', 
      'Designation', 
      'Termination Type',
      'Termination Reason',
      'Join Date', 
      'Exit Date',
      'Last Working Day',
      'Notice Period (Days)',
      'Exit Interview',
      'Rehire Eligible',
      'Reporting Manager',
      'Terminated By',
      'Notes'
    ]);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 30;

    // Column widths - adjusted for new columns
    worksheet.columns = [
      { width: 12 },  // EMP ID
      { width: 24 },  // Employee Name
      { width: 20 },  // Designation
      { width: 16 },  // Termination Type
      { width: 30 },  // Termination Reason
      { width: 14 },  // Join Date
      { width: 14 },  // Exit Date
      { width: 16 },  // Last Working Day
      { width: 12 },  // Notice Period
      { width: 14 },  // Exit Interview
      { width: 14 },  // Rehire Eligible
      { width: 20 },  // Reporting Manager
      { width: 18 },  // Terminated By
      { width: 35 },  // Notes
    ];

    // Data rows with all termination details
    reportData.forEach((dataRow, index) => {
      const excelRow = worksheet.addRow([
        dataRow.emp_id || '',
        dataRow.employee_name || '',
        dataRow.designation || '',
        dataRow.termination_type || 'N/A',
        dataRow.termination_reason || 'N/A',
        dataRow.date_of_joining || '',
        dataRow.date_of_exit || '',
        dataRow.last_working_day || 'N/A',
        dataRow.notice_period_days || 0,
        dataRow.exit_interview_completed ? 'Completed' : 'Pending',
        dataRow.rehire_eligible ? 'Yes' : 'No',
        dataRow.reporting_manager || 'N/A',
        dataRow.terminated_by || 'N/A',
        dataRow.termination_notes || '',
      ]);

      const backgroundColor = index % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
      excelRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } };
        cell.border = { 
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        cell.alignment = { vertical: 'middle' };
      });
      excelRow.height = 16;
    });

    if (reportData.length === 0) {
      worksheet.addRow(['No records found.']);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="termination_report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * Export Birthday Report to Excel
 */
const exportBirthdayReportExcel = async (req, res, next) => {
  try {
    const filterCriteria = {
      monthFilter: req.query.month || null,
      dateFrom: req.query.date_from || null,
      dateTo: req.query.date_to || null,
      employeeId: req.query.employee_id || null,
      employeeName: req.query.employee_name || null,
      genderFilter: req.query.gender || null,
      maritalStatusFilter: req.query.marital_status || null,
      roleFilter: req.query.role || null,
      page: 1,
      limit: 10000,
      sortColumn: req.query.sort_column || 'real_dob',
      sortDirection: req.query.sort_direction || 'asc',
    };

    const userContext = {
      userId: req.user.id,
      userRole: req.user.role,
    };

    const reportResult = await ReportModel.getBirthdayReportData(filterCriteria, userContext);
    const reportData = reportResult.reportData;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HRMS';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Birthday Report');

    // Title
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Birthday Report';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1B2A6B' } };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:H2');
    const timestampCell = worksheet.getCell('A2');
    timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
    timestampCell.font = { size: 9, color: { argb: 'FF666666' } };
    timestampCell.alignment = { horizontal: 'center' };
    worksheet.addRow([]);

    const headerRow = worksheet.addRow(['Employee ID', 'First Name', 'Last Name', 'Full Name', 'Birthday Date', 'Gender', 'Marital Status', 'Role/User Type']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 20;

    worksheet.columns = [
      { width: 14 }, { width: 18 }, { width: 18 }, { width: 26 },
      { width: 16 }, { width: 12 }, { width: 16 }, { width: 16 },
    ];

    reportData.forEach((dataRow, index) => {
      const excelRow = worksheet.addRow([
        dataRow.employee_id || '',
        dataRow.first_name || '',
        dataRow.last_name || '',
        dataRow.full_name || '',
        dataRow.formatted_birthday || '',
        dataRow.gender || '',
        dataRow.marital_status || '',
        dataRow.user_type || '',
      ]);

      const backgroundColor = index % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
      excelRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } };
        cell.border = { 
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        cell.alignment = { vertical: 'middle' };
      });
      excelRow.height = 16;
    });

    if (reportData.length === 0) {
      worksheet.addRow(['No records found.']);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="birthday_report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * Export Work Anniversary Report to Excel
 */
const exportWorkAnniversaryReportExcel = async (req, res, next) => {
  try {
    const filterCriteria = {
      monthFilter: req.query.month || null,
      dateFrom: req.query.date_from || null,
      dateTo: req.query.date_to || null,
      employeeId: req.query.employee_id || null,
      employeeName: req.query.employee_name || null,
      yearFilter: req.query.years_of_service || null,
      departmentFilter: req.query.department || null,
      page: 1,
      limit: 10000,
      sortColumn: req.query.sort_column || 'joined_date',
      sortDirection: req.query.sort_direction || 'asc',
    };

    const userContext = {
      userId: req.user.id,
      userRole: req.user.role,
    };

    const reportResult = await ReportModel.getWorkAnniversaryReportData(filterCriteria, userContext);
    const reportData = reportResult.reportData;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'HRMS';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('Work Anniversary Report');

    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Work Anniversary Report';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1B2A6B' } };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:I2');
    const timestampCell = worksheet.getCell('A2');
    timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
    timestampCell.font = { size: 9, color: { argb: 'FF666666' } };
    timestampCell.alignment = { horizontal: 'center' };
    worksheet.addRow([]);

    const headerRow = worksheet.addRow(['Employee ID', 'Employee Name', 'Designation', 'Department', 'Location', 'Date of Joining', 'Anniversary Date', 'Years of Service', 'Tenure (Months)']);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A6B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    headerRow.height = 20;

    worksheet.columns = [
      { width: 14 }, { width: 26 }, { width: 22 }, { width: 20 },
      { width: 16 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 16 },
    ];

    reportData.forEach((dataRow, index) => {
      const tenureDisplay = `${dataRow.years_of_service || 0}y ${dataRow.additional_months || 0}m`;
      const excelRow = worksheet.addRow([
        dataRow.employee_id || '',
        dataRow.employee_name || '',
        dataRow.designation || '',
        dataRow.department || '',
        dataRow.location || '',
        dataRow.date_of_joining || '',
        dataRow.formatted_anniversary || '',
        dataRow.years_of_service || 0,
        tenureDisplay,
      ]);

      const backgroundColor = index % 2 === 0 ? 'FFF8F9FA' : 'FFFFFFFF';
      excelRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: backgroundColor } };
        cell.border = { 
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        cell.alignment = { vertical: 'middle' };
      });
      excelRow.height = 16;
    });

    if (reportData.length === 0) {
      worksheet.addRow(['No records found.']);
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="work_anniversary_report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

/**
 * Export Termination Report to PDF
 */
const exportTerminationReportPDF = async (req, res, next) => {
  try {
    const filterCriteria = {
      dateFrom: req.query.date_from || null,
      dateTo: req.query.date_to || null,
      groupCompany: req.query.group_company || null,
      location: req.query.location || null,
      employeeId: req.query.employee_id || null,
      employeeName: req.query.employee_name || null,
      page: 1,
      limit: 10000,
      sortColumn: req.query.sort_column || 'updated_at',
      sortDirection: req.query.sort_direction || 'desc',
    };

    const reportResult = await ReportModel.getTerminationReportData(filterCriteria);
    const reportData = reportResult.reportData;

    const pdfDocument = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="termination_report.pdf"');
    pdfDocument.pipe(res);

    // Title
    pdfDocument.fontSize(16).fillColor('#1B2A6B').text('Termination Report', { align: 'center' });
    pdfDocument.moveDown(0.3);
    pdfDocument.fontSize(8).fillColor('#666666').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
    pdfDocument.moveDown(1);

    // Table headers
    const tableTop = pdfDocument.y;
    const colWidths = [60, 100, 90, 90, 100, 80, 80, 80];
    const colPositions = [30];
    for (let i = 0; i < colWidths.length - 1; i++) {
      colPositions.push(colPositions[i] + colWidths[i]);
    }
    
    pdfDocument.fontSize(8).fillColor('#FFFFFF').rect(30, tableTop, 760, 20).fillAndStroke('#1B2A6B', '#1B2A6B');
    pdfDocument.fontSize(8).fillColor('#FFFFFF');
    pdfDocument.text('EMP ID', colPositions[0] + 5, tableTop + 6, { width: colWidths[0] - 10 });
    pdfDocument.text('Name', colPositions[1] + 5, tableTop + 6, { width: colWidths[1] - 10 });
    pdfDocument.text('Designation', colPositions[2] + 5, tableTop + 6, { width: colWidths[2] - 10 });
    pdfDocument.text('Group Company', colPositions[3] + 5, tableTop + 6, { width: colWidths[3] - 10 });
    pdfDocument.text('Manager', colPositions[4] + 5, tableTop + 6, { width: colWidths[4] - 10 });
    pdfDocument.text('Location', colPositions[5] + 5, tableTop + 6, { width: colWidths[5] - 10 });
    pdfDocument.text('Join Date', colPositions[6] + 5, tableTop + 6, { width: colWidths[6] - 10 });
    pdfDocument.text('Exit Date', colPositions[7] + 5, tableTop + 6, { width: colWidths[7] - 10 });

    let currentY = tableTop + 20;
    pdfDocument.fillColor('#000000');

    reportData.forEach((dataRow, index) => {
      if (currentY > 520) {
        pdfDocument.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
        currentY = 30;
      }

      const bgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
      pdfDocument.rect(30, currentY, 760, 18).fill(bgColor);

      pdfDocument.fontSize(7).fillColor('#000000');
      pdfDocument.text(dataRow.emp_id || '', colPositions[0] + 5, currentY + 5, { width: colWidths[0] - 10, ellipsis: true });
      pdfDocument.text(dataRow.employee_name || '', colPositions[1] + 5, currentY + 5, { width: colWidths[1] - 10, ellipsis: true });
      pdfDocument.text(dataRow.designation || '', colPositions[2] + 5, currentY + 5, { width: colWidths[2] - 10, ellipsis: true });
      pdfDocument.text(dataRow.group_company || '', colPositions[3] + 5, currentY + 5, { width: colWidths[3] - 10, ellipsis: true });
      pdfDocument.text(dataRow.reporting_manager || '', colPositions[4] + 5, currentY + 5, { width: colWidths[4] - 10, ellipsis: true });
      pdfDocument.text(dataRow.location || '', colPositions[5] + 5, currentY + 5, { width: colWidths[5] - 10, ellipsis: true });
      pdfDocument.text(dataRow.date_of_joining || '', colPositions[6] + 5, currentY + 5, { width: colWidths[6] - 10, ellipsis: true });
      pdfDocument.text(dataRow.date_of_exit || '', colPositions[7] + 5, currentY + 5, { width: colWidths[7] - 10, ellipsis: true });

      currentY += 18;
    });

    if (reportData.length === 0) {
      pdfDocument.text('No records found.', 30, currentY + 10);
    }

    pdfDocument.end();
  } catch (err) {
    next(err);
  }
};

/**
 * Notification Configuration Management
 */
const getNotificationConfig = async (req, res, next) => {
  try {
    const birthdayConfig = await ReportModel.getNotificationConfig('birthday');
    const anniversaryConfig = await ReportModel.getNotificationConfig('work_anniversary');
    
    return success(res, {
      birthday: birthdayConfig,
      work_anniversary: anniversaryConfig,
    });
  } catch (err) {
    next(err);
  }
};

const updateNotificationConfig = async (req, res, next) => {
  try {
    const { notification_type, recipient_user_ids, days_before, is_active } = req.body;

    if (!notification_type || !['birthday', 'work_anniversary'].includes(notification_type)) {
      return error(res, 'Invalid notification_type. Must be "birthday" or "work_anniversary"', 400);
    }

    if (!Array.isArray(recipient_user_ids)) {
      return error(res, 'recipient_user_ids must be an array', 400);
    }

    const updatedConfig = await ReportModel.updateNotificationConfig(
      notification_type,
      recipient_user_ids,
      days_before || 2,
      is_active !== false,
      req.user.id
    );

    return success(res, { config: updatedConfig, message: 'Notification configuration updated successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Get distinct filter values for dropdowns
 */
const getReportFilterOptions = async (req, res, next) => {
  try {
    const subUnits = await ReportModel.getDistinctSubUnits();
    const locations = await ReportModel.getDistinctLocations();
    
    return success(res, {
      subUnits,
      locations,
    });
  } catch (err) {
    next(err);
  }
};

export {
  getTerminationReport,
  getBirthdayReport,
  getWorkAnniversaryReport,
  exportTerminationReportExcel,
  exportBirthdayReportExcel,
  exportWorkAnniversaryReportExcel,
  exportTerminationReportPDF,
  getNotificationConfig,
  updateNotificationConfig,
  getReportFilterOptions,
};
