/* =========================================================
   LOGIS-TECH SYSTEM — INVOICES API
   File: Invoices.gs
   Uses existing CONFIG, getSheet, getAllRecords, findRecord,
   generateId, generateDocumentNumber, formatDateTime,
   logActivity and touchSyncVersion helpers.
========================================================= */

function getInvoices(payload) {
  payload = payload || {};
  const soNumber = String(payload.soNumber || payload.SO_NUMBER || "").trim();
  const invoiceNo = String(payload.invoiceNo || payload.INVOICE_NO || "").trim();
  let records = getAllRecords(CONFIG.SHEETS.INVOICES);
  if (soNumber) records = records.filter(r => String(r.SO_NUMBER || "") === soNumber);
  if (invoiceNo) records = records.filter(r => String(r.INVOICE_NO || "") === invoiceNo);
  const items = getAllRecords(CONFIG.SHEETS.INVOICE_ITEMS);
  records = records.map(r => {
    const child = items.filter(i =>
      (r.INVOICE_ID && String(i.INVOICE_ID) === String(r.INVOICE_ID)) ||
      (r.INVOICE_NO && String(i.INVOICE_NO) === String(r.INVOICE_NO))
    );
    r.ITEMS = child;
    r.items = child;
    return r;
  });
  return { success: true, invoices: records, records: records, count: records.length };
}

function getSalesOrderItems(payload) {
  payload = payload || {};
  const soNumber = String(payload.soNumber || payload.SO_NUMBER || "").trim();
  const soId = String(payload.soId || payload.SO_ID || "").trim();
  if (!soNumber && !soId) {
    return { success: false, message: "Sales Order Number or ID is required." };
  }

  const so = soNumber
    ? findRecord(CONFIG.SHEETS.SALES_ORDERS, "SO_NUMBER", soNumber)
    : findRecord(CONFIG.SHEETS.SALES_ORDERS, "SO_ID", soId);
  const targetSoId = soId || (so ? String(so.SO_ID || "") : "");

  // Some deployed Config.gs versions do not define SO_ITEMS in CONFIG.SHEETS.
  // The database tab is named SO_ITEMS, so use that as a safe fallback.
  const soItemsSheetName =
    (CONFIG.SHEETS && (CONFIG.SHEETS.SO_ITEMS || CONFIG.SHEETS.SALES_ORDER_ITEMS)) ||
    "SO_ITEMS";
  const items = getAllRecords(soItemsSheetName).filter(item => {
    const itemSoNumber = String(item.SO_NUMBER || item.soNumber || "").trim();
    const itemSoId = String(item.SO_ID || item.soId || "").trim();
    return (soNumber && itemSoNumber === soNumber) ||
      (targetSoId && itemSoId === targetSoId);
  });

  return { success: true, items: items, salesOrderItems: items, count: items.length };
}

function getInvoice(payload) {
  payload = payload || {};
  const no = String(payload.invoiceNo || payload.INVOICE_NO || "").trim();
  const id = String(payload.invoiceId || payload.INVOICE_ID || "").trim();
  if (!no && !id) return { success: false, message: "Invoice number or ID is required." };
  const found = getAllRecords(CONFIG.SHEETS.INVOICES).find(r =>
    (no && String(r.INVOICE_NO || "") === no) ||
    (id && String(r.INVOICE_ID || "") === id)
  );
  if (!found) return { success: false, message: "Invoice not found." };
  found.ITEMS = getAllRecords(CONFIG.SHEETS.INVOICE_ITEMS).filter(i =>
    String(i.INVOICE_ID || "") === String(found.INVOICE_ID || "") ||
    String(i.INVOICE_NO || "") === String(found.INVOICE_NO || "")
  );
  return { success: true, invoice: found };
}

function createInvoice(payload) {
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const soNumber = String(payload.soNumber || payload.soNo || payload.SO_NUMBER || "").trim();
    const invoiceType = String(payload.invoiceType || payload.INVOICE_TYPE || "DELIVERY_RECEIPT").trim().toUpperCase();
    const rawDrNumber = String(payload.drNumber || payload.drNo || payload.DR_NUMBER || "").trim();
    const drNumbers = rawDrNumber.split(",").map(value => value.trim()).filter(Boolean);
    if (!soNumber) throw new Error("Sales Order Number is required.");
    if (invoiceType === "DELIVERY_RECEIPT" && !drNumbers.length) {
      throw new Error("Select at least one Delivery Receipt for a DR Invoice.");
    }
    const requestedItems = Array.isArray(payload.items) ? payload.items : [];
    if (!requestedItems.length) throw new Error("At least one invoice item is required.");

    const so = findRecord(CONFIG.SHEETS.SALES_ORDERS, "SO_NUMBER", soNumber);
    if (!so) throw new Error("Sales Order not found: " + soNumber);
    if (String(so.STATUS || "").toUpperCase() === "CANCELLED") throw new Error("Cannot invoice a cancelled Sales Order.");

    let dpPayment = null;
    let dpPaymentNo = "";
    let dpPaymentId = "";
    let dpPaymentAmount = 0;
    if (invoiceType === "DOWN_PAYMENT") {
      dpPaymentNo = String(payload.dpPaymentNo || payload.DP_PAYMENT_NO || "").trim();
      dpPaymentId = String(payload.dpPaymentId || payload.DP_PAYMENT_ID || "").trim();
      if (!dpPaymentNo && !dpPaymentId) {
        throw new Error("Select the saved Payment record for this Down Payment Invoice.");
      }
      const paymentRecords = getAllRecords(CONFIG.SHEETS.PAYMENTS);
      dpPayment = paymentRecords.find(p =>
        (dpPaymentNo && String(p.PAYMENT_NO || "").trim() === dpPaymentNo) ||
        (dpPaymentId && String(p.PAYMENT_ID || "").trim() === dpPaymentId)
      ) || null;
      if (!dpPayment) throw new Error("The selected Payment record could not be found.");
      if (String(dpPayment.SO_NUMBER || "").trim() !== soNumber) {
        throw new Error("The selected Payment record does not belong to this Sales Order.");
      }
      const paymentStatus = String(dpPayment.PAYMENT_STATUS || "").trim().toUpperCase();
      if (!["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED"].includes(paymentStatus)) {
        throw new Error("Only confirmed/received Payment records can be invoiced as Down Payment.");
      }
      dpPaymentNo = String(dpPayment.PAYMENT_NO || dpPaymentNo).trim();
      dpPaymentId = String(dpPayment.PAYMENT_ID || dpPaymentId).trim();
      dpPaymentAmount = Number(dpPayment.SO_APPLIED_AMOUNT ?? dpPayment.CURRENT_PAYMENT ?? 0) || 0;
      if (dpPaymentAmount <= 0) throw new Error("The selected Payment record has no amount applied to this Sales Order.");

      const existingDPInvoice = getAllRecords(CONFIG.SHEETS.INVOICES).find(invoice =>
        String(invoice.DP_PAYMENT_NO || "").trim() === dpPaymentNo &&
        !["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(String(invoice.STATUS || "").trim().toUpperCase())
      );
      if (existingDPInvoice) {
        throw new Error("Payment " + dpPaymentNo + " has already been used in Invoice " + String(existingDPInvoice.INVOICE_NO || "") + ".");
      }

      const submittedAmount = Number(payload.dpPaymentAmount ?? payload.DP_PAYMENT_AMOUNT ?? 0) || 0;
      if (Math.abs(submittedAmount - dpPaymentAmount) > 0.01) {
        throw new Error("The Down Payment amount does not match the selected Payment record. Refresh Payment records and try again.");
      }
      if (requestedItems.length !== 1) {
        throw new Error("A Down Payment Invoice must contain only its selected Payment record amount.");
      }
      const lineQty = Number(requestedItems[0].qtyInvoice ?? requestedItems[0].QTY_INVOICE ?? 0);
      const linePrice = Number(requestedItems[0].unitPrice ?? requestedItems[0].UNIT_PRICE ?? 0);
      if (Math.abs(lineQty - 1) > 0.0001 || Math.abs(linePrice - dpPaymentAmount) > 0.01) {
        throw new Error("The Down Payment invoice line must match the selected Payment record amount.");
      }
    }

    // Non-DR invoice types (Down Payment, Full Payment, Advance) do not require a DR.
    const drRecords = invoiceType === "DELIVERY_RECEIPT"
      ? drNumbers.map(number => {
          const record = findRecord(CONFIG.SHEETS.DELIVERY_RECEIPTS, "DR_NUMBER", number);
          if (!record) throw new Error("Delivery Receipt not found: " + number);
          if (String(record.SO_NUMBER || "") !== soNumber) {
            throw new Error("The selected DR does not belong to this Sales Order: " + number);
          }
          if (String(record.STATUS || "").toUpperCase() === "CANCELLED") {
            throw new Error("Cannot invoice a cancelled Delivery Receipt: " + number);
          }
          return record;
        })
      : [];
    const drNumber = drNumbers.join(", ");
    const drId = drRecords.map(record => String(record.DR_ID || "")).filter(Boolean).join(", ");

    // A Down Payment invoice is tied to the exact confirmed Payment record selected above.
    // Do not require the customer's entire contractual DP threshold to be collected first;
    // invoice the actual recorded/applied amount for this specific transaction.
    if (invoiceType !== "DOWN_PAYMENT") {
      _finValidateInvoicePaymentRequirement_(so);
    }

    const invoiceSheet = getSheet(CONFIG.SHEETS.INVOICES);
    const itemSheet = getSheet(CONFIG.SHEETS.INVOICE_ITEMS);
    const now = new Date();
    const timestamp = formatDateTime(now);
    const invoiceId = generateId("INV");
    let invoiceNo = String(payload.invoiceNo || payload.invoiceNo || payload.INVOICE_NO || "").trim();
    if (!invoiceNo) invoiceNo = generateDocumentNumber(CONFIG.PREFIX.INV, CONFIG.SHEETS.INVOICES, "INVOICE_NO");
    if (getAllRecords(CONFIG.SHEETS.INVOICES).some(r => String(r.INVOICE_NO || "") === invoiceNo)) {
      throw new Error("Invoice number already exists. Refresh the invoice list and try again.");
    }

    const prepared = requestedItems.map((it, idx) => {
      const qty = Number(it.qtyInvoice ?? it.QTY_INVOICE ?? it.qty ?? it.QTY ?? 0);
      const price = Number(it.unitPrice ?? it.UNIT_PRICE ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) throw new Error("Invalid invoice quantity on item " + (idx + 1) + ".");
      if (!Number.isFinite(price) || price < 0) throw new Error("Invalid unit price on item " + (idx + 1) + ".");
      return {
        INVOICE_ITEM_ID: generateId("INVITEM"), INVOICE_ID: invoiceId, INVOICE_NO: invoiceNo,
        ITEM_NO: String(it.itemNo || it.ITEM_NO || (idx + 1)),
        DESCRIPTION: String(it.description || it.DESCRIPTION || it.itemName || it.ITEM_NAME || ""),
        QTY_INVOICE: qty, UNIT: String(it.unit || it.UNIT || ""),
        UNIT_PRICE: price, TOTAL_AMOUNT: Math.round(qty * price * 100) / 100, CREATED_AT: timestamp
      };
    });
    const totalSales = Math.round(prepared.reduce((s, i) => s + i.TOTAL_AMOUNT, 0) * 100) / 100;
    const netOfVatInput = Number(payload.netOfVat ?? payload.NET_OF_VAT);
    const netOfVat = Number.isFinite(netOfVatInput) && netOfVatInput >= 0 ? netOfVatInput : Math.round((totalSales / 1.12) * 100) / 100;
    const vatInput = Number(payload.vat ?? payload.VAT);
    const vat = Number.isFinite(vatInput) && vatInput >= 0 ? vatInput : Math.round((totalSales - netOfVat) * 100) / 100;
    const amountDueInput = Number(payload.amountDue ?? payload.AMOUNT_DUE);
    const amountDue = Number.isFinite(amountDueInput) && amountDueInput >= 0 ? amountDueInput : totalSales;
    const ewtRate = Math.max(0, Number(payload.ewtRate ?? payload.EWT_RATE ?? 0) || 0);
    const ewtAmountInput = Number(payload.ewtAmount ?? payload.EWT_AMOUNT);
    const ewtAmount = Number.isFinite(ewtAmountInput) && ewtAmountInput >= 0 ? ewtAmountInput : Math.round(netOfVat * ewtRate / 100 * 100) / 100;
    const finalInput = Number(payload.finalAmountDue ?? payload.FINAL_AMOUNT_DUE);
    const finalAmountDue = Number.isFinite(finalInput) && finalInput >= 0 ? finalInput : Math.max(0, amountDue - ewtAmount);

    const header = {
      INVOICE_ID: invoiceId, INVOICE_NO: invoiceNo,
      INVOICE_DATE: payload.invoiceDate || payload.INVOICE_DATE || now,
      SI_NO: String(payload.siNo || payload.SI_NO || ""),
      SO_ID: so.SO_ID || "", SO_NUMBER: soNumber, DR_ID: drId, DR_NUMBER: drNumber,
      INVOICE_TYPE: invoiceType,
      DP_PAYMENT_ID: dpPaymentId,
      DP_PAYMENT_NO: dpPaymentNo,
      DP_PAYMENT_AMOUNT: dpPaymentAmount,
      PO_NUMBER: String(payload.poNo || payload.PO_NUMBER || so.PO_NUMBER || ""),
      TERMS: String(payload.terms || payload.TERMS || so.TERMS || so.PAYMENT_TERMS || ""),
      SALES_ENGINEER: String(payload.se || payload.salesEngineer || payload.SALES_ENGINEER || so.SALES_ENGINEER || ""),
      CUSTOMER_ID: so.CUSTOMER_ID || "", CLIENT_NAME: String(payload.clientName || payload.CLIENT_NAME || so.CLIENT_NAME || ""),
      BILLING_ADDRESS: String(payload.billingAddress || payload.BILLING_ADDRESS || so.BILLING_ADDRESS || ""),
      TIN: String(payload.tinNo || payload.TIN || so.TIN || ""),
      PROJECT: String(payload.project || payload.PROJECT || so.PROJECT || ""),
      EWT_TYPE: String(payload.ewtType || payload.EWT_TYPE || ""), EWT_RATE: ewtRate, EWT_AMOUNT: ewtAmount,
      TOTAL_SALES: totalSales, NET_OF_VAT: netOfVat, VAT: vat, AMOUNT_DUE: amountDue,
      FINAL_AMOUNT_DUE: finalAmountDue, STATUS: String(payload.status || payload.STATUS || "DRAFT").toUpperCase(),
      CREATED_BY: String(payload.createdBy || payload.username || payload.CREATED_BY || ""),
      CREATED_AT: timestamp, UPDATED_AT: timestamp
    };
    const invoiceHeaders = _finGetHeaders_(invoiceSheet);
    ["DP_PAYMENT_ID", "DP_PAYMENT_NO", "DP_PAYMENT_AMOUNT"].forEach(function(field) {
      if (invoiceHeaders.indexOf(field) === -1) {
        invoiceSheet.getRange(1, invoiceSheet.getLastColumn() + 1).setValue(field);
        invoiceHeaders.push(field);
      }
    });
    _finAppendObjectByHeaders_(invoiceSheet, header);
    const itemHeaders = _finGetHeaders_(itemSheet);
    const start = itemSheet.getLastRow() + 1;
    itemSheet.getRange(start, 1, prepared.length, itemHeaders.length).setValues(
      prepared.map(item => itemHeaders.map(h => item[h] === undefined ? "" : item[h]))
    );
    if (typeof logActivity === "function") logActivity({
      username: header.CREATED_BY || "SYSTEM", action: "CREATE", module: "INVOICE",
      recordId: invoiceId, recordNumber: invoiceNo, details: "Created invoice for " + soNumber + " / " + drNumber, status: "SUCCESS"
    });
    if (typeof touchSyncVersion === "function") touchSyncVersion();
    return { success: true, message: "Invoice saved to the database.", invoice: Object.assign({}, header, { ITEMS: prepared }) };
  } finally {
    lock.releaseLock();
  }
}



/* =========================================================
   UPDATE EXISTING INVOICE
   Updates invoice header fields and, when supplied, items.
========================================================= */

function updateInvoice(payload) {
  payload = payload || {};

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const invoiceId = String(
      payload.invoiceId || payload.INVOICE_ID || ""
    ).trim();

    const invoiceNo = String(
      payload.invoiceNo || payload.INVOICE_NO || ""
    ).trim();

    if (!invoiceId && !invoiceNo) {
      throw new Error("Invoice ID or Invoice Number is required.");
    }

    const invoiceSheet = getSheet(CONFIG.SHEETS.INVOICES);
    const itemSheet = getSheet(CONFIG.SHEETS.INVOICE_ITEMS);

    const invoiceHeaders = _finGetHeaders_(invoiceSheet);
    const itemHeaders = _finGetHeaders_(itemSheet);

    const records = getAllRecords(CONFIG.SHEETS.INVOICES);
    const existing = records.find(r =>
      (invoiceId && String(r.INVOICE_ID || "") === invoiceId) ||
      (invoiceNo && String(r.INVOICE_NO || "") === invoiceNo)
    );

    if (!existing) {
      throw new Error("Invoice not found.");
    }

    if (String(existing.STATUS || "").toUpperCase() === "CANCELLED") {
      throw new Error("A cancelled invoice cannot be updated.");
    }

    const id = String(existing.INVOICE_ID || "");
    const number = String(existing.INVOICE_NO || "");

    const headerRow = records.findIndex(r =>
      String(r.INVOICE_ID || "") === id
    ) + 2;

    if (headerRow < 2) {
      throw new Error("Could not locate the invoice row.");
    }

    const now = formatDateTime(new Date());

    // Only update explicitly supplied editable fields.
    const editableFields = {
      INVOICE_DATE: ["invoiceDate", "INVOICE_DATE"],
      SI_NO: ["siNo", "SI_NO"],
      PO_NUMBER: ["poNo", "PO_NUMBER"],
      TERMS: ["terms", "TERMS"],
      CLIENT_NAME: ["clientName", "CLIENT_NAME"],
      BILLING_ADDRESS: ["billingAddress", "BILLING_ADDRESS"],
      TIN: ["tinNo", "TIN"],
      PROJECT: ["project", "PROJECT"],
      SALES_ENGINEER: ["se", "salesEngineer", "SALES_ENGINEER"],
      EWT_TYPE: ["ewtType", "EWT_TYPE"]
    };

    const currentRow = invoiceSheet
      .getRange(headerRow, 1, 1, invoiceHeaders.length)
      .getValues()[0];

    Object.keys(editableFields).forEach(field => {
      const key = editableFields[field].find(k =>
        Object.prototype.hasOwnProperty.call(payload, k)
      );

      if (!key) return;

      const col = invoiceHeaders.indexOf(field);
      if (col >= 0) currentRow[col] = payload[key];
    });

    const itemsProvided = Array.isArray(payload.items);

    if (itemsProvided) {
      if (!payload.items.length) {
        throw new Error("An invoice must contain at least one item.");
      }

      const prepared = payload.items.map((item, index) => {
        const qty = Number(
          item.qtyInvoice ?? item.QTY_INVOICE ?? item.qty ?? item.QTY ?? 0
        );
        const price = Number(
          item.unitPrice ?? item.UNIT_PRICE ?? item.unitAmount ?? 0
        );

        if (!Number.isFinite(qty) || qty <= 0) {
          throw new Error("Invalid quantity on item " + (index + 1) + ".");
        }

        if (!Number.isFinite(price) || price < 0) {
          throw new Error("Invalid price on item " + (index + 1) + ".");
        }

        const row = {
          INVOICE_ITEM_ID: generateId("INVITEM"),
          INVOICE_ID: id,
          INVOICE_NO: number,
          ITEM_NO: String(item.itemNo || item.ITEM_NO || (index + 1)),
          DESCRIPTION: String(
            item.description || item.DESCRIPTION ||
            item.itemName || item.ITEM_NAME || ""
          ),
          QTY_INVOICE: qty,
          UNIT: String(item.unit || item.UNIT || ""),
          UNIT_PRICE: price,
          TOTAL_AMOUNT: _finMoney_(qty * price),
          CREATED_AT: now
        };

        return row;
      });

      const totalSales = _finMoney_(
        prepared.reduce((sum, item) => sum + item.TOTAL_AMOUNT, 0)
      );

      const netOfVat = _finMoney_(totalSales / 1.12);
      const vat = _finMoney_(totalSales - netOfVat);
      const ewtType = String(
        payload.ewtType || payload.EWT_TYPE ||
        existing.EWT_TYPE || ""
      ).toUpperCase();

      const ewtRate = ewtType === "SUPPLY" ? 1 :
        ewtType === "EWORKS" ? 2 : 0;

      const ewtAmount = _finMoney_(totalSales * ewtRate / 100);
      const amountDue = totalSales;
      const finalAmountDue = _finMoney_(amountDue - ewtAmount);

      const calculated = {
        TOTAL_SALES: totalSales,
        NET_OF_VAT: netOfVat,
        VAT: vat,
        AMOUNT_DUE: amountDue,
        EWT_RATE: ewtRate,
        EWT_AMOUNT: ewtAmount,
        FINAL_AMOUNT_DUE: finalAmountDue
      };

      Object.keys(calculated).forEach(field => {
        const col = invoiceHeaders.indexOf(field);
        if (col >= 0) currentRow[col] = calculated[field];
      });

      // Replace this invoice's existing item rows only.
      const itemRecords = getAllRecords(CONFIG.SHEETS.INVOICE_ITEMS);

      for (let i = itemRecords.length - 1; i >= 0; i--) {
        const item = itemRecords[i];

        if (
          String(item.INVOICE_ID || "") === id ||
          (!item.INVOICE_ID &&
            String(item.INVOICE_NO || "") === number)
        ) {
          // Data records begin at row 2.
          const rowNumber = i + 2;
          itemSheet.deleteRow(rowNumber);
        }
      }

      const startRow = itemSheet.getLastRow() + 1;
      itemSheet.getRange(
        startRow, 1, prepared.length, itemHeaders.length
      ).setValues(
        prepared.map(item =>
          itemHeaders.map(header =>
            item[header] === undefined ? "" : item[header]
          )
        )
      );
    }

    const updatedAtCol = invoiceHeaders.indexOf("UPDATED_AT");
    if (updatedAtCol >= 0) currentRow[updatedAtCol] = now;

    invoiceSheet
      .getRange(headerRow, 1, 1, invoiceHeaders.length)
      .setValues([currentRow]);

    if (typeof logActivity === "function") {
      logActivity({
        username: "SYSTEM",
        action: "UPDATE",
        module: "INVOICE",
        recordId: id,
        recordNumber: number,
        details: "Updated invoice " + number,
        status: "SUCCESS"
      });
    }

    if (typeof touchSyncVersion === "function") touchSyncVersion();

    return {
      success: true,
      message: "Invoice updated successfully.",
      invoiceId: id,
      invoiceNo: number
    };

  } finally {
    lock.releaseLock();
  }
}


/* =========================================================
   CANCEL EXISTING INVOICE
   Keeps the record in the database.
========================================================= */

function cancelInvoice(payload) {
  payload = payload || {};

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const invoiceId = String(
      payload.invoiceId || payload.INVOICE_ID || ""
    ).trim();

    const invoiceNo = String(
      payload.invoiceNo || payload.INVOICE_NO || ""
    ).trim();

    if (!invoiceId && !invoiceNo) {
      throw new Error("Invoice ID or Invoice Number is required.");
    }

    const records = getAllRecords(CONFIG.SHEETS.INVOICES);
    const existing = records.find(r =>
      (invoiceId && String(r.INVOICE_ID || "") === invoiceId) ||
      (invoiceNo && String(r.INVOICE_NO || "") === invoiceNo)
    );

    if (!existing) throw new Error("Invoice not found.");

    if (String(existing.STATUS || "").toUpperCase() === "CANCELLED") {
      throw new Error("This invoice is already cancelled.");
    }

    const sheet = getSheet(CONFIG.SHEETS.INVOICES);
    const headers = _finGetHeaders_(sheet);
    const rowNumber = records.findIndex(r =>
      String(r.INVOICE_ID || "") === String(existing.INVOICE_ID || "")
    ) + 2;

    if (rowNumber < 2) throw new Error("Could not locate invoice row.");

    const statusCol = headers.indexOf("STATUS");
    const updatedCol = headers.indexOf("UPDATED_AT");

    if (statusCol < 0) {
      throw new Error("The INVOICES sheet is missing the STATUS column.");
    }

    sheet.getRange(rowNumber, statusCol + 1).setValue("CANCELLED");

    if (updatedCol >= 0) {
      sheet.getRange(rowNumber, updatedCol + 1)
        .setValue(formatDateTime(new Date()));
    }

    if (typeof logActivity === "function") {
      logActivity({
        username: "SYSTEM",
        action: "CANCEL",
        module: "INVOICE",
        recordId: existing.INVOICE_ID || "",
        recordNumber: existing.INVOICE_NO || "",
        details: "Cancelled invoice " + (existing.INVOICE_NO || ""),
        status: "SUCCESS"
      });
    }

    if (typeof touchSyncVersion === "function") touchSyncVersion();

    return {
      success: true,
      message: "Invoice cancelled successfully.",
      invoiceId: existing.INVOICE_ID || "",
      invoiceNo: existing.INVOICE_NO || "",
      status: "CANCELLED"
    };

  } finally {
    lock.releaseLock();
  }
}



/* RELEASE INVOICES — records destination, date and releasing user. */
function releaseInvoices(payload) {
  payload = payload || {};
  const numbers = Array.isArray(payload.invoiceNumbers)
    ? [...new Set(payload.invoiceNumbers.map(v => String(v || "").trim()).filter(Boolean))]
    : [];
  const destination = String(payload.destination || "").trim().toUpperCase();
  const releaseDate = String(payload.releaseDate || "").trim();
  if (!numbers.length) throw new Error("Select at least one invoice.");
  if (!["HEAD OFFICE - FOR COUNTER", "HEAD OFFICE – FOR COUNTER", "LOGISTICS"].includes(destination)) {
    throw new Error("Choose a valid release destination.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) throw new Error("A valid release date is required.");
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet(CONFIG.SHEETS.INVOICES);
    let headers = _finGetHeaders_(sheet);
    ["RELEASE_STATUS", "RELEASE_DESTINATION", "RELEASE_DATE", "RELEASED_AT", "RELEASED_BY"].forEach(h => {
      if (headers.indexOf(h) < 0) {
        sheet.getRange(1, headers.length + 1).setValue(h);
        headers.push(h);
      }
    });
    const records = getAllRecords(CONFIG.SHEETS.INVOICES);
    const releasedBy = String(payload.releasedBy || payload.username || "SYSTEM").trim();
    const now = formatDateTime(new Date());
    const results = [];
    numbers.forEach(number => {
      const record = records.find(r => String(r.INVOICE_NO || "").trim() === number);
      if (!record) throw new Error("Invoice not found: " + number);
      if (String(record.STATUS || "").toUpperCase() === "CANCELLED") throw new Error("Cannot release cancelled invoice: " + number);
      if (String(record.RELEASE_STATUS || "").toUpperCase() === "RELEASED") throw new Error("Invoice already released: " + number);
      const row = records.findIndex(r => String(r.INVOICE_NO || "").trim() === number) + 2;
      const values = {
        RELEASE_STATUS: "RELEASED",
        RELEASE_DESTINATION: destination,
        RELEASE_DATE: releaseDate,
        RELEASED_AT: now,
        RELEASED_BY: releasedBy
      };
      Object.keys(values).forEach(key => sheet.getRange(row, headers.indexOf(key) + 1).setValue(values[key]));
      results.push(number);
    });
    if (typeof logActivity === "function") logActivity({ username: releasedBy, action: "RELEASE", module: "INVOICE", recordNumber: results.join(", "), details: "Released " + results.length + " invoice(s) to " + destination + " dated " + releaseDate, status: "SUCCESS" });
    if (typeof touchSyncVersion === "function") touchSyncVersion();
    return { success: true, released: results, destination: destination, releaseDate: releaseDate };
  } finally { lock.releaseLock(); }
}

/* Shared finance helpers. Prefix _fin avoids collisions with existing project functions. */
function _finGetHeaders_(sheet) {
  const n = sheet.getLastColumn();
  if (!n) throw new Error(sheet.getName() + " is missing its header row.");
  const headers = sheet.getRange(1, 1, 1, n).getDisplayValues()[0].map(v => String(v).trim());
  if (!headers[0]) throw new Error(sheet.getName() + " is missing its header row.");
  return headers;
}
function _finAppendObjectByHeaders_(sheet, data) {
  const headers = _finGetHeaders_(sheet);
  sheet.appendRow(headers.map(h => data[h] === undefined ? "" : data[h]));
}
function _finMoney_(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
function _finTerms_(so) {
  return String(so.TERMS || so.PAYMENT_TERMS || so.paymentTerms || "").trim().toUpperCase();
}
function _finSoTotal_(so) {
  return _finMoney_(so.GRAND_TOTAL ?? so.SO_TOTAL ?? so.TOTAL_AMOUNT ?? so.AMOUNT_DUE ?? so.TOTAL_SALES ?? 0);
}
function _finPaidForSO_(soNumber) {
  return getAllRecords(CONFIG.SHEETS.PAYMENTS)
    .filter(p =>
      String(p.SO_NUMBER || "") === String(soNumber) &&
      ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED"]
        .includes(String(p.PAYMENT_STATUS || "").trim().toUpperCase())
    )
    .reduce((sum, p) => {
      // New records: count only the amount applied to this SO.
      // Legacy records: fall back to CURRENT_PAYMENT.
      const appliedAmount =
        p.SO_APPLIED_AMOUNT !== "" &&
        p.SO_APPLIED_AMOUNT !== undefined &&
        p.SO_APPLIED_AMOUNT !== null
          ? _finMoney_(p.SO_APPLIED_AMOUNT)
          : _finMoney_(p.CURRENT_PAYMENT);

      return sum + appliedAmount;
    }, 0);
}
function _finRequiredDP_(so) {
  const total = _finSoTotal_(so);
  const terms = _finTerms_(so);
  if (/50\s*%|50\s*PERCENT|HALF|DP/i.test(terms)) return Math.round(total * 0.5 * 100) / 100;
  const explicit = Number(so.REQUIRED_DP ?? so.REQUIRED_DP_AMOUNT ?? so.DP_AMOUNT ?? 0);
  if (Number.isFinite(explicit) && explicit > 0) return Math.min(total, _finMoney_(explicit));
  return 0;
}
function _finIsFullAdvance_(so) {
  const t = _finTerms_(so);
  return /100\s*%\s*(ADVANCE|DP|DOWN)|FULL\s*(ADVANCE|PAYMENT)|FULLY\s*ADVANCE|ADVANCE\s*PAYMENT|100\s*PERCENT/i.test(t);
}
function _finValidateInvoicePaymentRequirement_(so) {
  const terms = _finTerms_(so);
  const paid = _finPaidForSO_(so.SO_NUMBER);
  const total = _finSoTotal_(so);
  if (_finIsFullAdvance_(so) && paid + 0.005 < total) {
    throw new Error("Invoice blocked: full advance payment is required for this Sales Order. Paid: " + paid.toFixed(2) + "; required: " + total.toFixed(2) + ".");
  }
  const dp = _finRequiredDP_(so);
  if (dp > 0 && !_finIsFullAdvance_(so) && paid + 0.005 < dp) {
    throw new Error("Invoice blocked: required DP has not been recorded. Paid: " + paid.toFixed(2) + "; required DP: " + dp.toFixed(2) + ".");
  }
}


/* =========================================================
   PENDING INVOICE QUEUE
   Returns eligible, not-yet-invoiced Full Payment, Down Payment
   and Delivery Receipt transactions from the shared Sheets DB.
========================================================= */
function getPendingInvoiceQueue(payload) {
  payload = payload || {};
  const validPaymentStatuses = ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED"];
  const activeInvoices = getAllRecords(CONFIG.SHEETS.INVOICES).filter(invoice =>
    !["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(
      String(invoice.STATUS || "").trim().toUpperCase()
    )
  );
  const salesOrders = getAllRecords(CONFIG.SHEETS.SALES_ORDERS).filter(so =>
    String(so.SO_NUMBER || "").trim() &&
    !["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(String(so.STATUS || "").trim().toUpperCase())
  );
  const payments = getAllRecords(CONFIG.SHEETS.PAYMENTS).filter(payment =>
    validPaymentStatuses.includes(String(payment.PAYMENT_STATUS || "").trim().toUpperCase())
  );
  const deliveryReceipts = getAllRecords(CONFIG.SHEETS.DELIVERY_RECEIPTS).filter(dr =>
    String(dr.DR_NUMBER || "").trim() &&
    !["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(String(dr.STATUS || "").trim().toUpperCase())
  );

  const invoicedDPIds = new Set();
  const invoicedDPNumbers = new Set();
  const invoicedDRNumbers = new Set();
  const invoicedFullPaymentSOs = new Set();

  activeInvoices.forEach(invoice => {
    const type = String(invoice.INVOICE_TYPE || "").trim().toUpperCase();
    const soNo = String(invoice.SO_NUMBER || "").trim();
    if (type === "FULL_PAYMENT" && soNo) invoicedFullPaymentSOs.add(soNo);

    if (type === "DOWN_PAYMENT") {
      const paymentId = String(invoice.DP_PAYMENT_ID || "").trim().toLowerCase();
      const paymentNo = String(invoice.DP_PAYMENT_NO || "").trim().toLowerCase();
      if (paymentId) invoicedDPIds.add(paymentId);
      if (paymentNo) invoicedDPNumbers.add(paymentNo);
    }

    if (type === "DELIVERY_RECEIPT" || (!type && invoice.DR_NUMBER)) {
      String(invoice.DR_NUMBER || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean)
        .forEach(number => invoicedDRNumbers.add(number));
    }
  });

  const paidBySO = new Map();
  payments.forEach(payment => {
    const soNo = String(payment.SO_NUMBER || "").trim();
    const applied = _finMoney_(payment.SO_APPLIED_AMOUNT !== "" && payment.SO_APPLIED_AMOUNT !== undefined && payment.SO_APPLIED_AMOUNT !== null
      ? payment.SO_APPLIED_AMOUNT : payment.CURRENT_PAYMENT);
    if (soNo && applied > 0) paidBySO.set(soNo, (paidBySO.get(soNo) || 0) + applied);
  });

  const fullPayments = [];
  salesOrders.forEach(so => {
    const soNo = String(so.SO_NUMBER || "").trim();
    const total = _finSoTotal_(so);
    const paid = _finMoney_(paidBySO.get(soNo) || 0);
    if (!soNo || total <= 0 || invoicedFullPaymentSOs.has(soNo) || paid + 0.005 < total) return;
    fullPayments.push({
      referenceNo: soNo, soNumber: soNo,
      clientName: String(so.CLIENT_NAME || ""), project: String(so.PROJECT || ""),
      date: so.DATE_CREATION || so.SO_DATE || so.DATE || "",
      amount: total, paidAmount: paid, invoiceType: "FULL_PAYMENT"
    });
  });

  const soByNumber = new Map(salesOrders.map(so => [String(so.SO_NUMBER || "").trim(), so]));
  const downPayments = [];
  payments.forEach(payment => {
    const soNo = String(payment.SO_NUMBER || "").trim();
    const so = soByNumber.get(soNo);
    const paymentNo = String(payment.PAYMENT_NO || "").trim();
    const paymentId = String(payment.PAYMENT_ID || "").trim();
    const amount = _finMoney_(payment.SO_APPLIED_AMOUNT !== "" && payment.SO_APPLIED_AMOUNT !== undefined && payment.SO_APPLIED_AMOUNT !== null
      ? payment.SO_APPLIED_AMOUNT : payment.CURRENT_PAYMENT);
    if (!so || !paymentNo || amount <= 0) return;
    if (invoicedDPIds.has(paymentId.toLowerCase()) || invoicedDPNumbers.has(paymentNo.toLowerCase())) return;
    downPayments.push({
      referenceNo: paymentNo, paymentNo: paymentNo, soNumber: soNo,
      clientName: String(payment.CLIENT_NAME || so.CLIENT_NAME || ""),
      project: String(payment.PROJECT || so.PROJECT || ""),
      date: payment.PAYMENT_DATE || payment.DATE || payment.CREATED_AT || "",
      amount: amount, invoiceType: "DOWN_PAYMENT"
    });
  });

  const deliveryReceiptQueue = deliveryReceipts.filter(dr =>
    !invoicedDRNumbers.has(String(dr.DR_NUMBER || "").trim().toLowerCase())
  ).map(dr => ({
    referenceNo: String(dr.DR_NUMBER || ""), drNumber: String(dr.DR_NUMBER || ""),
    soNumber: String(dr.SO_NUMBER || ""),
    clientName: String(dr.CLIENT_NAME || dr.CLIENT || ""),
    project: String(dr.PROJECT || ""),
    date: dr.DATE_OF_TRANSFER || dr.DR_DATE || dr.CREATED_AT || "",
    amount: _finMoney_(dr.DR_TOTAL || dr.TOTAL_AMOUNT || 0),
    invoiceType: "DELIVERY_RECEIPT"
  }));

  return {
    success: true,
    fullPayments: fullPayments,
    downPayments: downPayments,
    deliveryReceipts: deliveryReceiptQueue,
    counts: {
      fullPayment: fullPayments.length,
      downPayment: downPayments.length,
      deliveryReceipt: deliveryReceiptQueue.length
    }
  };
}
