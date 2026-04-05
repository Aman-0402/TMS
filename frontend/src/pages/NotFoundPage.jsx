import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <div className="card shadow-sm border-0">
      <div className="card-body text-center py-5">
        <h1 className="display-6">Page not found</h1>
        <p className="text-secondary">The page you requested does not exist.</p>
        <Link to="/" className="btn btn-primary">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
