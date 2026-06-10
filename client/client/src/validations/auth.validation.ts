export function validateLogin(username: string, password: string): string | null {
  if (!username.trim()) return 'Username is required.';
  if (!password) return 'Password is required.';
  return null;
}
