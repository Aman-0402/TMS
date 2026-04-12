import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const initialFormData = {
  user: "",
  batch: "",
  lab: "",
};

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function getAssignmentErrorMessage(error) {
  const responseData = error.response?.data;

  console.error("[TrainersPage] Trainer assignment failed:", responseData || error);

  if (!responseData) {
    return "Unable to save trainer assignment.";
  }

  if (typeof responseData.error === "string" && responseData.error.trim()) {
    return responseData.error;
  }

  const firstFieldError = [
    responseData.lab,
    responseData.lab_id,
    responseData.batch,
    responseData.batch_id,
    responseData.user,
    responseData.trainer_id,
    responseData.non_field_errors,
    responseData.detail,
  ].find((value) => value);

  if (Array.isArray(firstFieldError) && firstFieldError.length > 0) {
    return firstFieldError[0];
  }

  if (typeof firstFieldError === "string" && firstFieldError.trim()) {
    return firstFieldError;
  }

  return "Unable to save trainer assignment.";
}

function TrainersPage() {
  const [trainerUsers, setTrainerUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [labs, setLabs] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const filteredLabs = useMemo(() => {
    if (!formData.batch) {
      return [];
    }

    return labs.filter((lab) => String(lab.batch) === formData.batch);
  }, [formData.batch, labs]);

  const loadData = async () => {
    setError("");

    try {
      const [trainerUsersResponse, batchesResponse, labsResponse] = await Promise.all([
        http.get("trainer-users/"),
        http.get("batches/"),
        http.get("labs/"),
      ]);

      setTrainerUsers(normalizeApiList(trainerUsersResponse.data));
      setBatches(normalizeApiList(batchesResponse.data));
      setLabs(normalizeApiList(labsResponse.data));
    } catch (requestError) {
      setError("Unable to load trainer assignment data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingAssignmentId(null);
    setSubmitError("");
    setSuccessMessage("");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
      ...(name === "batch" ? { lab: "" } : {}),
    }));
  };

  const handleEdit = (trainerUser) => {
    setSubmitError("");
    setSuccessMessage("");
    setEditingAssignmentId(trainerUser.trainer_profile_id || null);
    setFormData({
      user: String(trainerUser.id),
      batch: trainerUser.current_batch ? String(trainerUser.current_batch) : "",
      lab: trainerUser.current_lab_id ? String(trainerUser.current_lab_id) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    if (!formData.user || !formData.batch) {
      setSubmitError("Trainer and batch are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        trainer_id: Number(formData.user),
        batch_id: Number(formData.batch),
        lab_id: formData.lab ? Number(formData.lab) : null,
      };

      console.log("[TrainersPage] Saving trainer assignment payload:", payload);

      if (editingAssignmentId) {
        await http.put(`trainers/${editingAssignmentId}/`, payload);
        setSuccessMessage("Trainer assignment updated successfully.");
        toast.success("Trainer assignment updated");
      } else {
        await http.post("trainers/", payload);
        setSuccessMessage("Trainer assigned successfully.");
        toast.success("Trainer assigned successfully");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setSubmitError(getAssignmentErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Trainers"
        description="View all available trainers and assign them to a batch and lab."
      />

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">
                {editingAssignmentId ? "Edit Trainer Assignment" : "Assign Trainer"}
              </h2>
              <p className="text-secondary mb-4">
                Select a trainer account, choose a batch, and optionally assign a lab.
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
                  <label className="form-label" htmlFor="trainer-user">
                    Trainer
                  </label>
                  <select
                    id="trainer-user"
                    name="user"
                    className="form-select"
                    value={formData.user}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting}
                    required
                  >
                    <option value="">Select trainer</option>
                    {trainerUsers.map((trainerUser) => (
                      <option key={trainerUser.id} value={trainerUser.id}>
                        {trainerUser.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label" htmlFor="trainer-batch">
                    Batch
                  </label>
                  <select
                    id="trainer-batch"
                    name="batch"
                    className="form-select"
                    value={formData.batch}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting}
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
                  <label className="form-label" htmlFor="trainer-lab">
                    Lab
                  </label>
                  <select
                    id="trainer-lab"
                    name="lab"
                    className="form-select"
                    value={formData.lab}
                    onChange={handleChange}
                    disabled={!formData.batch || isLoading || isSubmitting}
                  >
                    <option value="">Select lab</option>
                    {filteredLabs.map((lab) => (
                      <option key={lab.id} value={lab.id}>
                        {lab.name}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">
                    Lab assignment is optional, but useful for direct ownership.
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isLoading || isSubmitting}
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingAssignmentId
                      ? "Update Assignment"
                      : "Assign Trainer"}
                </button>

                {editingAssignmentId ? (
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
              <h2 className="h5 mb-3">Available Trainers</h2>

              {isLoading ? (
                <p className="mb-0 text-secondary">Loading trainers...</p>
              ) : null}

              {!isLoading && error ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              ) : null}

              {!isLoading && !error && trainerUsers.length === 0 ? (
                <div className="alert alert-light mb-0" role="alert">
                  No approved trainers found.
                </div>
              ) : null}

              {!isLoading && !error && trainerUsers.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col" style={{ width: '60px' }}>S. No</th>
                        <th scope="col">Username</th>
                        <th scope="col">Email</th>
                        <th scope="col">Batch</th>
                        <th scope="col">Assigned Labs</th>
                        <th scope="col" className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trainerUsers.map((trainerUser, index) => (
                        <tr key={trainerUser.id}>
                          <td className="text-muted fw-semibold">{index + 1}</td>
                          <td>{trainerUser.username}</td>
                          <td>{trainerUser.email || "-"}</td>
                          <td>{trainerUser.current_batch_name || "Unassigned"}</td>
                          <td>
                            {trainerUser.assigned_lab_names?.length
                              ? trainerUser.assigned_lab_names.join(", ")
                              : "Unassigned"}
                          </td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEdit(trainerUser)}
                              disabled={isSubmitting}
                            >
                              {trainerUser.trainer_profile_id ? "Edit" : "Assign"}
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
        </div>
      </div>
    </>
  );
}

export default TrainersPage;
