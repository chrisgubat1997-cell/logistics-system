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


  switch (action) {


case "getSalesOrderItems":
  return getSalesOrderItems(payload);
  
    /* =====================================================
       SYSTEM
    ===================================================== */

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


case "getInvoices":
  return getInvoices(payload);

case "getInvoice":
  return getInvoice(payload);

case "createInvoice":
  return createInvoice(payload);

case "getPayments":
  return getPayments(payload);

case "getPayment":
  return getPayment(payload);

case "createPayment":
  return createPayment(payload);
      
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
