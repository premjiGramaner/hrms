export function validateLogin(
  username: string,
  password: string,
): string | null {
  const trimmedUsername = username.trim();
  if (!trimmedUsername) return "Username or email is required.";
  if (!password) return "Password is required.";
  return null;
}
