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

function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [labs, setLabs] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
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

      setStudents(Array.isArray(studentsResponse.data) ? studentsResponse.data : studentsResponse.data.results || []);
      setBatches(Array.isArray(batchesResponse.data) ? batchesResponse.data : batchesResponse.data.results || []);
      setLabs(Array.isArray(labsResponse.data) ? labsResponse.data : labsResponse.data.results || []);
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
    setIsSubmitting(true);

    try {
      await http.post("students/", {
        ...formData,
        batch: Number(formData.batch),
        lab: Number(formData.lab),
      });

      setFormData(initialFormData);
      setSuccessMessage("Student added successfully.");
      await loadData();
    } catch (submitRequestError) {
      const apiErrors = submitRequestError.response?.data;

      if (apiErrors && typeof apiErrors === "object") {
        const firstError = Object.values(apiErrors).flat()[0];
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
            <div className="card-body">
              <h2 className="h5 mb-3">Add New Student</h2>

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
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    className="form-control"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="batch">
                    Batch
                  </label>
                  <select
                    id="batch"
                    name="batch"
                    className="form-select"
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
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="lab">
                    Lab
                  </label>
                  <select
                    id="lab"
                    name="lab"
                    className="form-select"
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
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Add Student"}
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
