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
    "AMOUNT"
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

      if (lastRow === 0 || lastColumn === 0) {
        sheet.getRange(1, 1, 1, expectedHeaders.length)
          .setValues([expectedHeaders]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, expectedHeaders.length)
          .setFontWeight("bold");
        sheet.autoResizeColumns(1, expectedHeaders.length);
      } else {
        const actualHeaders = sheet
          .getRange(1, 1, 1, expectedHeaders.length)
          .getDisplayValues()[0]
          .map(function(value) { return String(value).trim(); });

        const mismatch = expectedHeaders.findIndex(function(header, index) {
          return actualHeaders[index] !== header;
        });

        if (mismatch !== -1) {
          throw new Error(
            database.company + " / " + sheetName +
            ": header mismatch at column " + (mismatch + 1) +
            ". Expected " + expectedHeaders[mismatch] +
            " but found " + (actualHeaders[mismatch] || "(blank)") +
            ". No existing data was changed."
          );
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
    message: "Request Center database sheets are ready. No attachment sheet was created.",
    results: results
  };
}
