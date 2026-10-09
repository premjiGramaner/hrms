import { ROW_STATUS } from "../constants/migration.js";
import { toPostgresDate, toPostgresTimestamp } from "../utils/migrationDateConverter.js";
import {
  canonicalUniqueValue,
  getMappingForSheet,
  mapRow,
  normalizeName,
} from "./migrationMapping.service.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\-\s0-9]{7,30}$/;
const TRUE_VALUES = new Set(["true", "yes", "y", "1", "active"]);
const FALSE_VALUES = new Set(["false", "no", "n", "0", "inactive"]);
const EMPTY_MARKERS = new Set(["", "-", "n/a", "na", "null", "not available", "not applicable"]);

function issue(column, invalidValue, reason, severity = "ERROR", code = "VALIDATION", suggestedFix = "Correct the source value and upload the workbook again.") {
  return { column, invalidValue: invalidValue ?? "", reason, severity, code, suggestedFix };
}

function isEmpty(value) {
  return value === null || value === undefined || EMPTY_MARKERS.has(normalizeName(value));
}

function normalizeDate(value) {
  if (isEmpty(value)) return null;
  return toPostgresDate(value, process.env.LEAVE_MIGRATION_DATE_ORDER || "DMY");
}

function normalizeTimestamp(value) {
  if (isEmpty(value)) return null;
  return toPostgresTimestamp(value, process.env.LEAVE_MIGRATION_DATE_ORDER || "DMY");
}

function normalizeBoolean(value) {
  if (isEmpty(value)) return null;
  const normalized = normalizeName(value);
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return undefined;
}

function normalizeField(value, definition, field, issues) {
  if (isEmpty(value)) {
    if (definition.required) issues.push(issue(field, value, "Mandatory value is missing", "ERROR", "REQUIRED"));
    return null;
  }
  if (definition.type === "date") {
    const normalized = normalizeDate(value);
    if (normalized === undefined) issues.push(issue(field, value, "Invalid date value", "ERROR", "DATATYPE", "Use a valid Excel date or configured date format."));
    return normalized ?? null;
  }
  if (definition.type === "timestamp") {
    const normalized = normalizeTimestamp(value);
    if (normalized === undefined) issues.push(issue(field, value, "Invalid timestamp value", "ERROR", "DATATYPE", "Use a valid Excel date/time or configured date format."));
    return normalized ?? null;
  }
  if (definition.type === "boolean") {
    const normalized = normalizeBoolean(value);
    if (normalized === undefined) issues.push(issue(field, value, "Expected Yes/No or True/False", "ERROR", "DATATYPE"));
    return normalized ?? null;
  }
  if (definition.type === "numeric") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) issues.push(issue(field, value, "Expected a numeric value", "ERROR", "DATATYPE"));
    if (!Number.isFinite(numeric)) return null;
    if (definition.minExclusive !== undefined && numeric <= definition.minExclusive) {
      issues.push(issue(field, value, `Value must be greater than ${definition.minExclusive}`, "ERROR", "RANGE", "Provide a positive numeric value."));
    }
    return numeric;
  }
  let normalized = String(value).trim();
  if (definition.stripTrailingParenthetical) {
    normalized = normalized.replace(/\s*\([^)]*\)\s*$/, "").trim();
  }
  if (definition.valueAliases) {
    normalized = definition.valueAliases[normalizeName(normalized)] || normalized;
  }
  if (definition.maxLength && normalized.length > definition.maxLength) {
    issues.push(issue(field, value, `Maximum length is ${definition.maxLength} characters`, "ERROR", "LENGTH"));
  }
  if (definition.format === "email" && !EMAIL.test(normalized)) {
    issues.push(issue(field, value, "Invalid email address", "ERROR", "FORMAT"));
  }
  if (definition.format === "phone" && !PHONE.test(normalized)) {
    issues.push(issue(field, value, "Invalid phone number", "ERROR", "FORMAT"));
  }
  if (definition.lookup && !definition.lookup.includes(normalizeName(normalized))) {
    issues.push(issue(field, value, `Allowed values: ${definition.lookup.join(", ")}`, "ERROR", "LOOKUP"));
  }
  return normalized;
}

function incomingLookups(sheets) {
  const lookups = {
    job_titles: new Set(),
    job_categories: new Set(),
    sub_units: new Set(),
    locations: new Set(),
    employees: new Set(),
    leave_types: new Set(),
  };
  for (const sheet of sheets) {
    const mapping = getMappingForSheet(sheet.name);
    if (!mapping) continue;
    for (const row of sheet.rows) {
      const mapped = mapRow(row.values, mapping);
      if (lookups[mapping.entity]) {
        const value = mapped[mapping.keyColumn];
        if (!isEmpty(value)) lookups[mapping.entity].add(normalizeName(value));
      }
      for (const [field, definition] of Object.entries(mapping.fields)) {
        if (definition.lookupEntity && !isEmpty(mapped[field])) {
          lookups[definition.lookupEntity].add(normalizeName(mapped[field]));
        }
      }
      if (mapping.createEmployee) {
        [mapped.employee_id, mapped.email, mapped.name]
          .filter((value) => !isEmpty(value))
          .forEach((value) => lookups.employees.add(normalizeName(value)));
        if (!isEmpty(mapped.location)) lookups.locations.add(normalizeName(mapped.location));
        const composedName = [mapped.first_name, mapped.middle_name, mapped.last_name]
          .filter((value) => !isEmpty(value))
          .join(" ");
        if (composedName) lookups.employees.add(normalizeName(composedName));
      }
    }
  }
  return lookups;
}

export function validateWorkbook(parsedWorkbook, databaseLookups = {}, databaseUniqueValues = {}) {
  const stagedRows = [];
  const errors = [];
  const seenUnique = new Map();
  const incoming = incomingLookups(parsedWorkbook.sheets);
  let validRecords = 0;
  let invalidRecords = 0;
  let ignoredRecords = 0;
  let skippedDuplicateRecords = 0;
  let duplicateRecords = 0;
  let warnings = 0;

  for (const sheet of parsedWorkbook.sheets) {
    const mapping = getMappingForSheet(sheet.name);
    const ignoreReason = mapping?.ignoreReason || mapping?.unsupportedReason;
    for (const source of sheet.rows) {
      const rowIssues = [];
      if (!mapping) {
        rowIssues.push(issue("Sheet", sheet.name, "No configured database mapping exists for this sheet", "ERROR", "MAPPING"));
      } else if (ignoreReason) {
        rowIssues.push(issue("Sheet", sheet.name, ignoreReason, "WARNING", "IGNORED"));
      }
      const mapped = mapping && !ignoreReason ? mapRow(source.values, mapping) : {};
      const normalized = {};
      let rowIsDuplicate = false;
      let skipDuplicate = false;
      if (mapping && !ignoreReason) {
        for (const [field, definition] of Object.entries(mapping.fields)) {
          const normalizedValue = normalizeField(mapped[field], definition, field, rowIssues);
          if (!isEmpty(mapped[field]) || definition.required) normalized[field] = normalizedValue;
        }
        for (const [field, definition] of Object.entries(mapping.fields)) {
          const value = normalized[field];
          const referenceEntity = definition.lookupEntity || definition.referenceEntity;
          if (!referenceEntity || !value) continue;
          const allowed = new Set([
            ...(databaseLookups[referenceEntity] || []),
            ...(incoming[referenceEntity] || []),
          ].map(normalizeName));
          if (!allowed.has(normalizeName(value))) {
            const reason = definition.referenceEntity
              ? "Referenced record does not exist in the workbook or database"
              : "Referenced master value does not exist";
            rowIssues.push(issue(
              field,
              value,
              reason,
              "ERROR",
              "FOREIGN_KEY",
              definition.suggestedFix || "Create or correct the referenced record before migrating.",
            ));
          }
        }
        const uniqueFields = Object.entries(mapping.fields).filter(([, definition]) => definition.unique);
        for (const [field] of uniqueFields) {
          if (!normalized[field]) continue;
          const normalizedValue = canonicalUniqueValue(normalized[field]);
          const key = `${mapping.entity}:${field}:${normalizedValue}`;
          if (seenUnique.has(key)) {
            rowIsDuplicate = true;
            skipDuplicate = true;
            rowIssues.push(issue(field, normalized[field], `Duplicate of row ${seenUnique.get(key)}; this row will be skipped`, "WARNING", "DUPLICATE"));
          } else {
            seenUnique.set(key, source.rowNumber);
            if ((databaseUniqueValues[`${mapping.entity}:${field}`] || []).includes(normalizedValue)) {
              rowIsDuplicate = true;
              rowIssues.push(issue(field, normalized[field], "Record already exists in the database and will be skipped unless overwrite is enabled", "WARNING", "DUPLICATE"));
            }
          }
        }
      }
      if (rowIsDuplicate) duplicateRecords += 1;
      const hasErrors = rowIssues.some((entry) => entry.severity === "ERROR");
      const hasWarnings = rowIssues.some((entry) => entry.severity === "WARNING");
      if (ignoreReason) ignoredRecords += 1;
      else if (hasErrors) invalidRecords += 1;
      else if (skipDuplicate) skippedDuplicateRecords += 1;
      else validRecords += 1;
      warnings += rowIssues.filter((entry) => entry.severity === "WARNING").length;
      rowIssues.forEach((entry) => errors.push({ sheet: sheet.name, row: source.rowNumber, ...entry }));
      stagedRows.push({
        sheetName: sheet.name,
        sheetOrder: sheet.sheetOrder,
        sourceRow: source.rowNumber,
        entityType: mapping?.entity || null,
        targetTable: mapping?.table || null,
        rawData: source.values,
        normalizedData: normalized,
        status: ignoreReason || (skipDuplicate && !hasErrors)
          ? ROW_STATUS.SKIPPED
          : hasErrors
            ? ROW_STATUS.INVALID
            : hasWarnings
              ? ROW_STATUS.WARNING
              : ROW_STATUS.VALID,
        validationErrors: rowIssues,
      });
    }
  }
  return {
    stagedRows,
    errors,
    summary: {
      totalSheets: parsedWorkbook.sheets.length,
      totalRecords: parsedWorkbook.totalRows,
      validRecords,
      invalidRecords,
      ignoredRecords,
      skippedDuplicateRecords,
      duplicateRecords,
      warnings,
      errors: errors.filter((entry) => entry.severity === "ERROR").length,
    },
  };
}
