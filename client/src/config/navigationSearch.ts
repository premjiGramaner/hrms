export interface SearchableItem {
  id: string;
  label: string;
  path: string;
  module: string;
  keywords: string[];
  category: "tab" | "page";
  roles?: string[];
}

export const searchableNavigation: SearchableItem[] = [
  {
    id: "hr-job-titles",
    label: "Job Titles",
    path: "/hradmin/job-titles",
    module: "HR Administration",
    keywords: ["job", "titles", "position", "designation", "role"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "hr-job-categories",
    label: "Job Categories",
    path: "/hradmin/job-categories",
    module: "HR Administration",
    keywords: ["job", "categories", "category", "classification"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "hr-sub-units",
    label: "Sub Units",
    path: "/hradmin/sub-units",
    module: "HR Administration",
    keywords: ["sub", "units", "department", "division", "organization"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "hr-role-access",
    label: "Role Access",
    path: "/hradmin/role-access",
    module: "HR Administration",
    keywords: ["role", "access", "permissions", "security", "authorization"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "hr-audit-trail",
    label: "Audit Trail",
    path: "/hradmin/audit-trail",
    module: "HR Administration",
    keywords: ["audit", "trail", "logs", "history", "tracking"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
  },

  {
    id: "emp-list",
    label: "Employee List",
    path: "/employees",
    module: "Employee Management",
    keywords: ["employee", "list", "staff", "personnel", "people"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "emp-superior",
    label: "Superior Section",
    path: "/employees/superior-section",
    module: "Employee Management",
    keywords: ["superior", "supervisor", "manager", "reporting", "hierarchy"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
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
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "report-anniversary",
    label: "Work Anniversary",
    path: "/reports/work-anniversary",
    module: "Reports and Analytics",
    keywords: ["work", "anniversary", "tenure", "service", "joining"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "report-termination",
    label: "Termination Report",
    path: "/reports/termination",
    module: "Reports and Analytics",
    keywords: ["termination", "exit", "resignation", "leaving", "offboarding"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "report-notifications",
    label: "Notifications",
    path: "/reports/notifications",
    module: "Reports and Analytics",
    keywords: ["notifications", "alerts", "email", "settings", "config"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
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
    roles: ["hradmin", "empmanager"],
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
    roles: ["hradmin", "empmanager"],
  },
  {
    id: "leave-configure",
    label: "Configure Leave",
    path: "/leave/configure",
    module: "Leave",
    keywords: ["configure", "leave", "setup", "settings", "types"],
    category: "tab",
    roles: ["hradmin", "empmanager"],
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

/**
 * Search function to find matching navigation items
 * @param query - Search query string
 * @param userRole - Current user's role for filtering
 * @returns Filtered and ranked search results
 */
export function searchNavigation(
  query: string,
  userRole?: string,
): SearchableItem[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);

  const roleFilteredItems = searchableNavigation.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    if (!userRole) {
      return false;
    }
    return item.roles.includes(userRole);
  });

  const results = roleFilteredItems
    .map((item) => {
      const labelMatch = item.label.toLowerCase().includes(normalizedQuery);
      const moduleMatch = item.module.toLowerCase().includes(normalizedQuery);
      const keywordMatches = item.keywords.filter((keyword) =>
        keyword.toLowerCase().includes(normalizedQuery),
      ).length;

      const allWordsMatch = words.every(
        (word) =>
          item.label.toLowerCase().includes(word) ||
          item.module.toLowerCase().includes(word) ||
          item.keywords.some((kw) => kw.toLowerCase().includes(word)),
      );

      let score = 0;
      if (labelMatch) score += 100;
      if (moduleMatch) score += 30;
      score += keywordMatches * 20;
      if (allWordsMatch) score += 10;

      if (item.label.toLowerCase() === normalizedQuery) score += 200;

      return { item, score };
    })
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((result) => result.item);

  return results;
}
