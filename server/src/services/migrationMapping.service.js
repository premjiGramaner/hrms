import { MIGRATION_MAPPINGS } from "../config/migrationMappings.js";

const EXCEL_SHEET_NAME_LIMIT = 31;

export const normalizeName = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ")
    .trim();

export const canonicalUniqueValue = (value) =>
  String(value ?? "").trim().toLowerCase();

function sheetAliases(mapping) {
  return mapping.sheetNames.flatMap((name) => [
    normalizeName(name),
    normalizeName(String(name).slice(0, EXCEL_SHEET_NAME_LIMIT)),
  ]);
}

export function getMappingForSheet(sheetName) {
  const normalized = normalizeName(sheetName);
  return Object.values(MIGRATION_MAPPINGS).find((mapping) =>
    sheetAliases(mapping).includes(normalized),
  );
}

export function getHeaderAliases(mapping) {
  if (!mapping) return new Set();
  return new Set([
    ...(mapping.headerHints || []).map(normalizeName),
    ...Object.values(mapping.fields).flatMap((definition) =>
      definition.headers.map(normalizeName)
    ),
  ]);
}

function sourceValue(rawRow, headers) {
  const normalizedEntries = new Map(
    Object.entries(rawRow).map(([header, value]) => [normalizeName(header), value]),
  );
  for (const header of headers) {
    if (normalizedEntries.has(normalizeName(header))) {
      return normalizedEntries.get(normalizeName(header));
    }
  }
  return undefined;
}

export function mapRow(rawRow, mapping) {
  return Object.fromEntries(
    Object.entries(mapping.fields).map(([field, definition]) => [
      field,
      sourceValue(rawRow, definition.headers),
    ]),
  );
}

export function mappingByEntity(entity) {
  return MIGRATION_MAPPINGS[entity] || null;
}

export function tablesAffected(entities) {
  return [...new Set(entities.map((entity) => mappingByEntity(entity)?.table).filter(Boolean))];
}

export function collectUniqueCandidates(parsedWorkbook) {
  const candidates = {};
  for (const sheet of parsedWorkbook.sheets) {
    const mapping = getMappingForSheet(sheet.name);
    if (!mapping) continue;
    for (const row of sheet.rows) {
      const mapped = mapRow(row.values, mapping);
      for (const [field, definition] of Object.entries(mapping.fields)) {
        const value = mapped[field];
        if (!definition.unique || value === undefined || value === null || String(value).trim() === "") continue;
        const key = `${mapping.entity}:${field}`;
        if (!candidates[key]) candidates[key] = new Set();
        candidates[key].add(canonicalUniqueValue(value));
      }
    }
  }
  return Object.fromEntries(
    Object.entries(candidates).map(([key, values]) => [key, [...values]]),
  );
}
