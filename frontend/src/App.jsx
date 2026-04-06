import { Route, Routes } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import AdminUsersPage from "./pages/AdminUsersPage";
import AttendancePage from "./pages/AttendancePage";
import AuditLogsPage from "./pages/AuditLogsPage";
import BatchesPage from "./pages/BatchesPage";
import CoursesPage from "./pages/CoursesPage";
import DashboardPage from "./pages/DashboardPage";
import LabsPage from "./pages/LabsPage";
import Login from "./pages/Login";
import ManagersPage from "./pages/ManagersPage";
import ModulePage from "./pages/ModulePage";
import NotFoundPage from "./pages/NotFoundPage";
import ApprovalPage from "./pages/ApprovalPage";
import RegisterPage from "./pages/RegisterPage";
import ResultsPage from "./pages/ResultsPage";
import StudentsPage from "./pages/StudentsPage";
import StudentsListPage from "./pages/StudentsListPage";
import StudentUploadPage from "./pages/StudentUploadPage";
import TrainersPage from "./pages/TrainersPage";
import TrainerMockResultsPage from "./pages/TrainerMockResultsPage";
import ProfilePage from "./pages/ProfilePage";
import PrivateRoute from "./routes/PrivateRoute";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route
          path="audit-logs"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AuditLogsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="courses"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <CoursesPage />
            </PrivateRoute>
          }
        />

        <Route
          path="batches"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <BatchesPage />
            </PrivateRoute>
          }
        />

        <Route
          path="students"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <StudentsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="students/list"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER", "TRAINER"]}>
              <StudentsListPage />
            </PrivateRoute>
          }
        />

        <Route
          path="students/upload"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <StudentUploadPage />
            </PrivateRoute>
          }
        />

        <Route
          path="approvals"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <ApprovalPage />
            </PrivateRoute>
          }
        />

        <Route
          path="trainers"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <TrainersPage />
            </PrivateRoute>
          }
        />

        <Route
          path="managers"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <ManagersPage />
            </PrivateRoute>
          }
        />

        <Route
          path="labs"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <LabsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="attendance"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER", "TRAINER"]}>
              <AttendancePage />
            </PrivateRoute>
          }
        />

        <Route
          path="results"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER", "TRAINER"]}>
              <ResultsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="mock-results"
          element={
            <PrivateRoute allowedRoles={["TRAINER"]}>
              <TrainerMockResultsPage />
            </PrivateRoute>
          }
        />

        <Route
          path="profile"
          element={
            <PrivateRoute>
              <ProfilePage />
            </PrivateRoute>
          }
        />

        <Route
          path="admin/users"
          element={
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <AdminUsersPage />
            </PrivateRoute>
          }
        />

        <Route
          path="exams"
          element={
            <ModulePage
              title="Exams"
              description="Schedule exams, manage slots, and assign students."
            />
          }
        />

        <Route
          path="certificates"
          element={
            <ModulePage
              title="Certificates"
              description="Issue certificates to eligible students with unique voucher codes."
            />
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
