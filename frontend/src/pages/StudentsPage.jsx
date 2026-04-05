import { useEffect, useMemo, useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const initialFormData = {
  name: "",
  email: "",
  phone: "",
  batch: "",
  lab: "",
};

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function validateStudentForm(formData) {
  const errors = {};

  if (!formData.name.trim()) {
    errors.name = "Student name is required.";
  }

  if (!formData.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!formData.phone.trim()) {
    errors.phone = "Phone number is required.";
  }

  if (!formData.batch) {
    errors.batch = "Please select a batch.";
  }

  if (!formData.lab) {
    errors.lab = "Please select a lab.";
  }

  return errors;
}

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [labs, setLabs] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedBatchId = Number(formData.batch);

  const filteredLabs = useMemo(() => {
    if (!selectedBatchId) {
      return [];
    }

    return labs.filter((lab) => lab.batch === selectedBatchId);
  }, [labs, selectedBatchId]);

  const loadData = async () => {
    setError("");

    try {
      const [studentsResponse, batchesResponse, labsResponse] = await Promise.all([
        http.get("students/"),
        http.get("batches/"),
        http.get("labs/"),
      ]);

      setStudents(normalizeApiList(studentsResponse.data));
      setBatches(normalizeApiList(batchesResponse.data));
      setLabs(normalizeApiList(labsResponse.data));
    } catch (fetchError) {
      setError("Unable to load student data. Please check the backend server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
      ...(name === "batch" ? { lab: "" } : {}),
    }));

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
      ...(name === "batch" ? { lab: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    const validationErrors = validateStudentForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      setFormErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await http.post("students/", {
        ...formData,
        batch: Number(formData.batch),
        lab: Number(formData.lab),
      });

      setFormData(initialFormData);
      setFormErrors({});
      setSuccessMessage("Student added successfully.");
      await loadData();
    } catch (submitRequestError) {
      const apiErrors = submitRequestError.response?.data;

      if (apiErrors && typeof apiErrors === "object") {
        const formattedErrors = Object.fromEntries(
          Object.entries(apiErrors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
        );
        setFormErrors((currentErrors) => ({ ...currentErrors, ...formattedErrors }));
        const firstError = Object.values(formattedErrors).flat()[0];
        setSubmitError(firstError || "Unable to add student.");
      } else {
        setSubmitError("Unable to add student. Please verify the form details.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Students"
        description="Fetch students from the Django API and add new students from one place."
      />

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pb-0">
              <h2 className="h5 mb-1">Add New Student</h2>
              <p className="text-secondary small mb-0">
                Fill in the required details and assign the student to a batch and lab.
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
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    className={`form-control ${formErrors.name ? "is-invalid" : ""}`}
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter full name"
                  />
                  <div className="invalid-feedback">{formErrors.name}</div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`form-control ${formErrors.email ? "is-invalid" : ""}`}
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="Enter email address"
                  />
                  <div className="invalid-feedback">{formErrors.email}</div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    className={`form-control ${formErrors.phone ? "is-invalid" : ""}`}
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Enter phone number"
                  />
                  <div className="invalid-feedback">{formErrors.phone}</div>
                </div>

                <div className="mb-3">
                  <label className="form-label d-flex justify-content-between align-items-center" htmlFor="batch">
                    Batch
                    <span className="badge text-bg-light">{batches.length} available</span>
                  </label>
                  <select
                    id="batch"
                    name="batch"
                    className={`form-select ${formErrors.batch ? "is-invalid" : ""}`}
                    value={formData.batch}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                  <div className="invalid-feedback">{formErrors.batch}</div>
                </div>

                <div className="mb-4">
                  <label className="form-label d-flex justify-content-between align-items-center" htmlFor="lab">
                    Lab
                    <span className="badge text-bg-light">{filteredLabs.length} available</span>
                  </label>
                  <select
                    id="lab"
                    name="lab"
                    className={`form-select ${formErrors.lab ? "is-invalid" : ""}`}
                    value={formData.lab}
                    onChange={handleChange}
                    required
                    disabled={!formData.batch}
                  >
                    <option value="">Select lab</option>
                    {filteredLabs.map((lab) => (
                      <option key={lab.id} value={lab.id}>
                        {lab.name}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">
                    {!formData.batch
                      ? "Select a batch first to load matching labs."
                      : "Only labs for the selected batch are shown."}
                  </div>
                  <div className="invalid-feedback d-block">{formErrors.lab}</div>
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
                    "Add Student"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5 mb-3">Students List</h2>

              {isLoading ? (
                <p className="mb-0 text-secondary">Loading students...</p>
              ) : null}

              {!isLoading && error ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              ) : null}

              {!isLoading && !error && students.length === 0 ? (
                <div className="alert alert-light mb-0" role="alert">
                  No students found.
                </div>
              ) : null}

              {!isLoading && !error && students.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Email</th>
                        <th scope="col">Phone</th>
                        <th scope="col">Batch</th>
                        <th scope="col">Lab</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id}>
                          <td>{student.name}</td>
                          <td>{student.email}</td>
                          <td>{student.phone}</td>
                          <td>{student.batch_name || student.batch}</td>
                          <td>{student.lab_name || student.lab}</td>
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

export default StudentsPage;
