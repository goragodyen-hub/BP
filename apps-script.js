// Google Apps Script สำหรับรับส่งข้อมูลความดันโลหิต
// 1. ไปที่ Google Sheets สร้าง Sheet ใหม่
// 2. ไปที่ ส่วนขยาย (Extensions) -> Apps Script
// 3. วางโค้ดนี้ลงไปทับของเดิม
// 4. กด "นำไปใช้งาน" (Deploy) -> "การนำไปใช้งานชุดใหม่" (New deployment)
// 5. เลือกประเภทเป็น "เว็บแอป" (Web app)
// 6. ตั้งค่าการเข้าถึงเป็น "ทุกคน" (Anyone)
// 7. กด Deploy และคัดลอก "URL ของเว็บแอป" มาใส่ใน React App

const SHEET_NAME = 'Sheet1';

function setupSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    const newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
    // สร้างหัวตาราง
    newSheet.appendRow([
      'Timestamp',
      'วันที่ (Date)',
      'ช่วงเวลา (Session)',
      'ครั้งที่ 1 ตัวบน (M1 Systolic)',
      'ครั้งที่ 1 ตัวล่าง (M1 Diastolic)',
      'ครั้งที่ 1 ชีพจร (M1 Pulse)',
      'ครั้งที่ 2 ตัวบน (M2 Systolic)',
      'ครั้งที่ 2 ตัวล่าง (M2 Diastolic)',
      'ครั้งที่ 2 ชีพจร (M2 Pulse)',
      'หมายเหตุ (Remarks)'
    ]);
    newSheet.getRange("A1:J1").setFontWeight("bold");
  }
}

// เมื่อมีการเรียกอ่านข้อมูล (ดึงประวัติ)
function doGet(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return createJsonResponse({ status: 'error', message: 'Sheet not found' });

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse({ status: 'success', data: [] });
    }

    const headers = data[0];
    const rows = data.slice(1);
    
    // แปลงข้อมูลเป็น JSON (ดึงแค่ 20 รายการล่าสุด)
    const result = rows.map((row, idx) => {
      let obj = {};
      obj.rowNumber = idx + 2; // +1 สำหรับแถวหัวตาราง, +1 เพราะ Array เริ่มที่ 0
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    }).reverse().slice(0, 20); // แสดงข้อมูลล่าสุดก่อน

    return createJsonResponse({ status: 'success', data: result });

  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

// เมื่อมีการส่งข้อมูลมาบันทึก
function doPost(e) {
  try {
    let payload;
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      return createJsonResponse({ status: 'error', message: 'No data provided' });
    }

    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
       setupSheet();
       sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    }

    if (payload.action === 'delete') {
      if (!payload.rowNumber) {
        return createJsonResponse({ status: 'error', message: 'Row number required for delete' });
      }
      sheet.deleteRow(payload.rowNumber);
      return createJsonResponse({ status: 'success', message: 'Data deleted successfully' });
    }

    const timestamp = new Date();
    
    const rowData = [
      timestamp,
      payload.date || '',
      payload.session || '',
      payload.m1_sys || '',
      payload.m1_dia || '',
      payload.m1_pulse || '',
      payload.m2_sys || '',
      payload.m2_dia || '',
      payload.m2_pulse || '',
      payload.remarks || ''
    ];

    sheet.appendRow(rowData);

    return createJsonResponse({ status: 'success', message: 'Data saved successfully' });

  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function createJsonResponse(responseObject) {
  return ContentService
    .createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}

// สร้างฟังก์ชันจัดการ CORS สำหรับ OPTIONS request
function doOptions(e) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeaders(headers);
}
