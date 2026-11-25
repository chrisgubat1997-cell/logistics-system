/* =========================================================
   LOGIS-TECH SYSTEM
   REQUEST CENTER DOCUMENT NUMBERING
   Format: PREFIX-COMPANY-YYYY-00001
   Example: REQ-GM-2026-00001
   Separate sequence per company, document type, and year.
   Uses ScriptLock + ScriptProperties and scans existing records
   to avoid reusing a number already present in the database.
========================================================= */

function generateRequestCenterNumber_(company, documentType, dateValue) {
  const companyName = String(company || "").trim().toUpperCase();
  const companyCodes = {
    GREENMETAL: "GM",
    GREENLIGHT: "GL",
    GM: "GM",
    GL: "GL"
  };

  const companyCode = companyCodes[companyName];
  if (!companyCode) {
    throw new Error("Invalid Request Center company: " + company);
  }

  const definitions = {
    REQUEST: {
      prefix: "REQ",
      sheetName: CONFIG.SHEETS.REQUESTS_MASTER,
      numberColumn: 2,
      patternPrefix: "REQ"
    },
    LIQUIDATION: {
      prefix: "LIQ",
      sheetName: CONFIG.SHEETS.LIQUIDATION_MASTER,
      numberColumn: 2,
      patternPrefix: "LIQ"
    },
    EXPENSE: {
      prefix: "EXP",
      sheetName: CONFIG.SHEETS.LIQUIDATION_DETAILS,
      numberColumn: 1,
      patternPrefix: "EXP"
    },
    ATTACHMENT: {
      prefix: "ATT",
      sheetName: CONFIG.SHEETS.REQUEST_ATTACHMENTS,
      numberColumn: 2,
      patternPrefix: "ATT"
    }
  };

  const type = String(documentType || "").trim().toUpperCase();
  const definition = definitions[type];
  if (!definition) {
    throw new Error("Unsupported Request Center document type: " + documentType);
  }

  const spreadsheetId = companyCode === "GM"
    ? CONFIG.GREENMETAL_DATABASE_SPREADSHEET_ID
    : CONFIG.GREENLIGHT_DATABASE_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error("Missing database spreadsheet ID for " + companyName);
  }

  const timezone = CONFIG.TIMEZONE || "Asia/Manila";
  const date = dateValue ? new Date(dateValue) : new Date();
  if (isNaN(date.getTime())) {
    throw new Error("Invalid document date supplied for numbering.");
  }
  const year = Utilities.formatDate(date, timezone, "yyyy");
  const prefix = definition.prefix + "-" + companyCode + "-" + year + "-";
  const propertyKey = [
    "REQUEST_CENTER_NUMBER",
    definition.prefix,
    companyCode,
    year
  ].join("_");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName(definition.sheetName);
    if (!sheet) {
      throw new Error("Missing sheet " + definition.sheetName + " in " + companyName);
    }

    let highestUsed = 0;
    const lastRow = sheet.getLastRow();

    if (lastRow >= 2) {
      const values = sheet
        .getRange(2, definition.numberColumn, lastRow - 1, 1)
        .getDisplayValues();

      const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const numberPattern = new RegExp("^" + escapedPrefix + "(\\d{5})$");

      values.forEach(function(row) {
        const match = String(row[0] || "").trim().match(numberPattern);
        if (match) {
          highestUsed = Math.max(highestUsed, Number(match[1]));
        }
      });
    }

    const properties = PropertiesService.getScriptProperties();
    const storedSequence = Number(properties.getProperty(propertyKey) || 0);
    const nextSequence = Math.max(highestUsed, storedSequence) + 1;

    if (nextSequence > 99999) {
      throw new Error("Numbering limit reached for " + prefix + " (maximum 99999).");
    }

    properties.setProperty(propertyKey, String(nextSequence));
    return prefix + String(nextSequence).padStart(5, "0");
  } finally {
    lock.releaseLock();
  }
}

/**
 * Internal convenience wrappers. Call these only from trusted
 * server-side create/save functions after validating the user.
 */
function nextRequestNumber_(company, dateValue) {
  return generateRequestCenterNumber_(company, "REQUEST", dateValue);
}

function nextLiquidationNumber_(company, dateValue) {
  return generateRequestCenterNumber_(company, "LIQUIDATION", dateValue);
}

function nextExpenseNumber_(company, dateValue) {
  return generateRequestCenterNumber_(company, "EXPENSE", dateValue);
}

function nextAttachmentNumber_(company, dateValue) {
  return generateRequestCenterNumber_(company, "ATTACHMENT", dateValue);
}
