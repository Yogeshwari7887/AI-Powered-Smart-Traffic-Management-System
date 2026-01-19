import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./AmbulanceDashboard.css";

function AmbulanceDashboard() {
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [currentCoords, setCurrentCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [selectedJunctions, setSelectedJunctions] = useState([]);
  const [availableJunctions, setAvailableJunctions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [ambulanceProfile, setAmbulanceProfile] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showDestinationMap, setShowDestinationMap] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteService = useRef(null);
  
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
    fetchAmbulanceProfile();
    loadGoogleMaps();
  }, []);

  // Load Google Maps API
  const loadGoogleMaps = () => {
    if (!window.google) {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB3_P_9w2yAKD9y4OIJDQoP3h_oBFF47E4&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
      };
      document.head.appendChild(script);
    } else {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
    }
  };

  // Get readable location name from address components - SIMPLIFIED
  const getReadableLocation = (result) => {
    if (!result) return "Unknown Location";
    
    const components = result.address_components;
    const formatted = result.formatted_address;
    
    // First try: Get from address components
    let neighborhood = "";
    let sublocality = "";
    let locality = "";
    let admin2 = "";
    let admin1 = "";
    
    for (let comp of components) {
      const types = comp.types;
      
      if (types.includes("neighborhood") && !neighborhood) {
        neighborhood = comp.long_name;
      }
      if (types.includes("sublocality_level_1") && !sublocality) {
        sublocality = comp.long_name;
      }
      if (types.includes("sublocality_level_2") && !neighborhood) {
        neighborhood = comp.long_name;
      }
      if (types.includes("locality") && !locality) {
        locality = comp.long_name;
      }
      if (types.includes("administrative_area_level_2") && !admin2) {
        admin2 = comp.long_name;
      }
      if (types.includes("administrative_area_level_1") && !admin1) {
        admin1 = comp.long_name;
      }
    }
    
    // Build readable address
    if (neighborhood && locality) return `${neighborhood}, ${locality}`;
    if (sublocality && locality) return `${sublocality}, ${locality}`;
    if (locality && admin1) return `${locality}, ${admin1}`;
    if (locality) return locality;
    if (sublocality) return sublocality;
    if (neighborhood) return neighborhood;
    if (admin2) return admin2;
    
    // Fallback: Parse formatted address
    if (formatted) {
      const parts = formatted.split(',').map(p => p.trim());
      // Filter out numbers, postal codes
      const cleanParts = parts.filter(p => 
        p && 
        !/^\d+$/.test(p) && 
        p.length > 2 &&
        !p.match(/^\d{5,6}$/)
      );
      
      if (cleanParts.length >= 2) {
        return `${cleanParts[0]}, ${cleanParts[1]}`;
      }
      if (cleanParts.length === 1) {
        return cleanParts[0];
      }
    }
    
    return "Location";
  };

  // Fetch current location using GPS - FIXED
  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("❌ Geolocation is not supported by your browser");
      return;
    }

    setFetchingLocation(true);
    setCurrentLocation("Getting location...");
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyB3_P_9w2yAKD9y4OIJDQoP3h_oBFF47E4&language=en&result_type=street_address|locality|sublocality`;
          
          const response = await fetch(url);
          const data = await response.json();
          
          console.log("📍 GPS Response:", data);
          
          if (data.status === "OK" && data.results && data.results.length > 0) {
            const locationName = getReadableLocation(data.results[0]);
            console.log("✅ Location Name:", locationName);
            setCurrentLocation(locationName);
          } else {
            console.error("❌ Geocoding Status:", data.status);
            // Try with different result types
            const url2 = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyB3_P_9w2yAKD9y4OIJDQoP3h_oBFF47E4&language=en`;
            const response2 = await fetch(url2);
            const data2 = await response2.json();
            
            if (data2.status === "OK" && data2.results && data2.results.length > 0) {
              const locationName = getReadableLocation(data2.results[0]);
              setCurrentLocation(locationName);
            } else {
              setCurrentLocation(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
            }
          }
        } catch (error) {
          console.error("❌ Geocoding Error:", error);
          setCurrentLocation(`GPS Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
        } finally {
          setFetchingLocation(false);
        }
      },
      (error) => {
        console.error("❌ GPS Error:", error);
        let errorMsg = "Unable to get location";
        if (error.code === 1) errorMsg = "Location permission denied";
        if (error.code === 2) errorMsg = "Location unavailable";
        if (error.code === 3) errorMsg = "Location timeout";
        
        alert(`❌ ${errorMsg}. Please enable GPS and grant permission.`);
        setCurrentLocation("");
        setFetchingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  // Search suggestions as user types (like Zomato/Swiggy)
  const handleSearchInput = (value) => {
    setSearchQuery(value);
    
    if (value.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!autocompleteService.current) {
      console.error("Autocomplete service not loaded");
      return;
    }

    // Get predictions
    autocompleteService.current.getPlacePredictions(
      {
        input: value,
        componentRestrictions: { country: 'in' }, // Restrict to India
        types: ['establishment', 'geocode'] // Include all types
      },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSearchSuggestions(predictions.slice(0, 5)); // Show top 5
          setShowSuggestions(true);
        } else {
          setSearchSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  };

  // Select destination from suggestions
  const selectDestination = async (placeId, description) => {
    setSearchQuery("");
    setShowSuggestions(false);
    setDestination("Loading...");
    
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=AIzaSyB3_P_9w2yAKD9y4OIJDQoP3h_oBFF47E4&language=en`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log("📍 Place Details Response:", data);
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        setDestinationCoords({ lat: location.lat, lng: location.lng });
        
        const locationName = getReadableLocation(result);
        console.log("✅ Destination Name:", locationName);
        setDestination(locationName);
        
        // Update map if visible
        if (mapRef.current) {
          mapRef.current.setCenter(location);
          mapRef.current.setZoom(15);
          
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }
          
          markerRef.current = new window.google.maps.Marker({
            position: location,
            map: mapRef.current,
            title: locationName,
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
            },
            animation: window.google.maps.Animation.DROP
          });
        }
      } else {
        console.error("❌ Place Details Status:", data.status);
        setDestination(description.split(',')[0]);
      }
    } catch (error) {
      console.error("❌ Error fetching place details:", error);
      setDestination(description.split(',')[0]);
    }
  };

  // Handle map click - FIXED
  const handleMapClick = async (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    
    setDestinationCoords({ lat, lng });
    setDestination("Getting address...");
    
    if (markerRef.current) {
      markerRef.current.setMap(null);
    }
    
    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapRef.current,
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
      },
      animation: window.google.maps.Animation.DROP
    });
    
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyB3_P_9w2yAKD9y4OIJDQoP3h_oBFF47E4&language=en`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log("🗺️ Map Click Response:", data);
      
      if (data.status === "OK" && data.results && data.results.length > 0) {
        const locationName = getReadableLocation(data.results[0]);
        console.log("✅ Map Click Location:", locationName);
        setDestination(locationName);
      } else {
        console.error("❌ Map Click Status:", data.status);
        setDestination(`Selected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    } catch (error) {
      console.error("❌ Map Click Error:", error);
      setDestination(`Selected Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    }
  };

  // Initialize map
  useEffect(() => {
    if (showDestinationMap && window.google && !mapRef.current) {
      const mapElement = document.getElementById('destination-map');
      if (mapElement) {
        mapRef.current = new window.google.maps.Map(mapElement, {
          center: currentCoords || { lat: 19.0760, lng: 72.8777 },
          zoom: 13,
          mapTypeControl: true,
          streetViewControl: false
        });

        mapRef.current.addListener('click', handleMapClick);

        if (currentCoords) {
          new window.google.maps.Marker({
            position: currentCoords,
            map: mapRef.current,
            title: "Your Location",
            icon: {
              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
            }
          });
        }
      }
    }
  }, [showDestinationMap]);

  const fetchAmbulanceProfile = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ambulance/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.profile) {
        setAmbulanceProfile(data.profile);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchJunctions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/ambulance/junctions`, {
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
      const response = await fetch(`${API_BASE_URL}/ambulance/emergency/status`, {
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

    const shuffled = [...availableJunctions].sort(() => 0.5 - Math.random());
    const numJunctions = Math.floor(Math.random() * 3) + 2;
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
      alert("❌ Please:\n1. Set current location\n2. Select destination\n3. Generate route");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ambulance/emergency/start`, {
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
        setShowDestinationMap(false);
        alert("🚨 Emergency mode activated!\nTraffic signals will be prioritized along your route.");
        checkEmergencyStatus();
      } else {
        alert(data.error || "Failed to activate emergency");
      }
    } catch (error) {
      console.error("Emergency start error:", error);
      alert("Connection error. Using demo mode...");
      
      setEmergencyActive(true);
      setShowDestinationMap(false);
      setStatus({
        emergency_active: true,
        current_location: currentLocation,
        destination_location: destination,
        current_junction_index: 0,
        total_junctions: selectedJunctions.length,
        junctions: selectedJunctions.map(j => ({
          junction_name: j.junction_name,
          lane_number: j.lane_to_clear,
          is_cleared: false
        }))
      });
    } finally {
      setLoading(false);
    }
  };

  const stopEmergency = async () => {
    if (!window.confirm("Are you sure you want to stop emergency mode?")) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ambulance/emergency/stop`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.ok) {
        setEmergencyActive(false);
        setStatus(null);
        setSelectedJunctions([]);
        setCurrentCoords(null);
        setDestinationCoords(null);
        setCurrentLocation("");
        setDestination("");
        mapRef.current = null;
        markerRef.current = null;
        alert("Emergency mode deactivated");
        fetchAmbulanceProfile();
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

      {ambulanceProfile && (
        <div className="profile-card">
          <div className="profile-header">
            <h3>🚑 Ambulance Profile</h3>
            <span className="profile-status">
              {emergencyActive ? "🚨 ON EMERGENCY" : "🟢 READY"}
            </span>
          </div>
          <div className="profile-grid">
            <div className="profile-item">
              <span className="profile-label">Ambulance:</span>
              <span className="profile-value">{ambulanceProfile.ambulance_number}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Driver:</span>
              <span className="profile-value">{ambulanceProfile.driver_name}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Hospital:</span>
              <span className="profile-value">{ambulanceProfile.hospital_name || "Not specified"}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Total Emergencies:</span>
              <span className="profile-value badge">{ambulanceProfile.total_emergencies}</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Success Rate:</span>
              <span className="profile-value success">{ambulanceProfile.success_rate}%</span>
            </div>
            <div className="profile-item">
              <span className="profile-label">Last Active:</span>
              <span className="profile-value">
                {new Date(ambulanceProfile.last_active).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

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
            <label>📍 Current Location</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={currentLocation}
                placeholder="Example: Swargate, Pune"
                style={{ flex: 1 }}
                readOnly
              />
              <button
                type="button"
                onClick={fetchCurrentLocation}
                disabled={fetchingLocation}
                style={{
                  padding: '1rem 1.5rem',
                  background: 'var(--gradient-blue)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: fetchingLocation ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  opacity: fetchingLocation ? 0.6 : 1
                }}
              >
                {fetchingLocation ? '🔄 Getting...' : '📍 Use GPS'}
              </button>
            </div>
            <small style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
            
            </small>
          </div>

          <div className="form-group">
            <label>🎯 Destination</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={destination || searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => searchQuery && setShowSuggestions(true)}
                placeholder="Type: Hospital, Area name, Landmark..."
                style={{ 
                  width: '100%',
                  padding: '1rem',
                  background: 'var(--darker-card)',
                  border: '2px solid var(--dark-border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
                readOnly={!!destination}
              />
              
              {destination && (
                <button
                  type="button"
                  onClick={() => {
                    setDestination("");
                    setDestinationCoords(null);
                    if (markerRef.current) markerRef.current.setMap(null);
                  }}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'var(--danger)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  ✕
                </button>
              )}
              
              {/* Autocomplete Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && !destination && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--darker-card)',
                  border: '2px solid var(--primary)',
                  borderTop: 'none',
                  borderRadius: '0 0 var(--radius) var(--radius)',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  zIndex: 1000,
                  boxShadow: 'var(--shadow-lg)'
                }}>
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.place_id}
                      onClick={() => selectDestination(suggestion.place_id, suggestion.description)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: index < searchSuggestions.length - 1 ? '1px solid var(--dark-border)' : 'none',
                        transition: 'var(--transition)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dark-card)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '1.2rem' }}>📍</span>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                          {suggestion.structured_formatting.main_text}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {suggestion.structured_formatting.secondary_text}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <small style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>
            </small>
            
            <button
              type="button"
              onClick={() => {
                setShowDestinationMap(!showDestinationMap);
                if (!showDestinationMap) mapRef.current = null;
              }}
              style={{
                marginTop: '10px',
                padding: '0.75rem 1.5rem',
                background: showDestinationMap ? 'var(--primary)' : 'var(--gradient-blue)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontWeight: '600',
                width: '100%'
              }}
            >
              {showDestinationMap ? '❌ Close Map' : '🗺️ Or Select on Map'}
            </button>
          </div>

          {/* Map Section */}
          {showDestinationMap && (
            <div style={{
              background: 'var(--dark-card)',
              borderRadius: 'var(--radius)',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              border: '2px solid var(--primary)'
            }}>
              <h3 style={{ 
                marginBottom: '15px', 
                color: 'var(--text-primary)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px' 
              }}>
                <span>🗺️</span> Click anywhere on map to select
              </h3>

              <div 
                id="destination-map" 
                style={{ 
                  width: '100%', 
                  height: '400px', 
                  borderRadius: '10px',
                  border: '2px solid var(--dark-border)'
                }}
              />
            </div>
          )}

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
                background: 'var(--dark-card)',
                borderRadius: '10px',
                border: '2px dashed var(--dark-border)'
              }}>
                <p style={{ fontSize: '18px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
                  Click "Generate Route" to auto-generate emergency route
                </p>
              </div>
            )}
          </div>
          
          <button 
            className="activate-btn" 
            onClick={startEmergency} 
            disabled={loading || selectedJunctions.length === 0 || !currentLocation || !destination}
          >
            <span>🚨</span> 
            {loading ? "Activating Emergency..." : "ACTIVATE EMERGENCY MODE"}
          </button>

          <p className="note">
            This will notify traffic control centers and prioritize traffic signals 
            along your route. Use only in genuine emergencies.
          </p>
        </div>
      )}
    </div>
  );
}

export default AmbulanceDashboard;