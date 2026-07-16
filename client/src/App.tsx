import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./app/hooks";
import { loginSuccess, logout } from "./store/authSlice";
import { self } from "./api/auth.api";
import ToastContainer from "./components/ToastContainer";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import {
  CreatePasswordPage,
  ForgotPasswordPage,
  ResetPasswordPage,
} from "./pages/AuthPasswordPages";
import EmployeeListPage from "./pages/employees/EmployeeListPage";
import SuperiorSectionPage from "./pages/employees/SuperiorSectionPage";
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
import AppraisalConfiguration from "./pages/performance/AppraisalConfiguration";
import AppraisalCycleDetails from "./pages/performance/AppraisalCycleDetails";
import AppraisalCycles from "./pages/performance/AppraisalCycles";
import AppraisalList from "./pages/performance/AppraisalList";
import AppraisalCompactView from "./pages/performance/AppraisalCompactView";
import AppraisalMultipleView from "./pages/performance/AppraisalMultipleView";
import AddEmployeesToCycle from "./pages/performance/AddEmployeesToCycle";
import CompetencyProfiles from "./pages/performance/CompetencyProfiles";
import CreateAppraisalCycle from "./pages/performance/CreateAppraisalCycle";
import PerformanceTrackers from "./pages/performance/PerformanceTrackers";
import TemplateFormDesign from "./pages/performance/TemplateFormDesign";
import { ADMIN_ROLES, type UserRole } from "./config/roles";
import {
  TerminationReportPage,
  BirthdayReportPage,
  WorkAnniversaryReportPage,
  ReportNotificationConfigPage,
  UnifiedReportsPage,
} from "./pages/reports";

function PerformanceHomeRedirect() {
  const role = useAppSelector((state) => state.auth.user?.role || "employee");
  return (
    <Navigate
      to={
        ADMIN_ROLES.includes(role as UserRole)
          ? "/performance/appraisal_cycles"
          : "/performance/my_appraisals"
      }
      replace
    />
  );
}

function PerformanceAdminOnly({ children }: { children: React.ReactNode }) {
  const role = useAppSelector((state) => state.auth.user?.role || "employee");
  if (!ADMIN_ROLES.includes(role as UserRole))
    return <Navigate to="/performance/my_appraisals" replace />;
  return <>{children}</>;
}

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);

  React.useEffect(() => {
    const checkCookieAuth = async () => {
      const isPlaceholderToken =
        token === "cookie_auth" || token === "cookie_authenticated";

      if (token && !isPlaceholderToken) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const userResponse = await self();
        const userData = userResponse.data;
        const tempToken = "cookie_authenticated";

        dispatch(
          loginSuccess({
            token: tempToken,
            user: userData,
          }),
        );
      } catch (error) {
        if (isPlaceholderToken) {
          dispatch(logout());
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    checkCookieAuth();
  }, [dispatch, token]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600 mx-auto"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/create-password" element={<CreatePasswordPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Navigate to="/my-info" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <EmployeeListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/employees/superior-section"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <SuperiorSectionPage />
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
            <ProtectedRoute roles={ADMIN_ROLES}>
              <RolesPage />
            </ProtectedRoute>
          }
        />

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

        <Route
          path="/leave/entitlements"
          element={
            <ProtectedRoute>
              <Navigate to="/leave/entitlements/my" replace />
            </ProtectedRoute>
          }
        />
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

        <Route
          path="/performance"
          element={
            <ProtectedRoute>
              <PerformanceHomeRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={["hradmin"]}>
              <Navigate to="/reports/birthday" replace />
            </ProtectedRoute>
          }
        />

        <Route
          path="/performance/appraisals_list"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AppraisalList />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/termination"
          element={
            <ProtectedRoute roles={["hradmin"]}>
              <TerminationReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/performance/appraisal_cycles"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AppraisalCycles />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/birthday"
          element={
            <ProtectedRoute roles={["hradmin"]}>
              <BirthdayReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/performance/appraisal_cycles/create"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <CreateAppraisalCycle />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/work-anniversary"
          element={
            <ProtectedRoute roles={["hradmin"]}>
              <WorkAnniversaryReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/appraisal_cycles/:id"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AppraisalCycleDetails />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/appraisal_cycles/:id/add-employees"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AddEmployeesToCycle />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/appraisals/:id/view"
          element={
            <ProtectedRoute>
              <AppraisalCompactView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/appraisals/:id/review"
          element={
            <ProtectedRoute>
              <AppraisalMultipleView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/my_appraisals"
          element={
            <ProtectedRoute>
              <AppraisalList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/team_appraisals"
          element={
            <ProtectedRoute>
              <AppraisalList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/trackers"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <PerformanceTrackers />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/competency_profiles"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <CompetencyProfiles />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/configuration/appraisal"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AppraisalConfiguration />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path="/performance/configuration/appraisal/templates/:templateId/design"
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <TemplateFormDesign />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports/notifications"
          element={
            <ProtectedRoute roles={["hradmin"]}>
              <ReportNotificationConfigPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/employees" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
