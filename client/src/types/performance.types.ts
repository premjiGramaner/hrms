export type AppraisalStatus =
  | "INITIATED"
  | "CREATED"
  | "NOT_CREATED"
  | "COMPLETED";

export interface PerformanceEmployee {
  id: string;
  employeeId: string;
  name: string;
  jobTitle: string;
  subUnit: string;
  location: string;
  employmentStatus: string;
  avatar?: string;
  supervisors?: Evaluator[];
  mainEvaluator?: Evaluator | null;
  evaluators?: Evaluator[];
  status?: string;
}

export interface Evaluator {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface Appraisal {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  from: string;
  to: string;
  dueDate: string;
  description: string;
  status: AppraisalStatus;
  reviewProgress: number;
  finalRating?: number;
}

export interface AppraisalDetail {
  id: string;
  cycleId: string;
  cycleStatus: AppraisalCycle["status"];
  templateId: string;
  employee: PerformanceEmployee;
  mainEvaluator: Evaluator | null;
  from: string;
  to: string;
  dueDate: string;
  description: string;
  status: AppraisalStatus;
  selfWeight: number;
  supervisorWeight: number;
  selfRating: number;
  supervisorRating: number;
  reviewProgress: number;
  finalRating?: number | null;
  selfSubmitted?: boolean;
  supervisorSubmitted?: boolean;
  template: AppraisalTemplate;
  questions: Array<
    TemplateQuestion & {
      selfScore: number;
      supervisorScore: number;
      selfComment?: string;
      supervisorComment?: string;
    }
  >;
}

export interface AppraisalCycle {
  id: string;
  name: string;
  location: string;
  fromDate: string;
  toDate: string;
  dueDate: string;
  status:
    | "Created"
    | "Appraisals Created"
    | "Activated"
    | "Closed"
    | "Reopened"
    | "In Progress"
    | "Completed";
  templateId: string;
  employeeIds: string[];
  employees?: PerformanceEmployee[];
}

export interface PerformanceTracker {
  id: string;
  employee: string;
  trackerName: string;
  reviewers: string[];
  addedDate: string;
  modifiedDate: string;
}

export interface CompetencyProfile {
  id: string;
  jobTitle: string;
  subUnits: string[];
  status: "Active" | "Inactive";
}

export type TemplateQuestionCategory =
  | "Behavioural Competency"
  | "Functional Competency"
  | "Leadership Competency"
  | "SMART Goals"
  | "General";

export interface TemplateQuestion {
  id: string;
  category: TemplateQuestionCategory;
  title: string;
  description: string;
  displayText: string;
  order: number;
  weight?: number;
  mandatory?: boolean;
  ratingType?: string;
  commentsRequired?: boolean;
}

export interface TemplateSection {
  id: string;
  name: string;
  weight: number;
  questions: TemplateQuestion[];
}

export interface AppraisalTemplate {
  id: string;
  jobTitle: string;
  templateName: string;
  weight: number;
  sections: TemplateSection[];
  isDefault?: boolean;
  header?: string;
}

export interface ReviewKpi {
  id: string;
  title: string;
  description: string;
  weight: number;
  finalScore?: number;
  selfScore?: number;
}
