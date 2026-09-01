"""
Supported intents and their human-readable labels.

Add new intents here — the classifier and intent router pick them up
automatically without changes elsewhere.
"""

from enum import StrEnum


class Intent(StrEnum):
    # ── Queries about another employee ───────────────────────────────────────
    EMPLOYEE_PROFILE      = "EMPLOYEE_PROFILE"
    EMPLOYEE_EMAIL        = "EMPLOYEE_EMAIL"
    EMPLOYEE_PHONE        = "EMPLOYEE_PHONE"
    EMPLOYEE_DEPARTMENT   = "EMPLOYEE_DEPARTMENT"
    EMPLOYEE_DESIGNATION  = "EMPLOYEE_DESIGNATION"
    EMPLOYEE_MANAGER      = "EMPLOYEE_MANAGER"
    EMPLOYEE_JOINING_DATE = "EMPLOYEE_JOINING_DATE"
    EMPLOYEE_STATUS       = "EMPLOYEE_STATUS"
    EMPLOYEE_LOCATION     = "EMPLOYEE_LOCATION"
    EMPLOYEE_LEAVE_BALANCE = "EMPLOYEE_LEAVE_BALANCE"  # ← NEW

    # ── Self-service queries ──────────────────────────────────────────────────
    MY_PROFILE      = "MY_PROFILE"
    MY_EMAIL        = "MY_EMAIL"
    MY_PHONE        = "MY_PHONE"
    MY_DEPARTMENT   = "MY_DEPARTMENT"
    MY_DESIGNATION  = "MY_DESIGNATION"
    MY_MANAGER      = "MY_MANAGER"
    MY_JOINING_DATE = "MY_JOINING_DATE"
    MY_LEAVE_BALANCE = "MY_LEAVE_BALANCE"
    MY_STATUS        = "MY_STATUS"
    MY_LOCATION      = "MY_LOCATION"

    # ── Fallback ──────────────────────────────────────────────────────────────
    UNKNOWN = "UNKNOWN"


# Ordered list used as label indices for the fine-tuned classifier
INTENT_LABELS: list[str] = [i.value for i in Intent if i != Intent.UNKNOWN]

INTENT_DISPLAY: dict[str, str] = {
    Intent.EMPLOYEE_PROFILE:       "Employee Profile",
    Intent.EMPLOYEE_EMAIL:         "Employee Email",
    Intent.EMPLOYEE_PHONE:         "Employee Phone",
    Intent.EMPLOYEE_DEPARTMENT:    "Employee Department",
    Intent.EMPLOYEE_DESIGNATION:   "Employee Designation",
    Intent.EMPLOYEE_MANAGER:       "Employee Manager",
    Intent.EMPLOYEE_JOINING_DATE:  "Employee Joining Date",
    Intent.EMPLOYEE_STATUS:        "Employee Status",
    Intent.EMPLOYEE_LOCATION:      "Employee Location",
    Intent.EMPLOYEE_LEAVE_BALANCE: "Employee Leave Balance",
    Intent.MY_PROFILE:             "My Profile",
    Intent.MY_EMAIL:               "My Email",
    Intent.MY_PHONE:               "My Phone",
    Intent.MY_DEPARTMENT:          "My Department",
    Intent.MY_DESIGNATION:         "My Designation",
    Intent.MY_MANAGER:             "My Manager",
    Intent.MY_JOINING_DATE:        "My Joining Date",
    Intent.MY_LEAVE_BALANCE:       "My Leave Balance",
    Intent.MY_STATUS:              "My Status",
    Intent.MY_LOCATION:            "My Location",
    Intent.UNKNOWN:                "Unknown",
}
