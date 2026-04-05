import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { getRole } from "../utils/auth";

const pageTitles = {
  "/": "Dashboard",
  "/audit-logs": "Audit Logs",
  "/courses": "Courses",
  "/batches": "Batches",
  "/create-batch": "Create Batch",
  "/labs": "Labs",
  "/students": "Students",
  "/students/upload": "Student Upload",
  "/trainers": "Trainers",
  "/attendance": "Attendance",
  "/results": "Results",
  "/approvals": "Approvals",
};

function DashboardLayout() {
  const location = useLocation();
  const { logout, user } = useAuth();
  const role = getRole();
  const pageTitle = pageTitles[location.pathname] || "TMS";
  const navigationItems = [
    { to: "/", label: "Dashboard", end: true },
    ...(role === "ADMIN" ? [{ to: "/audit-logs", label: "Audit Logs" }] : []),
    ...((role === "ADMIN" || role === "MANAGER")
      ? [
          { to: "/courses", label: "Courses" },
          { to: "/create-batch", label: "Create Batch" },
          { to: "/batches", label: "Batches" },
          { to: "/labs", label: "Labs" },
        ]
      : []),
    ...(role === "ADMIN"
      ? [
          { to: "/students", label: "Students" },
          { to: "/students/upload", label: "Student Upload" },
        ]
      : []),
    ...(role === "MANAGER"
      ? [
          { to: "/students", label: "Students" },
          { to: "/students/upload", label: "Student Upload" },
          { to: "/attendance", label: "Attendance" },
        ]
      : []),
    ...(role === "TRAINER"
      ? [
          { to: "/students/upload", label: "Student Upload" },
          { to: "/results", label: "Results" },
        ]
      : []),
    ...(role === "ADMIN" ? [{ to: "/trainers", label: "Trainers" }, { to: "/approvals", label: "Approvals" }] : []),
    ...(role === "MANAGER" ? [{ to: "/approvals", label: "Approvals" }] : []),
  ];

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="app-shell">
      <aside className="sidebar d-flex flex-column">
        <div>
          <div className="sidebar-brand">TMS</div>
          <p className="sidebar-subtitle">Training Management System</p>
        </div>

        <nav className="nav flex-column gap-2 mt-4">
          {navigationItems.map((item) => (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-link nav-item-link ${isActive ? "active" : ""}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer mt-auto pt-4">
          <div className="small text-white-50">Powered by React + Django</div>
        </div>
      </aside>

      <main className="content-area">
        <header className="content-header navbar navbar-expand-lg bg-white shadow-sm px-4 py-3">
          <div>
            <p className="text-uppercase text-muted small mb-1">Training Management System</p>
            <h2 className="h4 mb-0">{pageTitle}</h2>
          </div>

          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div className="fw-semibold text-dark">{user?.username || "Authenticated User"}</div>
              <div className="small text-muted">{role || "JWT Session"}</div>
            </div>
            <div className="user-avatar">
              {(user?.username || "AU").slice(0, 2).toUpperCase()}
            </div>
            <button type="button" className="btn btn-danger btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <section className="content-body container-fluid">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default DashboardLayout;
