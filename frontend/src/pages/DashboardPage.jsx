import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

ChartJS.register(ArcElement, Tooltip, Legend);

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function DashboardPage() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setError("");

      try {
        const [studentsResponse, batchesResponse, resultsResponse] = await Promise.all([
          http.get("students/"),
          http.get("batches/"),
          http.get("results/"),
        ]);

        setStudents(normalizeApiList(studentsResponse.data));
        setBatches(normalizeApiList(batchesResponse.data));
        setResults(normalizeApiList(resultsResponse.data));
      } catch (fetchError) {
        setError("Unable to load dashboard analytics. Please check the backend server.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const passCount = useMemo(
    () => results.filter((result) => result.is_pass).length,
    [results]
  );
  const failCount = useMemo(
    () => results.filter((result) => !result.is_pass).length,
    [results]
  );

  const chartData = useMemo(
    () => ({
      labels: ["Pass", "Fail"],
      datasets: [
        {
          data: [passCount, failCount],
          backgroundColor: ["#198754", "#dc3545"],
          borderColor: ["#ffffff", "#ffffff"],
          borderWidth: 2,
        },
      ],
    }),
    [passCount, failCount]
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  const summaryCards = [
    {
      title: "Total Students",
      value: students.length,
      tone: "primary",
      description: "Students currently registered in the system.",
    },
    {
      title: "Total Batches",
      value: batches.length,
      tone: "success",
      description: "Training batches available for management.",
    },
    {
      title: "Pass Count",
      value: passCount,
      tone: "info",
      description: "Students currently marked as passed.",
    },
    {
      title: "Fail Count",
      value: failCount,
      tone: "danger",
      description: "Students currently marked as failed.",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="View key analytics for students, batches, and overall result performance."
      />

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <div className="row g-4 mb-4">
        {summaryCards.map((card) => (
          <div className="col-md-6 col-xl-3" key={card.title}>
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body">
                <div className={`text-${card.tone} text-uppercase small fw-semibold mb-2`}>
                  {card.title}
                </div>
                <div className="display-6 fw-bold mb-2">
                  {isLoading ? "-" : card.value}
                </div>
                <p className="text-secondary mb-0">{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">Overview</h2>
              <p className="text-secondary mb-4">
                This dashboard gives a quick snapshot of student volume, batch count,
                and outcome distribution across available results.
              </p>

              <div className="row g-3">
                <div className="col-md-6">
                  <div className="p-3 rounded bg-light border h-100">
                    <div className="text-muted small mb-2">Students</div>
                    <div className="h3 mb-1">{isLoading ? "-" : students.length}</div>
                    <div className="text-secondary small">Active learner records in TMS.</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="p-3 rounded bg-light border h-100">
                    <div className="text-muted small mb-2">Batches</div>
                    <div className="h3 mb-1">{isLoading ? "-" : batches.length}</div>
                    <div className="text-secondary small">Training groups currently tracked.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-body">
              <h2 className="h5 mb-3">Pass vs Fail</h2>
              <div style={{ height: "320px" }}>
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardPage;
