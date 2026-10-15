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


    const sheet =
      getSheet(CONFIG.SHEETS.CUSTOMERS);


    const now =
      new Date();


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
        error.message

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
