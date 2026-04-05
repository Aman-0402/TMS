import { Route, Routes } from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import BatchesPage from "./pages/BatchesPage";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";
import ModulePage from "./pages/ModulePage";
import NotFoundPage from "./pages/NotFoundPage";
import RegisterPage from "./pages/RegisterPage";
import StudentsPage from "./pages/StudentsPage";
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
        <Route path="batches" element={<BatchesPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route
          path="trainers"
          element={
            <ModulePage
              title="Trainers"
              description="Assign trainers to batches and manage trainer-related workflows."
            />
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
            <ModulePage
              title="Attendance"
              description="Capture student and trainer attendance records by date."
            />
          }
        />
        <Route
          path="results"
          element={
            <ModulePage
              title="Results"
              description="Review scores, totals, and pass or fail status."
            />
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
