// โค้ดฝั่ง browser: แสดงเมนู จัดการตะกร้า และติดต่อ API ของร้าน

// ตัวช่วยหา element ตาม id; cart เก็บคู่ menu id → จำนวนที่เลือก
const $=id=>document.getElementById(id);let menu=[],cart=new Map(),filter='all',busy=false;let tracking;try{tracking=JSON.parse(sessionStorage.getItem('foodie-order')||'null');}catch{}const money=n=>'฿'+Number(n).toLocaleString('th-TH',{maximumFractionDigits:2});const category=id=>id>=15&&id<=18?'drink':id===19||id===20?'sweet':'food';const icons=['🍤','🍛','🍜','🍗','🥗','🍗','🍲','🍲','🍛','🍝','🍽️','🥗','🍚','🥗','🧋','🍋','☕','🍉','🍞','🍧','🍳','🍜'];
// สร้าง HTML element ด้วย textContent เพื่อแสดงข้อความโดยไม่ตีความเป็น HTML
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
// ส่ง HTTP request และแปลง JSON; ถ้า API ตอบ error ให้โยนไปแสดงในหน้าเว็บ
async function api(url,options){const r=await fetch(url,options);const b=await r.json();if(!r.ok)throw Error(b.error);return b;}

// สร้างการ์ดตามคำค้น/หมวดหมู่ ปุ่มเพิ่มปรับจำนวนในตะกร้า และปิดปุ่มเมนูหมด
function drawMenu(){$('grid').replaceChildren();const rows=menu.filter(m=>(filter==='all'||category(m.id)===filter)&&m.name.includes($('search').value.trim()));if(!rows.length)$('grid').append(node('p','ไม่พบเมนูที่ค้นหา'));for(const m of rows){const card=node('article',undefined,'card'+(!m.available?' sold':''));card.append(node('div',icons[m.id-1]||'🍽️','food-art'),node('h3',m.name));const bottom=node('div',undefined,'bottom'),button=node('button',m.available?'+ เพิ่ม':'หมดแล้ว');button.disabled=!m.available;button.onclick=()=>{cart.set(m.id,Math.min(99,(cart.get(m.id)||0)+1));drawCart();};bottom.append(node('span',money(m.price),'price'),button);card.append(bottom);$('grid').append(card);}}

// วาดรายการตะกร้า ปุ่ม +/− จำนวนรวม และยอดรวม; จำนวนศูนย์จะลบรายการ
function drawCart(){$('cart').replaceChildren();let total=0,count=0;for(const [id,qty]of cart){const m=menu.find(x=>x.id===id);if(!m)continue;total+=m.price*qty;count+=qty;const row=node('div',m.name,'cart-row'),actions=node('div',undefined,'cart-actions');for(const [label,change]of [['−',-1],[String(qty),0],['+',1]]){const b=node(change?'button':'span',label);if(change){b.setAttribute('aria-label',(change>0?'เพิ่ม ':'ลด ')+m.name);b.onclick=()=>{const n=qty+change;if(n<=0)cart.delete(id);else cart.set(id,Math.min(n,99));drawCart();};}actions.append(b);}actions.append(node('strong',money(m.price*qty)));row.append(actions);$('cart').append(row);}if(!count)$('cart').append(node('div','🍽️ เลือกเมนูโปรดใส่ตะกร้าได้เลย','empty'));$('count').textContent=count;$('total').textContent=money(total);$('submit').disabled=!count||busy;}

// พิมพ์ค้นหาหรือกดหมวดหมู่แล้วกรองเมนูทันที ไม่ต้องโหลดหน้าใหม่
$('search').oninput=drawMenu;$('filters').onclick=e=>{if(!e.target.dataset.filter)return;filter=e.target.dataset.filter;for(const b of $('filters').children)b.classList.toggle('active',b===e.target);drawMenu();};

// กดยืนยัน → POST /api/v1/orders → เก็บรหัสติดตาม → ล้างตะกร้าหลังสำเร็จ
// busy ป้องกันการกดส่งซ้ำระหว่างรอคำตอบ และคงตะกร้าไว้หาก API ผิดพลาด
$('checkout').onsubmit=async e=>{e.preventDefault();if(busy||!cart.size)return;busy=true;drawCart();$('submit').textContent='กำลังส่งคำสั่งซื้อ…';$('notice').textContent='';try{const r=await api('/api/v1/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer_name:$('name').value,items:[...cart].map(([menu_item_id,quantity])=>({menu_item_id,quantity}))})});tracking={id:r.data.id,token:r.tracking_token};sessionStorage.setItem('foodie-order',JSON.stringify(tracking));cart.clear();$('notice').textContent='✓ สั่งอาหารสำเร็จ กรุณาชำระเงินเมื่อรับอาหาร';showOrder(r.data);}catch(e){$('notice').textContent=e.message;}finally{busy=false;$('submit').textContent='ยืนยันคำสั่งซื้อ';drawCart();}};

// แสดงเลขออเดอร์ ชื่อลูกค้า สถานะ รายการอาหาร และยอดชำระ
function showOrder(o){$('tracking').hidden=false;$('order').replaceChildren(node('strong','ออเดอร์ #'+o.id),node('p','ผู้สั่ง: '+o.customer_name),node('p','สถานะ: '+({pending:'รับคำสั่งซื้อแล้ว',preparing:'กำลังปรุง',delivered:'รับอาหารเรียบร้อย',cancelled:'ยกเลิก'}[o.status]||o.status)));for(const x of o.items)$('order').append(node('div',x.name+' × '+x.quantity));$('order').append(node('p','ยอดรวม '+money(o.total)));}
// ปุ่มอัปเดตสถานะ → GET /api/v1/orders/:id พร้อมรหัสใน Authorization header
async function refresh(){if(!tracking)return;try{const r=await api('/api/v1/orders/'+tracking.id,{headers:{Authorization:'Bearer '+tracking.token}});showOrder(r.data);}catch(e){$('notice').textContent=e.message;}}$('refresh').onclick=refresh;

// เมื่อเปิดหน้าเว็บ: โหลดเมนูจาก API และลองเรียกคำสั่งซื้อล่าสุดของแท็บนี้
(async()=>{drawCart();try{const r=await api('/api/v1/menu');menu=r.data;$('mode').textContent=r.mode==='demo'?'โหมดทดลอง • รับที่ร้าน':'รับอาหารที่ร้าน';drawMenu();await refresh();}catch(e){$('message').textContent=e.message;$('mode').textContent='เชื่อมต่อไม่ได้';}})();