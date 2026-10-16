/* =========================================================
   LOGIS-TECH SYSTEM
   REVOLVING FUND API
   Reads and writes the REVOLVING_FUND_* sheets.
========================================================= */

const RF_GROUP_HEADERS = [
  "REPLENISHMENT_NO", "PERIOD_FROM", "PERIOD_TO", "FUND_AMOUNT",
  "CUSTODIAN", "DEPARTMENT", "PROJECT_SOF", "PREVIOUS_REPLENISHMENT",
  "STATUS", "CREATED_AT", "CREATED_BY"
];
const RF_TX_HEADERS = [
  "TRANSACTION_ID", "REPLENISHMENT_NO", "TRANSACTION_DATE",
  "TRANSACTION_TYPE", "PERSON", "RELATED_CA_ID", "AMOUNT",
  "CATEGORY", "DETAILS", "SO_REFERENCE", "DOCUMENT_NO",
  "STATUS", "CREATED_AT", "CREATED_BY", "PURPOSE"
];
const RF_SETTING_HEADERS = ["SETTING_KEY", "SETTING_VALUE", "UPDATED_AT", "UPDATED_BY"];

function getRevolvingFundData(payload) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE_SPREADSHEET_ID);
  const groupRows = rfReadSheet(ss, "REVOLVING_FUND_GROUPS", RF_GROUP_HEADERS);
  const txRows = rfReadSheet(ss, "REVOLVING_FUND_TRANSACTIONS", RF_TX_HEADERS);
  const settings = rfReadSettings(ss);
  const groups = groupRows.map(rfGroupObject).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const transactions = txRows.map(rfTransactionObject).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const liquidatedByCA = {};
  transactions.forEach(t => {
    if (rfNormalizeType(t.transactionType) === "LIQUIDATION" && t.relatedCaId) {
      const id = String(t.relatedCaId);
      liquidatedByCA[id] = (liquidatedByCA[id] || 0) + Number(t.amount || 0);
    }
  });
  const cashAdvances = transactions.filter(t => rfNormalizeType(t.transactionType) === "CASH ADVANCE").map(ca => {
    const original = Number(ca.amount || 0);
    const liquidated = Math.min(original, Number(liquidatedByCA[String(ca.transactionId)] || 0));
    const balance = Math.max(0, original - liquidated);
    return Object.assign({}, ca, {
      originalAmount: original,
      liquidatedAmount: liquidated,
      remainingBalance: balance,
      status: balance <= 0 ? "LIQUIDATED" : (liquidated > 0 ? "PARTIALLY LIQUIDATED" : "UNLIQUIDATED")
    });
  }).filter(ca => ca.remainingBalance > 0);
  const active = groups.find(g => String(g.status).toUpperCase() !== "CLOSED") || groups[0] || null;
  const currentGroup = payload && payload.replenishmentNo
    ? groups.find(g => g.replenishmentNo === String(payload.replenishmentNo)) || active
    : active;
  const groupNo = currentGroup ? currentGroup.replenishmentNo : "";
  const groupTx = transactions.filter(t => t.replenishmentNo === groupNo);
  const expenses = groupTx.filter(t => ["LIQUIDATION","REIMBURSEMENT","DIRECT EXPENSE"].indexOf(rfNormalizeType(t.transactionType)) >= 0)
    .reduce((sum,t) => sum + Number(t.amount || 0), 0);
  const outstanding = cashAdvances.reduce((sum,ca) => sum + Number(ca.remainingBalance || 0), 0);
  const previousNotReceived = Number(rfSetting(settings, ["PREVIOUS_REPLENISHMENT_NOT_RECEIVED","PREVIOUS_REPLENISHMENT_AMOUNT"], 0)) || 0;
  const fundAmount = currentGroup ? Number(currentGroup.fundAmount || 0) : 0;
  const summary = {
    fundAmount: fundAmount,
    totalExpenses: expenses,
    unliquidatedCashAdvance: outstanding,
    previousReplenishmentNotReceived: previousNotReceived,
    actualCashOnHand: fundAmount - expenses - outstanding - previousNotReceived,
    custodian: currentGroup ? currentGroup.custodian : "",
    period: currentGroup ? [currentGroup.periodFrom, currentGroup.periodTo].filter(Boolean).join(" – ") : ""
  };
  return {
    success: true,
    groups: groups,
    transactions: transactions,
    cashAdvances: cashAdvances,
    currentGroup: groupNo,
    summary: summary
  };
}

function saveRevolvingFundTransaction(payload) {
  payload = payload || {};
  const type = rfNormalizeType(payload.transactionType);
  if (["CASH ADVANCE","LIQUIDATION","REIMBURSEMENT","DIRECT EXPENSE"].indexOf(type) < 0) throw new Error("Unsupported transaction type.");
  const groupNo = String(payload.replenishmentNo || "").trim();
  const date = String(payload.transactionDate || "").trim();
  const person = String(payload.person || "").trim();
  const items = Array.isArray(payload.items) ? payload.items : [{purpose:payload.purpose,category:payload.category,details:payload.details,amount:payload.amount}];
  if (!groupNo || !date || !person || !items.length) throw new Error("Complete transaction date, person, replenishment, and at least one item.");
  const normalizedItems = items.map((item,i)=>({purpose:String(item.purpose||"").trim(),category:String(item.category||"").trim(),details:String(item.details||"").trim(),amount:Number(item.amount),index:i+1}));
  if (normalizedItems.some(x=>!x.purpose||!x.details||!isFinite(x.amount)||x.amount<=0)) throw new Error("Every item needs a Purpose, details, and amount greater than zero.");
  if (["LIQUIDATION","REIMBURSEMENT","DIRECT EXPENSE"].indexOf(type)>=0 && normalizedItems.some(x=>!x.category)) throw new Error("Select an Expense Classification for every expense item.");
  const total = normalizedItems.reduce((sum,x)=>sum+x.amount,0);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(CONFIG.DATABASE_SPREADSHEET_ID);
    const groupRows = rfReadSheet(ss, "REVOLVING_FUND_GROUPS", RF_GROUP_HEADERS);
    const group = groupRows.map(rfGroupObject).find(g=>g.replenishmentNo===groupNo);
    if (!group) throw new Error("Replenishment group not found: "+groupNo);
    if (String(group.status).toUpperCase()==="CLOSED") throw new Error("This replenishment is closed. Select the active replenishment before saving.");
    const txSheet = rfEnsureSheet(ss, "REVOLVING_FUND_TRANSACTIONS", RF_TX_HEADERS);
    const existing = rfReadSheet(ss, "REVOLVING_FUND_TRANSACTIONS", RF_TX_HEADERS).map(rfTransactionObject);
    let relatedCaId = "";
    if (type==="LIQUIDATION") {
      relatedCaId = String(payload.relatedCaId||"").trim();
      if (!relatedCaId) throw new Error("Select LIQUIDATE from the Unliquidated Cash Advances table to link this liquidation to its original CA.");
      const ca = existing.find(t=>String(t.transactionId)===relatedCaId && rfNormalizeType(t.transactionType)==="CASH ADVANCE");
      if (!ca) throw new Error("The original Cash Advance could not be found. Refresh the page and try again.");
      const alreadyLiquidated = existing.filter(t=>rfNormalizeType(t.transactionType)==="LIQUIDATION" && String(t.relatedCaId)===relatedCaId).reduce((sum,t)=>sum+Number(t.amount||0),0);
      const remaining = Math.max(0,Number(ca.amount||0)-alreadyLiquidated);
      if (total>remaining+0.005) throw new Error("Total liquidation amount exceeds the remaining CA balance of ₱"+remaining.toFixed(2)+".");
    }
    const now = new Date();
    const rows = normalizedItems.map((item,i)=>[
      "RF-TXN-"+Utilities.formatDate(now,CONFIG.TIMEZONE||"Asia/Manila","yyyyMMdd-HHmmss")+"-"+Math.floor(Math.random()*9000+1000)+"-"+(i+1),
      groupNo,date,rfDisplayType(type),person,relatedCaId,item.amount,item.category,
      item.details,"","",type==="CASH ADVANCE"?"UNLIQUIDATED":"RECORDED",now,String(payload.createdBy||"SYSTEM"),item.purpose
    ]);
    const startRow=txSheet.getLastRow()+1;
    txSheet.getRange(startRow,1,rows.length,rows[0].length).setValues(rows);
    return {success:true,transactionIds:rows.map(r=>r[0]),itemCount:rows.length,totalAmount:total,message:"Revolving Fund items saved."};
  } finally { lock.releaseLock(); }
}
function createRevolvingFundReplenishment(payload) {
  payload = payload || {};
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.openById(CONFIG.DATABASE_SPREADSHEET_ID);
    const sheet = rfEnsureSheet(ss, "REVOLVING_FUND_GROUPS", RF_GROUP_HEADERS);
    const rows = rfReadSheet(ss, "REVOLVING_FUND_GROUPS", RF_GROUP_HEADERS);
    const groups = rows.map(rfGroupObject);
    let prior = groups.find(g => g.replenishmentNo === String(payload.previousReplenishmentNo || ""));
    if (!prior) prior = groups.find(g => String(g.status).toUpperCase() !== "CLOSED") || groups[0] || null;
    if (payload.closeCurrentGroup && prior && String(prior.status).toUpperCase() !== "CLOSED") {
      const headerMap = rfHeaderMap(sheet);
      const rowIndex = prior._rowIndex;
      const statusCol = headerMap.STATUS;
      if (statusCol != null) sheet.getRange(rowIndex, statusCol + 1).setValue("CLOSED");
      const periodToCol = headerMap.PERIOD_TO;
      if (periodToCol != null) sheet.getRange(rowIndex, periodToCol + 1).setValue(new Date());
    }
    const settings = rfReadSettings(ss);
    const fundSetting = rfSetting(settings, ["FUND_AMOUNT","REVOLVING_FUND_AMOUNT","RF_FUND_AMOUNT"], prior ? prior.fundAmount : "");
    const fundAmount = Number(fundSetting);
    if (!isFinite(fundAmount) || fundAmount <= 0) throw new Error("Set FUND_AMOUNT in REVOLVING_FUND_SETTINGS before creating a replenishment.");
    const nextNo = rfNextReplenishmentNo(groups);
    const now = new Date();
    sheet.appendRow([
      nextNo, now, "", fundAmount,
      rfSetting(settings, ["CUSTODIAN"], prior ? prior.custodian : ""),
      rfSetting(settings, ["DEPARTMENT"], prior ? prior.department : "LOGISTICS"),
      rfSetting(settings, ["PROJECT_SOF","PROJECT"], prior ? prior.projectSof : ""),
      prior ? prior.replenishmentNo : "",
      "ACTIVE", now, String(payload.createdBy || "SYSTEM")
    ]);
    return { success: true, replenishmentNo: nextNo, message: "Replenishment group created." };
  } finally {
    lock.releaseLock();
  }
}

function rfReadSheet(ss, name, headers) {
  const sheet = rfEnsureSheet(ss, name, headers);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const header = values[0].map(v => String(v).trim().toUpperCase());
  return values.slice(1).map((row,i) => {
    const obj = {};
    header.forEach((h,j) => { if (h) obj[h] = row[j]; });
    obj.__rowIndex = i + 2;
    return obj;
  }).filter(obj => Object.keys(obj).some(k => k !== "__rowIndex" && obj[k] !== "" && obj[k] != null));
}
function rfEnsureSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return sheet;
  }
  const lastCol = Math.max(1, sheet.getLastColumn());
  const existing = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(v => String(v).trim().toUpperCase());
  const missing = headers.filter(h => existing.indexOf(String(h).trim().toUpperCase()) < 0);
  if (missing.length) sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  return sheet;
}
function rfHeaderMap(sheet) {
  const row = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
  const map = {};
  row.forEach((v,i) => map[String(v).trim().toUpperCase()] = i);
  return map;
}
function rfGroupObject(r) {
  return {
    replenishmentNo: String(r.REPLENISHMENT_NO || ""),
    periodFrom: rfDateString(r.PERIOD_FROM),
    periodTo: rfDateString(r.PERIOD_TO),
    period: [rfDateString(r.PERIOD_FROM),rfDateString(r.PERIOD_TO)].filter(Boolean).join(" – "),
    fundAmount: Number(r.FUND_AMOUNT || 0),
    custodian: String(r.CUSTODIAN || ""),
    department: String(r.DEPARTMENT || ""),
    projectSof: String(r.PROJECT_SOF || ""),
    previousReplenishment: String(r.PREVIOUS_REPLENISHMENT || ""),
    status: String(r.STATUS || "ACTIVE"),
    createdAt: rfDateString(r.CREATED_AT),
    createdBy: String(r.CREATED_BY || ""),
    _rowIndex: r.__rowIndex
  };
}
function rfTransactionObject(r) {
  return {
    transactionId: String(r.TRANSACTION_ID || ""),
    replenishmentNo: String(r.REPLENISHMENT_NO || ""),
    transactionDate: rfDateString(r.TRANSACTION_DATE),
    transactionType: String(r.TRANSACTION_TYPE || ""),
    person: String(r.PERSON || ""),
    relatedCaId: String(r.RELATED_CA_ID || ""),
    amount: Number(r.AMOUNT || 0),
    category: String(r.CATEGORY || ""),
    purpose: String(r.PURPOSE || ""),
    details: String(r.DETAILS || ""),
    soReference: String(r.SO_REFERENCE || ""),
    documentNo: String(r.DOCUMENT_NO || ""),
    status: String(r.STATUS || ""),
    createdAt: rfDateString(r.CREATED_AT),
    createdBy: String(r.CREATED_BY || ""),
    _rowIndex: r.__rowIndex
  };
}
function rfReadSettings(ss) {
  const sheet = ss.getSheetByName("REVOLVING_FUND_SETTINGS");
  if (!sheet || sheet.getLastRow() < 2) return {};
  const values = sheet.getDataRange().getValues();
  const out = {};
  values.slice(1).forEach(r => {
    const key = String(r[0] || "").trim().toUpperCase();
    if (key) out[key] = r[1];
  });
  return out;
}
function rfSetting(settings, keys, fallback) {
  for (let i=0;i<keys.length;i++) {
    const k = keys[i].toUpperCase();
    if (settings[k] !== undefined && settings[k] !== "") return settings[k];
  }
  return fallback;
}
function rfNormalizeType(type) {
  const t = String(type || "").trim().toUpperCase().replace(/[_-]+/g," ").replace(/\s+/g," ");
  if (t === "CA" || t === "CASH ADVANCE") return "CASH ADVANCE";
  if (t === "LIQUIDATION" || t === "LIQUIDATE") return "LIQUIDATION";
  if (t === "DIRECT EXPENSE") return "DIRECT EXPENSE";
  if (t === "REIMBURSEMENT") return "REIMBURSEMENT";
  return t;
}
function rfDisplayType(type) {
  if (type === "CASH ADVANCE") return "Cash Advance";
  if (type === "LIQUIDATION") return "Liquidation";
  if (type === "DIRECT EXPENSE") return "Direct Expense";
  if (type === "REIMBURSEMENT") return "Reimbursement";
  return type;
}
function rfDateString(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, CONFIG.TIMEZONE || "Asia/Manila", "yyyy-MM-dd");
  }
  return String(value);
}
function rfNextReplenishmentNo(groups) {
  let prefix = "RF-", max = 0, width = 3;
  groups.forEach(g => {
    const no = String(g.replenishmentNo || "");
    const m = no.match(/^(.*?)(\d+)$/);
    if (m) {
      const n = Number(m[2]);
      if (n >= max) { max = n; prefix = m[1]; width = m[2].length; }
    }
  });
  return prefix + String(max + 1).padStart(width, "0");
}
