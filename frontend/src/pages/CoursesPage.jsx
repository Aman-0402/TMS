import { useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const initialFormData = {
  name: "",
  certification: "",
};

function CoursesPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!formData.name.trim() || !formData.certification.trim()) {
      setError("Course name and certification are required.");
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
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
          requestError.response?.data?.name?.[0] ||
          requestError.response?.data?.certification?.[0] ||
          "Unable to create the course."
      );
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

      <div className="row justify-content-center">
        <div className="col-xl-6 col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">Create Course</h2>
              <p className="text-secondary mb-4">
                Add a new course and its certification for future batch creation.
              </p>

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
      </div>
    </>
  );
}

export default CoursesPage;
