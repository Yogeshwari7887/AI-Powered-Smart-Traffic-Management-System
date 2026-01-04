from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import sqlite3  # Add this import
import json     # Add this import

from emergency_core import analyze_video
from signal_controller import controller
from database import db
from ambulance_auth import ambulance_auth

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

# Register ambulance auth blueprint
app.register_blueprint(ambulance_auth, url_prefix='/ambulance')

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "output"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# ---------------- VIDEO ANALYSIS ----------------

@app.route("/analyze", methods=["POST"])
def analyze():
    if "video" not in request.files:
        return jsonify({"error": "No video uploaded"}), 400
    
    # Get junction from request (default to Main Square)
    junction_name = request.form.get("junction", "Main Square Junction")
    
    video = request.files["video"]
    video_path = os.path.join(UPLOAD_FOLDER, video.filename)
    video.save(video_path)

    # Analyze with junction parameter
    result = analyze_video(video_path, junction_name)
    
    return jsonify(result)

@app.route("/output/<filename>")
def get_output_video(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

# ---------------- SIGNAL API ----------------

@app.route("/signal-status", methods=["GET"])
def signal_status():
    try:
        return jsonify(controller.get_status())
    except Exception as e:
        print("❌ ERROR in /signal-status:", e)
        return jsonify({
            "error": "Signal controller failed",
            "details": str(e)
        }), 500


# ---------------- EMERGENCY MONITORING ----------------

@app.route("/emergencies/active", methods=["GET"])
def get_active_emergencies():
    """Get all active emergency requests"""
    emergencies = db.get_active_emergencies()
    return jsonify({"emergencies": emergencies})

@app.route("/emergencies/clear/<int:emergency_id>", methods=["POST"])
def clear_emergency(emergency_id):
    """Manually clear an emergency request"""
    conn = sqlite3.connect(db.db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE emergency_requests 
        SET is_active = 0, emergency_end_time = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (emergency_id,))
    
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Emergency cleared"})

@app.route("/junctions", methods=["GET"])
def get_junctions():
    """Get list of all junctions"""
    junctions = db.get_junctions_list()
    return jsonify({"junctions": junctions})

# ---------------- ADMIN API ----------------

@app.route("/admin/force-emergency", methods=["POST"])
def force_emergency():
    data = request.json
    lane = data.get("lane", "LANE_1")
    junction = data.get("junction", "Main Square Junction")
    
    controller.trigger_emergency(lane, junction)
    
    return jsonify({
        "status": "EMERGENCY ACTIVATED", 
        "lane": lane,
        "junction": junction
    })

@app.route("/admin/reset", methods=["POST"])
def reset_signal():
    controller.reset()
    return jsonify({"status": "RESET TO NORMAL"})

@app.route("/admin/set-duration", methods=["POST"])
def set_duration():
    data = request.json
    seconds = int(data.get("seconds", 15))
    controller.set_duration(seconds)
    return jsonify({"priority_duration": seconds})

@app.route("/admin/toggle-priority", methods=["POST"])
def toggle_priority():
    data = request.json
    enabled = bool(data.get("enabled", True))
    controller.toggle_priority(enabled)
    return jsonify({"priority_enabled": enabled})

# Add this import at the top
import sqlite3

# Add this new endpoint after existing endpoints
@app.route("/emergencies/junction/<junction_name>", methods=["GET"])
def get_emergencies_for_junction(junction_name):
    """Get all active emergencies for a specific junction"""
    conn = sqlite3.connect("traffic_db.sqlite3")
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT er.id, er.ambulance_number, er.current_location, 
               er.destination_location, er.current_junction_index, 
               er.total_junctions, er.emergency_start_time,
               ej.lane_number, ej.is_cleared
        FROM emergency_requests er
        JOIN emergency_junctions ej ON er.id = ej.emergency_request_id
        WHERE er.is_active = 1 
        AND ej.junction_name = ?
        AND ej.is_cleared = 0
        ORDER BY er.emergency_start_time ASC
    ''', (junction_name,))
    
    rows = cursor.fetchall()
    conn.close()
    
    emergencies = []
    for row in rows:
        emergencies.append({
            "id": row[0],
            "ambulance_number": row[1],
            "current_location": row[2],
            "destination_location": row[3],
            "current_junction_index": row[4],
            "total_junctions": row[5],
            "emergency_start_time": row[6],
            "lane_to_clear": row[7],
            "is_cleared": bool(row[8])
        })
    
    return jsonify({
        "junction": junction_name,
        "active_emergencies": emergencies,
        "count": len(emergencies)
    })

# Also add this endpoint to get all junctions with active emergencies
@app.route("/emergencies/by-junction", methods=["GET"])
def get_emergencies_by_junction():
    """Get all junctions with active emergencies"""
    conn = sqlite3.connect("traffic_db.sqlite3")
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT DISTINCT ej.junction_name, 
               COUNT(er.id) as active_count,
               GROUP_CONCAT(er.ambulance_number) as ambulance_numbers
        FROM emergency_requests er
        JOIN emergency_junctions ej ON er.id = ej.emergency_request_id
        WHERE er.is_active = 1 
        AND ej.is_cleared = 0
        GROUP BY ej.junction_name
        ORDER BY ej.junction_name
    ''')
    
    rows = cursor.fetchall()
    conn.close()
    
    junctions = []
    for row in rows:
        junctions.append({
            "junction_name": row[0],
            "active_emergencies": row[1],
            "ambulance_numbers": row[2].split(',') if row[2] else []
        })
    
    return jsonify({"junctions_with_emergencies": junctions})

# Add these new endpoints

@app.route("/all-junctions-status", methods=["GET"])
def get_all_junctions_status():
    """Get signal status for ALL junctions"""
    return jsonify(controller.get_all_junctions_status())

@app.route("/junction-status/<junction_name>", methods=["GET"])
def get_junction_status(junction_name):
    """Get signal status for specific junction"""
    status = controller.get_junction_status(junction_name)
    if status:
        return jsonify(status)
    return jsonify({"error": "Junction not found"}), 404

@app.route("/monitor-junction", methods=["POST"])
def monitor_junction():
    """Add junction to monitoring list"""
    data = request.json
    junction_name = data.get("junction_name")
    
    # You can implement monitoring logic here
    return jsonify({
        "message": f"Junction {junction_name} added to monitoring",
        "junction": junction_name
    })

@app.route("/reset-junction/<junction_name>", methods=["POST"])
def reset_junction(junction_name):
    """Reset specific junction to normal mode"""
    controller.reset_junction(junction_name)
    return jsonify({
        "message": f"Junction {junction_name} reset to normal",
        "junction": junction_name
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)