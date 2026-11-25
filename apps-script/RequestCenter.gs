/* =========================================================
   LOGIS-TECH SYSTEM — REQUEST CENTER API
   Server-side session, company and role validation is required
   for every operation. Attachments are stored in the configured
   Request Center Drive folder and indexed in REQUEST_ATTACHMENTS.
========================================================= */

const RC_ALLOWED_ROLES_ = ["ADMIN","SALES","LOGISTICS","FINANCE","PAYMENT","PRODUCTION","ACCOUNTING"];

function rcActor_(payload, roles) {
  const auth = authorizeRole_(payload, roles || RC_ALLOWED_ROLES_);
  const ss = SpreadsheetApp.openById(AUTH_SPREADSHEET_ID);
  const sh = ss.getSheetByName("USERS");
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(v => String(v || "").trim().toUpperCase());
  const idx = {
    id: headers.indexOf("USER_ID"), name: headers.indexOf("FULL_NAME"),
    email: headers.indexOf("EMAIL"), username: headers.indexOf("USERNAME")
  };
  const row = values.slice(1).find(r =>
    String(r[idx.id] || "").trim() === auth.userId &&
    String(r[idx.username] || "").trim().toLowerCase() === auth.username.toLowerCase()
  );
  if (!row) throw new Error("Authenticated account could not be resolved.");
  return {
    userId: auth.userId, username: auth.username, role: auth.role,
    name: String(row[idx.name] || auth.username),
    email: String(row[idx.email] || ""),
    company: auth.company, companyAccess: auth.companyAccess || []
  };
}

function rcCompany_(company, actor) {
  const value = String(company || actor.company || "").trim().toUpperCase();
  if (!["GREENMETAL","GREENLIGHT"].includes(value)) throw new Error("Select a valid company.");
  const access = Array.isArray(actor.companyAccess) ? actor.companyAccess : [];
  if (access.indexOf(value) < 0) throw new Error("You are not authorized to submit or view records for " + value + ".");
  return value;
}

function rcDb_(company) {
  const id = company === "GREENLIGHT"
    ? CONFIG.GREENLIGHT_DATABASE_SPREADSHEET_ID
    : CONFIG.GREENMETAL_DATABASE_SPREADSHEET_ID;
  return SpreadsheetApp.openById(id);
}

function rcRows_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(v => String(v || "").trim());
  return values.slice(1).filter(row => row.some(v => v !== "" && v !== null))
    .map(row => rowToObject(headers, row));
}

function rcAppend_(ss, sheetName, record) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing database sheet: " + sheetName);
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map(h => record[h] !== undefined ? record[h] : ""));
}

function rcUploadFiles_(files, company, documentNo, actor, link) {
  files = Array.isArray(files) ? files : [];
  if (!files.length) return [];
  const rootId = CONFIG.REQUEST_CENTER_ATTACHMENTS_FOLDER_ID;
  if (!rootId) throw new Error("Request Center attachment folder is not configured.");
  const root = DriveApp.getFolderById(rootId);
  const year = Utilities.formatDate(new Date(), CONFIG.TIMEZONE || "Asia/Manila", "yyyy");
  const companyFolder = getOrCreateFolder(root, company);
  const yearFolder = getOrCreateFolder(companyFolder, year);
  const documentFolder = getOrCreateFolder(yearFolder, documentNo);
  const saved = [];
  files.forEach(file => {
    const name = String(file.name || "attachment").replace(/[\\/:*?"<>|]/g, "_");
    const mime = String(file.mimeType || "application/octet-stream");
    const data = String(file.base64 || "");
    if (!data) throw new Error("An attachment is missing file data: " + name);
    const bytes = Utilities.base64Decode(data);
    if (bytes.length > 5 * 1024 * 1024) throw new Error(name + " exceeds the 5 MB per-file limit.");
    if (!(mime.indexOf("image/") === 0 || mime === "application/pdf")) {
      throw new Error("Only image and PDF attachments are accepted.");
    }
    const blob = Utilities.newBlob(bytes, mime, name);
    const driveFile = documentFolder.createFile(blob);
    const attachmentNo = nextAttachmentNumber_(company, new Date());
    const attachmentId = Utilities.getUuid();
    const row = {
      ATTACHMENT_ID: attachmentId, ATTACHMENT_NO: attachmentNo,
      REQUEST_ID: link.requestId || "", REQUEST_NO: link.requestNo || "",
      LIQUIDATION_ID: link.liquidationId || "", LIQUIDATION_NO: link.liquidationNo || "",
      COMPANY: company, DOCUMENT_TYPE: link.documentType || "SUPPORTING_DOCUMENT",
      FILE_NAME: name, DRIVE_FILE_ID: driveFile.getId(), FILE_URL: driveFile.getUrl(),
      MIME_TYPE: mime, FILE_SIZE: bytes.length, UPLOADED_BY: actor.userId,
      UPLOADER_NAME: actor.name, UPLOADED_AT: new Date(), STATUS: "ACTIVE"
    };
    rcAppend_(rcDb_(company), CONFIG.SHEETS.REQUEST_ATTACHMENTS, row);
    saved.push({ attachmentNo: attachmentNo, fileName: name, url: driveFile.getUrl() });
  });
  return saved;
}

function requestCenterSubmitRfp(payload) {
  const actor = rcActor_(payload);
  const company = rcCompany_(payload.company, actor);
  const required = ["department","type","requestType","payee","amount","dateNeeded","approvingHead","purpose","projectClass"];
  required.forEach(k => { if (String(payload[k] || "").trim() === "") throw new Error("Please complete " + k + "."); });
  const amount = Number(payload.amount);
  if (!isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
  const ss = rcDb_(company);
  const now = new Date();
  const requestNo = nextRequestNumber_(company, now);
  const requestId = Utilities.getUuid();
  const record = {
    REQUEST_ID: requestId, REQUEST_NO: requestNo, REQUEST_DATE: now,
    REQUESTOR_USER_ID: actor.userId, REQUESTOR_NAME: actor.name,
    REQUESTOR_EMAIL: actor.email, COMPANY: company,
    DEPARTMENT: String(payload.department).trim(),
    REQUEST_TYPE: String(payload.type).trim(),
    TYPE_OF_REQUEST: String(payload.requestType).trim(),
    SUPPLIER_PAYEE: String(payload.payee).trim(), AMOUNT: amount,
    DETAILS_PURPOSE: String(payload.purpose).trim(),
    SO_NUMBER: String(payload.salesOrder || "").trim(),
    CLIENT_NAME: String(payload.clientName || "").trim(),
    PROJECT_CLASS: String(payload.projectClass).trim(),
    DATE_NEEDED: payload.dateNeeded, APPROVING_HEAD: String(payload.approvingHead).trim(),
    STATUS: "SUBMITTED", APPROVED_AMOUNT: "", APPROVED_DATE: "",
    RELEASED_DATE: "", CREATED_AT: now, UPDATED_AT: now
  };
  rcAppend_(ss, CONFIG.SHEETS.REQUESTS_MASTER, record);
  const attachments = rcUploadFiles_(payload.files, company, requestNo, actor, {
    requestId: requestId, requestNo: requestNo, documentType: "RFP_SUPPORTING_DOCUMENT"
  });
  return { success: true, message: "Request submitted successfully.", requestId: requestId, requestNo: requestNo, attachments: attachments };
}

function requestCenterGetMyRequests(payload) {
  const actor = rcActor_(payload);
  const companies = actor.companyAccess.length ? actor.companyAccess : [actor.company];
  let records = [];
  companies.forEach(company => {
    rcRows_(rcDb_(company).getSheetByName(CONFIG.SHEETS.REQUESTS_MASTER))
      .filter(r => String(r.REQUESTOR_USER_ID) === actor.userId)
      .forEach(r => records.push(r));
    rcRows_(rcDb_(company).getSheetByName(CONFIG.SHEETS.LIQUIDATION_MASTER))
      .filter(r => String(r.REQUESTOR_USER_ID) === actor.userId)
      .forEach(r => records.push(Object.assign({}, r, { REQUEST_NO: r.LIQUIDATION_NO, REQUEST_DATE: r.LIQUIDATION_DATE, REQUEST_TYPE: "LIQUIDATION", AMOUNT: r.TOTAL_EXPENSES })));
  });
  records.sort((a,b) => new Date(b.REQUEST_DATE || b.CREATED_AT || 0) - new Date(a.REQUEST_DATE || a.CREATED_AT || 0));
  return { success: true, records: records };
}

function requestCenterGetCashAdvances(payload) {
  const actor = rcActor_(payload);
  const companies = actor.companyAccess.length ? actor.companyAccess : [actor.company];
  let advances = [];
  companies.forEach(company => {
    const ss = rcDb_(company);
    const requests = rcRows_(ss.getSheetByName(CONFIG.SHEETS.REQUESTS_MASTER));
    const liquidations = rcRows_(ss.getSheetByName(CONFIG.SHEETS.LIQUIDATION_MASTER));
    requests.forEach(r => {
      if (String(r.REQUESTOR_USER_ID) !== actor.userId ||
          String(r.REQUEST_TYPE || "").toUpperCase() !== "CASH ADVANCE (CA)" ||
          !r.RELEASED_DATE || !(Number(r.APPROVED_AMOUNT) > 0)) return;
      const used = liquidations.filter(l => String(l.REQUEST_ID) === String(r.REQUEST_ID) && !["REJECTED","CANCELLED"].includes(String(l.STATUS).toUpperCase()))
        .reduce((sum,l) => sum + Number(l.TOTAL_EXPENSES || 0), 0);
      const approved = Number(r.APPROVED_AMOUNT) || 0;
      const remaining = Math.max(0, approved - used);
      if (remaining > 0) advances.push({
        requestId: r.REQUEST_ID, requestNo: r.REQUEST_NO, company: company,
        date: r.RELEASED_DATE, approvedAmount: approved, liquidatedAmount: used,
        remainingBalance: remaining, purpose: r.DETAILS_PURPOSE || r.SUPPLIER_PAYEE || "Cash Advance"
      });
    });
  });
  return { success: true, advances: advances };
}

function requestCenterSubmitLiquidation(payload) {
  const actor = rcActor_(payload);
  const company = rcCompany_(payload.company, actor);
  const ss = rcDb_(company);
  const requestId = String(payload.requestId || "").trim();
  const request = rcRows_(ss.getSheetByName(CONFIG.SHEETS.REQUESTS_MASTER))
    .find(r => String(r.REQUEST_ID) === requestId);
  if (!request || String(request.REQUESTOR_USER_ID) !== actor.userId ||
      String(request.REQUEST_TYPE || "").toUpperCase() !== "CASH ADVANCE (CA)" ||
      !request.RELEASED_DATE || !(Number(request.APPROVED_AMOUNT) > 0)) {
    throw new Error("This cash advance is not available for liquidation under your account.");
  }
  const prior = rcRows_(ss.getSheetByName(CONFIG.SHEETS.LIQUIDATION_MASTER))
    .filter(r => String(r.REQUEST_ID) === requestId && !["REJECTED","CANCELLED"].includes(String(r.STATUS).toUpperCase()))
    .reduce((sum,r) => sum + Number(r.TOTAL_EXPENSES || 0), 0);
  const remaining = Math.max(0, Number(request.APPROVED_AMOUNT) - prior);
  const expenses = Array.isArray(payload.expenses) ? payload.expenses : [];
  if (!expenses.length) throw new Error("Add at least one expense.");
  let total = 0;
  expenses.forEach(e => {
    const amount = Number(e.amount);
    if (!String(e.description || "").trim() || !isFinite(amount) || amount <= 0) throw new Error("Each expense needs a description and an amount greater than zero.");
    total += amount;
  });
  if (remaining <= 0) throw new Error("This cash advance is already fully liquidated.");
  const now = new Date(), liquidationId = Utilities.getUuid();
  const liquidationNo = nextLiquidationNumber_(company, now);
  const cashReturned = Math.max(0, remaining - total);
  const excess = Math.max(0, total - remaining);
  rcAppend_(ss, CONFIG.SHEETS.LIQUIDATION_MASTER, {
    LIQUIDATION_ID: liquidationId, LIQUIDATION_NO: liquidationNo,
    REQUEST_ID: request.REQUEST_ID, REQUEST_NO: request.REQUEST_NO,
    REQUESTOR_USER_ID: actor.userId, REQUESTOR_NAME: actor.name,
    COMPANY: company, DEPARTMENT: request.DEPARTMENT,
    APPROVED_CA_AMOUNT: remaining, TOTAL_EXPENSES: total,
    CASH_RETURNED: cashReturned, EXCESS_AMOUNT: excess,
    LIQUIDATION_DATE: payload.liquidationDate || now,
    REMARKS: String(payload.remarks || ""), STATUS: "SUBMITTED",
    REVIEWED_BY: "", REVIEWED_AT: ""
  });
  expenses.forEach(e => rcAppend_(ss, CONFIG.SHEETS.LIQUIDATION_DETAILS, {
    EXPENSE_ID: nextExpenseNumber_(company, now), LIQUIDATION_ID: liquidationId,
    EXPENSE_DATE: e.date || "", RECEIPT_NO: String(e.receiptReference || ""),
    DESCRIPTION: String(e.description).trim(), AMOUNT: Number(e.amount), ATTACHMENT_NO: ""
  }));
  const attachments = rcUploadFiles_(payload.files, company, liquidationNo, actor, {
    requestId: request.REQUEST_ID, requestNo: request.REQUEST_NO,
    liquidationId: liquidationId, liquidationNo: liquidationNo,
    documentType: "LIQUIDATION_RECEIPT"
  });
  return { success: true, message: "Liquidation submitted successfully.", liquidationNo: liquidationNo, attachments: attachments, totalExpenses: total, cashReturned: cashReturned, excessAmount: excess };
}

function requestCenterGetAccountingRequests(payload) {
  const actor = rcActor_(payload, ["ACCOUNTING"]);
  const companies = actor.companyAccess.length ? actor.companyAccess : [actor.company];
  let records = [];
  companies.forEach(company => {
    const ss = rcDb_(company);
    rcRows_(ss.getSheetByName(CONFIG.SHEETS.REQUESTS_MASTER)).forEach(r => records.push({
      requestNo:r.REQUEST_NO, date:r.REQUEST_DATE, requestor:r.REQUESTOR_NAME,
      amount:r.AMOUNT, details:r.DETAILS_PURPOSE, salesOrder:r.SO_NUMBER,
      projectClass:r.PROJECT_CLASS, department:r.DEPARTMENT, company:r.COMPANY,
      type:r.REQUEST_TYPE, status:r.STATUS, requestId:r.REQUEST_ID, recordType:"REQUEST"
    }));
    rcRows_(ss.getSheetByName(CONFIG.SHEETS.LIQUIDATION_MASTER)).forEach(r => records.push({
      requestNo:r.LIQUIDATION_NO, date:r.LIQUIDATION_DATE, requestor:r.REQUESTOR_NAME,
      amount:r.TOTAL_EXPENSES, details:"Liquidation for " + r.REQUEST_NO,
      salesOrder:"", projectClass:"", department:r.DEPARTMENT, company:r.COMPANY,
      type:"LIQUIDATION", status:r.STATUS, requestId:r.LIQUIDATION_ID, recordType:"LIQUIDATION"
    }));
  });
  records.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
  return { success: true, records: records };
}

function requestCenterUpdateStatus(payload) {
  const actor = rcActor_(payload, ["ADMIN","ACCOUNTING"]);
  const company = rcCompany_(payload.company, actor);
  const requestNo = String(payload.requestNo || "").trim();
  const recordType = String(payload.recordType || "REQUEST").toUpperCase();
  const status = String(payload.status || "").trim().toUpperCase();
  const allowed = ["SUBMITTED","FOR APPROVAL","FOR ACCOUNTING","PROCESSING","FOR PAYMENT","COMPLETED","RETURNED","REJECTED","APPROVED","RELEASED"];
  if (!requestNo || allowed.indexOf(status) < 0) throw new Error("Invalid record number or status.");
  const ss = rcDb_(company);
  const isLiq = recordType === "LIQUIDATION";
  const sheetName = isLiq ? CONFIG.SHEETS.LIQUIDATION_MASTER : CONFIG.SHEETS.REQUESTS_MASTER;
  const numberHeader = isLiq ? "LIQUIDATION_NO" : "REQUEST_NO";
  const sh = ss.getSheetByName(sheetName);
  const values = sh.getDataRange().getValues(), headers = values[0].map(String);
  const numberCol = headers.indexOf(numberHeader);
  const rowIndex = values.findIndex((r,i) => i > 0 && String(r[numberCol]) === requestNo);
  if (rowIndex < 1) throw new Error("Record not found.");
  sh.getRange(rowIndex + 1, headers.indexOf("STATUS") + 1).setValue(status);
  if (!isLiq && payload.approvedAmount !== undefined && payload.approvedAmount !== "") {
    const amount = Number(payload.approvedAmount);
    if (!isFinite(amount) || amount <= 0) throw new Error("Approved amount must be greater than zero.");
    sh.getRange(rowIndex + 1, headers.indexOf("APPROVED_AMOUNT") + 1).setValue(amount);
  }
  if (headers.indexOf("UPDATED_AT") >= 0) sh.getRange(rowIndex + 1, headers.indexOf("UPDATED_AT") + 1).setValue(new Date());
  if (isLiq) {
    if (headers.indexOf("REVIEWED_BY") >= 0) sh.getRange(rowIndex + 1, headers.indexOf("REVIEWED_BY") + 1).setValue(actor.name);
    if (headers.indexOf("REVIEWED_AT") >= 0) sh.getRange(rowIndex + 1, headers.indexOf("REVIEWED_AT") + 1).setValue(new Date());
  } else {
    if (status === "APPROVED" && headers.indexOf("APPROVED_DATE") >= 0) sh.getRange(rowIndex + 1, headers.indexOf("APPROVED_DATE") + 1).setValue(new Date());
    if (status === "RELEASED" && headers.indexOf("RELEASED_DATE") >= 0) sh.getRange(rowIndex + 1, headers.indexOf("RELEASED_DATE") + 1).setValue(new Date());
  }
  return { success:true, message:"Record status updated.", requestNo:requestNo, status:status };
}
