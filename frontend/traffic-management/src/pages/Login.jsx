import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (username === "admin" && password === "admin123") {
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("user_role", "admin");
      localStorage.setItem("username", username);
      navigate("/home", { replace: true });
    } else {
      setError("Invalid username or password. Try admin/admin123");
      setLoading(false);
    }
  };

  const handleAmbulanceLogin = () => {
    navigate("/ambulance-login");
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Panel - Branding */}
        <div className="login-branding">
          <div className="brand-icon">🚦</div>
          <h1 className="brand-title">TrafficFlow</h1>
          <p className="brand-subtitle">Intelligent Traffic Management System</p>
          
          <div className="features-list">
            <div className="feature-item">
              <span className="feature-icon">🚑</span>
              <span className="feature-text">Emergency Vehicle Priority</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span className="feature-text">Real-time Analytics</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span className="feature-text">Smart Signal Control</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🛡️</span>
              <span className="feature-text">Security Monitoring</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="login-form-container">
          <form className="login-form-card" onSubmit={handleLogin}>
            <div className="form-header">
              <div className="form-icon">🔐</div>
              <h2 className="form-title">Administrator Login</h2>
              <p className="form-subtitle">Access traffic control dashboard</p>
            </div>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="input-group">
              <label htmlFor="username" className="input-label">
                <span className="label-icon">👤</span>
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="login-input"
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">
                <span className="label-icon">🔒</span>
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input password-input"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div className="demo-credentials">
              <div className="demo-header">
                <span className="demo-icon">ℹ️</span>
                <span className="demo-title">Demo Credentials</span>
              </div>
              <div className="demo-details">
                <div className="demo-item">
                  <span className="demo-label">Username:</span>
                  <span className="demo-value">admin</span>
                </div>
                <div className="demo-item">
                  <span className="demo-label">Password:</span>
                  <span className="demo-value">admin123</span>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <>
                  <span className="button-spinner"></span>
                  AUTHENTICATING...
                </>
              ) : (
                "🚀 LOGIN TO DASHBOARD"
              )}
            </button>

            <div className="divider">
              <span className="divider-text">OR</span>
            </div>

            <button 
              type="button" 
              className="ambulance-login-button"
              onClick={handleAmbulanceLogin}
              disabled={loading}
            >
              <span className="button-icon">🚑</span>
              ACCESS EMERGENCY VEHICLE LOGIN
            </button>

            <div className="login-footer">
              <p className="security-notice">
                <span className="security-icon">🛡️</span>
                Secure access only. Unauthorized entry prohibited.
              </p>
              <p className="support-text">
                Need help? Contact system administrator
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;