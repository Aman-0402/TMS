import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const initialFormData = {
  user: "",
  batch: "",
};

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function ManagersPage() {
  const [managerUsers, setManagerUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = async () => {
    setError("");

    try {
      const [managerUsersResponse, batchesResponse] = await Promise.all([
        http.get("manager-users/"),
        http.get("batches/"),
      ]);

      setManagerUsers(normalizeApiList(managerUsersResponse.data));
      setBatches(normalizeApiList(batchesResponse.data));
    } catch (requestError) {
      setError("Unable to load manager assignment data.");
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
    }));
  };

  const handleEdit = (managerUser) => {
    setSubmitError("");
    setSuccessMessage("");
    setEditingAssignmentId(managerUser.manager_profile_id || null);
    setFormData({
      user: String(managerUser.id),
      batch: managerUser.current_batch ? String(managerUser.current_batch) : "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSuccessMessage("");

    if (!formData.user || !formData.batch) {
      setSubmitError("Manager and batch are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        user: Number(formData.user),
        batch: Number(formData.batch),
      };

      if (editingAssignmentId) {
        await http.put(`managers/${editingAssignmentId}/`, payload);
        setSuccessMessage("Manager assignment updated successfully.");
        toast.success("Manager assignment updated");
      } else {
        await http.post("managers/", payload);
        setSuccessMessage("Manager assigned successfully.");
        toast.success("Manager assigned successfully");
      }

      resetForm();
      await loadData();
    } catch (requestError) {
      setSubmitError(
        requestError.response?.data?.batch?.[0] ||
          requestError.response?.data?.detail ||
          requestError.response?.data?.error ||
          "Unable to save manager assignment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Managers"
        description="View all available managers and assign them to a batch."
      />

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">
                {editingAssignmentId ? "Edit Manager Assignment" : "Assign Manager"}
              </h2>
              <p className="text-secondary mb-4">
                Select a manager account and connect it to a batch.
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
                  <label className="form-label" htmlFor="manager-user">
                    Manager
                  </label>
                  <select
                    id="manager-user"
                    name="user"
                    className="form-select"
                    value={formData.user}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting}
                    required
                  >
                    <option value="">Select manager</option>
                    {managerUsers.map((managerUser) => (
                      <option key={managerUser.id} value={managerUser.id}>
                        {managerUser.username}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="manager-batch">
                    Batch
                  </label>
                  <select
                    id="manager-batch"
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

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isLoading || isSubmitting}
                >
                  {isSubmitting
                    ? "Saving..."
                    : editingAssignmentId
                      ? "Update Assignment"
                      : "Assign Manager"}
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
              <h2 className="h5 mb-3">Available Managers</h2>

              {isLoading ? (
                <p className="mb-0 text-secondary">Loading managers...</p>
              ) : null}

              {!isLoading && error ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              ) : null}

              {!isLoading && !error && managerUsers.length === 0 ? (
                <div className="alert alert-light mb-0" role="alert">
                  No approved managers found.
                </div>
              ) : null}

              {!isLoading && !error && managerUsers.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Username</th>
                        <th scope="col">Email</th>
                        <th scope="col">Assigned Batch</th>
                        <th scope="col" className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {managerUsers.map((managerUser) => (
                        <tr key={managerUser.id}>
                          <td>{managerUser.username}</td>
                          <td>{managerUser.email || "-"}</td>
                          <td>{managerUser.current_batch_name || "Unassigned"}</td>
                          <td className="text-end">
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleEdit(managerUser)}
                              disabled={isSubmitting}
                            >
                              {managerUser.manager_profile_id ? "Edit" : "Assign"}
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

export default ManagersPage;
