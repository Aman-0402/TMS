import { NavLink, Outlet } from "react-router-dom";

const navigationItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/batches", label: "Batches" },
  { to: "/students", label: "Students" },
  { to: "/trainers", label: "Trainers" },
  { to: "/labs", label: "Labs" },
  { to: "/attendance", label: "Attendance" },
  { to: "/results", label: "Results" },
  { to: "/exams", label: "Exams" },
  { to: "/certificates", label: "Certificates" },
];

function DashboardLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
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
      </aside>

      <main className="content-area">
        <header className="content-header">
          <div>
            <p className="text-uppercase text-muted small mb-1">Frontend</p>
            <h2 className="h4 mb-0">TMS Admin Panel</h2>
          </div>
        </header>

        <section className="content-body">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default DashboardLayout;
