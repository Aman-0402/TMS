import PageHeader from "../components/common/PageHeader";

function ModulePage({ title, description }) {
  return (
    <>
      <PageHeader title={title} description={description} />

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <p className="mb-0 text-secondary">
            This page is ready for API integration, tables, forms, and filters.
          </p>
        </div>
      </div>
    </>
  );
}

export default ModulePage;
