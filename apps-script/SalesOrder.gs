/* =========================================================
   LOGIS-TECH SYSTEM
   SALES ORDERS
   SalesOrders.gs
   VERSION: 20261007-02
   ========================================================= */


/* =========================================================
   GET SALES ORDERS
========================================================= */

function getSalesOrders(payload) {

  try {

    const records =
      getAllRecords(
        CONFIG.SHEETS.SALES_ORDERS
      );

    return {

      success: true,

      salesOrders:
        records,

      data:
        records,

      count:
        records.length

    };

  } catch (error) {

    console.error(
      "GET SALES ORDERS ERROR:",
      error
    );

    return {

      success: false,

      message:
        error.message,

      error:
        error.message,

      salesOrders: [],

      data: [],

      count: 0

    };

  }

}


/* =========================================================
   GET SINGLE SALES ORDER

   Returns complete transaction data.
========================================================= */

function getSalesOrder(payload) {

  payload =
    payload ||
    {};

  const soNumber =
    String(
      payload.soNumber ||
      payload.SO_NUMBER ||
      ""
    ).trim();

  if (!soNumber) {

    return {

      success: false,

      message:
        "SO number is required.",

      error:
        "SO number is required."

    };

  }

  return getSOTransactionDetails({

    soNumber:
      soNumber

  });

}


/* =========================================================
   GET COMPLETE SALES ORDER TRANSACTION DETAILS

   SO
   ├── Items
   ├── Deliveries
   ├── Delivery Receipts
   ├── DR Items
   ├── Invoices
   ├── Invoice Items
   ├── Payments
   └── Documents
========================================================= */

function getSOTransactionDetails(payload) {

  try {

    payload =
      payload ||
      {};

    const soNumber =
      String(
        payload.soNumber ||
        payload.SO_NUMBER ||
        ""
      ).trim();

    if (!soNumber) {

      return {

        success: false,

        message:
          "SO number is required.",

        error:
          "SO number is required."

      };

    }


    /* =====================================================
       01. SALES ORDER
    ===================================================== */

    const so =
      findRecord(
        CONFIG.SHEETS.SALES_ORDERS,
        "SO_NUMBER",
        soNumber
      );

    if (!so) {

      return {

        success: false,

        message:
          "Sales Order not found: " +
          soNumber,

        error:
          "Sales Order not found: " +
          soNumber

      };

    }


    /* =====================================================
       02. SALES ORDER ITEMS
    ===================================================== */

    let allSOItems = [];

    try {

      allSOItems =
        getAllRecords(
          CONFIG.SHEETS.SALES_ORDER_ITEMS
        );

    } catch (error) {

      console.warn(
        "SALES ORDER ITEMS WARNING:",
        error
      );

      allSOItems = [];

    }


    const items =
      allSOItems.filter(
        function(item) {

          return String(
            item.SO_NUMBER ||
            ""
          ).trim() ===
          soNumber;

        }
      );


    /* =====================================================
       03. DELIVERIES
    ===================================================== */

    let deliveries = [];

    try {

      deliveries =
        getAllRecords(
          CONFIG.SHEETS.DELIVERIES
        )
        .filter(
          function(delivery) {

            return String(
              delivery.SO_NUMBER ||
              ""
            ).trim() ===
            soNumber;

          }
        );

    } catch (error) {

      console.warn(
        "DELIVERIES WARNING:",
        error
      );

      deliveries = [];

    }


    /* =====================================================
       04. DELIVERY RECEIPTS
    ===================================================== */

    let deliveryReceipts = [];

    try {

      deliveryReceipts =
        getAllRecords(
          CONFIG.SHEETS.DELIVERY_RECEIPTS
        )
        .filter(
          function(dr) {

            return String(
              dr.SO_NUMBER ||
              ""
            ).trim() ===
            soNumber;

          }
        );

    } catch (error) {

      console.warn(
        "DELIVERY RECEIPTS WARNING:",
        error
      );

      deliveryReceipts = [];

    }


    /* =====================================================
       05. DELIVERY RECEIPT ITEMS
    ===================================================== */

    let allDRItems = [];

    try {

      allDRItems =
        getAllRecords(
          CONFIG.SHEETS.DELIVERY_RECEIPT_ITEMS
        );

    } catch (error) {

      console.warn(
        "DR ITEMS WARNING:",
        error
      );

      allDRItems = [];

    }


    deliveryReceipts.forEach(
      function(dr) {

        const drId =
          String(
            dr.DR_ID ||
            ""
          ).trim();

        const drNumber =
          String(
            dr.DR_NUMBER ||
            ""
          ).trim();

        dr.items =
          allDRItems.filter(
            function(item) {

              const itemDRId =
                String(
                  item.DR_ID ||
                  ""
                ).trim();

              const itemDRNumber =
                String(
                  item.DR_NUMBER ||
                  ""
                ).trim();

              return (

                (
                  drId &&
                  itemDRId ===
                  drId
                )

                ||

                (
                  drNumber &&
                  itemDRNumber ===
                  drNumber
                )

              );

            }
          );

      }
    );


    /* =====================================================
       06. INVOICES
    ===================================================== */

    let invoices = [];

    try {

      invoices =
        getAllRecords(
          CONFIG.SHEETS.INVOICES
        )
        .filter(
          function(invoice) {

            const invoiceSO =
              String(
                invoice.SO_NUMBER ||
                invoice.SALES_ORDER ||
                invoice.SALES_ORDER_NUMBER ||
                ""
              ).trim();

            return invoiceSO ===
              soNumber;

          }
        );

    } catch (error) {

      console.warn(
        "INVOICES WARNING:",
        error
      );

      invoices = [];

    }


    /* =====================================================
       07. INVOICE ITEMS
    ===================================================== */

    let allInvoiceItems = [];

    try {

      allInvoiceItems =
        getAllRecords(
          CONFIG.SHEETS.INVOICE_ITEMS
        );

    } catch (error) {

      console.warn(
        "INVOICE ITEMS WARNING:",
        error
      );

      allInvoiceItems = [];

    }


    invoices.forEach(
      function(invoice) {

        const invoiceId =
          String(
            invoice.INVOICE_ID ||
            ""
          ).trim();

        const invoiceNo =
          String(
            invoice.INVOICE_NO ||
            invoice.INVOICE_NUMBER ||
            invoice.INVOICE ||
            ""
          ).trim();

        invoice.items =
          allInvoiceItems.filter(
            function(item) {

              const itemInvoiceId =
                String(
                  item.INVOICE_ID ||
                  ""
                ).trim();

              const itemInvoiceNo =
                String(
                  item.INVOICE_NO ||
                  item.INVOICE_NUMBER ||
                  item.INVOICE ||
                  ""
                ).trim();

              return (

                (
                  invoiceId &&
                  itemInvoiceId ===
                  invoiceId
                )

                ||

                (
                  invoiceNo &&
                  itemInvoiceNo ===
                  invoiceNo
                )

              );

            }
          );

      }
    );


    /* =====================================================
       08. PAYMENTS
       
       Payment can be linked through:
       SO_NUMBER
       INVOICE_NO
       INVOICE_NUMBER
       INVOICE_ID
    ===================================================== */

    let allPayments = [];

    try {

      allPayments =
        getAllRecords(
          CONFIG.SHEETS.PAYMENTS
        );

    } catch (error) {

      console.warn(
        "PAYMENTS WARNING:",
        error
      );

      allPayments = [];

    }


    const invoiceNumbers =
      invoices
        .map(
          function(invoice) {

            return String(
              invoice.INVOICE_NO ||
              invoice.INVOICE_NUMBER ||
              invoice.INVOICE ||
              ""
            ).trim();

          }
        )
        .filter(
          function(value) {

            return value !== "";

          }
        );


    const invoiceIds =
      invoices
        .map(
          function(invoice) {

            return String(
              invoice.INVOICE_ID ||
              ""
            ).trim();

          }
        )
        .filter(
          function(value) {

            return value !== "";

          }
        );


    const payments =
      allPayments.filter(
        function(payment) {

          const paymentSO =
            String(
              payment.SO_NUMBER ||
              payment.SALES_ORDER ||
              payment.SALES_ORDER_NUMBER ||
              ""
            ).trim();

          const paymentInvoiceNo =
            String(
              payment.INVOICE_NO ||
              payment.INVOICE_NUMBER ||
              payment.INVOICE ||
              ""
            ).trim();

          const paymentInvoiceId =
            String(
              payment.INVOICE_ID ||
              ""
            ).trim();


          if (
            paymentSO ===
            soNumber
          ) {

            return true;

          }


          if (
            paymentInvoiceNo &&
            invoiceNumbers.indexOf(
              paymentInvoiceNo
            ) !== -1
          ) {

            return true;

          }


          if (
            paymentInvoiceId &&
            invoiceIds.indexOf(
              paymentInvoiceId
            ) !== -1
          ) {

            return true;

          }


          return false;

        }
      );


    /* =====================================================
       09. DOCUMENT INDEX
    ===================================================== */

    let documents = [];

    try {

      documents =
        getAllRecords(
          CONFIG.SHEETS.DOCUMENT_INDEX
        )
        .filter(
          function(document) {

            const reference =
              String(
                document.REFERENCE_NUMBER ||
                document.SO_NUMBER ||
                ""
              ).trim();

            return reference ===
              soNumber;

          }
        );

    } catch (error) {

      console.warn(
        "DOCUMENT INDEX WARNING:",
        error
      );

      documents = [];

    }


    /* =====================================================
       10. SO AMOUNT
    ===================================================== */

    const soAmount =
      Number(
        so.GRAND_TOTAL ||
        0
      );


    /* =====================================================
       11. SO ITEM PRICE MAP
    ===================================================== */

    const soItemPriceMap = {};


    items.forEach(
      function(item) {

        const itemId =
          String(
            item.SO_ITEM_ID ||
            item.ITEM_ID ||
            ""
          ).trim();

        const itemNumber =
          String(
            item.ITEM_NUMBER ||
            ""
          ).trim();

        const unitPrice =
          Number(
            item.UNIT_PRICE ||
            item.AMOUNT ||
            0
          );


        if (itemId) {

          soItemPriceMap[
            "ID:" +
            itemId
          ] =
            unitPrice;

        }


        if (itemNumber) {

          soItemPriceMap[
            "NO:" +
            itemNumber
          ] =
            unitPrice;

        }

      }
    );


    /* =====================================================
       12. DELIVERED AMOUNT
    ===================================================== */

    let deliveredAmount =
      0;


    deliveryReceipts.forEach(
      function(dr) {

        const drItems =
          Array.isArray(
            dr.items
          )
            ? dr.items
            : [];


        drItems.forEach(
          function(drItem) {

            const deliveredQty =
              Number(
                drItem.DELIVERED_QTY ||
                drItem.QTY ||
                drItem.QUANTITY ||
                0
              );


            if (
              deliveredQty <= 0
            ) {

              return;

            }


            const soItemId =
              String(
                drItem.SO_ITEM_ID ||
                drItem.ITEM_ID ||
                ""
              ).trim();


            const itemNumber =
              String(
                drItem.ITEM_NUMBER ||
                ""
              ).trim();


            let unitPrice =
              0;


            if (
              soItemId &&
              soItemPriceMap[
                "ID:" +
                soItemId
              ] !== undefined
            ) {

              unitPrice =
                Number(
                  soItemPriceMap[
                    "ID:" +
                    soItemId
                  ]
                );

            }

            else if (
              itemNumber &&
              soItemPriceMap[
                "NO:" +
                itemNumber
              ] !== undefined
            ) {

              unitPrice =
                Number(
                  soItemPriceMap[
                    "NO:" +
                    itemNumber
                  ]
                );

            }


            deliveredAmount +=
              deliveredQty *
              unitPrice;

          }
        );

      }
    );


    /* =====================================================
       13. INVOICED AMOUNT
    ===================================================== */

    let invoicedAmount =
      0;


    invoices.forEach(
      function(invoice) {

        const amount =
          Number(
            invoice.FINAL_AMOUNT_DUE ||
            invoice.AMOUNT_DUE ||
            invoice.GRAND_TOTAL ||
            invoice.TOTAL_AMOUNT ||
            invoice.AMOUNT ||
            0
          );


        invoicedAmount +=
          amount;

      }
    );


    /* =====================================================
       14. PAID AMOUNT
    ===================================================== */

    let paidAmount =
      0;


    payments.forEach(
      function(payment) {

        const amount =
          Number(
            payment.CURRENT_PAYMENT ||
            payment.PAYMENT_AMOUNT ||
            payment.AMOUNT_PAID ||
            payment.AMOUNT ||
            0
          );


        paidAmount +=
          amount;

      }
    );


    /* =====================================================
       15. BALANCES
    ===================================================== */

    const invoiceBalance =
      Math.max(
        invoicedAmount -
        paidAmount,
        0
      );


    const soBalance =
      Math.max(
        soAmount -
        paidAmount,
        0
      );


    /* =====================================================
       16. PAYMENT STATUS
    ===================================================== */

    let paymentStatus =
      "UNPAID";


    if (
      paidAmount > 0 &&
      paidAmount < soAmount
    ) {

      paymentStatus =
        "PARTIAL";

    }


    if (
      soAmount > 0 &&
      paidAmount >= soAmount
    ) {

      paymentStatus =
        "PAID";

    }


    if (
      soAmount <= 0 &&
      paidAmount <= 0
    ) {

      paymentStatus =
        "UNPAID";

    }


    /* =====================================================
       17. TRANSACTION SUMMARY
    ===================================================== */

    const summary = {

      soAmount:
        soAmount,

      deliveredAmount:
        deliveredAmount,

      invoicedAmount:
        invoicedAmount,

      paidAmount:
        paidAmount,

      invoiceBalance:
        invoiceBalance,

      soBalance:
        soBalance,

      paymentStatus:
        paymentStatus,

      deliveryCount:
        deliveries.length,

      deliveryReceiptCount:
        deliveryReceipts.length,

      invoiceCount:
        invoices.length,

      paymentCount:
        payments.length

    };


    /* =====================================================
       18. FRONTEND SALES ORDER OBJECT
    ===================================================== */

    const salesOrder =
      Object.assign(
        {},
        so,
        {

          items:
            items,

          documents:
            documents,

          deliveries:
            deliveries,

          deliveryReceipts:
            deliveryReceipts,

          invoices:
            invoices,

          payments:
            payments,

          summary:
            summary

        }
      );


    /* =====================================================
       19. RESPONSE
    ===================================================== */

    return {

      success:
        true,

      message:
        "Complete Sales Order transaction loaded successfully.",

      salesOrder:
        salesOrder,

      so:
        salesOrder,

      items:
        items,

      deliveries:
        deliveries,

      deliveryReceipts:
        deliveryReceipts,

      invoices:
        invoices,

      payments:
        payments,

      documents:
        documents,

      summary:
        summary,

      data: {

        salesOrder:
          salesOrder,

        so:
          salesOrder,

        items:
          items,

        deliveries:
          deliveries,

        deliveryReceipts:
          deliveryReceipts,

        invoices:
          invoices,

        payments:
          payments,

        documents:
          documents,

        summary:
          summary

      }

    };


  } catch (error) {

    console.error(
      "GET SO TRANSACTION DETAILS ERROR:",
      error
    );

    return {

      success:
        false,

      message:
        error.message,

      error:
        error.message,

      stack:
        error.stack ||
        ""

    };

  }

}


/* =========================================================
   CREATE SALES ORDER
========================================================= */

function createSalesOrder(payload) {

  payload = payload || {};
  authorizeRole_(payload, ["ADMIN", "SALES"]);

  const lock =
    LockService.getScriptLock();


  lock.waitLock(
    30000
  );


  try {

payload = payload || {};

// USE THE MANUALLY ENCODED SO NUMBER
const soNumber = String(
  payload.soNumber ||
  payload.SO_NUMBER ||
  ""
).trim();

if (!soNumber) {
  return {
    success: false,
    message: "SO Number is required. Please enter it manually."
  };
}

// CHECK FOR DUPLICATE SO NUMBER
const existingOrders = getAllRecords(
  CONFIG.SHEETS.SALES_ORDERS
);

const duplicateSO = existingOrders.some(function(record) {
  const existingNumber = String(
    record.SO_NUMBER || ""
  ).trim();

  return existingNumber.toUpperCase() ===
    soNumber.toUpperCase();
});

if (duplicateSO) {
  return {
    success: false,
    message: "Duplicate SO Number: " + soNumber +
      ". Please enter a different Sales Order Number."
  };
}

const now =
  new Date();


    const year =
      getCurrentYear();


    const soId =
      generateId(
        "SO"
      );


    const soRow = [

      soId,

      soNumber,

      payload.dateCreation ||
      formatDate(now),

      payload.customerId ||
      "",

      payload.clientName ||
      "",

      payload.attention ||
      "",

      payload.billingAddress ||
      "",

      payload.deliveryAddress ||
      "",

      payload.project ||
      "",

      payload.tin ||
      "",

      payload.poNumber ||
      "",

      payload.terms ||
      "",

      payload.salesEngineer ||
      payload.se ||
      "",

      payload.jobOrder ||
      "",

      Number(
        payload.subtotal ||
        0
      ),

      Number(
        payload.discount ||
        0
      ),

      Number(
        payload.vatable ||
        0
      ),

      Number(
        payload.vatRate ||
        CONFIG.VAT_RATE
      ),

      Number(
        payload.vatAmount ||
        0
      ),

      Number(
        payload.grandTotal ||
        0
      ),

      payload.status ||
      "ACTIVE",

      payload.createdBy ||
      "SYSTEM",

      formatDateTime(
        now
      ),

      formatDateTime(
        now
      )

    ];


    appendRow(
      CONFIG.SHEETS.SALES_ORDERS,
      soRow
    );


    /* =====================================================
       CREATE SO ITEMS
    ===================================================== */

    const items =
      Array.isArray(
        payload.items
      )
        ? payload.items
        : [];


    items.forEach(
      function(item, index) {

        const quantity =
          Number(
            item.qty ||
            item.quantity ||
            item.QTY ||
            0
          );


        const unitPrice =
          Number(
            item.unitPrice ||
            item.UNIT_PRICE ||
            0
          );


        const amount =
          Number(
            item.amount ||
            item.AMOUNT ||
            unitPrice ||
            0
          );


        const total =
          Number(
            item.total ||
            item.TOTAL ||
            quantity *
            unitPrice ||
            0
          );


        const itemRow = [

          generateId(
            "SOITEM"
          ),

          soId,

          soNumber,

          item.itemNumber ||
          item.ITEM_NUMBER ||
          String(
            index + 1
          ),

          item.itemName ||
          item.ITEM_NAME ||
          "",

          item.description ||
          item.DESCRIPTION ||
          "",

          quantity,

          item.unit ||
          item.UNIT ||
          "",

          unitPrice,

          amount,

          total,

          formatDateTime(
            now
          )

        ];


        appendRow(
          CONFIG.SHEETS.SALES_ORDER_ITEMS,
          itemRow
        );

      }
    );


    /* =====================================================
       CREATE DRIVE FOLDER
    ===================================================== */

    const soFolder =
      createSalesOrderFolder(
        year,
        soNumber
      );


    /* =====================================================
       ACTIVITY LOG
    ===================================================== */

    logActivity({

      userId:
        payload.userId ||
        "",

      username:
        payload.createdBy ||
        "SYSTEM",

      action:
        "CREATE",

      module:
        "Sales Order",

      recordId:
        soId,

      recordNumber:
        soNumber,

      details:
        "Sales Order created",

      status:
        "SUCCESS"

    });

touchSyncVersion();

    return {

      success:
        true,

      message:
        "Sales Order created successfully.",

      soId:
        soId,

      soNumber:
        soNumber,

      folderId:
        soFolder.getId(),

      folderUrl:
        soFolder.getUrl(),

      data: {

        soId:
          soId,

        soNumber:
          soNumber,

        folderId:
          soFolder.getId(),

        folderUrl:
          soFolder.getUrl()

      }

    };


  } catch (error) {

    console.error(
      "CREATE SALES ORDER ERROR:",
      error
    );


    return {

      success:
        false,

      message:
        error.message,

      error:
        error.message,

      stack:
        error.stack ||
        ""

    };


  } finally {

    lock.releaseLock();

  }

}


/* =========================================================
   UPDATE SALES ORDER
========================================================= */

function updateSalesOrder(payload) {

  const lock =
    LockService.getScriptLock();


  lock.waitLock(
    30000
  );


  try {

    payload =
      payload ||
      {};


    const soNumber =
      String(
        payload.soNumber ||
        payload.SO_NUMBER ||
        ""
      ).trim();


    if (!soNumber) {

      return {

        success:
          false,

        message:
          "SO number is required."

      };

    }


    const sheet =
      getSheet(
        CONFIG.SHEETS.SALES_ORDERS
      );


    const data =
      sheet
        .getDataRange()
        .getValues();


    if (
      !data ||
      data.length < 2
    ) {

      return {

        success:
          false,

        message:
          "Sales Orders sheet has no records."

      };

    }


    const headers =
      data[0].map(
        function(header) {

          return String(
            header
          ).trim();

        }
      );


    const soNumberColumn =
      headers.indexOf(
        "SO_NUMBER"
      );


    if (
      soNumberColumn === -1
    ) {

      return {

        success:
          false,

        message:
          "SO_NUMBER column was not found."

      };

    }


    let targetRow =
      -1;


    for (
      let rowIndex = 1;
      rowIndex < data.length;
      rowIndex++
    ) {

      const currentSO =
        String(
          data[rowIndex][
            soNumberColumn
          ] ||
          ""
        ).trim();


      if (
        currentSO ===
        soNumber
      ) {

        targetRow =
          rowIndex + 1;

        break;

      }

    }


    if (
      targetRow === -1
    ) {

      return {

        success:
          false,

        message:
          "Sales Order not found: " +
          soNumber

      };

    }


    /* =====================================================
       SAFE COLUMN SETTER
    ===================================================== */

    function setColumn(
      columnNames,
      value
    ) {

      if (
        !Array.isArray(
          columnNames
        )
      ) {

        columnNames = [
          columnNames
        ];

      }


      for (
        let i = 0;
        i < columnNames.length;
        i++
      ) {

        const columnIndex =
          headers.indexOf(
            columnNames[i]
          );


        if (
          columnIndex !== -1
        ) {

          sheet
            .getRange(
              targetRow,
              columnIndex + 1
            )
            .setValue(
              value
            );

          return true;

        }

      }


      return false;

    }


    /* =====================================================
       BASIC INFORMATION
    ===================================================== */

    if (
      payload.dateCreation !==
      undefined
    ) {

      setColumn(
        [
          "DATE_CREATION",
          "DATE"
        ],
        payload.dateCreation
      );

    }


    if (
      payload.customerId !==
      undefined
    ) {

      setColumn(
        "CUSTOMER_ID",
        payload.customerId
      );

    }


    if (
      payload.clientName !==
      undefined
    ) {

      setColumn(
        [
          "CLIENT_NAME",
          "CLIENT"
        ],
        payload.clientName
      );

    }


    if (
      payload.attention !==
      undefined
    ) {

      setColumn(
        "ATTENTION",
        payload.attention
      );

    }


    if (
      payload.billingAddress !==
      undefined
    ) {

      setColumn(
        "BILLING_ADDRESS",
        payload.billingAddress
      );

    }


    if (
      payload.deliveryAddress !==
      undefined
    ) {

      setColumn(
        "DELIVERY_ADDRESS",
        payload.deliveryAddress
      );

    }


    if (
      payload.project !==
      undefined
    ) {

      setColumn(
        "PROJECT",
        payload.project
      );

    }


    if (
      payload.tin !==
      undefined
    ) {

      setColumn(
        "TIN",
        payload.tin
      );

    }


    if (
      payload.poNumber !==
      undefined
    ) {

      setColumn(
        [
          "PO_NUMBER",
          "PO"
        ],
        payload.poNumber
      );

    }


    if (
      payload.terms !==
      undefined
    ) {

      setColumn(
        "TERMS",
        payload.terms
      );

    }


    if (
      payload.salesEngineer !==
      undefined ||
      payload.se !==
      undefined
    ) {

      setColumn(
        [
          "SALES_ENGINEER",
          "SE"
        ],
        payload.salesEngineer ||
        payload.se ||
        ""
      );

    }


    if (
      payload.jobOrder !==
      undefined
    ) {

      setColumn(
        [
          "JOB_ORDER",
          "JO"
        ],
        payload.jobOrder
      );

    }


    /* =====================================================
       AMOUNTS
    ===================================================== */

    if (
      payload.subtotal !==
      undefined
    ) {

      setColumn(
        "SUBTOTAL",
        Number(
          payload.subtotal ||
          0
        )
      );

    }


    if (
      payload.discount !==
      undefined
    ) {

      setColumn(
        "DISCOUNT",
        Number(
          payload.discount ||
          0
        )
      );

    }


    if (
      payload.vatable !==
      undefined
    ) {

      setColumn(
        "VATABLE",
        Number(
          payload.vatable ||
          0
        )
      );

    }


    if (
      payload.vatRate !==
      undefined
    ) {

      setColumn(
        "VAT_RATE",
        Number(
          payload.vatRate ||
          CONFIG.VAT_RATE
        )
      );

    }


    if (
      payload.vatAmount !==
      undefined
    ) {

      setColumn(
        "VAT_AMOUNT",
        Number(
          payload.vatAmount ||
          0
        )
      );

    }


    if (
      payload.grandTotal !==
      undefined
    ) {

      setColumn(
        [
          "GRAND_TOTAL",
          "TOTAL"
        ],
        Number(
          payload.grandTotal ||
          0
        )
      );

    }


    /* =====================================================
       STATUS
    ===================================================== */

    if (
      payload.status !==
      undefined
    ) {

      setColumn(
        "STATUS",
        payload.status
      );

    }


    /* =====================================================
       UPDATED INFORMATION
    ===================================================== */

    setColumn(
      [
        "UPDATED_DATE",
        "UPDATED_AT",
        "LAST_UPDATED"
      ],
      formatDateTime(
        new Date()
      )
    );


    if (
      payload.updatedBy !==
      undefined
    ) {

      setColumn(
        [
          "UPDATED_BY",
          "LAST_UPDATED_BY"
        ],
        payload.updatedBy
      );

    }


    /* =====================================================
       UPDATE ITEMS
    ===================================================== */

    if (
      Array.isArray(
        payload.items
      )
    ) {

      updateSalesOrderItems(
        soNumber,
        payload.items,
        payload.soId ||
        ""
      );

    }


    /* =====================================================
       ACTIVITY LOG
    ===================================================== */

    logActivity({

      userId:
        payload.userId ||
        "",

      username:
        payload.updatedBy ||
        payload.createdBy ||
        "SYSTEM",

      action:
        "UPDATE",

      module:
        "Sales Order",

      recordId:
        payload.soId ||
        "",

      recordNumber:
        soNumber,

      details:
        "Sales Order updated",

      status:
        "SUCCESS"

    });

touchSyncVersion();

    return {

      success:
        true,

      message:
        "Sales Order updated successfully.",

      soNumber:
        soNumber,

      data: {

        soNumber:
          soNumber

      }

    };


  } catch (error) {

    console.error(
      "UPDATE SALES ORDER ERROR:",
      error
    );


    return {

      success:
        false,

      message:
        error.message,

      error:
        error.message,

      stack:
        error.stack ||
        ""

    };


  } finally {

    lock.releaseLock();

  }

}


/* =========================================================
   UPDATE SALES ORDER ITEMS
========================================================= */

function updateSalesOrderItems(
  soNumber,
  items,
  soId
) {

  const sheet =
    getSheet(
      CONFIG.SHEETS.SALES_ORDER_ITEMS
    );


  const data =
    sheet
      .getDataRange()
      .getValues();


  if (
    !data ||
    data.length < 1
  ) {

    return;

  }


  const headers =
    data[0].map(
      function(header) {

        return String(
          header
        ).trim();

      }
    );


  const soNumberColumn =
    headers.indexOf(
      "SO_NUMBER"
    );


  if (
    soNumberColumn === -1
  ) {

    throw new Error(
      "SO_NUMBER column was not found in SALES_ORDER_ITEMS."
    );

  }


  /* =====================================================
     DELETE OLD ITEMS
  ===================================================== */

  for (
    let rowIndex =
      data.length - 1;
    rowIndex >= 1;
    rowIndex--
  ) {

    const rowSO =
      String(
        data[rowIndex][
          soNumberColumn
        ] ||
        ""
      ).trim();


    if (
      rowSO ===
      String(
        soNumber
      ).trim()
    ) {

      sheet.deleteRow(
        rowIndex + 1
      );

    }

  }


  /* =====================================================
     ADD NEW ITEMS
  ===================================================== */

  items.forEach(
    function(item, index) {

      const quantity =
        Number(
          item.quantity ||
          item.qty ||
          item.QTY ||
          0
        );


      const unitPrice =
        Number(
          item.unitPrice ||
          item.UNIT_PRICE ||
          0
        );


      const amount =
        Number(
          item.amount ||
          item.AMOUNT ||
          unitPrice ||
          0
        );


      const total =
        Number(
          item.total ||
          item.TOTAL ||
          quantity *
          unitPrice ||
          0
        );


      const itemRow = [

        generateId(
          "SOITEM"
        ),

        soId ||
        "",

        soNumber,

        item.itemNumber ||
        item.ITEM_NUMBER ||
        String(
          index + 1
        ),

        item.itemName ||
        item.ITEM_NAME ||
        "",

        item.description ||
        item.DESCRIPTION ||
        "",

        quantity,

        item.unit ||
        item.UNIT ||
        "",

        unitPrice,

        amount,

        total,

        formatDateTime(
          new Date()
        )

      ];


      sheet.appendRow(
        itemRow
      );

    }
  );

}


/* =========================================================
   POST SALES ORDER
========================================================= */

function postSalesOrder(payload) {

  const lock =
    LockService.getScriptLock();


  lock.waitLock(
    30000
  );


  try {

    payload =
      payload ||
      {};


    const soNumber =
      String(
        payload.soNumber ||
        payload.SO_NUMBER ||
        ""
      ).trim();


    if (!soNumber) {

      return {

        success:
          false,

        message:
          "SO number is required."

      };

    }


    const sheet =
      getSheet(
        CONFIG.SHEETS.SALES_ORDERS
      );


    const data =
      sheet
        .getDataRange()
        .getValues();


    if (
      data.length < 2
    ) {

      return {

        success:
          false,

        message:
          "Sales Order not found."

      };

    }


    const headers =
      data[0].map(
        function(header) {

          return String(
            header
          ).trim();

        }
      );


    const soColumn =
      headers.indexOf(
        "SO_NUMBER"
      );


    const statusColumn =
      headers.indexOf(
        "STATUS"
      );


    if (
      soColumn === -1 ||
      statusColumn === -1
    ) {

      return {

        success:
          false,

        message:
          "SO_NUMBER or STATUS column not found."

      };

    }


    let targetRow =
      -1;


    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        String(
          data[i][soColumn] ||
          ""
        ).trim() ===
        soNumber
      ) {

        targetRow =
          i + 1;

        break;

      }

    }


    if (
      targetRow === -1
    ) {

      return {

        success:
          false,

        message:
          "Sales Order not found: " +
          soNumber

      };

    }


    /* =====================================================
       PREVENT POSTING CANCELLED SO
    ===================================================== */

    const currentStatus =
      String(
        data[targetRow - 1][statusColumn] ||
        ""
      ).trim().toUpperCase();


    if (
      currentStatus ===
      "CANCELLED"
    ) {

      return {

        success:
          false,

        message:
          "Cancelled Sales Order cannot be posted."

      };

    }


    sheet
      .getRange(
        targetRow,
        statusColumn + 1
      )
      .setValue(
        "POSTED"
      );


    /* =====================================================
       POSTING METADATA
    ===================================================== */

    function setColumn(
      names,
      value
    ) {

      if (
        !Array.isArray(
          names
        )
      ) {

        names = [
          names
        ];

      }


      for (
        let i = 0;
        i < names.length;
        i++
      ) {

        const index =
          headers.indexOf(
            names[i]
          );


        if (
          index !== -1
        ) {

          sheet
            .getRange(
              targetRow,
              index + 1
            )
            .setValue(
              value
            );

          return true;

        }

      }


      return false;

    }


    const now =
      formatDateTime(
        new Date()
      );


    setColumn(
      [
        "POSTED_DATE",
        "POSTED_AT"
      ],
      now
    );


    setColumn(
      [
        "POSTED_BY"
      ],
      payload.postedBy ||
      payload.username ||
      payload.createdBy ||
      "SYSTEM"
    );


    /* =====================================================
       ACTIVITY LOG
    ===================================================== */

    logActivity({

      userId:
        payload.userId ||
        "",

      username:
        payload.postedBy ||
        payload.username ||
        payload.createdBy ||
        "SYSTEM",

      action:
        "POST",

      module:
        "Sales Order",

      recordId:
        payload.soId ||
        "",

      recordNumber:
        soNumber,

      details:
        "Sales Order posted",

      status:
        "SUCCESS"

    });

touchSyncVersion();

    return {

      success:
        true,

      message:
        "Sales Order posted successfully.",

      soNumber:
        soNumber,

      status:
        "POSTED"

    };


  } catch (error) {

    console.error(
      "POST SALES ORDER ERROR:",
      error
    );


    return {

      success:
        false,

      message:
        error.message,

      error:
        error.message,

      stack:
        error.stack ||
        ""

    };


  } finally {

    lock.releaseLock();

  }

}


/* =========================================================
   CANCEL SALES ORDER
========================================================= */

function cancelSalesOrder(payload) {

  const lock =
    LockService.getScriptLock();


  lock.waitLock(
    30000
  );


  try {

    payload =
      payload ||
      {};


    const soNumber =
      String(
        payload.soNumber ||
        payload.SO_NUMBER ||
        ""
      ).trim();


    if (!soNumber) {

      return {

        success:
          false,

        message:
          "SO number is required."

      };

    }


    const sheet =
      getSheet(
        CONFIG.SHEETS.SALES_ORDERS
      );


    const data =
      sheet
        .getDataRange()
        .getValues();


    if (
      data.length < 2
    ) {

      return {

        success:
          false,

        message:
          "Sales Order not found."

      };

    }


    const headers =
      data[0].map(
        function(header) {

          return String(
            header
          ).trim();

        }
      );


    const soColumn =
      headers.indexOf(
        "SO_NUMBER"
      );


    const statusColumn =
      headers.indexOf(
        "STATUS"
      );


    if (
      soColumn === -1 ||
      statusColumn === -1
    ) {

      return {

        success:
          false,

        message:
          "SO_NUMBER or STATUS column not found."

      };

    }


    let targetRow =
      -1;


    for (
      let i = 1;
      i < data.length;
      i++
    ) {

      if (
        String(
          data[i][soColumn] ||
          ""
        ).trim() ===
        soNumber
      ) {

        targetRow =
          i + 1;

        break;

      }

    }


    if (
      targetRow === -1
    ) {

      return {

        success:
          false,

        message:
          "Sales Order not found: " +
          soNumber

      };

    }


    const currentStatus =
      String(
        data[targetRow - 1][statusColumn] ||
        ""
      ).trim().toUpperCase();


    if (
      currentStatus ===
      "CANCELLED"
    ) {

      return {

        success:
          true,

        message:
          "Sales Order is already cancelled.",

        soNumber:
          soNumber

      };

    }


    if (
      currentStatus ===
      "POSTED"
    ) {

      return {

        success:
          false,

        message:
          "Posted Sales Order cannot be cancelled."

      };

    }


    sheet
      .getRange(
        targetRow,
        statusColumn + 1
      )
      .setValue(
        "CANCELLED"
      );


    /* =====================================================
       CANCEL METADATA
    ===================================================== */

    function setColumn(
      names,
      value
    ) {

      if (
        !Array.isArray(
          names
        )
      ) {

        names = [
          names
        ];

      }


      for (
        let i = 0;
        i < names.length;
        i++
      ) {

        const index =
          headers.indexOf(
            names[i]
          );


        if (
          index !== -1
        ) {

          sheet
            .getRange(
              targetRow,
              index + 1
            )
            .setValue(
              value
            );

          return true;

        }

      }


      return false;

    }


    setColumn(
      [
        "CANCELLED_DATE",
        "CANCELLED_AT"
      ],
      formatDateTime(
        new Date()
      )
    );


    setColumn(
      [
        "CANCELLED_BY"
      ],
      payload.username ||
      payload.createdBy ||
      "SYSTEM"
    );


    /* =====================================================
       ACTIVITY LOG
    ===================================================== */

    logActivity({

      userId:
        payload.userId ||
        "",

      username:
        payload.username ||
        payload.createdBy ||
        "SYSTEM",

      action:
        "CANCEL",

      module:
        "Sales Order",

      recordId:
        payload.soId ||
        "",

      recordNumber:
        soNumber,

      details:
        "Sales Order cancelled",

      status:
        "SUCCESS"

    });

touchSyncVersion();

    return {

      success:
        true,

      message:
        "Sales Order cancelled successfully.",

      soNumber:
        soNumber,

      status:
        "CANCELLED"

    };


  } catch (error) {

    console.error(
      "CANCEL SALES ORDER ERROR:",
      error
    );


    return {

      success:
        false,

      message:
        error.message,

      error:
        error.message

    };


  } finally {

    lock.releaseLock();

  }

}


/* =========================================================
   APPEND ROW
========================================================= */

function appendRow(
  sheetName,
  row
) {

  const sheet =
    getSheet(
      sheetName
    );


  sheet.appendRow(
    row
  );

}


/* =========================================================
   CREATE SALES ORDER FOLDER
========================================================= */

function createSalesOrderFolder(
  year,
  soNumber
) {

  const root =
    getRootFolder();


  const salesFolder =
    getOrCreateFolder(
      root,
      CONFIG.FOLDERS.SALES_ORDER
    );


  const yearFolder =
    getYearFolder(
      salesFolder,
      year
    );


  const soFolder =
    getOrCreateFolder(
      yearFolder,
      soNumber
    );


  return soFolder;

}
