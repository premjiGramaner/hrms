import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import EmployeeListPage from "./pages/employees/EmployeeListPage";
import EmployeeProfilePage from "./pages/employees/EmployeeProfilePage";
import MyInfoPage from "./pages/employees/MyInfoPage";
import RolesPage from "./pages/roles/RolesPage";
import HRUsersPage from "./pages/hradmin/HRUsersPage";
import JobTitlesPage from "./pages/hradmin/JobTitlesPage";
import JobCategoriesPage from "./pages/hradmin/JobCategoriesPage";
import SubUnitsPage from "./pages/hradmin/SubUnitsPage";
import RoleAccessPage from "./pages/hradmin/RoleAccessPage";
import AuditTrailPage from "./pages/hradmin/AuditTrailPage";

import LeaveListPage from "./pages/leave/LeaveListPage";
import LeaveDetailsPage from "./pages/leave/LeaveDetailsPage";
import ApplyLeavePage from "./pages/leave/ApplyLeavePage";

import AddEntitlementsPage from "./pages/leave/entitlements/AddEntitlementsPage";
import EntitlementListPage from "./pages/leave/entitlements/EntitlementListPage";
import MyEntitlementsPage from "./pages/leave/entitlements/MyEntitlementsPage";

// Roles that can access admin features
const ADMIN_ROLES = ["empmanager", "hradmin"];

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/my-info" replace />
            </ProtectedRoute>
          }
        />

        {/* ── Employee Management ── */}
        <Route
          path="/employees"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
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

        {/* ── Roles (admin only) ── */}
        <Route
          path="/roles"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <RolesPage />
            </ProtectedRoute>
          }
        />

        {/* ── HR Administration (admin only) ── */}
        <Route
          path="/hradmin"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <Navigate to="/hradmin/job-titles" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hradmin/users"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <HRUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hradmin/audit-trail"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <AuditTrailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hradmin/job-titles"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <JobTitlesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hradmin/job-categories"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <JobCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hradmin/sub-units"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <SubUnitsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/hradmin/role-access"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <RoleAccessPage />
            </ProtectedRoute>
          }
        />

        {/* ── Leave ── */}
        <Route
          path="/leave"
          element={
            <ProtectedRoute>
              <Navigate to="/leave/view_leave_list" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave/view_leave_list"
          element={
            <ProtectedRoute>
              <LeaveListPage />
            </ProtectedRoute>
          }
        />
        {/* Both /leave/view_leave_list/details/:id and /view_my_leave_list/detail/:id/my */}
        <Route
          path="/leave/view_leave_list/details/:id"
          element={
            <ProtectedRoute>
              <LeaveDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/view_my_leave_list/detail/:id/my"
          element={
            <ProtectedRoute>
              <LeaveDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave/apply"
          element={
            <ProtectedRoute>
              <ApplyLeavePage />
            </ProtectedRoute>
          }
        />

        {/* ── Leave Entitlements ── */}
        <Route
          path="/leave/entitlements"
          element={
            <ProtectedRoute>
              <Navigate to="/leave/entitlements/my" replace />
            </ProtectedRoute>
          }
        />
        {/* Add & List are admin-only */}
        <Route
          path="/leave/entitlements/add"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <AddEntitlementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave/entitlements/list"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <EntitlementListPage />
            </ProtectedRoute>
          }
        />
        {/* My Entitlements is accessible by everyone */}
        <Route
          path="/leave/entitlements/my"
          element={
            <ProtectedRoute>
              <MyEntitlementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave/view_my_leave_entitlement"
          element={
            <ProtectedRoute>
              <MyEntitlementsPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all — redirect to my-info (works for both roles; employees can't reach /employees) */}
        <Route path="*" element={<Navigate to="/my-info" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
