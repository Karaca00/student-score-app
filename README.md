# 🏫 ระบบดูคะแนนนักเรียน - คำชะอีวิทยาคาร

ระบบดึงคะแนนความดี / ตัดคะแนน / สรุปรวม จากเว็บ KCI

---

## 📁 โครงสร้างไฟล์

```
score-app/
├── server.js        ← Express server (backend + proxy)
├── package.json     ← Dependencies
└── public/
    └── index.html   ← หน้าเว็บแสดงผล
```

---

## 🚀 วิธี Deploy ฟรีบน Render.com

### 1. สร้างบัญชี GitHub (ถ้ายังไม่มี)
ไปที่ https://github.com → Sign up

### 2. สร้าง Repository ใหม่
- กด **New Repository**
- ชื่อ: `student-score-app`
- Public หรือ Private ก็ได้
- กด **Create Repository**

### 3. อัปโหลดไฟล์
- กด **uploading an existing file**
- ลาก `server.js`, `package.json` ขึ้นไป
- สร้างโฟลเดอร์ `public/` แล้วอัปโหลด `index.html`
- กด **Commit changes**

### 4. Deploy บน Render.com
1. ไปที่ https://render.com → Sign up (ใช้ GitHub login ได้เลย)
2. กด **New +** → **Web Service**
3. เลือก Repository ที่สร้างไว้
4. ตั้งค่าดังนี้:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. กด **Create Web Service**
6. รอ Deploy เสร็จ (~2 นาที) แล้วจะได้ URL เช่น `https://student-score-app.onrender.com`

---

## 💻 รันบนเครื่องตัวเอง (Optional)

```bash
# ติดตั้ง dependencies
npm install

# รัน server
npm start

# เปิด browser → http://localhost:3000
```

---

## ⚠️ หมายเหตุ

- **Free tier ของ Render.com** จะ "sleep" หลังไม่มีคนเข้า 15 นาที
  (ครั้งแรกที่เปิดอาจช้า 30 วิ)
- ข้อมูล Username/Password **ไม่ถูกเก็บไว้ใน server** ปลอดภัย 100%
- Server ทำหน้าที่เป็น proxy เพื่อหลีกเลี่ยงปัญหา CORS ของ browser

---

## 🛠️ ทางเลือกอื่นสำหรับ Deploy ฟรี

| บริการ | วิธี | หมายเหตุ |
|--------|------|----------|
| **Render.com** | ✅ ง่ายที่สุด | แนะนำ |
| **Railway.app** | ✅ ง่าย | มี free credits |
| **Replit.com** | ✅ ง่ายมาก | เปิดเว็บรันได้เลย |
| **Vercel** | ⚠️ ต้องแปลงเป็น serverless | ซับซ้อนกว่า |
