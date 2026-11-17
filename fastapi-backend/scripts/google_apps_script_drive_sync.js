/**
 * ==============================================================================
 * RoadSentinel - Google Drive & Google Sheets Direct Cloud Receiver
 * Account: neerajjeeadv2025@gmail.com
 * ==============================================================================
 * 
 * Features Supported:
 * 1. Sheet 1: "Overspeed_Violations"
 *    - Captures high-res photos directly into Google Drive folder "RoadSentinel_IIT_Mandi".
 *    - Logs timestamp, speed, limit, plate, vehicle type, and image link in Google Sheets.
 * 
 * 2. Sheet 2: "Campus_Road_Segment_Speeds"
 *    - Logs real-time campus road speed analytics (Behind A11 on New Construction Road).
 *    - Records vehicle volume, average speed, V85 (85th percentile), peak speed,
 *      overspeed count, and compliance rate (%) 24/7 even when laptop is offline!
 * ==============================================================================
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var timestamp = data.timestamp || new Date().toISOString();
    var speed = data.speed_kmh || data.speed || 0.0;
    var limit = data.posted_limit_kmh || data.posted_limit || 20.0;
    var plate = data.license_plate || data.plate || "WAITING_ALPR";
    var deviceId = data.device_id || "RPI4_CAMERA_UNIT_01";
    var roadName = data.road_name || "Behind A11 on New Construction Road";
    var imageBase64 = data.image_base64 || "";

    // 1. Get or Create dedicated Google Drive folder: "RoadSentinel_IIT_Mandi"
    var folderName = "RoadSentinel_IIT_Mandi";
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    // 2. Get or Create Master Google Spreadsheet: "RoadSentinel_Traffic_Ledger"
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
    }

    var istTime = Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");

    // ==========================================================================
    // CASE A: Periodic Road Segment Speed Analytics (Campus Road Speeds)
    // ==========================================================================
    if (data.type === "segment_speed_summary") {
      var speedSheetName = "Campus_Road_Segment_Speeds";
      var speedSheet = spreadsheet.getSheetByName(speedSheetName);
      if (!speedSheet) {
        speedSheet = spreadsheet.insertSheet(speedSheetName);
        speedSheet.appendRow([
          "Timestamp (IST)",
          "Road Segment",
          "Posted Limit (km/h)",
          "Vehicles Observed",
          "Average Speed (km/h)",
          "85th Percentile V85 (km/h)",
          "Max Speed (km/h)",
          "Overspeed Violations",
          "Compliance Rate (%)",
          "Traffic Status",
          "Edge Device ID"
        ]);
        speedSheet.getRange("A1:K1").setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
      }

      var vCount = data.vehicle_count || 0;
      var avgSp = (data.avg_speed || 0.0).toFixed(1);
      var v85 = (data.v85_speed || 0.0).toFixed(1);
      var maxSp = (data.max_speed || 0.0).toFixed(1);
      var overCount = data.overspeed_count || 0;
      var compRate = (data.compliance_rate !== undefined ? data.compliance_rate : 100.0).toFixed(1) + "%";
      var status = data.status || "Normal Flow";

      speedSheet.appendRow([
        istTime,
        roadName,
        limit.toFixed(1),
        vCount,
        avgSp,
        v85,
        maxSp,
        overCount,
        compRate,
        status,
        deviceId
      ]);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Campus road speed analytics recorded in Google Drive for neerajjeeadv2025@gmail.com",
        sheet: speedSheetName
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // ==========================================================================
    // CASE B: Speed Breach & Vehicle Snapshot (Overspeeding Enforcement)
    // ==========================================================================
    var violationSheetName = "Overspeed_Violations";
    var violationSheet = spreadsheet.getSheetByName(violationSheetName);
    if (!violationSheet) {
      violationSheet = spreadsheet.getSheetByName("Sheet1") || spreadsheet.insertSheet(violationSheetName);
      violationSheet.setName(violationSheetName);
      if (violationSheet.getLastRow() === 0) {
        violationSheet.appendRow([
          "Timestamp (IST)",
          "Device ID",
          "Road Location",
          "Speed (km/h)",
          "Limit",
          "Over Limit",
          "Plate",
          "Drive Photo URL",
          "Preview"
        ]);
        violationSheet.getRange("A1:I1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");
      }
    }

    var imageUrl = "No Image";
    var fileId = "";

    // Save JPEG photo to Google Drive
    if (imageBase64 && imageBase64.length > 50) {
      if (imageBase64.indexOf(",") > -1) imageBase64 = imageBase64.split(",")[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(imageBase64), "image/jpeg", "BREACH_" + new Date().getTime() + "_" + plate.replace(/\s+/g, "_") + ".jpg");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      imageUrl = file.getUrl();
      fileId = file.getId();
    }

    var imgFormula = fileId ? '=IMAGE("https://drive.google.com/uc?export=view&id=' + fileId + '", 1)' : "N/A";
    var delta = Math.max(0, speed - limit).toFixed(1);

    violationSheet.appendRow([
      istTime,
      deviceId,
      roadName,
      speed.toFixed(1),
      limit.toFixed(1),
      delta,
      plate,
      imageUrl,
      imgFormula
    ]);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Violation & Photo saved to Google Drive",
      url: imageUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
