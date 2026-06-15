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
        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
