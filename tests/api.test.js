// ทดสอบ API จริงผ่าน HTTP บนพอร์ตชั่วคราว โดยใช้ไฟล์ข้อมูลแยกจากการใช้งานจริง
const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'foodie-'));
process.env.DEMO_MODE='true';process.env.ADMIN_KEY='test-only-key';process.env.DEMO_DATA_FILE=path.join(dir,'orders.json');
const server=require('../server');
const ready=new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
async function api(route,method='GET',data,token){await ready;const r=await fetch('http://127.0.0.1:'+server.address().port+route,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,body:await r.json()};}
// หลังทดสอบเสร็จ ปิด server และลบเฉพาะโฟลเดอร์ชั่วคราวที่สร้างไว้
after(async()=>{await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
test('menu contains 22 items and unavailable entries',async()=>{const r=await api('/api/v1/menu');assert.equal(r.body.data.length,22);assert.equal(r.body.data[8].available,false);});
test('order uses server price, persists and protects tracking; status follows workflow',async()=>{const r=await api('/api/v1/orders','POST',{customer_name:'ทดสอบ',items:[{menu_item_id:1,quantity:2}],total:1});assert.equal(r.status,201);assert.equal(r.body.data.total,120);const id=r.body.data.id;assert.equal(JSON.parse(fs.readFileSync(process.env.DEMO_DATA_FILE))[0].id,id);assert.equal((await api('/api/v1/orders/'+id)).status,403);assert.equal((await api('/api/v1/orders/'+id,'GET',null,r.body.tracking_token)).status,200);assert.equal((await api('/api/v1/orders/'+id+'/status','PATCH',{status:'preparing'})).status,403);assert.equal((await api('/api/v1/orders/'+id+'/status','PATCH',{status:'delivered'},'test-only-key')).status,409);assert.equal((await api('/api/v1/orders/'+id+'/status','PATCH',{status:'preparing'},'test-only-key')).status,200);assert.equal((await api('/api/v1/orders/'+id+'/status','PATCH',{status:'delivered'},'test-only-key')).status,200);});
test('rejects empty name, empty cart, unavailable food and invalid quantities',async()=>{for(const data of [{customer_name:'',items:[{menu_item_id:1,quantity:1}]},{customer_name:'A',items:[]},{customer_name:'A',items:[{menu_item_id:9,quantity:1}]},{customer_name:'A',items:[{menu_item_id:1,quantity:-1}]},{customer_name:'A',items:[{menu_item_id:1,quantity:0.5}]},{customer_name:'A',items:[{menu_item_id:1,quantity:60},{menu_item_id:1,quantity:50}]}])assert.equal((await api('/api/v1/orders','POST',data)).status,400);});
