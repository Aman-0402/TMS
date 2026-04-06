import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";
import { getRole } from "../utils/auth";

const initialFormData = {
  name: "",
  certification: "",
};

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

// ── Edit panel for inline editing ────────────────────────────────────────────
function EditPanel({ course, onClose, onSaved }) {
  const [name, setName] = useState(course.name || "");
  const [certification, setCertification] = useState(course.certification || "");
  const [isActive, setIsActive] = useState(course.is_active ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim() || !certification.trim()) {
      toast.error("Course name and certification are required.");
      return;
    }

    setIsSaving(true);
    try {
      await http.patch(`courses/${course.id}/`, {
        name: name.trim(),
        certification: certification.trim(),
        is_active: isActive,
      });
      toast.success(`${name} updated successfully.`);
      onSaved();
    } catch (err) {
      const d = err.response?.data;
      toast.error(d?.name?.[0] || d?.certification?.[0] || d?.detail || d?.error || "Update failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card shadow border-0 h-100">
      <div className="card-body p-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h3 className="h5 mb-0">Edit Course</h3>
            <p className="text-muted small mb-0">{course.name}</p>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
        </div>

        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label" htmlFor="edit-name">
              Course Name
            </label>
            <input
              id="edit-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Course name"
            />
          </div>

          <div className="mb-4">
            <label className="form-label" htmlFor="edit-certification">
              Certification
            </label>
            <input
              id="edit-certification"
              type="text"
              className="form-control"
              value={certification}
              onChange={(e) => setCertification(e.target.value)}
              placeholder="Certification"
            />
          </div>

          <div className="mb-4">
            <div className="form-check form-switch">
              <input
                id="edit-active"
                className="form-check-input"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="edit-active">
                Active (available for batch creation)
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

function CoursesPage() {
  const role = getRole();
  const canModify = role === "ADMIN" || role === "MANAGER";
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [editing, setEditing] = useState(null); // course being edited

  const loadCourses = async () => {
    setError("");

    try {
      const response = await http.get("courses/");
      setCourses(normalizeApiList(response.data));
    } catch (requestError) {
      setError("Unable to load courses. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    if (!formData.name.trim() || !formData.certification.trim()) {
      setSubmitError("Course name and certification are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await http.post("courses/", {
        name: formData.name.trim(),
        certification: formData.certification.trim(),
      });

      setSuccessMessage("Course created successfully.");
      setFormData(initialFormData);
      await loadCourses();
    } catch (requestError) {
      setSubmitError(
        requestError.response?.data?.detail ||
          requestError.response?.data?.name?.[0] ||
          requestError.response?.data?.certification?.[0] ||
          requestError.response?.data?.error ||
          "Unable to create the course."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (course) => {
    setEditing(course);
  };

  const handleEditSaved = () => {
    setEditing(null);
    loadCourses();
  };

  const handleDeactivate = async (course) => {
    const result = await Swal.fire({
      title: "Deactivate Course?",
      html: `<p class="mb-0">Are you sure you want to deactivate <strong>${course.name}</strong>?</p><p class="text-muted small">It will not be available for batch creation.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Deactivate",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await http.patch(`courses/${course.id}/`, { is_active: false });
        toast.success(`${course.name} deactivated.`);
        loadCourses();
      } catch (err) {
        toast.error(err.response?.data?.detail || "Failed to deactivate course.");
      }
    }
  };

  const handleActivate = async (course) => {
    try {
      await http.patch(`courses/${course.id}/`, { is_active: true });
      toast.success(`${course.name} activated.`);
      loadCourses();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to activate course.");
    }
  };

  const handleDelete = async (course) => {
    const result = await Swal.fire({
      title: "Delete Course?",
      html: `<p class="mb-0">Are you sure you want to permanently delete <strong>${course.name}</strong>?</p><p class="text-muted small">This action cannot be undone.</p>`,
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await http.delete(`courses/${course.id}/`);
        toast.success(`${course.name} deleted.`);
        loadCourses();
      } catch (err) {
        const message =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          "Delete failed";
        toast.error(message);
      }
    }
  };

  return (
    <>
      <PageHeader
        title="Courses"
        description="Create course records and link them with certifications."
      />

      <div className="row g-4">
        <div className={editing ? "col-lg-4" : "col-lg-4"}>
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">Create Course</h2>
              <p className="text-secondary mb-4">
                Add a new course and its certification for future batch creation.
              </p>

              {submitError ? (
                <div className="alert alert-danger" role="alert">
                  {submitError}
                </div>
              ) : null}

              {successMessage ? (
                <div className="alert alert-success" role="alert">
                  {successMessage}
                </div>
              ) : null}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="name">
                    Course Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter course name"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="certification">
                    Certification
                  </label>
                  <input
                    id="certification"
                    name="certification"
                    type="text"
                    className="form-control"
                    value={formData.certification}
                    onChange={handleChange}
                    placeholder="Enter certification"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 d-flex justify-content-center align-items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    "Create Course"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className={editing ? "col-lg-4" : "col-lg-8"}>
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5 mb-3">Course List</h2>

              {isLoading ? (
                <p className="mb-0 text-secondary">Loading courses...</p>
              ) : null}

              {!isLoading && error ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              ) : null}

              {!isLoading && !error && courses.length === 0 ? (
                <div className="alert alert-light mb-0" role="alert">
                  No courses found.
                </div>
              ) : null}

              {!isLoading && !error && courses.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" style={{ width: '50px' }}>S. No</th>
                        <th scope="col">Course Name</th>
                        <th scope="col">Certification</th>
                        <th scope="col">Status</th>
                        {canModify ? (
                          <th scope="col" className="text-end">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course, index) => (
                        <tr key={course.id} className={editing?.id === course.id ? "table-active" : ""}>
                          <td className="text-muted fw-semibold">{index + 1}</td>
                          <td>{course.name}</td>
                          <td>{course.certification}</td>
                          <td>
                            <span className={`badge ${course.is_active ? "bg-success" : "bg-secondary"}`}>
                              {course.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {canModify ? (
                            <td className="text-end">
                              <div className="btn-group btn-group-sm" role="group">
                                <button
                                  type="button"
                                  className={`btn ${editing?.id === course.id ? "btn-secondary" : "btn-outline-primary"}`}
                                  onClick={() => handleEdit(editing?.id === course.id ? null : course)}
                                  title="Edit course details"
                                >
                                  Edit
                                </button>
                                {course.is_active ? (
                                  <button
                                    type="button"
                                    className="btn btn-outline-warning"
                                    onClick={() => handleDeactivate(course)}
                                    title="Deactivate this course"
                                  >
                                    Deactivate
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-outline-success"
                                    onClick={() => handleActivate(course)}
                                    title="Activate this course"
                                  >
                                    Activate
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(course)}
                                  title="Delete this course permanently"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Edit panel ─────────────────────────────────────────────────── */}
        {editing && (
          <div className="col-lg-4">
            <div style={{ position: "sticky", top: 20 }}>
              <EditPanel
                course={editing}
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

export default CoursesPage;
