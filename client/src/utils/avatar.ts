export function getAvatarSrc(avatar?: string | null): string {
  if (!avatar) return "";
  if (
    avatar.startsWith("data:") ||
    avatar.startsWith("http://") ||
    avatar.startsWith("https://") ||
    avatar.startsWith("blob:")
  ) {
    return avatar;
  }
  if (avatar.startsWith("/")) return avatar;
  if (avatar.startsWith("uploads/")) return `/${avatar}`;
  return `/uploads/${avatar}`;
}

export function getInitials(name?: string | null, fallback = "?"): string {
  return (name || fallback)
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
