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


    /* AUTO-GENERATE SALES ORDER PDF IN THE SO FOLDER */
    let pdfResult = { saved: false, error: "PDF generation was not completed." };
    try {
      pdfResult = createSalesOrderPDF_(payload, soFolder, soId, soNumber, year);
    } catch (pdfError) {
      console.error("AUTO SALES ORDER PDF ERROR:", soNumber, pdfError);
      pdfResult = { saved: false, error: pdfError && pdfError.message ? pdfError.message : String(pdfError) };
    }


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
        pdfResult.saved ? "Sales Order created and PDF saved successfully." : "Sales Order created, but automatic PDF generation failed.",

      pdfSaved:
        Boolean(pdfResult.saved),

      pdfFileId:
        pdfResult.fileId || "",

      pdfUrl:
        pdfResult.fileUrl || "",

      pdfError:
        pdfResult.error || "",

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
          soFolder.getUrl(),

        pdfSaved:
          Boolean(pdfResult.saved),

        pdfUrl:
          pdfResult.fileUrl || ""

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
   AUTO-GENERATE SALES ORDER PDF
   Saves to 02_SALES_ORDER/<year>/<SO_NUMBER>/
========================================================= */
function createSalesOrderPDF_(payload, soFolder, soId, soNumber, year) {
  payload = payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const escapeHtml = function(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch) {
      return {"&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"}[ch];
    });
  };
  const val = function() {
    for (let i = 0; i < arguments.length; i++) {
      const value = payload[arguments[i]];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  };
  const money = function(value) {
    const number = Number(value || 0);
    const safe = isFinite(number) ? number : 0;
    return safe.toLocaleString("en-PH", {minimumFractionDigits:2, maximumFractionDigits:2});
  };
  const dateText = function(value) {
    if (!value) return "";
    if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), "d-MMM-yy");
    }
    const raw = String(value);
    const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const parsed = isoDate
      ? new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]), 12, 0, 0)
      : new Date(value);
    if (!isNaN(parsed.getTime()) && (isoDate || raw.indexOf("T") >= 0)) {
      return Utilities.formatDate(parsed, Session.getScriptTimeZone(), "d-MMM-yy");
    }
    return raw;
  };
  const itemRows = items.map(function(item, index) {
    item = item || {};
    const qty = Number(item.qty || item.quantity || item.QTY || 0);
    const unitPrice = Number(item.amount || item.unitPrice || item.UNIT_PRICE || 0);
    const total = Number(item.total || item.TOTAL || (qty * unitPrice));
    const rawItemNumber = item.itemNumber || item.ITEM_NUMBER || (index + 1);
    const itemNumber = isFinite(Number(rawItemNumber)) ? Number(rawItemNumber).toFixed(1) : rawItemNumber;
    const name = item.itemName || item.ITEM_NAME || "";
    return "<tr class='item-row'><td class='center item-no'>" + escapeHtml(itemNumber) + "</td>" +
      "<td class='description'><b>" + escapeHtml(name) + "</b></td>" +
      "<td class='center'>" + escapeHtml(qty) + "</td>" +
      "<td class='center'>" + escapeHtml(item.unit || item.UNIT || "") + "</td>" +
      "<td class='number'>" + money(unitPrice) + "</td>" +
      "<td class='number'>" + money(total) + "</td></tr>";
  }).join("");
  const minimumRows = Math.max(0, 47 - items.length);
  const blankRows = Array.from({length: minimumRows}, function() {
    return "<tr class='blank-row'><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
  }).join("");
  const logoUrl = "https://raw.githubusercontent.com/chrisgubat1997-cell/logistics-system/main/assets/drlogo.png";
  const total = Number(payload.subtotal || 0);
  const discount = Number(payload.discount || 0);
  const sellingPrice = Number(payload.grandTotal !== undefined ? payload.grandTotal : (payload.vatable !== undefined ? payload.vatable : total - discount));
  const vatAmount = Number(payload.vatAmount || 0);
  const grossProfit = val("grossProfit", "GROSS_PROFIT");
  const tpc = val("tpc", "TPC");
  const percentage = val("percentage", "PERCENTAGE");
  const preparedBy = val("preparedBy", "PREPARED_BY") || "Katrina Mae S. Tagatac";
  const checkedBy = val("checkedBy", "CHECKED_BY") || "Kaye B. Ochoa";
  const approvedBy = val("approvedBy", "APPROVED_BY") || "Melannie C. Mendiola";
  const html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><style>" +
    "@page{size:8.5in 14in;margin:0.75in 0.7in}" +
    "*{box-sizing:border-box}body{font-family:'Century Gothic','CenturyGothic',AppleGothic,sans-serif;color:#111;font-size:13px;margin:0}" +
    "table{border-collapse:collapse;table-layout:fixed;width:100%}.header td{border:0;height:58px;padding:3px 5px}" +
    ".logo-cell{width:47%;vertical-align:middle}.logo{width:215px;height:auto;max-height:48px;object-fit:contain}" +
    ".title-cell{text-align:center;font-size:23px;font-weight:800;white-space:nowrap}" +
    ".check-cell{width:20%;font-size:13px}.check-row{white-space:nowrap;line-height:15px}.check{display:inline-block;width:11px;height:11px;border:1px solid #111;vertical-align:middle;margin-right:5px}" +
    ".meta{margin-top:0;background:#fff!important}.meta tr,.meta td{background:#fff!important}.meta td{border:0;min-height:16px;padding:2px 4px;vertical-align:middle;font-size:13px}.meta .label{width:13%;white-space:nowrap}.meta .value{width:37%;overflow-wrap:anywhere;text-decoration:underline;text-underline-offset:2px;font-size:13px}.meta .right-label{width:17%;white-space:nowrap}.meta .right-value{width:33%;text-align:center;overflow-wrap:anywhere;text-decoration:underline;text-underline-offset:2px;font-size:13px}.meta tr:first-child .value,.meta tr:first-child .right-value{font-size:14px;font-weight:700}.bold{font-weight:700}" +
    ".items{margin-top:10px}.items th{height:17px;background:#000;color:#fff;border:1px solid #000;font-size:13px;text-align:center;padding:3px 2px}.items td{border-left:1px solid #888;border-right:1px solid #888;border-bottom:1px solid #ddd;height:11.5px;padding:1px 4px;vertical-align:middle}.items th:nth-child(1){width:5.6%}.items th:nth-child(2){width:50.8%}.items th:nth-child(3){width:5.8%}.items th:nth-child(4){width:5.6%}.items th:nth-child(5){width:12%}.items th:nth-child(6){width:20.2%}.item-row td{height:11.5px}.item-no{font-weight:bold}.description{overflow-wrap:anywhere}.sub-description{font-size:13px;margin-top:2px}.center{text-align:center}.number{text-align:right;white-space:nowrap}" +
    ".notes{height:22px;text-align:center;font-weight:bold;font-style:italic;color:#e00000;font-size:13px}.nothing{height:16px;text-align:center;font-weight:bold;font-style:italic}.page-no{height:16px;text-align:center;font-weight:bold;font-style:italic;border-bottom:1px solid #888}" +
    ".bottom{width:100%;margin-top:0}.bottom td{border:1px solid #aaa;padding:3px 5px;height:16px}.bottom .spacer{border-left:0;border-right:0}.bottom .label{font-weight:600}.bottom .amount{text-align:right;white-space:nowrap;width:19%}.bottom .currency{text-align:center;width:4%}.bottom .total-selling td{background:#bdbdbd;font-weight:bold}.bottom .total-selling .amount{font-size:10px}.bottom .gross td{background:#bdbdbd;font-weight:bold}.bottom .pct td{background:#bdbdbd;font-weight:bold}" +
    ".signatures{margin-top:8px}.signatures td{width:33.33%;border:0;border-top:1px solid #aaa;padding:4px 3px;text-align:center;height:21px;vertical-align:bottom}.signature-label{text-align:left!important;height:18px!important;vertical-align:top!important}.signature-name{font-weight:bold;text-decoration:underline;height:18px}.signature-role{font-size:13px;height:16px}.signature-gap td{height:11.5px;padding:0;border:0}.dr-invoice{text-align:right;height:15px;border:0!important}.company-footer{margin-top:8px;border-top:1px solid #aaa;border-bottom:1px solid #aaa;padding:4px 2px;font-size:10px;white-space:normal;line-height:1.25}.form-code{margin-top:8px;font-size:10px}.form-code div{margin-top:3px}" +
    "</style></head><body>" +
    "<table class='header'><tr><td class='logo-cell'><img class='logo' src='" + logoUrl + "'></td>" +
    "<td class='title-cell'>SALES ORDER FORM</td><td class='check-cell'>" +
    "<div class='check-row'><span class='check'></span> ACCOUNTING</div><div class='check-row'><span class='check'></span> PURCHASING</div><div class='check-row'><span class='check'></span> SALES</div>" +
    "</td></tr></table>" +
    "<table class='meta'>" +
    "<tr><td class='label'>Sold to:</td><td class='value bold'>" + escapeHtml(val("clientName", "CLIENT_NAME")) + "</td><td class='right-label'>SOF No.</td><td class='right-value bold'>" + escapeHtml(soNumber) + "</td></tr>" +
    "<tr><td class='label'>Billing Address</td><td class='value'>" + escapeHtml(val("billingAddress", "BILLING_ADDRESS")) + "</td><td class='right-label'>Date</td><td class='right-value'>" + escapeHtml(dateText(val("dateCreation", "DATE_CREATION") || new Date())) + "</td></tr>" +
    "<tr><td class='label'>Delivery Address</td><td class='value'>" + escapeHtml(val("deliveryAddress", "DELIVERY_ADDRESS")) + "</td><td class='right-label'>P.O Number</td><td class='right-value'>" + escapeHtml(val("poNumber", "PO_NUMBER")) + "</td></tr>" +
    "<tr><td class='label'>Classification</td><td class='value'>" + escapeHtml(val("classification", "CLASSIFICATION")) + "</td><td class='right-label'>Terms</td><td class='right-value'>" + escapeHtml(val("terms", "TERMS")) + "</td></tr>" +
    "<tr><td class='label'>Required Del. Date</td><td class='value'>" + escapeHtml(dateText(val("requiredDeliveryDate", "requiredDelDate", "REQUIRED_DELIVERY_DATE", "REQUIRED_DEL_DATE"))) + "</td><td class='right-label'>J.O No.</td><td class='right-value'>" + escapeHtml(val("jobOrder", "JOB_ORDER")) + "</td></tr>" +
    "<tr><td class='label'>Attention</td><td class='value'>" + escapeHtml(val("attention", "ATTENTION")) + "</td><td class='right-label'>Quotation No.</td><td class='right-value'>" + escapeHtml(val("quotationNo", "quotationNumber", "QUOTATION_NO", "QUOTATION_NUMBER")) + "</td></tr>" +
    "<tr><td class='label'>Project Name</td><td class='value'>" + escapeHtml(val("project", "PROJECT")) + "</td><td class='right-label'>Account Manager</td><td class='right-value'>" + escapeHtml(val("accountManager", "ACCOUNT_MANAGER", "salesEngineer", "se", "SALES_ENGINEER")) + "</td></tr>" +
    "<tr><td class='label'>Tin Number</td><td class='value'>" + escapeHtml(val("tin", "TIN")) + "</td><td class='right-label'></td><td class='right-value'></td></tr></table>" +
    "<table class='items'><thead><tr><th>ITEM</th><th>DESCRIPTION</th><th>QTY</th><th>UNIT</th><th>UNIT PRICE</th><th>EXTENDED PRICE</th></tr></thead><tbody>" +
    (itemRows || "") + blankRows +
    "</tbody></table>" +
    "<div class='notes'>***WITH SHOPDRAWING***　　　　　　　　　***WITHOUT STOCK***</div>" +
    "<div class='nothing'>***Nothing follows*******</div><div class='page-no'>Page 1 of 1</div>" +
    "<table class='bottom'><tr><td class='spacer' colspan='3'></td><td class='label'>TOTAL</td><td class='currency'>&#8369;</td><td class='amount'>" + money(total) + "</td></tr>" +
    "<tr><td class='spacer' colspan='3'></td><td class='label'>LESS DISCOUNT</td><td class='currency'>&#8369;</td><td class='amount'>" + money(discount) + "</td></tr>" +
    "<tr><td class='spacer' colspan='3'></td><td class='label'>ADDED VAT</td><td class='currency'>" + (vatAmount ? "&#8369;" : "") + "</td><td class='amount'>" + (vatAmount ? money(vatAmount) : "") + "</td></tr>" +
    "<tr class='total-selling'><td class='spacer' colspan='3'></td><td class='label'>TOTAL SELLING PRICE</td><td class='currency'>&#8369;</td><td class='amount'>" + money(sellingPrice) + "</td></tr>" +
    "<tr class='gross'><td class='spacer' colspan='3'></td><td class='label'>TPC</td><td class='currency'></td><td class='amount'>" + (tpc !== "" ? money(tpc) : "") + "</td></tr>" +
    "<tr class='gross'><td class='spacer' colspan='3'></td><td class='label'>GROSS PROFIT</td><td class='currency'>" + (grossProfit !== "" ? "&#8369;" : "") + "</td><td class='amount'>" + (grossProfit !== "" ? money(grossProfit) : "") + "</td></tr>" +
    "<tr class='pct'><td class='spacer' colspan='3'></td><td class='label'>PERCENTAGE</td><td class='currency'></td><td class='amount'>" + (percentage !== "" ? escapeHtml(percentage) : "") + "</td></tr></table>" +
    "<table class='signatures'><tr><td class='signature-label'>Prepared by:</td><td class='signature-label'>Checked by:</td><td class='signature-label'>Approved by:</td></tr>" +
    "<tr class='signature-gap'><td></td><td></td><td></td></tr>" +
    "<tr><td class='signature-name'>" + escapeHtml(preparedBy) + "</td><td class='signature-name'>" + escapeHtml(checkedBy) + "</td><td class='signature-name'>" + escapeHtml(approvedBy) + "</td></tr>" +
    "<tr><td class='signature-role'>Sales Coordinator</td><td class='signature-role'>Sales Account Manager</td><td class='signature-role'>Finance Manager</td></tr>" +
    "<tr class='signature-gap'><td></td><td></td><td></td></tr>" +
    "<tr><td></td><td></td><td class='dr-invoice'>DR # __________________</td></tr>" +
    "<tr class='signature-gap'><td></td><td></td><td></td></tr>" +
    "<tr><td></td><td></td><td class='dr-invoice'>Invoice # _______________</td></tr></table>" +
    "<div class='company-footer'>Greenmetal Electric Manufacturing Corporation: Dolores St. cor. Camia St., Dolmar Golden Hills Subd., Llano Road, Caloocan City　 Contact Nos.: 0917 708 4533 (Globe) 8356-5128 (Landline)</div>" +
    "<div class='form-code'><div>F-SAM-003</div><div>Rev. 2 06-01-23</div></div></body></html>";
  const pdfBlob = HtmlService.createHtmlOutput(html).getBlob().getAs(MimeType.PDF).setName(soNumber + ".pdf");
  const file = soFolder.createFile(pdfBlob);
  try {
    appendRow(CONFIG.SHEETS.DOCUMENT_INDEX, [
      generateId("DOC"), "SALES_ORDER_PDF", soId, soNumber,
      file.getName(), file.getId(), soFolder.getId(), file.getMimeType(),
      file.getUrl(), payload.createdBy || "SYSTEM", formatDateTime(new Date()), "ACTIVE"
    ]);
  } catch (indexError) {
    console.warn("Sales Order PDF saved but DOCUMENT_INDEX update failed:", indexError);
  }
  return {saved:true, fileId:file.getId(), fileUrl:file.getUrl(), fileName:file.getName()};
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
