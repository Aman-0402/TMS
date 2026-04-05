import { NavLink, Outlet, useLocation } from "react-router-dom";

const navigationItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/batches", label: "Batches" },
  { to: "/students", label: "Students" },
  { to: "/trainers", label: "Trainers" },
  { to: "/attendance", label: "Attendance" },
  { to: "/results", label: "Results" },
];

const pageTitles = {
  "/": "Dashboard",
  "/batches": "Batches",
  "/students": "Students",
  "/trainers": "Trainers",
  "/attendance": "Attendance",
  "/results": "Results",
};

function DashboardLayout() {
  const location = useLocation();
  const pageTitle = pageTitles[location.pathname] || "TMS";

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
              key={item.to}
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
              <div className="fw-semibold text-dark">Admin User</div>
              <div className="small text-muted">admin@tms.local</div>
            </div>
            <div className="user-avatar">AU</div>
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
