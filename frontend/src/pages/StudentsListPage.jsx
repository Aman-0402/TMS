import { useEffect, useMemo, useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function StudentsListPage() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setError("");

      try {
        const [studentsResponse, batchesResponse] = await Promise.all([
          http.get("students/"),
          http.get("batches/"),
        ]);

        setStudents(normalizeApiList(studentsResponse.data));
        setBatches(normalizeApiList(batchesResponse.data));
      } catch (requestError) {
        setError("Unable to load students. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return students.filter((student) => {
      const matchesBatch =
        !selectedBatch || String(student.batch) === selectedBatch;
      const matchesSearch =
        !normalizedSearch ||
        student.ug_number?.toLowerCase().includes(normalizedSearch) ||
        student.name?.toLowerCase().includes(normalizedSearch) ||
        student.department?.toLowerCase().includes(normalizedSearch) ||
        student.batch_name?.toLowerCase().includes(normalizedSearch) ||
        student.lab_name?.toLowerCase().includes(normalizedSearch);

      return matchesBatch && matchesSearch;
    });
  }, [searchTerm, selectedBatch, students]);

  return (
    <>
      <PageHeader
        title="Student Directory"
        description="Browse the full student list with search and batch filtering."
      />

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-3 align-items-end mb-4">
            <div className="col-md-7">
              <label className="form-label fw-semibold" htmlFor="student-search">
                Search Students
              </label>
              <input
                id="student-search"
                type="search"
                className="form-control"
                placeholder="Search by UG number, name, department, batch, or lab"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="col-md-5">
              <label className="form-label fw-semibold" htmlFor="student-batch-filter">
                Filter by Batch
              </label>
              <select
                id="student-batch-filter"
                className="form-select"
                value={selectedBatch}
                onChange={(event) => setSelectedBatch(event.target.value)}
              >
                <option value="">All batches</option>
                {batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="d-flex justify-content-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading students...</span>
              </div>
            </div>
          ) : null}

          {!isLoading && error ? (
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          ) : null}

          {!isLoading && !error && filteredStudents.length === 0 ? (
            <div className="alert alert-light mb-0" role="alert">
              No students found.
            </div>
          ) : null}

          {!isLoading && !error && filteredStudents.length > 0 ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="text-muted small">
                  Showing {filteredStudents.length} student{filteredStudents.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">UG Number</th>
                      <th scope="col">Name</th>
                      <th scope="col">Department</th>
                      <th scope="col">Email</th>
                      <th scope="col">Phone</th>
                      <th scope="col">Batch</th>
                      <th scope="col">Lab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => (
                      <tr key={student.id}>
                        <td className="fw-semibold">{student.ug_number}</td>
                        <td>{student.name}</td>
                        <td>{student.department}</td>
                        <td>{student.email || "-"}</td>
                        <td>{student.phone || "-"}</td>
                        <td>{student.batch_name || "-"}</td>
                        <td>{student.lab_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default StudentsListPage;
