import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AmbulanceLogin.css";

function AmbulanceLogin() {
  const [ambulanceNumber, setAmbulanceNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/ambulance/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ambulance_number: ambulanceNumber,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("ambulance_token", data.token);
        localStorage.setItem("ambulance_data", JSON.stringify(data.ambulance));
        navigate("/ambulance-dashboard");
      } else {
        alert(data.error || "Login failed");
      }
    } catch (error) {
      alert("Connection error. Please check backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleLogin}>
        <h2>Ambulance Login</h2>
        
        <div className="login-info">
          <p><strong>Demo Credentials:</strong></p>
          <p>Ambulance Number: AMB001</p>
          <p>Password: admin123</p>
        </div>

        <input
          type="text"
          placeholder="Ambulance Number"
          value={ambulanceNumber}
          onChange={(e) => setAmbulanceNumber(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="switch-login">
          <a href="/login">Admin Login</a>
        </p>
      </form>
    </div>
  );
}

export default AmbulanceLogin;