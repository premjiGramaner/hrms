import PDFDocument from "pdfkit";

const PDF_COLORS = {
  header: "#F68B33",
  headerText: "#111827",
  bodyText: "#111827",
  mutedText: "#64748B",
  border: "#E2E8F0",
  white: "#FFFFFF",
};

const PAGE_MARGIN = 34;
const SUMMARY_COLUMNS = [
  { key: "department", label: "Sub Unit", width: 255, align: "left" },
  {
    key: "leaveHours",
    label: "Sum of Leave Duration (Hours)",
    width: 272,
    align: "right",
  },
];
const LEAVE_COLUMNS = [
  { key: "employeeName", label: "Employee Name", width: 145, align: "left" },
  { key: "department", label: "Sub Unit", width: 142, align: "left" },
  { key: "leaveDate", label: "Leave Date", width: 82, align: "left" },
  { key: "leaveType", label: "Leave Type", width: 105, align: "left" },
  {
    key: "leaveHours",
    label: "Leave Duration\n(Hours)",
    width: 53,
    align: "right",
  },
];

function formatNumber(value) {
  return Number(value || 0).toFixed(2);
}

function formatLeaveDate(reportRow) {
  if (reportRow.start_date === reportRow.end_date) {
    return reportRow.start_date || "---";
  }
  return `${reportRow.start_date || "---"} to ${reportRow.end_date || "---"}`;
}

function drawHeaderRow(pdfDocument, columns, top, height) {
  let columnLeft = PAGE_MARGIN;
  const totalWidth = columns.reduce(
    (width, column) => width + column.width,
    0,
  );

  pdfDocument
    .rect(PAGE_MARGIN, top, totalWidth, height)
    .fill(PDF_COLORS.header);

  columns.forEach((column) => {
    pdfDocument
      .fillColor(PDF_COLORS.headerText)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(column.label, columnLeft + 5, top + 7, {
        width: column.width - 10,
        height: height - 10,
        align: column.align,
        valign: "center",
      });

    if (columnLeft > PAGE_MARGIN) {
      pdfDocument
        .moveTo(columnLeft, top)
        .lineTo(columnLeft, top + height)
        .strokeColor(PDF_COLORS.white)
        .lineWidth(0.75)
        .stroke();
    }
    columnLeft += column.width;
  });

  return top + height;
}

function drawDepartmentSummary(pdfDocument, departmentTotals) {
  let currentTop = PAGE_MARGIN;
  currentTop = drawHeaderRow(pdfDocument, SUMMARY_COLUMNS, currentTop, 24);

  if (departmentTotals.length === 0) {
    pdfDocument
      .fillColor(PDF_COLORS.mutedText)
      .font("Helvetica")
      .fontSize(9)
      .text("No department totals available.", PAGE_MARGIN + 5, currentTop + 6);
    currentTop += 24;
  } else {
    departmentTotals.forEach((department) => {
      const rowValues = {
        department: department.department,
        leaveHours: formatNumber(department.totalDays * 8),
      };
      let columnLeft = PAGE_MARGIN;

      SUMMARY_COLUMNS.forEach((column) => {
        pdfDocument
          .fillColor(PDF_COLORS.bodyText)
          .font("Helvetica")
          .fontSize(9)
          .text(rowValues[column.key], columnLeft + 2, currentTop + 4, {
            width: column.width - 4,
            align: column.align,
            ellipsis: true,
          });
        columnLeft += column.width;
      });
      currentTop += 18;
    });
  }

  pdfDocument
    .rect(PAGE_MARGIN, currentTop + 2, 527, 8)
    .fill(PDF_COLORS.header);
  return currentTop + 12;
}

function getLeaveRowHeight(pdfDocument, rowValues) {
  let requiredHeight = 22;
  LEAVE_COLUMNS.forEach((column) => {
    const textHeight = pdfDocument.heightOfString(
      String(rowValues[column.key] || ""),
      {
        width: column.width - 10,
        align: column.align,
      },
    );
    requiredHeight = Math.max(requiredHeight, textHeight + 9);
  });
  return requiredHeight;
}

function drawLeaveRow(pdfDocument, reportRow, isFirstEmployeeRow, top) {
  const employeeName =
    reportRow.employee_scope === "Past Employee"
      ? `${reportRow.employee_name} (Past Employee)`
      : reportRow.employee_name;
  const rowValues = {
    employeeName: isFirstEmployeeRow ? employeeName : "",
    department: isFirstEmployeeRow ? reportRow.department : "",
    leaveDate: formatLeaveDate(reportRow),
    leaveType: reportRow.leave_type || "---",
    leaveHours: formatNumber(reportRow.leave_hours),
  };
  const rowHeight = getLeaveRowHeight(pdfDocument, rowValues);
  let columnLeft = PAGE_MARGIN;

  LEAVE_COLUMNS.forEach((column) => {
    pdfDocument
      .fillColor(PDF_COLORS.bodyText)
      .font("Helvetica")
      .fontSize(8.7)
      .text(rowValues[column.key], columnLeft + 3, top + 5, {
        width: column.width - 6,
        height: rowHeight - 7,
        align: column.align,
      });
    columnLeft += column.width;
  });

  pdfDocument
    .moveTo(PAGE_MARGIN, top + rowHeight)
    .lineTo(PAGE_MARGIN + 527, top + rowHeight)
    .strokeColor(PDF_COLORS.border)
    .lineWidth(0.35)
    .stroke();

  return top + rowHeight;
}

function writeLeaveDepartmentReportPdf(outputStream, reportPayload) {
  const { reportData, summary } = reportPayload;
  const pdfDocument = new PDFDocument({
    bufferPages: true,
    layout: "portrait",
    margin: PAGE_MARGIN,
    size: "A4",
  });
  pdfDocument.pipe(outputStream);

  let currentTop = drawDepartmentSummary(
    pdfDocument,
    summary.departmentTotals,
  );
  currentTop = drawHeaderRow(pdfDocument, LEAVE_COLUMNS, currentTop, 46);

  if (reportData.length === 0) {
    pdfDocument
      .fillColor(PDF_COLORS.mutedText)
      .font("Helvetica")
      .fontSize(10)
      .text(
        "No leave records match the selected filters.",
        PAGE_MARGIN,
        currentTop + 18,
        { width: 527, align: "center" },
      );
  } else {
    reportData.forEach((reportRow, rowIndex) => {
      const previousReportRow = reportData[rowIndex - 1];
      const isFirstEmployeeRow =
        !previousReportRow ||
        previousReportRow.user_id !== reportRow.user_id;
      const previewValues = {
        employeeName: isFirstEmployeeRow ? reportRow.employee_name : "",
        department: isFirstEmployeeRow ? reportRow.department : "",
        leaveDate: formatLeaveDate(reportRow),
        leaveType: reportRow.leave_type,
        leaveHours: formatNumber(reportRow.leave_hours),
      };
      const requiredHeight = getLeaveRowHeight(pdfDocument, previewValues);

      if (currentTop + requiredHeight > pdfDocument.page.height - PAGE_MARGIN) {
        pdfDocument.addPage();
        currentTop = drawHeaderRow(
          pdfDocument,
          LEAVE_COLUMNS,
          PAGE_MARGIN,
          46,
        );
      }

      currentTop = drawLeaveRow(
        pdfDocument,
        reportRow,
        isFirstEmployeeRow,
        currentTop,
      );
    });
  }

  pdfDocument.end();
}

export { writeLeaveDepartmentReportPdf };
