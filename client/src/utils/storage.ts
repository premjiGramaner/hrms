export function readJson<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
