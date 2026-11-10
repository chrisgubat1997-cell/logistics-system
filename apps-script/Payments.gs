/* =========================================================
   LOGIS-TECH SYSTEM — PAYMENTS API
   File: Payments.gs
   Uses existing CONFIG, getSheet, getAllRecords, findRecord,
   generateId, generateDocumentNumber, formatDateTime,
   logActivity and touchSyncVersion helpers.
========================================================= */

function getPayments(payload) {
  payload = payload || {};
  const soNumber = String(payload.soNumber || payload.SO_NUMBER || "").trim();
  const invoiceNo = String(payload.invoiceNo || payload.INVOICE_NO || "").trim();
  let records = getAllRecords(CONFIG.SHEETS.PAYMENTS);
  if (soNumber) records = records.filter(p => String(p.SO_NUMBER || "") === soNumber);
  if (invoiceNo) records = records.filter(p => String(p.INVOICE_NO || "") === invoiceNo);
  return { success: true, payments: records, records: records, count: records.length };
}

function getPayment(payload) {
  payload = payload || {};
  const no = String(payload.paymentNo || payload.PAYMENT_NO || "").trim();
  const id = String(payload.paymentId || payload.PAYMENT_ID || "").trim();
  if (!no && !id) return { success: false, message: "Payment number or ID is required." };
  const found = getAllRecords(CONFIG.SHEETS.PAYMENTS).find(p =>
    (no && String(p.PAYMENT_NO || "") === no) || (id && String(p.PAYMENT_ID || "") === id)
  );
  return found ? { success: true, payment: found } : { success: false, message: "Payment not found." };
}

function createPayment(payload) {
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const soNumber = String(payload.soNumber || payload.soNo || payload.SO_NUMBER || "").trim();
    if (!soNumber) throw new Error("Sales Order Number is required.");
    const amount = _finMoney_(payload.currentPayment ?? payload.CURRENT_PAYMENT ?? payload.amount ?? payload.paymentAmount);
    if (amount <= 0) throw new Error("Payment amount must be greater than zero.");
    const so = findRecord(CONFIG.SHEETS.SALES_ORDERS, "SO_NUMBER", soNumber);
    if (!so) throw new Error("Sales Order not found: " + soNumber);
    if (String(so.STATUS || "").toUpperCase() === "CANCELLED") throw new Error("Cannot record payment for a cancelled Sales Order.");

    const total = _finSoTotal_(so);
    const previousPaid = _finPaidForSO_(soNumber);
    const remainingBefore = Math.max(0, Math.round((total - previousPaid) * 100) / 100);
    const terms = _finTerms_(so);
    const requiredDP = _finRequiredDP_(so);
    const statusInput = String(payload.paymentStatus || payload.status || payload.PAYMENT_STATUS || "RECEIVED").trim().toUpperCase();
    const allowedStatuses = ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED", "PENDING", "DRAFT", "CANCELLED"];
    if (!allowedStatuses.includes(statusInput)) throw new Error("Invalid payment status.");
    if (statusInput === "CANCELLED") throw new Error("Create the payment as a separate record; do not use this endpoint to record a cancelled collection.");
    const counted = ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED"].includes(statusInput);
    // Allocate confirmed collections to the SO first; any excess becomes customer credit.
    const soAppliedAmount = counted ? Math.min(amount, remainingBefore) : 0;
    const creditAmount = counted ? Math.max(0, Math.round((amount - soAppliedAmount) * 100) / 100) : 0;
    const totalPaid = previousPaid + soAppliedAmount;
    const remaining = Math.max(0, Math.round((total - totalPaid) * 100) / 100);

    const sheet = getSheet(CONFIG.SHEETS.PAYMENTS);
    const now = new Date();
    const timestamp = formatDateTime(now);
    const paymentId = generateId("PAY");
    let paymentNo = String(payload.paymentNo || payload.PAYMENT_NO || "").trim();
    if (!paymentNo) paymentNo = generateDocumentNumber(CONFIG.PREFIX.PAY, CONFIG.SHEETS.PAYMENTS, "PAYMENT_NO");
    if (getAllRecords(CONFIG.SHEETS.PAYMENTS).some(p => String(p.PAYMENT_NO || "") === paymentNo)) {
      throw new Error("Payment number already exists. Refresh the payment list and try again.");
    }

    let invoice = null;
    const invoiceNo = String(payload.invoiceNo || payload.INVOICE_NO || "").trim();
    if (invoiceNo) {
      invoice = findRecord(CONFIG.SHEETS.INVOICES, "INVOICE_NO", invoiceNo);
      if (!invoice) throw new Error("Invoice not found: " + invoiceNo);
      if (String(invoice.SO_NUMBER || "") !== soNumber) throw new Error("The selected invoice does not belong to this Sales Order.");
    }
    const drNo = String(payload.drNo || payload.DR_NUMBER || "").trim();
    let dr = null;
    if (drNo) {
      dr = findRecord(CONFIG.SHEETS.DELIVERY_RECEIPTS, "DR_NUMBER", drNo);
      if (!dr) throw new Error("Delivery Receipt not found: " + drNo);
      if (String(dr.SO_NUMBER || "") !== soNumber) throw new Error("The selected DR does not belong to this Sales Order.");
    }
    const payment = {
      PAYMENT_ID: paymentId, PAYMENT_NO: paymentNo, PAYMENT_DATE: payload.paymentDate || payload.date || payload.PAYMENT_DATE || now,
      SO_ID: so.SO_ID || "", SO_NUMBER: soNumber, CUSTOMER_ID: so.CUSTOMER_ID || "",
      CLIENT_NAME: String(payload.clientName || payload.client || payload.CLIENT_NAME || so.CLIENT_NAME || ""),
      PROJECT: String(payload.project || payload.PROJECT || so.PROJECT || ""),
      INVOICE_ID: invoice ? invoice.INVOICE_ID : "", INVOICE_NO: invoiceNo,
      SI_NO: String(payload.siNo || payload.SI_NO || (invoice && invoice.SI_NO) || ""),
      DR_ID: dr ? dr.DR_ID : "", DR_NUMBER: drNo,
      PAYMENT_METHOD: String(payload.paymentMethod || payload.PAYMENT_METHOD || ""),
      PAYMENT_STATUS: statusInput, SO_TOTAL: total, REQUIRED_DP: requiredDP,
      PREVIOUS_PAID: previousPaid, CURRENT_PAYMENT: amount, SO_APPLIED_AMOUNT: soAppliedAmount,
      CREDIT_AMOUNT: creditAmount, TOTAL_PAID: totalPaid, REMAINING_BALANCE: remaining,
      RECEIPT_TYPE: String(payload.receiptType || payload.RECEIPT_TYPE || ""),
      RECEIPT_NO: String(payload.receiptNo || payload.RECEIPT_NO || ""),
      REFERENCE_NO: String(payload.referenceNo || payload.REFERENCE_NO || ""),
      REMARKS: String(payload.remarks || payload.REMARKS || ""),
      CREATED_BY: String(payload.createdBy || payload.username || payload.CREATED_BY || ""),
      CREATED_AT: timestamp, UPDATED_AT: timestamp
    };
    // Ensure allocation fields exist so future SO payment totals exclude excess credit.
    const paymentHeaders = _finGetHeaders_(sheet);
    ["SO_APPLIED_AMOUNT", "CREDIT_AMOUNT"].forEach(function(header) {
      if (paymentHeaders.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        paymentHeaders.push(header);
      }
    });
    const paymentRow = sheet.getLastRow() + 1;
    _finAppendObjectByHeaders_(sheet, payment);
    if (creditAmount > 0) {
      try {
        _recordCustomerCredit_(so, payment, creditAmount);
      } catch (creditError) {
        // Keep payment and credit ledger atomic: remove the payment row if credit posting fails.
        sheet.deleteRow(paymentRow);
        throw new Error("Payment was not saved because Customer Credit could not be posted: " + creditError.message);
      }
    }
    if (typeof logActivity === "function") logActivity({
      username: payment.CREATED_BY || "SYSTEM", action: "CREATE", module: "PAYMENT",
      recordId: paymentId, recordNumber: paymentNo,
      details: "Recorded payment for " + soNumber + ": " + amount.toFixed(2) + " (" + statusInput + ")", status: "SUCCESS"
    });
    if (typeof touchSyncVersion === "function") touchSyncVersion();
    return { success: true, message: creditAmount > 0
      ? "Payment saved. Excess amount was added to Customer Credit."
      : "Payment saved to the database.", payment: payment, soAppliedAmount: soAppliedAmount, creditAmount: creditAmount };
  } finally {
    lock.releaseLock();
  }
}


/* Create/update the per-company customer credit ledger for confirmed overpayments. */
function _recordCustomerCredit_(so, payment, creditAmount) {
  const ss = getDatabase();
  const creditHeaders = ["CUSTOMER_ID", "CUSTOMER_NAME", "CREDIT_BALANCE", "CREATED_AT", "UPDATED_AT"];
  const txnHeaders = ["CREDIT_TXN_ID", "CUSTOMER_ID", "CUSTOMER_NAME", "PAYMENT_ID", "PAYMENT_NO", "SO_NUMBER", "TXN_TYPE", "AMOUNT", "BALANCE_AFTER", "TXN_DATE", "REMARKS", "CREATED_BY", "CREATED_AT"];

  function ensureSheet(name, requiredHeaders) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastColumn() === 0) {
      sh.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
      return sh;
    }
    const existing = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(v => String(v).trim());
    requiredHeaders.forEach(h => {
      if (existing.indexOf(h) === -1) {
        sh.getRange(1, sh.getLastColumn() + 1).setValue(h);
        existing.push(h);
      }
    });
    return sh;
  }
  function appendByHeaders(sh, data) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(v => String(v).trim());
    sh.appendRow(headers.map(h => data[h] === undefined ? "" : data[h]));
  }

  const customerId = String(so.CUSTOMER_ID || payment.CUSTOMER_ID || "").trim();
  const customerName = String(payment.CLIENT_NAME || so.CLIENT_NAME || so.CUSTOMER_NAME || "").trim();
  if (!customerId && !customerName) throw new Error("Cannot create Customer Credit: Sales Order has no customer identifier or name.");

  const creditSheet = ensureSheet("CUSTOMER_CREDITS", creditHeaders);
  const txnSheet = ensureSheet("CUSTOMER_CREDIT_TRANSACTIONS", txnHeaders);
  const lastRow = creditSheet.getLastRow();
  const headers = creditSheet.getRange(1, 1, 1, creditSheet.getLastColumn()).getDisplayValues()[0].map(v => String(v).trim());
  const idCol = headers.indexOf("CUSTOMER_ID");
  const nameCol = headers.indexOf("CUSTOMER_NAME");
  const balanceCol = headers.indexOf("CREDIT_BALANCE");
  let rowIndex = 0;
  if (lastRow > 1) {
    const rows = creditSheet.getRange(2, 1, lastRow - 1, creditSheet.getLastColumn()).getValues();
    for (let i = 0; i < rows.length; i++) {
      const idMatch = customerId && idCol >= 0 && String(rows[i][idCol] || "").trim() === customerId;
      const nameMatch = !customerId && nameCol >= 0 && String(rows[i][nameCol] || "").trim().toLowerCase() === customerName.toLowerCase();
      if (idMatch || nameMatch) { rowIndex = i + 2; break; }
    }
  }
  const now = payment.CREATED_AT || new Date();
  let balance = creditAmount;
  if (rowIndex) {
    const current = _finMoney_(creditSheet.getRange(rowIndex, balanceCol + 1).getValue());
    balance = Math.round((current + creditAmount) * 100) / 100;
    creditSheet.getRange(rowIndex, balanceCol + 1).setValue(balance);
    const createdCol = headers.indexOf("CREATED_AT");
    const updatedCol = headers.indexOf("UPDATED_AT");
    if (updatedCol >= 0) creditSheet.getRange(rowIndex, updatedCol + 1).setValue(now);
    if (createdCol >= 0 && !creditSheet.getRange(rowIndex, createdCol + 1).getValue()) creditSheet.getRange(rowIndex, createdCol + 1).setValue(now);
    try {
      appendByHeaders(txnSheet, {
        CREDIT_TXN_ID: generateId("CRD"), CUSTOMER_ID: customerId, CUSTOMER_NAME: customerName,
        PAYMENT_ID: payment.PAYMENT_ID, PAYMENT_NO: payment.PAYMENT_NO, SO_NUMBER: payment.SO_NUMBER,
        TXN_TYPE: "OVERPAYMENT_CREDIT", AMOUNT: creditAmount, BALANCE_AFTER: balance,
        TXN_DATE: payment.PAYMENT_DATE, REMARKS: "Excess from payment " + payment.PAYMENT_NO + " for " + payment.SO_NUMBER,
        CREATED_BY: payment.CREATED_BY, CREATED_AT: now
      });
    } catch (error) {
      creditSheet.getRange(rowIndex, balanceCol + 1).setValue(current);
      if (updatedCol >= 0) creditSheet.getRange(rowIndex, updatedCol + 1).setValue(now);
      throw error;
    }
  } else {
    const newCreditRow = creditSheet.getLastRow() + 1;
    appendByHeaders(creditSheet, { CUSTOMER_ID: customerId, CUSTOMER_NAME: customerName, CREDIT_BALANCE: balance, CREATED_AT: now, UPDATED_AT: now });
    try {
      appendByHeaders(txnSheet, {
        CREDIT_TXN_ID: generateId("CRD"), CUSTOMER_ID: customerId, CUSTOMER_NAME: customerName,
        PAYMENT_ID: payment.PAYMENT_ID, PAYMENT_NO: payment.PAYMENT_NO, SO_NUMBER: payment.SO_NUMBER,
        TXN_TYPE: "OVERPAYMENT_CREDIT", AMOUNT: creditAmount, BALANCE_AFTER: balance,
        TXN_DATE: payment.PAYMENT_DATE, REMARKS: "Excess from payment " + payment.PAYMENT_NO + " for " + payment.SO_NUMBER,
        CREATED_BY: payment.CREATED_BY, CREATED_AT: now
      });
    } catch (error) {
      creditSheet.deleteRow(newCreditRow);
      throw error;
    }
  }
}

/* Used by Delivery.gs before a DR can be created. COD permits dispatch without prepayment;
   50% DP requires confirmed collections equal to the DP; full advance requires full payment. */
function validateDeliveryPaymentTerms_(so) {
  if (!so) throw new Error("Sales Order is required for payment validation.");
  const terms = _finTerms_(so);
  const total = _finSoTotal_(so);
  const paid = _finPaidForSO_(so.SO_NUMBER);
  if (_finIsFullAdvance_(so) && paid + 0.005 < total) {
    throw new Error("Delivery blocked: full advance payment is required. Paid: " + paid.toFixed(2) + "; required: " + total.toFixed(2) + ".");
  }
  const dp = _finRequiredDP_(so);
  if (dp > 0 && !_finIsFullAdvance_(so) && paid + 0.005 < dp) {
    throw new Error("Delivery blocked: the required DP has not been recorded. Paid: " + paid.toFixed(2) + "; required DP: " + dp.toFixed(2) + ".");
  }
  // COD and ordinary credit terms do not require pre-dispatch payment.
  return { success: true, terms: terms, soTotal: total, totalPaid: paid, requiredDP: dp };
}


/* Optional customer-credit ledger reads. Create these sheet tabs with the headers below
   before relying on the ledger: CUSTOMER_CREDITS and CUSTOMER_CREDIT_TRANSACTIONS. */
function getCustomerCredits(payload) {
  try {
    const records = getAllRecords("CUSTOMER_CREDITS");
    return { success: true, customerCredits: records, records: records, count: records.length };
  } catch (error) {
    return { success: true, customerCredits: [], records: [], count: 0, warning: "CUSTOMER_CREDITS sheet is not configured yet." };
  }
}

function getCustomerCreditTransactions(payload) {
  payload = payload || {};
  const customerId = String(payload.customerId || payload.CUSTOMER_ID || "").trim();
  try {
    let records = getAllRecords("CUSTOMER_CREDIT_TRANSACTIONS");
    if (customerId) records = records.filter(function (row) { return String(row.CUSTOMER_ID || "") === customerId; });
    records.sort(function (a, b) { return String(b.TXN_DATE || b.CREATED_AT || "").localeCompare(String(a.TXN_DATE || a.CREATED_AT || "")); });
    return { success: true, customerCreditTransactions: records, records: records, count: records.length };
  } catch (error) {
    return { success: true, customerCreditTransactions: [], records: [], count: 0, warning: "CUSTOMER_CREDIT_TRANSACTIONS sheet is not configured yet." };
  }
}
