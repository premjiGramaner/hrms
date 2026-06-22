const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function employeeSchema(body) {
  const value = { ...body };
  value.email = String(body.work_email || body.email || "").trim();

  if (!String(value.first_name || "").trim())
    return { error: "First name is required" };
  if (!String(value.last_name || "").trim())
    return { error: "Last name is required" };
  if (!value.email) return { error: "Work email is required" };
  if (!EMAIL_REGEX.test(value.email))
    return { error: "Enter a valid work email" };

  if (typeof value.supervisors === "string") {
    try {
      value.supervisors = JSON.parse(value.supervisors);
    } catch {
      return { error: "Invalid supervisors value" };
    }
  }

  if (value.supervisors && !Array.isArray(value.supervisors)) {
    return { error: "Invalid supervisors value" };
  }

  return { value };
}

export { employeeSchema };
