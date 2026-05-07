/**
 * ===================================================
 * Backend: Google Apps Script for Expense Tracker
 * by.MerCy-TKM
 * ===================================================
 *
 * วิธีใช้:
 * 1. สร้าง Google Sheet ใหม่ → เปิด Extensions → Apps Script
 * 2. ลบโค้ดเดิม → วางโค้ดนี้ทั้งหมด
 * 3. แก้ค่า SHEET_ID ด้านล่างให้ตรงกับ Sheet ของคุณ
 *    (เอามาจาก URL: docs.google.com/spreadsheets/d/SHEET_ID/edit)
 * 4. กด Deploy → New deployment → Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - กด Deploy → คัดลอก Web App URL
 * 5. นำ URL ไปใส่ในหน้าตั้งค่าของแอป
 */

// ⚙️ แก้ตรงนี้
const SHEET_ID = "1lWsDhiiKEOWK9HvNHh3dntkjmrdVFiWOKZPm9_X00eA";
const SHEET_NAME = "Transactions";

// Initialize sheet headers ถ้ายังไม่มี
function setupSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    const headers = [
      'ID', 'User ID', 'User Name', 'Type', 'Amount',
      'Category', 'Category Name', 'Note', 'Date', 'Timestamp'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#06C755')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Set column widths
    sheet.setColumnWidth(1, 150);  // ID
    sheet.setColumnWidth(2, 200);  // User ID
    sheet.setColumnWidth(3, 150);  // User Name
    sheet.setColumnWidth(4, 80);   // Type
    sheet.setColumnWidth(5, 100);  // Amount
    sheet.setColumnWidth(6, 100);  // Category
    sheet.setColumnWidth(7, 120);  // Category Name
    sheet.setColumnWidth(8, 250);  // Note
    sheet.setColumnWidth(9, 100);  // Date
    sheet.setColumnWidth(10, 180); // Timestamp
  }
  return sheet;
}

// GET — list transactions
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'list') {
      return listTransactions(e.parameter.userId);
    }
    if (action === 'summary') {
      return getSummary(e.parameter.userId);
    }
    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// POST — add / delete / update
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'add') return addTransaction(body.data);
    if (action === 'delete') return deleteTransaction(body.id);
    if (action === 'update') return updateTransaction(body.data);
    if (action === 'bulk_add') return bulkAdd(body.data);

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// === Add transaction ===
function addTransaction(data) {
  const sheet = setupSheet();
  sheet.appendRow([
    data.id,
    data.userId,
    data.userName,
    data.type,
    Number(data.amount),
    data.category,
    data.categoryName,
    data.note || '',
    data.date,
    data.timestamp
  ]);
  return jsonResponse({ success: true, message: 'Added' });
}

// === Bulk add (สำหรับซิงค์รายการที่ค้าง) ===
function bulkAdd(items) {
  if (!items || items.length === 0) {
    return jsonResponse({ success: true, count: 0 });
  }
  const sheet = setupSheet();
  const rows = items.map(d => [
    d.id, d.userId, d.userName, d.type, Number(d.amount),
    d.category, d.categoryName, d.note || '', d.date, d.timestamp
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
  return jsonResponse({ success: true, count: rows.length });
}

// === List transactions of a user ===
function listTransactions(userId) {
  const sheet = setupSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = data
    .filter(row => row[1] === userId)
    .map(row => ({
      id: row[0],
      userId: row[1],
      userName: row[2],
      type: row[3],
      amount: Number(row[4]),
      category: row[5],
      categoryName: row[6],
      note: row[7],
      date: row[8] instanceof Date ? Utilities.formatDate(row[8], 'Asia/Bangkok', 'yyyy-MM-dd') : row[8],
      timestamp: row[9] instanceof Date ? row[9].toISOString() : row[9]
    }))
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  return jsonResponse({ success: true, data: result, count: result.length });
}

// === Delete by ID ===
function deleteTransaction(id) {
  const sheet = setupSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, message: 'Deleted' });
    }
  }
  return jsonResponse({ success: false, error: 'Not found' });
}

// === Update transaction ===
function updateTransaction(data) {
  const sheet = setupSheet();
  const all = sheet.getDataRange().getValues();
  for (let i = 1; i < all.length; i++) {
    if (all[i][0] === data.id) {
      sheet.getRange(i + 1, 1, 1, 10).setValues([[
        data.id, data.userId, data.userName, data.type, Number(data.amount),
        data.category, data.categoryName, data.note || '', data.date, data.timestamp
      ]]);
      return jsonResponse({ success: true, message: 'Updated' });
    }
  }
  return jsonResponse({ success: false, error: 'Not found' });
}

// === Summary by category for user ===
function getSummary(userId) {
  const sheet = setupSheet();
  const data = sheet.getDataRange().getValues();
  data.shift();
  const userTrans = data.filter(row => row[1] === userId);

  const summary = {
    totalIncome: 0,
    totalExpense: 0,
    byCategory: {},
    byMonth: {}
  };

  userTrans.forEach(row => {
    const type = row[3];
    const amount = Number(row[4]);
    const catName = row[6];
    const date = row[8] instanceof Date
      ? Utilities.formatDate(row[8], 'Asia/Bangkok', 'yyyy-MM')
      : (row[8] || '').substring(0, 7);

    if (type === 'income') summary.totalIncome += amount;
    else summary.totalExpense += amount;

    if (!summary.byCategory[catName]) summary.byCategory[catName] = 0;
    summary.byCategory[catName] += amount;

    if (!summary.byMonth[date]) summary.byMonth[date] = { income: 0, expense: 0 };
    summary.byMonth[date][type] += amount;
  });

  return jsonResponse({ success: true, data: summary });
}

// === Helper ===
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// === Test function (รันใน Apps Script editor เพื่อทดสอบ) ===
function testSetup() {
  const sheet = setupSheet();
  Logger.log('Sheet ready: ' + sheet.getName());
  Logger.log('Rows: ' + sheet.getLastRow());
}
