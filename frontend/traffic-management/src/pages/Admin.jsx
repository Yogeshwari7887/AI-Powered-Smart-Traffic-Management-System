import { useState, useEffect } from "react";
import "./Admin.css";

function Admin() {
  const [emergencies, setEmergencies] = useState([]);
  const [junctions, setJunctions] = useState([]);
  const [signals, setSignals] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("emergencies");
  
  // Manual Control States
  const [selectedJunction, setSelectedJunction] = useState("Main Square Junction");
  const [selectedLane, setSelectedLane] = useState("LANE_1");
  const [priorityDuration, setPriorityDuration] = useState(15);
  const [systemPriority, setSystemPriority] = useState(true);

  useEffect(() => {
    fetchActiveEmergencies();
    fetchJunctions();
    fetchAllSignals();
    
    const interval = setInterval(() => {
      fetchActiveEmergencies();
      fetchAllSignals();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const fetchActiveEmergencies = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/emergencies/active");
      const data = await response.json();
      setEmergencies(data.emergencies || []);
    } catch (error) {
      console.error("Failed to fetch emergencies:", error);
    }
  };

  const fetchJunctions = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/junctions");
      const data = await response.json();
      setJunctions(data.junctions || []);
    } catch (error) {
      console.error("Failed to fetch junctions:", error);
    }
  };

  const fetchAllSignals = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/all-junctions-status");
      const data = await response.json();
      setSignals(data);
    } catch (error) {
      console.error("Failed to fetch signals:", error);
    }
  };

  const clearEmergency = async (emergencyId) => {
    if (!window.confirm("Are you sure you want to clear this emergency?")) return;
    
    try {
      await fetch(`http://127.0.0.1:5000/emergencies/clear/${emergencyId}`, {
        method: "POST"
      });
      
      setMessage("✅ Emergency cleared successfully");
      fetchActiveEmergencies();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to clear emergency");
    }
  };

  const forceEmergency = async () => {
    setLoading(true);
    try {
      await fetch("http://127.0.0.1:5000/admin/force-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          lane: selectedLane, 
          junction: selectedJunction 
        })
      });

      setMessage(`🚨 Emergency forced on ${selectedLane} at ${selectedJunction}`);
      fetchAllSignals();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to force emergency");
    } finally {
      setLoading(false);
    }
  };

  const updateDuration = async () => {
    try {
      await fetch("http://127.0.0.1:5000/admin/set-duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: priorityDuration })
      });

      setMessage(`⏱ Priority duration updated to ${priorityDuration} seconds`);
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to update duration");
    }
  };

  const resetAllSignals = async () => {
    if (!window.confirm("Reset all traffic signals to normal mode?")) return;
    
    try {
      await fetch("http://127.0.0.1:5000/admin/reset", {
        method: "POST"
      });

      setMessage("✅ All signals reset to normal mode");
      fetchAllSignals();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to reset signals");
    }
  };

  const toggleSystemPriority = async () => {
    try {
      await fetch("http://127.0.0.1:5000/admin/toggle-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !systemPriority })
      });

      setSystemPriority(!systemPriority);
      setMessage(`⚡ System priority ${!systemPriority ? 'enabled' : 'disabled'}`);
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to toggle system priority");
    }
  };

  const resetJunction = async (junctionName) => {
    try {
      await fetch(`http://127.0.0.1:5000/reset-junction/${junctionName}`, {
        method: "POST"
      });

      setMessage(`🔄 ${junctionName} reset to normal mode`);
      fetchAllSignals();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("❌ Failed to reset junction");
    }
  };

  return (
    <div className="admin-container">
      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <h1 className="admin-title">
            <span className="title-icon">⚙️</span>
            TRAFFIC CONTROL ADMIN PANEL
          </h1>
          <p className="admin-subtitle">
            System Administration • Emergency Management • Manual Control
          </p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <div className="stat-value">{emergencies.length}</div>
            <div className="stat-label">Active Emergencies</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{junctions.length}</div>
            <div className="stat-label">Junctions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{systemPriority ? "ON" : "OFF"}</div>
            <div className="stat-label">Priority Mode</div>
          </div>
        </div>
      </header>

      {/* Message Alert */}
      {message && (
        <div className={`admin-message ${message.includes("✅") ? 'success' : message.includes("❌") ? 'error' : 'info'}`}>
          <div className="message-icon">
            {message.includes("✅") ? "✅" : message.includes("❌") ? "❌" : "ℹ️"}
          </div>
          <div className="message-text">{message}</div>
          <button className="message-close" onClick={() => setMessage("")}>✕</button>
        </div>
      )}

      {/* Main Content */}
      <div className="admin-main">
        {/* Navigation Tabs */}
        <nav className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === "emergencies" ? "active" : ""}`}
            onClick={() => setActiveTab("emergencies")}
          >
            <span className="tab-icon">🚨</span>
            Active Emergencies
            {emergencies.length > 0 && (
              <span className="tab-badge">{emergencies.length}</span>
            )}
          </button>
          <button 
            className={`tab-button ${activeTab === "control" ? "active" : ""}`}
            onClick={() => setActiveTab("control")}
          >
            <span className="tab-icon">🎮</span>
            Manual Control
          </button>
          <button 
            className={`tab-button ${activeTab === "signals" ? "active" : ""}`}
            onClick={() => setActiveTab("signals")}
          >
            <span className="tab-icon">🚦</span>
            Signal Status
          </button>
          <button 
            className={`tab-button ${activeTab === "system" ? "active" : ""}`}
            onClick={() => setActiveTab("system")}
          >
            <span className="tab-icon">⚙️</span>
            System Settings
          </button>
        </nav>

        {/* Tab Content */}
        <div className="tab-content">
          
          {/* Active Emergencies Tab */}
          {activeTab === "emergencies" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2 className="panel-title">🚨 Active Emergency Management</h2>
                <button 
                  className="refresh-button"
                  onClick={fetchActiveEmergencies}
                >
                  🔄 Refresh List
                </button>
              </div>
              
              {emergencies.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✅</div>
                  <h3 className="empty-title">No Active Emergencies</h3>
                  <p className="empty-description">
                    All traffic systems operating normally. No emergency requests pending.
                  </p>
                </div>
              ) : (
                <div className="emergencies-grid">
                  {emergencies.map((emergency) => (
                    <div key={emergency.id} className="emergency-card">
                      <div className="emergency-header">
                        <div className="emergency-title">
                          <span className="ambulance-icon">🚑</span>
                          <h3>Ambulance {emergency.ambulance_number}</h3>
                        </div>
                        <button 
                          className="clear-emergency-btn"
                          onClick={() => clearEmergency(emergency.id)}
                          title="Clear Emergency"
                        >
                          Clear
                        </button>
                      </div>
                      
                      <div className="emergency-details">
                        <div className="detail-row">
                          <span className="detail-label">From:</span>
                          <span className="detail-value">{emergency.current_location}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">To:</span>
                          <span className="detail-value">{emergency.destination_location}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Junction:</span>
                          <span className="detail-value highlight">{emergency.next_junction || "N/A"}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Lane:</span>
                          <span className="detail-value lane-badge">LANE {emergency.lane_to_clear || "N/A"}</span>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Progress:</span>
                          <div className="progress-bar">
                            <div 
                              className="progress-fill"
                              style={{
                                width: `${(emergency.current_junction_index / emergency.total_junctions) * 100}%`
                              }}
                            ></div>
                            <span className="progress-text">
                              {emergency.current_junction_index}/{emergency.total_junctions} junctions
                            </span>
                          </div>
                        </div>
                        <div className="detail-row">
                          <span className="detail-label">Started:</span>
                          <span className="detail-value time">
                            {new Date(emergency.emergency_start_time).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="emergency-actions">
                        <button className="action-btn view-btn">View Details</button>
                        <button className="action-btn track-btn">Track Progress</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Manual Control Tab */}
          {activeTab === "control" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2 className="panel-title">🎮 Manual Traffic Control</h2>
                <div className="control-status">
                  <span className={`status-indicator ${systemPriority ? 'active' : 'inactive'}`}></span>
                  System Priority: {systemPriority ? "ENABLED" : "DISABLED"}
                </div>
              </div>
              
              <div className="control-grid">
                {/* Emergency Force Control */}
                <div className="control-card large">
                  <h3 className="control-card-title">🚨 Force Emergency Signal</h3>
                  <div className="control-form">
                    <div className="form-group">
                      <label className="form-label">Select Junction</label>
                      <select 
                        value={selectedJunction} 
                        onChange={(e) => setSelectedJunction(e.target.value)}
                        className="form-select"
                      >
                        {junctions.map(j => (
                          <option key={j.id} value={j.name}>
                            {j.name} • {j.location}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">Select Lane</label>
                      <div className="lanes-grid">
                        {["LANE_1", "LANE_2", "LANE_3", "LANE_4"].map((lane) => (
                          <button
                            key={lane}
                            className={`lane-button ${selectedLane === lane ? "selected" : ""}`}
                            onClick={() => setSelectedLane(lane)}
                          >
                            {lane.replace("_", " ")}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <button 
                      className="force-emergency-btn"
                      onClick={forceEmergency}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="button-spinner"></span>
                          ACTIVATING...
                        </>
                      ) : (
                        <>
                          ⚡ FORCE EMERGENCY SIGNAL
                        </>
                      )}
                    </button>
                    
                    <div className="warning-note">
                      ⚠️ This will override normal traffic flow for 15 seconds
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="control-card">
                  <h3 className="control-card-title">⚡ Quick Actions</h3>
                  <div className="quick-actions">
                    <button 
                      className="quick-btn reset-btn"
                      onClick={resetAllSignals}
                    >
                      <span className="btn-icon">🔄</span>
                      Reset All Signals
                    </button>
                    <button 
                      className="quick-btn toggle-btn"
                      onClick={toggleSystemPriority}
                    >
                      <span className="btn-icon">{systemPriority ? "🔴" : "🟢"}</span>
                      {systemPriority ? "Disable Priority" : "Enable Priority"}
                    </button>
                    <button 
                      className="quick-btn refresh-btn"
                      onClick={fetchAllSignals}
                    >
                      <span className="btn-icon">📡</span>
                      Refresh Status
                    </button>
                  </div>
                </div>

                {/* Junction Control */}
                <div className="control-card">
                  <h3 className="control-card-title">🚦 Junction Control</h3>
                  <div className="junctions-control">
                    {Object.keys(signals).slice(0, 3).map((junctionName) => (
                      <div key={junctionName} className="junction-control-item">
                        <span className="junction-name">{junctionName}</span>
                        <div className="junction-actions">
                          <span className={`junction-mode ${signals[junctionName]?.mode === "EMERGENCY" ? "emergency" : "normal"}`}>
                            {signals[junctionName]?.mode || "NORMAL"}
                          </span>
                          <button 
                            className="reset-junction-btn"
                            onClick={() => resetJunction(junctionName)}
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    ))}
                    {Object.keys(signals).length > 3 && (
                      <div className="more-junctions">
                        +{Object.keys(signals).length - 3} more junctions...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Signal Status Tab */}
          {activeTab === "signals" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2 className="panel-title">🚦 Live Signal Status</h2>
                <div className="last-update">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
              
              <div className="signals-grid">
                {Object.entries(signals).map(([junctionName, data]) => (
                  <div key={junctionName} className="signal-card">
                    <div className="signal-header">
                      <h3 className="signal-junction">{junctionName}</h3>
                      <div className={`signal-mode ${data.mode === "EMERGENCY" ? "emergency" : "normal"}`}>
                        {data.mode}
                      </div>
                    </div>
                    
                    <div className="signal-lanes">
                      {Object.entries(data.signals || {}).map(([lane, status]) => (
                        <div key={lane} className="lane-status">
                          <div className="lane-name">{lane.replace("_", " ")}</div>
                          <div className={`status-indicator ${status.toLowerCase()}`}>
                            <div className={`status-light ${status.toLowerCase()}`}></div>
                            <span className="status-text">{status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="signal-footer">
                      <div className="emergency-info">
                        {data.emergency_lane && (
                          <div className="emergency-alert">
                            <span className="alert-icon">🚨</span>
                            Lane {data.emergency_lane} prioritized
                          </div>
                        )}
                      </div>
                      <button 
                        className="signal-reset-btn"
                        onClick={() => resetJunction(junctionName)}
                      >
                        Reset Junction
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === "system" && (
            <div className="tab-panel">
              <div className="panel-header">
                <h2 className="panel-title">⚙️ System Configuration</h2>
                <div className="system-health">
                  <span className="health-indicator healthy"></span>
                  System Healthy
                </div>
              </div>
              
              <div className="settings-grid">
                {/* Priority Settings */}
                <div className="settings-card">
                  <h3 className="settings-title">⏱ Priority Duration</h3>
                  <div className="settings-content">
                    <div className="duration-control">
                      <input
                        type="range"
                        min="5"
                        max="60"
                        value={priorityDuration}
                        onChange={(e) => setPriorityDuration(e.target.value)}
                        className="duration-slider"
                      />
                      <div className="duration-value">
                        <span className="value">{priorityDuration}</span>
                        <span className="unit">seconds</span>
                      </div>
                    </div>
                    <p className="settings-description">
                      Duration for emergency signal priority when ambulance is detected
                    </p>
                    <button 
                      className="save-btn"
                      onClick={updateDuration}
                    >
                      Save Duration
                    </button>
                  </div>
                </div>

                {/* System Mode */}
                <div className="settings-card">
                  <h3 className="settings-title">🔧 System Mode</h3>
                  <div className="settings-content">
                    <div className="mode-toggle">
                      <div className="toggle-header">
                        <span className="toggle-label">Emergency Priority System</span>
                        <div className={`toggle-switch ${systemPriority ? "on" : "off"}`}>
                          <div className="toggle-slider"></div>
                        </div>
                      </div>
                      <button 
                        className="toggle-btn"
                        onClick={toggleSystemPriority}
                      >
                        {systemPriority ? "Disable System" : "Enable System"}
                      </button>
                    </div>
                    <p className="settings-description">
                      When enabled, system will automatically prioritize emergency vehicles
                    </p>
                  </div>
                </div>

                {/* System Info */}
                <div className="settings-card">
                  <h3 className="settings-title">📊 System Information</h3>
                  <div className="settings-content">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Total Junctions:</span>
                        <span className="info-value">{junctions.length}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Active Emergencies:</span>
                        <span className="info-value">{emergencies.length}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Priority Duration:</span>
                        <span className="info-value">{priorityDuration}s</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">System Status:</span>
                        <span className={`info-value ${systemPriority ? "active" : "inactive"}`}>
                          {systemPriority ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Database */}
                <div className="settings-card">
                  <h3 className="settings-title">💾 Database</h3>
                  <div className="settings-content">
                    <div className="db-actions">
                      <button className="db-btn export-btn">
                        <span className="btn-icon">📥</span>
                        Export Logs
                      </button>
                      <button className="db-btn clear-btn">
                        <span className="btn-icon">🗑️</span>
                        Clear Old Data
                      </button>
                      <button className="db-btn backup-btn">
                        <span className="btn-icon">💾</span>
                        Backup System
                      </button>
                    </div>
                    <p className="settings-description">
                      Manage system data and logs
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="admin-footer">
        <div className="footer-left">
          <span className="footer-text">Smart Traffic Control System v2.0</span>
          <span className="footer-separator">•</span>
          <span className="footer-text">Admin Panel</span>
        </div>
        <div className="footer-right">
          <span className="footer-text">
            Last Refresh: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </footer>
    </div>
  );
}

export default Admin;