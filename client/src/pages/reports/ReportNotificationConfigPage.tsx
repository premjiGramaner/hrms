import React, { useState, useEffect, useCallback } from "react";
import Layout, { TabItem } from "../../components/Layout";
import {
  fetchNotificationConfig,
  updateNotificationConfig,
  triggerNotificationsManually,
} from "../../api/report.api";
import { fetchAllEmployees } from "../../api/employee.api";

import {
  IconBell,
  IconMail,
  IconGift,
  IconAward,
  IconFlask,
  IconSave,
  IconCheck,
} from "../../components/Icons";
import Alert from "../../utils/alert";
import { getNumericValue } from "../employees/components/inputHelpers";
import { validateEmail } from "../../validations/employee.validation";
import { PAGE_PATHS } from "../../config/roles";

const TABS: TabItem[] = [
  { label: "Birthday Report", path: PAGE_PATHS.reportsBirthday },
  { label: "Work Anniversary", path: PAGE_PATHS.reportsWorkAnniversary },
  { label: "Termination Report", path: PAGE_PATHS.reportsTermination },
  { label: "Notifications", path: PAGE_PATHS.reportsNotifications },
];

export default function ReportNotificationConfigPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [birthdayDaysBefore, setBirthdayDaysBefore] = useState(2);
  const [birthdayActive, setBirthdayActive] = useState(true);
  const [birthdayExternalEmails, setBirthdayExternalEmails] = useState<
    string[]
  >([]);
  const [birthdayEmailInput, setBirthdayEmailInput] = useState("");

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
      await fetchAllEmployees(1, 1000);
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

  const addExternalEmail = async (
    email: string,
    currentList: string[],
    setList: (list: string[]) => void,
    setInput: (val: string) => void,
  ) => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      await Alert.info("Email Required", "Please enter an email address");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      await Alert.info("Invalid Email", "Please enter a valid email address");
      return;
    }
    if (currentList.includes(trimmedEmail)) {
      await Alert.info("Duplicate Email", "This email is already in the list");
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
    const confirmed = await Alert.confirm({
      title: "Test Notifications",
      message:
        "This will trigger notification emails immediately for any upcoming birthdays/anniversaries. Continue?",
      confirmText: "Yes, Send Test",
      cancelText: "Cancel",
      type: "warning",
    });

    if (!confirmed) {
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
        <div className="p-10 text-center">
          <div className="inline-block p-8 px-12 bg-white rounded-xl shadow-md">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500 font-medium">
              Loading notification configuration...
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reports and Analytics" tabs={TABS} activeTab="Notifications">
      <div className="py-8 px-10 max-w-[1400px] mx-auto">
        <div className="mb-8 bg-gradient-to-br from-blue-950 to-teal-500 py-6 px-9 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between flex-wrap gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <IconBell size={24} color="#fff" />
              </div>
              <div>
                <h1 className="text-2xl font-bold m-0 mb-2">
                  Email Notification Configuration
                </h1>
                <p className="text-sm m-0 opacity-90">
                  Configure automated email alerts for birthdays and work
                  anniversaries
                </p>
              </div>
            </div>

            <button
              onClick={handleTestNotifications}
              disabled={isTesting}
              className={`px-6 py-3 ${
                isTesting
                  ? "bg-white/30 text-white/70 cursor-not-allowed"
                  : "bg-white text-blue-950 hover:bg-white/90"
              } border-none rounded-lg text-sm font-semibold shadow-md transition-all flex items-center gap-2`}
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
            className={`px-6 py-4 rounded-xl mb-6 text-sm font-medium whitespace-pre-line shadow-sm ${
              saveMessage.includes("success") ||
              saveMessage.includes("✅") ||
              saveMessage.includes("🎉")
                ? "bg-emerald-100 text-emerald-900 border-2 border-emerald-500"
                : "bg-red-100 text-red-900 border-2 border-red-500"
            }`}
          >
            {saveMessage}
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl mb-8 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-br from-blue-950 to-teal-500 py-5 px-7 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <IconGift size={22} color="#fff" />
            </div>
            <div>
              <h2 className="text-xl font-bold m-0">Birthday Notifications</h2>
              <p className="text-[13px] mt-1 mb-0 opacity-90">
                Automated email reminders for upcoming employee birthdays
              </p>
            </div>
          </div>

          <div className="p-7">
            <div className="mb-6">
              <label
                className={`flex items-center gap-2.5 text-[15px] font-semibold cursor-pointer py-3.5 px-4 rounded-xl border-2 transition-all ${
                  birthdayActive
                    ? "bg-emerald-50 border-teal-500 shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={birthdayActive}
                  onChange={(e) => setBirthdayActive(e.target.checked)}
                  className="w-[18px] h-[18px] cursor-pointer accent-teal-500"
                />
                <span
                  className={`flex items-center gap-2 ${
                    birthdayActive ? "text-teal-500" : "text-slate-500"
                  }`}
                >
                  {birthdayActive && <IconCheck size={16} color="#14b8a6" />}
                  {birthdayActive
                    ? "Notifications Enabled"
                    : "Enable Birthday Notifications"}
                </span>
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-[13.5px] font-semibold text-gray-700 mb-2.5">
                Days Before Birthday (0-30 days)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter days (0-30)"
                value={birthdayDaysBefore}
                onChange={(e) => {
                  const value = getNumericValue(e);
                  const numValue = value === "" ? 0 : parseInt(value, 10);
                  if (numValue <= 30) {
                    setBirthdayDaysBefore(numValue);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value === "" || isNaN(parseInt(value, 10))) {
                    setBirthdayDaysBefore(2);
                  }
                }}
                className="py-[11px] px-3.5 border-[1.5px] border-slate-200 rounded-xl text-[13.5px] w-[220px] outline-none transition-colors focus:border-blue-950"
              />
              <p className="text-xs text-slate-400 mt-2">
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
                <em className="text-amber-500 font-medium">
                  💡 You can type any number from 0 to 30
                </em>
              </p>
            </div>

            <div className="mb-6">
              <div className="py-4 px-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-500 rounded-xl flex items-start gap-3">
                <div className="mt-0.5">
                  <IconCheck size={20} color="#10b981" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-emerald-900 mb-1.5">
                    📧 Auto Recipients: All Global Admins
                  </div>
                  <div className="text-[13px] text-emerald-800 leading-relaxed">
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

            <div className="mb-6">
              <label className="block text-[13.5px] font-semibold text-gray-700 mb-3">
                Add External Email Recipients{" "}
                <span className="text-[11px] font-normal text-slate-400">
                  (optional)
                </span>
              </label>
              <div className="flex gap-2.5 mb-3">
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
                  className="flex-1 py-[11px] px-3.5 border-[1.5px] border-slate-200 rounded-xl text-[13.5px] outline-none transition-colors focus:border-blue-950"
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
                  className="py-[11px] px-6 bg-gradient-to-br from-blue-950 to-teal-500 text-white border-none rounded-xl text-[13.5px] font-semibold cursor-pointer whitespace-nowrap shadow-[0_2px_8px_rgba(23,37,84,0.2)] transition-transform hover:-translate-y-0.5"
                >
                  + Add Email
                </button>
              </div>
              {birthdayExternalEmails.length > 0 && (
                <div className="border-[1.5px] border-slate-200 rounded-xl p-3.5 bg-slate-50">
                  <div className="text-[12.5px] font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                    <IconMail size={16} color="#14b8a6" />
                    External Email Recipients ({birthdayExternalEmails.length}):
                  </div>
                  {birthdayExternalEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between py-2.5 px-3 bg-white border border-slate-200 rounded-lg mb-1.5"
                    >
                      <span className="text-[13.5px] text-slate-800 font-medium">
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
                        className="py-1.5 px-3 bg-gradient-to-br from-red-600 to-pink-600 text-white border-none rounded-md text-[11.5px] font-semibold cursor-pointer shadow-[0_2px_6px_rgba(220,38,38,0.2)] transition-transform hover:-translate-y-0.5"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2.5">
                Add external email addresses to receive notifications outside of
                system users
              </p>
            </div>

            <button
              onClick={handleSaveBirthdayConfig}
              disabled={isSaving}
              className={`py-3 px-7 text-white border-none rounded-xl text-[14.5px] font-bold transition-all flex items-center gap-2 ${
                isSaving
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-blue-950 to-teal-500 cursor-pointer shadow-[0_4px_12px_rgba(23,37,84,0.25)] hover:-translate-y-0.5"
              }`}
            >
              <IconSave size={16} color="#fff" />
              {isSaving ? "Saving..." : "Save Birthday Configuration"}
            </button>
          </div>
        </div>

        {/* Work Anniversary Notifications Card */}
        <div className="bg-white border border-slate-200 rounded-xl mb-8 overflow-hidden shadow-sm">
          <div className="bg-gradient-to-br from-blue-950 to-teal-500 py-5 px-7 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <IconAward size={22} color="#fff" />
            </div>
            <div>
              <h2 className="text-xl font-bold m-0">
                Work Anniversary Notifications
              </h2>
              <p className="text-[13px] mt-1 mb-0 opacity-90">
                Automated email reminders for employee work anniversaries
              </p>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-7">
            {/* Enable Checkbox */}
            <div className="mb-6">
              <label
                className={`flex items-center gap-2.5 text-[15px] font-semibold cursor-pointer py-3.5 px-4 rounded-xl border-2 transition-all ${
                  anniversaryActive
                    ? "bg-emerald-50 border-teal-500 shadow-[0_2px_8px_rgba(20,184,166,0.15)]"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={anniversaryActive}
                  onChange={(e) => setAnniversaryActive(e.target.checked)}
                  className="w-[18px] h-[18px] cursor-pointer accent-teal-500"
                />
                <span
                  className={`flex items-center gap-2 ${
                    anniversaryActive ? "text-teal-500" : "text-slate-500"
                  }`}
                >
                  {anniversaryActive && <IconCheck size={16} color="#14b8a6" />}
                  {anniversaryActive
                    ? "Notifications Enabled"
                    : "Enable Work Anniversary Notifications"}
                </span>
              </label>
            </div>

            <div className="mb-6">
              <label className="block text-[13.5px] font-semibold text-gray-700 mb-2.5">
                Days Before Anniversary (0-30 days)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter days (0-30)"
                value={anniversaryDaysBefore}
                onChange={(e) => {
                  const value = getNumericValue(e);
                  const numValue = value === "" ? 0 : parseInt(value, 10);
                  if (numValue <= 30) {
                    setAnniversaryDaysBefore(numValue);
                  }
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value === "" || isNaN(parseInt(value, 10))) {
                    setAnniversaryDaysBefore(2);
                  }
                }}
                className="py-[11px] px-3.5 border-[1.5px] border-slate-200 rounded-xl text-[13.5px] w-[220px] outline-none transition-colors focus:border-blue-950"
              />
              <p className="text-xs text-slate-400 mt-2">
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
                <em className="text-amber-500 font-medium">
                  💡 You can type any number from 0 to 30
                </em>
              </p>
            </div>

            {/* Auto Recipients Info Box */}
            <div className="mb-6">
              <div className="py-4 px-5 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-500 rounded-xl flex items-start gap-3">
                <div className="mt-0.5">
                  <IconCheck size={20} color="#10b981" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-emerald-900 mb-1.5">
                    📧 Auto Recipients: All Global Admins
                  </div>
                  <div className="text-[13px] text-emerald-800 leading-relaxed">
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

            <div className="mb-6">
              <label className="block text-[13.5px] font-semibold text-gray-700 mb-3">
                Add External Email Recipients{" "}
                <span className="text-[11px] font-normal text-slate-400">
                  (optional)
                </span>
              </label>
              <div className="flex gap-2.5 mb-3">
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
                  className="flex-1 py-[11px] px-3.5 border-[1.5px] border-slate-200 rounded-xl text-[13.5px] outline-none transition-colors focus:border-blue-950"
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
                  className="py-[11px] px-6 bg-gradient-to-br from-blue-950 to-teal-500 text-white border-none rounded-xl text-[13.5px] font-semibold cursor-pointer whitespace-nowrap shadow-[0_2px_8px_rgba(23,37,84,0.2)] transition-transform hover:-translate-y-0.5"
                >
                  + Add Email
                </button>
              </div>
              {anniversaryExternalEmails.length > 0 && (
                <div className="border-[1.5px] border-slate-200 rounded-xl p-3.5 bg-slate-50">
                  <div className="text-[12.5px] font-semibold text-gray-700 mb-2.5 flex items-center gap-1.5">
                    <IconMail size={16} color="#14b8a6" />
                    External Email Recipients (
                    {anniversaryExternalEmails.length}):
                  </div>
                  {anniversaryExternalEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center justify-between py-2.5 px-3 bg-white border border-slate-200 rounded-lg mb-1.5"
                    >
                      <span className="text-[13.5px] text-slate-800 font-medium">
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
                        className="py-1.5 px-3 bg-gradient-to-br from-red-600 to-pink-600 text-white border-none rounded-md text-[11.5px] font-semibold cursor-pointer shadow-[0_2px_6px_rgba(220,38,38,0.2)] transition-transform hover:-translate-y-0.5"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-2.5">
                Add external email addresses to receive notifications outside of
                system users
              </p>
            </div>

            <button
              onClick={handleSaveAnniversaryConfig}
              disabled={isSaving}
              className={`py-3 px-7 text-white border-none rounded-xl text-[14.5px] font-bold transition-all flex items-center gap-2 ${
                isSaving
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-br from-blue-950 to-teal-500 cursor-pointer shadow-[0_4px_12px_rgba(23,37,84,0.25)] hover:-translate-y-0.5"
              }`}
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
