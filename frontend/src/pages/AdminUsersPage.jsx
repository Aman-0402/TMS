import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const ROLE_BADGE   = { ADMIN: "danger", MANAGER: "primary", TRAINER: "info" };
const STATUS_BADGE = { APPROVED: "success", REJECTED: "danger", PENDING: "warning" };
const ROLES = [
  { value: "", label: "All Roles" },
  { value: "ADMIN",   label: "Admin"   },
  { value: "MANAGER", label: "Manager" },
  { value: "TRAINER", label: "Trainer" },
];

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function initials(user) {
  const fn = (user.first_name?.[0] || "").toUpperCase();
  const ln = (user.last_name?.[0]  || "").toUpperCase();
  return fn + ln || user.username.slice(0, 2).toUpperCase();
}

// ── Inline edit form shown in a slide-over card ────────────────────────────
function EditPanel({ user, onClose, onSaved }) {
  const [firstName, setFirstName] = useState(user.first_name || "");
  const [lastName,  setLastName]  = useState(user.last_name  || "");
  const [email,     setEmail]     = useState(user.email      || "");
  const [isSaving,  setIsSaving]  = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await http.patch(`users/${user.id}/`, {
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        email:      email.trim(),
      });
      toast.success(`${user.username}'s profile updated.`);
      onSaved();
    } catch (err) {
      const d = err.response?.data;
      toast.error(d?.email?.[0] || d?.detail || d?.error || "Update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card shadow border-0 h-100">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="h5 mb-0">Edit Profile</h3>
            <p className="text-muted small mb-0">@{user.username} · {user.role}</p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label" htmlFor="ep-fname">First Name</label>
            <input
              id="ep-fname"
              type="text"
              className="form-control"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="ep-lname">Last Name</label>
            <input
              id="ep-lname"
              type="text"
              className="form-control"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
            />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="ep-email">Email</label>
            <input
              id="ep-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <hr />
          <dl className="small mb-4">
            <dt className="text-muted">Username</dt>
            <dd>{user.username}</dd>
            <dt className="text-muted">Role</dt>
            <dd><span className={`badge bg-${ROLE_BADGE[user.role] || "secondary"}`}>{user.role}</span></dd>
            <dt className="text-muted">Status</dt>
            <dd>
              <span className={`badge bg-${STATUS_BADGE[user.approval_status] || "secondary"}`}>
                {user.approval_status}
              </span>
            </dd>
            <dt className="text-muted">Batch</dt>
            <dd>{user.batch_name || "—"}</dd>
            <dt className="text-muted">Joined</dt>
            <dd>{formatDateTime(user.date_joined)}</dd>
            <dt className="text-muted">Last login</dt>
            <dd>{formatDateTime(user.last_login)}</dd>
          </dl>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? (
                <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Saving…</>
              ) : "Save Changes"}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
function AdminUsersPage() {
  const [users,      setUsers]      = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [search,     setSearch]     = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [editing,    setEditing]    = useState(null);   // user being edited
  const searchTimer = useRef(null);

  const loadUsers = async (q = search, role = roleFilter) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim())    params.set("search", q.trim());
      if (role)        params.set("role",   role);
      const res = await http.get(`users/?${params}`);
      setUsers(Array.isArray(res.data) ? res.data : res.data?.results || []);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // Debounced search
  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadUsers(val, roleFilter), 400);
  };

  const handleRoleFilter = (role) => {
    setRoleFilter(role);
    loadUsers(search, role);
  };

  const handleEditSaved = () => {
    setEditing(null);
    loadUsers();
  };

  return (
    <>
      <PageHeader
        title="User Management"
        description="View and update profile details for all Admins, Managers, and Trainers."
      />

      <div className="row g-4">
        {/* ── User list ──────────────────────────────────────────────────── */}
        <div className={editing ? "col-lg-7" : "col-12"}>
          {/* Search + filter bar */}
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-body p-3">
              <div className="row g-2 align-items-center">
                <div className="col">
                  <input
                    type="search"
                    className="form-control"
                    placeholder="Search by username, email or name…"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                <div className="col-auto">
                  <select
                    className="form-select"
                    value={roleFilter}
                    onChange={(e) => handleRoleFilter(e.target.value)}
                  >
                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-0">
              {isLoading && <p className="text-secondary p-4 mb-0">Loading…</p>}

              {!isLoading && users.length === 0 && (
                <div className="alert alert-light m-3 mb-0">No users found.</div>
              )}

              {!isLoading && users.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Batch</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className={editing?.id === user.id ? "table-active" : ""}
                        >
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div
                                className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold bg-${ROLE_BADGE[user.role] || "secondary"}`}
                                style={{ width: 34, height: 34, fontSize: "0.75rem", flexShrink: 0 }}
                              >
                                {initials(user)}
                              </div>
                              <div>
                                <div className="fw-medium">{user.username}</div>
                                {user.full_name && (
                                  <div className="text-muted small">{user.full_name}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="text-muted">{user.email || "—"}</td>
                          <td>
                            <span className={`badge bg-${ROLE_BADGE[user.role] || "secondary"}`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="text-muted small">{user.batch_name || "—"}</td>
                          <td>
                            <span className={`badge bg-${STATUS_BADGE[user.approval_status] || "secondary"}`}>
                              {user.approval_status}
                            </span>
                          </td>
                          <td className="text-muted small">{formatDateTime(user.date_joined)}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className={`btn btn-sm ${editing?.id === user.id ? "btn-secondary" : "btn-outline-primary"}`}
                              onClick={() => setEditing(editing?.id === user.id ? null : user)}
                            >
                              {editing?.id === user.id ? "Close" : "Edit"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Edit panel ─────────────────────────────────────────────────── */}
        {editing && (
          <div className="col-lg-5">
            <div style={{ position: "sticky", top: 20 }}>
              <EditPanel
                user={editing}
                onClose={() => setEditing(null)}
                onSaved={handleEditSaved}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminUsersPage;
