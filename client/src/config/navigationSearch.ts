import { ADMIN_ROLES, type UserRole } from "./roles";

export type { UserRole } from "./roles";

export type NavigationCategory = "tab" | "page";

export type NavigationModule =
  | "HR Administration"
  | "Employee Management"
  | "Reports and Analytics"
  | "Leave"
  | "Performance";

export interface SearchableItem {
  readonly id: string;
  readonly label: string;
  readonly path: string;
  readonly module: NavigationModule;
  readonly keywords: readonly string[];
  readonly category: NavigationCategory;
  readonly roles?: readonly UserRole[];
}

export interface SearchResult {
  readonly item: SearchableItem;
  readonly score: number;
}

export interface SearchMatchDetails {
  readonly labelMatch: boolean;
  readonly moduleMatch: boolean;
  readonly keywordMatches: number;
  readonly allWordsMatch: boolean;
  readonly exactMatch: boolean;
}

export const searchableNavigation: SearchableItem[] = [
  {
    id: "hr-job-titles",
    label: "Job Titles",
    path: "/hradmin/job-titles",
    module: "HR Administration",
    keywords: ["job", "titles", "position", "designation", "role"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "hr-job-categories",
    label: "Job Categories",
    path: "/hradmin/job-categories",
    module: "HR Administration",
    keywords: ["job", "categories", "category", "classification"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "hr-sub-units",
    label: "Sub Units",
    path: "/hradmin/sub-units",
    module: "HR Administration",
    keywords: ["sub", "units", "department", "division", "organization"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "hr-role-access",
    label: "Role Access",
    path: "/hradmin/role-access",
    module: "HR Administration",
    keywords: ["role", "access", "permissions", "security", "authorization"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "hr-audit-trail",
    label: "Audit Trail",
    path: "/hradmin/audit-trail",
    module: "HR Administration",
    keywords: ["audit", "trail", "logs", "history", "tracking"],
    category: "tab",
    roles: ADMIN_ROLES,
  },

  {
    id: "emp-list",
    label: "Employee List",
    path: "/employees",
    module: "Employee Management",
    keywords: ["employee", "list", "staff", "personnel", "people"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "emp-superior",
    label: "Superior Section",
    path: "/employees/superior-section",
    module: "Employee Management",
    keywords: ["superior", "supervisor", "manager", "reporting", "hierarchy"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "emp-myinfo",
    label: "My Info",
    path: "/my-info",
    module: "Employee Management",
    keywords: ["my", "info", "profile", "personal", "details"],
    category: "tab",
  },

  {
    id: "report-birthday",
    label: "Birthday Report",
    path: "/reports/birthday",
    module: "Reports and Analytics",
    keywords: ["birthday", "report", "celebration", "date", "birth"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "report-anniversary",
    label: "Work Anniversary",
    path: "/reports/work-anniversary",
    module: "Reports and Analytics",
    keywords: ["work", "anniversary", "tenure", "service", "joining"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "report-termination",
    label: "Termination Report",
    path: "/reports/termination",
    module: "Reports and Analytics",
    keywords: ["termination", "exit", "resignation", "leaving", "offboarding"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "report-notifications",
    label: "Notifications",
    path: "/reports/notifications",
    module: "Reports and Analytics",
    keywords: ["notifications", "alerts", "email", "settings", "config"],
    category: "tab",
    roles: ADMIN_ROLES,
  },

  {
    id: "leave-apply",
    label: "Apply Leave",
    path: "/leave/apply",
    module: "Leave",
    keywords: ["apply", "leave", "request", "time off", "vacation"],
    category: "tab",
  },
  {
    id: "leave-list",
    label: "Leave List",
    path: "/leave/view_leave_list",
    module: "Leave",
    keywords: ["leave", "list", "requests", "history", "applications"],
    category: "tab",
  },
  {
    id: "leave-entitlement-add",
    label: "Add Entitlement",
    path: "/leave/entitlements/add",
    module: "Leave",
    keywords: ["add", "entitlement", "assign", "allocate", "grant", "leave"],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "leave-entitlement-my",
    label: "My Entitlements",
    path: "/leave/entitlements/my",
    module: "Leave",
    keywords: ["my", "entitlements", "balance", "quota", "allocation", "leave"],
    category: "tab",
  },
  {
    id: "leave-entitlement-list",
    label: "Employee Entitlements",
    path: "/leave/entitlements/list",
    module: "Leave",
    keywords: [
      "employee",
      "leave",
      "entitlements",
      "balance",
      "quota",
      "report",
    ],
    category: "tab",
    roles: ADMIN_ROLES,
  },
  {
    id: "leave-configure",
    label: "Configure Leave",
    path: "/leave/configure",
    module: "Leave",
    keywords: ["configure", "leave", "setup", "settings", "types"],
    category: "tab",
    roles: ADMIN_ROLES,
  },

  {
    id: "perf-appraisal-list",
    label: "Appraisal List",
    path: "/performance/appraisals_list",
    module: "Performance",
    keywords: ["appraisal", "list", "review", "evaluation", "assessment"],
    category: "tab",
  },
  {
    id: "perf-my-appraisals",
    label: "My Appraisals",
    path: "/performance/my_appraisals",
    module: "Performance",
    keywords: ["my", "appraisals", "review", "performance", "evaluation"],
    category: "tab",
  },
  {
    id: "perf-team-appraisals",
    label: "Team Appraisals",
    path: "/performance/team_appraisals",
    module: "Performance",
    keywords: ["team", "appraisals", "subordinate", "review", "evaluation"],
    category: "tab",
  },
  {
    id: "perf-cycles",
    label: "Appraisal Cycles",
    path: "/performance/appraisal_cycles",
    module: "Performance",
    keywords: ["appraisal", "cycles", "period", "timeline", "schedule"],
    category: "tab",
  },
  {
    id: "perf-templates",
    label: "Templates",
    path: "/performance/configuration/appraisal",
    module: "Performance",
    keywords: ["templates", "forms", "configuration", "setup", "appraisal"],
    category: "tab",
  },
];

function calculateMatchDetails(
  item: SearchableItem,
  normalizedQuery: string,
  words: string[],
): SearchMatchDetails {
  const labelLower = item.label.toLowerCase();
  const moduleLower = item.module.toLowerCase();

  const labelMatch = labelLower.includes(normalizedQuery);
  const moduleMatch = moduleLower.includes(normalizedQuery);
  const keywordMatches = item.keywords.filter((keyword) =>
    keyword.toLowerCase().includes(normalizedQuery),
  ).length;

  const allWordsMatch = words.every(
    (word) =>
      labelLower.includes(word) ||
      moduleLower.includes(word) ||
      item.keywords.some((kw) => kw.toLowerCase().includes(word)),
  );

  const exactMatch = labelLower === normalizedQuery;

  return {
    labelMatch,
    moduleMatch,
    keywordMatches,
    allWordsMatch,
    exactMatch,
  };
}

function calculateScore(matchDetails: SearchMatchDetails): number {
  let score = 0;

  if (matchDetails.exactMatch) score += 200;
  if (matchDetails.labelMatch) score += 100;
  if (matchDetails.moduleMatch) score += 30;
  score += matchDetails.keywordMatches * 20;
  if (matchDetails.allWordsMatch) score += 10;

  return score;
}

function filterByRole(
  items: readonly SearchableItem[],
  userRole?: UserRole | string,
): SearchableItem[] {
  return items.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    if (!userRole) {
      return false;
    }
    return item.roles.includes(userRole as UserRole);
  });
}

export function searchNavigation(
  query: string,
  userRole?: UserRole | string,
): SearchableItem[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);

  const roleFilteredItems = filterByRole(searchableNavigation, userRole);

  const results: SearchResult[] = roleFilteredItems
    .map((item): SearchResult => {
      const matchDetails = calculateMatchDetails(item, normalizedQuery, words);
      const score = calculateScore(matchDetails);
      return { item, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return results.map((result) => result.item);
}
