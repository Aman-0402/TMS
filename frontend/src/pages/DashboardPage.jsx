import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

import http from "../api/http";
import { getRole } from "../utils/auth";
import PageHeader from "../components/common/PageHeader";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

function normalizeApiList(data) {
  return Array.isArray(data) ? data : data?.results || [];
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ title, value, tone, description, isLoading }) {
  return (
    <div className="card h-100 shadow-sm border-0">
      <div className="card-body">
        <div className={`text-${tone} text-uppercase small fw-semibold mb-2`}>{title}</div>
        <div className="display-6 fw-bold mb-2">{isLoading ? "—" : value}</div>
        <p className="text-secondary small mb-0">{description}</p>
      </div>
    </div>
  );
}

function DashboardPage() {
  const role = getRole();
  const showFull = role === "ADMIN" || role === "MANAGER";

  const [students, setStudents] = useState([]);
  const [batches,  setBatches]  = useState([]);
  const [results,  setResults]  = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [labs,     setLabs]     = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    const promises = [
      http.get("students/"),
      http.get("batches/"),
      http.get("results/"),
      http.get("labs/"),
    ];
    if (showFull) promises.push(http.get("trainers/"));

    Promise.all(promises)
      .then(([sRes, bRes, rRes, lRes, tRes]) => {
        setStudents(normalizeApiList(sRes.data));
        setBatches(normalizeApiList(bRes.data));
        setResults(normalizeApiList(rRes.data));
        setLabs(normalizeApiList(lRes.data));
        if (tRes) setTrainers(normalizeApiList(tRes.data));
      })
      .catch(() => setError("Unable to load dashboard data."))
      .finally(() => setIsLoading(false));
  }, [showFull]);

  // ── Pass/Fail ──────────────────────────────────────────────────────────
  const passCount = useMemo(() => results.filter((r) => r.is_pass).length, [results]);
  const failCount = useMemo(() => results.filter((r) => !r.is_pass).length, [results]);
  const eligibleCount = useMemo(() => results.filter((r) => r.is_final_mock_pass).length, [results]);

  const doughnutData = useMemo(() => ({
    labels: ["Pass", "Fail"],
    datasets: [{
      data: [passCount, failCount],
      backgroundColor: ["#198754", "#dc3545"],
      borderColor: ["#fff", "#fff"],
      borderWidth: 2,
    }],
  }), [passCount, failCount]);

  // ── Batch performance ──────────────────────────────────────────────────
  const batchPerf = useMemo(() => {
    const map = {};
    batches.forEach((b) => { map[b.id] = { name: b.name, pass: 0, fail: 0 }; });
    results.forEach((r) => {
      if (!map[r.batch]) return;
      if (r.is_pass) map[r.batch].pass++;
      else           map[r.batch].fail++;
    });
    return Object.values(map)
      .filter((b) => b.pass + b.fail > 0)
      .sort((a, b) => b.pass + b.fail - (a.pass + a.fail))
      .slice(0, 8);
  }, [batches, results]);

  const batchBarData = useMemo(() => ({
    labels: batchPerf.map((b) => b.name),
    datasets: [
      { label: "Pass", data: batchPerf.map((b) => b.pass), backgroundColor: "#198754" },
      { label: "Fail", data: batchPerf.map((b) => b.fail), backgroundColor: "#dc3545" },
    ],
  }), [batchPerf]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" } },
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  // ── Trainer performance ────────────────────────────────────────────────
  const trainerPerf = useMemo(() => {
    const studentLab = {};
    students.forEach((s) => { studentLab[s.id] = s.lab; });

    const labTrainer = {};
    labs.forEach((l) => {
      if (l.trainer) {
        labTrainer[l.id] = l.trainer_name || `Lab ${l.name}`;
      }
    });

    const map = {};
    results.forEach((r) => {
      const student = students.find((s) => s.id === r.student);
      if (!student) return;
      
      const labId = student.lab;
      const trainerName = labTrainer[labId] || `Lab ${labId || 'Unassigned'}`;
      
      if (!map[trainerName]) map[trainerName] = { pass: 0, fail: 0 };
      if (r.is_pass) map[trainerName].pass++;
      else           map[trainerName].fail++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.pass + v.fail }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [results, students, labs]);

  const summaryCards = [
    { title: "Total Students",  value: students.length, tone: "primary", description: "Students currently registered." },
    { title: "Total Batches",   value: batches.length,  tone: "success", description: "Active training batches." },
    { title: "Final Exam Pass", value: passCount,        tone: "info",    description: "Students who passed the Final Exam." },
    { title: "Mock Eligible",   value: eligibleCount,   tone: "warning", description: "Students who passed the Final Mock (≥70%)." },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Analytics overview — students, batches, results, and trainer performance."
      />

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Stat cards */}
      <div className="row g-4 mb-4">
        {summaryCards.map((card) => (
          <div className="col-md-6 col-xl-3" key={card.title}>
            <StatCard {...card} isLoading={isLoading} />
          </div>
        ))}
      </div>

      <div className="row g-4 mb-4">
        {/* Pass vs Fail donut */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">Final Exam — Pass vs Fail</h2>
              {isLoading ? <p className="text-secondary">Loading…</p> : (
                <div style={{ height: 280 }}>
                  <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Batch performance bar */}
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">Batch Performance</h2>
              {isLoading ? <p className="text-secondary">Loading…</p> : batchPerf.length === 0 ? (
                <p className="text-secondary small">No result data yet.</p>
              ) : (
                <div style={{ height: 280 }}>
                  <Bar data={batchBarData} options={barOptions} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Trainer performance table (Admin/Manager only) */}
      {showFull && (
        <div className="row g-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <h2 className="h5 mb-3">Trainer / Batch Performance</h2>
                {isLoading ? <p className="text-secondary">Loading…</p> : trainerPerf.length === 0 ? (
                  <p className="text-secondary small">No trainer result data yet.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Trainer / Batch</th>
                          <th>Total Students</th>
                          <th>Pass</th>
                          <th>Fail</th>
                          <th>Pass Rate</th>
                          <th style={{ width: 200 }}>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trainerPerf.map((t) => {
                          const rate = t.total > 0 ? Math.round((t.pass / t.total) * 100) : 0;
                          return (
                            <tr key={t.name}>
                              <td className="fw-medium">{t.name}</td>
                              <td>{t.total}</td>
                              <td className="text-success fw-semibold">{t.pass}</td>
                              <td className="text-danger fw-semibold">{t.fail}</td>
                              <td>
                                <span className={`badge bg-${rate >= 70 ? "success" : rate >= 40 ? "warning text-dark" : "danger"}`}>
                                  {rate}%
                                </span>
                              </td>
                              <td>
                                <div className="progress" style={{ height: 8 }}>
                                  <div
                                    className={`progress-bar bg-${rate >= 70 ? "success" : rate >= 40 ? "warning" : "danger"}`}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
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
        </div>
      )}
    </>
  );
}

export default DashboardPage;
