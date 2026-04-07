import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";
import { getRole } from "../utils/auth";

const initialFormData = {
  name: "",
  course: "",
  start_date: "",
  end_date: "",
};

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Edit panel ────────────────────────────────────────────────────────────────
function EditPanel({ batch, courses, onClose, onSaved }) {
  const [name, setName]           = useState(batch.name || "");
  const [course, setCourse]       = useState(String(batch.course || ""));
  const [startDate, setStartDate] = useState(batch.start_date || "");
  const [endDate, setEndDate]     = useState(batch.end_date || "");
  const [status, setStatus]       = useState(batch.status || "ACTIVE");
  const [isActive, setIsActive]   = useState(batch.is_active ?? true);
  const [isSaving, setIsSaving]   = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !course || !startDate || !endDate) {
      toast.error("All fields are required.");
      return;
    }

    setIsSaving(true);
    try {
      await http.patch(`batches/${batch.id}/`, {
        name: name.trim(),
        course: Number(course),
        start_date: startDate,
        end_date: endDate,
        status,
        is_active: isActive,
      });
      toast.success(`${name} updated successfully.`);
      onSaved();
    } catch (err) {
      const d = err.response?.data;
      toast.error(
        d?.end_date?.[0] || d?.name?.[0] || d?.detail || d?.error || "Update failed."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Only show active courses in dropdown
  const activeCourses = courses.filter((c) => c.is_active !== false);

  return (
    <div className="card shadow border-0">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="h5 mb-0">Edit Batch</h3>
            <p className="text-muted small mb-0">{batch.name}</p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label" htmlFor="ep-name">Batch Name</label>
            <input
              id="ep-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="ep-course">Course</label>
            <select
              id="ep-course"
              className="form-select"
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="">Choose course</option>
              {activeCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.certification})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="ep-start">Start Date</label>
            <input
              id="ep-start"
              type="date"
              className="form-control"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="ep-end">End Date</label>
            <input
              id="ep-end"
              type="date"
              className="form-control"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="ep-status">Lifecycle Status</label>
            <select
              id="ep-status"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
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
                Available (visible to trainers &amp; students)
              </label>
            </div>
          </div>

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

// ── Main page ─────────────────────────────────────────────────────────────────
function BatchesPage() {
  const role      = getRole();
  const canModify = role === "ADMIN" || role === "MANAGER";

  const [batches, setBatches]         = useState([]);
  const [courses, setCourses]         = useState([]);
  const [formData, setFormData]       = useState(initialFormData);
  const [isLoading, setIsLoading]     = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing]         = useState(null);

  const loadData = async () => {
    setError("");
    try {
      const [batchesResponse, coursesResponse] = await Promise.all([
        http.get("batches/"),
        http.get("courses/"),
      ]);
      setBatches(normalizeApiList(batchesResponse.data));
      setCourses(normalizeApiList(coursesResponse.data));
    } catch {
      setError("Unable to load batches or courses. Please check the backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    if (!formData.name.trim() || !formData.course || !formData.start_date || !formData.end_date) {
      setSubmitError("Batch name, course, start date, and end date are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await http.post("batches/", {
        name: formData.name.trim(),
        course: Number(formData.course),
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: "ACTIVE",
      });
      setSuccessMessage("Batch created successfully.");
      setFormData(initialFormData);
      await loadData();
    } catch (requestError) {
      setSubmitError(
        requestError.response?.data?.detail ||
          requestError.response?.data?.end_date?.[0] ||
          requestError.response?.data?.name?.[0] ||
          "Unable to create batch."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSaved = () => {
    setEditing(null);
    loadData();
  };

  const handleDeactivate = async (batch) => {
    const result = await Swal.fire({
      title: "Deactivate Batch?",
      html: `<p class="mb-0">Deactivate <strong>${batch.name}</strong>?</p><p class="text-muted small">It will be hidden from trainers and students.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Deactivate",
      cancelButtonText: "Cancel",
    });
    if (result.isConfirmed) {
      try {
        await http.patch(`batches/${batch.id}/`, { is_active: false });
        toast.success(`${batch.name} deactivated.`);
        loadData();
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to deactivate.");
      }
    }
  };

  const handleActivate = async (batch) => {
    try {
      await http.patch(`batches/${batch.id}/`, { is_active: true });
      toast.success(`${batch.name} activated.`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to activate.");
    }
  };

  const handleDelete = async (batch) => {
    const result = await Swal.fire({
      title: "Delete Batch?",
      html: `<p class="mb-0">Permanently delete <strong>${batch.name}</strong>?</p><p class="text-muted small">This action cannot be undone.</p>`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });
    if (result.isConfirmed) {
      try {
        await http.delete(`batches/${batch.id}/`);
        toast.success(`${batch.name} deleted.`);
        if (editing?.id === batch.id) setEditing(null);
        loadData();
      } catch (err) {
        toast.error(err.response?.data?.error || err.response?.data?.detail || "Delete failed.");
      }
    }
  };

  // Only active courses in the create-form dropdown
  const activeCourses = courses.filter((c) => c.is_active !== false);

  const statusBadge = (batch) => {
    const color = batch.status === "ACTIVE" ? "bg-primary" : "bg-secondary";
    return <span className={`badge ${color} me-1`}>{batch.status}</span>;
  };

  return (
    <>
      <PageHeader
        title="Batches"
        description="Create new batches and manage them by course."
      />

      <div className="row g-4">
        {/* ── Create form ── */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pb-0">
              <h2 className="h5 mb-1">Create Batch</h2>
              <p className="text-secondary small mb-0">
                Select a course and define the training schedule.
              </p>
            </div>

            <div className="card-body">
              {submitError && (
                <div className="alert alert-danger" role="alert">{submitError}</div>
              )}
              {successMessage && (
                <div className="alert alert-success" role="alert">{successMessage}</div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="name">Batch Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter batch name"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="course">Select Course</label>
                  <select
                    id="course"
                    name="course"
                    className="form-select"
                    value={formData.course}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting}
                    required
                  >
                    <option value="">Choose course</option>
                    {activeCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.certification})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="start_date">Start Date</label>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    className="form-control"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="end_date">End Date</label>
                  <input
                    id="end_date"
                    name="end_date"
                    type="date"
                    className="form-control"
                    value={formData.end_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 d-flex justify-content-center align-items-center gap-2"
                  disabled={isLoading || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                      Saving...
                    </>
                  ) : "Create Batch"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* ── Batch list ── */}
        <div className={editing ? "col-lg-4" : "col-lg-8"}>
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5 mb-3">Batch List</h2>

              {isLoading && <p className="mb-0 text-secondary">Loading batches...</p>}

              {!isLoading && error && (
                <div className="alert alert-danger mb-0" role="alert">{error}</div>
              )}

              {!isLoading && !error && batches.length === 0 && (
                <div className="alert alert-light mb-0" role="alert">No batches found.</div>
              )}

              {!isLoading && !error && batches.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.875rem" }}>
                    <thead className="table-light">
                      <tr>
                        <th scope="col" style={{ width: "50px" }}>S. No</th>
                        <th scope="col">Name</th>
                        <th scope="col">Course</th>
                        <th scope="col">Start</th>
                        <th scope="col">End</th>
                        <th scope="col">Status</th>
                        {canModify && <th scope="col" className="text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch, index) => (
                        <tr key={batch.id} className={editing?.id === batch.id ? "table-active" : ""}>
                          <td className="text-muted fw-semibold">{index + 1}</td>
                          <td className="fw-medium">{batch.name}</td>
                          <td>
                            {batch.course_name}
                            {batch.certification ? ` (${batch.certification})` : ""}
                          </td>
                          <td>{formatDate(batch.start_date)}</td>
                          <td>{formatDate(batch.end_date)}</td>
                          <td>
                            {statusBadge(batch)}
                            <span className={`badge ${batch.is_active ? "bg-success" : "bg-secondary"}`}>
                              {batch.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {canModify && (
                            <td className="text-end">
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  type="button"
                                  className={`btn ${editing?.id === batch.id ? "btn-secondary" : "btn-outline-primary"}`}
                                  onClick={() => setEditing(editing?.id === batch.id ? null : batch)}
                                  title="Edit batch"
                                >
                                  Edit
                                </button>
                                {batch.is_active ? (
                                  <button
                                    type="button"
                                    className="btn btn-outline-warning"
                                    onClick={() => handleDeactivate(batch)}
                                    title="Deactivate"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-outline-success"
                                    onClick={() => handleActivate(batch)}
                                    title="Activate"
                                  >
                                    Activate
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(batch)}
                                  title="Delete permanently"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Edit panel ── */}
        {editing && (
          <div className="col-lg-4">
            <div style={{ position: "sticky", top: 20 }}>
              <EditPanel
                batch={editing}
                courses={courses}
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

export default BatchesPage;
