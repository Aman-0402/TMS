import { useEffect, useMemo, useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const ACTION_OPTIONS = ["All", "CREATE", "UPDATE", "DELETE"];
const PAGE_SIZE = 10;

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function getUserLabel(user) {
  if (typeof user === "string") {
    return user;
  }

  if (user && typeof user === "object") {
    return user.username || user.email || user.name || "System";
  }

  return "System";
}

function normalizeLog(log) {
  return {
    id: log.id ?? `${log.model || log.model_name}-${log.object_id}-${log.timestamp || log.created_at}`,
    user: getUserLabel(log.user),
    action: log.action || "UPDATE",
    model: log.model || log.model_name || "Unknown",
    objectId: log.object_id ?? "-",
    timestamp: log.timestamp || log.created_at || "",
  };
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "-";
  }

  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function getBadgeClass(action) {
  switch (action) {
    case "CREATE":
      return "bg-success";
    case "UPDATE":
      return "bg-primary";
    case "DELETE":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAction, setSelectedAction] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const loadAuditLogs = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await http.get("audit-logs/");
        const normalizedLogs = normalizeApiList(response.data)
          .map(normalizeLog)
          .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));

        setLogs(normalizedLogs);
      } catch (requestError) {
        setError(
          requestError.response?.data?.detail ||
            "Unable to load audit logs. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAuditLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedAction, searchTerm]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesAction =
        selectedAction === "All" || log.action === selectedAction;
      const matchesSearch =
        !normalizedSearch ||
        log.user.toLowerCase().includes(normalizedSearch) ||
        log.model.toLowerCase().includes(normalizedSearch);

      return matchesAction && matchesSearch;
    });
  }, [logs, searchTerm, selectedAction]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredLogs]);

  const startEntry = filteredLogs.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endEntry = Math.min(currentPage * PAGE_SIZE, filteredLogs.length);

  return (
    <>
      <PageHeader
        title="Audit Logs"
        description="Review recent system activity across create, update, and delete operations."
      />

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-3 align-items-end mb-4">
            <div className="col-md-4">
              <label className="form-label fw-semibold" htmlFor="audit-action-filter">
                Filter by action
              </label>
              <select
                id="audit-action-filter"
                className="form-select"
                value={selectedAction}
                onChange={(event) => setSelectedAction(event.target.value)}
              >
                {ACTION_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-5">
              <label className="form-label fw-semibold" htmlFor="audit-search-input">
                Search
              </label>
              <input
                id="audit-search-input"
                type="search"
                className="form-control"
                placeholder="Search by user or model"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="col-md-3">
              <div className="audit-log-summary text-muted small">
                Showing {startEntry}-{endEntry} of {filteredLogs.length} logs
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading audit logs...</span>
              </div>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && filteredLogs.length === 0 ? (
            <div className="text-center py-5">
              <h2 className="h5 mb-2">No logs found</h2>
              <p className="text-muted mb-0">
                Try adjusting the action filter or search term.
              </p>
            </div>
          ) : null}

          {!isLoading && !error && filteredLogs.length > 0 ? (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle audit-log-table mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">User</th>
                      <th scope="col">Action</th>
                      <th scope="col">Model</th>
                      <th scope="col">Object ID</th>
                      <th scope="col">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="fw-semibold">{log.user}</td>
                        <td>
                          <span className={`badge ${getBadgeClass(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td>{log.model}</td>
                        <td>{log.objectId}</td>
                        <td className="text-muted">{formatTimestamp(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-4">
                <div className="text-muted small">
                  Latest activity appears first.
                </div>

                <div className="btn-group" role="group" aria-label="Audit log pagination">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  <button type="button" className="btn btn-outline-secondary" disabled>
                    Page {currentPage} of {totalPages}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(page + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default AuditLogsPage;
