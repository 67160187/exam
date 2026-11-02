// โมดูลมาตรฐานของ Node.js: เปิดเว็บเซิร์ฟเวอร์ อ่านไฟล์ จัดการพาธ และสร้างรหัสติดตาม
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const config = require('./config');
// --demo หรือ DEMO_MODE=true ใช้ไฟล์ JSON แทน MySQL เพื่อทดลองได้ทันที
const demo = process.argv.includes('--demo') || process.env.DEMO_MODE === 'true';
const menu = require('./menu.json');
const dataPath = process.env.DEMO_DATA_FILE || path.join(__dirname, 'data', 'orders.json');
// โหลดคำสั่งซื้อที่เคยบันทึกไว้ในโหมดทดลอง
let orders = demo && fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath)) : [];
// จับคู่เลขออเดอร์กับรหัสลับ: ลูกค้าต้องมีรหัสนี้จึงอ่านออเดอร์ได้
// รหัสอยู่ในหน่วยความจำ จึงหายเมื่อรีสตาร์ตเซิร์ฟเวอร์
const tokens = new Map();
// สร้าง Error ที่มี HTTP status เพื่อส่งข้อความผิดพลาดให้หน้าเว็บ
const fail = (status, message) => Object.assign(new Error(message), {status});
// บันทึกไฟล์ชั่วคราวก่อนเปลี่ยนเป็นไฟล์จริง ลดโอกาสไฟล์เสียระหว่างเขียน
function persist(next) { fs.mkdirSync(path.dirname(dataPath), {recursive:true}); fs.writeFileSync(dataPath+'.tmp', JSON.stringify(next,null,2)); fs.renameSync(dataPath+'.tmp',dataPath); orders=next; }
// อ่าน JSON จาก request จำกัด 10 KB และปฏิเสธ JSON ที่รูปแบบผิด
async function body(req) { let chunks='', size=0; for await (const chunk of req) {size+=chunk.length; if(size>10240) throw fail(413,'ข้อมูลมีขนาดใหญ่เกินไป'); chunks+=chunk;} try {return JSON.parse(chunks || '{}');} catch {throw fail(400,'JSON ไม่ถูกต้อง');} }
// อ่านเมนูจาก JSON หรือ MySQL แล้วแปลงราคาและสถานะให้หน้าเว็บใช้ได้
async function getMenu(db) { if(demo) return menu; const [rows]=await db.query('SELECT * FROM menu_items ORDER BY id'); return rows.map(x=>({...x,price:Number(x.price),available:!!x.available})); }
// อ่านหัวออเดอร์และรายการอาหาร โดย JOIN เพื่อได้ชื่อและราคาของแต่ละเมนู
async function getOrder(id,db) { if(demo) return orders.find(x=>x.id===id); const [rows]=await db.query('SELECT * FROM orders WHERE id=?',[id]); if(!rows[0]) return; const [items]=await db.query('SELECT oi.menu_item_id, oi.quantity, m.name, m.price FROM order_items oi JOIN menu_items m ON m.id=oi.menu_item_id WHERE order_id=?',[id]); return {...rows[0],items,total:items.reduce((s,x)=>s+Number(x.price)*x.quantity,0)}; }
// ทุก request เข้ามาที่นี่: เลือก API ตาม URL และ HTTP method
const server=http.createServer(async(req,res)=>{ const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
try {const url=new URL(req.url,'http://localhost'); const route=url.pathname; const pool=demo?null:require('./db').pool;
// GET /api/v1/menu: หน้าเว็บเรียกเมื่อเปิด เพื่อแสดงรายการอาหาร
if(req.method==='GET' && route==='/api/v1/menu') return send(200,{data:await getMenu(pool),mode:demo?'demo':'mysql'});
// POST /api/v1/orders: รับข้อมูลจากปุ่มยืนยันคำสั่งซื้อ
if(req.method==='POST' && route==='/api/v1/orders') {
// ตรวจชื่อและตะกร้าก่อนเขียนข้อมูล เพื่อไม่ให้เกิดออเดอร์ว่าง
const input=await body(req); if(typeof input.customer_name!=='string'||!input.customer_name.trim()||input.customer_name.trim().length>100) throw fail(400,'กรุณากรอกชื่อ 1–100 ตัวอักษร');
if(!Array.isArray(input.items)||!input.items.length||input.items.length>50) throw fail(400,'กรุณาเลือกอาหาร 1–50 รายการ');
// รวมเมนูซ้ำ และตรวจจำนวนเป็นเลขจำนวนเต็ม 1–99 ต่อเมนู
const counts=new Map(); for(const x of input.items){if(!Number.isSafeInteger(x.menu_item_id)||!Number.isInteger(x.quantity)||x.quantity<1||x.quantity>99) throw fail(400,'รายการอาหารหรือจำนวนไม่ถูกต้อง'); counts.set(x.menu_item_id,(counts.get(x.menu_item_id)||0)+x.quantity); if(counts.get(x.menu_item_id)>99) throw fail(400,'แต่ละเมนูสั่งได้ไม่เกิน 99 ชิ้น');}
// Transaction: บันทึกหัวออเดอร์และรายการอาหารให้สำเร็จพร้อมกัน
// ถ้าส่วนใดผิดพลาด จะ rollback และคืน connection ใน finally
let conn; try {conn=demo?null:await pool.getConnection(); if(conn) await conn.beginTransaction();
// ล็อกแถวเมนูระหว่างตรวจสอบ: ใช้ราคาจริงจาก server ไม่รับยอดรวมจากลูกค้า
const current=demo?menu:(await conn.query('SELECT * FROM menu_items FOR UPDATE'))[0]; const items=[]; for(const [id,quantity] of counts){const m=current.find(x=>x.id===id);if(!m||!m.available) throw fail(400,'มีเมนูที่ไม่พร้อมจำหน่าย'); items.push({menu_item_id:id,name:m.name,price:Number(m.price),quantity});}
// INSERT orders ก่อน แล้วใช้ insertId เป็น order_id ของ order_items
let id; if(demo) id=orders.reduce((m,x)=>Math.max(m,x.id),0)+1; else {const [r]=await conn.query('INSERT INTO orders (customer_name) VALUES (?)',[input.customer_name.trim()]);id=r.insertId;for(const x of items) await conn.query('INSERT INTO order_items (order_id,menu_item_id,quantity) VALUES (?,?,?)',[id,x.menu_item_id,x.quantity]);}
// สร้างผลลัพธ์และรวมราคาเป็นหน่วยสตางค์ก่อนหารกลับเป็นบาท
const order={id,customer_name:input.customer_name.trim(),status:'pending',created_at:new Date().toISOString(),items,total:items.reduce((s,x)=>s+Math.round(x.price*100)*x.quantity,0)/100}; if(demo) persist([...orders,order]);else await conn.commit();
// ส่งรหัสติดตามกลับครั้งเดียวพร้อมออเดอร์ใหม่
const token=crypto.randomBytes(32).toString('hex');tokens.set(id,token);return send(201,{data:order,tracking_token:token});
} catch(e){if(conn)await conn.rollback();throw e;}finally{if(conn)conn.release();}}
// PATCH /api/v1/orders/:id/status: สำหรับร้าน ใช้ ADMIN_KEY จาก .env
const statusMatch=route.match(/^\/api\/v1\/orders\/(\d+)\/status$/);
if(statusMatch && req.method==='PATCH'){
if(!process.env.ADMIN_KEY || req.headers.authorization!=='Bearer '+process.env.ADMIN_KEY) throw fail(403,'ต้องใช้รหัสผู้ดูแลร้าน');
const {status}=await body(req); const id=Number(statusMatch[1]);
// กำหนดลำดับสถานะ: ห้ามข้ามขั้นหรือแก้คำสั่งซื้อที่จบแล้ว
const transitions={pending:['preparing','cancelled'],preparing:['delivered','cancelled'],delivered:[],cancelled:[]};
if(!transitions[status])throw fail(400,'สถานะไม่ถูกต้อง');
if(demo){const o=orders.find(x=>x.id===id);if(!o)throw fail(404,'ไม่พบคำสั่งซื้อ');if(!transitions[o.status]?.includes(status))throw fail(409,'ไม่สามารถเปลี่ยนสถานะตามลำดับนี้');persist(orders.map(x=>x.id===id?{...x,status}:x));}
else {const conn=await pool.getConnection();try{await conn.beginTransaction();const [rows]=await conn.query('SELECT status FROM orders WHERE id=? FOR UPDATE',[id]);if(!rows.length)throw fail(404,'ไม่พบคำสั่งซื้อ');if(!transitions[rows[0].status]?.includes(status))throw fail(409,'ไม่สามารถเปลี่ยนสถานะตามลำดับนี้');await conn.query('UPDATE orders SET status=? WHERE id=?',[status,id]);await conn.commit();}catch(e){await conn.rollback();throw e;}finally{conn.release();}}
return send(200,{data:await getOrder(id,pool)});
}
// GET /api/v1/orders/:id: ตรวจ Bearer token ก่อนเปิดเผยข้อมูลลูกค้า
const match=route.match(/^\/api\/v1\/orders\/(\d+)$/);if(match && req.method==='GET'){const id=Number(match[1]);if(!tokens.has(id)||req.headers.authorization!=='Bearer '+tokens.get(id)) throw fail(403,'กรุณาสั่งอาหารจากอุปกรณ์นี้เพื่อติดตามคำสั่งซื้อ'); const order=await getOrder(id,pool);if(!order)throw fail(404,'ไม่พบคำสั่งซื้อ');return send(200,{data:order});}
// ให้บริการเฉพาะไฟล์หน้าเว็บที่อนุญาต และตั้ง header ป้องกันเนื้อหาที่ไม่พึงประสงค์
if(req.method==='GET' && (route==='/' || ['/app.js','/style.css'].includes(route))) {const file=route==='/'?'index.html':route.slice(1);res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'"});return res.end(fs.readFileSync(path.join(__dirname,'public',file)));}
// URL ที่ไม่ตรงกับ API หรือไฟล์ที่เปิดให้บริการ จะตอบ 404
throw fail(404,'ไม่พบหน้าที่ต้องการ');
// ส่งข้อผิดพลาดแบบอ่านเข้าใจได้ โดยไม่ส่งรายละเอียดฐานข้อมูลให้ลูกค้า
}catch(e){if(!e.status) console.error(e.message);send(e.status||503,{error:e.status?e.message:'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบ MySQL หรือใช้ npm run demo'});}});
// เปิดพอร์ตเฉพาะเมื่อรันไฟล์นี้โดยตรง; การทดสอบ import server ไปเปิดพอร์ตเอง
if(require.main===module)server.listen(config.port,()=>console.log(`Foodie: http://localhost:${config.port} (${demo?'DEMO':'MySQL'})`));
module.exports=server;
