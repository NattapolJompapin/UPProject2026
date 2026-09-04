import mysql.connector
from datetime import datetime, timedelta
import random

# -------------------------
# CONFIG
# -------------------------
DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "Chizo1412Za@",
    "database": "BusStop"
}

CAMERAS = ["CAM01", "CAM02", "CAM03", "CAM04"]

START_TIME = datetime(2026, 3, 1, 7, 0, 0)
END_TIME   = datetime(2026, 3, 14, 22, 0, 0)

# -------------------------
# ช่วงเวลาหนาแน่น
# -------------------------
CAM_PEAK_TIMES = {
    "CAM01": ["07:30", "10:00", "13:00", "15:30"],
    "CAM02": ["07:00", "10:00", "13:30", "15:30", "16:30"],
    "CAM03": ["08:00", "10:00", "13:00", "15:00", "17:00"],
    "CAM04": ["11:00", "13:30", "15:30", "17:30", "18:30"]
}

PEAK_WINDOW_MIN = 15
ZERO_UNTIL = {cam: None for cam in CAMERAS}

# -------------------------
# daily factor
# -------------------------
def get_daily_factor(date):

    weekday = date.weekday()  # 0=Mon

    # weekend คนน้อย
    if weekday >= 5:
        base = random.uniform(0.5, 0.8)

    # weekday ปกติ
    else:
        base = random.uniform(0.9, 1.2)

    # สุ่มวันพิเศษ
    event = random.random()

    if event < 0.1:   # 10% วันคนน้อย
        base *= 0.5

    elif event > 0.9: # 10% วันคนเยอะ
        base *= 1.5

    return base


# -------------------------
# peak check
# -------------------------
def is_peak_time(camera_id, current_time):

    for t in CAM_PEAK_TIMES[camera_id]:

        peak_time = datetime.strptime(t, "%H:%M").time()

        peak_dt = current_time.replace(
            hour=peak_time.hour,
            minute=peak_time.minute
        )

        if abs((current_time - peak_dt).total_seconds()) <= PEAK_WINDOW_MIN*60:
            return True

    return False


# -------------------------
# generate passenger
# -------------------------
def generate_passenger_count(camera_id, current_time, factor):

    global ZERO_UNTIL

    # -----------------------
    # ถ้ายังอยู่ในช่วง zero
    # -----------------------
    if ZERO_UNTIL[camera_id] and current_time < ZERO_UNTIL[camera_id]:
        return 0

    # -----------------------
    # สุ่มเริ่มช่วง zero ใหม่
    # -----------------------
    if random.random() < 0.02:  # โอกาส 2%
        duration = random.randint(1,4)  # 1-4 นาที
        ZERO_UNTIL[camera_id] = current_time + timedelta(minutes=duration)
        return 0

    hour = current_time.hour

    if hour < 8 or hour >= 21:
        base = random.randint(0,5)

    elif is_peak_time(camera_id, current_time):
        base = random.randint(25,54)

    else:
        base = random.randint(5,20)

    value = int(base * factor)

    return max(0,value)


# -------------------------
# MAIN
# -------------------------
def main():

    print("🚀 Start generating dummy data...")

    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    print("✅ Connected")

    cursor.execute("TRUNCATE TABLE DensityCount")
    conn.commit()

    rows = []

    current_time = START_TIME
    dc_num = 1

    current_day = None
    daily_factor = 1

    while current_time <= END_TIME:

        if current_day != current_time.date():

            current_day = current_time.date()
            daily_factor = get_daily_factor(current_day)

            print(f"📅 {current_day} factor = {daily_factor:.2f}")

        for cam in CAMERAS:

            count = generate_passenger_count(
                cam,
                current_time,
                daily_factor
            )

            rows.append((
                f"DC{dc_num:06d}",
                cam,
                count,
                current_time
            ))

            dc_num += 1
        
        #สุ่มช่วงเวลา 5-8 วินาที
        current_time += timedelta(seconds=random.randint(5,8))

    print(f"📦 Prepared {len(rows)} rows")

    cursor.executemany("""
        INSERT INTO DensityCount
        (DensityCount_ID, Camera_ID, PassengerCount, Timestamp)
        VALUES (%s,%s,%s,%s)
    """, rows)

    conn.commit()

    cursor.close()
    conn.close()

    print("🎉 Done")


if __name__ == "__main__":
    main()