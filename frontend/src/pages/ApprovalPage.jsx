import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

import API from "../api/axios";
import { getRole } from "../utils/auth";
import PageHeader from "../components/common/PageHeader";

const STATUS_OPTIONS = [
  { value: "pending",  label: "Pending",  badge: "warning" },
  { value: "approved", label: "Approved", badge: "success" },
  { value: "rejected", label: "Rejected", badge: "danger"  },
  { value: "all",      label: "All",      badge: "secondary" },
];

function roleBadge(role) {
  const map = { MANAGER: "primary", TRAINER: "info", STUDENT: "secondary" };
  return map[role] || "dark";
}

function ApprovalPage() {
  const myRole = getRole();

  const roleOptions =
    myRole === "ADMIN"
      ? [{ value: "", label: "All Roles" }, { value: "MANAGER", label: "Manager" }, { value: "TRAINER", label: "Trainer" }]
      : [{ value: "", label: "All Roles" }, { value: "TRAINER", label: "Trainer" }, { value: "STUDENT", label: "Student" }];

  const [users, setUsers]           = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [activeStatus, setActiveStatus] = useState("pending");
  const [roleFilter, setRoleFilter] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ status: activeStatus });
      if (roleFilter) params.set("role", roleFilter);
      const res = await API.get(`pending-users/?${params}`);
      setUsers(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch {
      toast.error("Unable to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, [activeStatus, roleFilter]);

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async (user) => {
    const confirm = await Swal.fire({
      title: "Approve user?",
      html: `Approve <strong>${user.username}</strong> as <strong>${user.role}</strong>?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#198754",
      confirmButtonText: "Yes, Approve",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setProcessingId(user.id);
    try {
      await API.post(`approve-user/${user.id}/`);
      toast.success(`${user.username} approved successfully.`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || "Approval failed.");
    } finally {
      setProcessingId(null);
    }
  };

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = async (user) => {
    const { value: reason, isConfirmed } = await Swal.fire({
      title: "Reject user?",
      html: `Reject <strong>${user.username}</strong>?<br><span class="text-muted small">Optionally provide a reason.</span>`,
      icon: "warning",
      input: "textarea",
      inputLabel: "Rejection reason (optional)",
      inputPlaceholder: "e.g. Incomplete information…",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Reject",
      cancelButtonText: "Cancel",
    });
    if (!isConfirmed) return;

    setProcessingId(user.id);
    try {
      await API.post(`reject-user/${user.id}/`, { reason: reason || "" });
      toast.success(`${user.username} rejected.`);
      loadUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.detail || "Rejection failed.");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = users.filter((u) => u.approval_status === "PENDING").length;

  return (
    <>
      <PageHeader
        title="Approvals"
        description={
          myRole === "ADMIN"
            ? "Manage Managers and Trainers awaiting account approval."
            : "Manage Trainers and Students awaiting account approval."
        }
      />

      {/* Status tabs + role filter */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <ul className="nav nav-tabs border-0">
          {STATUS_OPTIONS.map((s) => (
            <li className="nav-item" key={s.value}>
              <button
                type="button"
                className={`nav-link${activeStatus === s.value ? " active fw-semibold" : ""}`}
                onClick={() => setActiveStatus(s.value)}
              >
                {s.label}
                {s.value === "pending" && pendingCount > 0 && (
                  <span className="ms-1 badge bg-warning text-dark">{pendingCount}</span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <select
          className="form-select form-select-sm"
          style={{ width: "auto", minWidth: 140 }}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          {roleOptions.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {isLoading && (
            <p className="text-secondary p-4 mb-0">Loading users…</p>
          )}

          {!isLoading && users.length === 0 && (
            <div className="alert alert-light m-3 mb-0">
              No users found for the selected filters.
            </div>
          )}

          {!isLoading && users.length > 0 && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    {activeStatus === "rejected" && <th>Reason</th>}
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const isProcessing = processingId === user.id;
                    const isPending    = user.approval_status === "PENDING";
                    const isApproved   = user.approval_status === "APPROVED";
                    const isRejected   = user.approval_status === "REJECTED";
                    const statusOpt    = STATUS_OPTIONS.find(
                      (s) => s.value === user.approval_status.toLowerCase()
                    );
                    return (
                      <tr key={user.id}>
                        <td className="fw-medium">{user.username}</td>
                        <td className="text-muted">{user.email || "—"}</td>
                        <td>
                          <span className={`badge bg-${roleBadge(user.role)}`}>{user.role}</span>
                        </td>
                        <td>
                          <span className={`badge bg-${statusOpt?.badge || "secondary"}`}>
                            {user.approval_status}
                          </span>
                        </td>
                        {activeStatus === "rejected" && (
                          <td className="text-muted small">{user.rejection_reason || "—"}</td>
                        )}
                        <td className="text-end">
                          <div className="d-inline-flex gap-2">
                            {(isPending || isRejected) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                onClick={() => handleApprove(user)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                                ) : "Approve"}
                              </button>
                            )}
                            {(isPending || isApproved) && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleReject(user)}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                                ) : "Reject"}
                              </button>
                            )}
                            {isRejected && !isPending && (
                              <span className="text-muted small align-self-center">
                                Can re-approve above
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ApprovalPage;
