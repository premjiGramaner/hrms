import { getLeaveMigrationConfig } from "../config/leaveMigration.config.js";
import { LeaveMigrationRepository } from "../repositories/leaveMigration.repository.js";
import { logLeaveRow } from "../utils/leaveMigrationLogger.js";
import { mapLeaveRequest } from "./leaveMigrationMapper.service.js";
import { validateLeaveMigrationRow } from "./leaveMigrationValidator.service.js";
import { MigrationLookupService } from "./migrationLookup.service.js";

const duplicateIssue = (source) => ({
  column: "Leave Request",
  invalidValue: `${source.employee_reference} / ${source.leave_type_reference} / ${source.leave_date}`,
  reason: "Matching leave request already exists",
  severity: "WARNING",
  code: "DUPLICATE",
  suggestedFix: "No action is required; the existing request was retained.",
});

export class LeaveMigrationService {
  constructor(migrationId, config, lookups, repository) {
    this.migrationId = migrationId;
    this.config = config;
    this.lookups = lookups;
    this.repository = repository;
  }

  static async create(pool, migrationId) {
    const [lookups, repository] = await Promise.all([
      MigrationLookupService.load(pool),
      LeaveMigrationRepository.load(pool),
    ]);
    return new LeaveMigrationService(
      migrationId,
      getLeaveMigrationConfig(),
      lookups,
      repository,
    );
  }

  async processRow(client, row) {
    const startedAt = Date.now();
    const source = { ...row.normalized_data };
    const validation = validateLeaveMigrationRow(source, this.lookups, this.config);
    if (!validation.valid) {
      const message = validation.errors.map((entry) => entry.reason).join("; ");
      await this.repository.markSkipped(client, row.id, message, validation.errors);
      logLeaveRow({
        migrationId: this.migrationId,
        row,
        employee: source.employee_reference,
        leaveType: source.leave_type_reference,
        status: "SKIPPED",
        errors: validation.errors.map((entry) => entry.reason),
        executionTimeMs: Date.now() - startedAt,
      });
      return "skipped";
    }

    const data = mapLeaveRequest(source, validation.resolved, this.config);
    if (this.repository.hasDuplicate(data)) {
      const issue = duplicateIssue(source);
      await this.repository.markSkipped(client, row.id, issue.reason, [issue]);
      logLeaveRow({ migrationId: this.migrationId, row, employee: source.employee_reference, leaveType: source.leave_type_reference, status: "SKIPPED", errors: [issue.reason], executionTimeMs: Date.now() - startedAt });
      return "skipped";
    }

    try {
      const result = await this.repository.insert(client, data);
      if (!result?.inserted) {
        const issue = duplicateIssue(source);
        await this.repository.markSkipped(client, row.id, issue.reason, [issue], result?.id || null);
        logLeaveRow({ migrationId: this.migrationId, row, employee: source.employee_reference, leaveType: source.leave_type_reference, status: "SKIPPED", errors: [issue.reason], executionTimeMs: Date.now() - startedAt });
        return "skipped";
      }
      await this.repository.markInserted(client, row.id, result.id);
      logLeaveRow({ migrationId: this.migrationId, row, employee: source.employee_reference, leaveType: source.leave_type_reference, status: "INSERTED", executionTimeMs: Date.now() - startedAt });
      return "inserted";
    } catch (error) {
      logLeaveRow({ migrationId: this.migrationId, row, employee: source.employee_reference, leaveType: source.leave_type_reference, status: "FAILED", errors: [error.message], executionTimeMs: Date.now() - startedAt });
      throw error;
    }
  }
}
