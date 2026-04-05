import { useEffect, useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const response = await http.get("batches/");
        const batchData = Array.isArray(response.data)
          ? response.data
          : response.data.results || [];

        setBatches(batchData);
      } catch (fetchError) {
        setError("Unable to load batches. Please check the backend server.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatches();
  }, []);

  return (
    <>
      <PageHeader
        title="Batches"
        description="View batch schedule details from the Django backend."
      />

      <div className="card shadow-sm border-0">
        <div className="card-body">
          {isLoading ? (
            <p className="mb-0 text-secondary">Loading batches...</p>
          ) : null}

          {!isLoading && error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && batches.length === 0 ? (
            <div className="alert alert-light mb-0" role="alert">
              No batches found.
            </div>
          ) : null}

          {!isLoading && !error && batches.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Start Date</th>
                    <th scope="col">End Date</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>{batch.name}</td>
                      <td>{formatDate(batch.start_date)}</td>
                      <td>{formatDate(batch.end_date)}</td>
                      <td>
                        <span className="badge text-bg-primary">{batch.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default BatchesPage;
