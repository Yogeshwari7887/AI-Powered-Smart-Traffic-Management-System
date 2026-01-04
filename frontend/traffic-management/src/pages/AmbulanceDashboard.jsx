import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AmbulanceDashboard.css";

function AmbulanceDashboard() {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedJunctions, setSelectedJunctions] = useState([]);
  const [availableJunctions, setAvailableJunctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  const token = localStorage.getItem("ambulance_token");
  const ambulanceData = JSON.parse(localStorage.getItem("ambulance_data") || "{}");

  useEffect(() => {
    if (!token) {
      navigate("/ambulance-login");
      return;
    }

    fetchJunctions();
    checkEmergencyStatus();
  }, []);

  const fetchJunctions = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/ambulance/junctions", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      setAvailableJunctions(data.junctions || []);
    } catch (error) {
      console.error("Failed to fetch junctions:", error);
    }
  };

  const checkEmergencyStatus = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/ambulance/emergency/status", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.emergency_active) {
        setEmergencyActive(true);
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to check status:", error);
    }
  };

  const generateRandomRoute = () => {
    if (availableJunctions.length < 2) {
      alert("Not enough junctions available");
      return;
    }

    // Shuffle junctions and pick 2-4 random ones
    const shuffled = [...availableJunctions].sort(() => 0.5 - Math.random());
    const numJunctions = Math.floor(Math.random() * 3) + 2; // 2-4 junctions
    const selected = shuffled.slice(0, numJunctions);
    
    const formattedJunctions = selected.map((junction, index) => ({
      junction_id: junction.id,
      junction_name: junction.name,
      lane_to_clear: Math.floor(Math.random() * junction.lanes) + 1,
      order: index + 1
    }));

    setSelectedJunctions(formattedJunctions);
  };

  const startEmergency = async () => {
    if (!currentLocation || !destination || selectedJunctions.length === 0) {
      alert("Please fill all fields and generate route");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/ambulance/emergency/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          current_location: currentLocation,
          destination_location: destination,
          route_data: {
            junctions: selectedJunctions
          }
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setEmergencyActive(true);
        alert("🚨 Emergency mode activated!\nTraffic signals will be prioritized along your route.");
        checkEmergencyStatus();
      } else {
        alert(data.error || "Failed to activate emergency");
      }
    } catch (error) {
      alert("Connection error. Please check backend.");
    } finally {
      setLoading(false);
    }
  };

  const stopEmergency = async () => {
    if (!window.confirm("Are you sure you want to stop emergency mode?")) return;
    
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/ambulance/emergency/stop", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        setEmergencyActive(false);
        setStatus(null);
        setSelectedJunctions([]);
        alert("Emergency mode deactivated");
      }
    } catch (error) {
      alert("Failed to stop emergency");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("ambulance_token");
    localStorage.removeItem("ambulance_data");
    navigate("/ambulance-login");
  };

  return (
    <div className="ambulance-dashboard">
      <div className="dashboard-header">
        <h1>Emergency Vehicle Control Panel</h1>
        <div className="ambulance-info">
          <span>
            <small>AMBULANCE</small>
            <strong>{ambulanceData.ambulance_number}</strong>
          </span>
          <span>
            <small>DRIVER</small>
            <strong>{ambulanceData.driver_name}</strong>
          </span>
          <button className="logout-btn" onClick={logout}>
            <span>🚪</span> Logout
          </button>
        </div>
      </div>

      {emergencyActive ? (
        <div className="emergency-active-card">
          <div className="emergency-header">
            <h2>EMERGENCY MODE ACTIVE</h2>
            <button className="stop-emergency-btn" onClick={stopEmergency} disabled={loading}>
              <span>🛑</span> {loading ? "Stopping..." : "Stop Emergency"}
            </button>
          </div>
          
          {status && (
            <div className="emergency-status">
              <p><strong>Current Location:</strong> {status.current_location}</p>
              <p><strong>Destination:</strong> {status.destination_location}</p>
              <p><strong>Progress:</strong> {status.current_junction_index} of {status.total_junctions} junctions cleared</p>
              
              <div className="junctions-progress">
                <h3>Route Progress</h3>
                {status.junctions && status.junctions.map((junc, idx) => (
                  <div key={idx} className={`junction-status ${junc.is_cleared ? 'cleared' : 'pending'}`}>
                    <span>{junc.junction_name} - Lane {junc.lane_number}</span>
                    <span>{junc.is_cleared ? '✅ Cleared' : '⏳ Pending'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="emergency-setup-card">
          <h2>Activate Emergency Response</h2>
          
          <div className="form-group">
            <label>Current Location</label>
            <input
              type="text"
              value={currentLocation}
              onChange={(e) => setCurrentLocation(e.target.value)}
              placeholder="Enter your current location (e.g., City Hospital)"
            />
          </div>

          <div className="form-group">
            <label>Destination</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination (e.g., Accident Site - Highway Exit 5)"
            />
          </div>

          <div className="junctions-section">
            <div className="section-header">
              <h3>Generated Emergency Route</h3>
              <button 
                type="button" 
                onClick={generateRandomRoute} 
                className="auto-route-btn"
              >
                <span>🔄</span> Generate Route
              </button>
            </div>

            {selectedJunctions.length > 0 ? (
              <div className="junction-list">
                {selectedJunctions.map((junc, index) => (
                  <div key={index} className="junction-item">
                    <h4>Junction {index + 1}: {junc.junction_name}</h4>
                    <p>Priority Lane to Clear:</p>
                    <span className="lane-badge">LANE {junc.lane_to_clear}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                background: '#f8f9fa',
                borderRadius: '10px',
                border: '2px dashed #dee2e6'
              }}>
                <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
                  Click "Generate Route" to auto-generate emergency route
                </p>
                <button 
                  onClick={generateRandomRoute}
                  style={{
                    background: '#3498db',
                    color: 'white',
                    border: 'none',
                    padding: '12px 30px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  🗺️ Generate Route
                </button>
              </div>
            )}
          </div>

          <button 
            className="activate-btn" 
            onClick={startEmergency} 
            disabled={loading || selectedJunctions.length === 0}
          >
            <span>🚨</span> 
            {loading ? "Activating Emergency..." : "ACTIVATE EMERGENCY MODE"}
          </button>

          <p className="note">
            ⚠️ This will notify traffic control centers and prioritize traffic signals 
            along your route. Use only in genuine emergencies.
          </p>
        </div>
      )}
    </div>
  );
}

export default AmbulanceDashboard;