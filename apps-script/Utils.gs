/* =========================================================
   LOGIS-TECH SYSTEM
   UTILITIES
   Utils.gs
   ========================================================= */


/* =========================================================
   GET DATABASE
========================================================= */

function getDatabase() {

  return SpreadsheetApp.openById(
    CONFIG.DATABASE_SPREADSHEET_ID
  );

}


/* =========================================================
   GET SHEET
========================================================= */

function getSheet(sheetName) {

  const ss = getDatabase();

  const sheet =
    ss.getSheetByName(sheetName);

  if (!sheet) {

    throw new Error(
      "Sheet not found: " + sheetName
    );

  }

  return sheet;

}


/* =========================================================
   GET ROOT FOLDER
========================================================= */

function getRootFolder() {

  return DriveApp.getFolderById(
    CONFIG.ROOT_FOLDER_ID
  );

}


/* =========================================================
   GET SUBFOLDER
========================================================= */

function getOrCreateFolder(parentFolder, folderName) {

  const folders =
    parentFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {

    return folders.next();

  }

  return parentFolder.createFolder(folderName);

}


/* =========================================================
   YEAR FOLDER
========================================================= */

function getYearFolder(parentFolder, year) {

  return getOrCreateFolder(
    parentFolder,
    String(year)
  );

}


/* =========================================================
   RECORD TO OBJECT
========================================================= */

function rowToObject(headers, row) {

  const obj = {};

  headers.forEach(function(header, index) {

    obj[header] =
      row[index] !== undefined
        ? row[index]
        : "";

  });

  return obj;

}



/* =========================================================
   GET ALL RECORDS
   OPTIMIZED VERSION: 20261014-01
========================================================= */

function getAllRecords(sheetName) {
  const sheet = getSheet(sheetName);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  // Walang data o headers
  if (lastRow <= 1 || lastCol <= 0) {
    return [];
  }

  // Basahin lamang ang aktuwal na used range
  const values = sheet
    .getRange(1, 1, lastRow, lastCol)
    .getValues();

  const headers = values[0];

  const records = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    // Laktawan ang mga row na walang laman
    const hasData = row.some(function(value) {
      return value !== "" && value !== null;
    });

    if (!hasData) {
      continue;
    }

    records.push(rowToObject(headers, row));
  }

  return records;
}


/* =========================================================
   FIND RECORD
   OPTIMIZED VERSION: 20261014-01

   Binabasa muna ang target column.
   Binabasa lamang ang buong row kapag may match.
========================================================= */

function findRecord(sheetName, columnName, value) {
  const sheet = getSheet(sheetName);

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();

  if (lastRow <= 1 || lastCol <= 0) {
    return null;
  }

  // Basahin ang headers
  const headers = sheet
    .getRange(1, 1, 1, lastCol)
    .getValues()[0];

  const columnIndex = headers.findIndex(function(header) {
    return String(header).trim() === String(columnName).trim();
  });

  if (columnIndex === -1) {
    throw new Error(
      "Column not found: " + columnName +
      " in sheet: " + sheetName
    );
  }

  // Basahin lamang ang column na hinahanap
  const targetValues = sheet
    .getRange(2, columnIndex + 1, lastRow - 1, 1)
    .getValues();

  const searchValue = String(value);

  for (let i = 0; i < targetValues.length; i++) {
    if (String(targetValues[i][0]) === searchValue) {
      // Basahin lamang ang buong row na tumugma
      const matchedRow = sheet
        .getRange(i + 2, 1, 1, lastCol)
        .getValues()[0];

      return rowToObject(headers, matchedRow);
    }
  }

  return null;
}


/* =========================================================
   CREATE UNIQUE ID
========================================================= */

function generateId(prefix) {

  return (

    prefix +
    "-" +
    Utilities.getUuid()

  );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(date) {

  return Utilities.formatDate(
    date,
    CONFIG.TIMEZONE,
    "yyyy-MM-dd"
  );

}


/* =========================================================
   FORMAT DATETIME
========================================================= */

function formatDateTime(date) {

  return Utilities.formatDate(
    date,
    CONFIG.TIMEZONE,
    "yyyy-MM-dd HH:mm:ss"
  );

}


/* =========================================================
   GET CURRENT YEAR
========================================================= */

function getCurrentYear() {

  return Number(
    Utilities.formatDate(
      new Date(),
      CONFIG.TIMEZONE,
      "yyyy"
    )
  );

}
