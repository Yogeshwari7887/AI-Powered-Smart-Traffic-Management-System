import sqlite3
from datetime import datetime
import json
import os
import hashlib
import secrets


class TrafficDatabase:
    def __init__(self, db_path="traffic_db.sqlite3"):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Ambulance/User Table - UPDATED with hospital_name
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ambulances (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ambulance_number TEXT UNIQUE NOT NULL,
                driver_name TEXT,
                phone_number TEXT,
                password_hash TEXT,
                hospital_name TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Junction Table (Sample junctions)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS junctions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                junction_name TEXT UNIQUE NOT NULL,
                total_lanes INTEGER DEFAULT 4,
                location TEXT,
                description TEXT
            )
        """
        )

        # Emergency Requests Table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS emergency_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ambulance_id INTEGER NOT NULL,
                ambulance_number TEXT NOT NULL,
                current_location TEXT NOT NULL,
                destination_location TEXT NOT NULL,
                route_data TEXT, -- JSON containing junctions and lanes
                is_active BOOLEAN DEFAULT 1,
                current_junction_index INTEGER DEFAULT 0,
                total_junctions INTEGER DEFAULT 0,
                emergency_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                emergency_end_time TIMESTAMP,
                FOREIGN KEY (ambulance_id) REFERENCES ambulances (id)
            )
        """
        )

        # Junction-Lane Mapping for Emergency
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS emergency_junctions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emergency_request_id INTEGER NOT NULL,
                junction_id INTEGER NOT NULL,
                junction_name TEXT NOT NULL,
                lane_number INTEGER NOT NULL,
                is_cleared BOOLEAN DEFAULT 0,
                cleared_at TIMESTAMP,
                FOREIGN KEY (emergency_request_id) REFERENCES emergency_requests (id),
                FOREIGN KEY (junction_id) REFERENCES junctions (id)
            )
        """
        )

        # Detection Log
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS detection_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                emergency_request_id INTEGER,
                ambulance_number TEXT,
                junction_name TEXT,
                lane_number INTEGER,
                detection_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                video_filename TEXT,
                confidence REAL,
                status TEXT -- 'detected', 'cleared', 'missed'
            )
        """
        )

        # Add ambulance profiles table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ambulance_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ambulance_id INTEGER UNIQUE NOT NULL,
                total_emergencies INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 100.0,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ambulance_id) REFERENCES ambulances (id)
            )
        """
        )

        # Add hospital table (optional)
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS hospitals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                location TEXT,
                contact_number TEXT,
                emergency_contact TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Try to add hospital_name column if it doesn't exist
        try:
            cursor.execute("ALTER TABLE ambulances ADD COLUMN hospital_name TEXT")
        except sqlite3.OperationalError:
            pass  # Column already exists

        # Insert sample junctions
        sample_junctions = [
            (
                "Main Square Junction",
                4,
                "Downtown Center",
                "Main intersection near hospital",
            ),
            ("Tech Park Crossing", 4, "IT Park Road", "Near technology park"),
            ("River Bridge Intersection", 3, "River Side", "Bridge crossing point"),
            ("Mall Circle Junction", 4, "Shopping District", "Near central mall"),
            ("University Crossing", 4, "Campus Road", "University entrance"),
        ]

        cursor.execute("SELECT COUNT(*) FROM junctions")
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                "INSERT INTO junctions (junction_name, total_lanes, location, description) VALUES (?, ?, ?, ?)",
                sample_junctions,
            )

        # Insert sample ambulance (for demo) - UPDATED with hospital_name
        cursor.execute("SELECT COUNT(*) FROM ambulances")
        if cursor.fetchone()[0] == 0:
            cursor.execute(
                """INSERT INTO ambulances 
                   (ambulance_number, driver_name, phone_number, password_hash, hospital_name) 
                   VALUES (?, ?, ?, ?, ?)""",
                (
                    "AMB001",
                    "John Doe",
                    "9876543210",
                    "admin123",
                    "City General Hospital",
                ),
            )

        # Insert sample hospitals
        sample_hospitals = [
            ("City General Hospital", "Downtown Area", "9876543210", "9876543211"),
            ("Medicare Hospital", "North Zone", "9876543212", "9876543213"),
            ("Emergency Care Center", "East Zone", "9876543214", "9876543215"),
            ("Trauma Speciality Hospital", "West Zone", "9876543216", "9876543217"),
        ]

        cursor.execute("SELECT COUNT(*) FROM hospitals")
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                "INSERT INTO hospitals (name, location, contact_number, emergency_contact) VALUES (?, ?, ?, ?)",
                sample_hospitals,
            )

        conn.commit()
        conn.close()

    # Ambulance authentication methods
    def authenticate_ambulance(self, ambulance_number, password):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            "SELECT id, ambulance_number, driver_name, hospital_name FROM ambulances WHERE ambulance_number = ? AND password_hash = ? AND is_active = 1",
            (ambulance_number, password),
        )

        result = cursor.fetchone()
        conn.close()

        if result:
            return {
                "id": result[0],
                "ambulance_number": result[1],
                "driver_name": result[2],
                "hospital_name": result[3],
            }
        return None

    def register_ambulance(
        self, ambulance_number, driver_name, phone_number, password_hash, hospital_name=None
    ):
        """Register new ambulance"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Check if ambulance already exists
        cursor.execute(
            """
            SELECT id FROM ambulances WHERE ambulance_number = ?
        """,
            (ambulance_number,),
        )

        if cursor.fetchone():
            conn.close()
            return {"error": "Ambulance already registered"}

        # Insert new ambulance
        cursor.execute(
            """
            INSERT INTO ambulances 
            (ambulance_number, driver_name, phone_number, password_hash, hospital_name, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        """,
            (ambulance_number, driver_name, phone_number, password_hash, hospital_name),
        )

        ambulance_id = cursor.lastrowid

        # Create ambulance profile entry
        cursor.execute(
            """
            INSERT INTO ambulance_profiles 
            (ambulance_id, total_emergencies, success_rate, last_active)
            VALUES (?, 0, 100.0, CURRENT_TIMESTAMP)
        """,
            (ambulance_id,),
        )

        conn.commit()
        conn.close()

        return {
            "id": ambulance_id,
            "ambulance_number": ambulance_number,
            "driver_name": driver_name,
            "message": "Registration successful",
        }

    def get_ambulance_profile(self, ambulance_number):
        """Get ambulance profile with stats"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT a.*, p.total_emergencies, p.success_rate, p.last_active
            FROM ambulances a
            LEFT JOIN ambulance_profiles p ON a.id = p.ambulance_id
            WHERE a.ambulance_number = ?
        """,
            (ambulance_number,),
        )

        result = cursor.fetchone()
        conn.close()

        if result:
            return {
                "id": result[0],
                "ambulance_number": result[1],
                "driver_name": result[2],
                "phone_number": result[3],
                "hospital_name": result[4],
                "total_emergencies": result[8],
                "success_rate": result[9],
                "last_active": result[10],
            }
        return None

    def update_ambulance_profile(self, ambulance_id, data):
        """Update ambulance profile"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Update profile stats after emergency completion
        if "emergency_completed" in data:
            cursor.execute(
                """
                UPDATE ambulance_profiles 
                SET total_emergencies = total_emergencies + 1,
                    last_active = CURRENT_TIMESTAMP
                WHERE ambulance_id = ?
            """,
                (ambulance_id,),
            )

        conn.commit()
        conn.close()
        return True

    # Emergency request methods
    def create_emergency_request(
        self, ambulance_id, ambulance_number, current_loc, destination_loc, route_data
    ):
        """Create new emergency request with route junctions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Parse route data (JSON string containing junctions and lanes)
        route_info = json.loads(route_data)
        junctions = route_info.get("junctions", [])

        # Insert emergency request
        cursor.execute(
            """
            INSERT INTO emergency_requests 
            (ambulance_id, ambulance_number, current_location, destination_location, route_data, total_junctions)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (ambulance_id, ambulance_number, current_loc, destination_loc, route_data, len(junctions)),
        )

        request_id = cursor.lastrowid

        # Insert junction details for this emergency
        for i, junction in enumerate(junctions):
            cursor.execute(
                """
                INSERT INTO emergency_junctions 
                (emergency_request_id, junction_id, junction_name, lane_number)
                VALUES (?, ?, ?, ?)
            """,
                (request_id, junction["junction_id"], junction["junction_name"], junction["lane_to_clear"]),
            )

        conn.commit()
        conn.close()
        return request_id

    def get_active_emergencies(self):
        """Get all active emergency requests"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT er.id, er.ambulance_number, er.current_location, er.destination_location,
                   er.current_junction_index, er.total_junctions, er.emergency_start_time,
                   ej.junction_name, ej.lane_number, ej.is_cleared
            FROM emergency_requests er
            LEFT JOIN emergency_junctions ej ON er.id = ej.emergency_request_id 
                AND ej.is_cleared = 0
            WHERE er.is_active = 1
            ORDER BY er.emergency_start_time DESC
        """
        )

        rows = cursor.fetchall()
        conn.close()

        # Group by emergency request
        emergencies = {}
        for row in rows:
            req_id = row[0]
            if req_id not in emergencies:
                emergencies[req_id] = {
                    "id": row[0],
                    "ambulance_number": row[1],
                    "current_location": row[2],
                    "destination_location": row[3],
                    "current_junction_index": row[4],
                    "total_junctions": row[5],
                    "emergency_start_time": row[6],
                    "next_junction": row[7] if row[7] else None,
                    "lane_to_clear": row[8] if row[8] else None,
                    "pending_junctions": [],
                }
            if row[7]:  # If there's a junction
                emergencies[req_id]["pending_junctions"].append(
                    {
                        "junction_name": row[7],
                        "lane_number": row[8],
                        "is_cleared": bool(row[9]),
                    }
                )

        return list(emergencies.values())

    def update_junction_status(self, emergency_request_id, junction_name, detected=True):
        """Mark a junction as cleared when ambulance is detected"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        if detected:
            # Mark current junction as cleared
            cursor.execute(
                """
                UPDATE emergency_junctions 
                SET is_cleared = 1, cleared_at = CURRENT_TIMESTAMP
                WHERE emergency_request_id = ? AND junction_name = ? AND is_cleared = 0
            """,
                (emergency_request_id, junction_name),
            )

            # Update current junction index
            cursor.execute(
                """
                UPDATE emergency_requests 
                SET current_junction_index = current_junction_index + 1
                WHERE id = ? AND is_active = 1
            """,
                (emergency_request_id,),
            )

            # Check if all junctions are cleared
            cursor.execute(
                """
                SELECT COUNT(*) FROM emergency_junctions 
                WHERE emergency_request_id = ? AND is_cleared = 0
            """,
                (emergency_request_id,),
            )

            pending_count = cursor.fetchone()[0]

            if pending_count == 0:
                # All junctions cleared, end emergency
                cursor.execute(
                    """
                    UPDATE emergency_requests 
                    SET is_active = 0, emergency_end_time = CURRENT_TIMESTAMP
                    WHERE id = ?
                """,
                    (emergency_request_id,),
                )

        conn.commit()
        conn.close()
        return True

    def get_junctions_list(self):
        """Get all available junctions"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, junction_name, total_lanes, location FROM junctions ORDER BY junction_name"
        )
        junctions = cursor.fetchall()
        conn.close()

        return [
            {
                "id": j[0],
                "name": j[1],
                "lanes": j[2],
                "location": j[3],
            }
            for j in junctions
        ]

    def get_hospitals_list(self):
        """Get list of hospitals"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, location FROM hospitals ORDER BY name")
        hospitals = cursor.fetchall()
        conn.close()

        return [
            {
                "id": h[0],
                "name": h[1],
                "location": h[2],
            }
            for h in hospitals
        ]

    def log_detection(
        self, ambulance_number, junction_name, lane_number, video_file, confidence, status
    ):
        """Log ambulance detection"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        # Get emergency request ID
        cursor.execute(
            "SELECT id FROM emergency_requests WHERE ambulance_number = ? AND is_active = 1 LIMIT 1",
            (ambulance_number,),
        )
        req_result = cursor.fetchone()
        req_id = req_result[0] if req_result else None

        cursor.execute(
            """
            INSERT INTO detection_logs 
            (emergency_request_id, ambulance_number, junction_name, lane_number, video_filename, confidence, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
            (req_id, ambulance_number, junction_name, lane_number, video_file, confidence, status),
        )

        conn.commit()
        conn.close()

def create_emergency_request(
    self, ambulance_id, ambulance_number, current_loc, destination_loc, route_data
):
    """Create new emergency request with route junctions - WITH ERROR HANDLING"""
    conn = sqlite3.connect(self.db_path)
    cursor = conn.cursor()
    
    try:
        # Parse route data (JSON string containing junctions and lanes)
        if isinstance(route_data, str):
            route_info = json.loads(route_data)
        else:
            route_info = route_data
            
        junctions = route_info.get("junctions", [])
        
        # Validate we have junctions
        if not junctions:
            # Create default demo junctions
            cursor.execute("SELECT id, junction_name, total_lanes FROM junctions LIMIT 3")
            available_junctions = cursor.fetchall()
            
            if available_junctions:
                junctions = [
                    {
                        "junction_id": j[0],
                        "junction_name": j[1],
                        "lane_to_clear": 1  # Default to lane 1
                    }
                    for j in available_junctions[:2]  # Use first 2 junctions
                ]
            else:
                # Fallback demo junctions
                junctions = [
                    {"junction_id": 1, "junction_name": "Main Square Junction", "lane_to_clear": 1},
                    {"junction_id": 2, "junction_name": "Tech Park Crossing", "lane_to_clear": 2},
                ]
        
        # Insert emergency request
        cursor.execute(
            """
            INSERT INTO emergency_requests 
            (ambulance_id, ambulance_number, current_location, destination_location, route_data, total_junctions)
            VALUES (?, ?, ?, ?, ?, ?)
        """,
            (ambulance_id, ambulance_number, current_loc, destination_loc, 
             json.dumps({"junctions": junctions}), len(junctions)),
        )
        
        request_id = cursor.lastrowid
        
        # Insert junction details for this emergency
        for i, junction in enumerate(junctions):
            cursor.execute(
                """
                INSERT INTO emergency_junctions 
                (emergency_request_id, junction_id, junction_name, lane_number)
                VALUES (?, ?, ?, ?)
            """,
                (request_id, junction.get("junction_id", i+1), 
                 junction.get("junction_name", f"Junction {i+1}"), 
                 junction.get("lane_to_clear", 1)),
            )
        
        conn.commit()
        return request_id
        
    except Exception as e:
        conn.rollback()
        raise e
        
    finally:
        conn.close()

def hash_password(password):
    """Simple password hashing for demo"""
    salt = secrets.token_hex(8)
    hash_obj = hashlib.sha256((password + salt).encode())
    return f"{hash_obj.hexdigest()}:{salt}"


def verify_password(stored_hash, password):
    """Verify password against stored hash"""
    hash_value, salt = stored_hash.split(":")
    test_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return test_hash == hash_value


# Global database instance
db = TrafficDatabase()