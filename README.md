# 📱 บันทึกรายรับ-รายจ่าย LIFF App

แอปบันทึกรายรับ-รายจ่ายผ่าน LINE LIFF เชื่อมต่อ Google Sheets แบบสมบูรณ์
ออกแบบให้ใช้งานบนมือถือเป็นหลัก UI สมัยใหม่ ใช้งานง่าย

> by.MerCy-TKM

---

## ✨ ฟีเจอร์

- บันทึกรายรับ-รายจ่ายผ่าน LINE
- 8 หมวดหมู่รายรับ + 12 หมวดหมู่รายจ่าย พร้อมไอคอน
- ดูสถิติเป็นกราฟวงกลม + กราฟแท่ง 7 วันล่าสุด
- กรองรายการตามวัน/สัปดาห์/เดือน/ปี
- บันทึกอัตโนมัติเข้า Google Sheets
- ทำงาน offline-first (บันทึก local ก่อน แล้วซิงค์ขึ้น cloud)
- ส่งออกข้อมูลเป็น CSV
- รองรับภาษาไทยเต็มรูปแบบ
- Login อัตโนมัติด้วย LINE

---

## 📂 ไฟล์ในโปรเจกต์

```
expense-tracker/
├── index.html              # หน้าแอปหลัก
├── app.js                  # Logic ทั้งหมด
├── google-apps-script.gs   # Backend ของ Google Sheets
└── README.md               # คู่มือนี้
```

---

## 🚀 วิธีติดตั้ง (ขั้นตอนสำคัญ — ทำตามลำดับ)

### ขั้นที่ 1: เตรียม Google Sheet

1. เปิด [Google Sheets](https://sheets.google.com) → สร้าง Spreadsheet ใหม่
2. ตั้งชื่อตามใจ เช่น "Expense Tracker"
3. คัดลอก **Sheet ID** จาก URL:
   ```
   docs.google.com/spreadsheets/d/[นี่คือ_SHEET_ID]/edit
   ```

### ขั้นที่ 2: ตั้งค่า Apps Script Backend

1. ในหน้า Sheet → เมนู **Extensions** → **Apps Script**
2. ลบโค้ดเดิมในไฟล์ `Code.gs` ออกให้หมด
3. คัดลอกโค้ดทั้งหมดจาก `google-apps-script.gs` มาวาง
4. แก้บรรทัดนี้ให้เป็น Sheet ID ของคุณ:
   ```javascript
   const SHEET_ID = "YOUR_SHEET_ID_HERE"; // ← ใส่ Sheet ID ตรงนี้
   ```
5. กด 💾 **Save** (Ctrl+S)
6. เลือก function `setupSheet` → กด ▶ **Run** (เพื่อสร้าง headers)
   - ครั้งแรกจะขออนุญาต → กด **Review permissions** → เลือกบัญชี Google → **Allow**
7. กด **Deploy** มุมขวาบน → **New deployment**
8. คลิก ⚙️ ข้าง "Select type" → เลือก **Web app**
9. ตั้งค่า:
   - **Description**: Expense Tracker API
   - **Execute as**: Me (your@email.com)
   - **Who has access**: **Anyone** ⚠️ สำคัญ
10. กด **Deploy** → คัดลอก **Web app URL** เก็บไว้

### ขั้นที่ 3: สร้าง LIFF App

1. เข้า [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง **Provider** ใหม่ (ถ้ายังไม่มี)
3. สร้าง **LINE Login channel** → เลือก Region: Thailand
4. ในแท็บ **LIFF** → **Add LIFF**:
   - **LIFF app name**: บันทึกรายรับรายจ่าย
   - **Size**: **Full** (เต็มจอ)
   - **Endpoint URL**: URL ที่จะ host หน้า `index.html` (เช่น GitHub Pages, Vercel, Netlify)
   - **Scope**: ✅ profile, ✅ openid
   - **Bot link feature**: On (Aggressive) — ถ้าต้องการ
5. กด **Add** → คัดลอก **LIFF ID** (รูปแบบ `1234567890-AbCdEfGh`)

### ขั้นที่ 4: Deploy หน้าเว็บ

#### ตัวเลือก A: GitHub Pages (แนะนำ - ฟรี)
```bash
# สร้าง repo ใหม่ใน GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/expense-tracker.git
git push -u origin main
```
แล้วเข้า Settings → Pages → Source: main branch → Save
URL จะเป็น: `https://USERNAME.github.io/expense-tracker/`

#### ตัวเลือก B: Vercel (ง่ายที่สุด)
1. เข้า [vercel.com](https://vercel.com) → Login ด้วย GitHub
2. Import repo → Deploy (ไม่ต้องตั้งค่าอะไร)

#### ตัวเลือก C: Netlify Drop
ลากโฟลเดอร์ลงไปที่ [app.netlify.com/drop](https://app.netlify.com/drop) ได้เลย

### ขั้นที่ 5: ใส่ LIFF ID ในโค้ด

แก้ในไฟล์ `app.js` บรรทัดบนสุด:
```javascript
const LIFF_ID = "1234567890-AbCdEfGh"; // ← ใส่ LIFF ID จากขั้นที่ 3
```

แล้ว deploy ใหม่อีกครั้ง

### ขั้นที่ 6: ใช้งาน

1. เปิด LIFF URL: `https://liff.line.me/[LIFF_ID]` ในมือถือที่มี LINE
2. Login ด้วย LINE → จะเข้าหน้าแอป
3. ไปที่หน้า **ตั้งค่า** (มุมขวาล่าง)
4. ใส่:
   - **Sheet ID**: จากขั้นที่ 1
   - **Web App URL**: จากขั้นที่ 2
5. กด **บันทึกการตั้งค่า**
6. เริ่มบันทึกรายการได้เลย

---

## 📲 วิธีเชื่อมเข้า LINE Rich Menu

เพื่อให้กดเข้าแอปได้สะดวกจาก LINE OA:

1. เข้า [LINE OA Manager](https://manager.line.biz)
2. **Rich Menu** → Create
3. เลือกรูปเมนู → ในส่วน Action เลือก **Link**
4. ใส่ URL: `https://liff.line.me/YOUR_LIFF_ID`
5. Save → ผู้ใช้กดในเมนู LINE จะเปิดแอปได้ทันที

---

## 🎨 UI/UX ที่ออกแบบไว้

- **สีหลัก LINE Green** (#06C755) — ดูเป็นทางการ เป็นมิตร
- **Bottom Navigation** 4 หน้า: หน้าแรก, สถิติ, รายการ, ตั้งค่า
- **Quick Action Card** — ปุ่มรายรับ/รายจ่ายลอยทับ header
- **Modal แบบ Bottom Sheet** — เพิ่มรายการเร็ว ไม่ต้องเปลี่ยนหน้า
- **Pull-to-refresh** ผ่านปุ่มซิงค์
- **Empty States** ทุกหน้า — บอกผู้ใช้ชัดเจน
- **Toast Notifications** — feedback ทุกการกระทำ
- **Offline-first** — ใช้ได้แม้เน็ตขาด แล้วซิงค์ภายหลัง
- **Filter chips** ในหน้ารายการ — เลือกประเภทได้ง่าย

---

## 🔧 ปรับแต่งเพิ่มเติม (Optional)

### เพิ่มหมวดหมู่ใหม่
แก้ใน `app.js` ตัวแปร `CATEGORIES`:
```javascript
const CATEGORIES = {
  income: [
    { id: 'salary', name: 'เงินเดือน', icon: 'ti-cash' },
    // เพิ่มที่นี่
    { id: 'newcat', name: 'ของใหม่', icon: 'ti-star' }
  ]
};
```
ดูชื่อไอคอนได้ที่ [tabler.io/icons](https://tabler.io/icons)

### เปลี่ยนสีธีม
ค้น `#06C755` ใน `index.html` แล้วเปลี่ยนเป็นสีอื่น เช่น `#2196F3` (น้ำเงิน)

### เพิ่ม Notification ผ่าน LINE
ใน `google-apps-script.gs` เพิ่ม trigger ที่ดึง LINE Notify token
แล้วยิงข้อความสรุปรายเดือนเข้ากลุ่ม LINE

---

## 🐛 Troubleshooting

| ปัญหา | สาเหตุ/วิธีแก้ |
|------|---------------|
| LIFF ไม่ login | ตรวจ LIFF ID ใน `app.js` ตรงกับใน LINE Console |
| ข้อมูลไม่ขึ้น Sheet | ตรวจ Web App URL + ตรวจว่า Deploy เป็น "Anyone" |
| ฟอนต์ไทยไม่สวย | ตรวจอินเทอร์เน็ต — ใช้ Google Fonts |
| รายการหายหลังปิดแอป | ใช้ HTTPS เท่านั้น (localhost ไม่นับ) |
| ใส่ Sheet ID ผิด | ดูใน URL ของ Sheet — ส่วนระหว่าง `/d/` และ `/edit` |

---

## 📊 โครงสร้างข้อมูลใน Sheet

| คอลัมน์ | ฟิลด์ | คำอธิบาย |
|---------|-------|---------|
| A | ID | tx_1234567890 |
| B | User ID | LINE userId |
| C | User Name | ชื่อจาก LINE |
| D | Type | income / expense |
| E | Amount | ตัวเลข |
| F | Category | salary, food, etc. |
| G | Category Name | ชื่อภาษาไทย |
| H | Note | หมายเหตุ |
| I | Date | YYYY-MM-DD |
| J | Timestamp | ISO 8601 |

---

## 📝 License

ใช้งานได้ฟรี ไม่หวงครับ — by.MerCy-TKM
