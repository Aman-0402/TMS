import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";

import http from "../api/http";
import { getRole } from "../utils/auth";
import PageHeader from "../components/common/PageHeader";

const FINAL_MOCK_PASS = 70;   // out of 100
const FINAL_EXAM_PASS = 700;  // out of 1000

function normalizeList(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

// ---------------------------------------------------------------------------
// Mark entry / edit modal form
// ---------------------------------------------------------------------------
function ResultForm({ batches, students, onSaved, editingResult, onCancel }) {
  const [formData, setFormData] = useState({
    batch: editingResult?.batch ?? "",
    student: editingResult?.student ?? "",
    final_mock: editingResult?.final_mock ?? 0,
    final_exam: editingResult?.final_exam ?? 0,
    exam_date: editingResult?.exam_date ?? "",
  });
  const [batchStudents, setBatchStudents] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [error, setError]                 = useState("");
  const [existingResults, setExistingResults] = useState({});

  useEffect(() => {
    if (formData.batch) {
      const filtered = students.filter((s) => String(s.batch) === String(formData.batch));
      setBatchStudents(filtered);
      
      // Fetch existing results for this batch to get mock scores
      http.get(`results/?batch=${formData.batch}`)
        .then((rRes) => {
          const resultList = normalizeList(rRes.data);
          const resMap = {};
          resultList.forEach((r) => { resMap[r.student] = r; });
          setExistingResults(resMap);
        })
        .catch(() => {});
    } else {
      setBatchStudents([]);
      setExistingResults({});
    }
  }, [formData.batch, students]);

  const filteredBatchStudents = useMemo(() => {
    const normalized = studentSearchTerm.trim().toLowerCase();
    if (!normalized) return batchStudents;
    return batchStudents.filter((student) =>
      student.ug_number?.toLowerCase().includes(normalized) ||
      student.name?.toLowerCase().includes(normalized)
    );
  }, [batchStudents, studentSearchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };
      
      // Autofill fields when student is selected (only for new results, not editing)
      if (name === "student" && value && !editingResult) {
        const existingResult = existingResults[value];
        if (existingResult) {
          newData.final_mock = existingResult.final_mock || 0;
          newData.final_exam = existingResult.final_exam || 0;
          newData.exam_date  = existingResult.exam_date  || "";
        }
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const finalMock = parseFloat(formData.final_mock);
    const finalExam = parseFloat(formData.final_exam);

    if (finalMock < 0 || finalMock > 100) { setError("Final Mock must be 0–100."); return; }
    if (finalExam < 0 || finalExam > 1000) { setError("Final Exam must be 0–1000."); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        batch: Number(formData.batch),
        student: Number(formData.student),
        final_mock: finalMock,
        final_exam: finalExam,
        exam_date: formData.exam_date || null,
      };

      if (editingResult) {
        await http.put(`results/${editingResult.id}/`, payload);
        toast.success("Result updated.");
      } else {
        // Check if result already exists for this student-batch combination
        const existingResult = existingResults[formData.student];
        if (existingResult) {
          await http.put(`results/${existingResult.id}/`, payload);
          toast.success("Result updated.");
        } else {
          await http.post("results/", payload);
          toast.success("Result saved.");
        }
      }
      onSaved();
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.student?.[0] || data?.batch?.[0] || data?.non_field_errors?.[0] ||
        data?.final_mock?.[0] || data?.final_exam?.[0] ||
        data?.error || "Failed to save result."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card shadow-sm border-0">
      <div className="card-body p-4">
        <h2 className="h5 mb-3">{editingResult ? "Edit Result" : "Add Result"}</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="rf-batch">Batch</label>
            <select
              id="rf-batch"
              name="batch"
              className="form-select"
              value={formData.batch}
              onChange={handleChange}
              disabled={!!editingResult}
              required
            >
              <option value="">Select batch</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="rf-student">Student</label>
            {!editingResult && formData.batch && (
              <input
                id="rf-search"
                type="search"
                className="form-control mb-2"
                placeholder="Search by UG number or name"
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
              />
            )}
            <select
              id="rf-student"
              name="student"
              className="form-select"
              value={formData.student}
              onChange={handleChange}
              disabled={!formData.batch || !!editingResult}
              required
            >
              <option value="">Select student</option>
              {filteredBatchStudents.length > 0 ? filteredBatchStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.ug_number})</option>
              )) : (
                <option value="" disabled>No matching students</option>
              )}
            </select>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-sm-12">
              <label className="form-label" htmlFor="rf-mock">
                Final Mock <span className="text-muted">/100</span>
                <span className="ms-1 badge bg-warning text-dark" style={{ fontSize: "0.7rem" }}>Pass ≥{FINAL_MOCK_PASS}</span>
                {!editingResult && formData.student && existingResults[formData.student] && existingResults[formData.student].final_mock > 0 && (
                  <span className="ms-1 badge bg-info text-dark" style={{ fontSize: "0.7rem" }}>Autofilled from Trainer</span>
                )}
              </label>
              <input
                id="rf-mock"
                name="final_mock"
                type="number"
                className="form-control"
                value={formData.final_mock}
                onChange={handleChange}
                min={0}
                max={100}
                step={0.5}
                required
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="rf-exam">
              Final Exam <span className="text-muted">/1000</span>
              <span className="ms-1 badge bg-warning text-dark" style={{ fontSize: "0.7rem" }}>Pass ≥{FINAL_EXAM_PASS}</span>
              {!editingResult && formData.student && existingResults[formData.student] && existingResults[formData.student].final_exam > 0 && (
                <span className="ms-1 badge bg-success text-dark" style={{ fontSize: "0.7rem" }}>Autofilled from Previous Entry</span>
              )}
            </label>
            <input
              id="rf-exam"
              name="final_exam"
              type="number"
              className="form-control"
              value={formData.final_exam}
              onChange={handleChange}
              min={0}
              max={1000}
              step={1}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="rf-exam-date">
              Exam Date
              <span className="ms-1 text-muted" style={{ fontSize: "0.8rem" }}>When was the Final Exam held?</span>
            </label>
            <input
              id="rf-exam-date"
              name="exam_date"
              type="date"
              className="form-control"
              value={formData.exam_date}
              onChange={handleChange}
            />
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Saving...</>
              ) : editingResult ? "Update" : "Save Result"}
            </button>
            {editingResult && (
              <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results table (with filters)
// ---------------------------------------------------------------------------
function ResultsTable({ batches, students, title, showForm, role }) {
  const [selectedBatch, setSelectedBatch]     = useState("");
  const [results, setResults]                 = useState([]);
  const [isLoading, setIsLoading]             = useState(false);
  const [editingResult, setEditingResult]     = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [searchTerm, setSearchTerm]           = useState("");

  // Filters
  const [filterFailedMock, setFilterFailedMock]   = useState(false);
  const [filterLowAtt, setFilterLowAtt]           = useState(false);
  const [lowAttThreshold, setLowAttThreshold]     = useState(75);
  const [filterEligible, setFilterEligible]       = useState(false);

  const studentMap = useMemo(() => Object.fromEntries(students.map((s) => [s.id, s])), [students]);

  const canEdit = role === "ADMIN" || role === "MANAGER";

  const loadResults = async (batchId) => {
    if (!batchId) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ batch: batchId });
      if (filterFailedMock) params.set("failed_mock", "true");
      if (filterEligible)   params.set("eligible_only", "true");

      const [resData, attData] = await Promise.all([
        http.get(`results/?${params}`),
        http.get(`student-attendance/summary/?batch=${batchId}`),
      ]);

      setResults(normalizeList(resData.data));

      const attMap = {};
      normalizeList(attData.data).forEach((r) => {
        attMap[r.student_id] = r.attendance_percentage;
      });
      setAttendanceSummary(attMap);
    } catch {
      toast.error("Failed to load results.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadResults(selectedBatch); }, [selectedBatch, filterFailedMock, filterEligible]);

  const handleDelete = async (result) => {
    const confirm = await Swal.fire({
      title: "Delete result?",
      text: `Remove result for ${result.student_name}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Delete",
    });
    if (!confirm.isConfirmed) return;
    try {
      await http.delete(`results/${result.id}/`);
      toast.success("Result deleted.");
      loadResults(selectedBatch);
    } catch {
      toast.error("Failed to delete result.");
    }
  };

  const visibleResults = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return results.filter((r) => {
      const student = studentMap[r.student] || {};
      const matchesSearch =
        !normalizedSearch ||
        student.ug_number?.toLowerCase().includes(normalizedSearch) ||
        student.name?.toLowerCase().includes(normalizedSearch) ||
        student.lab_name?.toLowerCase().includes(normalizedSearch) ||
        student.batch_name?.toLowerCase().includes(normalizedSearch) ||
        r.student_name?.toLowerCase().includes(normalizedSearch);

      const attPct = attendanceSummary[r.student] ?? 100;
      const matchesLowAtt = !filterLowAtt || attPct < lowAttThreshold;

      return matchesSearch && matchesLowAtt;
    });
  }, [results, searchTerm, studentMap, attendanceSummary, filterLowAtt, lowAttThreshold]);

  const handleExport = () => {
    if (visibleResults.length === 0) {
      toast.warning("No results to export.");
      return;
    }

    const exportData = visibleResults.map((r, idx) => {
      const student = studentMap[r.student] || {};
      const attPct = attendanceSummary[r.student] ?? null;
      return {
        "S. No": idx + 1,
        "UG Number": student.ug_number || "—",
        "Name": r.student_name,
        "Lab": student.lab_name || "—",
        "Attendance %": attPct !== null ? attPct : "—",
        "Final Mock": r.final_mock || "—",
        "Final Exam": r.final_exam || "—",
        "Exam Date": r.exam_date ? new Date(r.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
        "Result": r.final_exam > 0 ? (r.is_pass ? "PASS" : "FAIL") : (r.is_final_mock_pass ? "Eligible" : "Not Eligible"),
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Results");

    const filename = `Student_Results_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success(`Exported ${visibleResults.length} student(s).`);
  };

  return (
    <div className="row g-4">
      {/* Form for adding/editing */}
      {showForm && (
        <div className="col-lg-4">
          <ResultForm
            batches={batches}
            students={students}
            editingResult={editingResult}
            onSaved={() => { setEditingResult(null); loadResults(selectedBatch); }}
            onCancel={() => setEditingResult(null)}
          />
        </div>
      )}

      <div className={showForm ? "col-lg-8" : "col-12"}>
        {!showForm && editingResult && (
          <>
            <div className="modal-backdrop fade show" />
            <div className="modal d-block" tabIndex="-1">
              <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Edit Result</h5>
                    <button type="button" className="btn-close" aria-label="Close" onClick={() => setEditingResult(null)} />
                  </div>
                  <div className="modal-body">
                    <ResultForm
                      batches={batches}
                      students={students}
                      editingResult={editingResult}
                      onSaved={() => { setEditingResult(null); loadResults(selectedBatch); }}
                      onCancel={() => setEditingResult(null)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
        {/* Filters bar */}
        <div className="card shadow-sm border-0 mb-3">
          <div className="card-body p-3">
            <div className="row g-3 align-items-end">
              <div className="col-sm-3">
                <label className="form-label mb-1" htmlFor="rt-batch">Batch</label>
                <select id="rt-batch" className="form-select form-select-sm" value={selectedBatch} onChange={(e) => { setSelectedBatch(e.target.value); setEditingResult(null); }}>
                  <option value="">Select batch</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="col-sm-5">
                <label className="form-label mb-1" htmlFor="rt-search">Search</label>
                <input
                  id="rt-search"
                  type="search"
                  className="form-control form-control-sm"
                  placeholder="UG number, name, batch, or lab"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={!selectedBatch}
                />
              </div>

              <div className="col-auto d-flex flex-wrap gap-3 align-items-center">
                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="f-failed-mock"
                    checked={filterFailedMock}
                    onChange={(e) => { setFilterFailedMock(e.target.checked); if (e.target.checked) setFilterEligible(false); }}
                  />
                  <label className="form-check-label small" htmlFor="f-failed-mock">
                    Failed Final Mock
                  </label>
                </div>

                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="f-eligible"
                    checked={filterEligible}
                    onChange={(e) => { setFilterEligible(e.target.checked); if (e.target.checked) setFilterFailedMock(false); }}
                  />
                  <label className="form-check-label small" htmlFor="f-eligible">
                    Eligible for Final Exam
                  </label>
                </div>

                <div className="form-check mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="f-low-att"
                    checked={filterLowAtt}
                    onChange={(e) => setFilterLowAtt(e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor="f-low-att">
                    Low Attendance
                  </label>
                </div>

                {filterLowAtt && (
                  <div style={{ width: 110 }}>
                    <div className="input-group input-group-sm">
                      <input
                        type="number"
                        className="form-control"
                        value={lowAttThreshold}
                        onChange={(e) => setLowAttThreshold(Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                      <span className="input-group-text">%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Results table */}
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">{title}</h2>
              <div className="d-flex gap-2 align-items-center">
                {visibleResults.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={handleExport}
                      title="Export to Excel"
                    >
                      📥 Export as .xlsx
                    </button>
                    <span className="text-muted small">{visibleResults.length} student{visibleResults.length !== 1 ? "s" : ""}</span>
                  </>
                )}
              </div>
            </div>

            {!selectedBatch && <p className="text-secondary mb-0">Select a batch to view results.</p>}
            {selectedBatch && isLoading && <p className="text-secondary mb-0">Loading...</p>}
            {selectedBatch && !isLoading && visibleResults.length === 0 && (
              <div className="alert alert-light mb-0">No results found.</div>
            )}

            {selectedBatch && !isLoading && visibleResults.length > 0 && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.875rem" }}>
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Lab</th>
                      <th>Attendance</th>
                      <th>Final Mock<br /><span className="fw-normal text-muted">/100</span></th>
                      <th>Mock Status</th>
                      <th>Final Exam<br /><span className="fw-normal text-muted">/1000</span></th>
                      <th>Exam Date</th>
                      <th>Result</th>
                      {canEdit && <th className="text-end">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleResults.map((r, idx) => {
                      const student = studentMap[r.student] || {};
                      const attPct = attendanceSummary[r.student] ?? null;
                      const isLowAtt = attPct !== null && attPct < lowAttThreshold;
                      return (
                        <tr key={r.id} className={isLowAtt && filterLowAtt ? "table-warning" : ""}>
                          <td className="text-muted">{idx + 1}</td>
                          <td>
                            <div className="fw-medium">{r.student_name}</div>
                            <div className="text-muted small">{student.ug_number || "—"}</div>
                          </td>
                          <td>{student.lab_name || "—"}</td>
                          <td>
                            {attPct !== null ? (
                              <span className={`badge bg-${attPct >= 75 ? "success" : attPct >= 50 ? "warning text-dark" : "danger"}`}>
                                {attPct}%
                              </span>
                            ) : <span className="text-muted">—</span>}
                          </td>
                          <td>{r.final_mock}</td>
                          <td>
                            {r.is_final_mock_pass
                              ? <span className="badge bg-success">Passed ✓</span>
                              : <span className="badge bg-danger">Failed</span>}
                          </td>
                          <td>{r.final_exam > 0 ? r.final_exam : <span className="text-muted">—</span>}</td>
                          <td>
                            {r.exam_date
                              ? new Date(r.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                              : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            {r.final_exam > 0
                              ? r.is_pass
                                ? <span className="badge bg-success">PASS</span>
                                : <span className="badge bg-danger">FAIL</span>
                              : r.is_final_mock_pass
                                ? <span className="badge bg-info text-dark">Eligible</span>
                                : <span className="badge bg-secondary">Not Eligible</span>}
                          </td>
                          {canEdit && (
                            <td className="text-end">
                              <div className="d-inline-flex gap-2">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => setEditingResult(r)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleDelete(r)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Result Checker — compare system results against official Exam Admin Excel
// ---------------------------------------------------------------------------
function ResultChecker({ batches, students }) {
  // ── state ──────────────────────────────────────────────────────────────────
  const [step, setStep]                   = useState(1);  // 1 | 2 | 3
  const [selectedBatch, setSelectedBatch] = useState("");
  const [systemResults, setSystemResults] = useState([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // excel upload
  const [fileName, setFileName]   = useState("");
  const [excelRows, setExcelRows] = useState([]);
  const [headers, setHeaders]     = useState([]);
  const [colUG, setColUG]         = useState("");
  const [colName, setColName]     = useState("");
  const [colMarks, setColMarks]   = useState("");
  const [colResult, setColResult] = useState("");

  // comparison output
  const [comparison, setComparison] = useState(null);
  const [filterMode, setFilterMode] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const studentMap = useMemo(
    () => Object.fromEntries(students.map((s) => [s.id, s])),
    [students]
  );

  // ── step 1 ─────────────────────────────────────────────────────────────────
  const loadSystemResults = async () => {
    if (!selectedBatch) return;
    setIsLoadingResults(true);
    try {
      const res  = await http.get(`results/?batch=${selectedBatch}`);
      const list = normalizeList(res.data);
      if (list.length === 0) toast.warning("No results found for this batch in the system.");
      setSystemResults(list);
      setStep(2);
    } catch {
      toast.error("Failed to load system results.");
    } finally {
      setIsLoadingResults(false);
    }
  };

  // ── step 2 ─────────────────────────────────────────────────────────────────
  const autoDetect = (hdrs) => {
    const lc   = hdrs.map((h) => h.toLowerCase());
    const find = (terms) => {
      const idx = lc.findIndex((h) => terms.some((t) => h.includes(t)));
      return idx >= 0 ? hdrs[idx] : "";
    };
    return {
      ug:     find(["ug", "reg", "roll", "regno", "student id"]),
      name:   find(["student name", "name", "candidate", "applicant"]),
      marks:  find(["marks", "score", "obtain", "total", "exam mark", "final"]),
      result: find(["result", "status", "pass", "fail"]),
    };
  };

  // Normalise a name for comparison: lowercase, sort tokens so "Smith John" == "John Smith"
  const normaliseName = (name) =>
    String(name || "").toLowerCase().trim().split(/\s+/).filter(Boolean).sort().join(" ");

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb  = XLSX.read(evt.target.result, { type: "array" });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        // Find first row with >1 non-empty cell (the header row)
        let hRow = 0;
        for (let i = 0; i < Math.min(raw.length, 10); i++) {
          if (raw[i].filter((c) => String(c).trim()).length > 1) { hRow = i; break; }
        }

        const hdrs = raw[hRow].map((h) => String(h || "").trim()).filter(Boolean);
        const rows = raw.slice(hRow + 1).filter((r) => r.some((c) => String(c).trim() !== ""));

        setHeaders(hdrs);
        setExcelRows(rows);
        const det = autoDetect(hdrs);
        setColUG(det.ug); setColName(det.name); setColMarks(det.marks); setColResult(det.result);
      } catch {
        toast.error("Failed to read Excel file. Please check the file format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── run comparison ─────────────────────────────────────────────────────────
  const runComparison = () => {
    if (!colUG) { toast.error("Please select the UG Number column."); return; }

    const ugIdx     = headers.indexOf(colUG);
    const nameIdx   = colName   ? headers.indexOf(colName)   : -1;
    const marksIdx  = colMarks  ? headers.indexOf(colMarks)  : -1;
    const resultIdx = colResult ? headers.indexOf(colResult) : -1;

    const normalizeUG = (v) => String(v || "").trim().toUpperCase().replace(/\s+/g, "");

    // build Excel map
    const xlMap = {};
    excelRows.forEach((row) => {
      const ug = normalizeUG(row[ugIdx]);
      if (!ug) return;
      const rawMarks  = marksIdx  >= 0 ? row[marksIdx]  : null;
      const rawResult = resultIdx >= 0 ? String(row[resultIdx] || "").trim().toUpperCase() : null;
      const rawName   = nameIdx   >= 0 ? String(row[nameIdx] || "").trim()                : null;
      xlMap[ug] = {
        xl_name:   rawName,
        xl_marks:  rawMarks !== null && rawMarks !== "" ? parseFloat(rawMarks) : null,
        xl_result: rawResult,
      };
    });

    // build system map
    const sysMap = {};
    systemResults.forEach((r) => {
      const student = studentMap[r.student];
      if (!student) return;
      const ug = normalizeUG(student.ug_number);
      if (!ug) return;
      sysMap[ug] = {
        student_name: r.student_name || student.name,
        sys_marks: r.final_exam,
        sys_pass:  r.is_pass,
      };
    });

    const rows = [];

    // ① every Excel record vs system
    Object.entries(xlMap).forEach(([ug, xl]) => {
      const sys = sysMap[ug];
      if (!sys) {
        rows.push({ ug, student_name: "—", status: "missing_sys",
          sys_marks: null, sys_pass: null, xl_marks: xl.xl_marks, xl_result: xl.xl_result,
          issues: ["Not found in system"] });
        return;
      }
      const issues = [];

      // Compare name (token-sort so "Smith John" == "John Smith")
      if (xl.xl_name && sys.student_name) {
        const sysNorm = normaliseName(sys.student_name);
        const xlNorm  = normaliseName(xl.xl_name);
        if (sysNorm !== xlNorm) {
          issues.push(`Name: system "${sys.student_name}" ≠ excel "${xl.xl_name}"`);
        }
      }

      // Compare marks (±0.5 tolerance for rounding)
      if (xl.xl_marks !== null && !isNaN(xl.xl_marks)) {
        if (Math.abs(xl.xl_marks - sys.sys_marks) > 0.5)
          issues.push(`Marks: system ${sys.sys_marks} ≠ excel ${xl.xl_marks}`);
      }

      // Compare pass/fail
      if (xl.xl_result) {
        const xlPass = ["PASS","P","PASSED","Y","YES"].includes(xl.xl_result);
        const xlFail = ["FAIL","F","FAILED","N","NO"].includes(xl.xl_result);
        if (xlPass && !sys.sys_pass) issues.push("Result: system FAIL ≠ excel PASS");
        else if (xlFail && sys.sys_pass) issues.push("Result: system PASS ≠ excel FAIL");
      }

      rows.push({ ug, student_name: sys.student_name, xl_name: xl.xl_name,
        status: issues.length > 0 ? "mismatch" : "matched",
        sys_marks: sys.sys_marks, sys_pass: sys.sys_pass,
        xl_marks: xl.xl_marks, xl_result: xl.xl_result, issues });
    });

    // ② system records absent from Excel
    Object.entries(sysMap).forEach(([ug, sys]) => {
      if (!xlMap[ug]) {
        rows.push({ ug, student_name: sys.student_name, status: "missing_xl",
          sys_marks: sys.sys_marks, sys_pass: sys.sys_pass,
          xl_marks: null, xl_result: null, issues: ["Not present in uploaded Excel"] });
      }
    });

    setComparison(rows);
    setFilterMode("all");
    setSearchTerm("");
    setStep(3);
  };

  // ── reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(1); setSelectedBatch(""); setSystemResults([]);
    setFileName(""); setExcelRows([]); setHeaders([]);
    setColUG(""); setColMarks(""); setColResult("");
    setComparison(null); setFilterMode("all"); setSearchTerm("");
  };

  // ── derived stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!comparison) return null;
    return {
      total:       comparison.length,
      matched:     comparison.filter((r) => r.status === "matched").length,
      mismatch:    comparison.filter((r) => r.status === "mismatch").length,
      missing_sys: comparison.filter((r) => r.status === "missing_sys").length,
      missing_xl:  comparison.filter((r) => r.status === "missing_xl").length,
    };
  }, [comparison]);

  const visibleRows = useMemo(() => {
    if (!comparison) return [];
    const q = searchTerm.trim().toLowerCase();
    return comparison.filter((r) => {
      if (filterMode !== "all" && r.status !== filterMode) return false;
      if (q) return r.ug.toLowerCase().includes(q) || r.student_name.toLowerCase().includes(q);
      return true;
    });
  }, [comparison, filterMode, searchTerm]);

  // ── helpers ────────────────────────────────────────────────────────────────
  const statusBadge = (status) => {
    const map = {
      matched:     ["bg-success",           "Matched"],
      mismatch:    ["bg-danger",            "Mismatch"],
      missing_sys: ["bg-warning text-dark", "Missing in System"],
      missing_xl:  ["bg-secondary",         "Not in Excel"],
    };
    const [cls, label] = map[status] || ["bg-light text-dark", status];
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  const rowClass = (s) => {
    if (s === "mismatch")    return "table-danger";
    if (s === "missing_sys") return "table-warning";
    if (s === "missing_xl")  return "table-light";
    return "";
  };

  const StepBar = () => (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      {[["1","Select Batch"],["2","Upload & Map"],["3","Comparison"]].map(([n, label], i) => {
        const num = parseInt(n); const active = step === num; const done = step > num;
        return (
          <div key={n} className="d-flex align-items-center gap-2">
            {i > 0 && <div style={{ width: 32, height: 2, background: done ? "#198754" : "#dee2e6" }} />}
            <div className="d-flex align-items-center gap-2">
              <div className="d-flex align-items-center justify-content-center rounded-circle fw-bold"
                style={{ width: 28, height: 28, fontSize: "0.8rem",
                  background: done ? "#198754" : active ? "#0d6efd" : "#dee2e6",
                  color: done || active ? "#fff" : "#6c757d" }}>
                {done ? "✓" : n}
              </div>
              <span className={`small fw-medium ${active ? "text-primary" : done ? "text-success" : "text-muted"}`}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const batchName = batches.find((b) => String(b.id) === selectedBatch)?.name || "";

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <StepBar />
        {step > 1 && (
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={reset}>
            ↩ Start Over
          </button>
        )}
      </div>

      {/* ── Step 1: Select Batch ──────────────────────────────────── */}
      {step === 1 && (
        <div className="row justify-content-center">
          <div className="col-lg-5">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h5 className="mb-1">Select Batch</h5>
                <p className="text-muted small mb-4">
                  Choose the batch whose results you want to validate against the official Exam Admin Excel.
                </p>
                <div className="mb-4">
                  <label className="form-label" htmlFor="rc-batch">Batch</label>
                  <select id="rc-batch" className="form-select form-select-lg"
                    value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                    <option value="">Choose a batch…</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <button type="button"
                  className="btn btn-primary btn-lg w-100 d-flex justify-content-center align-items-center gap-2"
                  onClick={loadSystemResults}
                  disabled={!selectedBatch || isLoadingResults}>
                  {isLoadingResults
                    ? <><span className="spinner-border spinner-border-sm" aria-hidden="true" /> Loading…</>
                    : "Load System Results →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Upload Excel & Map Columns ───────────────────── */}
      {step === 2 && (
        <div className="row g-4">
          {/* System results preview */}
          <div className="col-lg-4">
            <div className="card shadow-sm border-0 h-100">
              <div className="card-body p-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-primary rounded-pill" style={{ fontSize: "1rem" }}>
                    {systemResults.length}
                  </span>
                  <h6 className="mb-0">System Records</h6>
                </div>
                <p className="text-muted small mb-3">Batch: <strong>{batchName}</strong></p>
                <div className="border rounded p-2" style={{ maxHeight: 320, overflowY: "auto", fontSize: "0.78rem" }}>
                  {systemResults.length === 0
                    ? <p className="text-muted mb-0">No results found.</p>
                    : systemResults.map((r) => {
                        const s = studentMap[r.student];
                        return (
                          <div key={r.id} className="d-flex justify-content-between align-items-center py-1 border-bottom gap-2">
                            <span className="text-muted font-monospace" style={{ minWidth: 80 }}>{s?.ug_number || "—"}</span>
                            <span className="flex-grow-1">{r.student_name || s?.name || "—"}</span>
                            <span className={`badge ${r.is_pass ? "bg-success" : "bg-danger"}`}>
                              {r.is_pass ? "PASS" : "FAIL"}
                            </span>
                          </div>
                        );
                      })}
                </div>
              </div>
            </div>
          </div>

          {/* Upload + column mapping */}
          <div className="col-lg-8">
            <div className="card shadow-sm border-0">
              <div className="card-body p-4">
                <h5 className="mb-1">Upload Exam Admin Excel</h5>
                <p className="text-muted small mb-4">
                  Upload the official Excel sheet. The first sheet is used. Columns are auto-detected — review before running.
                </p>

                {/* Drop zone */}
                <label htmlFor="rc-file"
                  className="d-block rounded p-4 text-center mb-4"
                  style={{ border: "2px dashed #0d6efd", cursor: "pointer" }}>
                  <div style={{ fontSize: "2rem" }}>📂</div>
                  <div className="fw-medium text-primary">Click to upload Excel file</div>
                  <div className="text-muted small">.xlsx or .xls — first sheet used</div>
                  {fileName && (
                    <div className="mt-2">
                      <span className="badge bg-success">{fileName}</span>
                      <span className="ms-2 text-muted small">{excelRows.length} data rows detected</span>
                    </div>
                  )}
                </label>
                <input id="rc-file" type="file" accept=".xlsx,.xls"
                  className="visually-hidden" onChange={handleFileUpload} />

                {/* Column mapping */}
                {headers.length > 0 && (
                  <>
                    <div className="alert alert-info py-2 mb-3" style={{ fontSize: "0.85rem" }}>
                      <strong>Review column mapping below.</strong> UG Number is required. Marks and Result columns are compared.
                    </div>

                    <div className="row g-3 mb-4">
                      {[
                        { label: "UG Number column", req: true,  val: colUG,     set: setColUG,     icon: "🔑" },
                        { label: "Name column",       req: false, val: colName,   set: setColName,   icon: "👤" },
                        { label: "Marks column",      req: false, val: colMarks,  set: setColMarks,  icon: "📊" },
                        { label: "Result column",     req: false, val: colResult, set: setColResult, icon: "✅" },
                      ].map(({ label, req, val, set, icon }) => (
                        <div className="col-sm-4" key={label}>
                          <label className="form-label fw-medium">
                            {icon} {label} {req && <span className="text-danger">*</span>}
                          </label>
                          <select className="form-select" value={val} onChange={(e) => set(e.target.value)}>
                            <option value="">— not selected —</option>
                            {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>

                    {/* Preview */}
                    <div className="mb-4">
                      <p className="text-muted small mb-2">Preview — first 5 rows (mapped columns highlighted):</p>
                      <div className="table-responsive border rounded" style={{ maxHeight: 200, overflowY: "auto" }}>
                        <table className="table table-sm mb-0" style={{ fontSize: "0.78rem" }}>
                          <thead className="table-light sticky-top">
                            <tr>
                              {headers.map((h) => (
                                <th key={h} className={
                                  h === colUG ? "text-primary" : h === colName ? "text-info" : h === colMarks ? "text-success" : h === colResult ? "text-warning" : "text-muted"
                                }>
                                  {h}{h === colUG ? " 🔑" : h === colName ? " 👤" : h === colMarks ? " 📊" : h === colResult ? " ✅" : ""}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {excelRows.slice(0, 5).map((row, i) => (
                              <tr key={i}>
                                {headers.map((h, hi) => (
                                  <td key={hi}>{String(row[hi] ?? "")}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <button type="button" className="btn btn-success btn-lg" onClick={runComparison} disabled={!colUG}>
                      Run Comparison →
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Comparison Results ────────────────────────────── */}
      {step === 3 && comparison && stats && (
        <div>
          {/* Summary cards */}
          <div className="row g-3 mb-4">
            {[
              { label: "Total",             value: stats.total,       cls: "text-primary",  border: "border-primary"   },
              { label: "Matched",           value: stats.matched,     cls: "text-success",  border: "border-success"   },
              { label: "Mismatches",        value: stats.mismatch,    cls: "text-danger",   border: "border-danger"    },
              { label: "Missing in System", value: stats.missing_sys, cls: "text-warning",  border: "border-warning"   },
              { label: "Not in Excel",      value: stats.missing_xl,  cls: "text-secondary",border: "border-secondary" },
            ].map(({ label, value, cls, border }) => (
              <div className="col" key={label}>
                <div className={`card shadow-sm border-2 text-center p-3 ${border}`}>
                  <div className={`fw-bold fs-2 ${cls}`}>{value}</div>
                  <div className="text-muted small">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Alert banner */}
          {(stats.mismatch > 0 || stats.missing_sys > 0) ? (
            <div className="alert alert-danger d-flex gap-2 align-items-start mb-4">
              <span style={{ fontSize: "1.3rem" }}>⚠️</span>
              <div>
                <strong>Action required — </strong>
                {stats.mismatch > 0 && `${stats.mismatch} record(s) have marks or result discrepancies. `}
                {stats.missing_sys > 0 && `${stats.missing_sys} record(s) from the official Excel are missing in the system. `}
                Please review and correct the system data accordingly.
              </div>
            </div>
          ) : (
            <div className="alert alert-success d-flex gap-2 align-items-center mb-4">
              <span style={{ fontSize: "1.3rem" }}>✅</span>
              <div><strong>All clear!</strong> System data matches the official Exam Admin Excel for all compared records.</div>
            </div>
          )}

          {/* Filters */}
          <div className="card shadow-sm border-0 mb-3">
            <div className="card-body p-3">
              <div className="row g-3 align-items-center flex-wrap">
                <div className="col-auto">
                  <div className="btn-group btn-group-sm" role="group">
                    {[
                      ["all",        "All",                "secondary"],
                      ["mismatch",   "Mismatches",         "danger"   ],
                      ["missing_sys","Missing in System",  "warning"  ],
                      ["missing_xl", "Not in Excel",       "secondary"],
                      ["matched",    "Matched",            "success"  ],
                    ].map(([key, label, color]) => (
                      <button key={key} type="button"
                        className={`btn btn-${filterMode === key ? "" : "outline-"}${color}`}
                        onClick={() => setFilterMode(key)}>
                        {label}
                        {key !== "all" && (
                          <span className={`ms-1 badge ${filterMode === key ? "bg-white text-dark" : "bg-light text-dark"}`}
                            style={{ fontSize: "0.7rem" }}>
                            {key === "mismatch" ? stats.mismatch : key === "missing_sys" ? stats.missing_sys : key === "missing_xl" ? stats.missing_xl : stats.matched}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="col-sm-4">
                  <input type="search" className="form-control form-control-sm"
                    placeholder="Search UG Number or name…"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="col-auto ms-auto text-muted small">
                  {visibleRows.length} of {comparison.length} · Batch: <strong>{batchName}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" style={{ fontSize: "0.85rem" }}>
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>UG Number</th>
                      <th>System Name</th>
                      <th>Excel Name</th>
                      <th>System Marks<br /><span className="fw-normal text-muted small">/1000</span></th>
                      <th>Excel Marks<br /><span className="fw-normal text-muted small">/1000</span></th>
                      <th>System Result</th>
                      <th>Excel Result</th>
                      <th>Status</th>
                      <th>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.length === 0
                      ? <tr><td colSpan={9} className="text-center text-muted py-4">No records match the current filter.</td></tr>
                      : visibleRows.map((r, idx) => {
                          const marksDiffer = r.xl_marks !== null && r.sys_marks !== null && Math.abs(r.xl_marks - r.sys_marks) > 0.5;
                          return (
                            <tr key={r.ug} className={rowClass(r.status)}>
                              <td className="text-muted">{idx + 1}</td>
                              <td className="fw-medium font-monospace">{r.ug}</td>
                              <td>{r.student_name}</td>
                              <td>
                                {r.xl_name
                                  ? (() => {
                                      const nameDiffer = r.student_name && r.xl_name &&
                                        normaliseName(r.student_name) !== normaliseName(r.xl_name);
                                      return <span className={nameDiffer ? "text-danger fw-bold" : "text-muted"}>{r.xl_name}</span>;
                                    })()
                                  : <span className="text-muted">—</span>}
                              </td>
                              <td>
                                {r.sys_marks !== null
                                  ? <span className={marksDiffer ? "text-danger fw-bold" : ""}>{r.sys_marks}</span>
                                  : <span className="text-muted">—</span>}
                              </td>
                              <td>
                                {r.xl_marks !== null
                                  ? <span className={marksDiffer ? "text-danger fw-bold" : ""}>{r.xl_marks}</span>
                                  : <span className="text-muted">—</span>}
                              </td>
                              <td>
                                {r.sys_pass !== null
                                  ? <span className={`badge ${r.sys_pass ? "bg-success" : "bg-danger"}`}>{r.sys_pass ? "PASS" : "FAIL"}</span>
                                  : <span className="text-muted">—</span>}
                              </td>
                              <td>
                                {r.xl_result
                                  ? <span className="badge bg-secondary">{r.xl_result}</span>
                                  : <span className="text-muted">—</span>}
                              </td>
                              <td>{statusBadge(r.status)}</td>
                              <td>
                                {r.issues.length > 0
                                  ? <ul className="mb-0 ps-3" style={{ fontSize: "0.78rem" }}>
                                      {r.issues.map((iss, i) => <li key={i} className="text-danger fw-medium">{iss}</li>)}
                                    </ul>
                                  : <span className="text-success small">✓ Match</span>}
                              </td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Final Exam eligibility list (Manager + Trainer)
// ---------------------------------------------------------------------------
function FinalExamList({ batches, students }) {
  const role = getRole();
  return (
    <ResultsTable
      batches={batches}
      students={students}
      title="Final Exam — Student List"
      showForm={false}
      role={role}
    />
  );
}

// ---------------------------------------------------------------------------
// Main ResultsPage
// ---------------------------------------------------------------------------
function ResultsPage() {
  const role      = getRole();
  const canEdit   = role === "ADMIN" || role === "MANAGER";

  const [batches, setBatches]   = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState("marks");

  useEffect(() => {
    Promise.all([
      http.get("batches/"),
      http.get("students/?limit=1000"),
    ])
      .then(([bRes, sRes]) => {
        setBatches(normalizeList(bRes.data));
        setStudents(normalizeList(sRes.data));
      })
      .catch(() => {});
  }, []);

  const tabs = [
    { key: "marks",       label: "Student Marks" },
    { key: "final-exam",  label: "Final Exam List" },
    { key: "checker",     label: "Result Checker" },
  ];

  return (
    <>
      <PageHeader
        title="Results"
        description="Manage student marks, track Final Mock eligibility, and view Final Exam readiness."
      />

      <div className="row g-3 mb-4">
        <div className="col-sm-4 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3">
            <div className="text-muted small mb-1">Final Mock Pass</div>
            <div className="fw-bold fs-4 text-warning">≥ {FINAL_MOCK_PASS}%</div>
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>Eligibility for Final Exam</div>
          </div>
        </div>
        <div className="col-sm-4 col-md-3">
          <div className="card border-0 shadow-sm text-center p-3">
            <div className="text-muted small mb-1">Final Exam Pass</div>
            <div className="fw-bold fs-4 text-success">{FINAL_EXAM_PASS} / 1000</div>
            <div className="text-muted" style={{ fontSize: "0.75rem" }}>Certification eligibility</div>
          </div>
        </div>
      </div>

      <ul className="nav nav-tabs mb-4">
        {tabs.map((tab) => (
          <li className="nav-item" key={tab.key}>
            <button
              type="button"
              className={`nav-link${activeTab === tab.key ? " active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === "marks" && (
        <ResultsTable
          batches={batches}
          students={students}
          title="Student Results"
          showForm={canEdit}
          role={role}
        />
      )}
      {activeTab === "final-exam" && (
        <FinalExamList batches={batches} students={students} />
      )}
      {activeTab === "checker" && (
        <ResultChecker batches={batches} students={students} />
      )}
    </>
  );
}

export default ResultsPage;
