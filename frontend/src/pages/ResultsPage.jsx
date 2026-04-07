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
    </>
  );
}

export default ResultsPage;
