import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const REQUIRED_COLUMNS = ["UG Number", "Name", "Department", "Lab"];
const OPTIONAL_COLUMNS = ["Email", "Phone"];

function normalizeApiList(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

// ── Client-side pre-validation ──────────────────────────────────────────────
async function validateExcelFile(file) {
  // We can't parse Excel client-side without a library, so we do lightweight checks:
  // file type and size only. Server does the deep validation.
  const errors = [];
  if (!file.name.match(/\.(xlsx|xls)$/i)) {
    errors.push("File must be an Excel file (.xlsx or .xls).");
  }
  if (file.size > 10 * 1024 * 1024) {
    errors.push("File size must be under 10 MB.");
  }
  return errors;
}

function StudentUploadPage() {
  const [batches, setBatches]           = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadResult, setUploadResult] = useState(null);  // success report
  const [serverError, setServerError]   = useState("");

  useEffect(() => {
    http.get("batches/")
      .then((r) => setBatches(normalizeApiList(r.data)))
      .catch(() => toast.error("Unable to load batches."))
      .finally(() => setIsLoading(false));
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setValidationErrors([]);
    setUploadResult(null);
    setServerError("");

    if (file) {
      const errs = await validateExcelFile(file);
      setValidationErrors(errs);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setUploadResult(null);
    setUploadProgress(0);

    if (!selectedBatch) { toast.error("Please select a batch."); return; }
    if (!selectedFile)  { toast.error("Please choose an Excel file."); return; }
    if (validationErrors.length > 0) { toast.error("Fix file errors before uploading."); return; }

    const formData = new FormData();
    formData.append("batch", selectedBatch);
    formData.append("file", selectedFile);

    setIsSubmitting(true);
    try {
      const res = await http.post("students/upload-excel/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (ev) => {
          if (ev.total) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
        },
      });
      setUploadResult(res.data);
      setUploadProgress(100);
      toast.success("Upload complete!");
      setSelectedFile(null);
      e.target.reset();
    } catch (err) {
      const data = err.response?.data;
      const msg  = data?.error || data?.detail || "Upload failed.";
      setServerError(msg);

      // Show missing columns or file-level duplicate details
      if (data?.missing_columns?.length) {
        setValidationErrors([
          msg,
          `Missing columns: ${data.missing_columns.join(", ")}`,
        ]);
      } else if (data?.duplicate_ug_numbers?.length) {
        setValidationErrors([
          msg,
          `Duplicate UG numbers in file: ${data.duplicate_ug_numbers.join(", ")}`,
        ]);
      } else {
        setValidationErrors([msg]);
      }
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Student Excel Upload"
        description="Upload an Excel sheet to add or re-enroll students into the selected batch."
      />

      <div className="row g-4">
        {/* Upload form */}
        <div className="col-xl-5 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h2 className="h5 mb-1">Upload Student Sheet</h2>
              <p className="text-secondary small mb-4">
                Required columns: <strong>{REQUIRED_COLUMNS.join(", ")}</strong>.<br />
                Optional: {OPTIONAL_COLUMNS.join(", ")}.
              </p>

              {validationErrors.length > 0 && (
                <div className="alert alert-danger">
                  <ul className="mb-0 ps-3">
                    {validationErrors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="batch">Select Batch</label>
                  <select
                    id="batch"
                    className="form-select"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    disabled={isLoading || isSubmitting}
                    required
                  >
                    <option value="">Choose batch</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.course_name ? `— ${b.course_name}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="form-label" htmlFor="student-file">Excel File</label>
                  <input
                    id="student-file"
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    required
                  />
                  <div className="form-text">Accepted: .xlsx, .xls · Max 10 MB</div>
                  {selectedFile && (
                    <div className="small text-muted mt-1">{selectedFile.name}</div>
                  )}
                </div>

                {isSubmitting && (
                  <div className="mb-3">
                    <div className="d-flex justify-content-between small mb-1">
                      <span>Uploading…</span><span>{uploadProgress}%</span>
                    </div>
                    <div className="progress" style={{ height: 8 }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100 d-flex justify-content-center align-items-center gap-2"
                  disabled={isLoading || isSubmitting || validationErrors.length > 0}
                >
                  {isSubmitting ? (
                    <><span className="spinner-border spinner-border-sm" aria-hidden="true" />Uploading…</>
                  ) : "Upload Students"}
                </button>
              </form>
            </div>
          </div>

          {/* Template / format guide */}
          <div className="card shadow-sm border-0 mt-3">
            <div className="card-body p-4">
              <h3 className="h6 mb-3">Re-enrollment Rules</h3>
              <ul className="small text-secondary mb-0 ps-3">
                <li>New student (UG not in system) → <strong>created</strong> in selected batch.</li>
                <li>Student exists in a <strong>different course</strong> → <strong>re-enrolled</strong> into new batch.</li>
                <li>Student exists in the <strong>same course</strong> → <strong>skipped</strong> (shown in report).</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Result report */}
        <div className="col-xl-7 col-lg-6">
          {!uploadResult && !serverError && (
            <div className="card shadow-sm border-0 h-100 d-flex align-items-center justify-content-center text-center" style={{ minHeight: 200 }}>
              <div className="text-muted p-4">
                <div className="mb-2" style={{ fontSize: "2rem" }}>📋</div>
                <p className="mb-0 small">Upload results will appear here.</p>
              </div>
            </div>
          )}

          {serverError && !uploadResult && (
            <div className="alert alert-danger">{serverError}</div>
          )}

          {uploadResult && (
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h3 className="h5 mb-3">Upload Report</h3>

                <div className="row g-3 mb-4">
                  <div className="col-4">
                    <div className="p-3 rounded bg-success bg-opacity-10 text-center border border-success border-opacity-25">
                      <div className="fw-bold fs-4 text-success">{uploadResult.created_count ?? 0}</div>
                      <div className="small text-muted">Created</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 rounded bg-info bg-opacity-10 text-center border border-info border-opacity-25">
                      <div className="fw-bold fs-4 text-info">{uploadResult.reenrolled_count ?? 0}</div>
                      <div className="small text-muted">Re-enrolled</div>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="p-3 rounded bg-warning bg-opacity-10 text-center border border-warning border-opacity-25">
                      <div className="fw-bold fs-4 text-warning">{uploadResult.same_course_duplicates?.length ?? 0}</div>
                      <div className="small text-muted">Skipped (same course)</div>
                    </div>
                  </div>
                </div>

                {uploadResult.same_course_duplicates?.length > 0 && (
                  <>
                    <h4 className="h6 mb-2 text-warning">Same-course Duplicates (skipped)</h4>
                    <p className="text-secondary small mb-2">
                      These students already exist in a batch for the same course and were not re-enrolled.
                    </p>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="table-warning">
                          <tr>
                            <th>UG Number</th>
                            <th>Name</th>
                            <th>Current Batch</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadResult.same_course_duplicates.map((d) => (
                            <tr key={d.ug_number}>
                              <td>{d.ug_number}</td>
                              <td>{d.name}</td>
                              <td>{d.current_batch}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default StudentUploadPage;
