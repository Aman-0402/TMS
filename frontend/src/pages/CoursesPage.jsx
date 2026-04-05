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

function CoursesPage() {
  const role = getRole();
  const canDelete = role === "ADMIN" || role === "MANAGER";
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

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

  const handleDelete = async (course) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, delete it",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      return;
    }

    setSubmitError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      await http.delete(`courses/${course.id}/`);
      await loadCourses();
      toast.success("Deleted successfully");
    } catch (requestError) {
      const message =
        requestError.response?.data?.error ||
        requestError.response?.data?.detail ||
        "Delete failed";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Courses"
        description="Create course records and link them with certifications."
      />

      <div className="row g-4">
        <div className="col-lg-4">
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

        <div className="col-lg-8">
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
                        <th scope="col">Course Name</th>
                        <th scope="col">Certification</th>
                        {canDelete ? (
                          <th scope="col" className="text-end">Actions</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr key={course.id}>
                          <td>{course.name}</td>
                          <td>{course.certification}</td>
                          {canDelete ? (
                            <td className="text-end">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(course)}
                                disabled={isSubmitting}
                              >
                                Delete
                              </button>
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
      </div>
    </>
  );
}

export default CoursesPage;
