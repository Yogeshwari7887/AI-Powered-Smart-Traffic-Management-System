from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import datetime
from database import db
import json
import sqlite3
ambulance_auth = Blueprint('ambulance_auth', __name__)
SECRET_KEY = "traffic_emergency_secret_2024"

def token_required(f):
    """Decorator to require JWT token for ambulance routes"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        
        try:
            token = token.split(" ")[1]  # Remove "Bearer "
            data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            current_user = data['ambulance_number']
        except:
            return jsonify({"error": "Token is invalid"}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

@ambulance_auth.route('/login', methods=['POST'])
def ambulance_login():
    """Login for ambulance drivers"""
    data = request.json
    ambulance_number = data.get('ambulance_number')
    password = data.get('password')
    
    if not ambulance_number or not password:
        return jsonify({"error": "Ambulance number and password required"}), 400
    
    ambulance = db.authenticate_ambulance(ambulance_number, password)
    
    if ambulance:
        # Generate JWT token
        token = jwt.encode({
            'ambulance_number': ambulance['ambulance_number'],
            'driver_name': ambulance['driver_name'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, SECRET_KEY, algorithm="HS256")
        
        return jsonify({
            "message": "Login successful",
            "token": token,
            "ambulance": ambulance
        }), 200
    else:
        return jsonify({"error": "Invalid credentials"}), 401

@ambulance_auth.route('/junctions', methods=['GET'])
def get_junctions():
    """Get list of available junctions"""
    junctions = db.get_junctions_list()
    return jsonify({"junctions": junctions}), 200

@ambulance_auth.route('/emergency/start', methods=['POST'])
@token_required
def start_emergency(current_user):
    """Start emergency mode with route information"""
    data = request.json
    
    required_fields = ['current_location', 'destination_location', 'route_data']
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400
    
    # Get ambulance ID
    ambulance = db.authenticate_ambulance(current_user, "admin123")  # Simplified for demo
    
    if not ambulance:
        return jsonify({"error": "Ambulance not found"}), 404
    
    # Create emergency request
    request_id = db.create_emergency_request(
        ambulance_id=ambulance['id'],
        ambulance_number=current_user,
        current_loc=data['current_location'],
        destination_loc=data['destination_location'],
        route_data= json.dumps(data['route_data'])
    )
    
    return jsonify({
        "message": "Emergency mode activated",
        "request_id": request_id,
        "ambulance_number": current_user
    }), 201

@ambulance_auth.route('/emergency/stop', methods=['POST'])
@token_required
def stop_emergency(current_user):
    """Manually stop emergency mode"""
    # Find active emergency for this ambulance
    conn = sqlite3.connect(db.db_path)
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE emergency_requests 
        SET is_active = 0, emergency_end_time = CURRENT_TIMESTAMP
        WHERE ambulance_number = ? AND is_active = 1
    ''', (current_user,))
    
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Emergency mode deactivated"}), 200

@ambulance_auth.route('/emergency/status', methods=['GET'])
@token_required
def get_emergency_status(current_user):
    """Get current emergency status for ambulance"""
    conn = sqlite3.connect("traffic_db.sqlite3")
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT er.*, 
               GROUP_CONCAT(ej.junction_name || '|' || ej.lane_number || '|' || ej.is_cleared) as junctions
        FROM emergency_requests er
        LEFT JOIN emergency_junctions ej ON er.id = ej.emergency_request_id
        WHERE er.ambulance_number = ? AND er.is_active = 1
        GROUP BY er.id
    ''', (current_user,))
    
    result = cursor.fetchone()
    conn.close()
    
    if not result:
        return jsonify({"emergency_active": False}), 200
    
    # Parse junctions
    junctions_data = []
    if result[10]:  # junctions field
        for junc in result[10].split(','):
            parts = junc.split('|')
            if len(parts) == 3:
                junctions_data.append({
                    "junction_name": parts[0],
                    "lane_number": int(parts[1]),
                    "is_cleared": bool(int(parts[2]))
                })
    
    return jsonify({
        "emergency_active": True,
        "request_id": result[0],
        "current_location": result[3],
        "destination_location": result[4],
        "current_junction_index": result[7],
        "total_junctions": result[8],
        "start_time": result[9],
        "junctions": junctions_data
    }), 200