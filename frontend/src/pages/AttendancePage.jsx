import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

import http from "../api/http";
import { getRole } from "../utils/auth";
import PageHeader from "../components/common/PageHeader";

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present", badge: "success" },
  { value: "ABSENT",  label: "Absent",  badge: "danger" },
  { value: "LATE",    label: "Late",    badge: "warning" },
];

const SLOTS = [
  { value: "1", label: "Slot 1" },
  { value: "2", label: "Slot 2" },
  { value: "3", label: "Slot 3" },
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
// Manager: manage working days
// ---------------------------------------------------------------------------
function WorkingDaysManager({ batches }) {
  const [selectedBatch, setSelectedBatch] = useState("");
  const [workingDays, setWorkingDays]     = useState([]);
  const [newDate, setNewDate]             = useState("");
  const [isLoading, setIsLoading]         = useState(false);
  const [isAdding, setIsAdding]           = useState(false);

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

  useEffect(() => { loadWorkingDays(selectedBatch); }, [selectedBatch]);

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
              Select a batch and add dates that trainers can mark attendance for. Each day has 3 slots.
            </p>

            <div className="mb-3">
              <label className="form-label" htmlFor="wd-batch">Batch</label>
              <select
                id="wd-batch"
                className="form-select"
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                <option value="">Select batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {selectedBatch && (
              <form onSubmit={handleAddDay}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="wd-date">Date</label>
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
                <button type="submit" className="btn btn-primary w-100" disabled={isAdding}>
                  {isAdding ? (
                    <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Adding...</>
                  ) : "Add Working Day"}
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
            {!selectedBatch && <p className="text-secondary mb-0">Select a batch to view working days.</p>}
            {selectedBatch && isLoading && <p className="text-secondary mb-0">Loading...</p>}
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
                      <th>Slots</th>
                      <th className="text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workingDays.map((day, idx) => (
                      <tr key={day.id}>
                        <td className="text-muted">{idx + 1}</td>
                        <td>{formatDate(day.date)}</td>
                        <td>{new Date(day.date).toLocaleDateString("en-IN", { weekday: "long" })}</td>
                        <td>
                          <span className="badge bg-secondary">Slot 1</span>{" "}
                          <span className="badge bg-secondary">Slot 2</span>{" "}
                          <span className="badge bg-secondary">Slot 3</span>
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
// Manager: attendance report
// ---------------------------------------------------------------------------
function AttendanceReport({ batches }) {
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedLab, setSelectedLab] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [labs, setLabs] = useState([]);
  const [selectedDate, setSelectedDate]   = useState("");
  const [selectedSlot, setSelectedSlot]   = useState("1");
  const [workingDays, setWorkingDays]     = useState([]);
  const [records, setRecords]             = useState([]);
  const [isLoading, setIsLoading]         = useState(false);
  const [isExporting, setIsExporting]     = useState(false);

  const trainerOptions = useMemo(() => {
    const trainers = new Map();
    labs.forEach((lab) => {
      if (lab.trainer && !trainers.has(lab.trainer)) {
        trainers.set(lab.trainer, {
          id: lab.trainer,
          name: lab.trainer_name || `Trainer ${lab.trainer}`,
        });
      }
    });
    return Array.from(trainers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [labs]);

  useEffect(() => {
    if (!selectedBatch) { 
      setLabs([]); 
      setSelectedLab(""); 
      setSelectedTrainer("");
      setWorkingDays([]); 
      setSelectedDate(""); 
      setRecords([]); 
      return; 
    }
    // Load labs and working days
    Promise.all([
      http.get(`labs/?batch=${selectedBatch}`),
      http.get(`working-days/?batch=${selectedBatch}`)
    ]).then(([labsRes, wdRes]) => {
      setLabs(normalizeList(labsRes.data));
      setWorkingDays(normalizeList(wdRes.data));
    }).catch(() => {});
    setSelectedLab("");
    setSelectedTrainer("");
    setSelectedDate("");
    setRecords([]);
  }, [selectedBatch]);

  useEffect(() => {
    if (!selectedBatch || !selectedDate) { setRecords([]); return; }
    setIsLoading(true);
    let url = `student-attendance/?batch=${selectedBatch}&date=${selectedDate}&slot=${selectedSlot}`;
    if (selectedLab) {
      url += `&lab=${selectedLab}`;
    }
    if (selectedTrainer) {
      url += `&trainer=${selectedTrainer}`;
    }
    http.get(url)
      .then((res) => setRecords(normalizeList(res.data)))
      .catch(() => toast.error("Failed to load attendance."))
      .finally(() => setIsLoading(false));
  }, [selectedDate, selectedSlot, selectedBatch, selectedLab, selectedTrainer]);

  const summary = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  const handleExport = async () => {
    if (!selectedBatch) {
      toast.error("Select a batch before exporting attendance.");
      return;
    }

    setIsExporting(true);
    try {
      const response = await http.get("attendance/export/", {
        responseType: "blob",
        params: {
          batch: selectedBatch,
          ...(selectedLab ? { lab: selectedLab } : {}),
          ...(selectedTrainer ? { trainer: selectedTrainer } : {}),
          ...(selectedDate ? { date: selectedDate } : {}),
          ...(selectedSlot ? { slot: selectedSlot } : {}),
        },
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `attendance-${selectedBatch}-${selectedDate || "all"}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast.success("Attendance export downloaded.");
    } catch (error) {
      toast.error("Unable to export attendance.");
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="row g-4">
      <div className="col-12">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="row g-3 align-items-end">
              <div className="col-sm-3">
                <label className="form-label" htmlFor="rep-batch">Batch</label>
                <select id="rep-batch" className="form-select" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                  <option value="">Select batch</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="col-sm-3">
                <label className="form-label" htmlFor="rep-lab">Lab</label>
                <select id="rep-lab" className="form-select" value={selectedLab} onChange={(e) => setSelectedLab(e.target.value)} disabled={!selectedBatch || labs.length === 0}>
                  <option value="">All labs ({labs.length})</option>
                  {labs.map((lab) => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-3">
                <label className="form-label" htmlFor="rep-trainer">Trainer</label>
                <select
                  id="rep-trainer"
                  className="form-select"
                  value={selectedTrainer}
                  onChange={(e) => setSelectedTrainer(e.target.value)}
                  disabled={!selectedBatch || trainerOptions.length === 0}
                >
                  <option value="">All trainers</option>
                  {trainerOptions.map((trainer) => (
                    <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-sm-3">
                <label className="form-label" htmlFor="rep-date">Working Day</label>
                <select id="rep-date" className="form-select" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} disabled={!selectedBatch || workingDays.length === 0}>
                  <option value="">Select date</option>
                  {workingDays.map((d) => <option key={d.id} value={d.date}>{formatDate(d.date)}</option>)}
                </select>
              </div>
              <div className="col-sm-2">
                <label className="form-label" htmlFor="rep-slot">Slot</label>
                <select id="rep-slot" className="form-select" value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)} disabled={!selectedDate}>
                  {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="col-sm-1 d-flex align-items-end">
                <button
                  type="button"
                  className="btn btn-outline-success w-100"
                  onClick={handleExport}
                  disabled={isExporting || !selectedBatch}
                >
                  {isExporting ? "..." : "Export"}
                </button>
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
                  {formatDate(selectedDate)} — Slot {selectedSlot}
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
                <div className="alert alert-light mb-0">No attendance records for this slot.</div>
              )}
              {!isLoading && records.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr><th>#</th><th>Student</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {records.map((r, idx) => {
                        const opt = STATUS_OPTIONS.find((s) => s.value === r.status);
                        return (
                          <tr key={r.id}>
                            <td className="text-muted">{idx + 1}</td>
                            <td>{r.student_name}</td>
                            <td><span className={`badge bg-${opt?.badge || "secondary"}`}>{opt?.label || r.status}</span></td>
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
// Trainer: mark attendance per slot
// ---------------------------------------------------------------------------
function TrainerAttendanceMarker() {
  const [batches, setBatches]           = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [workingDays, setWorkingDays]   = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("1");
  const [students, setStudents]         = useState([]);
  const [statusMap, setStatusMap]       = useState({});
  const [isLoading, setIsLoading]       = useState(false);
  const [isSaving, setIsSaving]         = useState(false);

  useEffect(() => {
    http.get("batches/").then((res) => setBatches(normalizeList(res.data))).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedBatch) { setWorkingDays([]); setSelectedDate(""); return; }
    http.get(`working-days/?batch=${selectedBatch}`)
      .then((res) => setWorkingDays(normalizeList(res.data)))
      .catch(() => {});
    setSelectedDate("");
  }, [selectedBatch]);

  // Reload attendance whenever date or slot changes
  useEffect(() => {
    if (!selectedBatch || !selectedDate) { setStudents([]); setStatusMap({}); return; }
    setIsLoading(true);
    Promise.all([
      http.get(`students/?batch=${selectedBatch}`),
      http.get(`student-attendance/?batch=${selectedBatch}&date=${selectedDate}&slot=${selectedSlot}`),
    ])
      .then(([studRes, attRes]) => {
        const studentList = normalizeList(studRes.data);
        const attList     = normalizeList(attRes.data);
        const existingMap = {};
        attList.forEach((r) => { existingMap[r.student] = r.status; });
        const initial = {};
        studentList.forEach((s) => { initial[s.id] = existingMap[s.id] || "PRESENT"; });
        setStudents(studentList);
        setStatusMap(initial);
      })
      .catch(() => toast.error("Failed to load data."))
      .finally(() => setIsLoading(false));
  }, [selectedBatch, selectedDate, selectedSlot]);

  const handleStatusChange = (studentId, value) =>
    setStatusMap((prev) => ({ ...prev, [studentId]: value }));

  const handleMarkAll = (value) =>
    setStatusMap((prev) => {
      const updated = { ...prev };
      students.forEach((s) => { updated[s.id] = value; });
      return updated;
    });

  const handleSave = async () => {
    if (!selectedBatch || !selectedDate || students.length === 0) return;
    setIsSaving(true);
    try {
      await http.post("student-attendance/bulk-mark/", {
        batch: Number(selectedBatch),
        date: selectedDate,
        slot: selectedSlot,
        records: students.map((s) => ({ student: s.id, status: statusMap[s.id] || "PRESENT" })),
      });
      toast.success(`Attendance saved for ${SLOTS.find((s) => s.value === selectedSlot)?.label}.`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s.value] = Object.values(statusMap).filter((v) => v === s.value).length;
    return acc;
  }, {});

  return (
    <div className="row g-4">
      {/* Selectors */}
      <div className="col-12">
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="row g-3 align-items-end">
              <div className="col-sm-4">
                <label className="form-label" htmlFor="tr-batch">Your Batch</label>
                <select id="tr-batch" className="form-select" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                  <option value="">Select batch</option>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="col-sm-4">
                <label className="form-label" htmlFor="tr-date">Working Day</label>
                <select id="tr-date" className="form-select" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} disabled={!selectedBatch || workingDays.length === 0}>
                  <option value="">
                    {workingDays.length === 0 && selectedBatch ? "No working days set" : "Select date"}
                  </option>
                  {workingDays.map((d) => (
                    <option key={d.id} value={d.date}>
                      {formatDate(d.date)} — {new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-sm-4">
                <label className="form-label" htmlFor="tr-slot">Slot</label>
                <select id="tr-slot" className="form-select" value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)} disabled={!selectedDate}>
                  {SLOTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance table */}
      {selectedDate && (
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                <h2 className="h5 mb-0">
                  {formatDate(selectedDate)} — {SLOTS.find((s) => s.value === selectedSlot)?.label}
                </h2>
                {students.length > 0 && (
                  <div className="d-flex gap-2 flex-wrap align-items-center">
                    <span className="text-muted small">Mark all:</span>
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
                          <th>Slot 1</th>
                          <th>Slot 2</th>
                          <th>Slot 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student, idx) => (
                          <tr key={student.id}>
                            <td className="text-muted">{idx + 1}</td>
                            <td>{student.name}</td>
                            <td className="text-muted">{student.ug_number}</td>
                            {SLOTS.map((slot) => (
                              <td key={slot.value}>
                                {slot.value === selectedSlot ? (
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
                                ) : (
                                  <span className="text-muted small">—</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div className="d-flex gap-3">
                      {STATUS_OPTIONS.map((s) => (
                        <span key={s.value} className={`badge bg-${s.badge} fs-6`}>
                          {s.label}: {counts[s.value] || 0}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary px-4"
                      onClick={handleSave}
                      disabled={isSaving || students.length === 0}
                    >
                      {isSaving ? (
                        <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Saving...</>
                      ) : `Save ${SLOTS.find((s) => s.value === selectedSlot)?.label} Attendance`}
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
  const role      = getRole();
  const isManager = role === "ADMIN" || role === "MANAGER";
  const isTrainer = role === "TRAINER";

  const [batches, setBatches]     = useState([]);
  const [activeTab, setActiveTab] = useState("working-days");

  useEffect(() => {
    if (isManager) {
      http.get("batches/").then((res) => setBatches(normalizeList(res.data))).catch(() => {});
    }
  }, [isManager]);

  if (isTrainer) {
    return (
      <>
        <PageHeader title="Attendance" description="Mark student attendance per slot for working days in your batch." />
        <TrainerAttendanceMarker />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Attendance" description="Manage working days and review student attendance. Each working day has 3 class slots." />

      <ul className="nav nav-tabs mb-4">
        {[
          { key: "working-days", label: "Working Days" },
          { key: "report",       label: "Attendance Report" },
        ].map((tab) => (
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

      {activeTab === "working-days" && <WorkingDaysManager batches={batches} />}
      {activeTab === "report"       && <AttendanceReport   batches={batches} />}
    </>
  );
}

export default AttendancePage;
