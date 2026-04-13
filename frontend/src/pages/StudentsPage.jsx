import { useEffect, useMemo, useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const initialFormData = {
  ug_number: "",
  name: "",
  department: "",
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

  if (!formData.ug_number.trim()) {
    errors.ug_number = "UG Number is required.";
  }

  if (!formData.name.trim()) {
    errors.name = "Student name is required.";
  }

  if (!formData.department.trim()) {
    errors.department = "Department is required.";
  }

  if (formData.email.trim() && !/^\S+@\S+\.\S+$/.test(formData.email)) {
    errors.email = "Enter a valid email address.";
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
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("");
  const [selectedTrainerFilter, setSelectedTrainerFilter] = useState("");

  const selectedBatchId = Number(formData.batch);

  const filteredLabs = useMemo(() => {
    if (!selectedBatchId) {
      return [];
    }

    return labs.filter((lab) => lab.batch === selectedBatchId);
  }, [labs, selectedBatchId]);

  const trainerOptions = useMemo(() => {
    const trainersById = new Map();
    labs.forEach((lab) => {
      if (lab.trainer && !trainersById.has(lab.trainer)) {
        trainersById.set(lab.trainer, {
          id: lab.trainer,
          name: lab.trainer_name || `Trainer ${lab.trainer}`,
        });
      }
    });

    return Array.from(trainersById.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [labs]);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (selectedBatchFilter && String(student.batch) !== selectedBatchFilter) {
        return false;
      }

      if (selectedTrainerFilter && String(student.trainer_id) !== selectedTrainerFilter) {
        return false;
      }

      return true;
    });
  }, [selectedBatchFilter, selectedTrainerFilter, students]);

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

  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setEditingStudentId(null);
    setSubmitError("");
  };

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
      const payload = {
        ...formData,
        ug_number: formData.ug_number.trim(),
        name: formData.name.trim(),
        department: formData.department.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        batch: Number(formData.batch),
        lab: Number(formData.lab),
      };

      if (editingStudentId) {
        await http.put(`students/${editingStudentId}/`, payload);
      } else {
        await http.post("students/", payload);
      }

      resetForm();
      setSuccessMessage(
        editingStudentId ? "Student updated successfully." : "Student added successfully."
      );
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

  const handleEdit = (student) => {
    setSuccessMessage("");
    setSubmitError("");
    setFormErrors({});
    setEditingStudentId(student.id);
    setFormData({
      ug_number: student.ug_number || "",
      name: student.name || "",
      department: student.department || "",
      email: student.email || "",
      phone: student.phone || "",
      batch: student.batch ? String(student.batch) : "",
      lab: student.lab ? String(student.lab) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (student) => {
    const confirmed = window.confirm(
      `Delete ${student.name}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setSubmitError("");
    setSuccessMessage("");

    try {
      await http.delete(`students/${student.id}/`);

      if (editingStudentId === student.id) {
        resetForm();
      }

      setSuccessMessage("Student deleted successfully.");
      await loadData();
    } catch (deleteError) {
      setSubmitError("Unable to delete student. Please try again.");
    }
  };

  const handleOpenStudentList = () => {
    window.open("/students/list", "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageHeader
        title="Students"
        description="Fetch students from the Django API and manage student records from one place."
      />

      <div className="d-flex justify-content-end mb-4">
        <button
          type="button"
          className="btn btn-outline-primary"
          onClick={handleOpenStudentList}
        >
          Open Student List In New Tab
        </button>
      </div>

      <div className="row g-3 mb-4">
        {batches.map((batch) => (
          <div className="col-md-6 col-xl-3" key={batch.id}>
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body">
                <div className="text-uppercase small text-muted mb-2">Batch</div>
                <div className="fw-semibold">{batch.name}</div>
                <div className="display-6 fw-bold mt-2">{batch.student_count ?? 0}</div>
                <div className="text-secondary small">Students enrolled</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-0 pb-0">
              <h2 className="h5 mb-1">
                {editingStudentId ? "Edit Student" : "Add New Student"}
              </h2>
              <p className="text-secondary small mb-0">
                {editingStudentId
                  ? "Update the student details and save your changes."
                  : "Fill in the required details and assign the student to a batch and lab."}
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
                  <label className="form-label" htmlFor="ug_number">
                    UG Number
                  </label>
                  <input
                    id="ug_number"
                    name="ug_number"
                    type="text"
                    className={`form-control ${formErrors.ug_number ? "is-invalid" : ""}`}
                    value={formData.ug_number}
                    onChange={handleChange}
                    required
                    placeholder="Enter UG number"
                  />
                  <div className="invalid-feedback">{formErrors.ug_number}</div>
                </div>

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
                  <label className="form-label" htmlFor="department">
                    Department
                  </label>
                  <input
                    id="department"
                    name="department"
                    type="text"
                    className={`form-control ${formErrors.department ? "is-invalid" : ""}`}
                    value={formData.department}
                    onChange={handleChange}
                    required
                    placeholder="Enter department"
                  />
                  <div className="invalid-feedback">{formErrors.department}</div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="email">
                    Email <span className="text-muted">(Optional)</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className={`form-control ${formErrors.email ? "is-invalid" : ""}`}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                  />
                  <div className="invalid-feedback">{formErrors.email}</div>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="phone">
                    Phone <span className="text-muted">(Optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    className={`form-control ${formErrors.phone ? "is-invalid" : ""}`}
                    value={formData.phone}
                    onChange={handleChange}
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
                    editingStudentId ? "Update Student" : "Add Student"
                  )}
                </button>

                {editingStudentId ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100 mt-2"
                    onClick={resetForm}
                    disabled={isSubmitting}
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5 mb-3">Students List</h2>

              <div className="row g-3 mb-3">
                <div className="col-md-4">
                  <label className="form-label" htmlFor="students-filter-batch">Filter by Batch</label>
                  <select
                    id="students-filter-batch"
                    className="form-select"
                    value={selectedBatchFilter}
                    onChange={(event) => setSelectedBatchFilter(event.target.value)}
                  >
                    <option value="">All batches</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.student_count ?? 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label" htmlFor="students-filter-trainer">Filter by Trainer</label>
                  <select
                    id="students-filter-trainer"
                    className="form-select"
                    value={selectedTrainerFilter}
                    onChange={(event) => setSelectedTrainerFilter(event.target.value)}
                  >
                    <option value="">All trainers</option>
                    {trainerOptions.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      setSelectedBatchFilter("");
                      setSelectedTrainerFilter("");
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              {isLoading ? (
                <p className="mb-0 text-secondary">Loading students...</p>
              ) : null}

              {!isLoading && error ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              ) : null}

              {!isLoading && !error && filteredStudents.length === 0 ? (
                <div className="alert alert-light mb-0" role="alert">
                  No students found.
                </div>
              ) : null}

              {!isLoading && !error && filteredStudents.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">UG Number</th>
                        <th scope="col">Name</th>
                        <th scope="col">Department</th>
                        <th scope="col">Email</th>
                        <th scope="col">Phone</th>
                        <th scope="col">Batch</th>
                        <th scope="col">Lab</th>
                        <th scope="col">Trainer</th>
                        <th scope="col" className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student) => (
                        <tr key={student.id}>
                          <td>{student.ug_number}</td>
                          <td>{student.name}</td>
                          <td>{student.department}</td>
                          <td>{student.email}</td>
                          <td>{student.phone}</td>
                          <td>{student.batch_name || student.batch}</td>
                          <td>{student.lab_name || student.lab}</td>
                          <td>{student.trainer_name || "Unassigned"}</td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => handleEdit(student)}
                                disabled={isSubmitting}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleDelete(student)}
                                disabled={isSubmitting}
                              >
                                Delete
                              </button>
                            </div>
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

export default StudentsPage;
