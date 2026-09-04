# ดึงโค้ดจาก Git
git pull

# อัพโค้ดขึ้น Git
git add .
git status
git commit -m "code commit"
git push

# --------------------
# สร้าง Docker Container ผ่าน /docker-compose.yml
docker-compose up -d

# --------------------
# Command เปิดระบบ

# เซิฟเวอร์
cd JSServer
node server.js

# เว็ปไซต์
cd Dashboard React
npm start
Yes

# เชื่อม Central ประมวลผล - SQL DB
cd UPDensity_ProgramPackage
venv\Scripts\activate
cd central
python -m uvicorn main:app --host 0.0.0.0 --port 3001

# Model & Camera
cd UPDensity_ProgramPackage
venv\Scripts\activate
cd edge
python edge_multi.py

# ngrok web
<!-- https://ngrok.com/
หลังเข้าใช้งานจะได้ คำสั่งไปรัน
ngrok config add-authtoken 39QWGrnLEL8mDvCi4JWkDgrWUJe_6ZxHjDjJCM74JERv4cvWE -->
ngrok http 3001



