export interface SearchableItem {
  id: string;
  label: string;
  path: string;
  module: string;
  keywords: string[];
  category: "tab" | "page";
}

export const searchableNavigation: SearchableItem[] = [
  {
    id: "hr-job-titles",
    label: "Job Titles",
    path: "/hradmin/job-titles",
    module: "HR Administration",
    keywords: ["job", "titles", "position", "designation", "role"],
    category: "tab",
  },
  {
    id: "hr-job-categories",
    label: "Job Categories",
    path: "/hradmin/job-categories",
    module: "HR Administration",
    keywords: ["job", "categories", "category", "classification"],
    category: "tab",
  },
  {
    id: "hr-sub-units",
    label: "Sub Units",
    path: "/hradmin/sub-units",
    module: "HR Administration",
    keywords: ["sub", "units", "department", "division", "organization"],
    category: "tab",
  },
  {
    id: "hr-role-access",
    label: "Role Access",
    path: "/hradmin/role-access",
    module: "HR Administration",
    keywords: ["role", "access", "permissions", "security", "authorization"],
    category: "tab",
  },
  {
    id: "hr-audit-trail",
    label: "Audit Trail",
    path: "/hradmin/audit-trail",
    module: "HR Administration",
    keywords: ["audit", "trail", "logs", "history", "tracking"],
    category: "tab",
  },

  {
    id: "emp-list",
    label: "Employee List",
    path: "/employees",
    module: "Employee Management",
    keywords: ["employee", "list", "staff", "personnel", "people"],
    category: "tab",
  },
  {
    id: "emp-superior",
    label: "Superior Section",
    path: "/employees/superior-section",
    module: "Employee Management",
    keywords: ["superior", "supervisor", "manager", "reporting", "hierarchy"],
    category: "tab",
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
  },
  {
    id: "report-anniversary",
    label: "Work Anniversary",
    path: "/reports/work-anniversary",
    module: "Reports and Analytics",
    keywords: ["work", "anniversary", "tenure", "service", "joining"],
    category: "tab",
  },
  {
    id: "report-termination",
    label: "Termination Report",
    path: "/reports/termination",
    module: "Reports and Analytics",
    keywords: ["termination", "exit", "resignation", "leaving", "offboarding"],
    category: "tab",
  },
  {
    id: "report-notifications",
    label: "Notifications",
    path: "/reports/notifications",
    module: "Reports and Analytics",
    keywords: ["notifications", "alerts", "email", "settings", "config"],
    category: "tab",
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
    id: "leave-entitlement",
    label: "Leave Entitlement",
    path: "/leave/entitlements",
    module: "Leave",
    keywords: ["leave", "entitlement", "balance", "quota", "allocation"],
    category: "tab",
  },
  {
    id: "leave-configure",
    label: "Configure Leave",
    path: "/leave/configure",
    module: "Leave",
    keywords: ["configure", "leave", "setup", "settings", "types"],
    category: "tab",
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
 * @returns Filtered and ranked search results
 */
export function searchNavigation(query: string): SearchableItem[] {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);

  const results = searchableNavigation
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
