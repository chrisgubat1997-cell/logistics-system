/* =========================================================
   LOGIS-TECH SYSTEM
   MAIN API
   Code.gs
   VERSION: 20261006-04
========================================================= */


/* =========================================================
   GET
========================================================= */

function doGet(e) {

  try {

    const params =
      e &&
      e.parameter
        ? e.parameter
        : {};


    const action =
      params.action ||
      "ping";


    return jsonResponse(
      routeRequest(
        action,
        params
      )
    );


  } catch (error) {

    console.error(error);


    return jsonResponse({

      success: false,

      error:
        error.message

    });

  }

}


/* =========================================================
   POST
========================================================= */

function doPost(e) {

  try {

    if (
      !e ||
      !e.postData ||
      !e.postData.contents
    ) {

      return jsonResponse({

        success: false,

        error:
          "No POST data received."

      });

    }


    const request =
      JSON.parse(
        e.postData.contents
      );


    const action =
      request.action ||
      "";


    const payload =
      request.data ||
      request;


    return jsonResponse(
      routeRequest(
        action,
        payload
      )
    );


  } catch (error) {

    console.error(error);


    return jsonResponse({

      success: false,

      error:
        error.message,

      stack:
        error.stack ||
        ""

    });

  }

}


/* =========================================================
   MAIN ROUTER
========================================================= */

function routeRequest(
  action,
  payload
) {

  payload =
    payload ||
    {};

  // Company switching validates the existing server-side session itself.
  if (String(action) === "switchCompany") {
    return switchCompany_(payload);
  }

  // Resolve and validate company from the authenticated central USERS record.
  // Only public authentication/bootstrap actions bypass company context.
  const publicActions = ["ping", "login"];
  if (publicActions.indexOf(String(action)) === -1) {
    establishCompanyContext_(payload);
  }

  // Maintenance mode: only authenticated ADMIN accounts may continue.
  // Login, ping, and maintenance control remain available.
  const maintenanceExemptActions = ["ping", "login", "getSystemMaintenanceStatus", "setSystemMaintenanceMode"];
  if (maintenanceExemptActions.indexOf(String(action)) === -1 && isSystemMaintenanceEnabled_()) {
    const maintenanceAccount = authorizeRole_(payload, ["ADMIN", "SALES", "LOGISTICS", "FINANCE", "PAYMENT", "PRODUCTION"]);
    if (maintenanceAccount.role !== "ADMIN") {
      return {
        success: false,
        code: "MAINTENANCE_MODE",
        message: "The system is temporarily under maintenance. Please try again later."
      };
    }
  }

  switch (action) {


case "getSalesOrderItems":
  return getSalesOrderItems(payload);
  
    /* =====================================================
       SYSTEM
    ===================================================== */

    case "getSystemMaintenanceStatus":
      return getSystemMaintenanceStatus_(payload);

    case "setSystemMaintenanceMode":
      return setSystemMaintenanceMode_(payload);

    case "getSystemHealth":
      return getSystemHealth_(payload);

    case "ping":

      return {

        success: true,

        system:
          CONFIG.SYSTEM_NAME,

        timestamp:
          new Date().toISOString()

      };

      /* =====================================================
   SYNC
===================================================== */

case "getSyncStatus":

  return getSyncStatus(
    payload
  );


case "getInitialSyncData":

  return getInitialSyncData(
    payload
  );
  

/* =====================================================
       AUTHENTICATION
    ===================================================== */

    case "createAccount":

      return createAccount(
        payload
      );

      case "login":

  return loginUser(
    payload
  );

  case "updateInvoice":
  return updateInvoice(payload);

case "cancelInvoice":
  return cancelInvoice(payload);

  case "getCustomerCredits":
  return getCustomerCredits(payload);

case "getCustomerCreditTransactions":
  return getCustomerCreditTransactions(payload);

  case "getRevolvingFundData":
  return getRevolvingFundData(payload);

  case "saveRevolvingFundTransaction":
  return saveRevolvingFundTransaction(payload);

  case "createRevolvingFundReplenishment":
  return createRevolvingFundReplenishment(payload);

  case "getFleetAnalyticsData":
  return getFleetAnalyticsData(payload);
      
      case "saveFleetRecord":
  return saveFleetRecord(payload);

case "deleteFleetRecord":
  return deleteFleetRecord(payload);
    /* =====================================================
       SALES ORDER
    ===================================================== */

    case "getJORegisterData":
      return getJORegisterData(payload);

    case "postSalesOrderToProduction":
      return postSalesOrderToProduction(payload);

    case "getProductionQueue":
      return getProductionQueue(payload);

    case "markProductionNotificationsRead":
      return markProductionNotificationsRead(payload);

    case "updateJORegisterEntry":
      return updateJORegisterEntry(payload);

    case "getSalesOrders":

      return getSalesOrders(
        payload
      );


    case "getSalesOrder":

      return getSalesOrder(
        payload
      );


    case "getSOTransactionDetails":

      return getSOTransactionDetails(
        payload
      );


    case "createSalesOrder":

      return createSalesOrder(
        payload
      );


    case "uploadSOFile":

      return uploadSOFile(
        payload
      );


    /* =====================================================
       CUSTOMER MASTER
    ===================================================== */

    case "getCustomers":

      return getCustomers(
        payload
      );


    case "getCustomer":

      return getCustomer(
        payload
      );


    case "createCustomer":

      return createCustomer(
        payload
      );



    /* =====================================================
       DELIVERY RECEIPTS
    ===================================================== */

    case "getDeliveryReceipts":
      return getDeliveryReceipts(payload);

    case "createDeliveryReceipt":
      return createDeliveryReceipt(payload);

    case "markDeliveryReceiptDelivered":
      return markDeliveryReceiptDelivered(payload);


case "getPendingInvoiceQueue":
  return getPendingInvoiceQueue(payload);

case "getInvoices":
  return getInvoices(payload);

case "getInvoice":
  return getInvoice(payload);

case "createInvoice":
  return createInvoice(payload);

case "releaseInvoices":
  return releaseInvoices(payload);

case "getPayments":
  return getPayments(payload);

case "getPayment":
  return getPayment(payload);

case "createPayment":
  return createPayment(payload);
      
    /* =====================================================
       MESSAGING
    ===================================================== */

    case "setupMessagingDatabase":
      return setupMessagingDatabaseApi(payload);

    case "getMessagingUsers":
      return getMessagingUsers(payload);

    case "createPrivateMessageThread":
      return createPrivateMessageThread(payload);

    case "getMessagingThreads":
      return getMessagingThreads(payload);

    case "getMessagingMessages":
      return getMessagingMessages(payload);

    case "sendMessagingMessage":
      return sendMessagingMessage(payload);

    case "markMessagingThreadRead":
      return markMessagingThreadRead(payload);


    /* =====================================================
       UNKNOWN ACTION
    ===================================================== */

    default:

      return {

        success: false,

        error:
          "Unknown action: " +
          action

      };

  }

}


/* =========================================================
   ADMIN SYSTEM HEALTH — DATABASE FILE METADATA
   Returns metadata only; does not read or modify business rows.
========================================================= */
function getSystemHealth_(payload) {
  payload = payload || {};
  const admin = authorizeRole_(payload, ["ADMIN"]);
  if (!admin || admin.role !== "ADMIN") {
    return {
      success: false,
      code: "ADMIN_REQUIRED",
      message: "Only an authenticated ADMIN account can view system health."
    };
  }

  const company = String(
    payload.activeCompany || payload.company || admin.activeCompany || admin.defaultCompany || ""
  ).trim().toUpperCase();

  let spreadsheetId = "";
  if (company === "GREENLIGHT") {
    spreadsheetId = CONFIG.GREENLIGHT_DATABASE_SPREADSHEET_ID;
  } else if (company === "GREENMETAL") {
    spreadsheetId = CONFIG.GREENMETAL_DATABASE_SPREADSHEET_ID;
  } else {
    spreadsheetId = CONFIG.DATABASE_SPREADSHEET_ID;
  }

  if (!spreadsheetId) {
    throw new Error("Database spreadsheet is not configured for the active company.");
  }

  const file = DriveApp.getFileById(spreadsheetId);
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheets = spreadsheet.getSheets();

  return {
    success: true,
    system: CONFIG.SYSTEM_NAME,
    company: company || "DEFAULT",
    databaseName: file.getName(),
    databaseSizeBytes: file.getSize(),
    sheetCount: sheets.length,
    checkedAt: new Date().toISOString()
  };
}


/* =========================================================
   JSON RESPONSE
========================================================= */

function jsonResponse(
  data
) {

  return ContentService

    .createTextOutput(
      JSON.stringify(data)
    )

    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/* =========================================================
   TEST CREATE SALES ORDER API
========================================================= */

function testCreateSalesOrderAPI() {

  const payload = {

    action:
      "createSalesOrder",


    data: {

      dateCreation:
        "2026-10-06",


      clientName:
        "API TEST CUSTOMER",


      attention:
        "API TEST CONTACT",


      billingAddress:
        "API TEST BILLING ADDRESS",


      deliveryAddress:
        "API TEST DELIVERY ADDRESS",


      project:
        "API TEST PROJECT",


      tin:
        "000-000-000",


      poNumber:
        "API-TEST-PO-001",


      terms:
        "COD",


      se:
        "JBG",


      jobOrder:
        "API-TEST-JO-001",


      subtotal:
        2000,


      discount:
        0,


      vatable:
        2000,


      vatRate:
        0.12,


      vatAmount:
        240,


      grandTotal:
        2240,


      createdBy:
        "API TEST",


      items: [

        {

          itemNumber:
            "1",


          itemName:
            "API TEST ITEM",


          description:
            "API TEST DESCRIPTION",


          qty:
            2,


          unit:
            "PCS",


          unitPrice:
            1000,


          amount:
            2000,


          total:
            2000

        }

      ]

    }

  };


  const result =
    routeRequest(
      payload.action,
      payload.data
    );


  Logger.log(
    JSON.stringify(
      result,
      null,
      2
    )
  );

}
