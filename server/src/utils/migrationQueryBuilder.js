const IDENTIFIER = /^[a-z_][a-z0-9_]*$/i;

function quoteIdentifier(identifier) {
  if (!IDENTIFIER.test(identifier)) {
    throw new Error(`Unsafe SQL identifier: ${identifier}`);
  }
  return `"${identifier}"`;
}

export function buildInsertQuery(table, data) {
  const entries = Object.entries(data).filter(([, value]) => value !== undefined);
  if (!entries.length) throw new Error("Cannot insert an empty record");
  const columns = entries.map(([column]) => quoteIdentifier(column));
  const values = entries.map(([, value]) => value);
  const placeholders = values.map((_, index) => `$${index + 1}`);
  return {
    text: `INSERT INTO ${quoteIdentifier(table)} (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING id`,
    values,
  };
}

export function buildUpdateQuery(table, data, keyColumn, keyValue) {
  const entries = Object.entries(data).filter(
    ([column, value]) => column !== keyColumn && value !== undefined && value !== null,
  );
  if (!entries.length) return null;
  const assignments = entries.map(
    ([column], index) => `${quoteIdentifier(column)} = $${index + 1}`,
  );
  const values = [...entries.map(([, value]) => value), keyValue];
  return {
    text: `UPDATE ${quoteIdentifier(table)} SET ${assignments.join(", ")}, updated_at = NOW() WHERE LOWER(TRIM(${quoteIdentifier(keyColumn)}::text)) = LOWER(TRIM($${values.length}::text)) RETURNING id`,
    values,
  };
}

export function buildExistingQuery(table, keyColumn) {
  return `SELECT id FROM ${quoteIdentifier(table)} WHERE LOWER(TRIM(${quoteIdentifier(keyColumn)}::text)) = LOWER(TRIM($1::text)) LIMIT 2`;
}
