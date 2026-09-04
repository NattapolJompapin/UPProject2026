import cv2
import time
import requests
import threading
from ultralytics import YOLO
from datetime import datetime, time as dtime
from linebot import LineBotApi
from linebot.models import TextSendMessage
from db import update_camera_status

# -------------------------
# CONFIG
MODEL_PATH = "best.pt"
CONF_THRES = 0.4

SEND_INTERVAL = 3
THRESHOLD_PEOPLE = 3
NOTIFY_DURATION = 5
NOTIFY_COOLDOWN = 20

CENTRAL_API = "http://127.0.0.1:3001/api/edge/report"

BUSSTOP_STATION = {
    "CAM01": "วิศวะ",
    "CAM02": "วิทยาศาสตร์",
    "CAM03": "ศิลปศาสตร์",
    "CAM04": "PKY"
}

# -------------------------
# LINE CONFIG
LINE_ACCESS_TOKEN = "ptT41FWxJjJvh0/rTwBCbDUVCq9U9Ekj4Ic8ntDmGQjvCVS3VRL73faBkwX6iS82XNA/GcBjnCcpx6qM7M4yZgmXf0f9ijwYuhptcnCDbxlx0mNhLIbsDlc3Y+Xe3w+u2ZOd25pZl+Z/Nb0dIl9Z7AdB04t89/1O/w1cDnyilFU="
USER_ID = "U1b9c7df6010f35ba385d56552332d286"

line_bot_api = LineBotApi(LINE_ACCESS_TOKEN)

# -------------------------
# LOAD MODEL
model = YOLO(MODEL_PATH)

# -------------------------
def is_operating_time():
    now = datetime.now().time()
    return dtime(3, 0) <= now < dtime(22, 0)

# -------------------------
def send_to_central(camera_id, people_count):
    payload = {
        "Camera_ID": camera_id,
        "PassengerCount": int(people_count)
    }
    try:
        requests.post(CENTRAL_API, json=payload, timeout=3)

        print(
            f"{camera_id} | {int(people_count)} คน | "
            f"{datetime.now().strftime('%H:%M:%S')}"
        )
    except Exception as e:
        print(f"[API ERROR] {camera_id} : {e}")

# -------------------------
def send_line_notify(camera_id, people_count):
    bus_stop_name = BUSSTOP_STATION.get(camera_id, camera_id)
    message = (
        f"🚨 แจ้งเตือนความหนาแน่นผู้โดยสาร\n"
        f"📍 ป้าย: {bus_stop_name}\n"
        f"👥 จำนวนคน: {int(people_count)} คน"
    )
    try:
        line_bot_api.push_message(
            USER_ID,
            TextSendMessage(text=message)
        )
        print(f"[LINE] Notify sent : {camera_id}")
    except Exception as e:
        print(f"[LINE ERROR] {e}")

# -------------------------
def check_and_send_notify(camera_id, people_count, state):
    now = time.time()
    if people_count >= THRESHOLD_PEOPLE:
        if state["start_time"] is None:
            state["start_time"] = now
            return
        if now - state["start_time"] >= NOTIFY_DURATION:
            if (
                state["last_notify_time"] is None
                or now - state["last_notify_time"] >= NOTIFY_COOLDOWN
            ):
                send_line_notify(camera_id, people_count)
                state["last_notify_time"] = now
            state["start_time"] = None
    else:
        state["start_time"] = None

# -------------------------
# CAMERA PROCESS
def run_camera(camera_id, url):
    print(f"[{camera_id}] Starting camera")
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    if not cap.isOpened():
        print(f"[✗] {camera_id} failed")
        update_camera_status(camera_id, "Inactive")
        return
    update_camera_status(camera_id, "Active")
    print(f"[✓] {camera_id} connected")
    frame = None
    lock = threading.Lock()

    # -------------------------
    # THREAD อ่านภาพ
    def capture():
        nonlocal frame
        while True:
            ret, img = cap.read()
            if not ret:
                continue
            with lock:
                frame = img

    threading.Thread(target=capture, daemon=True).start()

    last_send_time = time.time()
    person_counts = []

    notify_state = {
        "start_time": None,
        "last_notify_time": None
    }
    try:
        while True:
            if not is_operating_time():
                update_camera_status(camera_id, "Inactive")
                time.sleep(60)
                continue
            with lock:
                if frame is None:
                    continue
                img = frame.copy()

            # resize
            img = cv2.resize(img, (640, 480))

            # YOLO detect
            results = model(img, conf=CONF_THRES, verbose=False)
            current_count = len(results[0].boxes)
            person_counts.append(current_count)
            annotated = results[0].plot()

            cv2.putText(
                annotated,
                f"People: {current_count}",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 0),
                2
            )
            cv2.imshow(camera_id, annotated)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

            # SEND DATA
            if time.time() - last_send_time >= SEND_INTERVAL:
                avg_people = sum(person_counts) / len(person_counts)
                send_to_central(camera_id, avg_people)
                check_and_send_notify(
                    camera_id,
                    avg_people,
                    notify_state
                )
                person_counts.clear()
                last_send_time = time.time()
    except KeyboardInterrupt:
        print(f"[!] {camera_id} stopping")

    finally:
        cap.release()
        cv2.destroyAllWindows()
        update_camera_status(camera_id, "Inactive")
        print(f"[✓] {camera_id} stopped")