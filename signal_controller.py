import time
import threading
import sqlite3

# Signal timing constants
GREEN_TIME = 10
YELLOW_TIME = 5

class TrafficSignalController:
    def __init__(self):
        # Each junction has its own signal state
        self.junctions = {
            "Main Square Junction": {
                "lanes": ["LANE_1", "LANE_2", "LANE_3", "LANE_4"],
                "current_index": 0,
                "current_green": "LANE_1",
                "current_phase": "GREEN",
                "mode": "NORMAL",
                "emergency_lane": None,
                "timer": GREEN_TIME,  # Timer for current phase
                "last_update": time.time()
            },
            "Tech Park Crossing": {
                "lanes": ["LANE_1", "LANE_2", "LANE_3", "LANE_4"],
                "current_index": 0,
                "current_green": "LANE_1",
                "current_phase": "GREEN",
                "mode": "NORMAL",
                "emergency_lane": None,
                "timer": GREEN_TIME,
                "last_update": time.time()
            },
            "River Bridge Intersection": {
                "lanes": ["LANE_1", "LANE_2", "LANE_3"],
                "current_index": 0,
                "current_green": "LANE_1",
                "current_phase": "GREEN",
                "mode": "NORMAL",
                "emergency_lane": None,
                "timer": GREEN_TIME,
                "last_update": time.time()
            },
            "Mall Circle Junction": {
                "lanes": ["LANE_1", "LANE_2", "LANE_3", "LANE_4"],
                "current_index": 0,
                "current_green": "LANE_1",
                "current_phase": "GREEN",
                "mode": "NORMAL",
                "emergency_lane": None,
                "timer": GREEN_TIME,
                "last_update": time.time()
            },
            "University Crossing": {
                "lanes": ["LANE_1", "LANE_2", "LANE_3", "LANE_4"],
                "current_index": 0,
                "current_green": "LANE_1",
                "current_phase": "GREEN",
                "mode": "NORMAL",
                "emergency_lane": None,
                "timer": GREEN_TIME,
                "last_update": time.time()
            }
        }
        
        self.priority_enabled = True
        self.priority_duration = 15
        self.lock = threading.Lock()
        
        # Start timer update thread
        threading.Thread(target=self._update_timers, daemon=True).start()
        
        # Start normal cycles for all junctions
        for junction_name in self.junctions.keys():
            threading.Thread(
                target=self._normal_cycle, 
                args=(junction_name,), 
                daemon=True
            ).start()

    def _update_timers(self):
        """Update timers for all junctions"""
        while True:
            with self.lock:
                current_time = time.time()
                for junction_name, junction in self.junctions.items():
                    if junction["mode"] == "NORMAL":
                        elapsed = current_time - junction["last_update"]
                        if elapsed >= 1:  # Update every second
                            junction["timer"] = max(0, junction["timer"] - int(elapsed))
                            junction["last_update"] = current_time
                            
                            # Reset timer when it reaches 0
                            if junction["timer"] <= 0:
                                if junction["current_phase"] == "GREEN":
                                    junction["timer"] = YELLOW_TIME
                                elif junction["current_phase"] == "YELLOW":
                                    junction["timer"] = GREEN_TIME
            time.sleep(0.5)  # Check every half second

    def _normal_cycle(self, junction_name):
        """Normal signal cycle for a specific junction"""
        while True:
            with self.lock:
                junction = self.junctions[junction_name]
                if junction["mode"] != "NORMAL":
                    time.sleep(1)
                    continue
                
                # Set green phase
                junction["current_green"] = junction["lanes"][junction["current_index"]]
                junction["current_phase"] = "GREEN"
                junction["timer"] = GREEN_TIME
                junction["last_update"] = time.time()

            time.sleep(GREEN_TIME)

            with self.lock:
                if self.junctions[junction_name]["mode"] != "NORMAL":
                    continue
                # Set yellow phase
                junction["current_phase"] = "YELLOW"
                junction["timer"] = YELLOW_TIME
                junction["last_update"] = time.time()

            time.sleep(YELLOW_TIME)

            with self.lock:
                if self.junctions[junction_name]["mode"] == "NORMAL":
                    # Move to next lane
                    junction = self.junctions[junction_name]
                    junction["current_index"] = (junction["current_index"] + 1) % len(junction["lanes"])

    def get_junction_status(self, junction_name):
        """Get status for specific junction including timer"""
        if junction_name not in self.junctions:
            return None
            
        with self.lock:
            junction = self.junctions[junction_name]
            signals = {}
            for lane in junction["lanes"]:
                if lane == junction["current_green"]:
                    signals[lane] = {
                        "color": junction["current_phase"],
                        "timer": max(0, junction["timer"])
                    }
                else:
                    signals[lane] = {
                        "color": "RED",
                        "timer": 0
                    }

            return {
                "junction_name": junction_name,
                "mode": junction["mode"],
                "signals": signals,
                "emergency_lane": junction["emergency_lane"],
                "priority_enabled": self.priority_enabled,
                "priority_duration": self.priority_duration
            }

    def get_all_junctions_status(self):
        """Get status for all junctions with timers"""
        with self.lock:
            status = {}
            for junction_name, junction in self.junctions.items():
                signals = {}
                for lane in junction["lanes"]:
                    if lane == junction["current_green"]:
                        signals[lane] = junction["current_phase"]
                    else:
                        signals[lane] = "RED"
                
                status[junction_name] = {
                    "mode": junction["mode"],
                    "signals": signals,
                    "emergency_lane": junction["emergency_lane"]
                }
            return status

    def trigger_emergency(self, lane, junction_name):
        """Trigger emergency for specific lane at specific junction"""
        if not self.priority_enabled or junction_name not in self.junctions:
            return

        def emergency_flow():
            with self.lock:
                junction = self.junctions[junction_name]
                junction["mode"] = "EMERGENCY"
                junction["current_phase"] = "YELLOW"
                junction["timer"] = YELLOW_TIME
                junction["last_update"] = time.time()

            time.sleep(YELLOW_TIME)

            with self.lock:
                junction = self.junctions[junction_name]
                junction["emergency_lane"] = lane
                junction["current_green"] = lane
                junction["current_phase"] = "GREEN"
                junction["timer"] = self.priority_duration
                junction["last_update"] = time.time()

            time.sleep(self.priority_duration)

            with self.lock:
                junction = self.junctions[junction_name]
                junction["current_phase"] = "YELLOW"
                junction["timer"] = YELLOW_TIME
                junction["last_update"] = time.time()

            time.sleep(YELLOW_TIME)

            with self.lock:
                junction = self.junctions[junction_name]
                junction["mode"] = "NORMAL"
                junction["emergency_lane"] = None
                # Find index of the emergency lane
                if lane in junction["lanes"]:
                    lane_index = junction["lanes"].index(lane)
                    junction["current_index"] = (lane_index + 1) % len(junction["lanes"])
                    junction["current_green"] = junction["lanes"][junction["current_index"]]
                junction["current_phase"] = "GREEN"
                junction["timer"] = GREEN_TIME
                junction["last_update"] = time.time()

        threading.Thread(target=emergency_flow, daemon=True).start()

    # ... rest of the methods remain the same ...

    def get_status(self):
         """
          Alias for backward compatibility with API.
          Returns status of all junctions.
         """
         return self.get_all_junctions_status()


# Global instance
controller = TrafficSignalController()