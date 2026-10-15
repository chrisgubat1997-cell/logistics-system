/* =========================================================
   LOGIS-TECH SYSTEM
   DELIVERY MODULE
   Delivery.gs
   VERSION: 20261009-02

   DATABASE:
   - DELIVERY_RECEIPTS
   - DELIVERY_RECEIPT_ITEMS
   - SALES_ORDERS
   - SALES_ORDER_ITEMS

   Uses CONFIG.DATABASE_SPREADSHEET_ID
========================================================= */


/* =========================================================
   GET DELIVERY RECEIPTS
   OPTIMIZED VERSION: 20261014-01
========================================================= */

function getDeliveryReceipts(payload) {
  payload = payload || {};

  const soFilter = String(
    payload.soNumber ||
    payload.SO_NUMBER ||
    ""
  ).trim();

  // Basahin ang DR records
  const drRecords = getAllRecords(
    CONFIG.SHEETS.DELIVERY_RECEIPTS
  );

  // I-filter agad kung may SO number
  const filteredDRs = soFilter
    ? drRecords.filter(function(dr) {
        return String(dr.SO_NUMBER || "").trim() === soFilter;
      })
    : drRecords;

  // Walang kailangang basahin na items kung walang DR
  if (!filteredDRs.length) {
    return {
      success: true,
      deliveryReceipts: [],
      records: [],
      count: 0
    };
  }

  // Gumawa ng lookup keys para sa mga DR na kailangan
  const drIds = {};
  const drNumbers = {};

  filteredDRs.forEach(function(dr) {
    if (dr.DR_ID) {
      drIds[String(dr.DR_ID)] = true;
    }

    if (dr.DR_NUMBER) {
      drNumbers[String(dr.DR_NUMBER)] = true;
    }
  });

  // Basahin ang DR items nang isang beses lamang
  const allItems = getAllRecords(
    CONFIG.SHEETS.DELIVERY_RECEIPT_ITEMS
  );

  // I-grupo ang items ayon sa DR_ID at DR_NUMBER
  const itemsById = {};
  const itemsByNumber = {};

  allItems.forEach(function(item) {
    if (item.DR_ID) {
      const id = String(item.DR_ID);

      if (drIds[id]) {
        if (!itemsById[id]) {
          itemsById[id] = [];
        }

        itemsById[id].push(item);
      }
    }

    if (item.DR_NUMBER) {
      const number = String(item.DR_NUMBER);

      if (drNumbers[number]) {
        if (!itemsByNumber[number]) {
          itemsByNumber[number] = [];
        }

        itemsByNumber[number].push(item);
      }
    }
  });

  // Ikabit ang items sa bawat DR
  const records = filteredDRs.map(function(dr) {
    const id = String(dr.DR_ID || "");
    const number = String(dr.DR_NUMBER || "");

    let items = id ? itemsById[id] || [] : [];

    // Fallback sa DR_NUMBER para sa legacy records
    if (!items.length && number) {
      items = itemsByNumber[number] || [];
    }

    dr.ITEMS = items;
    dr.items = items;

    return dr;
  });

  return {
    success: true,
    deliveryReceipts: records,
    records: records,
    count: records.length
  };
}


/* =========================================================
   02. CREATE DELIVERY RECEIPT
========================================================= */

function createDeliveryReceipt(payload) {
  payload = payload || {};
  authorizeRole_(payload, ["ADMIN", "LOGISTICS"]);

  const lock = LockService.getScriptLock();

  lock.waitLock(30000);

  try {
    const soNumber = String(
      payload.soNumber ||
      payload.SO_NUMBER ||
      ""
    ).trim();

    const dateOfTransfer =
      payload.dateOfTransfer ||
      payload.DATE_OF_TRANSFER ||
      "";

    const requestedItems = Array.isArray(payload.items)
      ? payload.items
      : [];

    if (!soNumber) {
      throw new Error("Sales Order Number is required.");
    }

    if (!dateOfTransfer) {
      throw new Error("Date of Transfer is required.");
    }

    if (!requestedItems.length) {
      throw new Error("Select at least one delivery item.");
    }


    /* -----------------------------------------------------
       GET DATABASE SHEETS
    ----------------------------------------------------- */

    const drSheet = getSheet(
      CONFIG.SHEETS.DELIVERY_RECEIPTS
    );

    const drItemSheet = getSheet(
      CONFIG.SHEETS.DELIVERY_RECEIPT_ITEMS
    );


    /* -----------------------------------------------------
       FIND SALES ORDER
    ----------------------------------------------------- */

    const so = findRecord(
      CONFIG.SHEETS.SALES_ORDERS,
      "SO_NUMBER",
      soNumber
    );

    if (!so) {
      throw new Error(
        "Sales Order not found: " + soNumber
      );
    }

    if (
      String(so.STATUS || "").toUpperCase() === "CANCELLED"
    ) {
      throw new Error(
        "Cannot create a Delivery Receipt for a cancelled Sales Order."
      );
    }

    if (typeof validateDeliveryPaymentTerms_ === "function") {
  validateDeliveryPaymentTerms_(so);
}


    /* -----------------------------------------------------
       GET SALES ORDER ITEMS
    ----------------------------------------------------- */

    const allSOItems = getAllRecords(
      CONFIG.SHEETS.SALES_ORDER_ITEMS
    );

    const soItems = allSOItems.filter(function (item) {
      return String(item.SO_NUMBER || "") === soNumber;
    });

    if (!soItems.length) {
      throw new Error(
        "No items were found for Sales Order " + soNumber
      );
    }


    /* -----------------------------------------------------
       GET EXISTING DELIVERY RECORDS
    ----------------------------------------------------- */

    const existingDRs = getAllRecords(
      CONFIG.SHEETS.DELIVERY_RECEIPTS
    );

    const existingDRItems = getAllRecords(
      CONFIG.SHEETS.DELIVERY_RECEIPT_ITEMS
    );


    /* -----------------------------------------------------
       CALCULATE PREVIOUSLY PICKED QUANTITIES

       Cancelled DRs are excluded.
    ----------------------------------------------------- */

    const drStatusById = {};
    const drStatusByNumber = {};

    existingDRs.forEach(function (dr) {
      const status = String(
        dr.STATUS || ""
      ).toUpperCase();

      if (dr.DR_ID) {
        drStatusById[String(dr.DR_ID)] = status;
      }

      if (dr.DR_NUMBER) {
        drStatusByNumber[String(dr.DR_NUMBER)] = status;
      }
    });


    function _drIsCancelled(item) {
      let status = "";

      if (item.DR_ID) {
        status = drStatusById[String(item.DR_ID)] || "";
      }

      if (!status && item.DR_NUMBER) {
        status =
          drStatusByNumber[String(item.DR_NUMBER)] || "";
      }

      return status === "CANCELLED";
    }


    function _drPreviouslyDelivered(soItemId) {
      let total = 0;

      existingDRItems.forEach(function (item) {
        if (_drIsCancelled(item)) return;

        if (
          String(item.SO_ITEM_ID || "") !==
          String(soItemId || "")
        ) {
          return;
        }

        const parentDR = existingDRs.find(function (dr) {
          const sameId =
            dr.DR_ID &&
            item.DR_ID &&
            String(dr.DR_ID) === String(item.DR_ID);

          const sameNumber =
            dr.DR_NUMBER &&
            item.DR_NUMBER &&
            String(dr.DR_NUMBER) === String(item.DR_NUMBER);

          return sameId || sameNumber;
        });

        if (!parentDR) return;

        const status = String(
          parentDR.STATUS || ""
        ).toUpperCase();

        if (status === "CANCELLED") return;

        total += Number(
          item.PICK_QTY ||
          item.DELIVERED_QTY ||
          0
        );
      });

      return total;
    }


    /* -----------------------------------------------------
       VALIDATE REQUESTED ITEMS
    ----------------------------------------------------- */

    const preparedItems = [];
    const seenItemIds = {};

    requestedItems.forEach(function (requested) {
      const soItemId = String(
        requested.soItemId ||
        requested.SO_ITEM_ID ||
        requested.itemId ||
        ""
      ).trim();

      const itemNumber = String(
        requested.itemNumber ||
        requested.ITEM_NUMBER ||
        ""
      ).trim();

      const soItem = soItems.find(function (item) {
        if (
          soItemId &&
          String(item.SO_ITEM_ID || "") === soItemId
        ) {
          return true;
        }

        return (
          !soItemId &&
          itemNumber &&
          String(item.ITEM_NUMBER || "") === itemNumber
        );
      });

      if (!soItem) {
        throw new Error(
          "An item does not belong to Sales Order " + soNumber
        );
      }

      const resolvedItemId = String(
        soItem.SO_ITEM_ID || ""
      );

      if (seenItemIds[resolvedItemId]) {
        throw new Error(
          "Duplicate item selected: " +
          String(soItem.ITEM_NAME || itemNumber)
        );
      }

      seenItemIds[resolvedItemId] = true;

      const pickQty = Number(
        requested.pickQty ??
        requested.PICK_QTY ??
        requested.deliveredQty ??
        0
      );

      const soQty = Number(
        soItem.QTY || 0
      );

      const previouslyDelivered =
        _drPreviouslyDelivered(resolvedItemId);

      const balance = Math.max(
        0,
        soQty - previouslyDelivered
      );

      if (!Number.isFinite(pickQty) || pickQty <= 0) {
        throw new Error(
          "Pick quantity must be greater than zero for " +
          String(soItem.ITEM_NAME || itemNumber)
        );
      }

      if (pickQty > balance) {
        throw new Error(
          "Pick quantity exceeds the remaining balance for " +
          String(soItem.ITEM_NAME || itemNumber) +
          ". Remaining balance: " + balance
        );
      }

      
      // GET UNIT PRICE FROM THE SALES ORDER ITEM
      const unitPriceRaw =
  soItem.UNIT_PRICE ??
  soItem.unitPrice ??
  soItem.AMOUNT ??
  soItem.amount ??
  0;

const unitPrice = Number(unitPriceRaw);

if (!Number.isFinite(unitPrice) || unitPrice < 0) {
  throw new Error(
    "Invalid unit price for item: " +
    String(
      soItem.ITEM_NUMBER ||
      soItem.itemNumber ||
      ""
    )
  );
}

const drAmount = Math.round(
  (pickQty * unitPrice + Number.EPSILON) * 100
) / 100;


      
      preparedItems.push({
        soItemId: resolvedItemId,
        itemNumber: soItem.ITEM_NUMBER || "",
        itemName: soItem.ITEM_NAME || "",
        description: soItem.DESCRIPTION || "",
        unit: soItem.UNIT || "",
        soQty: soQty,
        previouslyDelivered: previouslyDelivered,
        pickQty: pickQty,
        unitPrice: unitPrice,
        drAmount: drAmount,
        balance: balance - pickQty,
        remarks: String(
          requested.remarks ||
          requested.REMARKS ||
          ""
        )
      });

    });


    /* -----------------------------------------------------
       GENERATE DR NUMBER ON SERVER
    ----------------------------------------------------- */

    const drId = generateId("DR");

    const drNumber = generateDocumentNumber(
      CONFIG.PREFIX.DR,
      CONFIG.SHEETS.DELIVERY_RECEIPTS,
      "DR_NUMBER"
    );

    
    const drTotal = Math.round(
      (
        preparedItems.reduce(function (sum, item) {
          return sum + item.drAmount;
        }, 0) + Number.EPSILON
      ) * 100
    ) / 100;



    /* -----------------------------------------------------
       PREPARE DELIVERY RECEIPT HEADER
    ----------------------------------------------------- */

    const now = new Date();
    const timestamp = formatDateTime(now);

    const headerData = {
      DR_ID: drId,
      DR_NUMBER: drNumber,
      DR_TOTAL: drTotal,
      SO_ID: so.SO_ID || "",
      SO_NUMBER: so.SO_NUMBER || soNumber,
      CUSTOMER_ID: so.CUSTOMER_ID || "",
      CLIENT_NAME: so.CLIENT_NAME || "",
      SALES_ENGINEER: so.SALES_ENGINEER || "",
      ATTENTION: so.ATTENTION || "",
      TIN: so.TIN || "",
      PO_NUMBER: so.PO_NUMBER || "",
      PAYMENT_TERMS: so.TERMS || so.PAYMENT_TERMS || "",
      JOB_ORDER: so.JOB_ORDER || "",
      BILLING_ADDRESS: so.BILLING_ADDRESS || "",
      PROJECT: so.PROJECT || "",
      DELIVERY_ADDRESS:
        payload.deliveryAddress ||
        payload.DELIVERY_ADDRESS ||
        so.DELIVERY_ADDRESS ||
        "",
      DATE_OF_TRANSFER: dateOfTransfer,
      STATUS: "SAVED",
      CREATED_BY:
        payload.createdBy ||
        payload.username ||
        payload.CREATED_BY ||
        "",
      CREATED_AT: timestamp,
      UPDATED_AT: timestamp
    };


    /* -----------------------------------------------------
       APPEND HEADER USING ACTUAL SHEET HEADERS
    ----------------------------------------------------- */

    const drHeaders = drSheet
      .getRange(1, 1, 1, drSheet.getLastColumn())
      .getValues()[0]
      .map(function (header) {
        return String(header).trim();
      });

    if (!drHeaders.length || !drHeaders[0]) {
      throw new Error(
        "DELIVERY_RECEIPTS is missing its column headers."
      );
    }

    const headerRow = drHeaders.map(function (header) {
      return headerData[header] !== undefined
        ? headerData[header]
        : "";
    });

    drSheet.appendRow(headerRow);


    /* -----------------------------------------------------
       PREPARE DELIVERY RECEIPT ITEMS
    ----------------------------------------------------- */

    const itemHeaders = drItemSheet
      .getRange(1, 1, 1, drItemSheet.getLastColumn())
      .getValues()[0]
      .map(function (header) {
        return String(header).trim();
      });

    if (!itemHeaders.length || !itemHeaders[0]) {
      throw new Error(
        "DELIVERY_RECEIPT_ITEMS is missing its column headers."
      );
    }

    const itemRows = preparedItems.map(function (item) {
      const itemData = {
        DR_ITEM_ID: generateId("DRITEM"),
        DR_ID: drId,
        DR_NUMBER: drNumber,
        SO_ITEM_ID: item.soItemId,
        ITEM_NUMBER: item.itemNumber,
        ITEM_NAME: item.itemName,
        ITEM_DESCRIPTION: item.description,
        UNIT: item.unit,
        TOTAL_ORDER: item.soQty,
        SO_QTY: item.soQty,
        TOTAL_DELIVERED: item.previouslyDelivered,
        DELIVERED_QTY: item.pickQty,
        BALANCE: item.balance,
        PICK_QTY: item.pickQty,
        UNIT_PRICE: item.unitPrice,
        DR_AMOUNT: item.drAmount,
        REMARKS: item.remarks,
        CREATED_AT: timestamp
      };

      return itemHeaders.map(function (header) {
        return itemData[header] !== undefined
          ? itemData[header]
          : "";
      });
    });


    /* -----------------------------------------------------
       APPEND ITEM ROWS
    ----------------------------------------------------- */

    if (itemRows.length) {
      const startRow = drItemSheet.getLastRow() + 1;

      drItemSheet
        .getRange(
          startRow,
          1,
          itemRows.length,
          itemHeaders.length
        )
        .setValues(itemRows);
    }


    /* -----------------------------------------------------
       ACTIVITY LOG
    ----------------------------------------------------- */

    if (typeof logActivity === "function") {
      logActivity({
        username:
          payload.username ||
          payload.createdBy ||
          "SYSTEM",
        action: "CREATE",
        module: "DELIVERY_RECEIPT",
        recordId: drId,
        recordNumber: drNumber,
        details:
          "Created Delivery Receipt for " + soNumber,
        status: "SUCCESS"
      });
    }

    if (typeof touchSyncVersion === "function") {
      touchSyncVersion();
    }


    /* -----------------------------------------------------
       RESPONSE
    ----------------------------------------------------- */

    const deliveryReceipt = Object.assign(
      {},
      headerData,
      {
        drId: drId,
        drNumber: drNumber,
        soNumber: soNumber,
        dateOfTransfer: dateOfTransfer,
        items: preparedItems.map(function (item) {
          return {
            soItemId: item.soItemId,
            itemNumber: item.itemNumber,
            itemName: item.itemName,
            description: item.description,
            unit: item.unit,
            soQty: item.soQty,
            previouslyDelivered: item.previouslyDelivered,
            pickQty: item.pickQty,
            unitPrice: item.unitPrice,
            drAmount: item.drAmount,
            balance: item.balance,
            remarks: item.remarks
          };
        })
      }
    );

    return {
      success: true,
      message: "Delivery Receipt saved successfully.",
      drId: drId,
      drNumber: drNumber,
      deliveryReceipt: deliveryReceipt
    };

  } finally {
    lock.releaseLock();
  }
}
