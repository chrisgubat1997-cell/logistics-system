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

    _finValidateInvoicePaymentRequirement_(so);

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
  return getAllRecords(CONFIG.SHEETS.PAYMENTS).filter(p =>
    String(p.SO_NUMBER || "") === String(soNumber) &&
    ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED"].includes(String(p.PAYMENT_STATUS || "").trim().toUpperCase())
  ).reduce((sum, p) => sum + _finMoney_(p.CURRENT_PAYMENT), 0);
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
