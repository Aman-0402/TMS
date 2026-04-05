import { useEffect, useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

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
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = async () => {
    setError("");

    try {
      const [batchesResponse, coursesResponse] = await Promise.all([
        http.get("batches/"),
        http.get("courses/"),
      ]);

      setBatches(normalizeApiList(batchesResponse.data));
      setCourses(normalizeApiList(coursesResponse.data));
    } catch (fetchError) {
      setError("Unable to load batches or courses. Please check the backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  return (
    <>
      <PageHeader
        title="Batches"
        description="Create new batches and manage them by course."
      />

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pb-0">
              <h2 className="h5 mb-1">Create Batch</h2>
              <p className="text-secondary small mb-0">
                Select a course and define the training schedule.
              </p>
            </div>

            <div className="card-body">
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
                    Batch Name
                  </label>
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
                  <label className="form-label" htmlFor="course">
                    Select Course
                  </label>
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
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.certification})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="start_date">
                    Start Date
                  </label>
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
                  <label className="form-label" htmlFor="end_date">
                    End Date
                  </label>
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
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    "Create Batch"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5 mb-3">Batch List</h2>

              {isLoading ? (
                <p className="mb-0 text-secondary">Loading batches...</p>
              ) : null}

              {!isLoading && error ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              ) : null}

              {!isLoading && !error && batches.length === 0 ? (
                <div className="alert alert-light mb-0" role="alert">
                  No batches found.
                </div>
              ) : null}

              {!isLoading && !error && batches.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Course</th>
                        <th scope="col">Start Date</th>
                        <th scope="col">End Date</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => (
                        <tr key={batch.id}>
                          <td>{batch.name}</td>
                          <td>
                            {batch.course_name}
                            {batch.certification ? ` (${batch.certification})` : ""}
                          </td>
                          <td>{formatDate(batch.start_date)}</td>
                          <td>{formatDate(batch.end_date)}</td>
                          <td>
                            <span className="badge text-bg-primary">{batch.status}</span>
                          </td>
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

export default BatchesPage;
