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
import AuditTrailPage from "./pages/hradmin/AuditTrailPage";

import LeaveListPage from "./pages/leave/LeaveListPage";
import LeaveDetailsPage from "./pages/leave/LeaveDetailsPage";
import ApplyLeavePage from "./pages/leave/ApplyLeavePage";

import AddEntitlementsPage from "./pages/leave/entitlements/AddEntitlementsPage";
import EntitlementListPage from "./pages/leave/entitlements/EntitlementListPage";
import MyEntitlementsPage  from "./pages/leave/entitlements/MyEntitlementsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={<ProtectedRoute><Navigate to="/employees" replace /></ProtectedRoute>} />

        <Route path="/employees" element={<ProtectedRoute><EmployeeListPage /></ProtectedRoute>} />
        <Route path="/employees/:id/profile" element={<ProtectedRoute><EmployeeProfilePage /></ProtectedRoute>} />
        <Route path="/my-info" element={<ProtectedRoute><MyInfoPage /></ProtectedRoute>} />

        <Route path="/roles" element={<ProtectedRoute roles={["empmanager", "hradmin"]}><RolesPage /></ProtectedRoute>} />
        <Route path="/hradmin/users" element={<ProtectedRoute roles={["empmanager", "hradmin"]}><HRUsersPage /></ProtectedRoute>} />
        <Route path="/hradmin/audit-trail" element={<ProtectedRoute roles={["empmanager", "hradmin"]}><AuditTrailPage /></ProtectedRoute>} />

        <Route path="/leave" element={<ProtectedRoute><Navigate to="/leave/view_leave_list" replace /></ProtectedRoute>} />
        <Route path="/leave/view_leave_list" element={<ProtectedRoute><LeaveListPage /></ProtectedRoute>} />
        <Route path="/leave/view_leave_list/details/:id" element={<ProtectedRoute><LeaveDetailsPage /></ProtectedRoute>} />
        <Route path="/leave/apply" element={<ProtectedRoute><ApplyLeavePage /></ProtectedRoute>} />

        <Route path="/view_my_leave_list/detail/:id/my" element={<ProtectedRoute><LeaveDetailsPage /></ProtectedRoute>} />

        <Route path="/leave/entitlements" element={<ProtectedRoute><Navigate to="/leave/entitlements/add" replace /></ProtectedRoute>} />
        <Route path="/leave/entitlements/add" element={<ProtectedRoute roles={["empmanager", "hradmin"]}><AddEntitlementsPage /></ProtectedRoute>} />
        <Route path="/leave/entitlements/list" element={<ProtectedRoute><EntitlementListPage /></ProtectedRoute>} />
        <Route path="/leave/entitlements/my" element={<ProtectedRoute><MyEntitlementsPage /></ProtectedRoute>} />
        <Route path="/leave/view_my_leave_entitlement" element={<ProtectedRoute><MyEntitlementsPage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
