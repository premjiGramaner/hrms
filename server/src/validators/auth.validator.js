function loginSchema(body) {
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  return { value: { username, password } };
}

export { loginSchema };
