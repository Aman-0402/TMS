import PageHeader from "../components/common/PageHeader";

const summaryCards = [
  { title: "Batches", description: "Manage training batches and schedules." },
  { title: "Students", description: "Track student profiles and assignments." },
  { title: "Attendance", description: "Monitor daily attendance records." },
  { title: "Results", description: "Review assessments and certification status." },
];

function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="This starter frontend is ready to connect with your Django REST APIs."
      />

      <div className="row g-4">
        {summaryCards.map((card) => (
          <div className="col-md-6 col-xl-3" key={card.title}>
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body">
                <h3 className="h5">{card.title}</h3>
                <p className="text-secondary mb-0">{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default DashboardPage;
