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
  const paymentNo = String(payload.paymentNo || payload.PAYMENT_NO || payload.sourceNumber || "").trim();
  const paymentId = String(payload.paymentId || payload.PAYMENT_ID || "").trim();
  let records = getAllRecords(CONFIG.SHEETS.PAYMENTS);
  if (soNumber) records = records.filter(p => String(p.SO_NUMBER || "") === soNumber);
  if (invoiceNo) records = records.filter(p => String(p.INVOICE_NO || "") === invoiceNo);
  if (paymentNo) records = records.filter(p => String(p.PAYMENT_NO || "") === paymentNo);
  if (paymentId) records = records.filter(p => String(p.PAYMENT_ID || "") === paymentId);
  records = records.map(function(payment) {
    return typeof _finAttachPaymentInvoiceLinks_ === "function"
      ? _finAttachPaymentInvoiceLinks_(payment)
      : payment;
  });
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
  if (found && typeof _finAttachPaymentInvoiceLinks_ === "function") {
    _finAttachPaymentInvoiceLinks_(found);
  }
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
    const requestedCredit = _finMoney_(payload.creditToApply ?? payload.CUSTOMER_CREDIT_APPLIED ?? 0);
    if (amount < 0 || requestedCredit < 0) throw new Error("Payment and credit amounts cannot be negative.");
    if (amount <= 0 && requestedCredit <= 0) throw new Error("Enter a cash payment or apply available customer credit.");

    const so = findRecord(CONFIG.SHEETS.SALES_ORDERS, "SO_NUMBER", soNumber);
    if (!so) throw new Error("Sales Order not found: " + soNumber);
    if (String(so.STATUS || "").toUpperCase() === "CANCELLED") throw new Error("Cannot record payment for a cancelled Sales Order.");

    const total = _finSoTotal_(so);
    const previousPaid = _finPaidForSO_(soNumber);
    const remainingBefore = Math.max(0, Math.round((total - previousPaid) * 100) / 100);
    const terms = _finTerms_(so);
    const requiredDP = _finRequiredDP_(so);
    const paymentType = String(payload.paymentType || payload.PAYMENT_TYPE || "").trim().toUpperCase();
    if (!["DOWN_PAYMENT", "FULL_PAYMENT"].includes(paymentType)) {
      throw new Error("Payment classification is required. Select Down Payment or Full Payment.");
    }
    const statusInput = String(payload.paymentStatus || payload.status || payload.PAYMENT_STATUS || "RECEIVED").trim().toUpperCase();
    const allowedStatuses = ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED", "PENDING", "DRAFT", "CANCELLED"];
    if (!allowedStatuses.includes(statusInput)) throw new Error("Invalid payment status.");
    if (statusInput === "CANCELLED") throw new Error("Create the payment as a separate record; do not use this endpoint to record a cancelled collection.");
    const counted = ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED"].includes(statusInput);
    if (requestedCredit > 0 && !counted) throw new Error("Customer credit can only be applied to a confirmed/received payment.");

    const cashAppliedAmount = counted ? Math.min(amount, remainingBefore) : 0;
    const cashOverpayment = counted ? Math.max(0, Math.round((amount - cashAppliedAmount) * 100) / 100) : 0;
    const remainingAfterCash = Math.max(0, Math.round((remainingBefore - cashAppliedAmount) * 100) / 100);
    if (requestedCredit > remainingAfterCash + 0.005) {
      throw new Error("The requested credit exceeds this Sales Order's remaining balance after cash payment.");
    }
    if (cashOverpayment > 0 && requestedCredit > 0) {
      throw new Error("Please process the existing customer credit separately from a new overpayment. Do not combine both in one payment.");
    }

    const customerId = String(so.CUSTOMER_ID || "").trim();
    const customerName = String(payload.clientName || payload.client || payload.CLIENT_NAME || so.CLIENT_NAME || so.CUSTOMER_NAME || "").trim();
    const creditRecord = requestedCredit > 0 ? _findCustomerCreditRecord_(customerId, customerName) : null;
    const availableCredit = creditRecord ? _customerCreditBalance_(creditRecord) : 0;
    if (requestedCredit > availableCredit + 0.005) {
      throw new Error("Insufficient customer credit. Available credit is " + availableCredit.toFixed(2) + ".");
    }

    const creditAppliedAmount = counted ? requestedCredit : 0;
    const soAppliedAmount = Math.round((cashAppliedAmount + creditAppliedAmount) * 100) / 100;
    const totalPaid = Math.round((previousPaid + soAppliedAmount) * 100) / 100;
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
      SO_ID: so.SO_ID || "", SO_NUMBER: soNumber, CUSTOMER_ID: customerId,
      CLIENT_NAME: customerName, PROJECT: String(payload.project || payload.PROJECT || so.PROJECT || ""),
      PAYMENT_TYPE: paymentType,
      INVOICE_ID: invoice ? invoice.INVOICE_ID : "", INVOICE_NO: invoiceNo,
      SI_NO: String(payload.siNo || payload.SI_NO || (invoice && invoice.SI_NO) || ""),
      DR_ID: dr ? dr.DR_ID : "", DR_NUMBER: drNo,
      PAYMENT_METHOD: amount <= 0 && creditAppliedAmount > 0 ? "CUSTOMER CREDIT" : String(payload.paymentMethod || payload.PAYMENT_METHOD || ""),
      PAYMENT_STATUS: statusInput, SO_TOTAL: total, REQUIRED_DP: requiredDP,
      PREVIOUS_PAID: previousPaid, CURRENT_PAYMENT: amount, CASH_APPLIED_AMOUNT: cashAppliedAmount,
      CUSTOMER_CREDIT_APPLIED: creditAppliedAmount, SO_APPLIED_AMOUNT: soAppliedAmount,
      CREDIT_AMOUNT: cashOverpayment, TOTAL_PAID: totalPaid, REMAINING_BALANCE: remaining,
      RECEIPT_TYPE: String(payload.receiptType || payload.RECEIPT_TYPE || (amount <= 0 ? "None" : "")),
      RECEIPT_NO: String(payload.receiptNo || payload.RECEIPT_NO || ""),
      REFERENCE_NO: String(payload.referenceNo || payload.REFERENCE_NO || (creditAppliedAmount > 0 && amount <= 0 ? "CREDIT-APPLICATION" : "")),
      REMARKS: String(payload.remarks || payload.REMARKS || ""),
      CREATED_BY: String(payload.createdBy || payload.username || payload.CREATED_BY || ""),
      CREATED_AT: timestamp, UPDATED_AT: timestamp
    };

    const paymentHeaders = _finGetHeaders_(sheet);
    ["PAYMENT_TYPE", "SO_APPLIED_AMOUNT", "CREDIT_AMOUNT", "CASH_APPLIED_AMOUNT", "CUSTOMER_CREDIT_APPLIED"].forEach(function(header) {
      if (paymentHeaders.indexOf(header) === -1) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        paymentHeaders.push(header);
      }
    });

    const paymentRow = sheet.getLastRow() + 1;
    _finAppendObjectByHeaders_(sheet, payment);
    try {
      if (creditAppliedAmount > 0) _applyCustomerCredit_(creditRecord, so, payment, creditAppliedAmount);
      if (cashOverpayment > 0) _recordCustomerCredit_(so, payment, cashOverpayment);
    } catch (creditError) {
      if (sheet.getLastRow() >= paymentRow) sheet.deleteRow(paymentRow);
      throw new Error("Payment was not saved because Customer Credit could not be posted: " + creditError.message);
    }

    if (typeof logActivity === "function") logActivity({
      username: payment.CREATED_BY || "SYSTEM", action: "CREATE", module: "PAYMENT",
      recordId: paymentId, recordNumber: paymentNo,
      details: "Recorded payment for " + soNumber + ": cash " + amount.toFixed(2) + ", credit applied " + creditAppliedAmount.toFixed(2) + " (" + statusInput + ")", status: "SUCCESS"
    });
    if (typeof touchSyncVersion === "function") touchSyncVersion();
    return {
      success: true,
      message: creditAppliedAmount > 0
        ? "Payment saved. Customer credit was applied to the Sales Order."
        : cashOverpayment > 0
          ? "Payment saved. Excess amount was added to Customer Credit."
          : "Payment saved to the database.",
      payment: payment, soAppliedAmount: soAppliedAmount, cashAppliedAmount: cashAppliedAmount,
      creditAppliedAmount: creditAppliedAmount, creditAmount: cashOverpayment,
      remainingBalance: remaining
    };
  } finally {
    lock.releaseLock();
  }
}


/* Existing company-specific credit ledger. The active company context selects the correct spreadsheet. */
function _customerCreditSheets_() {
  const ss = getDatabase();
  const credits = ss.getSheetByName("CUSTOMER_CREDITS");
  const transactions = ss.getSheetByName("CUSTOMER_CREDIT_TRANSACTIONS");
  if (!credits) throw new Error("CUSTOMER_CREDITS sheet not found in the active company database.");
  if (!transactions) throw new Error("CUSTOMER_CREDIT_TRANSACTIONS sheet not found in the active company database.");
  return { credits: credits, transactions: transactions };
}

function _customerCreditHeaders_(sheet) {
  if (sheet.getLastColumn() < 1) throw new Error(sheet.getName() + " has no header row.");
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].map(function(v) { return String(v || "").trim(); });
}

function _customerCreditAppend_(sheet, data) {
  const headers = _customerCreditHeaders_(sheet);
  sheet.appendRow(headers.map(function(header) { return data[header] === undefined ? "" : data[header]; }));
}

function _customerCreditBalance_(record) {
  const available = _finMoney_(record && record.AVAILABLE_CREDIT);
  const legacyBalance = _finMoney_(record && record.CREDIT_BALANCE);
  // Keep credits created by the earlier implementation visible while both legacy columns are synchronized.
  return Math.max(available, legacyBalance);
}

function _findCustomerCreditRecord_(customerId, customerName) {
  const sheets = _customerCreditSheets_();
  const sh = sheets.credits;
  const records = getAllRecords("CUSTOMER_CREDITS");
  const id = String(customerId || "").trim();
  const name = String(customerName || "").trim().toLowerCase();
  let found = null;
  if (id) {
    found = records.find(function(row) { return String(row.CUSTOMER_ID || "").trim() === id; }) || null;
  } else if (name) {
    found = records.find(function(row) {
      return String(row.CLIENT_NAME || row.CUSTOMER_NAME || "").trim().toLowerCase() === name;
    }) || null;
  }
  if (!found) return null;
  const headers = _customerCreditHeaders_(sh);
  const idCol = headers.indexOf("CREDIT_ID");
  const customerIdCol = headers.indexOf("CUSTOMER_ID");
  const rowIndex = records.indexOf(found) + 2;
  return { sheet: sh, rowIndex: rowIndex, headers: headers, record: found, customerId: id, customerName: customerName, idCol: idCol, customerIdCol: customerIdCol };
}

function _setCustomerCreditBalance_(creditRecord, balance, timestamp) {
  const sh = creditRecord.sheet;
  const headers = creditRecord.headers;
  ["AVAILABLE_CREDIT", "CREDIT_BALANCE"].forEach(function(header) {
    const index = headers.indexOf(header);
    if (index >= 0) sh.getRange(creditRecord.rowIndex, index + 1).setValue(balance);
  });
  ["UPDATED_AT"].forEach(function(header) {
    const index = headers.indexOf(header);
    if (index >= 0) sh.getRange(creditRecord.rowIndex, index + 1).setValue(timestamp);
  });
}

function _creditTransactionData_(so, payment, amount, balanceAfter, txnType, remarks) {
  const customerId = String(so.CUSTOMER_ID || payment.CUSTOMER_ID || "").trim();
  const customerName = String(payment.CLIENT_NAME || so.CLIENT_NAME || so.CUSTOMER_NAME || "").trim();
  return {
    CREDIT_TXN_ID: generateId("CRD"), CUSTOMER_ID: customerId, CLIENT_NAME: customerName,
    CUSTOMER_NAME: customerName, TXN_DATE: payment.PAYMENT_DATE, TXN_TYPE: txnType,
    REFERENCE_NO: payment.REFERENCE_NO || "", SO_NUMBER: payment.SO_NUMBER || "",
    PAYMENT_NO: payment.PAYMENT_NO || "", AMOUNT: amount, CREATED_BY: payment.CREATED_BY || "",
    CREATED_AT: payment.CREATED_AT || new Date(), REMARKS: remarks || "",
    PAYMENT_ID: payment.PAYMENT_ID || "", BALANCE_AFTER: balanceAfter
  };
}

/* Add confirmed overpayment to the existing customer credit balance. */
function _recordCustomerCredit_(so, payment, creditAmount) {
  const sheets = _customerCreditSheets_();
  const customerId = String(so.CUSTOMER_ID || payment.CUSTOMER_ID || "").trim();
  const customerName = String(payment.CLIENT_NAME || so.CLIENT_NAME || so.CUSTOMER_NAME || "").trim();
  if (!customerId && !customerName) throw new Error("Cannot create Customer Credit: Sales Order has no customer identifier or name.");

  let creditRecord = _findCustomerCreditRecord_(customerId, customerName);
  const now = payment.CREATED_AT || new Date();
  let oldBalance = 0;
  let newBalance = creditAmount;
  let isNewCreditRow = false;
  if (creditRecord) {
    oldBalance = _customerCreditBalance_(creditRecord.record);
    newBalance = Math.round((oldBalance + creditAmount) * 100) / 100;
    _setCustomerCreditBalance_(creditRecord, newBalance, now);
  } else {
    const headers = _customerCreditHeaders_(sheets.credits);
    const row = {};
    row.CREDIT_ID = generateId("CRD");
    row.CUSTOMER_ID = customerId;
    row.CLIENT_NAME = customerName;
    row.CUSTOMER_NAME = customerName;
    row.AVAILABLE_CREDIT = newBalance;
    row.CREDIT_BALANCE = newBalance;
    row.CREATED_AT = now;
    row.UPDATED_AT = now;
    const rowIndex = sheets.credits.getLastRow() + 1;
    _customerCreditAppend_(sheets.credits, row);
    isNewCreditRow = true;
    creditRecord = { sheet: sheets.credits, rowIndex: rowIndex, headers: headers, record: row };
  }

  try {
    _customerCreditAppend_(sheets.transactions, _creditTransactionData_(
      so, payment, creditAmount, newBalance, "OVERPAYMENT_CREDIT",
      "Excess from payment " + payment.PAYMENT_NO + " for " + payment.SO_NUMBER
    ));
  } catch (error) {
    if (creditRecord && creditRecord.rowIndex > 1) {
      if (isNewCreditRow && creditRecord.sheet.getLastRow() >= creditRecord.rowIndex) {
        creditRecord.sheet.deleteRow(creditRecord.rowIndex);
      } else {
        _setCustomerCreditBalance_(creditRecord, oldBalance, now);
      }
    }
    throw error;
  }
}

/* Apply existing credit to the selected SO and record a negative ledger movement. */
function _applyCustomerCredit_(creditRecord, so, payment, amount) {
  if (!creditRecord) throw new Error("No customer credit record was found.");
  const oldBalance = _customerCreditBalance_(creditRecord.record);
  if (amount <= 0 || amount > oldBalance + 0.005) throw new Error("The available customer credit has changed. Refresh and try again.");
  const newBalance = Math.max(0, Math.round((oldBalance - amount) * 100) / 100);
  const now = payment.CREATED_AT || new Date();
  _setCustomerCreditBalance_(creditRecord, newBalance, now);
  try {
    _customerCreditAppend_( _customerCreditSheets_().transactions, _creditTransactionData_(
      so, payment, -amount, newBalance, "CREDIT_APPLIED",
      "Applied customer credit to " + payment.SO_NUMBER + " through payment " + payment.PAYMENT_NO
    ));
  } catch (error) {
    _setCustomerCreditBalance_(creditRecord, oldBalance, now);
    throw error;
  }
}

/* Read customer credits from the active company database only. */
function getCustomerCredits(payload) {
  payload = payload || {};
  try {
    let records = getAllRecords("CUSTOMER_CREDITS");
    const customerId = String(payload.customerId || payload.CUSTOMER_ID || "").trim();
    const customerName = String(payload.clientName || payload.customerName || payload.CLIENT_NAME || "").trim().toLowerCase();
    if (customerId) records = records.filter(function(row) { return String(row.CUSTOMER_ID || "").trim() === customerId; });
    else if (customerName) records = records.filter(function(row) {
      return String(row.CLIENT_NAME || row.CUSTOMER_NAME || "").trim().toLowerCase() === customerName;
    });
    return { success: true, customerCredits: records, records: records, count: records.length };
  } catch (error) {
    throw new Error("Unable to read Customer Credit from the active company database: " + error.message);
  }
}

function getCustomerCreditTransactions(payload) {
  payload = payload || {};
  const customerId = String(payload.customerId || payload.CUSTOMER_ID || "").trim();
  const customerName = String(payload.clientName || payload.customerName || payload.CLIENT_NAME || "").trim().toLowerCase();
  try {
    let records = getAllRecords("CUSTOMER_CREDIT_TRANSACTIONS");
    if (customerId) records = records.filter(function(row) { return String(row.CUSTOMER_ID || "").trim() === customerId; });
    else if (customerName) records = records.filter(function(row) {
      return String(row.CLIENT_NAME || row.CUSTOMER_NAME || "").trim().toLowerCase() === customerName;
    });
    records.sort(function(a, b) { return String(b.TXN_DATE || b.CREATED_AT || "").localeCompare(String(a.TXN_DATE || a.CREATED_AT || "")); });
    return { success: true, customerCreditTransactions: records, records: records, count: records.length };
  } catch (error) {
    throw new Error("Unable to read Customer Credit Transactions from the active company database: " + error.message);
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
