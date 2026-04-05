import { useEffect, useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function StudentUploadPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const loadBatches = async () => {
      setError("");

      try {
        const response = await http.get("batches/");
        setBatches(normalizeApiList(response.data));
      } catch (requestError) {
        setError("Unable to load batches. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadBatches();
  }, []);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files?.[0] || null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setUploadProgress(0);

    if (!selectedBatch) {
      setError("Please select a batch.");
      return;
    }

    if (!selectedFile) {
      setError("Please choose an Excel file.");
      return;
    }

    const formData = new FormData();
    formData.append("batch", selectedBatch);
    formData.append("file", selectedFile);

    setIsSubmitting(true);

    try {
      const response = await http.post("students/upload-excel/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) {
            return;
          }

          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      const createdCount = response.data?.created_count ?? 0;
      const skippedDuplicates = response.data?.skipped_duplicates ?? 0;
      setSuccessMessage(
        `${response.data?.message || "Students uploaded successfully."} Created: ${createdCount}. Skipped duplicates: ${skippedDuplicates}.`
      );
      setSelectedFile(null);
      setUploadProgress(100);
      event.target.reset();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
          requestError.response?.data?.detail ||
          "Unable to upload the Excel file."
      );
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Student Excel Upload"
        description="Upload an Excel sheet and assign students to the selected batch."
      />

      <div className="row justify-content-center">
        <div className="col-xl-7 col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-3">Upload Student Sheet</h2>
              <p className="text-secondary mb-4">
                Supported columns: <strong>UG Number</strong>, <strong>Name</strong>,{" "}
                <strong>Department</strong>, <strong>Lab</strong>. Optional columns:
                <strong> Email</strong>, <strong>Phone</strong>.
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
                  <label className="form-label" htmlFor="batch">
                    Select Batch
                  </label>
                  <select
                    id="batch"
                    className="form-select"
                    value={selectedBatch}
                    onChange={(event) => setSelectedBatch(event.target.value)}
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

                <div className="mb-4">
                  <label className="form-label" htmlFor="student-file">
                    Excel File
                  </label>
                  <input
                    id="student-file"
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    required
                  />
                  <div className="form-text">
                    Upload `.xlsx` or `.xls` files only.
                  </div>
                  {selectedFile ? (
                    <div className="small text-muted mt-2">
                      Selected file: {selectedFile.name}
                    </div>
                  ) : null}
                </div>

                {isSubmitting ? (
                  <div className="mb-4">
                    <div className="d-flex justify-content-between small mb-2">
                      <span>Upload progress</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div
                      className="progress"
                      role="progressbar"
                      aria-label="Student upload progress"
                      aria-valuenow={uploadProgress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        style={{ width: `${uploadProgress}%` }}
                      >
                        {uploadProgress}%
                      </div>
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
                  disabled={isLoading || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                      Uploading...
                    </>
                  ) : (
                    "Upload Students"
                  )}
                </button>
              </form>

              {isLoading ? (
                <div className="text-center mt-4">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading batches...</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default StudentUploadPage;
