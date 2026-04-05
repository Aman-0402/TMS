import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const initialFormData = {
  name: "",
  batch: "",
};

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function LabsPage() {
  const [labs, setLabs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadData = async () => {
    setError("");

    try {
      const [labsResponse, batchesResponse] = await Promise.all([
        http.get("labs/"),
        http.get("batches/"),
      ]);

      setLabs(normalizeApiList(labsResponse.data));
      setBatches(normalizeApiList(batchesResponse.data));
    } catch (requestError) {
      setError("Unable to load labs or batches. Please try again.");
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

    if (!formData.name.trim() || !formData.batch) {
      setSubmitError("Lab name and batch are required.");
      return;
    }

    setIsSubmitting(true);

    try {
      await http.post("labs/", {
        name: formData.name.trim(),
        batch: Number(formData.batch),
        trainer: null,
      });

      setFormData(initialFormData);
      setSuccessMessage("Lab created successfully.");
      toast.success("Lab created successfully");
      await loadData();
    } catch (requestError) {
      setSubmitError(
        requestError.response?.data?.name?.[0] ||
          requestError.response?.data?.batch?.[0] ||
          requestError.response?.data?.detail ||
          requestError.response?.data?.error ||
          "Unable to create lab."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Labs"
        description="Create available lab names for each batch before assigning trainers or uploading students."
      />

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">Add Available Lab</h2>
              <p className="text-secondary mb-4">
                Admin and Manager can create lab names here. Trainer assignment can happen later.
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
                  <label className="form-label" htmlFor="lab-name">
                    Lab Name
                  </label>
                  <input
                    id="lab-name"
                    name="name"
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter lab name, e.g. 501"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="lab-batch">
                    Select Batch
                  </label>
                  <select
                    id="lab-batch"
                    name="batch"
                    className="form-select"
                    value={formData.batch}
                    onChange={handleChange}
                    disabled={isLoading || isSubmitting}
                    required
                  >
                    <option value="">Choose batch</option>
                    {batches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  disabled={isLoading || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    "Create Lab"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h2 className="h5 mb-3">Available Labs</h2>

              {isLoading ? (
                <p className="mb-0 text-secondary">Loading labs...</p>
              ) : null}

              {!isLoading && error ? (
                <div className="alert alert-danger mb-0" role="alert">
                  {error}
                </div>
              ) : null}

              {!isLoading && !error && labs.length === 0 ? (
                <div className="alert alert-light mb-0" role="alert">
                  No labs found.
                </div>
              ) : null}

              {!isLoading && !error && labs.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Lab Name</th>
                        <th scope="col">Batch</th>
                        <th scope="col">Trainer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labs.map((lab) => (
                        <tr key={lab.id}>
                          <td>{lab.name}</td>
                          <td>{lab.batch_name}</td>
                          <td>{lab.trainer_name}</td>
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

export default LabsPage;
