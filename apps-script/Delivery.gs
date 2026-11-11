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


/* =====================================================
   MARK DELIVERY RECEIPT AS DELIVERED
   Updates DELIVERY_RECEIPTS and upserts DR_MONITORING.
===================================================== */
function markDeliveryReceiptDelivered(payload) {
  payload = payload || {};
  authorizeRole_(payload, ["ADMIN", "LOGISTICS"]);

  const drId = String(payload.drId || payload.DR_ID || "").trim();
  const drNumber = String(payload.drNumber || payload.DR_NUMBER || "").trim();
  const deliveryDate = String(payload.deliveryDate || payload.DATE_DELIVERED || "").trim();
  const remarks = String(payload.remarks || payload.REMARKS || "").trim();
  if (!drId && !drNumber) throw new Error("Delivery Receipt ID or number is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) throw new Error("A valid Delivery Date is required.");

  const parts = deliveryDate.split("-").map(Number);
  const checkedDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (checkedDate.getUTCFullYear() !== parts[0] || checkedDate.getUTCMonth() !== parts[1] - 1 || checkedDate.getUTCDate() !== parts[2]) throw new Error("Delivery Date is invalid.");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const drSheet = getSheet(CONFIG.SHEETS.DELIVERY_RECEIPTS);
    const monitoringSheet = getSheet("DR_MONITORING");
    const drValues = drSheet.getDataRange().getValues();
    if (drValues.length < 2) throw new Error("Delivery Receipt was not found.");
    const drHeaders = drValues[0].map(function(v) { return String(v).trim(); });
    const drIdCol = drHeaders.indexOf("DR_ID");
    const drNumberCol = drHeaders.indexOf("DR_NUMBER");
    const statusCol = drHeaders.indexOf("STATUS");
    const updatedCol = drHeaders.indexOf("UPDATED_AT");
    if (statusCol < 0) throw new Error("DELIVERY_RECEIPTS is missing STATUS.");

    let drIndex = -1;
    for (let i = 1; i < drValues.length; i++) {
      const rowId = drIdCol >= 0 ? String(drValues[i][drIdCol] || "").trim() : "";
      const rowNumber = drNumberCol >= 0 ? String(drValues[i][drNumberCol] || "").trim() : "";
      if ((drId && rowId === drId) || (!drId && drNumber && rowNumber === drNumber)) { drIndex = i; break; }
    }
    if (drIndex < 0) throw new Error("Delivery Receipt was not found in the database.");
    const drRow = drValues[drIndex];
    const resolvedId = drIdCol >= 0 ? String(drRow[drIdCol] || "").trim() : drId;
    const resolvedNumber = drNumberCol >= 0 ? String(drRow[drNumberCol] || "").trim() : drNumber;
    if (drNumber && resolvedNumber && resolvedNumber !== drNumber) throw new Error("The selected DR number does not match the Delivery Receipt ID.");

    const currentStatus = String(drRow[statusCol] || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (["DELIVERED", "COMPLETED", "FULLY_DELIVERED"].indexOf(currentStatus) >= 0) throw new Error("This Delivery Receipt is already marked as delivered.");
    if (["CANCELLED", "CANCELED", "VOID", "VOIDED"].indexOf(currentStatus) >= 0) throw new Error("A cancelled or voided Delivery Receipt cannot be marked as delivered.");

    const timestamp = formatDateTime(new Date());
    const monitoringValues = monitoringSheet.getDataRange().getValues();
    if (!monitoringValues.length) throw new Error("DR_MONITORING is missing its header row.");
    const monHeaders = monitoringValues[0].map(function(v) { return String(v).trim(); });
    const monIdCol = monHeaders.indexOf("DR_ID");
    const monNumberCol = monHeaders.indexOf("DR_NUMBER");
    if (monIdCol < 0 && monNumberCol < 0) throw new Error("DR_MONITORING is missing DR_ID and DR_NUMBER columns.");

    let monIndex = -1;
    for (let i = 1; i < monitoringValues.length; i++) {
      const rowId = monIdCol >= 0 ? String(monitoringValues[i][monIdCol] || "").trim() : "";
      const rowNumber = monNumberCol >= 0 ? String(monitoringValues[i][monNumberCol] || "").trim() : "";
      if ((resolvedId && rowId === resolvedId) || (!resolvedId && resolvedNumber && rowNumber === resolvedNumber)) { monIndex = i; break; }
    }

    const valueAt = function(header) { const index = drHeaders.indexOf(header); return index >= 0 ? drRow[index] : ""; };
    const monitoringData = {
      DR_MONITORING_ID: "DRMON-" + Utilities.getUuid(),
      DR_ID: resolvedId,
      DR_NUMBER: resolvedNumber,
      SO_ID: valueAt("SO_ID"),
      SO_NUMBER: valueAt("SO_NUMBER"),
      CLIENT_NAME: valueAt("CLIENT_NAME"),
      PROJECT: valueAt("PROJECT"),
      DATE_DELIVERED: deliveryDate,
      STATUS: "DELIVERED",
      REMARKS: remarks,
      CREATED_AT: timestamp,
      UPDATED_AT: timestamp
    };

    if (monIndex >= 0) {
      const monRow = monitoringValues[monIndex];
      monHeaders.forEach(function(header, index) {
        if (["DATE_DELIVERED", "STATUS", "REMARKS", "UPDATED_AT"].indexOf(header) >= 0) monRow[index] = monitoringData[header];
      });
      monitoringSheet.getRange(monIndex + 1, 1, 1, monHeaders.length).setValues([monRow]);
    } else {
      monitoringSheet.appendRow(monHeaders.map(function(header) { return monitoringData[header] !== undefined ? monitoringData[header] : ""; }));
    }

    drRow[statusCol] = "DELIVERED";
    if (updatedCol >= 0) drRow[updatedCol] = timestamp;
    drSheet.getRange(drIndex + 1, 1, 1, drHeaders.length).setValues([drRow]);

    if (typeof logActivity === "function") {
      logActivity({
        username: payload.username || payload.createdBy || "SYSTEM",
        action: "UPDATE",
        module: "DELIVERY_RECEIPT",
        recordId: resolvedId,
        recordNumber: resolvedNumber,
        details: "Marked Delivery Receipt as DELIVERED. Delivery date: " + deliveryDate,
        status: "SUCCESS"
      });
    }
    if (typeof touchSyncVersion === "function") touchSyncVersion();
    return { success: true, message: "Delivery Receipt marked as delivered.", drId: resolvedId, drNumber: resolvedNumber, deliveryDate: deliveryDate, status: "DELIVERED" };
  } finally {
    lock.releaseLock();
  }
}


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

    // Delivery is an operations workflow and must not be blocked by
    // down-payment or collection status. Payment-term validation remains
    // applicable to invoicing/payment workflows, not DR preparation.


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

    // Allocate the SO-level discount proportionally across all item lines.
    // This ensures every partial DR carries only its fair share of the discount.
    const calculatedSOSubtotal = soItems.reduce(function (sum, item) {
      const qty = Number(item.QTY || item.SO_QTY || 0);
      const price = Number(item.UNIT_PRICE ?? item.unitPrice ?? 0);
      return sum + (Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0);
    }, 0);
    const soSubtotal = Number(so.SUBTOTAL) > 0
      ? Number(so.SUBTOTAL)
      : calculatedSOSubtotal;
    const soDiscount = Math.min(
      Math.max(0, Number(so.DISCOUNT || 0)),
      Math.max(0, soSubtotal)
    );
    const discountRate = soSubtotal > 0 ? soDiscount / soSubtotal : 0;

    function roundDRAmount_(value) {
      return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
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


    function _drPreviouslyDelivered(soItemId, itemNumber) {
      let total = 0;
      const targetId = String(soItemId || "").trim();
      const targetNumber = String(itemNumber || "").trim();

      existingDRItems.forEach(function (item) {
        if (_drIsCancelled(item)) return;

        const existingItemId = String(item.SO_ITEM_ID || "").trim();
        const existingItemNumber = String(item.ITEM_NUMBER || "").trim();

        // Prefer the unique SO item ID. When legacy SO rows have no ID,
        // use ITEM_NUMBER so different panel numbers remain independent.
        const sameItem = targetId
          ? existingItemId === targetId
          : (!existingItemId && targetNumber && existingItemNumber === targetNumber);

        if (!sameItem) return;

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

        const status = String(parentDR.STATUS || "").toUpperCase();
        if (status === "CANCELLED") return;

        total += Number(item.PICK_QTY || item.DELIVERED_QTY || 0);
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

      // Resolve the item against the selected SO. Prefer the unique SO_ITEM_ID.
      // If the browser is holding an older/legacy item ID, safely fall back to
      // ITEM_NUMBER only when that number identifies exactly one row in this SO.
      let soItem = soItemId
        ? soItems.find(function (item) {
            return String(item.SO_ITEM_ID || "").trim() === soItemId;
          })
        : null;

      if (!soItem && itemNumber) {
        const matchingNumberItems = soItems.filter(function (item) {
          return String(item.ITEM_NUMBER || "").trim() === itemNumber;
        });

        if (matchingNumberItems.length === 1) {
          soItem = matchingNumberItems[0];
        } else if (matchingNumberItems.length > 1) {
          throw new Error(
            "Ambiguous Item Number " + itemNumber +
            " in Sales Order " + soNumber +
            ". Please ensure each SO item has a unique SO_ITEM_ID."
          );
        }
      }

      if (!soItem) {
        throw new Error(
          "Unable to match item " + (itemNumber || soItemId || "(unknown)") +
          " to Sales Order " + soNumber +
          ". Please reload the Sales Order items and try again."
        );
      }

      const resolvedItemId = String(
        soItem.SO_ITEM_ID || ""
      ).trim();

      const resolvedItemNumber = String(
        soItem.ITEM_NUMBER || itemNumber || ""
      ).trim();

      // Some legacy SO item rows do not have SO_ITEM_ID. Do not treat
      // all blank IDs as the same item: use the distinct item number.
      const itemIdentity = resolvedItemId
        ? "ID:" + resolvedItemId
        : "ITEM:" + resolvedItemNumber;

      if (!resolvedItemId && !resolvedItemNumber) {
        throw new Error("Unable to identify a Sales Order item. Please check its Item Number.");
      }

      if (seenItemIds[itemIdentity]) {
        throw new Error(
          "The same Sales Order item was selected more than once: " +
          resolvedItemNumber
        );
      }

      seenItemIds[itemIdentity] = true;

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
        _drPreviouslyDelivered(resolvedItemId, resolvedItemNumber);

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

const originalAmount = roundDRAmount_(pickQty * unitPrice);
const drAmount = roundDRAmount_(originalAmount * (1 - discountRate));
const discountAmount = roundDRAmount_(originalAmount - drAmount);
const netUnitPrice = unitPrice * (1 - discountRate);


      
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
        netUnitPrice: netUnitPrice,
        discountAmount: discountAmount,
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
      SO_SUBTOTAL: soSubtotal,
      SO_DISCOUNT: soDiscount,
      DR_DISCOUNT_TOTAL: roundDRAmount_(preparedItems.reduce(function (sum, item) {
        return sum + item.discountAmount;
      }, 0)),
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
        UNIT_PRICE: item.netUnitPrice,
        ORIGINAL_UNIT_PRICE: item.unitPrice,
        NET_UNIT_PRICE: item.netUnitPrice,
        DISCOUNT_AMOUNT: item.discountAmount,
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
            unitPrice: item.netUnitPrice,
            originalUnitPrice: item.unitPrice,
            netUnitPrice: item.netUnitPrice,
            discountAmount: item.discountAmount,
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
