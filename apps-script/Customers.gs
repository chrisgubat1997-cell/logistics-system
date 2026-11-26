/* =========================================================
   LOGIS-TECH SYSTEM
   CUSTOMER MASTER
   Customers.gs
   VERSION: 20261006-01
========================================================= */


/* =========================================================
   GET ALL CUSTOMERS
========================================================= */

function getCustomers(payload) {

  try {

    const records =
      getAllRecords(CONFIG.SHEETS.CUSTOMERS);

    return {
      success: true,
      customers: records
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      error: error.message,
      customers: []
    };

  }

}


/* =========================================================
   GET SINGLE CUSTOMER
========================================================= */

function getCustomer(payload) {

  try {

    payload = payload || {};

    const customerId =
      String(
        payload.customerId ||
        payload.CUSTOMER_ID ||
        ""
      ).trim();

    if (!customerId) {

      return {
        success: false,
        error: "Customer ID is required."
      };

    }

    const customer =
      findRecord(
        CONFIG.SHEETS.CUSTOMERS,
        "CUSTOMER_ID",
        customerId
      );

    if (!customer) {

      return {
        success: false,
        error: "Customer not found."
      };

    }

    return {
      success: true,
      customer: customer
    };

  } catch (error) {

    console.error(error);

    return {
      success: false,
      error: error.message
    };

  }

}


/* =========================================================
   CREATE CUSTOMER
========================================================= */

function createCustomer(payload) {

  let diagnosticStep = "START_CREATE_CUSTOMER";

  try {

    payload = payload || {};

    const clientName =
      String(
        payload.clientName ||
        payload.CLIENT_NAME ||
        ""
      ).trim();

    if (!clientName) {

      return {
        success: false,
        error: "Client Name is required."
      };

    }


    diagnosticStep = "OPEN_CUSTOMERS_SHEET";
    const sheet =
      getSheet(CONFIG.SHEETS.CUSTOMERS);


    const now =
      new Date();


    diagnosticStep = "GENERATE_CUSTOMER_ID";
    const customerId =
      generateCustomerId();


    const customer = {

      CUSTOMER_ID:
        customerId,

      CLIENT_NAME:
        clientName,

      ATTENTION:
        payload.attention ||
        payload.ATTENTION ||
        "",

      TIN:
        payload.tin ||
        payload.TIN ||
        "",

      BILLING_ADDRESS:
        payload.billingAddress ||
        payload.BILLING_ADDRESS ||
        "",

      DELIVERY_ADDRESS:
        payload.deliveryAddress ||
        payload.DELIVERY_ADDRESS ||
        "",

      CONTACT_NUMBER:
        payload.contactNumber ||
        payload.CONTACT_NUMBER ||
        "",

      EMAIL:
        payload.email ||
        payload.EMAIL ||
        "",

      STATUS:
        payload.status ||
        payload.STATUS ||
        "ACTIVE",

      CREATED_AT:
        formatDateTime(now),

      UPDATED_AT:
        formatDateTime(now)

    };


    diagnosticStep = "APPEND_CUSTOMER_ROW";
    sheet.appendRow([

      customer.CUSTOMER_ID,
      customer.CLIENT_NAME,
      customer.ATTENTION,
      customer.TIN,
      customer.BILLING_ADDRESS,
      customer.DELIVERY_ADDRESS,
      customer.CONTACT_NUMBER,
      customer.EMAIL,
      customer.STATUS,
      customer.CREATED_AT,
      customer.UPDATED_AT

    ]);

diagnosticStep = "UPDATE_SYNC_VERSION";
    touchSyncVersion();

    return {

      success: true,

      message:
        "Customer created successfully.",

      customerId:
        customerId,

      customer:
        customer

    };


  } catch (error) {

    console.error(error);



    return {

      success: false,

      error:
        error.message,
      diagnosticStep: diagnosticStep,
      stack: error.stack || ""

    };

  }

}


/* =========================================================
   GENERATE CUSTOMER ID
   FORMAT:
   CUST-2026-0001
========================================================= */

function generateCustomerId() {

  const year =
    getCurrentYear();


  const records =
    getAllRecords(
      CONFIG.SHEETS.CUSTOMERS
    );


  let highest =
    0;


  records.forEach(function(record) {

    const value =
      String(
        record.CUSTOMER_ID ||
        ""
      ).trim();


    const regex =
      new RegExp(
        "^CUST-" +
        year +
        "-(\\d+)$"
      );


    const match =
      value.match(regex);


    if (match) {

      const number =
        Number(match[1]);


      if (number > highest) {

        highest =
          number;

      }

    }

  });


  const next =
    highest + 1;


  return (
    "CUST-" +
    year +
    "-" +
    String(next).padStart(4, "0")
  );

}


/* =========================================================
   TEMPORARY WEB APP WRITE DIAGNOSTIC
   Admin-only. Writes one test row then clears its contents.
========================================================= */
function diagnoseCustomerWebAppWrite_(payload) {
  let step = "AUTHORIZE_ADMIN";
  let sheet = null;
  let testRow = 0;

  try {
    const admin = authorizeRole_(payload || {}, ["ADMIN"]);
    const context = ACTIVE_COMPANY_CONTEXT_;
    step = "OPEN_ACTIVE_DATABASE";
    const ss = getDatabase();
    sheet = ss.getSheetByName(CONFIG.SHEETS.CUSTOMERS);
    if (!sheet) throw new Error("CUSTOMERS sheet not found.");

    const protections = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE);
    const protectionInfo = protections.map(function(p) {
      return {
        description: p.getDescription() || "",
        range: p.getRange().getA1Notation(),
        warningOnly: p.isWarningOnly()
      };
    });

    step = "APPEND_DIAGNOSTIC_ROW";
    testRow = sheet.getLastRow() + 1;
    sheet.appendRow([
      "__WEBAPP_WRITE_DIAGNOSTIC__",
      "TEMPORARY TEST - SAFE TO CLEAR",
      "", "", "", "", "", "", "TEST",
      new Date(),
      new Date()
    ]);

    step = "CLEAR_DIAGNOSTIC_ROW";
    sheet.getRange(testRow, 1, 1, 11).clearContent();

    return {
      success: true,
      message: "Web App write test succeeded; temporary row contents were cleared.",
      company: context ? context.company : "",
      spreadsheetId: context ? context.spreadsheetId : "",
      spreadsheetName: ss.getName(),
      sheetName: sheet.getName(),
      testRow: testRow,
      effectiveUser: Session.getEffectiveUser().getEmail(),
      activeUser: Session.getActiveUser().getEmail(),
      protectionCount: protectionInfo.length,
      protections: protectionInfo
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      diagnosticStep: step,
      company: ACTIVE_COMPANY_CONTEXT_ ? ACTIVE_COMPANY_CONTEXT_.company : "",
      spreadsheetId: ACTIVE_COMPANY_CONTEXT_ ? ACTIVE_COMPANY_CONTEXT_.spreadsheetId : "",
      effectiveUser: Session.getEffectiveUser().getEmail(),
      activeUser: Session.getActiveUser().getEmail(),
      testRow: testRow,
      stack: error.stack || ""
    };
  }
}
