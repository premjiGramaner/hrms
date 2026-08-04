const stringField = (headers, options = {}) => ({
  headers,
  type: "string",
  ...options,
});
const dateField = (headers, options = {}) => ({
  headers,
  type: "date",
  ...options,
});
const timestampField = (headers, options = {}) => ({
  headers,
  type: "timestamp",
  ...options,
});

export const MIGRATION_MAPPINGS = Object.freeze({
  job_titles: {
    entity: "job_titles",
    sheetNames: ["job titles", "job_titles", "jobtitles"],
    table: "tbl_job_titles",
    priority: 10,
    keyColumn: "title",
    fields: {
      title: stringField(["title", "job title", "job_title"], {
        required: true,
        unique: true,
        maxLength: 150,
      }),
      description: stringField(["description"], { maxLength: 5000 }),
      is_active: {
        headers: ["is active", "is_active", "active"],
        type: "boolean",
      },
    },
  },
  job_categories: {
    entity: "job_categories",
    sheetNames: ["job categories", "job_categories", "jobcategories"],
    table: "tbl_job_categories",
    priority: 20,
    keyColumn: "category",
    fields: {
      category: stringField(["category", "job category", "job_category"], {
        required: true,
        unique: true,
        maxLength: 150,
      }),
      description: stringField(["description"], { maxLength: 5000 }),
      is_active: {
        headers: ["is active", "is_active", "active"],
        type: "boolean",
      },
    },
  },
  sub_units: {
    entity: "sub_units",
    sheetNames: ["sub units", "sub_units", "departments", "subunits"],
    table: "tbl_sub_units",
    priority: 30,
    keyColumn: "sub_unit_name",
    fields: {
      sub_unit_name: stringField(
        ["sub unit", "sub_unit", "sub unit name", "department"],
        {
          required: true,
          unique: true,
          maxLength: 150,
        },
      ),
      supervisor_name: stringField(
        ["supervisor", "supervisor name", "supervisor_name"],
        { maxLength: 150 },
      ),
      description: stringField(["description"], { maxLength: 5000 }),
      is_active: {
        headers: ["is active", "is_active", "active"],
        type: "boolean",
      },
    },
  },
  employees: {
    entity: "employees",
    kind: "employee",
    createEmployee: true,
    sheetNames: [
      "employees",
      "employee",
      "employee data",
      "employee details",
      "staff",
      "master directory",
    ],
    table: "tbl_appusers",
    priority: 100,
    keyColumn: "email",
    fields: {
      employee_id: stringField(
        ["employee id", "employee_id", "emp id", "emp_id"],
        { required: true, unique: true, maxLength: 50 },
      ),
      name: stringField(["full name", "employee name"], { maxLength: 200 }),
      first_name: stringField(
        ["first name", "employee first name", "first_name", "firstname"],
        { required: true, maxLength: 100 },
      ),
      middle_name: stringField(
        ["middle name", "employee middle name", "middle_name", "middlename"],
        { maxLength: 100 },
      ),
      last_name: stringField(
        ["last name", "employee last name", "last_name", "lastname", "surname"],
        { required: true, maxLength: 100 },
      ),
      email: stringField(
        ["email", "work email", "work_email", "official email"],
        { required: true, unique: true, format: "email", maxLength: 200 },
      ),
      other_email: stringField(
        ["other email", "personal email", "other_email"],
        { format: "email", maxLength: 200 },
      ),
      mobile: stringField(
        ["mobile", "phone", "mobile number", "phone number"],
        { format: "phone", maxLength: 30 },
      ),
      home_tel: stringField(["home telephone", "home phone", "home_tel"], {
        format: "phone",
        maxLength: 30,
      }),
      work_tel: stringField(["work telephone", "work phone", "work_tel"], {
        format: "phone",
        maxLength: 30,
      }),
      dob: dateField(["date of birth", "dob", "birth date"]),
      joined_date: dateField([
        "joined date",
        "joining date",
        "joined_date",
        "date of joining",
      ]),
      gender: stringField(["gender"], { lookup: ["male", "female", "other"] }),
      nationality: stringField(["nationality"], { maxLength: 100 }),
      marital_status: stringField(["marital status", "marital_status"], {
        maxLength: 50,
      }),
      job_title: stringField(["job title", "job_title", "designation"], {
        lookupEntity: "job_titles",
      }),
      job_category: stringField(["job category", "job_category"], {
        lookupEntity: "job_categories",
      }),
      sub_unit: stringField(["sub unit", "sub_unit", "department"], {
        lookupEntity: "sub_units",
      }),
      location: stringField(["location", "work location"], { maxLength: 100 }),
      role: stringField(["role", "system role"], {
        lookup: [
          "employee",
          "empmanager",
          "hradmin",
          "supervisor",
          "manager",
          "line_manager",
          "reporting_manager",
        ],
      }),
      employment_status: stringField(
        ["employment status", "employment_status"],
        { maxLength: 100 },
      ),
      address1: stringField(["address", "address1", "address line 1"], {
        maxLength: 255,
      }),
      address2: stringField(["street1", "address2", "address line 2"], {
        maxLength: 255,
      }),
      city: stringField(["city"], { maxLength: 100 }),
      state: stringField(["state", "province"], { maxLength: 100 }),
      country: stringField(["country"], { maxLength: 100 }),
      zip: stringField(["zip", "postal code", "postcode"], { maxLength: 20 }),
      probation_end_date: dateField([
        "probation end date",
        "probation_end_date",
      ]),
      date_of_permanence: dateField([
        "date of permanency",
        "date of permanence",
        "date_of_permanence",
      ]),
      contract_start_date: dateField([
        "contract start date",
        "contract_start_date",
      ]),
      contract_end_date: dateField(["contract end date", "contract_end_date"]),
      attendance_calc: stringField(
        ["work schedule", "attendance calculation", "attendance_calc"],
        { maxLength: 100 },
      ),
      termination_reason: stringField(["termination reason"], {
        maxLength: 500,
      }),
      termination_notes: stringField(
        ["termination note", "termination notes"],
        { maxLength: 10000 },
      ),
      comments: stringField(["comments", "notes"], { maxLength: 10000 }),
    },
  },
  employee_service_history: {
    entity: "employee_service_history",
    kind: "employee_enrichment",
    updateOnly: true,
    sheetNames: ["employees with 5+ years of service", "5+ years service"],
    table: "tbl_appusers",
    priority: 120,
    keyColumn: "employee_id",
    fields: {
      employee_id: stringField(["employee id"], {
        required: true,
        maxLength: 50,
      }),
      first_name: stringField(["employee first name"], { maxLength: 100 }),
      middle_name: stringField(["employee middle name"], { maxLength: 100 }),
      last_name: stringField(["employee last name"], { maxLength: 100 }),
      contract_start_date: dateField(["contract start date"]),
      contract_end_date: dateField(["contract end date"]),
      job_title: stringField(["job title"], { lookupEntity: "job_titles" }),
      employment_status: stringField(["employment status"], { maxLength: 100 }),
      job_category: stringField(["job category"], {
        lookupEntity: "job_categories",
      }),
      joined_date: dateField(["joined date", "date of joining"]),
      sub_unit: stringField(["sub unit"], { lookupEntity: "sub_units" }),
      location: stringField(["location"], { maxLength: 100 }),
      attendance_calc: stringField(["work schedule"], { maxLength: 100 }),
      probation_end_date: dateField(["probation end date"]),
      date_of_permanence: dateField(["date of permanency"]),
      comments: stringField(["comment"], { maxLength: 10000 }),
    },
  },
  emergency_contacts_report: {
    entity: "emergency_contacts_report",
    kind: "employee_enrichment",
    updateOnly: true,
    sheetNames: [
      "emergency contacts & dependents",
      "emergency contacts and dependents",
      "emergency contacts",
    ],
    table: "tbl_appusers",
    priority: 130,
    keyColumn: "employee_id",
    fields: {
      employee_id: stringField(["employee id"], {
        required: true,
        maxLength: 50,
      }),
      dob: dateField(["date of birth"]),
      gender: stringField(["gender"], { lookup: ["male", "female", "other"] }),
      marital_status: stringField(["marital status"], { maxLength: 50 }),
      address1: stringField(["address"], { maxLength: 255 }),
      address2: stringField(["street1"], { maxLength: 255 }),
      city: stringField(["city"], { maxLength: 100 }),
      state: stringField(["state/province", "state"], { maxLength: 100 }),
      zip: stringField(["zip/postal code", "zip"], { maxLength: 20 }),
      country: stringField(["country"], { maxLength: 100 }),
      other_email: stringField(["other email"], {
        format: "email",
        maxLength: 200,
      }),
      job_title: stringField(["job title"], { lookupEntity: "job_titles" }),
      employment_status: stringField(["employment status"], { maxLength: 100 }),
      sub_unit: stringField(["sub unit"], { lookupEntity: "sub_units" }),
      location: stringField(["location"], { maxLength: 100 }),
    },
  },
  salary_report: {
    entity: "salary_report",
    kind: "employee_enrichment",
    updateOnly: true,
    sheetNames: ["salary report"],
    table: "tbl_appusers",
    priority: 140,
    keyColumn: "employee_id",
    fields: {
      employee_id: stringField(["employee id"], {
        required: true,
        maxLength: 50,
      }),
      first_name: stringField(["employee first name"], { maxLength: 100 }),
      middle_name: stringField(["employee middle name"], { maxLength: 100 }),
      last_name: stringField(["employee last name"], { maxLength: 100 }),
      job_title: stringField(["job title"], { lookupEntity: "job_titles" }),
      employment_status: stringField(["employment status"], { maxLength: 100 }),
      joined_date: dateField(["joined date", "date of joining"]),
      sub_unit: stringField(["sub unit"], { lookupEntity: "sub_units" }),
      location: stringField(["location"], { maxLength: 100 }),
    },
  },
  leave_requests: {
    entity: "leave_requests",
    kind: "leave_request",
    sheetNames: ["all leave requests", "leave requests"],
    table: "tbl_leave_requests",
    priority: 300,
    fields: {
      employee_reference: stringField(["employee name"], {
        required: true,
        maxLength: 255,
        referenceEntity: "employees",
        stripTrailingParenthetical: true,
        suggestedFix:
          "Add the employee to tbl_appusers or correct Employee Name.",
      }),
      job_title_reference: stringField(["job title"], {
        required: true,
        maxLength: 150,
        referenceEntity: "job_titles",
        suggestedFix: "Use an active title from tbl_job_titles.",
      }),
      sub_unit_reference: stringField(["sub unit"], {
        required: true,
        maxLength: 150,
        referenceEntity: "sub_units",
        suggestedFix: "Use an active sub unit from tbl_sub_units.",
      }),
      location_reference: stringField(["location"], {
        required: true,
        maxLength: 150,
        referenceEntity: "locations",
        suggestedFix: "Use a location already assigned in the HRMS.",
      }),
      leave_type_reference: stringField(["leave type"], {
        required: true,
        maxLength: 150,
        referenceEntity: "leave_types",
        suggestedFix: "Use an active leave type name from tbl_leave_types.",
        valueAliases: {
          "privilege leave": "Privileged Leave",
          "carry forward privilege leave": "Carry Forward - Privileged Leave",
          "comp off": "Comp Off",
        },
      }),
      leave_date: dateField(["leave date"], { required: true }),
      requested_hours: {
        headers: ["leave duration (hours)"],
        type: "numeric",
        required: true,
        minExclusive: 0,
      },
      applied_on: timestampField(["leave applied on"], { required: true }),
    },
  },
  dashboard_report: {
    entity: "dashboard_report",
    kind: "ignored",
    sheetNames: ["dashboard"],
    table: null,
    priority: 700,
    ignoreReason:
      "Dashboard summary rows are informational and do not represent database records.",
    headerHints: ["metric", "value"],
    fields: {},
  },
  leave_summary_report: {
    entity: "leave_summary_report",
    kind: "ignored",
    sheetNames: ["leave summary"],
    table: null,
    priority: 710,
    ignoreReason:
      "Leave Summary contains aggregates; individual requests are imported from All Leave Requests.",
    headerHints: [
      "employee name",
      "total leave records",
      "total leave hours",
      "leave types used",
    ],
    fields: {},
  },
  hiring_turnover_report: {
    entity: "hiring_turnover_report",
    kind: "ignored",
    sheetNames: ["hiring & turnover", "hiring and turnover"],
    table: null,
    priority: 720,
    ignoreReason:
      "Hiring and turnover rows are derived report data; employees are imported from Master Directory.",
    headerHints: ["employee name", "sub unit", "hired date", "job title"],
    fields: {},
  },
  performance_trackers: {
    entity: "performance_trackers",
    kind: "ignored",
    sheetNames: ["employee performance trackers", "performance trackers"],
    table: null,
    priority: 800,
    ignoreReason:
      "Performance tracker rows cannot be imported without cycle, template, KPI question and reviewer-type identifiers.",
    headerHints: [
      "employee id",
      "employee name",
      "tracker name",
      "reviewer",
      "performance",
    ],
    fields: {},
  },
  terminated_employees: {
    entity: "terminated_employees",
    kind: "employee_enrichment",
    operation: "terminate",
    createEmployee: true,
    syntheticEmailForMissing: true,
    sheetNames: ["terminated employee list", "terminated employees"],
    table: "tbl_appusers",
    priority: 190,
    keyColumn: "employee_id",
    fields: {
      employee_id: stringField(["employee id"], {
        required: true,
        maxLength: 50,
      }),
      first_name: stringField(["employee first name"], { maxLength: 100 }),
      middle_name: stringField(["employee middle name"], { maxLength: 100 }),
      last_name: stringField(["employee last name"], { maxLength: 100 }),
      contract_start_date: dateField(["contract start date"]),
      contract_end_date: dateField(["contract end date"]),
      job_title: stringField(["job title"], { lookupEntity: "job_titles" }),
      employment_status: stringField(["employment status"], { maxLength: 100 }),
      job_category: stringField(["job category"], {
        lookupEntity: "job_categories",
      }),
      joined_date: dateField(["joined date", "date of joining"]),
      sub_unit: stringField(["sub unit"], { lookupEntity: "sub_units" }),
      location: stringField(["location"], { maxLength: 100 }),
      attendance_calc: stringField(["work schedule"], { maxLength: 100 }),
      termination_date: dateField(["termination date"], { required: true }),
      termination_reason: stringField(["termination reason"], {
        required: true,
        maxLength: 500,
      }),
      termination_notes: stringField(
        ["termination note", "termination notes"],
        { maxLength: 10000 },
      ),
      probation_end_date: dateField(["probation end date"]),
      date_of_permanence: dateField(["date of permanency"]),
      comments: stringField(["comment"], { maxLength: 10000 }),
    },
  },
});

export const LOOKUP_COLUMNS = Object.freeze({
  job_titles: { table: "tbl_job_titles", column: "title" },
  job_categories: { table: "tbl_job_categories", column: "category" },
  sub_units: { table: "tbl_sub_units", column: "sub_unit_name" },
});
