import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import ReportModel from "../models/report.model.js";
import { success, error } from "../utils/response.js";

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
      sortColumn: req.query.sort_column || "termination_date",
      sortDirection: req.query.sort_direction || "desc",
    };

    const reportResult =
      await ReportModel.getTerminationReportData(filterCriteria);
    return success(res, reportResult);
  } catch (err) {
    next(err);
  }
};

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
      sortColumn: req.query.sort_column || "real_dob",
      sortDirection: req.query.sort_direction || "asc",
    };

    const userContext = {
      userId: req.user.id,
      userRole: req.user.role,
    };

    const reportResult = await ReportModel.getBirthdayReportData(
      filterCriteria,
      userContext,
    );
    return success(res, reportResult);
  } catch (err) {
    next(err);
  }
};

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
      sortColumn: req.query.sort_column || "joined_date",
      sortDirection: req.query.sort_direction || "asc",
    };

    const userContext = {
      userId: req.user.id,
      userRole: req.user.role,
    };

    const reportResult = await ReportModel.getWorkAnniversaryReportData(
      filterCriteria,
      userContext,
    );
    return success(res, reportResult);
  } catch (err) {
    next(err);
  }
};

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
      limit: 10000,
      sortColumn: req.query.sort_column || "termination_date",
      sortDirection: req.query.sort_direction || "desc",
    };

    const reportResult =
      await ReportModel.getTerminationReportData(filterCriteria);
    const reportData = reportResult.reportData;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HRMS";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Termination Report");

    worksheet.mergeCells("A1:N1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "Employee Termination Report - Detailed";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1B2A6B" } };
    titleCell.alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:N2");
    const timestampCell = worksheet.getCell("A2");
    timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
    timestampCell.font = { size: 9, color: { argb: "FF666666" } };
    timestampCell.alignment = { horizontal: "center" };
    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      "EMP ID",
      "Name",
      "Designation",
      "Termination Type",
      "Reason",
      "Join Date",
      "Exit Date",
      "Last Working Day",
      "Notice Period (Days)",
      "Rehire Eligible",
      "Notes",
      "Supervisor",
      "Terminated By",
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1B2A6B" },
      };
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
      };
    });
    headerRow.height = 30;

    worksheet.columns = [
      { width: 12 }, // EMP ID
      { width: 24 }, // Name
      { width: 20 }, // Designation
      { width: 16 }, // Termination Type
      { width: 30 }, // Reason
      { width: 14 }, // Join Date
      { width: 14 }, // Exit Date
      { width: 16 }, // Last Working Day
      { width: 12 }, // Notice Period
      { width: 14 }, // Rehire Eligible
      { width: 35 }, // Notes
      { width: 20 }, // Supervisor
      { width: 18 }, // Terminated By
    ];

    reportData.forEach((dataRow, index) => {
      const excelRow = worksheet.addRow([
        dataRow.emp_id || "",
        dataRow.employee_name || "",
        dataRow.designation || "",
        dataRow.termination_type || "N/A",
        dataRow.termination_reason || "N/A",
        dataRow.date_of_joining || "",
        dataRow.date_of_exit || "",
        dataRow.last_working_day || "N/A",
        dataRow.notice_period_days || 0,
        dataRow.rehire_eligible ? "Yes" : "No",
        dataRow.termination_notes || "",
        dataRow.actual_supervisor || "N/A",
        dataRow.terminated_by || "N/A",
      ]);

      const backgroundColor = index % 2 === 0 ? "FFF8F9FA" : "FFFFFFFF";
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: backgroundColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = { vertical: "middle" };
      });
      excelRow.height = 16;
    });

    if (reportData.length === 0) {
      worksheet.addRow(["No records found."]);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="termination_report.xlsx"',
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

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
      sortColumn: req.query.sort_column || "real_dob",
      sortDirection: req.query.sort_direction || "asc",
    };

    const userContext = {
      userId: req.user.id,
      userRole: req.user.role,
    };

    const reportResult = await ReportModel.getBirthdayReportData(
      filterCriteria,
      userContext,
    );
    const reportData = reportResult.reportData;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HRMS";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Birthday Report");

    // Title
    worksheet.mergeCells("A1:H1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "Birthday Report";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1B2A6B" } };
    titleCell.alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:H2");
    const timestampCell = worksheet.getCell("A2");
    timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
    timestampCell.font = { size: 9, color: { argb: "FF666666" } };
    timestampCell.alignment = { horizontal: "center" };
    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      "Employee ID",
      "First Name",
      "Last Name",
      "Full Name",
      "Birthday Date",
      "Gender",
      "Marital Status",
      "Role/User Type",
    ]);
    headerRow.eachCell((cell) => {
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
    headerRow.height = 20;

    worksheet.columns = [
      { width: 14 },
      { width: 18 },
      { width: 18 },
      { width: 26 },
      { width: 16 },
      { width: 12 },
      { width: 16 },
      { width: 16 },
    ];

    reportData.forEach((dataRow, index) => {
      const excelRow = worksheet.addRow([
        dataRow.employee_id || "",
        dataRow.first_name || "",
        dataRow.last_name || "",
        dataRow.full_name || "",
        dataRow.formatted_birthday || "",
        dataRow.gender || "",
        dataRow.marital_status || "",
        dataRow.user_type || "",
      ]);

      const backgroundColor = index % 2 === 0 ? "FFF8F9FA" : "FFFFFFFF";
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: backgroundColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = { vertical: "middle" };
      });
      excelRow.height = 16;
    });

    if (reportData.length === 0) {
      worksheet.addRow(["No records found."]);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="birthday_report.xlsx"',
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

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
      sortColumn: req.query.sort_column || "joined_date",
      sortDirection: req.query.sort_direction || "asc",
    };

    const userContext = {
      userId: req.user.id,
      userRole: req.user.role,
    };

    const reportResult = await ReportModel.getWorkAnniversaryReportData(
      filterCriteria,
      userContext,
    );
    const reportData = reportResult.reportData;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "HRMS";
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet("Work Anniversary Report");

    worksheet.mergeCells("A1:I1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "Work Anniversary Report";
    titleCell.font = { bold: true, size: 14, color: { argb: "FF1B2A6B" } };
    titleCell.alignment = { horizontal: "center" };

    worksheet.mergeCells("A2:I2");
    const timestampCell = worksheet.getCell("A2");
    timestampCell.value = `Generated: ${new Date().toLocaleString()}`;
    timestampCell.font = { size: 9, color: { argb: "FF666666" } };
    timestampCell.alignment = { horizontal: "center" };
    worksheet.addRow([]);

    const headerRow = worksheet.addRow([
      "Employee ID",
      "Employee Name",
      "Designation",
      "Department",
      "Location",
      "Date of Joining",
      "Anniversary Date",
      "Years of Service",
      "Tenure (Months)",
    ]);
    headerRow.eachCell((cell) => {
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
    headerRow.height = 20;

    worksheet.columns = [
      { width: 14 },
      { width: 26 },
      { width: 22 },
      { width: 20 },
      { width: 16 },
      { width: 16 },
      { width: 18 },
      { width: 16 },
      { width: 16 },
    ];

    reportData.forEach((dataRow, index) => {
      const tenureDisplay = `${dataRow.years_of_service || 0}y ${dataRow.additional_months || 0}m`;
      const excelRow = worksheet.addRow([
        dataRow.employee_id || "",
        dataRow.employee_name || "",
        dataRow.designation || "",
        dataRow.department || "",
        dataRow.location || "",
        dataRow.date_of_joining || "",
        dataRow.formatted_anniversary || "",
        dataRow.years_of_service || 0,
        tenureDisplay,
      ]);

      const backgroundColor = index % 2 === 0 ? "FFF8F9FA" : "FFFFFFFF";
      excelRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: backgroundColor },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
        cell.alignment = { vertical: "middle" };
      });
      excelRow.height = 16;
    });

    if (reportData.length === 0) {
      worksheet.addRow(["No records found."]);
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="work_anniversary_report.xlsx"',
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
};

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
      sortColumn: req.query.sort_column || "termination_date",
      sortDirection: req.query.sort_direction || "desc",
    };

    const reportResult =
      await ReportModel.getTerminationReportData(filterCriteria);
    const reportData = reportResult.reportData;

    const pdfDocument = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "landscape",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="termination_report.pdf"',
    );
    pdfDocument.pipe(res);

    pdfDocument
      .fontSize(16)
      .fillColor("#1B2A6B")
      .text("Termination Report", { align: "center" });
    pdfDocument.moveDown(0.3);
    pdfDocument
      .fontSize(8)
      .fillColor("#666666")
      .text(`Generated: ${new Date().toLocaleString()}`, { align: "center" });
    pdfDocument.moveDown(1);

    const tableTop = pdfDocument.y;
    const colWidths = [50, 90, 80, 70, 100, 70, 70, 80, 60, 70, 100, 80, 80];
    const colPositions = [30];
    for (let i = 0; i < colWidths.length - 1; i++) {
      colPositions.push(colPositions[i] + colWidths[i]);
    }

    pdfDocument
      .fontSize(7)
      .fillColor("#FFFFFF")
      .rect(30, tableTop, 1050, 20)
      .fillAndStroke("#1B2A6B", "#1B2A6B");
    pdfDocument.fontSize(7).fillColor("#FFFFFF");
    pdfDocument.text("EMP ID", colPositions[0] + 3, tableTop + 6, {
      width: colWidths[0] - 6,
    });
    pdfDocument.text("Name", colPositions[1] + 3, tableTop + 6, {
      width: colWidths[1] - 6,
    });
    pdfDocument.text("Designation", colPositions[2] + 3, tableTop + 6, {
      width: colWidths[2] - 6,
    });
    pdfDocument.text("Type", colPositions[3] + 3, tableTop + 6, {
      width: colWidths[3] - 6,
    });
    pdfDocument.text("Reason", colPositions[4] + 3, tableTop + 6, {
      width: colWidths[4] - 6,
    });
    pdfDocument.text("Join Date", colPositions[5] + 3, tableTop + 6, {
      width: colWidths[5] - 6,
    });
    pdfDocument.text("Exit Date", colPositions[6] + 3, tableTop + 6, {
      width: colWidths[6] - 6,
    });
    pdfDocument.text("Last Work Day", colPositions[7] + 3, tableTop + 6, {
      width: colWidths[7] - 6,
    });
    pdfDocument.text("Notice", colPositions[8] + 3, tableTop + 6, {
      width: colWidths[8] - 6,
    });
    pdfDocument.text("Rehire", colPositions[9] + 3, tableTop + 6, {
      width: colWidths[9] - 6,
    });
    pdfDocument.text("Notes", colPositions[10] + 3, tableTop + 6, {
      width: colWidths[10] - 6,
    });
    pdfDocument.text("Supervisor", colPositions[11] + 3, tableTop + 6, {
      width: colWidths[11] - 6,
    });
    pdfDocument.text("Terminated By", colPositions[12] + 3, tableTop + 6, {
      width: colWidths[12] - 6,
    });

    let currentY = tableTop + 20;
    pdfDocument.fillColor("#000000");

    reportData.forEach((dataRow, index) => {
      if (currentY > 520) {
        pdfDocument.addPage({ margin: 30, size: "A4", layout: "landscape" });
        currentY = 30;
      }

      const bgColor = index % 2 === 0 ? "#F8F9FA" : "#FFFFFF";
      pdfDocument.rect(30, currentY, 1050, 16).fill(bgColor);

      pdfDocument.fontSize(6).fillColor("#000000");
      pdfDocument.text(
        dataRow.emp_id || "",
        colPositions[0] + 3,
        currentY + 4,
        { width: colWidths[0] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.employee_name || "",
        colPositions[1] + 3,
        currentY + 4,
        { width: colWidths[1] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.designation || "",
        colPositions[2] + 3,
        currentY + 4,
        { width: colWidths[2] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.termination_type || "",
        colPositions[3] + 3,
        currentY + 4,
        { width: colWidths[3] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.termination_reason || "",
        colPositions[4] + 3,
        currentY + 4,
        { width: colWidths[4] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.date_of_joining || "",
        colPositions[5] + 3,
        currentY + 4,
        { width: colWidths[5] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.date_of_exit || "",
        colPositions[6] + 3,
        currentY + 4,
        { width: colWidths[6] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.last_working_day || "",
        colPositions[7] + 3,
        currentY + 4,
        { width: colWidths[7] - 6, ellipsis: true },
      );
      pdfDocument.text(
        `${dataRow.notice_period_days || 0}d`,
        colPositions[8] + 3,
        currentY + 4,
        { width: colWidths[8] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.rehire_eligible ? "Yes" : "No",
        colPositions[9] + 3,
        currentY + 4,
        { width: colWidths[9] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.termination_notes || "",
        colPositions[10] + 3,
        currentY + 4,
        { width: colWidths[10] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.actual_supervisor || "",
        colPositions[11] + 3,
        currentY + 4,
        { width: colWidths[11] - 6, ellipsis: true },
      );
      pdfDocument.text(
        dataRow.terminated_by || "",
        colPositions[12] + 3,
        currentY + 4,
        { width: colWidths[12] - 6, ellipsis: true },
      );

      currentY += 16;
    });

    if (reportData.length === 0) {
      pdfDocument.text("No records found.", 30, currentY + 10);
    }

    pdfDocument.end();
  } catch (err) {
    next(err);
  }
};

const getNotificationConfig = async (req, res, next) => {
  try {
    const birthdayConfig = await ReportModel.getNotificationConfig("birthday");
    const anniversaryConfig =
      await ReportModel.getNotificationConfig("work_anniversary");

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
    const {
      notification_type,
      recipient_user_ids,
      days_before,
      is_active,
      external_emails,
    } = req.body;

    if (
      !notification_type ||
      !["birthday", "work_anniversary"].includes(notification_type)
    ) {
      return error(
        res,
        'Invalid notification_type. Must be "birthday" or "work_anniversary"',
        400,
      );
    }

    if (!Array.isArray(recipient_user_ids)) {
      return error(res, "recipient_user_ids must be an array", 400);
    }

    const normalizedDaysBefore = Number(days_before);
    if (
      !Number.isInteger(normalizedDaysBefore) ||
      normalizedDaysBefore < 0 ||
      normalizedDaysBefore > 30
    ) {
      return error(res, "days_before must be an integer from 0 to 30", 400);
    }

    const userId = req.user?.id || null;

    const updatedConfig = await ReportModel.updateNotificationConfig(
      notification_type,
      recipient_user_ids,
      normalizedDaysBefore,
      is_active !== false,
      userId,
      external_emails || "",
    );

    return success(res, {
      config: updatedConfig,
      message: "Notification configuration updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

const triggerNotificationsManually = async (req, res, next) => {
  try {
    const { triggerNotificationsManually: triggerFunction } =
      await import("../jobs/reportNotificationScheduler.js");
    const result = await triggerFunction();

    return success(res, {
      message: "Notifications triggered manually",
      results: result,
    });
  } catch (err) {
    next(err);
  }
};

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
  triggerNotificationsManually,
};
