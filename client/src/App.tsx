import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import EmployeeListPage from "./pages/employees/EmployeeListPage";
import EmployeeProfilePage from "./pages/employees/EmployeeProfilePage";
import MyInfoPage from "./pages/employees/MyInfoPage";
import RolesPage from "./pages/roles/RolesPage";
import HRUsersPage from "./pages/hradmin/HRUsersPage";
import AuditTrailPage from "./pages/hradmin/AuditTrailPage";

// Leave module
import LeaveDashboardPage from "./pages/leave/LeaveDashboardPage";
import LeaveListPage from "./pages/leave/LeaveListPage";
import LeaveDetailsPage from "./pages/leave/LeaveDetailsPage";
import AssignLeavePage from "./pages/leave/AssignLeavePage";
import BulkAssignPage from "./pages/leave/BulkAssignPage";
import ApplyLeavePage from "./pages/leave/ApplyLeavePage";
import MyLeaveUsagePage from "./pages/leave/MyLeaveUsagePage";
import LeaveCalendarPage from "./pages/leave/LeaveCalendarPage";
import MyLeavePage from "./pages/leave/MyLeavePage";

// Leave > Entitlements
import AddEntitlementsPage  from "./pages/leave/entitlements/AddEntitlementsPage";
import EntitlementListPage  from "./pages/leave/entitlements/EntitlementListPage";
import MyEntitlementsPage   from "./pages/leave/entitlements/MyEntitlementsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/employees" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <EmployeeListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/:id/profile"
          element={
            <ProtectedRoute>
              <EmployeeProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-info"
          element={
            <ProtectedRoute>
              <MyInfoPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute roles={["empmanager", "hradmin"]}>
              <RolesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hradmin/users"
          element={
            <ProtectedRoute roles={["empmanager", "hradmin"]}>
              <HRUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hradmin/audit-trail"
          element={
            <ProtectedRoute roles={["empmanager", "hradmin"]}>
              <AuditTrailPage />
            </ProtectedRoute>
          }
        />

        {/* ── Leave Module ─────────────────────────────── */}
        <Route
          path="/leave"
          element={<ProtectedRoute><Navigate to="/leave/view_leave_list" replace /></ProtectedRoute>}
        />
        <Route
          path="/leave/dashboard"
          element={<ProtectedRoute><LeaveDashboardPage /></ProtectedRoute>}
        />
        <Route
          path="/leave/view_leave_list"
          element={<ProtectedRoute><LeaveListPage /></ProtectedRoute>}
        />
        <Route
          path="/leave/view_leave_list/details/:id"
          element={<ProtectedRoute><LeaveDetailsPage /></ProtectedRoute>}
        />
        <Route
          path="/leave/assign_leave"
          element={
            <ProtectedRoute roles={["empmanager", "hradmin"]}>
              <AssignLeavePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave/bulk_assign"
          element={
            <ProtectedRoute roles={["empmanager", "hradmin"]}>
              <BulkAssignPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave/apply"
          element={<ProtectedRoute><ApplyLeavePage /></ProtectedRoute>}
        />
        <Route
          path="/leave/my_leave_usage"
          element={<ProtectedRoute><MyLeaveUsagePage /></ProtectedRoute>}
        />
        <Route
          path="/leave/calendar"
          element={<ProtectedRoute><LeaveCalendarPage /></ProtectedRoute>}
        />
        <Route
          path="/leave/my_leave"
          element={<ProtectedRoute><MyLeavePage /></ProtectedRoute>}
        />

        {/* ── Leave > Entitlements ──────────────────────── */}
        <Route
          path="/leave/entitlements"
          element={<ProtectedRoute><Navigate to="/leave/entitlements/add" replace /></ProtectedRoute>}
        />
        <Route
          path="/leave/entitlements/add"
          element={
            <ProtectedRoute roles={["empmanager", "hradmin"]}>
              <AddEntitlementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave/entitlements/list"
          element={<ProtectedRoute><EntitlementListPage /></ProtectedRoute>}
        />
        <Route
          path="/leave/entitlements/my"
          element={<ProtectedRoute><MyEntitlementsPage /></ProtectedRoute>}
        />
        {/* Alias used by the OrangeHRM-style URL */}
        <Route
          path="/leave/view_my_leave_entitlement"
          element={<ProtectedRoute><MyEntitlementsPage /></ProtectedRoute>}
        />

        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
