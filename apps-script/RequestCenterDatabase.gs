/* =========================================================
   LOGIS-TECH SYSTEM
   REQUEST CENTER DATABASE INITIALIZATION
   Creates Request Center sheets in both company databases.
   Safe to run more than once: existing data is never cleared.
========================================================= */

const REQUEST_CENTER_HEADERS_ = {
  REQUESTS_MASTER: [
    "REQUEST_ID",
    "REQUEST_NO",
    "REQUEST_DATE",
    "REQUESTOR_USER_ID",
    "REQUESTOR_NAME",
    "REQUESTOR_EMAIL",
    "COMPANY",
    "DEPARTMENT",
    "REQUEST_TYPE",
    "TYPE_OF_REQUEST",
    "SUPPLIER_PAYEE",
    "AMOUNT",
    "DETAILS_PURPOSE",
    "SO_NUMBER",
    "CLIENT_NAME",
    "PROJECT_CLASS",
    "DATE_NEEDED",
    "APPROVING_HEAD",
    "STATUS",
    "APPROVED_AMOUNT",
    "APPROVED_DATE",
    "RELEASED_DATE",
    "CREATED_AT",
    "UPDATED_AT"
  ],

  LIQUIDATION_MASTER: [
    "LIQUIDATION_ID",
    "LIQUIDATION_NO",
    "REQUEST_ID",
    "REQUEST_NO",
    "REQUESTOR_USER_ID",
    "REQUESTOR_NAME",
    "COMPANY",
    "DEPARTMENT",
    "APPROVED_CA_AMOUNT",
    "TOTAL_EXPENSES",
    "CASH_RETURNED",
    "EXCESS_AMOUNT",
    "LIQUIDATION_DATE",
    "REMARKS",
    "STATUS",
    "REVIEWED_BY",
    "REVIEWED_AT"
  ],

  LIQUIDATION_DETAILS: [
    "EXPENSE_ID",
    "LIQUIDATION_ID",
    "EXPENSE_DATE",
    "RECEIPT_NO",
    "DESCRIPTION",
    "AMOUNT",
    "ATTACHMENT_NO"
  ],

  REQUEST_ATTACHMENTS: [
    "ATTACHMENT_ID",
    "ATTACHMENT_NO",
    "REQUEST_ID",
    "REQUEST_NO",
    "LIQUIDATION_ID",
    "LIQUIDATION_NO",
    "COMPANY",
    "DOCUMENT_TYPE",
    "FILE_NAME",
    "DRIVE_FILE_ID",
    "FILE_URL",
    "MIME_TYPE",
    "FILE_SIZE",
    "UPLOADED_BY",
    "UPLOADER_NAME",
    "UPLOADED_AT",
    "STATUS"
  ],
  
  SYSTEM_FEEDBACK: [
    "FEEDBACK_ID",
    "REFERENCE_NO",
    "COMPANY",
    "SUBMITTED_BY_USER_ID",
    "SUBMITTED_BY_NAME",
    "SUBMITTED_BY_USERNAME",
    "SUBMITTED_BY_ROLE",
    "DEPARTMENT",
    "FEEDBACK_TYPE",
    "MODULE",
    "SUBJECT",
    "DESCRIPTION",
    "PRIORITY",
    "STATUS",
    "ASSIGNED_TO",
    "ADMIN_NOTES",
    "ATTACHMENT_URL",
    "CREATED_AT",
    "UPDATED_AT"
  ]
};

/**
 * Run manually from the Apps Script editor as the database owner.
 * Creates missing tabs and headers in GREENMETAL and GREENLIGHT.
 * Existing populated tabs are validated, never overwritten.
 */
function setupRequestCenterDatabase() {
  const databases = [
    {
      company: "GREENMETAL",
      id: CONFIG.GREENMETAL_DATABASE_SPREADSHEET_ID
    },
    {
      company: "GREENLIGHT",
      id: CONFIG.GREENLIGHT_DATABASE_SPREADSHEET_ID
    }
  ];

  const results = [];

  databases.forEach(function(database) {
    if (!database.id) {
      throw new Error("Missing spreadsheet ID for " + database.company);
    }

    const spreadsheet = SpreadsheetApp.openById(database.id);
    const companyResult = {
      company: database.company,
      spreadsheet: spreadsheet.getName(),
      sheets: []
    };

    Object.keys(REQUEST_CENTER_HEADERS_).forEach(function(sheetName) {
      const expectedHeaders = REQUEST_CENTER_HEADERS_[sheetName];
      let sheet = spreadsheet.getSheetByName(sheetName);
      let created = false;

      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        created = true;
      }

      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();

      const currentLastRow = sheet.getLastRow();
      const currentLastColumn = sheet.getLastColumn();

      if (currentLastRow === 0 || currentLastColumn === 0) {
        // Empty tab: safe to write the complete header row.
        sheet.getRange(1, 1, 1, expectedHeaders.length)
          .setValues([expectedHeaders]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, expectedHeaders.length)
          .setFontWeight("bold");
        sheet.autoResizeColumns(1, expectedHeaders.length);
      } else {
        const headerWidth = Math.max(currentLastColumn, expectedHeaders.length);
        const actualHeaders = sheet
          .getRange(1, 1, 1, headerWidth)
          .getDisplayValues()[0]
          .map(function(value) { return String(value).trim(); });

        const hasAnyHeaderText = actualHeaders.some(function(value) {
          return value !== "";
        });

        if (!hasAnyHeaderText) {
          // A blank header row is initialized only if rows below it contain
          // no values. Never write over a sheet that already has records.
          const hasExistingData = currentLastRow > 1 &&
            sheet.getRange(2, 1, currentLastRow - 1, currentLastColumn)
              .getDisplayValues()
              .some(function(row) {
                return row.some(function(value) { return String(value).trim() !== ""; });
              });

          if (hasExistingData) {
            throw new Error(
              database.company + " / " + sheetName +
              ": row 1 is blank but data exists below it. " +
              "Please inspect this sheet and add/confirm its headers manually. " +
              "No existing data was changed."
            );
          }

          sheet.getRange(1, 1, 1, expectedHeaders.length)
            .setValues([expectedHeaders]);
          sheet.setFrozenRows(1);
          sheet.getRange(1, 1, 1, expectedHeaders.length)
            .setFontWeight("bold");
          sheet.autoResizeColumns(1, expectedHeaders.length);
        } else {
          // Safe forward-only migration: add missing trailing columns only
          // when every existing header matches the expected prefix.
          const existingHeaderCount = currentLastColumn;
          const prefixMatches = actualHeaders
            .slice(0, Math.min(existingHeaderCount, expectedHeaders.length))
            .every(function(header, index) {
              return header === expectedHeaders[index];
            });

          if (!prefixMatches || existingHeaderCount > expectedHeaders.length) {
            throw new Error(
              database.company + " / " + sheetName +
              ": existing headers do not match the expected structure. " +
              "No existing data was changed."
            );
          }

          if (existingHeaderCount < expectedHeaders.length) {
            const newHeaders = expectedHeaders.slice(existingHeaderCount);
            sheet.getRange(1, existingHeaderCount + 1, 1, newHeaders.length)
              .setValues([newHeaders])
              .setFontWeight("bold");
            sheet.autoResizeColumns(existingHeaderCount + 1, newHeaders.length);
          }
          sheet.setFrozenRows(1);
        }
      }

      companyResult.sheets.push({
        name: sheetName,
        created: created,
        columns: expectedHeaders.length,
        status: created ? "CREATED" : "READY"
      });
    });

    results.push(companyResult);
  });

  Logger.log(JSON.stringify(results, null, 2));
  return {
    success: true,
    message: "Request Center database sheets are ready, including REQUEST_ATTACHMENTS.",
    results: results
  };
}
