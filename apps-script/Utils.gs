/* =========================================================
   LOGIS-TECH SYSTEM
   UTILITIES
   Utils.gs
   ========================================================= */


/* =========================================================
   GET DATABASE
========================================================= */

var ACTIVE_COMPANY_CONTEXT_ = null;

function getDatabase() {
  const context = ACTIVE_COMPANY_CONTEXT_;
  const company = context && context.company ? context.company : "GREENMETAL";
  const spreadsheetId = company === "GREENLIGHT"
    ? CONFIG.GREENLIGHT_DATABASE_SPREADSHEET_ID
    : CONFIG.GREENMETAL_DATABASE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("No operational database is configured for " + company + ".");
  return SpreadsheetApp.openById(spreadsheetId);
}


/* =========================================================
   GET SHEET
========================================================= */

function getSheet(sheetName) {

  const ss = String(sheetName).toUpperCase() === "USERS"
    ? SpreadsheetApp.openById(AUTH_SPREADSHEET_ID)
    : getDatabase();

  const sheet = ss.getSheetByName(sheetName);

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
   COMPANY CONTEXT
   Resolved from the authenticated session + central USERS DB.
   Client-supplied company values are never trusted.
========================================================= */
function getCentralUsersSheet_() {
  const ss = SpreadsheetApp.openById(AUTH_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) throw new Error("Central USERS sheet not found.");
  return sheet;
}

function normalizeCompanyAccess_(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "BOTH") return ["GREENMETAL", "GREENLIGHT"];
  return raw.split(/[,;|]/).map(function(item) {
    return item.trim();
  }).filter(function(item, index, all) {
    return ["GREENMETAL", "GREENLIGHT"].includes(item) && all.indexOf(item) === index;
  });
}

/* =========================================================
   SWITCH ACTIVE COMPANY
   The selected company is verified against the central USERS
   record and stored in the server-side session.
========================================================= */
function switchCompany_(payload) {
  payload = payload || {};
  const token = String(payload.sessionToken || payload.session_token || "").trim();
  const targetCompany = String(payload.company || payload.targetCompany || "").trim().toUpperCase();
  if (!token) throw new Error("AUTH_REQUIRED: Please log out and log in again.");
  if (!["GREENMETAL", "GREENLIGHT"].includes(targetCompany)) {
    return { success: false, code: "INVALID_COMPANY", message: "Please select a valid company." };
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = "LOGISTECH_SESSION_" + token;
  const sessionJson = cache.get(cacheKey);
  if (!sessionJson) throw new Error("SESSION_EXPIRED: Your session expired. Please log in again.");

  let session;
  try { session = JSON.parse(sessionJson); }
  catch (error) { throw new Error("INVALID_SESSION: Please log in again."); }

  const sheet = getCentralUsersSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error("No user accounts were found in the central USERS database.");

  const headers = values[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
  const userIdIndex = headers.indexOf("USER_ID");
  const usernameIndex = headers.indexOf("USERNAME");
  const statusIndex = headers.indexOf("STATUS");
  const accessIndex = headers.indexOf("COMPANY_ACCESS");
  const defaultIndex = headers.indexOf("DEFAULT_COMPANY");
  if ([userIdIndex, usernameIndex, statusIndex, accessIndex, defaultIndex].some(function(index) { return index < 0; })) {
    throw new Error("Central USERS is missing a required company authorization header.");
  }

  let matched = null;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[userIdIndex] || "").trim() === String(session.userId || "").trim() &&
        String(row[usernameIndex] || "").trim().toLowerCase() === String(session.username || "").trim().toLowerCase()) {
      matched = row;
      break;
    }
  }
  if (!matched) throw new Error("ACCOUNT_NOT_FOUND: Please log in again.");
  if (String(matched[statusIndex] || "").trim().toUpperCase() !== "ACTIVE") {
    throw new Error("ACCOUNT_INACTIVE: This account is not active.");
  }

  const access = normalizeCompanyAccess_(matched[accessIndex]);
  const defaultCompany = String(matched[defaultIndex] || "").trim().toUpperCase();
  if (!access.length || !["GREENMETAL", "GREENLIGHT"].includes(defaultCompany) || access.indexOf(defaultCompany) < 0) {
    throw new Error("COMPANY_NOT_CONFIGURED: Ask the administrator to set a valid COMPANY_ACCESS and DEFAULT_COMPANY.");
  }
  if (access.indexOf(targetCompany) < 0) {
    return {
      success: false,
      code: "COMPANY_ACCESS_DENIED",
      message: "Your account is not authorized to access " + targetCompany + "."
    };
  }

  const spreadsheetId = targetCompany === "GREENLIGHT"
    ? CONFIG.GREENLIGHT_DATABASE_SPREADSHEET_ID
    : CONFIG.GREENMETAL_DATABASE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("The operational database for " + targetCompany + " is not configured.");

  session.activeCompany = targetCompany;
  session.companyAccess = String(matched[accessIndex] || "").trim().toUpperCase();
  session.defaultCompany = defaultCompany;
  cache.put(cacheKey, JSON.stringify(session), 21600);

  ACTIVE_COMPANY_CONTEXT_ = {
    company: targetCompany,
    companyAccess: access,
    userId: String(session.userId || ""),
    username: String(session.username || ""),
    spreadsheetId: spreadsheetId
  };

  return {
    success: true,
    message: "Company switched successfully.",
    activeCompany: targetCompany,
    companyAccess: session.companyAccess,
    allowedCompanies: access
  };
}

function establishCompanyContext_(payload) {
  payload = payload || {};
  const token = String(payload.sessionToken || payload.session_token || "").trim();
  if (!token) throw new Error("AUTH_REQUIRED: Please log out and log in again.");

  const sessionJson = CacheService.getScriptCache().get("LOGISTECH_SESSION_" + token);
  if (!sessionJson) throw new Error("SESSION_EXPIRED: Your session expired. Please log in again.");

  let session;
  try { session = JSON.parse(sessionJson); }
  catch (error) { throw new Error("INVALID_SESSION: Please log in again."); }

  const sheet = getCentralUsersSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error("No user accounts were found in the central USERS database.");

  const headers = values[0].map(function(value) {
    return String(value || "").trim().toUpperCase();
  });
  const indexes = {
    userId: headers.indexOf("USER_ID"),
    username: headers.indexOf("USERNAME"),
    status: headers.indexOf("STATUS"),
    companyAccess: headers.indexOf("COMPANY_ACCESS"),
    defaultCompany: headers.indexOf("DEFAULT_COMPANY")
  };
  if (Object.keys(indexes).some(function(key) { return indexes[key] < 0; })) {
    throw new Error("Central USERS must contain USER_ID, USERNAME, STATUS, COMPANY_ACCESS and DEFAULT_COMPANY headers.");
  }

  let matched = null;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (String(row[indexes.userId] || "").trim() === String(session.userId || "").trim() &&
        String(row[indexes.username] || "").trim().toLowerCase() === String(session.username || "").trim().toLowerCase()) {
      matched = row;
      break;
    }
  }
  if (!matched) throw new Error("ACCOUNT_NOT_FOUND: Please log in again.");
  if (String(matched[indexes.status] || "").trim().toUpperCase() !== "ACTIVE") {
    throw new Error("ACCOUNT_INACTIVE: This account is not active.");
  }

  const access = normalizeCompanyAccess_(matched[indexes.companyAccess]);
  const defaultCompany = String(matched[indexes.defaultCompany] || "").trim().toUpperCase();
  if (!access.length || !["GREENMETAL", "GREENLIGHT"].includes(defaultCompany) || access.indexOf(defaultCompany) < 0) {
    throw new Error("COMPANY_NOT_CONFIGURED: Ask the administrator to set a valid COMPANY_ACCESS and DEFAULT_COMPANY for this account.");
  }

  const activeCompany = String(session.activeCompany || defaultCompany).trim().toUpperCase();
  if (["GREENMETAL", "GREENLIGHT"].indexOf(activeCompany) < 0 || access.indexOf(activeCompany) < 0) {
    throw new Error("COMPANY_ACCESS_DENIED: This session is not authorized for the selected company.");
  }

  const spreadsheetId = activeCompany === "GREENLIGHT"
    ? CONFIG.GREENLIGHT_DATABASE_SPREADSHEET_ID
    : CONFIG.GREENMETAL_DATABASE_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("The operational database for " + activeCompany + " is not configured.");

  ACTIVE_COMPANY_CONTEXT_ = {
    company: activeCompany,
    companyAccess: access,
    userId: String(session.userId || ""),
    username: String(session.username || ""),
    spreadsheetId: spreadsheetId
  };
  return ACTIVE_COMPANY_CONTEXT_;
}

/* =========================================================
   SERVER-SIDE SESSION + ROLE AUTHORIZATION
   A valid login session is required for protected actions.
   Role and account status are re-read from the USERS sheet.
========================================================= */

function authorizeRole_(payload, allowedRoles) {
  payload = payload || {};
  allowedRoles = Array.isArray(allowedRoles) ? allowedRoles : [];
  const companyContext = establishCompanyContext_(payload);

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
      session.userId &&
      session.username &&
      rowUserId === String(session.userId).trim() &&
      rowUsername === String(session.username).trim().toLowerCase()
    ) {
      account = {
        userId: rowUserId,
        username: String(values[i][usernameIndex] || "").trim(),
        role: String(values[i][roleIndex] || "").trim().toUpperCase(),
        status: String(values[i][statusIndex] || "").trim().toUpperCase(),
        company: companyContext.company,
        companyAccess: companyContext.companyAccess
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
