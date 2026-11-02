# อิ่มดี — ระบบสั่งอาหารออนไลน์

พัฒนาต่อจาก final-exam-setup โดยใช้ตารางเดิม menu_items, orders, order_items
ต้องมี Node.js 20 ขึ้นไป

## ทดลองทันที (ไม่ต้องลง dependency หรือ MySQL)

เปิด Terminal ในโฟลเดอร์นี้:

```sh
npm run demo
```

เปิด http://localhost:3000 เลือกอาหาร เพิ่ม/ลดจำนวน กรอกชื่อ แล้วกดยืนยัน
โหมดนี้บันทึกออเดอร์ใน data/orders.json แยกจาก MySQL

## ใช้ MySQL เดิม

1. คัดลอก .env.example เป็น .env แล้วตั้งค่าฐานข้อมูล
2. รัน docker compose up -d หรือเปิด MySQL ของตัวเอง
3. รัน npm install
4. รัน npm run seed เฉพาะการตั้งต้น (คำสั่งนี้ลบตารางและข้อมูลเดิม!)
5. รัน npm run check แล้ว npm start
6. เปิด http://localhost:3000

## API

| Method | Path | หน้าที่ |
|---|---|---|
| GET | /api/v1/menu | เมนูอาหารทั้งหมด |
| POST | /api/v1/orders | สร้างคำสั่งซื้อ |
| GET | /api/v1/orders/:id | ติดตามโดยใช้ Bearer tracking_token จากการสั่ง |
| PATCH | /api/v1/orders/:id/status | เปลี่ยนสถานะร้าน โดยใช้ Bearer ADMIN_KEY |

ตัวอย่างข้อมูลสั่งซื้อ:

```json
{"customer_name":"สมชาย","items":[{"menu_item_id":1,"quantity":2}]}
```

API ตรวจชื่อ จำนวน เมนูหมด และคำนวณราคาจากเซิร์ฟเวอร์ ใช้ transaction ใน MySQL

การเปลี่ยนสถานะ: pending → preparing → delivered หรือ pending/preparing → cancelled
ตั้ง ADMIN_KEY เป็นค่าสุ่มที่ยาวใน .env ก่อนใช้ API ผู้ดูแลร้าน (ค่าไม่ถูกส่งให้หน้าเว็บ)
ตัวอย่างใน PowerShell:

```powershell
$headers = @{Authorization="Bearer ใส่_ADMIN_KEY_ของคุณ"}
Invoke-RestMethod -Method Patch -Uri http://localhost:3000/api/v1/orders/1/status -Headers $headers -ContentType 'application/json' -Body '{"status":"preparing"}'
```

## ไฟล์สำคัญ

- server.js: HTTP server, API, validation, MySQL transaction และโหมดทดลอง
- public/index.html: หน้าเมนู ตะกร้า และติดตาม
- public/app.js: จัดการตะกร้าและเรียก API
- public/style.css: หน้าตาและขนาดหน้าจอมือถือ
- menu.json: เมนูตัวอย่างสำหรับโหมดทดลอง 22 รายการจาก seed.sql
- tests/api.test.js: ทดสอบ API แบบไม่ต้องมีฐานข้อมูล

## ทดสอบ

```sh
npm run test:api
```

npm test เป็นชุดตรวจสภาพแวดล้อมเดิม ต้องติดตั้ง dependency และเปิด MySQL ก่อน

## ขอบเขตต้นแบบ

รับอาหารและชำระเงินที่ร้าน ยังไม่มีชำระเงินออนไลน์ ที่อยู่จัดส่ง หรือบัญชีสมาชิก
เปลี่ยนสถานะผ่าน API ผู้ดูแล ยังไม่มีหน้า dashboard ร้าน
tracking_token เก็บในหน่วยความจำของ server และ sessionStorage ใน browser: รีสตาร์ต server หรือปิดแท็บแล้วจะติดตามออเดอร์เดิมไม่ได้ แต่ข้อมูลออเดอร์ยังอยู่
MySQL ใช้ schema เดิม จึงอ่านราคาจากเมนูปัจจุบันขณะติดตาม หากจะเพิ่มระบบแก้ราคา ควรเพิ่ม unit_price ใน order_items ก่อน
โหมดทดลองเหมาะกับการรัน process เดียวบนเครื่องส่วนตัว
ก่อนเผยแพร่จริงควรเพิ่มการยืนยันตัวตนร้าน token แบบถาวร HTTPS และ rate limit
