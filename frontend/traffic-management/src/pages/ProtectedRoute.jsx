import { Navigate } from "react-router-dom";

/*
  Protects ambulance emergency routes.
  Allows access ONLY if ambulance is logged in.
*/

export default function ProtectedRoute({ children }) {
  const ambulance = localStorage.getItem("ambulance");

  if (!ambulance) {
    return <Navigate to="/ambulance-login" replace />;
  }

  return children;
}
