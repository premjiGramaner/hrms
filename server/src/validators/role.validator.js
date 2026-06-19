function roleSchema(body) {
  const role_name = String(body.role_name || "").trim();
  const role_type = body.role_type ? String(body.role_type).trim() : null;
  const description = body.description ? String(body.description).trim() : null;

  if (!role_name) {
    return { error: "role_name is required" };
  }

  return { value: { role_name, role_type, description } };
}

export { roleSchema };
