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
    if (remainingBefore <= 0.005) throw new Error("This Sales Order is already FULLY PAID. No additional payment can be recorded.");
    if (amount > remainingBefore + 0.005) throw new Error("Payment exceeds the remaining Sales Order balance of " + remainingBefore.toFixed(2) + ".");
    const terms = _finTerms_(so);
    const requiredDP = _finRequiredDP_(so);
    const statusInput = String(payload.paymentStatus || payload.status || payload.PAYMENT_STATUS || "RECEIVED").trim().toUpperCase();
    const allowedStatuses = ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED", "PENDING", "DRAFT", "CANCELLED"];
    if (!allowedStatuses.includes(statusInput)) throw new Error("Invalid payment status.");
    if (statusInput === "CANCELLED") throw new Error("Create the payment as a separate record; do not use this endpoint to record a cancelled collection.");
    const counted = ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED"].includes(statusInput);
    const totalPaid = previousPaid + (counted ? amount : 0);
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
      PREVIOUS_PAID: previousPaid, CURRENT_PAYMENT: amount, TOTAL_PAID: totalPaid,
      REMAINING_BALANCE: remaining,
      RECEIPT_TYPE: String(payload.receiptType || payload.RECEIPT_TYPE || ""),
      RECEIPT_NO: String(payload.receiptNo || payload.RECEIPT_NO || ""),
      REFERENCE_NO: String(payload.referenceNo || payload.REFERENCE_NO || ""),
      REMARKS: String(payload.remarks || payload.REMARKS || ""),
      CREATED_BY: String(payload.createdBy || payload.username || payload.CREATED_BY || ""),
      CREATED_AT: timestamp, UPDATED_AT: timestamp
    };
    _finAppendObjectByHeaders_(sheet, payment);
    if (typeof logActivity === "function") logActivity({
      username: payment.CREATED_BY || "SYSTEM", action: "CREATE", module: "PAYMENT",
      recordId: paymentId, recordNumber: paymentNo,
      details: "Recorded payment for " + soNumber + ": " + amount.toFixed(2) + " (" + statusInput + ")", status: "SUCCESS"
    });
    if (typeof touchSyncVersion === "function") touchSyncVersion();
    return { success: true, message: "Payment saved to the database.", payment: payment };
  } finally {
    lock.releaseLock();
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
