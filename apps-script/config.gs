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
    "1hzv-55bHvUFVpwAFn9T6igSp6ePKvihaPfMomUj-GQQ",

  GREENMETAL_DATABASE_SPREADSHEET_ID:
    "1Txaem4xthFohNU_ITQ20AJzPeNpPLIxgbLfcVojYbnQ",

  GREENLIGHT_DATABASE_SPREADSHEET_ID:
    "1aEtv37K3hQuR_MRRoljpc5RUwlrVPr6Xco4SIUKQqjg",


  // =======================================================
  // MAIN DRIVE FOLDER
  // =======================================================

  ROOT_FOLDER_ID:
    "11_PYxFBmzl2rgGIac89iBtTVG1Bq3Xw7",

  // Dedicated Drive folder for Request Center uploads.
  REQUEST_CENTER_ATTACHMENTS_FOLDER_ID:
    "1jN5awoeUjD_DS-0DlZl1NMk-VANBNusr",

  // Dedicated Drive folder for Help & Feedback uploads.
  HELP_FEEDBACK_ATTACHMENTS_FOLDER_ID:
    "1F2Fd-AOgKeW9YBI8w7u7gHB_RiiW5Xtq",


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

    REQUESTS_MASTER: "REQUESTS_MASTER",
    LIQUIDATION_MASTER: "LIQUIDATION_MASTER",
    LIQUIDATION_DETAILS: "LIQUIDATION_DETAILS",
    REQUEST_ATTACHMENTS: "REQUEST_ATTACHMENTS",
    CUSTOMER_CREDITS: "CUSTOMER_CREDITS",
CUSTOMER_CREDIT_TRANSACTIONS: "CUSTOMER_CREDIT_TRANSACTIONS",

    REVOLVING_FUND_GROUPS: "REVOLVING_FUND_GROUPS",
    REVOLVING_FUND_TRANSACTIONS: "REVOLVING_FUND_TRANSACTIONS",
    REVOLVING_FUND_SETTINGS: "REVOLVING_FUND_SETTINGS",

    DOCUMENT_INDEX: "DOCUMENT_INDEX",

    ACTIVITY_LOG: "ACTIVITY_LOG",

    MESSAGES_THREADS: "MESSAGES_THREADS",
    MESSAGES: "MESSAGES",
    MESSAGES_READ_STATUS: "MESSAGES_READ_STATUS",
    MESSAGES_PARTICIPANTS: "MESSAGES_PARTICIPANTS"
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
    SYSTEM: "08_SYSTEM",
    REQUEST_CENTER_ATTACHMENTS: "09_REQUEST_CENTER_ATTACHMENTS",
    HELP_AND_FEEDBACK: "10_HELP_AND_FEEDBACK"

  },


  // =======================================================
  // NUMBERING
  // =======================================================

  PREFIX: {

    SO: "SO",
    DR: "DR",
    INV: "INV",
    PAY: "PAY",
    REQ: "REQ",
    LIQ: "LIQ",
    EXP: "EXP",
    ATT: "ATT",
    TRIP: "TRIP"
  },


  // =======================================================
  // SALES ORDER
  // =======================================================

  VAT_RATE: 0.12,

  TIMEZONE: Session.getScriptTimeZone() || "Asia/Manila"

};
