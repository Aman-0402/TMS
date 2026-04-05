import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

import http from "../api/http";
import { getRole } from "../utils/auth";
import PageHeader from "../components/common/PageHeader";

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present", badge: "success" },
  { value: "ABSENT", label: "Absent", badge: "danger" },
  { value: "LATE", label: "Late", badge: "warning" },
];

function normalizeList(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Manager sub-view: manage working days
// ---------------------------------------------------------------------------
function WorkingDaysManager({ batches }) {
  const [selectedBatch, setSelectedBatch] = useState("");
  const [workingDays, setWorkingDays] = useState([]);
  const [newDate, setNewDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const loadWorkingDays = async (batchId) => {
    if (!batchId) return;
    setIsLoading(true);
    try {
      const res = await http.get(`working-days/?batch=${batchId}`);
      setWorkingDays(normalizeList(res.data));
    } catch {
      toast.error("Failed to load working days.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkingDays(selectedBatch);
  }, [selectedBatch]);

  const handleAddDay = async (e) => {
    e.preventDefault();
    if (!newDate || !selectedBatch) return;
    setIsAdding(true);
    try {
      await http.post("working-days/", { batch: Number(selectedBatch), date: newDate });
      toast.success("Working day added.");
      setNewDate("");
      loadWorkingDays(selectedBatch);
    } catch (err) {
      const msg =
        err.response?.data?.date?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.error ||
        "Failed to add working day.";
      toast.error(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveDay = async (day) => {
    const result = await Swal.fire({
      title: "Remove working day?",
      text: `Remove ${formatDate(day.date)} from working days?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "Remove",
    });
    if (!result.isConfirmed) return;

    try {
      await http.delete(`working-days/${day.id}/`);
      toast.success("Working day removed.");
      loadWorkingDays(selectedBatch);
    } catch {
      toast.error("Failed to remove working day.");
    }
  };

  const batch = batches.find((b) => String(b.id) === String(selectedBatch));

  return (
    <div className="row g-4">
      <div className="col-lg-4">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <h2 className="h5 mb-3">Add Working Day</h2>
            <p className="text-secondary mb-4 small">
              Select a batch and add dates that trainers can mark attendance for.
            </p>

            <div className="mb-3">
              <label className="form-label" htmlFor="wd-batch">
                Batch
              </label>
              <select
                id="wd-batch"
                className="form-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">Select batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBatch && (
              <form onSubmit={handleAddDay}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="wd-date">
                    Date
                  </label>
                  <input
                    id="wd-date"
                    type="date"
                    className="form-control"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={batch?.start_date}
                    max={batch?.end_date}
                    required
                  />
                  {batch && (
                    <div className="form-text">
                      Batch range: {formatDate(batch.start_date)} – {formatDate(batch.end_date)}
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                      Adding...
                    </>
                  ) : (
                    "Add Working Day"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-8">
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h2 className="h5 mb-3">Working Days</h2>

            {!selectedBatch && (
              <p className="text-secondary mb-0">Select a batch to view working days.</p>
            )}

            {selectedBatch && isLoading && (
              <p className="text-secondary mb-0">Loading...</p>
            )}

            {selectedBatch && !isLoading && workingDays.length === 0 && (
              <div className="alert alert-light mb-0">No working days added yet.</div>
            )}

            {selectedBatch && !isLoading && workingDays.length > 0 && (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Day</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingDays.map((day, idx) => (
                      <tr key={day.id}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>{formatDate(day.date)}</td>
                        <td>
                          {new Date(day.date).toLocaleDateString("en-IN", { weekday: "long" })}
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleRemoveDay(day)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
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
// Manager sub-view: view attendance report
// ---------------------------------------------------------------------------
function AttendanceReport({ batches }) {
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [workingDays, setWorkingDays] = useState([]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadWorkingDays = async (batchId) => {
    if (!batchId) return;
    try {
      const res = await http.get(`working-days/?batch=${batchId}`);
      setWorkingDays(normalizeList(res.data));
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    loadWorkingDays(selectedBatch);
    setSelectedDate("");
    setRecords([]);
  }, [selectedBatch]);

  const loadAttendance = async () => {
    if (!selectedBatch || !selectedDate) return;
    setIsLoading(true);
    try {
      const res = await http.get(
        `student-attendance/?batch=${selectedBatch}&date=${selectedDate}`
      );
      setRecords(normalizeList(res.data));
    } catch {
      toast.error("Failed to load attendance.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedDate]);

  const summary = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="row g-3 align-items-end">
              <div className="col-sm-5">
                <label className="form-label" htmlFor="rep-batch">
                  Batch
                </label>
                <select
                  id="rep-batch"
                  className="form-select"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                >
                  <option value="">Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-sm-5">
                <label className="form-label" htmlFor="rep-date">
                  Working Day
                </label>
                <select
                  id="rep-date"
                  className="form-select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={!selectedBatch || workingDays.length === 0}
                >
                  <option value="">Select date</option>
                  {workingDays.map((d) => (
                    <option key={d.id} value={d.date}>
                      {formatDate(d.date)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h2 className="h5 mb-0">
                  Attendance — {formatDate(selectedDate)}
                </h2>
                {records.length > 0 && (
                  <div className="d-flex gap-2">
                    {STATUS_OPTIONS.map((s) => (
                      <span key={s.value} className={`badge bg-${s.badge}`}>
                        {s.label}: {summary[s.value] || 0}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {isLoading && <p className="text-secondary">Loading...</p>}

              {!isLoading && records.length === 0 && (
                <div className="alert alert-light mb-0">
                  No attendance records for this date.
                </div>
              )}

              {!isLoading && records.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, idx) => {
                        const opt = STATUS_OPTIONS.find((s) => s.value === r.status);
                        return (
                          <tr key={r.id}>
                            <td className="text-muted">{idx + 1}</td>
                            <td>{r.student_name}</td>
                            <td>
                              <span className={`badge bg-${opt?.badge || "secondary"}`}>
                                {opt?.label || r.status}
                              </span>
                            </td>
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
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trainer sub-view: mark attendance
// ---------------------------------------------------------------------------
function TrainerAttendanceMarker() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [workingDays, setWorkingDays] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [students, setStudents] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [existingMap, setExistingMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    http.get("batches/").then((res) => setBatches(normalizeList(res.data))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBatch) {
      setWorkingDays([]);
      setSelectedDate("");
      return;
    }
    http
      .get(`working-days/?batch=${selectedBatch}`)
      .then((res) => setWorkingDays(normalizeList(res.data)))
      .catch(() => {});
    setSelectedDate("");
  }, [selectedBatch]);

  useEffect(() => {
    if (!selectedBatch || !selectedDate) {
      setStudents([]);
      setStatusMap({});
      return;
    }
    setIsLoading(true);

    Promise.all([
      http.get(`students/?batch=${selectedBatch}`),
      http.get(`student-attendance/?batch=${selectedBatch}&date=${selectedDate}`),
    ])
      .then(([studRes, attRes]) => {
        const studentList = normalizeList(studRes.data);
        const attList = normalizeList(attRes.data);

        const existing = {};
        attList.forEach((r) => {
          existing[r.student] = { id: r.id, status: r.status };
        });

        const initialMap = {};
        studentList.forEach((s) => {
          initialMap[s.id] = existing[s.id]?.status || "PRESENT";
        });

        setStudents(studentList);
        setExistingMap(existing);
        setStatusMap(initialMap);
      })
      .catch(() => toast.error("Failed to load students or attendance."))
      .finally(() => setIsLoading(false));
  }, [selectedBatch, selectedDate]);

  const handleStatusChange = (studentId, value) => {
    setStatusMap((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleMarkAll = (value) => {
    setStatusMap((prev) => {
      const updated = { ...prev };
      students.forEach((s) => {
        updated[s.id] = value;
      });
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedBatch || !selectedDate || students.length === 0) return;

    setIsSaving(true);
    try {
      const records = students.map((s) => ({
        student: s.id,
        status: statusMap[s.id] || "PRESENT",
      }));

      await http.post("student-attendance/bulk-mark/", {
        batch: Number(selectedBatch),
        date: selectedDate,
        records,
      });

      toast.success("Attendance saved successfully.");
      // reload to show updated state
      const attRes = await http.get(
        `student-attendance/?batch=${selectedBatch}&date=${selectedDate}`
      );
      const attList = normalizeList(attRes.data);
      const updated = {};
      attList.forEach((r) => {
        updated[r.student] = { id: r.id, status: r.status };
      });
      setExistingMap(updated);
    } catch (err) {
      toast.error(
        err.response?.data?.error || "Failed to save attendance."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Object.values(statusMap).filter((v) => v === "PRESENT").length;
  const absentCount = Object.values(statusMap).filter((v) => v === "ABSENT").length;
  const lateCount = Object.values(statusMap).filter((v) => v === "LATE").length;

  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="row g-3 align-items-end">
              <div className="col-sm-5">
                <label className="form-label" htmlFor="tr-batch">
                  Your Batch
                </label>
                <select
                  id="tr-batch"
                  className="form-select"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                >
                  <option value="">Select batch</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-sm-5">
                <label className="form-label" htmlFor="tr-date">
                  Working Day
                </label>
                <select
                  id="tr-date"
                  className="form-select"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={!selectedBatch || workingDays.length === 0}
                >
                  <option value="">
                    {workingDays.length === 0 && selectedBatch
                      ? "No working days set"
                      : "Select date"}
                  </option>
                  {workingDays.map((d) => (
                    <option key={d.id} value={d.date}>
                      {formatDate(d.date)} —{" "}
                      {new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedDate && (
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <h2 className="h5 mb-0">
                  Mark Attendance — {formatDate(selectedDate)}
                </h2>

                {students.length > 0 && (
                  <div className="d-flex gap-2 flex-wrap">
                    <span className="text-muted small align-self-center">Mark all:</span>
                    {STATUS_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        className={`btn btn-sm btn-outline-${s.badge}`}
                        onClick={() => handleMarkAll(s.value)}
                        disabled={isSaving}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {isLoading && <p className="text-secondary">Loading students...</p>}

              {!isLoading && students.length === 0 && (
                <div className="alert alert-light mb-0">No students found in this batch.</div>
              )}

              {!isLoading && students.length > 0 && (
                <>
                  <div className="table-responsive mb-3">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>Student</th>
                          <th>UG No.</th>
                          <th>Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => (
                          <tr key={student.id}>
                            <td className="text-muted">{idx + 1}</td>
                            <td>{student.name}</td>
                            <td className="text-muted">{student.ug_number}</td>
                            <td>
                              <div className="d-flex gap-2">
                                {STATUS_OPTIONS.map((opt) => (
                                  <div className="form-check form-check-inline mb-0" key={opt.value}>
                                    <input
                                      className="form-check-input"
                                      type="radio"
                                      id={`att-${student.id}-${opt.value}`}
                                      name={`att-${student.id}`}
                                      value={opt.value}
                                      checked={statusMap[student.id] === opt.value}
                                      onChange={() => handleStatusChange(student.id, opt.value)}
                                      disabled={isSaving}
                                    />
                                    <label
                                      className="form-check-label"
                                      htmlFor={`att-${student.id}-${opt.value}`}
                                    >
                                      <span className={`text-${opt.badge}`}>{opt.label}</span>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div className="d-flex gap-3">
                      <span className="badge bg-success fs-6">Present: {presentCount}</span>
                      <span className="badge bg-warning text-dark fs-6">Late: {lateCount}</span>
                      <span className="badge bg-danger fs-6">Absent: {absentCount}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary px-4"
                      onClick={handleSave}
                      disabled={isSaving || students.length === 0}
                    >
                      {isSaving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
                          Saving...
                        </>
                      ) : (
                        "Save Attendance"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function AttendancePage() {
  const role = getRole();
  const isManager = role === "ADMIN" || role === "MANAGER";
  const isTrainer = role === "TRAINER";

  const [batches, setBatches] = useState([]);
  const [activeTab, setActiveTab] = useState("working-days");

  useEffect(() => {
    if (isManager) {
      http
        .get("batches/")
        .then((res) => setBatches(normalizeList(res.data)))
        .catch(() => {});
    }
  }, [isManager]);

  if (isTrainer) {
    return (
      <>
        <PageHeader
          title="Attendance"
          description="Mark student attendance for working days in your batch."
        />
        <TrainerAttendanceMarker />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Manage working days and review student attendance records."
      />

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${activeTab === "working-days" ? " active" : ""}`}
            onClick={() => setActiveTab("working-days")}
          >
            Working Days
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link${activeTab === "report" ? " active" : ""}`}
            onClick={() => setActiveTab("report")}
          >
            Attendance Report
          </button>
        </li>
      </ul>

      {activeTab === "working-days" && <WorkingDaysManager batches={batches} />}
      {activeTab === "report" && <AttendanceReport batches={batches} />}
    </>
  );
}

export default AttendancePage;
