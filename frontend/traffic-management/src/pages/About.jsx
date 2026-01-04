function About() {
  return (
    <div className="about-page">
      <h1>📘 About AI Traffic Management System</h1>

      <p className="about-intro">
        The <b>AI Traffic Management System</b> is an intelligent traffic control
        solution designed to prioritize emergency vehicles at road intersections
        using computer vision and real-time signal simulation.
      </p>

      <div className="about-section">
        <h2>🎯 Problem Statement</h2>
        <p>
          Traditional traffic signals are static and do not adapt to real-time
          emergencies. Emergency vehicles such as ambulances often get stuck in
          traffic, leading to delays that can cost lives.
        </p>
      </div>

      <div className="about-section">
        <h2>⚙️ System Architecture</h2>
        <ul>
          <li>Traffic camera provides live or recorded video input</li>
          <li>YOLO deep learning model detects emergency vehicles</li>
          <li>Flask backend processes detection results</li>
          <li>Traffic signal controller updates signals dynamically</li>
          <li>React frontend displays live signals and results</li>
        </ul>
      </div>

      <div className="about-section">
        <h2>🚦 Key Features</h2>
        <ul>
          <li>Real-time emergency vehicle detection</li>
          <li>Dynamic traffic signal switching</li>
          <li>Safe yellow-light transition before emergency</li>
          <li>Admin override control panel</li>
          <li>Live signal dashboard</li>
        </ul>
      </div>

      <div className="about-section">
        <h2>🧪 Technologies Used</h2>
        <ul>
          <li><b>Frontend:</b> React.js, Vite</li>
          <li><b>Backend:</b> Python, Flask</li>
          <li><b>AI Model:</b> YOLO (Ultralytics)</li>
          <li><b>Video Processing:</b> OpenCV</li>
        </ul>
      </div>

      <div className="about-section">
        <h2>📚 Academic Purpose</h2>
        <p>
          This project is developed as an academic simulation to demonstrate
          the application of Artificial Intelligence and computer vision in
          smart city traffic management systems.
        </p>
      </div>

      <p className="about-footer">
        🚀 Designed & implemented as an intelligent traffic control prototype.
      </p>
    </div>
  );
}

export default About;
