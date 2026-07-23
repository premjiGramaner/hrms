interface SupervisorOptionSource {
  id?: number | null;
  name: string;
}

export function uniqueCaseInsensitive(values: string[]) {
  const normalizedValues = new Set<string>();
  return values.filter((value) => {
    const normalizedValue = value.toLowerCase();
    if (normalizedValues.has(normalizedValue)) return false;
    normalizedValues.add(normalizedValue);
    return true;
  });
}

export function toSupervisorOptions(supervisors: SupervisorOptionSource[]) {
  return supervisors
    .filter(
      (supervisor): supervisor is SupervisorOptionSource & { id: number } =>
        typeof supervisor.id === "number",
    )
    .map((supervisor) => ({ id: supervisor.id, name: supervisor.name }));
}
