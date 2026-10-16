/* =========================================================
   LOGIS-TECH SYSTEM
   CONFIGURATION
   VERSION: 20261006-01
   ========================================================= */

const CONFIG = {

  SYSTEM_NAME: "LOGIS-TECH SYSTEM",

  // =======================================================
  // DATABASE
  // =======================================================

  DATABASE_SPREADSHEET_ID:
    "1Txaem4xthFohNU_ITQ20AJzPeNpPLIxgbLfcVojYbnQ",


  // =======================================================
  // MAIN DRIVE FOLDER
  // =======================================================

  ROOT_FOLDER_ID:
    "1cR8UE70hO0s3vfq3-4WGBiApYi7VEspP",


  // =======================================================
  // DATABASE SHEETS
  // =======================================================

  SHEETS: {

    USERS: "USERS",
    CUSTOMERS: "CUSTOMERS",
    VEHICLES: "VEHICLES",
    SETTINGS: "SETTINGS",

    SALES_ORDERS: "SALES_ORDERS",
    SALES_ORDER_ITEMS: "SALES_ORDER_ITEMS",

    DELIVERIES: "DELIVERIES",
    DELIVERY_RECEIPTS: "DELIVERY_RECEIPTS",
    DELIVERY_RECEIPT_ITEMS: "DELIVERY_RECEIPT_ITEMS",
    DR_MONITORING: "DR_MONITORING",

    TRIP_TICKETS: "TRIP_TICKETS",
    FUEL_TRANSACTIONS: "FUEL_TRANSACTIONS",
    MAINTENANCE: "MAINTENANCE",

    INVOICES: "INVOICES",
    INVOICE_ITEMS: "INVOICE_ITEMS",
    PAYMENTS: "PAYMENTS",
    CUSTOMER_CREDITS: "CUSTOMER_CREDITS",
CUSTOMER_CREDIT_TRANSACTIONS: "CUSTOMER_CREDIT_TRANSACTIONS",

    REVOLVING_FUND_GROUPS: "REVOLVING_FUND_GROUPS",
    REVOLVING_FUND_TRANSACTIONS: "REVOLVING_FUND_TRANSACTIONS",
    REVOLVING_FUND_SETTINGS: "REVOLVING_FUND_SETTINGS",

    DOCUMENT_INDEX: "DOCUMENT_INDEX",

    ACTIVITY_LOG: "ACTIVITY_LOG"
  },


  // =======================================================
  // DRIVE FOLDERS
  // =======================================================

  FOLDERS: {

    DATABASE: "01_DATABASE",
    SALES_ORDER: "02_SALES_ORDER",
    DELIVERY_RECEIPT: "03_DELIVERY_RECEIPT",
    INVOICE: "04_INVOICE",
    PAYMENT: "05_PAYMENT",
    FLEET: "06_FLEET",
    REPORTS: "07_REPORTS",
    SYSTEM: "08_SYSTEM"

  },


  // =======================================================
  // NUMBERING
  // =======================================================

  PREFIX: {

    SO: "SO",
    DR: "DR",
    INV: "INV",
    PAY: "PAY",
    TRIP: "TRIP"
  },


  // =======================================================
  // SALES ORDER
  // =======================================================

  VAT_RATE: 0.12,

  TIMEZONE: Session.getScriptTimeZone() || "Asia/Manila"

};
