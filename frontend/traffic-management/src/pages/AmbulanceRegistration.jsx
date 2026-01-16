import { useState, useEffect } from "react"; // ✅ Added useEffect
import { useNavigate, Link } from "react-router-dom";
import "./AmbulanceRegistration.css";

function AmbulanceRegistration() {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    ambulanceNumber: "",
    driverName: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    hospitalName: "",
    customHospital: "",
    licenseNumber: "",
    ambulanceType: "basic",
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [showCustomHospital, setShowCustomHospital] = useState(false);

  // ✅ FIXED: Use useEffect instead of useState for side effects
  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/ambulance/hospitals");
      const data = await response.json();
      setHospitals(data.hospitals || []);
    } catch (error) {
      console.error("Failed to fetch hospitals:", error);
      // Fallback hospitals for demo
      setHospitals([
        { id: 1, name: "City General Hospital", location: "Downtown" },
        { id: 2, name: "Medicare Hospital", location: "North Zone" },
        { id: 3, name: "Emergency Care Center", location: "East Zone" },
        { id: 4, name: "Trauma Speciality Hospital", location: "West Zone" }
      ]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Reset errors
    if (error) setError("");
    
    // Show custom hospital input if "other" is selected
    if (name === "hospitalName" && value === "other") {
      setShowCustomHospital(true);
    } else if (name === "hospitalName") {
      setShowCustomHospital(false);
    }
  };

  const validateForm = () => {
    // Ambulance number validation
    if (!formData.ambulanceNumber.startsWith('AMB') || 
        !/^AMB\d{3,}$/.test(formData.ambulanceNumber)) {
      setError("Ambulance number must start with 'AMB' followed by numbers (e.g., AMB001)");
      return false;
    }
    
    // Driver name validation
    if (formData.driverName.length < 3) {
      setError("Driver name must be at least 3 characters");
      return false;
    }
    
    // Phone validation
    if (!/^\d{10}$/.test(formData.phoneNumber)) {
      setError("Phone number must be 10 digits");
      return false;
    }
    
    // Password validation
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    // Hospital selection
    if (!formData.hospitalName && !formData.customHospital) {
      setError("Please select or enter a hospital name");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const registrationData = {
        ambulance_number: formData.ambulanceNumber.toUpperCase(),
        driver_name: formData.driverName,
        phone_number: formData.phoneNumber,
        password: formData.password,
        hospital_name: formData.customHospital || formData.hospitalName,
        license_number: formData.licenseNumber,
        ambulance_type: formData.ambulanceType
      };
      
      const response = await fetch("http://127.0.0.1:5000/ambulance/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess("✅ Registration successful! Redirecting to login...");
        
        // Store token and data
        localStorage.setItem("ambulance_token", data.token);
        localStorage.setItem("ambulance_data", JSON.stringify(data.ambulance));
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate("/ambulance-dashboard");
        }, 2000);
      } else {
        setError(data.error || "Registration failed");
      }
    } catch (err) {
      setError("Connection error. Please check backend.");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <div className="registration-card">
        {/* Header */}
        <div className="registration-header">
          <div className="logo">
            <span className="logo-icon">🚑</span>
            <h1>AMBULANCE REGISTRATION</h1>
          </div>
          <p className="subtitle">Register for Emergency Traffic Priority System</p>
        </div>

        {/* Progress Steps - Simplified */}
        <div className="progress-steps">
          <div className="step active">
            <div className="step-number">1</div>
            <div className="step-label">Details</div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-label">Security</div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-label">Complete</div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="alert error">
            <span className="alert-icon">❌</span>
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert success">
            <span className="alert-icon">✅</span>
            {success}
          </div>
        )}

        {/* Registration Form - Simplified */}
        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">🚑</span>
              Ambulance Details
            </h3>
            
            <div className="form-group">
              <label className="form-label">Ambulance Number *</label>
              <input
                type="text"
                name="ambulanceNumber"
                value={formData.ambulanceNumber}
                onChange={handleChange}
                placeholder="AMB001"
                required
                className="form-input"
                pattern="AMB\d+"
                title="Format: AMB followed by numbers"
              />
              <div className="input-hint">Format: AMB followed by numbers (e.g., AMB001)</div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Driver Name *</label>
                <input
                  type="text"
                  name="driverName"
                  value={formData.driverName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="9876543210"
                  required
                  className="form-input"
                  pattern="\d{10}"
                  maxLength="10"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">🏥</span>
              Hospital Information
            </h3>
            
            <div className="form-group">
              <label className="form-label">Select Hospital *</label>
              <select
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleChange}
                className="form-select"
                required={!showCustomHospital}
              >
                <option value="">Choose a hospital...</option>
                {hospitals.map(hospital => (
                  <option key={hospital.id} value={hospital.name}>
                    {hospital.name} - {hospital.location}
                  </option>
                ))}
                <option value="other">Other (Enter manually)</option>
              </select>
            </div>
            
            {showCustomHospital && (
              <div className="form-group">
                <label className="form-label">Hospital Name *</label>
                <input
                  type="text"
                  name="customHospital"
                  value={formData.customHospital}
                  onChange={handleChange}
                  placeholder="Enter hospital name"
                  required={showCustomHospital}
                  className="form-input"
                />
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <span className="section-icon">🔐</span>
              Security
            </h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create password"
                  required
                  className="form-input"
                  minLength="6"
                />
                <div className="input-hint">Minimum 6 characters</div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required
                  className={`form-input ${formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword ? 'error' : ''}`}
                />
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <div className="error-text">Passwords don't match</div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="register-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="button-spinner"></div>
                REGISTERING...
              </>
            ) : (
              <>
                <span className="button-icon">🚑</span>
                REGISTER AMBULANCE
              </>
            )}
          </button>

          {/* Login Link */}
          <div className="login-link">
            Already registered? 
            <Link to="/ambulance-login" className="link"> Login here</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AmbulanceRegistration;