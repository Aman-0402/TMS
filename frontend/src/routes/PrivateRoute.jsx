import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

function PrivateRoute({ children, allowedRoles }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PrivateRoute;
