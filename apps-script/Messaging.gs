/* =========================================================
   LOGIS-TECH SYSTEM
   MESSAGING DATABASE
   VERSION: 20261109-01

   All active registered users may view and reply to all SO
   conversations. Each SO has one permanent thread.
========================================================= */

const MESSAGING_ALLOWED_ROLES_ = [
  "ADMIN", "SALES", "LOGISTICS", "FINANCE", "PAYMENT", "PRODUCTION"
];

const MESSAGING_HEADERS_ = {
  MESSAGES_THREADS: [
    "THREAD_ID", "SO_ID", "SO_NUMBER", "SUBJECT", "CLIENT_NAME",
    "PROJECT", "STATUS", "CREATED_AT", "CREATED_BY",
    "LAST_MESSAGE_ID", "LAST_MESSAGE_AT", "LAST_MESSAGE_BY",
    "LAST_MESSAGE_PREVIEW", "MESSAGE_COUNT", "THREAD_TYPE"
  ],
  MESSAGES: [
    "MESSAGE_ID", "THREAD_ID", "SENDER_USER_ID", "SENDER_USERNAME",
    "SENDER_FULL_NAME", "MESSAGE_TYPE", "MESSAGE_BODY",
    "ATTACHMENT_ID", "ATTACHMENT_NAME", "SENT_AT",
    "EDITED_AT", "STATUS"
  ],
  MESSAGES_READ_STATUS: [
    "THREAD_ID", "USER_ID", "LAST_READ_MESSAGE_ID", "LAST_READ_AT"
  ],
  MESSAGES_PARTICIPANTS: [
    "THREAD_ID", "USER_ID", "ADDED_AT", "ADDED_BY", "STATUS"
  ]
};

/* Run once manually from Apps Script, or call the setup API action.
   Safe to run repeatedly: existing data is preserved. */
function setupMessagingDatabaseApi(payload) {
  authorizeRole_(payload, ["ADMIN"]);
  return setupMessagingDatabase();
}


function setupMessagingDatabase() {
  const ss = getDatabase();
  const created = [];

  Object.keys(MESSAGING_HEADERS_).forEach(function(sheetName) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      created.push(sheetName);
    }

    const expected = MESSAGING_HEADERS_[sheetName];
    const lastColumn = sheet.getLastColumn();

    if (lastColumn === 0 || sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, expected.length).setFontWeight("bold");
      return;
    }

    const current = sheet.getRange(1, 1, 1, Math.max(lastColumn, expected.length))
      .getValues()[0]
      .map(function(value) { return String(value || "").trim(); });

    expected.forEach(function(header, index) {
      if (current[index] && current[index] !== header) {
        throw new Error(
          "MESSAGING DATABASE: Unexpected header in " + sheetName +
          " column " + (index + 1) + ". Expected " + header +
          " but found " + current[index] + ". No data was changed."
        );
      }
      if (!current[index]) {
        sheet.getRange(1, index + 1).setValue(header);
      }
    });

    sheet.setFrozenRows(1);
  });

  const backfill = backfillSalesOrderMessageThreads_();

  return {
    success: true,
    message: "Messaging database is ready.",
    createdSheets: created,
    existingThreads: backfill.existing,
    createdThreads: backfill.created,
    totalSalesOrders: backfill.total
  };
}

/* Create a thread for every existing SO. Re-running this function
   will not create duplicates because SO_NUMBER is the unique key. */
function backfillSalesOrderMessageThreads_() {
  const orders = getAllRecords(CONFIG.SHEETS.SALES_ORDERS);
  let created = 0;
  let existing = 0;

  orders.forEach(function(order) {
    const soNumber = String(order.SO_NUMBER || "").trim();
    if (!soNumber) return;

    const result = ensureSalesOrderMessagingThread_(order);
    if (result.created) created++;
    else existing++;
  });

  return { created: created, existing: existing, total: orders.length };
}

/* Called by createSalesOrder after the SO master row is saved. */
function ensureSalesOrderMessagingThread_(salesOrder) {
  salesOrder = salesOrder || {};
  const soNumber = String(
    salesOrder.SO_NUMBER || salesOrder.soNumber || ""
  ).trim();

  if (!soNumber) throw new Error("SO_NUMBER is required to create a message thread.");

  const sheet = getSheet(CONFIG.SHEETS.MESSAGES_THREADS);
  const headers = MESSAGING_HEADERS_.MESSAGES_THREADS;
  const values = sheet.getDataRange().getValues();
  const soIndex = headers.indexOf("SO_NUMBER");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][soIndex] || "").trim().toUpperCase() === soNumber.toUpperCase()) {
      return { created: false, threadId: values[i][0] };
    }
  }

  const clientName = String(salesOrder.CLIENT_NAME || salesOrder.clientName || "");
  const project = String(salesOrder.PROJECT || salesOrder.project || "");
  const subjectParts = ["SO " + soNumber];
  if (clientName) subjectParts.push(clientName);
  if (project) subjectParts.push(project);

  const threadId = generateId("THR");
  const now = new Date();

  sheet.appendRow([
    threadId,
    salesOrder.SO_ID || salesOrder.soId || "",
    soNumber,
    subjectParts.join(" — "),
    clientName,
    project,
    "ACTIVE",
    now,
    salesOrder.CREATED_BY || salesOrder.createdBy || "SYSTEM",
    "",
    "",
    "",
    "",
    0,
    "SO"
  ]);

  return { created: true, threadId: threadId };
}

function getMessagingThreads(payload) {
  const account = authorizeRole_(payload, MESSAGING_ALLOWED_ROLES_);
  const readRows = getAllRecords(CONFIG.SHEETS.MESSAGES_READ_STATUS);
  const userReads = {};
  readRows.forEach(function(row) {
    if (String(row.USER_ID) === account.userId) userReads[String(row.THREAD_ID)] = row;
  });

  const participantIds = getMessagingParticipantThreadIds_(account.userId);
  const threads = getAllRecords(CONFIG.SHEETS.MESSAGES_THREADS)
    .filter(function(thread) {
      if (String(thread.STATUS || "ACTIVE").toUpperCase() !== "ACTIVE") return false;
      const type = String(thread.THREAD_TYPE || (thread.SO_NUMBER ? "SO" : "PRIVATE")).toUpperCase();
      return type === "SO" || participantIds[String(thread.THREAD_ID)] === true;
    })
    .sort(function(a, b) {
      return new Date(b.LAST_MESSAGE_AT || b.CREATED_AT || 0) -
             new Date(a.LAST_MESSAGE_AT || a.CREATED_AT || 0);
    });

  return {
    success: true,
    user: { userId: account.userId, username: account.username, role: account.role },
    threads: threads.slice(0, 200).map(function(thread) {
      const read = userReads[String(thread.THREAD_ID)];
      return {
        threadId: thread.THREAD_ID,
        threadType: String(thread.THREAD_TYPE || (thread.SO_NUMBER ? "SO" : "PRIVATE")).toUpperCase(),
        soId: thread.SO_ID,
        soNumber: thread.SO_NUMBER,
        subject: thread.SUBJECT,
        clientName: thread.CLIENT_NAME,
        project: thread.PROJECT,
        lastMessageId: thread.LAST_MESSAGE_ID,
        lastMessageAt: thread.LAST_MESSAGE_AT,
        lastMessageBy: thread.LAST_MESSAGE_BY,
        lastMessagePreview: thread.LAST_MESSAGE_PREVIEW,
        messageCount: Number(thread.MESSAGE_COUNT || 0),
        lastReadAt: read ? read.LAST_READ_AT : ""
      };
    }),
    count: threads.length
  };
}

function getMessagingMessages(payload) {
  const account = authorizeRole_(payload, MESSAGING_ALLOWED_ROLES_);
  const threadId = String(payload.threadId || "").trim();
  if (!threadId) throw new Error("THREAD_ID is required.");

  const thread = findRecord(CONFIG.SHEETS.MESSAGES_THREADS, "THREAD_ID", threadId);
  if (!thread) throw new Error("Conversation not found.");
  assertMessagingThreadAccess_(thread, account.userId);

  const limit = Math.min(Math.max(Number(payload.limit || 50), 1), 100);
  const all = getAllRecords(CONFIG.SHEETS.MESSAGES)
    .filter(function(message) {
      return String(message.THREAD_ID) === threadId &&
             String(message.STATUS || "ACTIVE").toUpperCase() === "ACTIVE";
    })
    .sort(function(a, b) {
      return new Date(a.SENT_AT) - new Date(b.SENT_AT);
    });

  const before = String(payload.beforeMessageId || "").trim();
  let end = all.length;
  if (before) {
    const beforeIndex = all.findIndex(function(message) {
      return String(message.MESSAGE_ID) === before;
    });
    if (beforeIndex >= 0) end = beforeIndex;
  }

  const start = Math.max(0, end - limit);
  const messages = all.slice(start, end).map(function(message) {
    return {
      messageId: message.MESSAGE_ID,
      threadId: message.THREAD_ID,
      senderUserId: message.SENDER_USER_ID,
      senderUsername: message.SENDER_USERNAME,
      senderFullName: message.SENDER_FULL_NAME,
      messageType: message.MESSAGE_TYPE,
      messageBody: message.MESSAGE_BODY,
      attachmentId: message.ATTACHMENT_ID,
      attachmentName: message.ATTACHMENT_NAME,
      sentAt: message.SENT_AT,
      editedAt: message.EDITED_AT
    };
  });

  return {
    success: true,
    thread: {
      threadId: thread.THREAD_ID,
      soNumber: thread.SO_NUMBER,
      subject: thread.SUBJECT,
      clientName: thread.CLIENT_NAME,
      project: thread.PROJECT
    },
    messages: messages,
    hasMore: start > 0,
    count: all.length,
    currentUserId: account.userId
  };
}

function sendMessagingMessage(payload) {
  const account = authorizeRole_(payload, MESSAGING_ALLOWED_ROLES_);
  const threadId = String(payload.threadId || "").trim();
  const body = String(payload.messageBody || payload.message || "").trim();

  if (!threadId) throw new Error("THREAD_ID is required.");
  if (!body) throw new Error("Message cannot be empty.");
  if (body.length > 5000) throw new Error("Message cannot exceed 5,000 characters.");

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const thread = findRecord(CONFIG.SHEETS.MESSAGES_THREADS, "THREAD_ID", threadId);
    if (!thread || String(thread.STATUS).toUpperCase() !== "ACTIVE") {
      throw new Error("Active conversation not found.");
    }
    assertMessagingThreadAccess_(thread, account.userId);

    const now = new Date();
    const messageId = generateId("MSG");
    const messageSheet = getSheet(CONFIG.SHEETS.MESSAGES);

    messageSheet.appendRow([
      messageId,
      threadId,
      account.userId,
      account.username,
      getMessagingFullName_(account.userId) || account.username,
      "TEXT",
      body,
      "",
      "",
      now,
      "",
      "ACTIVE"
    ]);

    updateMessagingThreadLastMessage_(threadId, {
      messageId: messageId,
      sentAt: now,
      senderName: getMessagingFullName_(account.userId) || account.username,
      preview: body
    });

    upsertMessagingReadStatus_(threadId, account.userId, messageId, now);

    return {
      success: true,
      message: "Message sent.",
      messageId: messageId,
      threadId: threadId,
      sentAt: formatDateTime(now)
    };
  } finally {
    lock.releaseLock();
  }
}

function markMessagingThreadRead(payload) {
  const account = authorizeRole_(payload, MESSAGING_ALLOWED_ROLES_);
  const threadId = String(payload.threadId || "").trim();
  if (!threadId) throw new Error("THREAD_ID is required.");

  const thread = findRecord(CONFIG.SHEETS.MESSAGES_THREADS, "THREAD_ID", threadId);
  if (!thread) throw new Error("Conversation not found.");
  assertMessagingThreadAccess_(thread, account.userId);

  const now = new Date();
  upsertMessagingReadStatus_(
    threadId,
    account.userId,
    String(thread.LAST_MESSAGE_ID || ""),
    now
  );

  return { success: true, threadId: threadId, lastReadAt: formatDateTime(now) };
}

function updateMessagingThreadLastMessage_(threadId, data) {
  const sheet = getSheet(CONFIG.SHEETS.MESSAGES_THREADS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error("Messaging thread was not found.");

  const headers = values[0].map(function(value) { return String(value).trim(); });
  const idIndex = headers.indexOf("THREAD_ID");
  const rowIndex = values.findIndex(function(row, index) {
    return index > 0 && String(row[idIndex]) === threadId;
  });
  if (rowIndex < 1) throw new Error("Messaging thread was not found.");

  function set(name, value) {
    const index = headers.indexOf(name);
    if (index >= 0) sheet.getRange(rowIndex + 1, index + 1).setValue(value);
  }

  set("LAST_MESSAGE_ID", data.messageId);
  set("LAST_MESSAGE_AT", data.sentAt);
  set("LAST_MESSAGE_BY", data.senderName);
  set("LAST_MESSAGE_PREVIEW", String(data.preview || "").replace(/\s+/g, " ").substring(0, 180));
  const countIndex = headers.indexOf("MESSAGE_COUNT");
  if (countIndex >= 0) {
    sheet.getRange(rowIndex + 1, countIndex + 1)
      .setValue(Number(values[rowIndex][countIndex] || 0) + 1);
  }
}

function upsertMessagingReadStatus_(threadId, userId, messageId, readAt) {
  const sheet = getSheet(CONFIG.SHEETS.MESSAGES_READ_STATUS);
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return String(value).trim(); });
  const threadIndex = headers.indexOf("THREAD_ID");
  const userIndex = headers.indexOf("USER_ID");
  const rowIndex = values.findIndex(function(row, index) {
    return index > 0 &&
      String(row[threadIndex]) === threadId &&
      String(row[userIndex]) === userId;
  });

  const row = [threadId, userId, messageId, readAt];
  if (rowIndex > 0) {
    sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}


/* =========================================================
   PRIVATE DIRECT MESSAGES
========================================================= */

function getMessagingUsers(payload) {
  const account = authorizeRole_(payload, MESSAGING_ALLOWED_ROLES_);
  const sheet = SpreadsheetApp.openById(AUTH_SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
  if (!sheet) throw new Error("USERS sheet not found.");
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, users: [] };

  const headers = values[0].map(function(value) { return String(value || "").trim().toUpperCase(); });
  const index = {
    id: headers.indexOf("USER_ID"),
    username: headers.indexOf("USERNAME"),
    name: headers.indexOf("FULL_NAME"),
    email: headers.indexOf("EMAIL"),
    role: headers.indexOf("ROLE"),
    status: headers.indexOf("STATUS")
  };
  if ([index.id,index.username,index.name,index.email,index.role,index.status].some(function(i){return i<0;})) {
    throw new Error("USERS sheet is missing required columns.");
  }

  const users = [];
  for (let i=1;i<values.length;i++) {
    const row=values[i];
    if (String(row[index.status] || "").trim().toUpperCase() !== "ACTIVE") continue;
    const userId=String(row[index.id] || "").trim();
    if (!userId || userId === account.userId) continue;
    users.push({
      userId:userId,
      username:String(row[index.username] || ""),
      fullName:String(row[index.name] || ""),
      email:String(row[index.email] || ""),
      role:String(row[index.role] || "")
    });
  }
  return { success:true, users:users };
}

function createPrivateMessageThread(payload) {
  const account = authorizeRole_(payload, MESSAGING_ALLOWED_ROLES_);
  const recipientId = String(payload.recipientUserId || payload.userId || "").trim();
  if (!recipientId) throw new Error("Select a recipient.");
  if (recipientId === account.userId) throw new Error("You cannot start a private conversation with yourself.");

  const users = getMessagingUsersInternal_();
  const recipient = users.filter(function(user){return user.userId === recipientId;})[0];
  if (!recipient) throw new Error("Recipient account was not found or is inactive.");

  const existing = getAllRecords(CONFIG.SHEETS.MESSAGES_THREADS);
  const participantMap = getMessagingParticipantMap_();
  for (let i=0;i<existing.length;i++) {
    const thread=existing[i];
    if (String(thread.THREAD_TYPE || "").toUpperCase() !== "PRIVATE" ||
        String(thread.STATUS || "ACTIVE").toUpperCase() !== "ACTIVE") continue;
    const ids = participantMap[String(thread.THREAD_ID)] || [];
    if (ids.length === 2 && ids.indexOf(account.userId)>=0 && ids.indexOf(recipientId)>=0) {
      return {success:true, threadId:thread.THREAD_ID, existing:true};
    }
  }

  const now=new Date();
  const threadId=generateId("THR");
  const subject=String(payload.subject || ("Private message: " + recipient.fullName)).trim().substring(0,160);
  const sheet=getSheet(CONFIG.SHEETS.MESSAGES_THREADS);
  sheet.appendRow([
    threadId, "", "", subject, "", "", "ACTIVE", now,
    account.username, "", "", "", "", 0, "PRIVATE"
  ]);

  addMessagingParticipant_(threadId, account.userId, account.userId, now);
  addMessagingParticipant_(threadId, recipientId, account.userId, now);

  return {success:true, threadId:threadId, existing:false};
}

function getMessagingUsersInternal_() {
  const sheet=SpreadsheetApp.openById(AUTH_SPREADSHEET_ID).getSheetByName(USERS_SHEET_NAME);
  if (!sheet) throw new Error("USERS sheet not found.");
  const values=sheet.getDataRange().getValues();
  if (values.length<2) return [];
  const headers=values[0].map(function(v){return String(v||"").trim().toUpperCase();});
  const idx={id:headers.indexOf("USER_ID"),username:headers.indexOf("USERNAME"),name:headers.indexOf("FULL_NAME"),status:headers.indexOf("STATUS")};
  return values.slice(1).filter(function(row){return String(row[idx.status]||"").toUpperCase()==="ACTIVE";}).map(function(row){
    return {userId:String(row[idx.id]||""),username:String(row[idx.username]||""),fullName:String(row[idx.name]||"")};
  });
}

function getMessagingFullName_(userId) {
  const user=getMessagingUsersInternal_().filter(function(item){return item.userId===userId;})[0];
  return user ? user.fullName : "";
}

function getMessagingParticipantMap_() {
  const rows=getAllRecords(CONFIG.SHEETS.MESSAGES_PARTICIPANTS);
  const map={};
  rows.forEach(function(row){
    if (String(row.STATUS||"ACTIVE").toUpperCase()!=="ACTIVE") return;
    const id=String(row.THREAD_ID||"");
    if (!map[id]) map[id]=[];
    map[id].push(String(row.USER_ID||""));
  });
  return map;
}

function getMessagingParticipantThreadIds_(userId) {
  const map={};
  getAllRecords(CONFIG.SHEETS.MESSAGES_PARTICIPANTS).forEach(function(row){
    if (String(row.USER_ID)===userId && String(row.STATUS||"ACTIVE").toUpperCase()==="ACTIVE") {
      map[String(row.THREAD_ID)]=true;
    }
  });
  return map;
}

function addMessagingParticipant_(threadId,userId,addedBy,addedAt) {
  const sheet=getSheet(CONFIG.SHEETS.MESSAGES_PARTICIPANTS);
  const rows=getAllRecords(CONFIG.SHEETS.MESSAGES_PARTICIPANTS);
  const exists=rows.some(function(row){
    return String(row.THREAD_ID)===threadId && String(row.USER_ID)===userId &&
      String(row.STATUS||"ACTIVE").toUpperCase()==="ACTIVE";
  });
  if (!exists) sheet.appendRow([threadId,userId,addedAt||new Date(),addedBy,"ACTIVE"]);
}

function assertMessagingThreadAccess_(thread,userId) {
  const type=String(thread.THREAD_TYPE || (thread.SO_NUMBER ? "SO" : "PRIVATE")).toUpperCase();
  if (type==="SO") return true;
  const participants=getMessagingParticipantThreadIds_(userId);
  if (!participants[String(thread.THREAD_ID)]) {
    throw new Error("ACCESS_DENIED: You are not a participant in this private conversation.");
  }
  return true;
}
