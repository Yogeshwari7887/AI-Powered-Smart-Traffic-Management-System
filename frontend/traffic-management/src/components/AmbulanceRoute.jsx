import { Navigate } from "react-router-dom";

function AmbulanceRoute({ children }) {
  const token = localStorage.getItem("ambulance_token");

  if (!token) {
    return <Navigate to="/ambulance-login" replace />;
  }

  return children;
}

export default AmbulanceRoute;