from multiprocessing import Process, freeze_support
import os
from camera_worker import run_camera

# -------------------------
# VIDEO FOLDER
VIDEO_FOLDER = "camset"

# อ่านไฟล์วิดีโอ
video_files = [
    os.path.join(VIDEO_FOLDER, f)
    for f in os.listdir(VIDEO_FOLDER)
    if f.endswith((".mp4", ".avi", ".mov"))
]

# สร้าง camera config
CAMERAS = {f"CAM{str(i+2).zfill(2)}": video for i, video in enumerate(video_files)}

# -------------------------
def start_camera_process(camera_id, stream_url):

    p = Process(
        target=run_camera,
        args=(camera_id, stream_url),
        daemon=True
    )

    p.start()
    return p


# -------------------------
if __name__ == "__main__":

    freeze_support()

    print("[@] Starting multi-video detection system")

    processes = []

    for cam_id, url in CAMERAS.items():

        #print(f"[+] Launching {cam_id} : {url}")

        p = start_camera_process(cam_id, url)

        processes.append(p)

    try:

        for p in processes:
            p.join()

    except KeyboardInterrupt:

        print("\n[!] Stopping all processes")

        for p in processes:
            p.terminate()
            p.join()

        print("[✓] System stopped")