import cv2
import os
import uuid
import sqlite3
from ultralytics import YOLO

# ================= CONFIG =================
MODEL_PATH = "runs/detect/train2/weights/best.pt"
CONF_THRESHOLD = 0.5
OUTPUT_DIR = "output"
EMERGENCY_CLASSES = ["ambulance", "police", "fire brigade"]
# =========================================

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("🔄 Loading YOLO model...")
model = YOLO(MODEL_PATH)
print("✅ Model loaded")

def get_active_emergency_for_junction(junction_name):
    """Get the FIRST active emergency for this specific junction"""
    conn = sqlite3.connect("traffic_db.sqlite3")
    cursor = conn.cursor()
    
    # Get the oldest active emergency for this junction
    cursor.execute('''
        SELECT er.id, er.ambulance_number, ej.lane_number, ej.is_cleared
        FROM emergency_requests er
        JOIN emergency_junctions ej ON er.id = ej.emergency_request_id
        WHERE er.is_active = 1 
        AND ej.junction_name = ?
        AND ej.is_cleared = 0
        ORDER BY er.emergency_start_time ASC
        LIMIT 1
    ''', (junction_name,))
    
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            "emergency_id": result[0],
            "ambulance_number": result[1],
            "lane_number": result[2],
            "is_cleared": bool(result[3])
        }
    return None

def log_detection_db(ambulance_number, junction_name, lane_number, video_file, confidence, status):
    """Log detection to database"""
    conn = sqlite3.connect("traffic_db.sqlite3")
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO detection_logs 
        (ambulance_number, junction_name, lane_number, video_filename, confidence, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (ambulance_number, junction_name, lane_number, video_file, confidence, status))
    
    conn.commit()
    conn.close()

def update_junction_status_db(emergency_request_id, junction_name, ambulance_number):
    """Update junction status in database"""
    conn = sqlite3.connect("traffic_db.sqlite3")
    cursor = conn.cursor()
    
    # Mark this specific junction as cleared
    cursor.execute('''
        UPDATE emergency_junctions 
        SET is_cleared = 1, cleared_at = CURRENT_TIMESTAMP
        WHERE emergency_request_id = ? AND junction_name = ? AND is_cleared = 0
    ''', (emergency_request_id, junction_name))
    
    # Update current junction index for this emergency
    cursor.execute('''
        UPDATE emergency_requests 
        SET current_junction_index = current_junction_index + 1
        WHERE id = ? AND is_active = 1
    ''', (emergency_request_id,))
    
    # Check if ALL junctions for this emergency are cleared
    cursor.execute('''
        SELECT COUNT(*) FROM emergency_junctions 
        WHERE emergency_request_id = ? AND is_cleared = 0
    ''', (emergency_request_id,))
    
    pending_count = cursor.fetchone()[0]
    
    if pending_count == 0:
        # All junctions cleared, end this emergency
        cursor.execute('''
            UPDATE emergency_requests 
            SET is_active = 0, emergency_end_time = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (emergency_request_id,))
        
        print(f"✅ ALL junctions cleared for ambulance {ambulance_number}. Emergency COMPLETED.")
    else:
        print(f"✅ Junction {junction_name} cleared for ambulance {ambulance_number}. {pending_count} junctions remaining.")
    
    conn.commit()
    conn.close()

def analyze_video(video_path, junction_name="Main Square Junction"):
    """
    Analyze video for specific junction
    Only processes emergency if it's scheduled for THIS junction
    """
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise Exception("❌ Could not open video")

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps == 0 or fps is None:
        fps = 25
        print("⚠ FPS was 0, using fallback:", fps)

    output_filename = f"{uuid.uuid4().hex}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    # Browser-compatible codec
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    emergency_detected = False
    detected_class = "N/A"
    best_confidence = 0.0
    frame_count = 0
    
    # Variables for this specific analysis
    detected_ambulance_number = None
    lane_to_clear = None
    has_active_request = False
    emergency_id = None
    
    # Get emergency scheduled for THIS junction
    scheduled_emergency = get_active_emergency_for_junction(junction_name)
    
    if scheduled_emergency:
        print(f"📅 Scheduled emergency at {junction_name}: Ambulance {scheduled_emergency['ambulance_number']}, Lane {scheduled_emergency['lane_number']}")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1

        # 🔥 SPEED BOOST: skip frames
        if frame_count % 2 != 0:
            out.write(frame)
            continue

        # YOLO DETECTION
        results = model(frame, conf=CONF_THRESHOLD, verbose=False)[0]

        for box in results.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = results.names[cls_id]

            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)

            if label in EMERGENCY_CLASSES:
                emergency_detected = True
                detected_class = label
                best_confidence = max(best_confidence, conf)
                
                # Check if there's a scheduled emergency for THIS junction
                if scheduled_emergency:
                    # This is the expected ambulance for this junction
                    detected_ambulance_number = scheduled_emergency["ambulance_number"]
                    lane_to_clear = scheduled_emergency["lane_number"]
                    emergency_id = scheduled_emergency["emergency_id"]
                    has_active_request = True
                    
                    # Log to database
                    log_detection_db(
                        ambulance_number=detected_ambulance_number,
                        junction_name=junction_name,
                        lane_number=lane_to_clear,
                        video_file=output_filename,
                        confidence=conf,
                        status="detected_with_request"
                    )
                    
                    # Update junction status
                    update_junction_status_db(
                        emergency_request_id=emergency_id,
                        junction_name=junction_name,
                        ambulance_number=detected_ambulance_number
                    )
                    
                    # Trigger signal controller for THIS junction
                    from signal_controller import controller
                    controller.trigger_emergency(f"LANE_{lane_to_clear}", junction_name)
                    
                    color = (0, 0, 255)  # Red - scheduled emergency
                    text = f"{label.upper()} {detected_ambulance_number} {conf:.2f}"
                    status_text = f"SCHEDULED EMERGENCY"
                    
                else:
                    # No scheduled emergency - random ambulance
                    has_active_request = False
                    detected_ambulance_number = f"RND{int(conf * 100):03d}"
                    
                    # Log as random detection
                    log_detection_db(
                        ambulance_number=detected_ambulance_number,
                        junction_name=junction_name,
                        lane_number=0,
                        video_file=output_filename,
                        confidence=conf,
                        status="random_detection"
                    )
                    
                    color = (255, 165, 0)  # Orange - random ambulance
                    text = f"{label.upper()} {conf:.2f} (Random)"
                    status_text = "RANDOM AMBULANCE"
            else:
                color = (0, 255, 0)  # Green - non-emergency
                text = f"{label} {conf:.2f}"

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
            cv2.putText(
                frame,
                text,
                (x1, max(30, y1 - 10)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                color,
                2,
            )

        # Add status overlay
        if emergency_detected:
            if has_active_request:
                # Scheduled emergency
                cv2.putText(
                    frame,
                    f"🚨 SCHEDULED EMERGENCY",
                    (30, 50),
                    cv2.FONT_HERSHEY_DUPLEX,
                    1,
                    (0, 0, 255),
                    2,
                )
                cv2.putText(
                    frame,
                    f"Ambulance: {detected_ambulance_number} | Lane: {lane_to_clear}",
                    (30, 90),
                    cv2.FONT_HERSHEY_DUPLEX,
                    0.8,
                    (0, 0, 255),
                    2,
                )
            else:
                # Random ambulance
                cv2.putText(
                    frame,
                    f"⚠ RANDOM AMBULANCE",
                    (30, 50),
                    cv2.FONT_HERSHEY_DUPLEX,
                    1,
                    (255, 165, 0),
                    2,
                )
                cv2.putText(
                    frame,
                    f"No Scheduled Emergency",
                    (30, 90),
                    cv2.FONT_HERSHEY_DUPLEX,
                    0.8,
                    (255, 165, 0),
                    2,
                )
            
            cv2.putText(
                frame,
                f"Junction: {junction_name}",
                (30, 130),
                cv2.FONT_HERSHEY_DUPLEX,
                0.8,
                (0, 0, 255) if has_active_request else (255, 165, 0),
                2,
            )

        out.write(frame)

    cap.release()
    out.release()

    # VERIFY OUTPUT
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"🎬 Output video saved: {output_filename} ({size_mb:.2f} MB)")
    
    if emergency_detected:
        if has_active_request:
            print(f"✅ PROCESSED: Scheduled emergency for {detected_ambulance_number} at {junction_name}")
            print(f"   Lane {lane_to_clear} prioritized")
        else:
            print(f"⚠ DETECTED: Random ambulance at {junction_name}")
            print(f"   No scheduled emergency - normal operation")

    return {
        "emergency": emergency_detected,
        "vehicle_type": detected_class if emergency_detected else "N/A",
        "ambulance_number": detected_ambulance_number if emergency_detected else "N/A",
        "junction": junction_name,
        "lane_to_clear": lane_to_clear if lane_to_clear else None,
        "confidence": round(best_confidence, 2),
        "signal": f"GREEN for LANE {lane_to_clear}" if lane_to_clear else "NORMAL (Random Ambulance)",
        "output_video": f"/output/{output_filename}",
        "has_active_request": has_active_request,
        "is_scheduled": has_active_request,
        "message": f"Scheduled emergency processed for ambulance {detected_ambulance_number}" if has_active_request else "Random ambulance detected - no priority"
    }