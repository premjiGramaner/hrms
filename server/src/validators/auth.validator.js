function loginSchema(body) {
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const rememberMe = Boolean(body.rememberMe);

  if (!username || !password) {
    return { error: "Username and password are required" };
  }

  return { value: { username, password, rememberMe } };
}

export { loginSchema };
