export function validateRole(roleName: string): string | null {
  if (!roleName.trim()) return "Role name is required.";
  return null;
}
