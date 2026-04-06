import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const FINAL_MOCK_PASS = 70;

function normalizeList(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

function TrainerMockResultsPage() {
  const [batches, setBatches]           = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [students, setStudents]         = useState([]);
  const [existingResults, setExistingResults] = useState({});
  const [scoreMap, setScoreMap]         = useState({});
  const [isLoading, setIsLoading]       = useState(false);
  const [isSaving, setIsSaving]         = useState(null); // student id being saved

  useEffect(() => {
    http.get("batches/").then((r) => setBatches(normalizeList(r.data))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBatch) { setStudents([]); setExistingResults({}); setScoreMap({}); return; }
    setIsLoading(true);
    Promise.all([
      http.get(`students/?batch=${selectedBatch}`),
      http.get(`results/?batch=${selectedBatch}`),
    ])
      .then(([sRes, rRes]) => {
        const studentList = normalizeList(sRes.data);
        const resultList  = normalizeList(rRes.data);

        const resMap = {};
        resultList.forEach((r) => { resMap[r.student] = r; });

        const scores = {};
        studentList.forEach((s) => {
          scores[s.id] = resMap[s.id]?.final_mock ?? 0;
        });

        setStudents(studentList);
        setExistingResults(resMap);
        setScoreMap(scores);
      })
      .catch(() => toast.error("Failed to load data."))
      .finally(() => setIsLoading(false));
  }, [selectedBatch]);

  const handleScoreChange = (studentId, value) => {
    const num = Math.min(100, Math.max(0, Number(value)));
    setScoreMap((prev) => ({ ...prev, [studentId]: num }));
  };

  const handleSave = async (student) => {
    const score = scoreMap[student.id];
    if (score < 0 || score > 100) {
      toast.error("Score must be 0–100.");
      return;
    }

    setIsSaving(student.id);
    try {
      const existing = existingResults[student.id];
      if (existing) {
        await http.patch(`results/${existing.id}/`, { final_mock: score });
        toast.success(`${student.name}: Final Mock updated.`);
      } else {
        await http.post("results/", {
          student: student.id,
          batch: Number(selectedBatch),
          mid_mock: 0,
          final_mock: score,
          final_exam: 0,
        });
        toast.success(`${student.name}: Final Mock saved.`);
      }
      // Refresh results
      const rRes = await http.get(`results/?batch=${selectedBatch}`);
      const resultList = normalizeList(rRes.data);
      const resMap = {};
      resultList.forEach((r) => { resMap[r.student] = r; });
      setExistingResults(resMap);
    } catch (err) {
      toast.error(err.response?.data?.final_mock?.[0] || err.response?.data?.error || "Save failed.");
    } finally {
      setIsSaving(null);
    }
  };

  const passCount = students.filter((s) => (scoreMap[s.id] ?? 0) >= FINAL_MOCK_PASS).length;
  const failCount = students.length - passCount;

  return (
    <>
      <PageHeader
        title="Mock Results"
        description="Enter Final Mock scores for your students. Students scoring ≥70 are eligible for the Final Exam."
      />

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-3">
          <div className="row g-3 align-items-end">
            <div className="col-sm-5">
              <label className="form-label mb-1" htmlFor="mr-batch">Batch</label>
              <select
                id="mr-batch"
                className="form-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">Select your batch</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            {students.length > 0 && (
              <div className="col-auto d-flex gap-3 align-items-center">
                <span className="badge bg-success fs-6">Pass (≥{FINAL_MOCK_PASS}): {passCount}</span>
                <span className="badge bg-danger fs-6">Fail: {failCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedBatch && isLoading && <p className="text-secondary">Loading...</p>}

      {selectedBatch && !isLoading && students.length === 0 && (
        <div className="alert alert-light">No students found in this batch.</div>
      )}

      {selectedBatch && !isLoading && students.length > 0 && (
        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>UG No.</th>
                    <th>
                      Final Mock
                      <span className="ms-1 badge bg-warning text-dark" style={{ fontSize: "0.7rem" }}>
                        Pass ≥ {FINAL_MOCK_PASS}
                      </span>
                    </th>
                    <th>Status</th>
                    <th className="text-end">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, idx) => {
                    const score    = scoreMap[student.id] ?? 0;
                    const isPass   = score >= FINAL_MOCK_PASS;
                    const saving   = isSaving === student.id;
                    return (
                      <tr key={student.id}>
                        <td className="text-muted">{idx + 1}</td>
                        <td className="fw-medium">{student.name}</td>
                        <td className="text-muted">{student.ug_number}</td>
                        <td style={{ width: 160 }}>
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              className="form-control"
                              value={score}
                              min={0}
                              max={100}
                              step={0.5}
                              onChange={(e) => handleScoreChange(student.id, e.target.value)}
                              disabled={saving}
                            />
                            <span className="input-group-text">/100</span>
                          </div>
                        </td>
                        <td>
                          {score > 0 || existingResults[student.id] ? (
                            <span className={`badge bg-${isPass ? "success" : "danger"}`}>
                              {isPass ? "PASS — Eligible" : "FAIL"}
                            </span>
                          ) : (
                            <span className="text-muted small">Not entered</span>
                          )}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleSave(student)}
                            disabled={saving}
                          >
                            {saving ? (
                              <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                            ) : "Save"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TrainerMockResultsPage;
