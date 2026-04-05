import { Route, Routes } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import AuditLogsPage from "./pages/AuditLogsPage";
import BatchesPage from "./pages/BatchesPage";
import CoursesPage from "./pages/CoursesPage";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import ModulePage from "./pages/ModulePage";
import NotFoundPage from "./pages/NotFoundPage";
import ApprovalPage from "./pages/ApprovalPage";
import RegisterPage from "./pages/RegisterPage";
import StudentsPage from "./pages/StudentsPage";
import StudentUploadPage from "./pages/StudentUploadPage";
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
          path="create-batch"
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
          path="students/upload"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER", "TRAINER"]}>
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
            <PrivateRoute allowedRoles={["ADMIN"]}>
              <ModulePage
                title="Trainers"
                description="Assign trainers to batches and manage trainer-related workflows."
              />
            </PrivateRoute>
          }
        />
        <Route
          path="labs"
          element={
            <ModulePage
              title="Labs"
              description="Handle lab allocation and trainer-based lab ownership."
            />
          }
        />
        <Route
          path="attendance"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER"]}>
              <ModulePage
                title="Attendance"
                description="Capture student and trainer attendance records by date."
              />
            </PrivateRoute>
          }
        />
        <Route
          path="results"
          element={
            <PrivateRoute allowedRoles={["ADMIN", "MANAGER", "TRAINER"]}>
              <ModulePage
                title="Results"
                description="Review scores, totals, and pass or fail status."
              />
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
