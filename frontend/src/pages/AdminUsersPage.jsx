import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

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
  const [isActive,  setIsActive]  = useState(user.is_active ?? true);
  const [isSaving,  setIsSaving]  = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await http.patch(`users/${user.id}/`, {
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        email:      email.trim(),
        is_active:  isActive,
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

          <div className="mb-4">
            <div className="form-check form-switch">
              <input
                id="ep-active"
                className="form-check-input"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="ep-active">
                Active (able to access the system)
              </label>
            </div>
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

  const handleDeactivate = async (user) => {
    const result = await Swal.fire({
      title: "Deactivate User?",
      html: `<p class="mb-0">Are you sure you want to deactivate <strong>${user.username}</strong>?</p><p class="text-muted small">They will not appear in available lists and cannot access the system.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Deactivate",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await http.patch(`users/${user.id}/`, { is_active: false });
        toast.success(`${user.username} deactivated.`);
        loadUsers();
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to deactivate user.");
      }
    }
  };

  const handleActivate = async (user) => {
    try {
      await http.patch(`users/${user.id}/`, { is_active: true });
      toast.success(`${user.username} activated.`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to activate user.");
    }
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: "Delete User?",
      html: `<p class="mb-0">Are you sure you want to permanently delete <strong>${user.username}</strong>?</p><p class="text-muted small">This action cannot be undone.</p>`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await http.delete(`users/${user.id}/`);
        toast.success(`${user.username} deleted.`);
        loadUsers();
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to delete user.");
      }
    }
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
                        <th style={{ width: '60px' }}>S. No</th>
                        <th>User</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Batch</th>
                        <th>Status</th>
                        <th>Active</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user, index) => (
                        <tr
                          key={user.id}
                          className={editing?.id === user.id ? "table-active" : ""}
                        >
                          <td className="text-muted fw-semibold">{index + 1}</td>
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
                          <td>
                            <span className={`badge ${user.is_active ? "bg-success" : "bg-secondary"}`}>
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-end">
                            <div className="btn-group btn-group-sm" role="group">
                              <button
                                type="button"
                                className={`btn ${editing?.id === user.id ? "btn-secondary" : "btn-outline-primary"}`}
                                onClick={() => setEditing(editing?.id === user.id ? null : user)}
                                title="Edit user details"
                              >
                                Edit
                              </button>
                              {user.is_active ? (
                                <button
                                  type="button"
                                  className="btn btn-outline-warning"
                                  onClick={() => handleDeactivate(user)}
                                  title="Deactivate this user"
                                >
                                  Deactivate
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline-success"
                                  onClick={() => handleActivate(user)}
                                  title="Activate this user"
                                >
                                  Activate
                                </button>
                              )}
                              <button
                                type="button"
                                className="btn btn-outline-danger"
                                onClick={() => handleDelete(user)}
                                title="Delete this user permanently"
                              >
                                Delete
                              </button>
                            </div>
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
