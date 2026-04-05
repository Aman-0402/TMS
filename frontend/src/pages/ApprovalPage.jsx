import { useEffect, useState } from "react";

import API from "../api/axios";
import PageHeader from "../components/common/PageHeader";

function ApprovalPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [approvingUserId, setApprovingUserId] = useState(null);

  const loadPendingUsers = async () => {
    setError("");

    try {
      const response = await API.get("pending-users/");
      setPendingUsers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (fetchError) {
      setError(fetchError.response?.data?.detail || "Unable to load pending users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const handleApprove = async (userId) => {
    setApprovingUserId(userId);
    setError("");
    setSuccessMessage("");

    try {
      const response = await API.post(`approve-user/${userId}/`);
      setSuccessMessage(response.data.message || "User approved successfully.");
      await loadPendingUsers();
    } catch (approveError) {
      setError(approveError.response?.data?.detail || approveError.response?.data?.error || "Unable to approve user.");
    } finally {
      setApprovingUserId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Review pending accounts and approve users based on your role permissions."
      />

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      ) : null}

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <h2 className="h5 mb-3">Pending Users</h2>

          {isLoading ? <p className="mb-0 text-secondary">Loading pending users...</p> : null}

          {!isLoading && !error && pendingUsers.length === 0 ? (
            <div className="alert alert-light mb-0" role="alert">
              No pending users found.
            </div>
          ) : null}

          {!isLoading && pendingUsers.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Username</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email || "-"}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className="badge text-bg-warning">Pending</span>
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={() => handleApprove(user.id)}
                          disabled={approvingUserId === user.id}
                        >
                          {approvingUserId === user.id ? "Approving..." : "Approve"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default ApprovalPage;
