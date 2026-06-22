function leaveRequestSchema(body) {
  const value = { ...body };

  if (!value.leave_type_id) return { error: "Leave type is required" };
  if (!value.start_date) return { error: "Start date is required" };
  if (!value.end_date) return { error: "End date is required" };

  const start = new Date(value.start_date);
  const end = new Date(value.end_date);
  if (isNaN(start.getTime())) return { error: "Invalid start date" };
  if (isNaN(end.getTime())) return { error: "Invalid end date" };
  if (end < start) return { error: "End date must be on or after start date" };

  value.leave_type_id = parseInt(value.leave_type_id);
  value.requested_days = parseFloat(value.requested_days) || 1;

  return { value };
}

function rejectLeaveSchema(body) {
  const value = { ...body };
  if (!String(value.rejection_reason || "").trim()) {
    return { error: "Rejection reason is required" };
  }
  return { value };
}

export { leaveRequestSchema, rejectLeaveSchema };
