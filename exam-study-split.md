# สรุปแยกเนื้อหากับ Code: สัปดาห์ 9–14 (เตรียมสอบ 88736065)

ไฟล์นี้แยก **เนื้อหา** (แนวคิดที่ต้องเข้าใจ) ออกจาก **code** (รูปแบบที่ต้องจำได้) ตามสัปดาห์
ใช้ทบทวนก่อนสอบ ไม่ใช่คำตอบของข้อสอบ

---

## สัปดาห์ 9: Unit & Integration Testing

### เนื้อหา
- **Unit Testing** ทดสอบฟังก์ชันเดียวแยกอิสระ เร็วที่สุด เช่น `hashPassword`
- **Integration Testing** ทดสอบหลายส่วนทำงานร่วมกัน เช่น route + middleware + database
- **E2E Testing** ทดสอบทั้งระบบตั้งแต่ client ถึง database ช้าที่สุด
- ปัญหาของการทดสอบด้วย Postman อย่างเดียว คือ ต้องคลิกซ้ำ ไม่มีบันทึกว่าเคยทดสอบอะไร และผลขึ้นกับคนทดสอบ
- **Testing Pyramid**: ควรมี Unit มากที่สุด Integration ปานกลาง E2E น้อยที่สุด
- **Test ที่ดี** ต้องเป็นอิสระต่อกัน รันซ้ำได้ผลเดิม และตรวจผลด้วย `expect` เสมอ
- **Mock** คือการแทนของจริงด้วยของปลอมที่เราควบคุมได้ ใช้เมื่อไม่อยากพึ่งฐานข้อมูลหรือบริการภายนอก
- **เมื่อใดควร mock**
  - ทดสอบ logic ล้วน ไม่มี I/O: ไม่ต้อง mock
  - Route ที่เรียกฐานข้อมูล แต่ต้องการความเร็ว: mock database layer
  - ทดสอบว่าเชื่อมฐานข้อมูลจริงได้ถูก schema: ห้าม mock (เป็น Integration Test)
  - เรียก External API ระหว่างพัฒนา: ควร mock
- **Coverage** มี 4 มิติ: Statement, Branch, Function, Line
- **Coverage 100% ไม่ได้แปลว่า test ดี** เพราะบอกแค่ว่าโค้ดถูกเรียก ไม่ได้บอกว่าผลถูกต้อง

### Code
```javascript
// โครงสร้าง Arrange-Act-Assert
describe("hashPassword", () => {
  test("คืนค่าที่ไม่เหมือนรหัสผ่านต้นฉบับ", async () => {
    const plain = "Passw0rd!";              // Arrange
    const hashed = await hashPassword(plain); // Act
    expect(hashed).not.toBe(plain);           // Assert
  });
});
```

```javascript
// Matcher ที่ใช้บ่อย
expect(status).toBe(200);              // ค่าเท่ากันแบบ ===
expect(body).toEqual({ id: 1 });       // object/array ลึก ๆ
expect(err).toBeNull();
expect(list.length).toBeGreaterThan(0);
expect(roles).toContain("admin");
expect(() => parseToken(null)).toThrow();
await expect(login()).rejects.toThrow();
```

```javascript
// Hooks
beforeEach(() => { /* ทำก่อนทุก test */ });  // แยกสถานะให้แต่ละ test
afterEach(() => { /* ล้างหลังทุก test */ });
beforeAll(async () => { /* เปิดการเชื่อมต่อครั้งเดียว */ });
afterAll(async () => { /* ปิดการเชื่อมต่อครั้งเดียว */ });
```

```javascript
// Mock function
const cb = jest.fn();
cb("hello");
expect(cb).toHaveBeenCalledWith("hello");
expect(cb).toHaveBeenCalledTimes(1);

const next = jest.fn();
const getUser = jest.fn().mockResolvedValue({ id: 1 });   // async
const add = jest.fn().mockReturnValue(3);                 // sync
```

```javascript
// Mock module ทั้งไฟล์ (ต้องอยู่บนสุดของไฟล์)
jest.mock("./db");
const pool = require("./db");
pool.query.mockResolvedValueOnce([[{ id: 1, email: "a@b.c" }]]);
```

```javascript
// Supertest: ทดสอบ endpoint โดยไม่เปิด port
const request = require("supertest");
const app = require("./app");   // app.js ต้องไม่มี app.listen()

const res = await request(app)
  .post("/api/v1/auth/register")
  .send({ email: "new@example.com", password: "Passw0rd!" });
expect(res.status).toBe(201);
expect(res.body.data.role).toBe("student");
```

```json
// package.json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage"
}
```

---

## สัปดาห์ 10: OpenAPI, Swagger & DX

### เนื้อหา
- **DX (Developer Experience)** คือประสบการณ์ของนักพัฒนาคนอื่นที่ต้องใช้ API ของเรา
- DX ดีต้องมี: เอกสารตรงกับโค้ด, ตัวอย่างใช้ได้ทันที, error message ชัดเจน, มี versioning
- DX ไม่ดีทำให้เกิดต้นทุน: Client รอคำตอบนาน, เข้าใจ schema ผิด, ผู้พัฒนา API เป็นคอขวด
- **OpenAPI 3.0** คือมาตรฐานเปิดสำหรับอธิบาย API เขียนด้วย YAML หรือ JSON
- ส่วนหลักของไฟล์ OpenAPI
  - `info` ชื่อและ version
  - `servers` URL ของ server
  - `paths` endpoint, method, parameter, request body, response
  - `components.schemas` data model ที่ใช้ซ้ำ
  - `components.securitySchemes` วิธียืนยันตัวตน เช่น JWT
- **`$ref`** อ้างอิง schema ที่นิยามไว้ที่เดียว ลดการเขียนซ้ำ
- **ต้องระบุ response ให้ครบ** ไม่ใช่แค่ 200 เช่น 400, 401, 403, 404, 409
- **Swagger UI** แปลงไฟล์ OpenAPI เป็นหน้าเว็บที่กดทดลองเรียก endpoint ได้
- **Security** ไม่ควร expose `/api-docs` บน production โดยไม่มีการป้องกัน
- **แนวทางรักษาความสอดคล้องเอกสารกับโค้ด**: ปรับ `openapi.yaml` ทุกครั้งที่แก้ endpoint, ตรวจเองก่อน commit, code review, contract testing
- **Postman Collection** รวม request ทั้งหมดไว้ไฟล์เดียว และใช้ Environment Variable แทนค่าที่เปลี่ยนบ่อย
- **ต้อง export สองไฟล์คู่กัน**: Collection (request + test script) และ Environment (ค่าตัวแปร)
- **Newman** รัน Collection ผ่าน command line เหมาะกับ CI/CD
- **API-First Design** คือทีมตกลงกันด้วย OpenAPI ก่อนเริ่มเขียนโค้ด Frontend ทำงานคู่ขนานได้ด้วย mock server

### Code
```yaml
# openapi.yaml: โครงสร้างหลัก
openapi: 3.0.3
info:
  title: Student API
  version: 1.0.0
servers:
  - url: http://localhost:3000/api/v1
paths:
  /students:
    get:
      summary: ดึงรายการนิสิตทั้งหมด
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
      responses:
        "200":
          description: สำเร็จ
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/StudentListResponse"
        "401":
          description: ไม่ได้แนบ token
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
  schemas:
    Student:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
```

```yaml
# ลบ: ต้องมี 403 ถ้าจำกัดสิทธิ์ admin
/students/{id}:
  delete:
    security:
      - bearerAuth: []
    parameters:
      - name: id
        in: path
        required: true
        schema: { type: integer }
    responses:
      "200": { description: ลบสำเร็จ }
      "403": { description: ไม่มีสิทธิ์ลบ }
      "404": { description: ไม่พบนิสิต }
```

```javascript
// app.js: mount Swagger UI
const swaggerUi = require("swagger-ui-express");
const YAML = require("js-yaml");
const fs = require("fs");
const path = require("path");

const openapiDocument = YAML.load(
  fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"),
);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
```

```javascript
// ป้องกันไม่ให้เปิดบน production
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
}
```

```javascript
// Postman Tests tab ของ POST /auth/login: เก็บ token ไว้ใช้ต่อ
const response = pm.response.json();
pm.environment.set("authToken", response.token);
```

```javascript
// Postman Tests tab: ตรวจผลลัพธ์
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});
pm.test("Response has pagination info", function () {
  pm.expect(pm.response.json()).to.have.property("pagination");
});
```

```bash
# Newman และ Prism
npm install -g newman
newman run postman_collection.json -e environment.json
npx @stoplight/prism-cli mock openapi.yaml
```

---

## สัปดาห์ 11: External API Integration & Resilience

### เนื้อหา
- **หลักการ**: ระบบต้องไม่ล่มตามบริการภายนอก (**Graceful Degradation**) และต้องมี **Resilience** คือทำงานต่อได้แม้บางส่วนล้มเหลว
- **ความเสี่ยงของการพึ่งบริการภายนอก**: downtime, network error ชั่วคราว, ตอบช้า, เปลี่ยน response โดยไม่บอก
- **Axios vs fetch**: Axios มี timeout, แปลง JSON อัตโนมัติ, throw error เมื่อ status ไม่ใช่ 2xx, มี interceptor ส่วน fetch ต้องทำเองทั้งหมด
- **การแยกประเภท error**
  - มี `error.response`: server ตอบกลับมาแล้ว (เช่น 404, 500)
  - `error.code === "ECONNABORTED"`: timeout
  - ไม่มี `error.response` และไม่ใช่ timeout: network error (DNS ผิด, connection refused)
- **Retry ควรเกิดเมื่อ** network error, timeout, 5xx, 429
- **Retry ไม่ควรเกิดเมื่อ** 400, 401, 404 เพราะลองซ้ำก็ผิดเหมือนเดิม
- **Transient failure** (ชั่วคราว) ควร retry ส่วน **Permanent failure** (ถาวร) ไม่ควร
- **Fixed delay** รอเท่ากันทุกครั้ง เขียนง่ายแต่ client หลายตัวจะ retry พร้อมกัน
- **Exponential backoff** รอนานขึ้นเป็นทวีคูณ (1s, 2s, 4s) ลดภาระบริการที่กำลังฟื้น
- **Thundering herd** คือ client จำนวนมาก retry พร้อมกัน ทำให้บริการล้มซ้ำ
- **Jitter** สุ่มเวลาเพิ่มเพื่อกระจาย retry ในวิชาใช้ **Equal Jitter** = `base/2 + สุ่ม(0 ถึง base/2)`
- **Timeout** ต้องกำหนดเสมอ เพราะไม่งั้น request ค้างไม่มีกำหนด ใช้หน่วยมิลลิวินาที
- **เลือกค่า timeout**: ถ้าผู้ใช้รอ (synchronous) ควรสั้น ราว 2–5 วินาที, งาน background ตั้งนานได้
- **เวลารวมที่ผู้ใช้รอ** ≈ timeout × จำนวนครั้งที่เรียก + เวลารอ backoff
- **Fallback** คือให้ระบบตอบอย่างมีเหตุผลเมื่อบริการภายนอกล้มแม้ retry ครบแล้ว
  - ใช้ค่า default
  - ใช้ cache เดิม (stale-while-error) และบอกว่าอาจไม่ล่าสุด
  - ตอบ 503 พร้อม error code ที่ชัดเจน
  - เลื่อนงานไปทำทีหลัง (นอกขอบเขตวิชา)
- **Webhook** คือบริการภายนอกเรียกกลับเข้ามาหาเรา (inbound) ต่างจาก API ปกติที่เราเป็นผู้เรียก (outbound)
- **Webhook ต้องทำ 3 อย่าง**: ตอบ 200 ให้เร็ว, ตรวจ signature ก่อนประมวลผล, กัน event ซ้ำ (idempotency)
- **HMAC** ใช้ secret ร่วมกันในการคำนวณ hash ของ payload ถ้า payload หรือ secret เปลี่ยนแม้ตัวเดียว ค่า hash จะเปลี่ยน
- **เปรียบเทียบ signature ด้วย `timingSafeEqual`** ไม่ใช่ `===` เพื่อกัน timing attack
- **Replay attack** ยังไม่กันด้วย signature อย่างเดียว ต้องใช้ timestamp หรือตรวจ event ID เพิ่ม
- **OWASP A08** Software and Data Integrity Failures เกี่ยวกับการรับข้อมูลจากภายนอกโดยไม่ตรวจความถูกต้อง

### Code
```javascript
// ตรวจว่า error ควร retry หรือไม่
function isRetryable(error) {
  if (!error.response) return true;          // network error หรือ timeout
  const status = error.response.status;
  return status === 429 || (status >= 500 && status < 600);
}
```

```javascript
// Retry + exponential backoff + equal jitter
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, timeoutMs = 3000, maxRetries = 2) {
  let attempt = 0;
  while (true) {
    try {
      const response = await axios.get(url, { timeout: timeoutMs });
      return response.data;
    } catch (error) {
      attempt += 1;
      const canRetry = attempt <= maxRetries && isRetryable(error);
      if (!canRetry) throw error;

      const baseBackoffMs = 2 ** (attempt - 1) * 1000;        // 1s, 2s, 4s
      const backoffMs = baseBackoffMs / 2 + Math.random() * (baseBackoffMs / 2);
      await delay(backoffMs);
    }
  }
}
```

```javascript
// แยก error ตอน catch
try {
  const response = await axios.get(url, { timeout: 3000 });
  return response.data;
} catch (error) {
  if (error.response) {
    console.error(`External API responded with ${error.response.status}`);
  } else if (error.code === "ECONNABORTED") {
    console.error("External API request timed out");
  } else {
    console.error(`Network error: ${error.message}`);
  }
  throw error;
}
```

```javascript
// Fallback: ไม่ให้ error หลุดไปถึงผู้ใช้
async function checkWeatherOrFallback(location) {
  try {
    const data = await fetchWithRetry(`https://api.example-weather.com/v1/current?location=${location}`, 3000, 2);
    return { source: "external", data };
  } catch (error) {
    return { source: "fallback", data: null, message: "ไม่สามารถตรวจสอบสภาพอากาศได้ในขณะนี้" };
  }
}
```

```javascript
// Webhook: ตรวจ signature ก่อนประมวลผล
const crypto = require("crypto");

function verifySignature(payload, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const received = Buffer.from(signatureHeader, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (received.length !== expectedBuf.length) return false;   // ต้องเช็กความยาวก่อน
  return crypto.timingSafeEqual(received, expectedBuf);
}

router.post(
  "/webhooks/payment",
  express.raw({ type: "application/json" }),   // ต้องใช้ raw body
  (req, res) => {
    const ok = verifySignature(req.body, req.headers["x-webhook-signature"], process.env.PAYMENT_WEBHOOK_SECRET);
    if (!ok) return res.status(401).json({ error: { code: "INVALID_SIGNATURE" } });
    res.status(200).json({ received: true });
  },
);
```

---

## สัปดาห์ 12: Advanced Input Validation & Rate Limiting

### เนื้อหา
- **ช่องโหว่ของ input ที่ไม่ตรวจ**
  - Mass assignment: ส่ง `role: "admin"` มาแล้วถูกบันทึก (A01)
  - Type confusion: ส่ง string ไปที่ field ที่ควรเป็นตัวเลข แล้วส่งต่อเข้า query (A05)
  - Oversized payload: ส่ง array ขนาดใหญ่มาก กิน memory (A06)
  - Credential stuffing: ยิงรหัสผ่านซ้ำ ๆ (A07)
- **Zod** คือไลบรารี validate ที่กำหนด schema แล้วให้ตรวจให้อัตโนมัติ
- **`.refine()`** ตรวจความสัมพันธ์ระหว่าง field ใน object เดียวกัน คืนค่า `true`/`false` ได้ error เดียว
- **`.superRefine()`** ตรวจเงื่อนไขซับซ้อน และเพิ่ม issue ได้หลายจุดในครั้งเดียว ผ่าน `ctx.addIssue`
- **`safeParse`** ไม่โยน exception แต่คืน `{ success, data }` หรือ `{ success: false, error }`
- **จำกัดขนาด** ทั้งที่ระดับ schema (`.min()`, `.max()` ของ array) และระดับ Express (`express.json({ limit })`)
- **Rate limiting กับ Throttling**
  - Rate limiting ปฏิเสธทันทีด้วย 429 เหมาะกับการกัน brute-force
  - Throttling หน่วงเวลาตอบแทนการปฏิเสธ
- **express-rate-limit** นับตาม IP โดยค่าเริ่มต้น
- **ข้อจำกัดของ express-rate-limit**
  - เก็บตัวนับใน memory ของ process เดียว
  - หลาย process หรือหลาย instance จะแยกตัวนับกัน ผู้ใช้จึงเข้าได้เกินโควตา
  - ทางแก้ production: ใช้ Redis ผ่าน `rate-limit-redis`
- **หลัง reverse proxy** ต้องตั้ง `trust proxy` ไม่งั้น `req.ip` จะเป็น IP ของ proxy ทุกคน
- **Rate limit ตาม user** ใช้ `req.user.id` เป็น key ได้ ถ้าใช้ได้หลังยืนยันตัวตนแล้ว ผู้ใช้หลายคนที่อยู่หลัง NAT เดียวกันจะไม่ถูกนับรวม
- **Postman Collection Runner** ใช้จำลองการยิงซ้ำ ๆ เพื่อดูว่าได้ 429 ตามที่คาดหรือไม่
- **OWASP ZAP** scan หาช่องโหว่อัตโนมัติ ผลมีระดับ High, Medium, Low, Informational

### Code
```javascript
// Zod schema พื้นฐาน
const { z } = require("zod");
const createStudentSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(15).max(80),
});
```

```javascript
// Cross-field: endDate ต้องมาหลัง startDate
const enrollmentPeriodSchema = z
  .object({
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    error: "endDate ต้องมาหลัง startDate เสมอ",
    path: ["endDate"],
  });
```

```javascript
// Conditional: นิสิตต่างชาติต้องมี passportNumber, นิสิตไทยต้องมี nationalId
const registrationSchema = z
  .object({
    studentType: z.enum(["local", "international"]),
    passportNumber: z.string().optional(),
    nationalId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.studentType === "international" && !data.passportNumber) {
      ctx.addIssue({ code: "custom", message: "ต้องระบุ passportNumber", path: ["passportNumber"] });
    }
    if (data.studentType === "local" && !data.nationalId) {
      ctx.addIssue({ code: "custom", message: "ต้องระบุ nationalId", path: ["nationalId"] });
    }
  });
```

```javascript
// จำกัดจำนวนใน array และขนาด body
const bulkCreateSchema = z.object({
  students: z.array(createStudentSchema).min(1).max(50),
});
app.use(express.json({ limit: "100kb" }));
```

```javascript
// Middleware validate ใช้ซ้ำได้
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
          details: result.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
        },
      });
    }
    req.body = result.data;
    next();
  };
}
router.post("/students", validate(createStudentSchema), createStudent);
```

```javascript
// express-rate-limit: ตัวเข้มสำหรับ login และตัวทั่วไป
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 นาที
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.set("trust proxy", 1);      // ถ้าอยู่หลัง reverse proxy
app.use(generalLimiter);
app.use("/auth/login", authLimiter);
```

```javascript
// Rate limit ตาม user หลัง authenticateToken
const { ipKeyGenerator } = require("express-rate-limit");
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id?.toString() || ipKeyGenerator(req.ip),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
app.use("/api/v1/students", authenticateToken, userLimiter);
```

---

## สัปดาห์ 13: Microservices Architecture

### เนื้อหา
- **Monolithic** คือ Backend ทั้งหมดอยู่ใน codebase เดียว deploy เป็นหน่วยเดียว ใช้ฐานข้อมูลร่วมกัน
- **Microservices** คือแยกเป็นบริการย่อยที่มีขอบเขตชัด deploy แยกกัน มีฐานข้อมูลของตัวเอง
- **ข้อดีของ Microservices**: deploy อิสระ scale เฉพาะส่วนที่โหลดสูง ความล้มเหลวจำกัดอยู่ในบริการนั้น
- **ข้อเสีย**: ซับซ้อนกว่ามาก ต้องดูแลเครือข่าย ข้อมูลกระจาย ทดสอบยากขึ้น
- **Distributed Monolith** คือแยกเป็นหลาย service แต่ยัง coupling กันแน่น ได้ข้อเสียของทั้งสองแบบ
- **ทีมเล็กควรเริ่มจาก Modular Monolith** คือออกแบบขอบเขตภายในให้ชัดก่อน แล้วค่อยแยกเมื่อมีเหตุผลรองรับ
- **Bounded Context** คือขอบเขตที่คำศัพท์และกฎทางธุรกิจมีความหมายชัดเจน ใช้เป็นหลักในการแบ่งบริการ
- **ไม่แบ่งตามชั้นเทคนิค** เช่น "Database Service" หรือ "Validation Service"
- **เกณฑ์ตัดสินใจแบ่งบริการ**: ความรับผิดชอบทางธุรกิจ, อัตราการเปลี่ยนแปลง, ความต้องการ scale, data ownership, ทีมงาน
- **API Gateway** คือจุดเข้าเดียวของ client ทำ routing, ตรวจ JWT, rate limit, logging ที่จุดเดียว
- **ปัญหาเมื่อไม่มี Gateway**: client ต้องรู้ URL ทุกบริการ, เรื่องซ้ำซ้อนต้องเขียนทุกบริการ, การปรับปรุงบริการกระทบ client โดยตรง, ควบคุมความปลอดภัยยาก
- **Synchronous** เรียกแล้วรอคำตอบทันที ข้อดีคือเข้าใจง่าย ข้อเสียคือผู้เรียกต้องรอและกระทบเมื่อปลายทางล้ม
- **Asynchronous** ส่ง event ไปที่ Message Broker (เช่น RabbitMQ, Kafka) แล้วทำงานต่อ ข้อดีคือ decouple ด้านเวลา ข้อเสียคือซับซ้อนและต้องรับมือ eventual consistency
- **Eventual consistency** คือข้อมูลอาจไม่ตรงกันชั่วคราว แต่จะตรงกันในที่สุดถ้าไม่มีการเปลี่ยนแปลงเพิ่ม
- **Circuit breaker** มี 3 สถานะ
  - Closed: ปล่อย request ตามปกติ
  - Open: ปฏิเสธทันทีแบบ fail fast ไม่ส่งไปปลายทาง
  - Half-Open: ลองส่ง request น้อย ๆ หลังครบเวลาที่กำหนด ถ้าผ่านกลับไป Closed

### Code
```javascript
// Gateway: ตรวจ JWT ที่จุดเดียว
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid token" } });
  }
  try {
    req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } });
  }
}
```

```javascript
// Gateway: ส่งต่อไปยังบริการ students และตัด /api/v1 ออก
app.use("/api/v1/students", authenticate, async (req, res) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${SERVICES.students}${req.originalUrl.replace("/api/v1", "")}`,
      data: req.body,
      timeout: 3000,
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) return res.status(error.response.status).json(error.response.data);
    return res.status(503).json({ error: { code: "SERVICE_UNAVAILABLE", message: "Student service is currently unavailable" } });
  }
});
```

```javascript
// Synchronous: Enrollment เรียก Student ก่อนลงทะเบียน
async function validateStudentExists(studentId) {
  return await fetchWithRetry(`http://localhost:4001/students/${studentId}`, 3000, 2);
}
```

---

## สัปดาห์ 14: Schema Evolution & Large-Scale Backend

### เนื้อหา
- การแก้ schema ด้วยมือ (ALTER TABLE ตรง ๆ) อันตรายเมื่อมีข้อมูลจริงแล้ว ไม่มีแผนย้อนกลับ และแต่ละคนมีฐานไม่ตรงกัน
- **Migration** คือไฟล์บันทึกการเปลี่ยน schema เป็นลำดับขั้น มี `up` (ไปข้างหน้า) และ `down` (ย้อนกลับ)
- **Knex.js** เป็นเครื่องมือ migration ที่เลือกในวิชา เพราะโปรเจกต์ใช้ `mysql2` เขียน query ตรง ๆ อยู่แล้ว
- **ตาราง `knex_migrations`** บันทึกว่าไฟล์ไหนรันแล้ว จึงรันซ้ำอย่างปลอดภัย
- **ชื่อไฟล์**: ห้ามแก้ส่วน timestamp, ใช้รูปแบบ `add_<column>_to_<table>`, `remove_<column>_from_<table>`, `create_<table>_table`
- **Column ใหม่ที่มีข้อมูลอยู่แล้ว** ต้องเป็น nullable หรือมี default ไม่งั้น migration ล้มเหลว
- **`down` ต้องมีเสมอ** ถ้าย้อนกลับไม่ได้จริง ให้ใส่ comment อธิบาย
- **Expand-Contract** สำหรับระบบที่ต้องให้ใช้งานต่อเนื่อง
  1. Expand: เพิ่ม column ใหม่คู่กับของเดิม
  2. Migrate: แก้โค้ดให้เขียนทั้งสอง column แล้วย้ายข้อมูลเดิมด้วย backfill
  3. Contract: เมื่อไม่มีโค้ดอ้างอิงของเดิมแล้ว ค่อยลบ
- **Production best practice**
  1. สำรองข้อมูลด้วย `mysqldump` ก่อนรัน
  2. ทดสอบบน staging ที่มีข้อมูลใกล้เคียงของจริง
  3. ตรวจว่า `down` ใช้ได้จริงก่อน deploy
  4. ใช้ Expand-Contract กับการเปลี่ยนที่กระทบ column ที่ยังใช้งานอยู่
  5. รัน migration ก่อน แล้วค่อย deploy โค้ด (migrate-then-deploy)
  6. รันตอนผู้ใช้น้อย และเตรียมแผน rollback ไว้
- **Vertical scaling** เพิ่มสเปกเครื่องเดิม ทำง่ายแต่มีเพดาน
- **Horizontal scaling** เพิ่มจำนวนเครื่อง ขยายได้มากกว่า แต่แอปต้องเป็น **stateless** คือไม่เก็บ session ไว้ใน memory ของเครื่อง
- **JWT** ทำให้แอป stateless จึงรองรับ horizontal scaling ได้
- **Connection pool**: แต่ละ instance มี pool ของตัวเอง ถ้า 3 instance × 10 connection = 30 ต้องไม่เกิน `max_connections` ของ MySQL ไม่งั้นเกิด `ER_CON_COUNT_ERROR`
- **Read replica** แยก query อ่านไปที่สำเนาฐานข้อมูล ส่วนเขียนยังไปที่ primary ข้อเสียคือ replication lag
- **Load balancer** ให้ client เรียกผ่านจุดเดียว แล้วกระจายไป instance ต่าง ๆ
  - Round Robin: วนตามลำดับ เหมาะกับเครื่องสเปกเท่ากันและงานขนาดใกล้เคียงกัน
  - Least Connections: ส่งไปที่ที่มี connection น้อยสุด เหมาะกับงานที่ใช้เวลาต่างกันมาก
  - IP Hash: ส่ง IP เดิมไปเครื่องเดิมเสมอ ใช้เมื่อต้องการ sticky session
- **X-Forwarded-For** จาก load balancer สำคัญต่อ rate limit ถ้าไม่ส่ง express จะเห็นแค่ IP ของ LB

### Code
```bash
# ติดตั้งและสร้าง config
npm install knex mysql2
npx knex init

# สร้างและรัน migration
npx knex migrate:make add_phone_number_to_students
npx knex migrate:latest
npx knex migrate:rollback
```

```javascript
// knexfile.js
module.exports = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "student_api_db",
      charset: "utf8mb4",
    },
    migrations: { directory: "./migrations" },
  },
};
```

```javascript
// migrations/20260101120000_add_phone_number_to_students.js
exports.up = function (knex) {
  return knex.schema.alterTable("students", (table) => {
    table.string("phone_number", 20).nullable().defaultTo(null);
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable("students", (table) => {
    table.dropColumn("phone_number");
  });
};
```

```javascript
// Expand-Contract: ขั้นที่ 1 (Expand)
exports.up = function (knex) {
  return knex.schema.alterTable("students", (table) => {
    table.string("email_address", 100).nullable().defaultTo(null);
  });
};
exports.down = function (knex) {
  return knex.schema.alterTable("students", (table) => {
    table.dropColumn("email_address");
  });
};
```

```nginx
# Load balancer ด้วย Nginx
upstream student_api_backend {
    server 127.0.0.1:4001;
    server 127.0.0.1:4002;
    server 127.0.0.1:4003;
}
server {
    listen 80;
    location / {
        proxy_pass http://student_api_backend;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## ภาพรวมเชื่อมโยง

| ปัญหา | เครื่องมือที่ใช้แก้ | สัปดาห์ |
|---|---|---|
| ทดสอบด้วยมือไม่ได้ผล | Jest, Supertest | 9 |
| ทดสอบโดยไม่พึ่ง DB | Mock | 9 |
| ผู้อื่นใช้ API ไม่เข้าใจ | OpenAPI, Swagger UI, Postman | 10 |
| บริการภายนอกล้ม | Timeout, Retry, Fallback | 11 |
| ข้อมูลรับเข้าไม่ถูกต้อง | Zod | 12 |
| ถูกยิงรหัสผ่านซ้ำ | Rate limit | 12 |
| ระบบใหญ่จนแยกส่วน | Microservices, API Gateway | 13 |
| แก้ schema กับข้อมูลจริง | Migration, Expand-Contract | 14 |
| ผู้ใช้เยอะขึ้น | Horizontal scaling, Load balancer | 14 |
