import React from "react";
import Layout from "../components/Layout";

const actionItems = [
  { label: "Leave Requests to Approve", count: 10, color: "bg-teal-500" },
  { label: "Pending Self Review", count: 1, color: "bg-orange-500" },
];

const quickLinks = [
  {
    label: "Assign Leave",
    icon: "bi-person-plus-fill",
    bg: "bg-emerald-50",
    color: "text-emerald-600",
  },
  {
    label: "Leave List",
    icon: "bi-card-list",
    bg: "bg-blue-50",
    color: "text-blue-600",
  },
  {
    label: "Leave Calendar",
    icon: "bi-calendar3",
    bg: "bg-pink-50",
    color: "text-pink-600",
  },
  {
    label: "Apply Leave",
    icon: "bi-box-arrow-in-right",
    bg: "bg-amber-50",
    color: "text-amber-600",
  },
  {
    label: "My Leave",
    icon: "bi-person-lines-fill",
    bg: "bg-violet-50",
    color: "text-violet-600",
  },
  {
    label: "My Info",
    icon: "bi-person-badge",
    bg: "bg-cyan-50",
    color: "text-cyan-600",
  },
];

export default function DashboardPage() {
  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Employees" value="1" helper="Active workforce" />
          <MetricCard label="Pending Actions" value="11" helper="Needs review" />
          <MetricCard label="On Leave Today" value="0" helper="No absences" />
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <PanelHeader
              title="My Actions"
              icon="bi-list-check"
              iconColor="text-teal-600"
            />
            <div className="mt-4 space-y-3">
              {actionItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm font-medium text-slate-700">
                      {item.label}
                    </span>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-1">
            <PanelHeader
              title="Quick Access"
              icon="bi-lightning-fill"
              iconColor="text-amber-500"
            />
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2">
              {quickLinks.map((item) => (
                <button
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-teal-100 hover:bg-teal-50"
                >
                  <span
                    className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}
                  >
                    <i className={`bi ${item.icon} text-xl ${item.color}`} />
                  </span>
                  <span className="text-xs font-semibold text-slate-700">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <PanelHeader
              title="Employees on Leave Today"
              icon="bi-person-x-fill"
              iconColor="text-rose-500"
            />
            <div className="mt-4 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
              <i className="bi bi-clipboard-check text-4xl text-teal-500/30" />
              <p className="mt-3 text-sm font-semibold text-slate-600">
                No Employees on Leave Today
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Leave records will appear here when available.
              </p>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-3 flex items-end justify-between">
        <span className="text-3xl font-bold text-blue-950">{value}</span>
        <span className="text-xs font-medium text-slate-500">{helper}</span>
      </div>
    </section>
  );
}

function PanelHeader({
  title,
  icon,
  iconColor,
}: {
  title: string;
  icon: string;
  iconColor: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <i className={`bi ${icon} ${iconColor}`} />
        {title}
      </h2>
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
      >
        <i className="bi bi-gear" />
      </button>
    </div>
  );
}
