import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import About from "./pages/About";
import Login from "./pages/Login";
import AmbulanceLogin from "./pages/AmbulanceLogin";
import AmbulanceDashboard from "./pages/AmbulanceDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AmbulanceRoute from "./components/AmbulanceRoute";
import "./App.css";
import AmbulanceRegistration from "./pages/AmbulanceRegistration";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      
      <Routes>
        {/* 🔁 ROOT → LOGIN CHOICE */}
        <Route path="/" element={<Login />} />
        
        {/* 🔓 LOGIN PAGES (PUBLIC) */}
        <Route path="/login" element={<Login />} />
        <Route path="/ambulance-login" element={<AmbulanceLogin />} />
        
        <Route path="/login-choice" element={
          <div className="choice-page">
            <h1>Smart Traffic Management System</h1>
            <div className="choice-buttons">
              <a href="/login" className="choice-btn admin-btn">
                <h3>Admin Login</h3>
                <p>Traffic Control Center</p>
              </a>
              <a href="/ambulance-login" className="choice-btn ambulance-btn">
                <h3>Ambulance Login</h3>
                <p>Emergency Vehicle Access</p>
              </a>
            </div>
          </div>
        } />

        <Route path="/ambulance-register" element={<AmbulanceRegistration />} />
        
        {/* 🏠 HOME (ADMIN) */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        
        {/* 🔐 ADMIN PANEL */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        
        {/* 🚑 AMBULANCE DASHBOARD */}
        <Route
          path="/ambulance-dashboard"
          element={
            <AmbulanceRoute>
              <AmbulanceDashboard />
            </AmbulanceRoute>
          }
        />
        
        {/* ℹ ABOUT */}
        <Route
          path="/about"
          element={
            <ProtectedRoute>
              <About />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;