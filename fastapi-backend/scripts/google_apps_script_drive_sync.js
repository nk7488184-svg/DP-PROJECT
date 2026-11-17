/**
 * ==============================================================================
 * RoadSentinel - Google Drive & Google Sheets Direct Cloud Receiver
 * Account: neerajjeeadv2025@gmail.com
 * ==============================================================================
 * 
 * Instructions to Deploy (Takes 60 seconds):
 * 1. Open your browser and go to: https://script.google.com
 *    (Make sure you are logged in with neerajjeeadv2025@gmail.com)
 * 2. Click "New project".
 * 3. Delete everything in the editor and paste THIS entire script.
 * 4. Click the blue "Deploy" button (top right) -> Select "New deployment".
 * 5. Click the Gear icon next to "Select type" -> choose "Web app".
 * 6. Set:
 *      - Description: RoadSentinel Cloud Storage
 *      - Execute as: "Me (neerajjeeadv2025@gmail.com)"
 *      - Who has access: "Anyone" (so the Raspberry Pi on the road can upload)
 * 7. Click "Deploy" -> Click "Authorize access" -> choose neerajjeeadv2025@gmail.com.
 * 8. Copy the "Web app URL" (looks like https://script.google.com/macros/s/AKfycb.../exec).
 * 9. Pass this URL to the Raspberry Pi:
 *      python3 rpi_camera_edge.py --drive-webhook https://script.google.com/macros/s/YOUR_URL/exec
 * 
 * That's it! Every vehicle overspeed, license plate, and photo will now be
 * uploaded directly into your Google Drive & Google Sheet 24/7 with ZERO SD card usage!
 * ==============================================================================
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var timestamp = data.timestamp || new Date().toISOString();
    var speed = data.speed_kmh || data.speed || 0.0;
    var limit = data.posted_limit_kmh || 20.0;
    var plate = data.license_plate || data.plate || "WAITING_ALPR";
    var deviceId = data.device_id || "RPI4_CAMERA_UNIT_01";
    var roadName = data.road_name || "Behind A11 on New Construction Road";
    var imageBase64 = data.image_base64 || "";

    // 1. Get or Create dedicated Google Drive folder: "RoadSentinel_IIT_Mandi"
    var folderName = "RoadSentinel_IIT_Mandi";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }

    var imageUrl = "No Image";
    var fileId = "";

    // 2. Decode JPEG photo from RAM and save directly to Google Drive
    if (imageBase64 && imageBase64.length > 50) {
      if (imageBase64.indexOf(",") > -1) {
        imageBase64 = imageBase64.split(",")[1];
      }
      var decodedBytes = Utilities.base64Decode(imageBase64);
      var blob = Utilities.newBlob(decodedBytes, "image/jpeg", "BREACH_" + new Date().getTime() + "_" + plate.replace(/\s+/g, "_") + ".jpg");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = file.getUrl();
      fileId = file.getId();
    }

    // 3. Get or Create dedicated Google Sheet: "RoadSentinel_Traffic_Ledger"
    var sheetName = "RoadSentinel_Traffic_Ledger";
    var files = DriveApp.getFilesByName(sheetName);
    var spreadsheet;
    if (files.hasNext()) {
      spreadsheet = SpreadsheetApp.open(files.next());
    } else {
      spreadsheet = SpreadsheetApp.create(sheetName);
      var fileInRoot = DriveApp.getFileById(spreadsheet.getId());
      folder.addFile(fileInRoot);
      DriveApp.getRootFolder().removeFile(fileInRoot);
      var initSheet = spreadsheet.getActiveSheet();
      initSheet.appendRow([
        "Timestamp (IST)",
        "Device ID",
        "Road Location",
        "Speed (km/h)",
        "Speed Limit (km/h)",
        "Violation (km/h)",
        "License Plate",
        "Google Drive Photo URL",
        "Photo Preview"
      ]);
      initSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
    }

    var sheet = spreadsheet.getActiveSheet();
    var istTime = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
    var delta = Math.max(0, speed - limit).toFixed(1);

    var formulaImage = fileId ? '=IMAGE("https://drive.google.com/uc?export=view&id=' + fileId + '", 1)' : "N/A";

    sheet.appendRow([
      istTime,
      deviceId,
      roadName,
      speed.toFixed(1),
      limit.toFixed(1),
      delta,
      plate,
      imageUrl,
      formulaImage
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Data securely stored directly in neerajjeeadv2025@gmail.com Google Drive & Sheets",
      drive_image_url: imageUrl,
      timestamp: istTime
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  // Returns recent violations stored in Google Sheets for the dashboard
  try {
    var sheetName = "RoadSentinel_Traffic_Ledger";
    var files = DriveApp.getFilesByName(sheetName);
    if (!files.hasNext()) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, records: [] })).setMimeType(ContentService.MimeType.JSON);
    }
    var spreadsheet = SpreadsheetApp.open(files.next());
    var sheet = spreadsheet.getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    var records = [];
    for (var i = 1; i < rows.length; i++) {
      records.push({
        timestamp_ist: rows[i][0],
        device_id: rows[i][1],
        road_name: rows[i][2],
        speed: rows[i][3],
        limit: rows[i][4],
        delta: rows[i][5],
        plate: rows[i][6],
        drive_url: rows[i][7]
      });
    }
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      total: records.length,
      records: records.slice(-50).reverse()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
