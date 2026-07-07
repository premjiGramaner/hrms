import React, { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  fetchNotificationConfig,
  updateNotificationConfig,
} from "../../api/report.api";
import { fetchAllEmployees } from "../../api/employee.api";
import type { NotificationConfig, Employee } from "../../types";

const TABS: TabItem[] = [
  { label: "Reports", path: "/reports" },
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
  const [saveMessage, setSaveMessage] = useState("");

  const [birthdayRecipients, setBirthdayRecipients] = useState<number[]>([]);
  const [birthdayDaysBefore, setBirthdayDaysBefore] = useState(2);
  const [birthdayActive, setBirthdayActive] = useState(true);

  const [anniversaryRecipients, setAnniversaryRecipients] = useState<number[]>(
    [],
  );
  const [anniversaryDaysBefore, setAnniversaryDaysBefore] = useState(2);
  const [anniversaryActive, setAnniversaryActive] = useState(true);

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const config = await fetchNotificationConfig();
      setBirthdayConfig(config.birthday);
      setAnniversaryConfig(config.work_anniversary);

      if (config.birthday) {
        setBirthdayRecipients(config.birthday.recipient_user_ids || []);
        setBirthdayDaysBefore(config.birthday.days_before || 2);
        setBirthdayActive(config.birthday.is_active !== false);
      }

      if (config.work_anniversary) {
        setAnniversaryRecipients(
          config.work_anniversary.recipient_user_ids || [],
        );
        setAnniversaryDaysBefore(config.work_anniversary.days_before || 2);
        setAnniversaryActive(config.work_anniversary.is_active !== false);
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
      const admins = result.data.filter(
        (emp: Employee) => emp.role === "hradmin" || emp.role === "empmanager",
      );
      setHrAdminUsers(admins);
    } catch (err) {
      console.error("Failed to load HR admin users:", err);
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
      await updateNotificationConfig({
        notification_type: "birthday",
        recipient_user_ids: birthdayRecipients,
        days_before: birthdayDaysBefore,
        is_active: birthdayActive,
      });
      setSaveMessage("Birthday notification configuration saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save birthday config:", err);
      setSaveMessage("Failed to save configuration. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnniversaryConfig = async () => {
    setIsSaving(true);
    setSaveMessage("");
    try {
      await updateNotificationConfig({
        notification_type: "work_anniversary",
        recipient_user_ids: anniversaryRecipients,
        days_before: anniversaryDaysBefore,
        is_active: anniversaryActive,
      });
      setSaveMessage(
        "Work anniversary notification configuration saved successfully!",
      );
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save anniversary config:", err);
      setSaveMessage("Failed to save configuration. Please try again.");
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

  if (isLoading) {
    return (
      <Layout title="Reports and Analytics" tabs={TABS} activeTab="Notifications">
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            fontSize: 14,
            color: "#64748b",
          }}
        >
          Loading notification configuration...
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reports and Analytics" tabs={TABS} activeTab="Notifications">
      <div style={{ padding: "20px 40px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 30 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#1B2A6B",
              marginBottom: 8,
            }}
          >
            📧 Report Notification Configuration
          </h1>
          <p style={{ fontSize: 14, color: "#64748b" }}>
            Configure automated email notifications for birthdays and work
            anniversaries
          </p>
        </div>

        {saveMessage && (
          <div
            style={{
              padding: "12px 20px",
              background: saveMessage.includes("success")
                ? "#D1FAE5"
                : "#FEE2E2",
              color: saveMessage.includes("success") ? "#065F46" : "#991B1B",
              borderRadius: 8,
              marginBottom: 20,
              fontSize: 13,
              fontWeight: 500,
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
            padding: 30,
            marginBottom: 30,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1B2A6B",
              marginBottom: 20,
            }}
          >
            🎂 Birthday Notifications
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 10,
              }}
            >
              <input
                type="checkbox"
                checked={birthdayActive}
                onChange={(e) => setBirthdayActive(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Enable Birthday Notifications
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#475569",
                marginBottom: 8,
              }}
            >
              Send Notification (Days Before Birthday)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={birthdayDaysBefore}
              onChange={(e) =>
                setBirthdayDaysBefore(parseInt(e.target.value) || 0)
              }
              style={{
                padding: "10px 14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 13,
                width: 200,
                outline: "none",
              }}
            />
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
              Set to 0 for same-day notifications, or 1-30 for advance
              notifications
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#475569",
                marginBottom: 12,
              }}
            >
              Select Recipients (HR Admins / Supervisors)
            </label>
            <div
              style={{
                maxHeight: 250,
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: 12,
              }}
            >
              {hrAdminUsers.map((user) => (
                <label
                  key={user.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    cursor: "pointer",
                    borderRadius: 4,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8f9fa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={birthdayRecipients.includes(user.id)}
                    onChange={() =>
                      toggleRecipient(
                        user.id,
                        birthdayRecipients,
                        setBirthdayRecipients,
                      )
                    }
                    style={{ width: 16, height: 16 }}
                  />
                  <span
                    style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}
                  >
                    {user.name || `${user.first_name} ${user.last_name}`}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    ({user.email})
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      background:
                        user.role === "hradmin" ? "#7C3AED" : "#3B82F6",
                      color: "#fff",
                    }}
                  >
                    {user.role}
                  </span>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
              Selected: {birthdayRecipients.length} recipient
              {birthdayRecipients.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={handleSaveBirthdayConfig}
            disabled={isSaving}
            style={{
              padding: "10px 24px",
              background: isSaving ? "#94a3b8" : "#16A085",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? "Saving..." : "Save Birthday Configuration"}
          </button>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: 30,
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#1B2A6B",
              marginBottom: 20,
            }}
          >
            🎊 Work Anniversary Notifications
          </h2>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 10,
              }}
            >
              <input
                type="checkbox"
                checked={anniversaryActive}
                onChange={(e) => setAnniversaryActive(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              Enable Work Anniversary Notifications
            </label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#475569",
                marginBottom: 8,
              }}
            >
              Send Notification (Days Before Anniversary)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={anniversaryDaysBefore}
              onChange={(e) =>
                setAnniversaryDaysBefore(parseInt(e.target.value) || 0)
              }
              style={{
                padding: "10px 14px",
                border: "1.5px solid #e2e8f0",
                borderRadius: 6,
                fontSize: 13,
                width: 200,
                outline: "none",
              }}
            />
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
              Set to 0 for same-day notifications, or 1-30 for advance
              notifications
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 600,
                color: "#475569",
                marginBottom: 12,
              }}
            >
              Select Recipients (HR Admins / Supervisors)
            </label>
            <div
              style={{
                maxHeight: 250,
                overflowY: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: 12,
              }}
            >
              {hrAdminUsers.map((user) => (
                <label
                  key={user.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    cursor: "pointer",
                    borderRadius: 4,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f8f9fa")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={anniversaryRecipients.includes(user.id)}
                    onChange={() =>
                      toggleRecipient(
                        user.id,
                        anniversaryRecipients,
                        setAnniversaryRecipients,
                      )
                    }
                    style={{ width: 16, height: 16 }}
                  />
                  <span
                    style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}
                  >
                    {user.name || `${user.first_name} ${user.last_name}`}
                  </span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>
                    ({user.email})
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      padding: "2px 8px",
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      background:
                        user.role === "hradmin" ? "#7C3AED" : "#3B82F6",
                      color: "#fff",
                    }}
                  >
                    {user.role}
                  </span>
                </label>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
              Selected: {anniversaryRecipients.length} recipient
              {anniversaryRecipients.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button
            onClick={handleSaveAnniversaryConfig}
            disabled={isSaving}
            style={{
              padding: "10px 24px",
              background: isSaving ? "#94a3b8" : "#16A085",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: isSaving ? "not-allowed" : "pointer",
            }}
          >
            {isSaving ? "Saving..." : "Save Anniversary Configuration"}
          </button>
        </div>
      </div>
    </Layout>
  );
}
