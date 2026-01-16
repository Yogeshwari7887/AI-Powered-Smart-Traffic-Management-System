import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  const ambulanceToken = localStorage.getItem("ambulance_token");
  const ambulanceData = JSON.parse(localStorage.getItem("ambulance_data") || "{}");

  const handleLogout = () => {
    if (isAuthenticated) {
      localStorage.removeItem("isAuthenticated");
      navigate("/login");
    } else if (ambulanceToken) {
      localStorage.removeItem("ambulance_token");
      localStorage.removeItem("ambulance_data");
      navigate("/ambulance-login");
    }
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getUserType = () => {
    if (isAuthenticated) return "admin";
    if (ambulanceToken) return "ambulance";
    return "guest";
  };

  const userType = getUserType();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to={userType === "admin" ? "/home" : userType === "ambulance" ? "/ambulance-dashboard" : "/"} className="navbar-logo">
          <div className="logo-icon">🚦</div>
          <div className="logo-text">
            <span className="logo-title">SMART TRAFFIC</span>
            <span className="logo-subtitle">Control System</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="nav-links">
          {userType === "admin" ? (
            <>
              <Link to="/home" className={`nav-link ${isActive("/home") ? "active" : ""}`}>
                <span className="nav-icon">🏠</span>
                <span className="nav-text">Control Center</span>
              </Link>
              
              <Link to="/admin" className={`nav-link ${isActive("/admin") ? "active" : ""}`}>
                <span className="nav-icon">⚙️</span>
                <span className="nav-text">Admin Panel</span>
              </Link>
              
              <Link to="/about" className={`nav-link ${isActive("/about") ? "active" : ""}`}>
                <span className="nav-icon">ℹ️</span>
                <span className="nav-text">About</span>
              </Link>
            </>
          ) : userType === "ambulance" ? (
            <>
              <Link to="/ambulance-dashboard" className={`nav-link ${isActive("/ambulance-dashboard") ? "active" : ""}`}>
                <span className="nav-icon">🚑</span>
                <span className="nav-text">Emergency Dashboard</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className={`nav-link ${isActive("/login") ? "active" : ""}`}>
                <span className="nav-icon">🔐</span>
                <span className="nav-text">Admin Login</span>
              </Link>
              
              <Link to="/ambulance-login" className={`nav-link ${isActive("/ambulance-login") ? "active" : ""}`}>
                <span className="nav-icon">🚑</span>
                <span className="nav-text">Ambulance Login</span>
              </Link>

              <Link to="/ambulance-register" className="nav-link register-link">
                <span className="nav-icon">🚑</span>
                Register Ambulance
                </Link>
              </>
          )}
        </div>

        {/* User Info & Controls */}
        <div className="nav-controls">
          {userType === "ambulance" && ambulanceData.ambulance_number && (
            <div className="user-info">
              <div className="user-icon">🚑</div>
              <div className="user-details">
                <span className="user-name">{ambulanceData.driver_name}</span>
                <span className="user-role">{ambulanceData.ambulance_number}</span>
              </div>
            </div>
          )}

          {userType === "admin" && (
            <div className="system-status">
              <div className="status-indicator online"></div>
              <span className="status-text">System Online</span>
            </div>
          )}

          {/* Logout Button */}
          {(isAuthenticated || ambulanceToken) && (
            <button className="logout-btn" onClick={handleLogout}>
              <span className="logout-icon">🚪</span>
              <span className="logout-text">Logout</span>
            </button>
          )}

          {/* Time Display */}
          <div className="time-display">
            <span className="time-icon">🕒</span>
            <span className="time-text">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button className="mobile-toggle">
          <span className="toggle-bar"></span>
          <span className="toggle-bar"></span>
          <span className="toggle-bar"></span>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className="mobile-menu">
        {userType === "admin" ? (
          <>
            <Link to="/home" className="mobile-link">🏠 Control Center</Link>
            <Link to="/admin" className="mobile-link">⚙️ Admin Panel</Link>
            <Link to="/about" className="mobile-link">ℹ️ About</Link>
            <button className="mobile-logout" onClick={handleLogout}>🚪 Logout</button>
          </>
        ) : userType === "ambulance" ? (
          <>
            <Link to="/ambulance-dashboard" className="mobile-link">🚑 Emergency Dashboard</Link>
            <button className="mobile-logout" onClick={handleLogout}>🚪 Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="mobile-link">🔐 Admin Login</Link>
            <Link to="/ambulance-login" className="mobile-link">🚑 Ambulance Login</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;