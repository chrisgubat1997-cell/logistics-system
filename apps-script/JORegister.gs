/* =========================================================
   LOGIS-TECH SYSTEM
   JO REGISTER
   Uses existing SALES_ORDERS records only.
   Access: active "admin" username with PRODUCTION role.
========================================================= */

function requireJORegisterAccess_(payload) {
  payload = payload || {};
  const token = String(payload.sessionToken || payload.session_token || "").trim();
  if (!token) throw new Error("Your login session is missing. Please log in again.");

  const cached = CacheService.getScriptCache().get("LOGISTECH_SESSION_" + token);
  if (!cached) throw new Error("Your login session expired. Please log in again.");

  let session;
  try {
    session = JSON.parse(cached);
  } catch (error) {
    throw new Error("Invalid login session. Please log in again.");
  }

  const sessionUsername = String(session.username || "").trim().toLowerCase();
  if (sessionUsername !== "admin") {
    throw new Error("Access denied. Only the authorized admin username may use JO Register.");
  }

  const sheet = getSheet(CONFIG.SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error("User account records are unavailable.");

  const headers = values[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
  const userIdIndex = headers.indexOf("USER_ID");
  const usernameIndex = headers.indexOf("USERNAME");
  const roleIndex = headers.indexOf("ROLE");
  const statusIndex = headers.indexOf("STATUS");
  if ([userIdIndex, usernameIndex, roleIndex, statusIndex].some(function(index) { return index < 0; })) {
    throw new Error("The USERS sheet is missing required authorization columns.");
  }

  let matched = null;
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const username = String(row[usernameIndex] || "").trim().toLowerCase();
    const userId = String(row[userIdIndex] || "").trim();
    if (username === sessionUsername && userId === String(session.userId || "").trim()) {
      matched = row;
      break;
    }
  }

  if (!matched) throw new Error("The logged-in user account could not be verified.");
  if (String(matched[statusIndex] || "").trim().toUpperCase() !== "ACTIVE") {
    throw new Error("This user account is not active.");
  }
  if (String(matched[roleIndex] || "").trim().toUpperCase() !== "PRODUCTION") {
    throw new Error("Access denied. JO Register requires the Production account type.");
  }

  return {
    userId: String(matched[userIdIndex] || ""),
    username: String(matched[usernameIndex] || "")
  };
}

function joRegisterHeaderIndex_(headers, candidates) {
  for (let i = 0; i < candidates.length; i++) {
    const index = headers.indexOf(candidates[i]);
    if (index >= 0) return index;
  }
  return -1;
}

function joRegisterDateValue_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE || "Asia/Manila", "yyyy-MM-dd");
  }
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(raw);
  return isNaN(parsed.getTime())
    ? ""
    : Utilities.formatDate(parsed, CONFIG.TIMEZONE || "Asia/Manila", "yyyy-MM-dd");
}

function getJORegisterData(payload) {
  try {
    const user = requireJORegisterAccess_(payload);
    const sheet = getSheet(CONFIG.SHEETS.SALES_ORDERS);
    const values = sheet.getDataRange().getValues();
    if (!values.length) return { success: true, salesOrders: [], count: 0 };

    const headers = values[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
    const soIndex = joRegisterHeaderIndex_(headers, ["SO_NUMBER"]);
    const joIndex = joRegisterHeaderIndex_(headers, ["JOB_ORDER", "JO"]);
    if (soIndex < 0) throw new Error("SO_NUMBER column was not found in SALES_ORDERS.");
    if (joIndex < 0) throw new Error("JOB_ORDER / JO column was not found in SALES_ORDERS.");

    const clientIndex = joRegisterHeaderIndex_(headers, ["CLIENT_NAME", "CLIENT"]);
    const projectIndex = joRegisterHeaderIndex_(headers, ["PROJECT"]);
    const poIndex = joRegisterHeaderIndex_(headers, ["PO_NUMBER", "PO"]);
    const createdIndex = joRegisterHeaderIndex_(headers, ["DATE_CREATION", "DATE"]);
    const dateIndex = joRegisterHeaderIndex_(headers, ["REQUIRED_DELIVERY_DATE", "REQUIRED_DEL_DATE", "RDD", "DELIVERY_DATE", "DEL_DATE"]);
    const idIndex = joRegisterHeaderIndex_(headers, ["SO_ID", "ID"]);
    const orders = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const soNumber = String(row[soIndex] || "").trim();
      if (!soNumber || String(row[joIndex] || "").trim()) continue;
      orders.push({
        soNumber: soNumber,
        soId: idIndex >= 0 ? String(row[idIndex] || "") : "",
        clientName: clientIndex >= 0 ? String(row[clientIndex] || "") : "",
        project: projectIndex >= 0 ? String(row[projectIndex] || "") : "",
        poNumber: poIndex >= 0 ? String(row[poIndex] || "") : "",
        dateCreation: createdIndex >= 0 ? joRegisterDateValue_(row[createdIndex]) : "",
        requiredDeliveryDate: dateIndex >= 0 ? joRegisterDateValue_(row[dateIndex]) : "",
        deliveryDateColumnAvailable: dateIndex >= 0
      });
    }

    orders.sort(function(a, b) { return a.soNumber.localeCompare(b.soNumber); });
    return {
      success: true,
      salesOrders: orders,
      count: orders.length,
      deliveryDateColumnAvailable: dateIndex >= 0,
      authorizedUser: user.username
    };
  } catch (error) {
    return { success: false, message: error.message || String(error), salesOrders: [], count: 0 };
  }
}

function updateJORegisterEntry(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    payload = payload || {};
    const user = requireJORegisterAccess_(payload);
    const soNumber = String(payload.soNumber || payload.SO_NUMBER || "").trim();
    const jobOrder = String(payload.jobOrder || payload.JOB_ORDER || "").trim();
    const deliveryDate = String(payload.deliveryDate || payload.requiredDeliveryDate || "").trim();

    if (!soNumber) throw new Error("Select a Sales Order.");
    if (!jobOrder) throw new Error("Enter the manual JO Number.");
    if (jobOrder.length > 100) throw new Error("JO Number must be 100 characters or fewer.");
    if (/[\r\n]/.test(jobOrder)) throw new Error("JO Number must be a single line.");

    let parsedDate = null;
    if (deliveryDate) {
      const match = deliveryDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) throw new Error("Enter a valid delivery date.");
      parsedDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
      if (parsedDate.getFullYear() !== Number(match[1]) ||
          parsedDate.getMonth() !== Number(match[2]) - 1 ||
          parsedDate.getDate() !== Number(match[3])) {
        throw new Error("Enter a valid delivery date.");
      }
    }

    const sheet = getSheet(CONFIG.SHEETS.SALES_ORDERS);
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) throw new Error("There are no Sales Order records.");

    const headers = values[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
    const soIndex = joRegisterHeaderIndex_(headers, ["SO_NUMBER"]);
    const joIndex = joRegisterHeaderIndex_(headers, ["JOB_ORDER", "JO"]);
    const dateIndex = joRegisterHeaderIndex_(headers, ["REQUIRED_DELIVERY_DATE", "REQUIRED_DEL_DATE", "RDD", "DELIVERY_DATE", "DEL_DATE"]);
    const updatedAtIndex = joRegisterHeaderIndex_(headers, ["UPDATED_DATE", "UPDATED_AT", "LAST_UPDATED"]);
    const updatedByIndex = joRegisterHeaderIndex_(headers, ["UPDATED_BY", "LAST_UPDATED_BY"]);
    if (soIndex < 0 || joIndex < 0) throw new Error("SO_NUMBER and JOB_ORDER columns are required in SALES_ORDERS.");
    if (deliveryDate && dateIndex < 0) throw new Error("A delivery-date column was not found in SALES_ORDERS. No changes were saved.");

    let targetRow = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][soIndex] || "").trim() === soNumber) {
        targetRow = i + 1;
        if (String(values[i][joIndex] || "").trim()) {
          throw new Error("This Sales Order already has a JO Number. Refresh the register before making changes.");
        }
        break;
      }
    }
    if (targetRow < 0) throw new Error("Sales Order not found: " + soNumber);

    const normalizedJO = jobOrder.toUpperCase();
    for (let i = 1; i < values.length; i++) {
      if (i + 1 === targetRow) continue;
      if (String(values[i][joIndex] || "").trim().toUpperCase() === normalizedJO) {
        throw new Error("JO Number already exists on another Sales Order. Enter a unique JO Number.");
      }
    }

    sheet.getRange(targetRow, joIndex + 1).setValue(jobOrder);
    if (deliveryDate && dateIndex >= 0) sheet.getRange(targetRow, dateIndex + 1).setValue(parsedDate);
    if (updatedAtIndex >= 0) sheet.getRange(targetRow, updatedAtIndex + 1).setValue(formatDateTime(new Date()));
    if (updatedByIndex >= 0) sheet.getRange(targetRow, updatedByIndex + 1).setValue(user.username);

    logActivity({
      userId: user.userId,
      username: user.username,
      action: "UPDATE",
      module: "JO Register",
      recordId: "",
      recordNumber: soNumber,
      details: "Assigned JO Number " + jobOrder + (deliveryDate ? " and updated delivery date to " + deliveryDate : ""),
      status: "SUCCESS"
    });
    touchSyncVersion();

    return {
      success: true,
      message: "JO Number saved successfully" + (deliveryDate ? " and delivery date updated." : "."),
      soNumber: soNumber,
      jobOrder: jobOrder,
      deliveryDate: deliveryDate
    };
  } catch (error) {
    return { success: false, message: error.message || String(error) };
  } finally {
    lock.releaseLock();
  }
}
