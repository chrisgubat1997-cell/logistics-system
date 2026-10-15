/* =========================================================
   LOGIS-TECH SYSTEM
   SYNC ENGINE
   Sync.gs
   VERSION: 20261008-01
========================================================= */


/* =========================================================
   SYNC PROPERTY
========================================================= */

const SYNC_VERSION_PROPERTY =
  "LOGIS_TECH_DATA_VERSION";


/* =========================================================
   GET CURRENT SYNC VERSION
========================================================= */

function getCurrentSyncVersion() {

  const properties =
    PropertiesService.getScriptProperties();

  let version =
    properties.getProperty(
      SYNC_VERSION_PROPERTY
    );


  if (!version) {

    version =
      String(
        Date.now()
      );

    properties.setProperty(
      SYNC_VERSION_PROPERTY,
      version
    );

  }


  return version;

}


/* =========================================================
   TOUCH SYNC VERSION
========================================================= */

function touchSyncVersion() {

  const properties =
    PropertiesService.getScriptProperties();


  const version =
    String(
      Date.now()
    );


  properties.setProperty(
    SYNC_VERSION_PROPERTY,
    version
  );


  return version;

}


/* =========================================================
   GET SYNC STATUS
========================================================= */

function getSyncStatus(payload) {

  try {

    return {

      success: true,

      version:
        getCurrentSyncVersion(),

      timestamp:
        new Date().toISOString()

    };

  } catch (error) {

    console.error(
      "GET SYNC STATUS ERROR:",
      error
    );


    return {

      success: false,

      error:
        error.message

    };

  }

}


/* =========================================================
   GET CUSTOMER + SALES ORDER SYNC DATA
========================================================= */

function getInitialSyncData(payload) {

  try {

    const customers =
      getAllRecords(
        CONFIG.SHEETS.CUSTOMERS
      );


    const salesOrders =
      getAllRecords(
        CONFIG.SHEETS.SALES_ORDERS
      );


    return {

      success: true,

      version:
        getCurrentSyncVersion(),

      timestamp:
        new Date().toISOString(),

      data: {

        customers:
          customers,

        salesOrders:
          salesOrders

      }

    };

  } catch (error) {

    console.error(
      "INITIAL SYNC ERROR:",
      error
    );


    return {

      success: false,

      error:
        error.message,

      data: {

        customers: [],

        salesOrders: []

      }

    };

  }

}
