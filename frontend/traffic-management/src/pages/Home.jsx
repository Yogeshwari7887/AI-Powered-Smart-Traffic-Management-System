import { useEffect, useState } from "react";
import "./Home.css";

function TrafficLight({ color }) {
  return (
    <div className="traffic-light">
      <div className={`light red ${color === "RED" ? "on" : ""}`}></div>
      <div className={`light yellow ${color === "YELLOW" ? "on" : ""}`}></div>
      <div className={`light green ${color === "GREEN" ? "on" : ""}`}></div>
    </div>
  );
}

function JunctionSignalCard({ junctionName, signals, mode, isSelected, hasEmergency, emergencyLane }) {
  return (
    <div className={`junction-signal-card ${isSelected ? 'selected' : ''}`}>
      <div className="junction-card-header">
        <h4 className="junction-name">{junctionName}</h4>
        <div className={`mode-badge ${mode.toLowerCase()}`}>
          {mode === "EMERGENCY" ? "🚨" : "🟢"} {mode}
        </div>
      </div>
      
      <div className="signal-grid-mini">
        {Object.entries(signals || {}).map(([lane, color]) => (
          <div key={lane} className="lane-indicator">
            <div className="lane-label">{lane.replace('_', ' ')}</div>
            <div className={`signal-indicator ${color.toLowerCase()} ${emergencyLane === parseInt(lane.split('_')[1]) ? 'priority' : ''}`}>
              {color}
            </div>
          </div>
        ))}
      </div>
      
      {hasEmergency && (
        <div className="emergency-alert">
          <span className="alert-icon">🚑</span>
          <span className="alert-text">Emergency Active</span>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  
  // Junction states
  const [selectedJunction, setSelectedJunction] = useState("Main Square Junction");
  const [junctions, setJunctions] = useState([]);
  const [junctionSignals, setJunctionSignals] = useState({});
  
  // Emergency states
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [scheduledEmergency, setScheduledEmergency] = useState(null);

  useEffect(() => {
    fetchJunctions();
    fetchAllJunctionsStatus();
    fetchActiveEmergencies();
    
    const interval = setInterval(() => {
      fetchAllJunctionsStatus();
      fetchActiveEmergencies();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchJunctions = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/junctions");
      const data = await response.json();
      setJunctions(data.junctions || []);
    } catch (error) {
      console.error("Failed to fetch junctions:", error);
    }
  };

  const fetchAllJunctionsStatus = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/all-junctions-status");
      const data = await response.json();
      setJunctionSignals(data);
    } catch (error) {
      console.error("Failed to fetch junction status:", error);
    }
  };

  const fetchActiveEmergencies = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/emergencies/by-junction");
      const data = await response.json();
      setActiveEmergencies(data.junctions_with_emergencies || []);
      
      // Check if selected junction has scheduled emergency
      const junctionEmergency = data.junctions_with_emergencies.find(
        j => j.junction_name === selectedJunction
      );
      
      if (junctionEmergency && junctionEmergency.active_emergencies > 0) {
        fetchScheduledEmergencyForJunction(selectedJunction);
      } else {
        setScheduledEmergency(null);
      }
    } catch (error) {
      console.error("Failed to fetch emergencies:", error);
    }
  };

  const fetchScheduledEmergencyForJunction = async (junctionName) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/emergencies/junction/${junctionName}`);
      const data = await response.json();
      
      if (data.active_emergencies.length > 0) {
        setScheduledEmergency({
          junction: junctionName,
          ambulance: data.active_emergencies[0].ambulance_number,
          lane: data.active_emergencies[0].lane_to_clear,
          from: data.active_emergencies[0].current_location,
          to: data.active_emergencies[0].destination_location,
          progress: `${data.active_emergencies[0].current_junction_index}/${data.active_emergencies[0].total_junctions}`
        });
      } else {
        setScheduledEmergency(null);
      }
    } catch (error) {
      console.error("Failed to fetch scheduled emergency:", error);
    }
  };

  const analyzeVideo = async () => {
    if (!file) {
      alert("Please select a video first");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("video", file);
    formData.append("junction", selectedJunction);

    try {
      const res = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setResult(data);
      
      // Refresh after analysis
      fetchAllJunctionsStatus();
      fetchActiveEmergencies();
    } catch {
      alert("Backend not reachable");
    }

    setLoading(false);
  };

  return (
    <div className="home-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">
            <span className="title-icon">🚦</span>
            SMART TRAFFIC CONTROL CENTER
          </h1>
          <p className="dashboard-subtitle">Real-time Multi-Junction Traffic Management System</p>
        </div>
        <div className="header-right">
          <div className="system-status">
            <div className="status-indicator online"></div>
            <span className="status-text">System Online</span>
          </div>
          <div className="time-display">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Content - Horizontal Split */}
      <div className="main-content-split">
        
        {/* Left Section - Multi-Junction Control */}
        <section className="control-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">🎮</span>
              MULTI-JUNCTION CONTROL
            </h2>
            <div className="section-badge">
              {activeEmergencies.length} Active Emergency{activeEmergencies.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="control-content">
            {/* Junction Selection */}
            <div className="control-card">
              <h3 className="control-card-title">📡 Select Junction</h3>
              <div className="junction-selector">
                <select 
                  value={selectedJunction} 
                  onChange={(e) => {
                    setSelectedJunction(e.target.value);
                    fetchScheduledEmergencyForJunction(e.target.value);
                  }}
                  className="junction-dropdown"
                >
                  {junctions.map(j => (
                    <option key={j.id} value={j.name}>
                      {j.name} • {j.location}
                    </option>
                  ))}
                </select>
                <div className="selected-junction-info">
                  <span className="junction-location">
                    {junctions.find(j => j.name === selectedJunction)?.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Video Analysis */}
            <div className="control-card">
              <h3 className="control-card-title">🎥 Video Analysis</h3>
              <div className="video-upload-area">
                <div className="upload-prompt">
                  <div className="upload-icon">📁</div>
                  <p className="upload-text">Drag & drop CCTV footage</p>
                  <p className="upload-subtext">or click to browse (MP4, AVI, MOV)</p>
                </div>
                <input 
                  type="file" 
                  accept="video/*"
                  onChange={(e) => setFile(e.target.files[0])} 
                  className="file-input"
                />
                {file && (
                  <div className="file-selected">
                    <div className="file-info">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    </div>
                    <button className="remove-file" onClick={() => setFile(null)}>✕</button>
                  </div>
                )}
              </div>
              
              <button 
                className="analyze-button" 
                onClick={analyzeVideo} 
                disabled={loading || !file}
              >
                {loading ? (
                  <>
                    <div className="button-spinner"></div>
                    PROCESSING {selectedJunction}
                  </>
                ) : (
                  <>
                    <span className="button-icon">🔍</span>
                    ANALYZE JUNCTION VIDEO
                  </>
                )}
              </button>
            </div>

            {/* Emergency Information */}
            {scheduledEmergency && (
              <div className="control-card emergency-card">
                <h3 className="control-card-title emergency-title">🚨 SCHEDULED EMERGENCY</h3>
                <div className="emergency-details">
                  <div className="detail-row">
                    <span className="detail-label">Ambulance:</span>
                    <span className="detail-value highlight">{scheduledEmergency.ambulance}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Route:</span>
                    <span className="detail-value">
                      {scheduledEmergency.from} → {scheduledEmergency.to}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Priority Lane:</span>
                    <span className="detail-value lane-highlight">LANE {scheduledEmergency.lane}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Progress:</span>
                    <span className="detail-value progress">
                      {scheduledEmergency.progress} junctions cleared
                    </span>
                  </div>
                  <div className="action-required">
                    ⚡ Upload video from this junction to clear the emergency
                  </div>
                </div>
              </div>
            )}

            {/* Active Emergencies */}
            {activeEmergencies.length > 0 && (
              <div className="control-card emergencies-overview">
                <h3 className="control-card-title">📊 ACTIVE EMERGENCIES</h3>
                <div className="emergencies-list">
                  {activeEmergencies.map((emergency, idx) => (
                    <div 
                      key={idx}
                      className={`emergency-item ${emergency.junction_name === selectedJunction ? 'active' : ''}`}
                      onClick={() => setSelectedJunction(emergency.junction_name)}
                    >
                      <div className="emergency-item-header">
                        <span className="emergency-junction">{emergency.junction_name}</span>
                        <span className="emergency-count">
                          {emergency.active_emergencies} ambulance{emergency.active_emergencies !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="emergency-ambulances">
                        {emergency.ambulance_numbers.slice(0, 3).map((amb, i) => (
                          <span key={i} className="ambulance-tag">🚑 {amb}</span>
                        ))}
                        {emergency.ambulance_numbers.length > 3 && (
                          <span className="more-tag">+{emergency.ambulance_numbers.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Section - Live Signal Monitoring */}
        <section className="monitoring-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">📡</span>
              LIVE SIGNAL MONITORING
            </h2>
            <div className="junction-count">
              {Object.keys(junctionSignals).length} Junctions Online
            </div>
          </div>

          <div className="monitoring-content">
            {/* Main Junction Display */}
            <div className="main-junction-display">
              <div className="main-junction-header">
                <h3 className="main-junction-name">{selectedJunction}</h3>
                <div className="junction-status">
                  <div className={`mode-display ${junctionSignals[selectedJunction]?.mode?.toLowerCase() || 'normal'}`}>
                    {junctionSignals[selectedJunction]?.mode || "NORMAL"} MODE
                  </div>
                  {scheduledEmergency && scheduledEmergency.junction === selectedJunction && (
                    <div className="emergency-display">🚨 EMERGENCY IN PROGRESS</div>
                  )}
                </div>
              </div>

              {/* Traffic Lights Grid - 2 lanes per row */}
              <div className="traffic-lights-grid">
                {Object.entries(junctionSignals[selectedJunction]?.signals || {}).map(([lane, color]) => (
                  <div key={lane} className="traffic-light-card">
                    <div className="lane-header">
                      <h4 className="lane-name">{lane.replace('_', ' ')}</h4>
                      {scheduledEmergency && 
                       scheduledEmergency.junction === selectedJunction && 
                       scheduledEmergency.lane === parseInt(lane.split('_')[1]) && (
                        <div className="priority-flag">PRIORITY</div>
                      )}
                    </div>
                    <TrafficLight color={color} />
                    <div className={`signal-status ${color.toLowerCase()}`}>
                      <span className="status-text">{color}</span>
                      <span className="status-duration">10s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Junctions Overview */}
            <div className="junctions-overview">
              <h3 className="overview-title">ALL JUNCTIONS</h3>
              <div className="junctions-grid">
                {Object.entries(junctionSignals).map(([junctionName, data]) => (
                  <JunctionSignalCard
                    key={junctionName}
                    junctionName={junctionName}
                    signals={data.signals}
                    mode={data.mode}
                    isSelected={junctionName === selectedJunction}
                    hasEmergency={activeEmergencies.some(e => e.junction_name === junctionName)}
                    emergencyLane={scheduledEmergency?.junction === junctionName ? scheduledEmergency.lane : null}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Analysis Results Section */}
      {result && (
        <section className="results-section">
          <div className="section-header">
            <h2 className="section-title">
              <span className="section-icon">📊</span>
              ANALYSIS RESULTS
            </h2>
            <div className="timestamp">
              Analyzed at {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="results-content">
            {/* Results Grid */}
            <div className="results-grid">
              <div className="result-card primary">
                <div className="result-label">EMERGENCY DETECTED</div>
                <div className={`result-value ${result.emergency ? 'detected' : 'not-detected'}`}>
                  {result.emergency ? '✅ DETECTED' : '❌ NOT DETECTED'}
                </div>
              </div>

              {result.emergency && (
                <>
                  <div className="result-card">
                    <div className="result-label">VEHICLE TYPE</div>
                    <div className="result-value type">{result.vehicle_type}</div>
                  </div>

                  <div className="result-card">
                    <div className="result-label">AMBULANCE</div>
                    <div className="result-value ambulance">{result.ambulance_number}</div>
                  </div>

                  <div className="result-card">
                    <div className="result-label">STATUS</div>
                    <div className={`result-value ${result.is_scheduled ? 'scheduled' : 'random'}`}>
                      {result.is_scheduled ? '📅 SCHEDULED' : '🎯 RANDOM'}
                    </div>
                  </div>

                  {result.lane_to_clear && (
                    <div className="result-card">
                      <div className="result-label">PRIORITY LANE</div>
                      <div className="result-value lane">LANE {result.lane_to_clear}</div>
                    </div>
                  )}

                  <div className="result-card">
                    <div className="result-label">CONFIDENCE</div>
                    <div className="result-value confidence">
                      {(result.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Result Message */}
            {result.message && (
              <div className={`result-message ${result.is_scheduled ? 'success' : 'info'}`}>
                <div className="message-icon">
                  {result.is_scheduled ? '✅' : 'ℹ️'}
                </div>
                <div className="message-content">
                  <h4 className="message-title">
                    {result.is_scheduled ? 'SCHEDULED EMERGENCY PROCESSED' : 'VEHICLE DETECTED'}
                  </h4>
                  <p className="message-text">{result.message}</p>
                </div>
              </div>
            )}

            {/* Processed Video */}
            {result.output_video && (
              <div className="video-result">
                <div className="video-header">
                  <h3 className="video-title">🎬 PROCESSED VIDEO</h3>
                  <div className="video-info">
                    <span className="video-junction">Junction: {result.junction}</span>
                    <span className="video-size">Size: {(result.confidence * 100).toFixed(1)}% accuracy</span>
                  </div>
                </div>
                <div className="video-container">
                  <video
                    src={`http://127.0.0.1:5000${result.output_video}`}
                    controls
                    className="result-video"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}