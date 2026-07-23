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
import { ADMIN_ROLES, PAGE_PATHS, ROLES, type UserRole } from "./config/roles";
import {
  TerminationReportPage,
  BirthdayReportPage,
  WorkAnniversaryReportPage,
  ReportNotificationConfigPage,
} from "./pages/reports";

function PerformanceHomeRedirect() {
  const role = useAppSelector(
    (state) => state.auth.user?.role || ROLES.EMPLOYEE,
  );
  return (
    <Navigate
      to={
        ADMIN_ROLES.includes(role as UserRole)
          ? PAGE_PATHS.performanceAppraisalCycles
          : PAGE_PATHS.performanceMyAppraisals
      }
      replace
    />
  );
}

function PerformanceAdminOnly({ children }: { children: React.ReactNode }) {
  const role = useAppSelector(
    (state) => state.auth.user?.role || ROLES.EMPLOYEE,
  );
  if (!ADMIN_ROLES.includes(role as UserRole))
    return <Navigate to={PAGE_PATHS.performanceMyAppraisals} replace />;
  return <>{children}</>;
}

export default function App() {
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(false);
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);

  React.useEffect(() => {
    const isCookieExist =
      token === "cookie_auth" || token === "cookie_authenticated";

    const checkCookieAuth = async () => {
      setIsCheckingAuth(true);

      if (token && !isCookieExist) {
        setIsCheckingAuth(false);
        return;
      }

      try {
        const userResponse = await self();
        const userData = userResponse?.data;
        const tempToken = "cookie_authenticated";

        dispatch(
          loginSuccess({
            token: tempToken,
            user: userData,
          }),
        );
      } catch (error) {
        if (isCookieExist) {
          dispatch(logout());
        }
      } finally {
        setIsCheckingAuth(false);
      }
    };

    if (token || isCookieExist)
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
        <Route path={PAGE_PATHS.login} element={<LoginPage />} />
        <Route
          path={PAGE_PATHS.forgotPassword}
          element={<ForgotPasswordPage />}
        />
        <Route
          path={PAGE_PATHS.resetPassword}
          element={<ResetPasswordPage />}
        />

        <Route
          path={PAGE_PATHS.createPassword}
          element={<CreatePasswordPage />}
        />

        <Route
          path={PAGE_PATHS.home}
          element={
            <ProtectedRoute>
              <Navigate to={PAGE_PATHS.myInfo} replace />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.employees}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <EmployeeListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.employeesSuperior}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <SuperiorSectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.employeeProfile()}
          element={
            <ProtectedRoute>
              <EmployeeProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.myInfo}
          element={
            <ProtectedRoute>
              <MyInfoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.roles}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <RolesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.hradmin}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <Navigate to={PAGE_PATHS.hradminJobTitles} replace />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.hradminUsers}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <HRUsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.hradminAuditTrail}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <AuditTrailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.hradminJobTitles}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <JobTitlesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.hradminJobCategories}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <JobCategoriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.hradminSubUnits}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <SubUnitsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.hradminRoleAccess}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <RoleAccessPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.leave}
          element={
            <ProtectedRoute>
              <Navigate to={PAGE_PATHS.leaveList} replace />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.leaveList}
          element={
            <ProtectedRoute>
              <LeaveListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.leaveDetails()}
          element={
            <ProtectedRoute>
              <LeaveDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.myLeaveDetail()}
          element={
            <ProtectedRoute>
              <LeaveDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.leaveApply}
          element={
            <ProtectedRoute>
              <ApplyLeavePage />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.leaveEntitlements}
          element={
            <ProtectedRoute>
              <Navigate to={PAGE_PATHS.leaveEntitlementsMy} replace />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.leaveEntitlementsAdd}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <AddEntitlementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.leaveEntitlementsList}
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <EntitlementListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.leaveEntitlementsMy}
          element={
            <ProtectedRoute>
              <MyEntitlementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.leaveMyEntitlement}
          element={
            <ProtectedRoute>
              <MyEntitlementsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.performance}
          element={
            <ProtectedRoute>
              <PerformanceHomeRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.reports}
          element={
            <ProtectedRoute roles={[ROLES.HR_ADMIN]}>
              <Navigate to={PAGE_PATHS.reportsBirthday} replace />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.performanceAppraisalsList}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AppraisalList />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.reportsTermination}
          element={
            <ProtectedRoute roles={[ROLES.HR_ADMIN]}>
              <TerminationReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.performanceAppraisalCycles}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AppraisalCycles />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.reportsBirthday}
          element={
            <ProtectedRoute roles={[ROLES.HR_ADMIN]}>
              <BirthdayReportPage />
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.performanceAppraisalCyclesCreate}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <CreateAppraisalCycle />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.reportsWorkAnniversary}
          element={
            <ProtectedRoute roles={[ROLES.HR_ADMIN]}>
              <WorkAnniversaryReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceAppraisalCycle()}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AppraisalCycleDetails />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceAppraisalCycleAddEmployees()}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AddEmployeesToCycle />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceAppraisalView()}
          element={
            <ProtectedRoute>
              <AppraisalCompactView />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceAppraisalReview()}
          element={
            <ProtectedRoute>
              <AppraisalMultipleView />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceMyAppraisals}
          element={
            <ProtectedRoute>
              <AppraisalList />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceTeamAppraisals}
          element={
            <ProtectedRoute>
              <AppraisalList />
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceTrackers}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <PerformanceTrackers />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceCompetencyProfiles}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <CompetencyProfiles />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceConfigAppraisal}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <AppraisalConfiguration />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />
        <Route
          path={PAGE_PATHS.performanceTemplateDesign()}
          element={
            <ProtectedRoute>
              <PerformanceAdminOnly>
                <TemplateFormDesign />
              </PerformanceAdminOnly>
            </ProtectedRoute>
          }
        />

        <Route
          path={PAGE_PATHS.reportsNotifications}
          element={
            <ProtectedRoute roles={[ROLES.HR_ADMIN]}>
              <ReportNotificationConfigPage />
            </ProtectedRoute>
          }
        />

        {/* <Route
          path="*"
          element={<Navigate to={PAGE_PATHS.employees} replace />}
        /> */}
      </Routes>
    </BrowserRouter>
  );
}
