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


/* =========================================================
   SERVER-SIDE SESSION + ROLE AUTHORIZATION
   A valid login session is required for protected actions.
   Role and account status are re-read from the USERS sheet.
========================================================= */

function authorizeRole_(payload, allowedRoles) {
  payload = payload || {};
  allowedRoles = Array.isArray(allowedRoles) ? allowedRoles : [];

  const sessionToken = String(payload.sessionToken || "").trim();
  if (!sessionToken) {
    throw new Error("AUTH_REQUIRED: Please log out and log in again.");
  }

  const cache = CacheService.getScriptCache();
  const sessionJson = cache.get("LOGISTECH_SESSION_" + sessionToken);
  if (!sessionJson) {
    throw new Error("SESSION_EXPIRED: Your session expired. Please log in again.");
  }

  let session;
  try {
    session = JSON.parse(sessionJson);
  } catch (error) {
    throw new Error("INVALID_SESSION: Please log in again.");
  }

  const spreadsheet = SpreadsheetApp.openById(AUTH_SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName("USERS");
  if (!sheet) throw new Error("USERS sheet not found.");

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error("No user accounts were found.");

  const headers = values[0].map(function(value) {
    return String(value || "").trim().toUpperCase();
  });
  const userIdIndex = headers.indexOf("USER_ID");
  const usernameIndex = headers.indexOf("USERNAME");
  const roleIndex = headers.indexOf("ROLE");
  const statusIndex = headers.indexOf("STATUS");

  if ([userIdIndex, usernameIndex, roleIndex, statusIndex].some(function(i) { return i < 0; })) {
    throw new Error("USERS sheet is missing required authorization columns.");
  }

  let account = null;
  for (let i = 1; i < values.length; i++) {
    const rowUserId = String(values[i][userIdIndex] || "").trim();
    const rowUsername = String(values[i][usernameIndex] || "").trim().toLowerCase();
    if (
      (session.userId && rowUserId === String(session.userId)) ||
      (session.username && rowUsername === String(session.username).trim().toLowerCase())
    ) {
      account = {
        userId: rowUserId,
        username: String(values[i][usernameIndex] || "").trim(),
        role: String(values[i][roleIndex] || "").trim().toUpperCase(),
        status: String(values[i][statusIndex] || "").trim().toUpperCase()
      };
      break;
    }
  }

  if (!account) throw new Error("ACCOUNT_NOT_FOUND: Please log in again.");
  if (account.status !== "ACTIVE") throw new Error("ACCOUNT_INACTIVE: This account is not active.");

  if (allowedRoles.indexOf(account.role) === -1) {
    throw new Error("ACCESS_DENIED: Role " + account.role + " is not allowed to perform this action.");
  }

  return account;
}
