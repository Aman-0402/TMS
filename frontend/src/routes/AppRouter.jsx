import { Route, Routes } from "react-router-dom";

import BatchesPage from "../pages/BatchesPage";
import DashboardLayout from "../layouts/DashboardLayout";
import DashboardPage from "../pages/DashboardPage";
import ModulePage from "../pages/ModulePage";
import NotFoundPage from "../pages/NotFoundPage";

function AppRouter() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route
          path="students"
          element={
            <ModulePage
              title="Students"
              description="Manage student profiles, lab mapping, and batch enrollment."
            />
          }
        />
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

export default AppRouter;
