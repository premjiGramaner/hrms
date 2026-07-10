import React, { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  fetchNotificationConfig,
  updateNotificationConfig,
  triggerNotificationsManually,
} from "../../api/report.api";
import { fetchAllEmployees } from "../../api/employee.api";
import type { NotificationConfig, Employee } from "../../types";
import {
  IconBell,
  IconMail,
  IconGift,
  IconAward,
  IconSend,
  IconFlask,
  IconSave,
  IconCheck,
  IconAlertCircle,
} from "../../components/Icons";

const TABS: TabItem[] = [
  { label: "Birthday Report", path: "/reports/birthday" },
  { label: "Work Anniversary", path: "/reports/work-anniversary" },
  { label: "Termination Report", path: "/reports/termination" },
  { label: "Notifications", path: "/reports/notifications" },
];

export default function ReportNotificationConfigPage() {
  const [birthdayConfig, setBirthdayConfig] =
    useState<NotificationConfig | null>(null);
  const [anniversaryConfig, setAnniversaryConfig] =
    useState<NotificationConfig | null>(null);
  const [hrAdminUsers, setHrAdminUsers] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [birthdayRecipients, setBirthdayRecipients] = useState<number[]>([]);
  const [birthdayDaysBefore, setBirthdayDaysBefore] = useState(2);
  const [birthdayActive, setBirthdayActive] = useState(true);
  const [birthdayExternalEmails, setBirthdayExternalEmails] = useState<
    string[]
  >([]);
  const [birthdayEmailInput, setBirthdayEmailInput] = useState("");

  const [anniversaryRecipients, setAnniversaryRecipients] = useState<number[]>(
    [],
  );
  const [anniversaryDaysBefore, setAnniversaryDaysBefore] = useState(2);
  const [anniversaryActive, setAnniversaryActive] = useState(true);
  const [anniversaryExternalEmails, setAnniversaryExternalEmails] = useState<
    string[]
  >([]);
  const [anniversaryEmailInput, setAnniversaryEmailInput] = useState("");

  // Add CSS animation for loading spinner
  React.useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const config = await fetchNotificationConfig();
      setBirthdayConfig(config.birthday);
      setAnniversaryConfig(config.work_anniversary);

      if (config.birthday) {
        setBirthdayDaysBefore(config.birthday.days_before || 2);
        setBirthdayActive(config.birthday.is_active !== false);

        const externalEmailsArray = config.birthday.external_emails
          ? config.birthday.external_emails
              .split(",")
              .map((email) => email.trim())
              .filter(Boolean)
          : [];

        setBirthdayExternalEmails(externalEmailsArray);
      }

      if (config.work_anniversary) {
        setAnniversaryDaysBefore(config.work_anniversary.days_before || 2);
        setAnniversaryActive(config.work_anniversary.is_active !== false);

        const externalEmailsArray = config.work_anniversary.external_emails
          ? config.work_anniversary.external_emails
              .split(",")
              .map((email) => email.trim())
              .filter(Boolean)
          : [];

        setAnniversaryExternalEmails(externalEmailsArray);
      }
    } catch (err) {
      console.error("Failed to load notification config:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadHRAdmins = useCallback(async () => {
    try {
      const result = await fetchAllEmployees(1, 1000);
      const users = result.data.filter(
        (employee: Employee) => employee.email && employee.is_active !== false,
      );
      setHrAdminUsers(users);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadHRAdmins();
  }, [loadConfig, loadHRAdmins]);

  const handleSaveBirthdayConfig = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const externalEmailsString = birthdayExternalEmails.join(",");
      console.log(
        "Saving birthday config with external emails:",
        externalEmailsString,
      );

      await updateNotificationConfig({
        notification_type: "birthday",
        recipient_user_ids: [],
        days_before: birthdayDaysBefore,
        is_active: birthdayActive,
        external_emails: externalEmailsString,
      });

      setSaveMessage(
        "✅ Birthday notification configuration saved successfully!",
      );

      await loadConfig();

      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save birthday config:", err);
      setSaveMessage("❌ Failed to save configuration. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnniversaryConfig = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      const externalEmailsString = anniversaryExternalEmails.join(",");

      await updateNotificationConfig({
        notification_type: "work_anniversary",
        recipient_user_ids: [],
        days_before: anniversaryDaysBefore,
        is_active: anniversaryActive,
        external_emails: externalEmailsString,
      });

      setSaveMessage(
        "✅ Work anniversary notification configuration saved successfully!",
      );

      await loadConfig();

      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save anniversary config:", err);
      setSaveMessage("❌ Failed to save configuration. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRecipient = (
    userId: number,
    currentList: number[],
    setList: (list: number[]) => void,
  ) => {
    if (currentList.includes(userId)) {
      setList(currentList.filter((id) => id !== userId));
    } else {
      setList([...currentList, userId]);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const addExternalEmail = (
    email: string,
    currentList: string[],
    setList: (list: string[]) => void,
    setInput: (val: string) => void,
  ) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      alert("Please enter an email address");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      alert("Please enter a valid email address");
      return;
    }
    if (currentList.includes(trimmedEmail)) {
      alert("This email is already in the list");
      return;
    }
    setList([...currentList, trimmedEmail]);
    setInput("");
  };

  const removeExternalEmail = (
    email: string,
    currentList: string[],
    setList: (list: string[]) => void,
  ) => {
    setList(currentList.filter((e) => e !== email));
  };

  const handleTestNotifications = async () => {
    if (
      !window.confirm(
        "This will trigger notification emails immediately for any upcoming birthdays/anniversaries. Continue?",
      )
    ) {
      return;
    }

    setIsTesting(true);
    setSaveMessage("");
    try {
      const result = await triggerNotificationsManually();

      const birthdayMsg = result.results.birthday.success
        ? `✅ ${result.results.birthday.message}`
        : `⚠️ ${result.results.birthday.message}`;
      const anniversaryMsg = result.results.work_anniversary.success
        ? `✅ ${result.results.work_anniversary.message}`
        : `⚠️ ${result.results.work_anniversary.message}`;

      setSaveMessage(
        `🎉 Notifications Triggered!\n\n` +
          `Birthday: ${birthdayMsg}\n` +
          `Anniversary: ${anniversaryMsg}\n\n` +
          `📧 Check your email inbox (and spam folder) now!`,
      );

      setTimeout(() => setSaveMessage(""), 12000);
    } catch (err: any) {
      console.error("❌ Failed to trigger notifications:", err);

      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setSaveMessage(
          `❌ Unauthorized Access\n\n` +
            `Please log out and log back in with admin credentials, then try again.\n\n` +
            `This feature requires Global Admin (hradmin) role.`,
        );
      } else {
        const errorMsg =
          err?.response?.data?.message || err?.message || "Unknown error";
        setSaveMessage(
          `❌ Failed to trigger notifications\n\n` +
            `Error: ${errorMsg}\n\n` +
            `Check server console for details.`,
        );
      }

      setTimeout(() => setSaveMessage(""), 10000);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout
        title="Reports and Analytics"
        tabs={TABS}
        activeTab="Notifications"
      >
        <div style={{ padding: "40px", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              padding: "30px 50px",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: "4px solid #e2e8f0",
                borderTopColor: "#14b8a6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto 15px",
              }}
            />
            <p style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>
              Loading notification configuration...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reports and Analytics" tabs={TABS} activeTab="Notifications">
      <div style={{ padding: "30px 40px", maxWidth: 1400, margin: "0 auto" }}>
        <div
          style={{
            marginBottom: 30,
            background: "linear-gradient(135deg, #172554 0%, #14b8a6 100%)",
            padding: "25px 35px",
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            color: "#fff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconBell size={24} color="#fff" />
              </div>
              <div>
                <h1
                  style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px 0" }}
                >
                  Email Notification Configuration
                </h1>
                <p style={{ fontSize: 14, margin: 0, opacity: 0.9 }}>
                  Configure automated email alerts for birthdays and work
                  anniversaries
                </p>
              </div>
            </div>

            <button
              onClick={handleTestNotifications}
              disabled={isTesting}
              style={{
                padding: "12px 24px",
                background: isTesting ? "rgba(255,255,255,0.3)" : "#fff",
                color: isTesting ? "rgba(255,255,255,0.7)" : "#172554",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: isTesting ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconFlask
                size={16}
                color={isTesting ? "rgba(255,255,255,0.7)" : "#172554"}
              />
              {isTesting ? "Testing..." : "Test Notifications Now"}
            </button>
          </div>
        </div>

        {saveMessage && (
          <div
            style={{
              padding: "16px 24px",
              background:
                saveMessage.includes("success") ||
                saveMessage.includes("✅") ||
                saveMessage.includes("🎉")
                  ? "#D1FAE5"
                  : "#FEE2E2",
              color:
                saveMessage.includes("success") ||
                saveMessage.includes("✅") ||
                saveMessage.includes("🎉")
                  ? "#065F46"
                  : "#991B1B",
              borderRadius: 10,
              marginBottom: 25,
              fontSize: 14,
              fontWeight: 500,
              whiteSpace: "pre-line",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border:
                saveMessage.includes("success") ||
                saveMessage.includes("✅") ||
                saveMessage.includes("🎉")
                  ? "2px solid #10B981"
                  : "2px solid #EF4444",
            }}
          >
            {saveMessage}
          </div>
        )}

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            marginBottom: 30,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #172554 0%, #14b8a6 100%)",
              padding: "20px 30px",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconGift size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                Birthday Notifications
              </h2>
              <p style={{ fontSize: 13, margin: "4px 0 0", opacity: 0.9 }}>
                Automated email reminders for upcoming employee birthdays
              </p>
            </div>
          </div>

          <div style={{ padding: "30px" }}>
            <div style={{ marginBottom: 25 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "14px 18px",
                  background: birthdayActive ? "#ecfdf5" : "#f8fafc",
                  borderRadius: 10,
                  border: `2px solid ${birthdayActive ? "#14b8a6" : "#e2e8f0"}`,
                  transition: "all 0.2s",
                  boxShadow: birthdayActive
                    ? "0 2px 8px rgba(20,184,166,0.15)"
                    : "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={birthdayActive}
                  onChange={(e) => setBirthdayActive(e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: "pointer",
                    accentColor: "#14b8a6",
                  }}
                />
                <span
                  style={{
                    color: birthdayActive ? "#14b8a6" : "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {birthdayActive && <IconCheck size={16} color="#14b8a6" />}
                  {birthdayActive
                    ? "Notifications Enabled"
                    : "Enable Birthday Notifications"}
                </span>
              </label>
            </div>

            <div style={{ marginBottom: 25 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 10,
                }}
              >
                Days Before Birthday (0-30 days)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter days (0-30)"
                value={birthdayDaysBefore}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
                  const numValue = value === "" ? 0 : parseInt(value, 10);
                  if (numValue <= 30) {
                    setBirthdayDaysBefore(numValue);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value === "" || isNaN(parseInt(value, 10))) {
                    setBirthdayDaysBefore(2); // Default to 2
                  }
                }}
                style={{
                  padding: "11px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 13.5,
                  width: 220,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#172554")}
              />
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                <strong>0 days:</strong> Send notification for birthdays TODAY
                only
                <br />
                <strong>1-30 days:</strong> Send notifications for TODAY + next
                N days
                <br />
                <em>
                  Example: Enter 2 to get reminders for today, tomorrow, and day
                  after tomorrow
                </em>
                <br />
                <em style={{ color: "#f59e0b", fontWeight: 500 }}>
                  💡 You can type any number from 0 to 30
                </em>
              </p>
            </div>

            <div style={{ marginBottom: 25 }}>
              <div
                style={{
                  padding: "16px 20px",
                  background:
                    "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                  border: "2px solid #10b981",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "start",
                  gap: 12,
                }}
              >
                <div style={{ marginTop: 2 }}>
                  <IconCheck size={20} color="#10b981" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#065f46",
                      marginBottom: 6,
                    }}
                  >
                    📧 Auto Recipients: All Global Admins
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#047857",
                      lineHeight: "1.6",
                    }}
                  >
                    Notifications are automatically sent to{" "}
                    <strong>all global admins</strong> (HR Admins and Employee
                    Managers) in the system.
                    <br />
                    You don't need to select recipients - the system handles
                    this automatically!
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 25 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 12,
                }}
              >
                Add External Email Recipients{" "}
                <span
                  style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}
                >
                  (optional)
                </span>
              </label>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <input
                  type="email"
                  placeholder="Enter email address (e.g., manager@company.com)"
                  value={birthdayEmailInput}
                  onChange={(e) => setBirthdayEmailInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addExternalEmail(
                        birthdayEmailInput,
                        birthdayExternalEmails,
                        setBirthdayExternalEmails,
                        setBirthdayEmailInput,
                      );
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "11px 14px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 13.5,
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#172554")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e2e8f0")
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    addExternalEmail(
                      birthdayEmailInput,
                      birthdayExternalEmails,
                      setBirthdayExternalEmails,
                      setBirthdayEmailInput,
                    )
                  }
                  style={{
                    padding: "11px 24px",
                    background: "linear-gradient(135deg, #172554, #14b8a6)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 8px rgba(23,37,84,0.2)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-1px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  + Add Email
                </button>
              </div>
              {birthdayExternalEmails.length > 0 && (
                <div
                  style={{
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 14,
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconMail size={16} color="#14b8a6" />
                    External Email Recipients ({birthdayExternalEmails.length}):
                  </div>
                  {birthdayExternalEmails.map((email) => (
                    <div
                      key={email}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13.5,
                          color: "#1e293b",
                          fontWeight: 500,
                        }}
                      >
                        {email}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          removeExternalEmail(
                            email,
                            birthdayExternalEmails,
                            setBirthdayExternalEmails,
                          )
                        }
                        style={{
                          padding: "5px 12px",
                          background:
                            "linear-gradient(135deg, #dc2626, #e11d48)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(220,38,38,0.2)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = "translateY(-1px)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = "translateY(0)")
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
                Add external email addresses to receive notifications outside of
                system users
              </p>
            </div>

            <button
              onClick={handleSaveBirthdayConfig}
              disabled={isSaving}
              style={{
                padding: "12px 28px",
                background: isSaving
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #172554, #14b8a6)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14.5,
                fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
                boxShadow: isSaving ? "none" : "0 4px 12px rgba(23,37,84,0.25)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) =>
                !isSaving &&
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) =>
                !isSaving && (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <IconSave size={16} color="#fff" />
              {isSaving ? "Saving..." : "Save Birthday Configuration"}
            </button>
          </div>
        </div>

        {/* Work Anniversary Notifications Card */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            marginBottom: 30,
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #172554 0%, #14b8a6 100%)",
              padding: "20px 30px",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconAward size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                Work Anniversary Notifications
              </h2>
              <p style={{ fontSize: 13, margin: "4px 0 0", opacity: 0.9 }}>
                Automated email reminders for employee work anniversaries
              </p>
            </div>
          </div>

          {/* Card Body */}
          <div style={{ padding: "30px" }}>
            {/* Enable Checkbox */}
            <div style={{ marginBottom: 25 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "14px 18px",
                  background: anniversaryActive ? "#ecfdf5" : "#f8fafc",
                  borderRadius: 10,
                  border: `2px solid ${anniversaryActive ? "#14b8a6" : "#e2e8f0"}`,
                  transition: "all 0.2s",
                  boxShadow: anniversaryActive
                    ? "0 2px 8px rgba(20,184,166,0.15)"
                    : "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={anniversaryActive}
                  onChange={(e) => setAnniversaryActive(e.target.checked)}
                  style={{
                    width: 18,
                    height: 18,
                    cursor: "pointer",
                    accentColor: "#14b8a6",
                  }}
                />
                <span
                  style={{
                    color: anniversaryActive ? "#14b8a6" : "#64748b",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {anniversaryActive && <IconCheck size={16} color="#14b8a6" />}
                  {anniversaryActive
                    ? "Notifications Enabled"
                    : "Enable Work Anniversary Notifications"}
                </span>
              </label>
            </div>

            <div style={{ marginBottom: 25 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 10,
                }}
              >
                Days Before Anniversary (0-30 days)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter days (0-30)"
                value={anniversaryDaysBefore}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
                  const numValue = value === "" ? 0 : parseInt(value, 10);
                  if (numValue <= 30) {
                    setAnniversaryDaysBefore(numValue);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value === "" || isNaN(parseInt(value, 10))) {
                    setAnniversaryDaysBefore(2); // Default to 2
                  }
                }}
                style={{
                  padding: "11px 14px",
                  border: "1.5px solid #e2e8f0",
                  borderRadius: 10,
                  fontSize: 13.5,
                  width: 220,
                  outline: "none",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#172554")}
              />
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
                <strong>0 days:</strong> Send notification for anniversaries
                TODAY only
                <br />
                <strong>1-30 days:</strong> Send notifications for TODAY + next
                N days
                <br />
                <em>
                  Example: Enter 2 to get reminders for today, tomorrow, and day
                  after tomorrow
                </em>
                <br />
                <em style={{ color: "#f59e0b", fontWeight: 500 }}>
                  💡 You can type any number from 0 to 30
                </em>
              </p>
            </div>

            {/* Auto Recipients Info Box */}
            <div style={{ marginBottom: 25 }}>
              <div
                style={{
                  padding: "16px 20px",
                  background:
                    "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                  border: "2px solid #10b981",
                  borderRadius: 10,
                  display: "flex",
                  alignItems: "start",
                  gap: 12,
                }}
              >
                <div style={{ marginTop: 2 }}>
                  <IconCheck size={20} color="#10b981" />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#065f46",
                      marginBottom: 6,
                    }}
                  >
                    📧 Auto Recipients: All Global Admins
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#047857",
                      lineHeight: "1.6",
                    }}
                  >
                    Notifications are automatically sent to{" "}
                    <strong>all global admins</strong> (HR Admins and Employee
                    Managers) in the system.
                    <br />
                    You don't need to select recipients - the system handles
                    this automatically!
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 25 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "#374151",
                  marginBottom: 12,
                }}
              >
                Add External Email Recipients{" "}
                <span
                  style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}
                >
                  (optional)
                </span>
              </label>
              <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                <input
                  type="email"
                  placeholder="Enter email address (e.g., manager@company.com)"
                  value={anniversaryEmailInput}
                  onChange={(e) => setAnniversaryEmailInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addExternalEmail(
                        anniversaryEmailInput,
                        anniversaryExternalEmails,
                        setAnniversaryExternalEmails,
                        setAnniversaryEmailInput,
                      );
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: "11px 14px",
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    fontSize: 13.5,
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "#172554")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "#e2e8f0")
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    addExternalEmail(
                      anniversaryEmailInput,
                      anniversaryExternalEmails,
                      setAnniversaryExternalEmails,
                      setAnniversaryEmailInput,
                    )
                  }
                  style={{
                    padding: "11px 24px",
                    background: "linear-gradient(135deg, #172554, #14b8a6)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 8px rgba(23,37,84,0.2)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.transform = "translateY(-1px)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  + Add Email
                </button>
              </div>
              {anniversaryExternalEmails.length > 0 && (
                <div
                  style={{
                    border: "1.5px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 14,
                    background: "#f8fafc",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconMail size={16} color="#14b8a6" />
                    External Email Recipients (
                    {anniversaryExternalEmails.length}):
                  </div>
                  {anniversaryExternalEmails.map((email) => (
                    <div
                      key={email}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        background: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13.5,
                          color: "#1e293b",
                          fontWeight: 500,
                        }}
                      >
                        {email}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          removeExternalEmail(
                            email,
                            anniversaryExternalEmails,
                            setAnniversaryExternalEmails,
                          )
                        }
                        style={{
                          padding: "5px 12px",
                          background:
                            "linear-gradient(135deg, #dc2626, #e11d48)",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: "0 2px 6px rgba(220,38,38,0.2)",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.transform = "translateY(-1px)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.transform = "translateY(0)")
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 10 }}>
                Add external email addresses to receive notifications outside of
                system users
              </p>
            </div>

            <button
              onClick={handleSaveAnniversaryConfig}
              disabled={isSaving}
              style={{
                padding: "12px 28px",
                background: isSaving
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #172554, #14b8a6)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                fontSize: 14.5,
                fontWeight: 700,
                cursor: isSaving ? "not-allowed" : "pointer",
                boxShadow: isSaving ? "none" : "0 4px 12px rgba(23,37,84,0.25)",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
              onMouseEnter={(e) =>
                !isSaving &&
                (e.currentTarget.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) =>
                !isSaving && (e.currentTarget.style.transform = "translateY(0)")
              }
            >
              <IconSave size={16} color="#fff" />
              {isSaving ? "Saving..." : "Save Anniversary Configuration"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
