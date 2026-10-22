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
  payload = payload || {};
  const lock = LockService.getScriptLock();
  let lockAcquired = false;

  try {
    lock.waitLock(30000);
    lockAcquired = true;

    // Authenticate against the active server-side session, not client-supplied role fields.
    const user = requireProductionOrdersUser_(payload, ["ADMIN", "SALES"]);
    const soNumber = String(payload.soNumber || payload.SO_NUMBER || "").trim();
    if (!soNumber) throw new Error("SO Number is required.");

    const sheet = getSheet(CONFIG.SHEETS.SALES_ORDERS);
    const state = ensureProductionOrderColumns_(sheet);
    const headers = state.headers;
    const values = state.values;
    const index = function(names) {
      for (let i = 0; i < names.length; i++) {
        const found = headers.indexOf(names[i]);
        if (found >= 0) return found;
      }
      return -1;
    };

    const soIndex = index(["SO_NUMBER"]);
    const statusIndex = index(["STATUS"]);
    const clientIndex = index(["CLIENT_NAME", "CLIENT"]);
    const projectIndex = index(["PROJECT", "PROJECT_NAME"]);
    const poIndex = index(["PO_NUMBER", "PO"]);
    const rddIndex = index(["REQUIRED_DELIVERY_DATE", "REQUIRED_DEL_DATE", "RDD", "DELIVERY_DATE", "DEL_DATE"]);
    const postIndex = index(["POSTED_TO_PRODUCTION"]);
    const postedAtIndex = index(["PRODUCTION_POSTED_AT"]);
    const postedByIndex = index(["PRODUCTION_POSTED_BY"]);

    if (soIndex < 0) throw new Error("SO_NUMBER column was not found in SALES_ORDERS.");

    let target = -1;
    for (let i = 1; i < values.length; i++) {
      if (String(values[i][soIndex] || "").trim().toUpperCase() === soNumber.toUpperCase()) {
        target = i;
        break;
      }
    }
    if (target < 0) throw new Error("Sales Order not found: " + soNumber);

    const currentStatus = statusIndex >= 0
      ? String(values[target][statusIndex] || "").trim().toUpperCase()
      : "";
    if (currentStatus === "CANCELLED" || currentStatus === "CANCELED") {
      throw new Error("Cancelled Sales Orders cannot be posted to Production.");
    }
    if (String(values[target][postIndex] || "").trim().toUpperCase() === "POSTED") {
      throw new Error("Sales Order " + soNumber + " has already been posted to Production.");
    }

    const now = formatDateTime(new Date());
    const rowNumber = target + 1;

    // Commit the Production posting status first. Secondary notifications/logging
    // must not turn a successful posting into a misleading failure response.
    sheet.getRange(rowNumber, postIndex + 1, 1, 3).setValues([["POSTED", now, user.username]]);
    SpreadsheetApp.flush();

    const client = clientIndex >= 0 ? String(values[target][clientIndex] || "").trim() : "";
    const project = projectIndex >= 0 ? String(values[target][projectIndex] || "").trim() : "";
    const poNumber = poIndex >= 0 ? String(values[target][poIndex] || "").trim() : "";
    const rdd = rddIndex >= 0 ? productionOrdersDate_(values[target][rddIndex]) : "";
    const title = "New Sales Order posted";
    const message = "SO " + soNumber + " is ready for Production."
      + (client ? " Client: " + client + "." : "")
      + (rdd ? " RDD: " + rdd + "." : "")
      + (project ? " Project: " + project + "." : "")
      + (poNumber ? " PO: " + poNumber + "." : "");

    let notified = 0;
    let notificationWarning = "";
    try {
      const spreadsheet = sheet.getParent();
      const usersSheet = getSheet(CONFIG.SHEETS.USERS);
      const users = usersSheet.getDataRange().getValues();
      if (!users.length) throw new Error("USERS sheet has no header row.");

      const userHeaders = users[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
      const userIdIndex = userHeaders.indexOf("USER_ID");
      const usernameIndex = userHeaders.indexOf("USERNAME");
      const roleIndex = userHeaders.indexOf("ROLE");
      const userStatusIndex = userHeaders.indexOf("STATUS");
      if ([userIdIndex, usernameIndex, roleIndex, userStatusIndex].some(function(i) { return i < 0; })) {
        throw new Error("USERS sheet is missing USER_ID, USERNAME, ROLE, or STATUS.");
      }

      const notificationSheet = getProductionNotificationsSheet_(spreadsheet);
      const notificationValues = notificationSheet.getDataRange().getValues();
      const notificationHeaders = notificationValues[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
      const col = function(name) { return notificationHeaders.indexOf(name); };
      const required = ["NOTIFICATION_ID", "RECIPIENT_USER_ID", "RECIPIENT_USERNAME", "SO_NUMBER", "TITLE", "MESSAGE", "CREATED_AT", "READ_AT"];
      required.forEach(function(name) {
        if (col(name) < 0) throw new Error("PRODUCTION_NOTIFICATIONS is missing column " + name + ".");
      });

      const records = [];
      for (let i = 1; i < users.length; i++) {
        const row = users[i];
        const role = String(row[roleIndex] || "").trim().toUpperCase();
        const userStatus = String(row[userStatusIndex] || "").trim().toUpperCase();
        const recipientId = String(row[userIdIndex] || "").trim();
        const recipientUsername = String(row[usernameIndex] || "").trim();
        if (role !== "PRODUCTION" || userStatus !== "ACTIVE" || !recipientId || !recipientUsername) continue;

        const record = new Array(notificationHeaders.length).fill("");
        record[col("NOTIFICATION_ID")] = Utilities.getUuid();
        record[col("RECIPIENT_USER_ID")] = recipientId;
        record[col("RECIPIENT_USERNAME")] = recipientUsername;
        record[col("SO_NUMBER")] = soNumber;
        record[col("TITLE")] = title;
        record[col("MESSAGE")] = message;
        record[col("CREATED_AT")] = now;
        record[col("READ_AT")] = "";
        records.push(record);
      }

      if (records.length) {
        notificationSheet.getRange(
          notificationSheet.getLastRow() + 1,
          1,
          records.length,
          notificationHeaders.length
        ).setValues(records);
      }
      notified = records.length;
    } catch (notificationError) {
      notificationWarning = " Production posting succeeded, but notifications could not be created: "
        + (notificationError.message || String(notificationError));
      console.error("Production notification creation failed for " + soNumber + ": " + notificationWarning);
    }

    try {
      if (typeof logActivity === "function") {
        logActivity({
          userId: user.userId,
          username: user.username,
          action: "POST_TO_PRODUCTION",
          module: "Sales Order",
          recordId: "",
          recordNumber: soNumber,
          details: "Sales Order posted to Production; notifications created: " + notified,
          status: "SUCCESS"
        });
      }
    } catch (logError) {
      console.error("Production posting activity log failed for " + soNumber + ": " + (logError.message || String(logError)));
    }

    try {
      if (typeof touchSyncVersion === "function") touchSyncVersion();
    } catch (syncError) {
      console.error("Production posting sync-version update failed for " + soNumber + ": " + (syncError.message || String(syncError)));
    }

    return {
      success: true,
      message: "SO " + soNumber + " posted to Production. " + notified + " Production account notification(s) created." + notificationWarning,
      soNumber: soNumber,
      postedAt: now,
      postedBy: user.username,
      notified: notified,
      warning: notificationWarning
    };
  } catch (error) {
    console.error("postSalesOrderToProduction failed:", error);
    return { success: false, message: error.message || String(error), error: error.message || String(error) };
  } finally {
    if (lockAcquired) lock.releaseLock();
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
