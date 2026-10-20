/* =========================================================
   LOGIS-TECH SYSTEM
   PRODUCTION QUEUE + IN-APP NOTIFICATIONS
   ========================================================= */

function requireProductionOrdersUser_(payload, allowedRoles) {
  payload = payload || {};
  const token = String(payload.sessionToken || payload.session_token || "").trim();
  if (!token) throw new Error("Your login session is missing. Please log in again.");
  const cached = CacheService.getScriptCache().get("LOGISTECH_SESSION_" + token);
  if (!cached) throw new Error("Your login session expired. Please log in again.");
  let session;
  try { session = JSON.parse(cached); }
  catch (error) { throw new Error("Invalid login session. Please log in again."); }
  const sessionUsername = String(session.username || "").trim().toLowerCase();
  const sessionUserId = String(session.userId || "").trim();
  if (!sessionUsername || !sessionUserId) throw new Error("Invalid login session. Please log in again.");

  const usersSheet = getSheet(CONFIG.SHEETS.USERS);
  const users = usersSheet.getDataRange().getValues();
  if (users.length < 2) throw new Error("User account records are unavailable.");
  const headers = users[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
  const userIdIndex = headers.indexOf("USER_ID");
  const usernameIndex = headers.indexOf("USERNAME");
  const roleIndex = headers.indexOf("ROLE");
  const statusIndex = headers.indexOf("STATUS");
  if ([userIdIndex, usernameIndex, roleIndex, statusIndex].some(function(index) { return index < 0; })) {
    throw new Error("The USERS sheet is missing required authorization columns.");
  }
  let matched = null;
  for (let i = 1; i < users.length; i++) {
    if (String(users[i][usernameIndex] || "").trim().toLowerCase() === sessionUsername &&
        String(users[i][userIdIndex] || "").trim() === sessionUserId) {
      matched = users[i];
      break;
    }
  }
  if (!matched) throw new Error("The logged-in user account could not be verified.");
  if (String(matched[statusIndex] || "").trim().toUpperCase() !== "ACTIVE") throw new Error("This user account is not active.");
  const role = String(matched[roleIndex] || "").trim().toUpperCase();
  if (allowedRoles.indexOf(role) < 0) throw new Error("Access denied for this Production Orders action.");
  return { userId: String(matched[userIdIndex] || ""), username: String(matched[usernameIndex] || ""), role: role };
}

function ensureProductionOrderColumns_(sheet) {
  let values = sheet.getDataRange().getValues();
  if (!values.length) throw new Error("SALES_ORDERS has no header row.");
  let headers = values[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
  ["POSTED_TO_PRODUCTION", "PRODUCTION_POSTED_AT", "PRODUCTION_POSTED_BY"].forEach(function(name) {
    if (headers.indexOf(name) < 0) {
      sheet.getRange(1, headers.length + 1).setValue(name);
      headers.push(name);
    }
  });
  values = sheet.getDataRange().getValues();
  headers = values[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
  return { values: values, headers: headers };
}

function getProductionNotificationsSheet_(spreadsheet) {
  const name = "PRODUCTION_NOTIFICATIONS";
  let sheet = spreadsheet.getSheetByName(name);
  const requiredHeaders = ["NOTIFICATION_ID", "RECIPIENT_USER_ID", "RECIPIENT_USERNAME", "SO_NUMBER", "TITLE", "MESSAGE", "CREATED_AT", "READ_AT"];
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    sheet.setFrozenRows(1);
    return sheet;
  }
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
  requiredHeaders.forEach(function(header) {
    if (headers.indexOf(header) < 0) {
      sheet.getRange(1, headers.length + 1).setValue(header);
      headers.push(header);
    }
  });
  return sheet;
}

function postSalesOrderToProduction(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    payload = payload || {};
    const user = requireProductionOrdersUser_(payload, ["ADMIN", "SALES"]);
    const soNumber = String(payload.soNumber || payload.SO_NUMBER || "").trim();
    if (!soNumber) throw new Error("SO Number is required.");
    const sheet = getSheet(CONFIG.SHEETS.SALES_ORDERS);
    const state = ensureProductionOrderColumns_(sheet);
    const headers = state.headers;
    const values = state.values;
    const soIndex = headers.indexOf("SO_NUMBER");
    const statusIndex = headers.indexOf("STATUS");
    const clientIndex = headers.indexOf("CLIENT_NAME") >= 0 ? headers.indexOf("CLIENT_NAME") : headers.indexOf("CLIENT");
    const projectIndex = headers.indexOf("PROJECT");
    const poIndex = headers.indexOf("PO_NUMBER");
    const rddIndex = ["REQUIRED_DELIVERY_DATE", "REQUIRED_DEL_DATE", "RDD", "DELIVERY_DATE", "DEL_DATE"].map(function(name) { return headers.indexOf(name); }).filter(function(index) { return index >= 0; })[0];
    if (soIndex < 0) throw new Error("SO_NUMBER column was not found in SALES_ORDERS.");
    let target = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][soIndex] || "").trim().toUpperCase() === soNumber.toUpperCase()) { target = i; break; }
    }
    if (target < 0) throw new Error("Sales Order not found: " + soNumber);
    if (statusIndex >= 0 && String(values[target][statusIndex] || "").trim().toUpperCase() === "CANCELLED") {
      throw new Error("Cancelled Sales Orders cannot be posted to Production.");
    }
    const postIndex = headers.indexOf("POSTED_TO_PRODUCTION");
    const postedAtIndex = headers.indexOf("PRODUCTION_POSTED_AT");
    const postedByIndex = headers.indexOf("PRODUCTION_POSTED_BY");
    if (String(values[target][postIndex] || "").trim().toUpperCase() === "POSTED") {
      throw new Error("Sales Order " + soNumber + " has already been posted to Production.");
    }
    const spreadsheet = sheet.getParent();
    const usersSheet = getSheet(CONFIG.SHEETS.USERS);
    const users = usersSheet.getDataRange().getValues();
    const userHeaders = users[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
    const userIdIndex = userHeaders.indexOf("USER_ID");
    const usernameIndex = userHeaders.indexOf("USERNAME");
    const roleIndex = userHeaders.indexOf("ROLE");
    const statusUserIndex = userHeaders.indexOf("STATUS");
    const now = formatDateTime(new Date());
    sheet.getRange(target + 1, postIndex + 1).setValue("POSTED");
    sheet.getRange(target + 1, postedAtIndex + 1).setValue(now);
    sheet.getRange(target + 1, postedByIndex + 1).setValue(user.username);

    const notificationSheet = getProductionNotificationsSheet_(spreadsheet);
    const notificationValues = notificationSheet.getDataRange().getValues();
    const notificationHeaders = notificationValues[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
    const col = function(name) { return notificationHeaders.indexOf(name); };
    const rdd = rddIndex >= 0 ? productionOrdersDate_(values[target][rddIndex]) : "";
    const client = clientIndex >= 0 ? String(values[target][clientIndex] || "") : "";
    const project = projectIndex >= 0 ? String(values[target][projectIndex] || "") : "";
    const poNumber = poIndex >= 0 ? String(values[target][poIndex] || "") : "";
    const title = "New Sales Order posted";
    const message = "SO " + soNumber + " is ready for Production." + (client ? " Client: " + client + "." : "") + (rdd ? " RDD: " + rdd + "." : "") + (project ? " Project: " + project + "." : "") + (poNumber ? " PO: " + poNumber + "." : "");
    let notified = 0;
    for (let i = 1; i < users.length; i++) {
      const row = users[i];
      const role = roleIndex >= 0 ? String(row[roleIndex] || "").trim().toUpperCase() : "";
      const status = statusUserIndex >= 0 ? String(row[statusUserIndex] || "").trim().toUpperCase() : "";
      const recipientId = userIdIndex >= 0 ? String(row[userIdIndex] || "").trim() : "";
      const recipientUsername = usernameIndex >= 0 ? String(row[usernameIndex] || "").trim() : "";
      if (role !== "PRODUCTION" || status !== "ACTIVE" || !recipientId || !recipientUsername) continue;
      const record = new Array(notificationHeaders.length).fill("");
      record[col("NOTIFICATION_ID")] = Utilities.getUuid();
      record[col("RECIPIENT_USER_ID")] = recipientId;
      record[col("RECIPIENT_USERNAME")] = recipientUsername;
      record[col("SO_NUMBER")] = soNumber;
      record[col("TITLE")] = title;
      record[col("MESSAGE")] = message;
      record[col("CREATED_AT")] = now;
      record[col("READ_AT")] = "";
      notificationSheet.appendRow(record);
      notified++;
    }
    if (typeof logActivity === "function") {
      logActivity({ userId: user.userId, username: user.username, action: "POST_TO_PRODUCTION", module: "Sales Order", recordId: "", recordNumber: soNumber, details: "Sales Order posted to Production; notifications created: " + notified, status: "SUCCESS" });
    }
    if (typeof touchSyncVersion === "function") touchSyncVersion();
    return { success: true, message: "SO " + soNumber + " posted to Production. " + notified + " Production account notification(s) created.", soNumber: soNumber, postedAt: now, notified: notified };
  } catch (error) {
    return { success: false, message: error.message || String(error) };
  } finally {
    lock.releaseLock();
  }
}

function productionOrdersDate_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) return Utilities.formatDate(value, CONFIG.TIMEZONE || "Asia/Manila", "yyyy-MM-dd");
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = new Date(raw);
  return isNaN(parsed.getTime()) ? "" : Utilities.formatDate(parsed, CONFIG.TIMEZONE || "Asia/Manila", "yyyy-MM-dd");
}

function getProductionQueue(payload) {
  try {
    const user = requireProductionOrdersUser_(payload, ["ADMIN", "PRODUCTION"]);
    const sheet = getSheet(CONFIG.SHEETS.SALES_ORDERS);
    const state = ensureProductionOrderColumns_(sheet);
    const headers = state.headers;
    const values = state.values;
    const index = function(names) {
      for (let i = 0; i < names.length; i++) { const found = headers.indexOf(names[i]); if (found >= 0) return found; }
      return -1;
    };
    const soIndex = index(["SO_NUMBER"]);
    const postIndex = index(["POSTED_TO_PRODUCTION"]);
    const postedAtIndex = index(["PRODUCTION_POSTED_AT"]);
    const postedByIndex = index(["PRODUCTION_POSTED_BY"]);
    const clientIndex = index(["CLIENT_NAME", "CLIENT"]);
    const projectIndex = index(["PROJECT"]);
    const poIndex = index(["PO_NUMBER", "PO"]);
    const dateIndex = index(["DATE_CREATION", "DATE"]);
    const rddIndex = index(["REQUIRED_DELIVERY_DATE", "REQUIRED_DEL_DATE", "RDD", "DELIVERY_DATE", "DEL_DATE"]);
    const orders = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const soNumber = soIndex >= 0 ? String(row[soIndex] || "").trim() : "";
      if (!soNumber || String(row[postIndex] || "").trim().toUpperCase() !== "POSTED") continue;
      orders.push({
        soNumber: soNumber,
        clientName: clientIndex >= 0 ? String(row[clientIndex] || "") : "",
        project: projectIndex >= 0 ? String(row[projectIndex] || "") : "",
        poNumber: poIndex >= 0 ? String(row[poIndex] || "") : "",
        dateCreation: dateIndex >= 0 ? productionOrdersDate_(row[dateIndex]) : "",
        requiredDeliveryDate: rddIndex >= 0 ? productionOrdersDate_(row[rddIndex]) : "",
        postedAt: postedAtIndex >= 0 ? String(row[postedAtIndex] || "") : "",
        postedBy: postedByIndex >= 0 ? String(row[postedByIndex] || "") : ""
      });
    }
    orders.sort(function(a, b) { return String(b.postedAt).localeCompare(String(a.postedAt)); });
    const notificationSheet = getProductionNotificationsSheet_(sheet.getParent());
    const notificationValues = notificationSheet.getDataRange().getValues();
    const notificationHeaders = notificationValues[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
    const nIndex = function(name) { return notificationHeaders.indexOf(name); };
    const notifications = [];
    let unreadCount = 0;
    for (let i = 1; i < notificationValues.length; i++) {
      const row = notificationValues[i];
      const recipientId = String(row[nIndex("RECIPIENT_USER_ID")] || "").trim();
      if (recipientId !== user.userId) continue;
      const readAt = String(row[nIndex("READ_AT")] || "").trim();
      if (!readAt) unreadCount++;
      notifications.push({
        notificationId: String(row[nIndex("NOTIFICATION_ID")] || ""),
        soNumber: String(row[nIndex("SO_NUMBER")] || ""),
        title: String(row[nIndex("TITLE")] || ""),
        message: String(row[nIndex("MESSAGE")] || ""),
        createdAt: String(row[nIndex("CREATED_AT")] || ""),
        readAt: readAt
      });
    }
    notifications.sort(function(a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    return { success: true, orders: orders, count: orders.length, notifications: notifications.slice(0, 100), unreadCount: unreadCount, authorizedUser: user.username };
  } catch (error) {
    return { success: false, message: error.message || String(error), orders: [], count: 0, notifications: [], unreadCount: 0 };
  }
}

function markProductionNotificationsRead(payload) {
  try {
    const user = requireProductionOrdersUser_(payload, ["ADMIN", "PRODUCTION"]);
    const soSheet = getSheet(CONFIG.SHEETS.SALES_ORDERS);
    const sheet = getProductionNotificationsSheet_(soSheet.getParent());
    const values = sheet.getDataRange().getValues();
    const headers = values[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
    const recipientIndex = headers.indexOf("RECIPIENT_USER_ID");
    const readIndex = headers.indexOf("READ_AT");
    const now = formatDateTime(new Date());
    let updated = 0;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][recipientIndex] || "").trim() === user.userId && !String(values[i][readIndex] || "").trim()) {
        sheet.getRange(i + 1, readIndex + 1).setValue(now);
        updated++;
      }
    }
    return { success: true, message: updated + " notification(s) marked as read.", updated: updated };
  } catch (error) {
    return { success: false, message: error.message || String(error) };
  }
}
