import { useEffect, useMemo, useState } from "react";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

function normalizeApiList(responseData) {
  return Array.isArray(responseData) ? responseData : responseData.results || [];
}

function StudentsListPage() {
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [labs, setLabs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedLab, setSelectedLab] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [sortField, setSortField] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");

  const trainerOptions = useMemo(() => {
    const trainersById = new Map();
    students.forEach((student) => {
      if (student.trainer_id && !trainersById.has(student.trainer_id)) {
        trainersById.set(student.trainer_id, {
          id: student.trainer_id,
          name: student.trainer_name || `Trainer ${student.trainer_id}`,
        });
      }
    });

    return Array.from(trainersById.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [students]);

  useEffect(() => {
    const loadData = async () => {
      setError("");

      try {
        const [studentsResponse, batchesResponse, labsResponse] = await Promise.all([
          http.get("students/"),
          http.get("batches/"),
          http.get("labs/"),
        ]);

        setStudents(normalizeApiList(studentsResponse.data));
        setBatches(normalizeApiList(batchesResponse.data));
        setLabs(normalizeApiList(labsResponse.data));
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

    let filtered = students.filter((student) => {
      const matchesBatch =
        !selectedBatch || String(student.batch) === selectedBatch;
      const matchesLab =
        !selectedLab || String(student.lab) === selectedLab;
      const matchesTrainer =
        !selectedTrainer || String(student.trainer_id) === selectedTrainer;
      const matchesSearch =
        !normalizedSearch ||
        student.ug_number?.toLowerCase().includes(normalizedSearch) ||
        student.name?.toLowerCase().includes(normalizedSearch) ||
        student.department?.toLowerCase().includes(normalizedSearch) ||
        student.batch_name?.toLowerCase().includes(normalizedSearch) ||
        student.lab_name?.toLowerCase().includes(normalizedSearch) ||
        student.trainer_name?.toLowerCase().includes(normalizedSearch);

      return matchesBatch && matchesLab && matchesTrainer && matchesSearch;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue = a[sortField] || "";
      let bValue = b[sortField] || "";

      // Handle special cases for sorting
      if (sortField === "batch_name") {
        aValue = a.batch_name || "";
        bValue = b.batch_name || "";
      } else if (sortField === "lab_name") {
        aValue = a.lab_name || "";
        bValue = b.lab_name || "";
      }

      // Convert to lowercase for case-insensitive sorting
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (sortDirection === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    return filtered;
  }, [searchTerm, selectedBatch, selectedLab, selectedTrainer, sortField, sortDirection, students]);

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <>
      <PageHeader
        title="Student Directory"
        description="Browse the full student list with search and batch filtering."
      />

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-3 align-items-end mb-4">
            <div className="col-md-4">
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

            <div className="col-md-3">
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

            <div className="col-md-3">
              <label className="form-label fw-semibold" htmlFor="student-lab-filter">
                Filter by Lab
              </label>
              <select
                id="student-lab-filter"
                className="form-select"
                value={selectedLab}
                onChange={(event) => setSelectedLab(event.target.value)}
              >
                <option value="">All labs</option>
                {labs.map((lab) => (
                  <option key={lab.id} value={lab.id}>
                    {lab.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-2">
              <label className="form-label fw-semibold" htmlFor="student-trainer-filter">
                Trainer
              </label>
              <select
                id="student-trainer-filter"
                className="form-select"
                value={selectedTrainer}
                onChange={(event) => setSelectedTrainer(event.target.value)}
              >
                <option value="">All trainers</option>
                {trainerOptions.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-md-12 col-xl-2">
              <label className="form-label fw-semibold" htmlFor="student-sort">
                Sort by
              </label>
              <select
                id="student-sort"
                className="form-select"
                value={`${sortField}-${sortDirection}`}
                onChange={(event) => {
                  const [field, direction] = event.target.value.split('-');
                  setSortField(field);
                  setSortDirection(direction);
                }}
              >
                <option value="name-asc">Name ↑</option>
                <option value="name-desc">Name ↓</option>
                <option value="ug_number-asc">UG Number ↑</option>
                <option value="ug_number-desc">UG Number ↓</option>
                <option value="department-asc">Department ↑</option>
                <option value="department-desc">Department ↓</option>
                <option value="batch_name-asc">Batch ↑</option>
                <option value="batch_name-desc">Batch ↓</option>
                <option value="lab_name-asc">Lab ↑</option>
                <option value="lab_name-desc">Lab ↓</option>
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
                      <th scope="col" style={{ width: '60px' }}>S. No</th>
                      <th scope="col" className="sortable" onClick={() => handleSort('ug_number')} style={{ cursor: 'pointer' }}>
                        UG Number {sortField === 'ug_number' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="sortable" onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                        Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="sortable" onClick={() => handleSort('department')} style={{ cursor: 'pointer' }}>
                        Department {sortField === 'department' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col">Email</th>
                      <th scope="col">Phone</th>
                      <th scope="col" className="sortable" onClick={() => handleSort('batch_name')} style={{ cursor: 'pointer' }}>
                        Batch {sortField === 'batch_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" className="sortable" onClick={() => handleSort('lab_name')} style={{ cursor: 'pointer' }}>
                        Lab {sortField === 'lab_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col">Trainer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, index) => (
                      <tr key={student.id}>
                        <td className="text-muted fw-semibold">{index + 1}</td>
                        <td className="fw-semibold">{student.ug_number}</td>
                        <td>{student.name}</td>
                        <td>{student.department}</td>
                        <td>{student.email || "-"}</td>
                        <td>{student.phone || "-"}</td>
                        <td>{student.batch_name || "-"}</td>
                        <td>{student.lab_name || "-"}</td>
                        <td>{student.trainer_name || "-"}</td>
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
