/* =========================================================
   LOGIS-TECH — PLANT MONITORING
   Separate production progress ledger. Reads posted SO + SO items;
   stores only progress updates in PRODUCTION_PROGRESS.
========================================================= */
const PLANT_PROGRESS_HEADERS_ = [
  "SO_ITEM_ID","SO_NUMBER","JO_NUMBER","ITEM_NUMBER","ITEM_NAME","ORDERED_QTY",
  "COMPLETED_QTY","ONGOING_QTY","ON_HOLD_QTY","REMARKS","UPDATED_AT","UPDATED_BY","COMPLETED_DATE"
];

function getPlantProgressSheet_() {
  const base = getSheet(CONFIG.SHEETS.SALES_ORDERS);
  const ss = base.getParent();
  let sheet = ss.getSheetByName("PRODUCTION_PROGRESS");
  if (!sheet) {
    sheet = ss.insertSheet("PRODUCTION_PROGRESS");
    sheet.getRange(1,1,1,PLANT_PROGRESS_HEADERS_.length).setValues([PLANT_PROGRESS_HEADERS_]);
    sheet.setFrozenRows(1);
  } else {
    const last = Math.max(sheet.getLastColumn(), 1);
    const headers = sheet.getRange(1,1,1,last).getValues()[0].map(v=>String(v||"").trim().toUpperCase());
    PLANT_PROGRESS_HEADERS_.forEach(name => {
      if (headers.indexOf(name) < 0) sheet.getRange(1, sheet.getLastColumn()+1).setValue(name);
    });
  }
  return sheet;
}

function plantProgressHeaderMap_(sheet) {
  const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0].map(v=>String(v||"").trim().toUpperCase());
  const map = {};
  headers.forEach((h,i)=>{ if(h) map[h]=i; });
  return map;
}

function getPlantMonitoringData(payload) {
  try {
    const user = requireProductionOrdersUser_(payload, ["ADMIN","PRODUCTION"]);
    const soSheet = getSheet(CONFIG.SHEETS.SALES_ORDERS);
    const itemSheet = getSheet(CONFIG.SHEETS.SALES_ORDER_ITEMS);
    const soValues = soSheet.getDataRange().getValues();
    const itemValues = itemSheet.getDataRange().getValues();
    if (soValues.length < 2 || itemValues.length < 2) {
      return {success:true,orders:[],items:[],count:0,authorizedUser:user.username};
    }
    const headers = soValues[0].map(v=>String(v||"").trim().toUpperCase());
    const ih = itemValues[0].map(v=>String(v||"").trim().toUpperCase());
    const si = n=>headers.indexOf(n), ii=n=>ih.indexOf(n);
    const soIdx=si("SO_NUMBER"), postIdx=si("POSTED_TO_PRODUCTION"), joIdx=si("JOB_ORDER")>=0?si("JOB_ORDER"):si("JO");
    const clientIdx=si("CLIENT_NAME")>=0?si("CLIENT_NAME"):si("CLIENT"), projectIdx=si("PROJECT");
    const postedAtIdx=si("PRODUCTION_POSTED_AT"), rddIdx=si("REQUIRED_DELIVERY_DATE");
    const itemSoIdx=ii("SO_NUMBER"), itemIdIdx=ii("SO_ITEM_ID")>=0?ii("SO_ITEM_ID"):ii("ITEM_ID");
    const itemNoIdx=ii("ITEM_NUMBER"), nameIdx=ii("ITEM_NAME"), descIdx=ii("DESCRIPTION");
    const qtyIdx=ii("QTY"), unitIdx=ii("UNIT");
    if(soIdx<0 || itemSoIdx<0 || qtyIdx<0) throw new Error("Required SO / SO item columns are missing.");
    const progressSheet=getPlantProgressSheet_(), ph=plantProgressHeaderMap_(progressSheet);
    const pvalues=progressSheet.getDataRange().getValues(), progressById={};
    for(let r=1;r<pvalues.length;r++){
      const id=String(pvalues[r][ph.SO_ITEM_ID]||"").trim();
      if(!id) continue;
      progressById[id]={
        completedQty:Number(pvalues[r][ph.COMPLETED_QTY]||0),
        ongoingQty:Number(pvalues[r][ph.ONGOING_QTY]||0),
        onHoldQty:Number(pvalues[r][ph.ON_HOLD_QTY]||0),
        remarks:String(pvalues[r][ph.REMARKS]||""),
        updatedAt:String(pvalues[r][ph.UPDATED_AT]||""),
        updatedBy:String(pvalues[r][ph.UPDATED_BY]||""),
        completedDate:ph.COMPLETED_DATE!=null?(pvalues[r][ph.COMPLETED_DATE] instanceof Date?Utilities.formatDate(pvalues[r][ph.COMPLETED_DATE],Session.getScriptTimeZone(),"yyyy-MM-dd"):String(pvalues[r][ph.COMPLETED_DATE]||"").slice(0,10)):""
      };
    }
    const postedOrders={};
    for(let r=1;r<soValues.length;r++){
      const row=soValues[r], so=String(row[soIdx]||"").trim();
      if(!so || (postIdx>=0 && String(row[postIdx]||"").trim().toUpperCase()!=="POSTED")) continue;
      postedOrders[so]={
        soNumber:so, jobOrder:joIdx>=0?String(row[joIdx]||"").trim():"",
        clientName:clientIdx>=0?String(row[clientIdx]||""):"",
        project:projectIdx>=0?String(row[projectIdx]||""):"",
        postedAt:postedAtIdx>=0?String(row[postedAtIdx]||""):"",
        requiredDeliveryDate:rddIdx>=0?productionOrdersDate_(row[rddIdx]):"", items:[]
      };
    }
    Object.keys(postedOrders).forEach(so=>{
      for(let r=1;r<itemValues.length;r++){
        const row=itemValues[r];
        if(String(row[itemSoIdx]||"").trim()!==so) continue;
        const id=itemIdIdx>=0?String(row[itemIdIdx]||"").trim():"";
        if(!id) continue;
        const ordered=Math.max(0,Number(row[qtyIdx]||0));
        const p=progressById[id]||{completedQty:0,ongoingQty:0,onHoldQty:0,remarks:"",updatedAt:"",updatedBy:"",completedDate:""};
        const completed=Math.max(0,Number(p.completedQty)||0), ongoing=Math.max(0,Number(p.ongoingQty)||0), hold=Math.max(0,Number(p.onHoldQty)||0);
        const pending=Math.max(0,ordered-completed-ongoing-hold);
        let status="PENDING";
        if(completed>=ordered && ordered>0) status="COMPLETED";
        else if(hold>0) status="ON HOLD";
        else if(completed>0 || ongoing>0) status="ONGOING";
        postedOrders[so].items.push({
          soItemId:id,soNumber:so,jobOrder:postedOrders[so].jobOrder,
          itemNumber:itemNoIdx>=0?String(row[itemNoIdx]||""):"",
          itemName:nameIdx>=0?String(row[nameIdx]||""):"",
          description:descIdx>=0?String(row[descIdx]||""):"",
          unit:unitIdx>=0?String(row[unitIdx]||""):"",
          orderedQty:ordered,completedQty:completed,ongoingQty:ongoing,onHoldQty:hold,pendingQty:pending,
          remarks:String(p.remarks||""),updatedAt:String(p.updatedAt||""),updatedBy:String(p.updatedBy||""),completedDate:String(p.completedDate||""),status:status
        });
      }
    });
    const orders=Object.keys(postedOrders).map(so=>{
      const order=postedOrders[so], items=order.items;
      const total=items.length, completed=items.filter(x=>x.status==="COMPLETED").length;
      const started=items.some(x=>x.completedQty>0||x.ongoingQty>0);
      order.totalItems=total;
      order.completedItems=completed;
      order.ongoingItems=items.filter(x=>x.status==="ONGOING").length;
      order.pendingItems=items.filter(x=>x.status==="PENDING").length;
      order.onHoldItems=items.filter(x=>x.status==="ON HOLD").length;
      order.orderedQty=items.reduce((a,x)=>a+x.orderedQty,0);
      order.completedQty=items.reduce((a,x)=>a+x.completedQty,0);
      order.ongoingQty=items.reduce((a,x)=>a+x.ongoingQty,0);
      order.pendingQty=items.reduce((a,x)=>a+x.pendingQty,0);
      order.onHoldQty=items.reduce((a,x)=>a+x.onHoldQty,0);
      order.progressPercent=order.orderedQty?Math.round(order.completedQty/order.orderedQty*100):0;
      order.status=total>0 && completed===total?"COMPLETED":(started?"ONGOING":"PENDING");
      return order;
    }).filter(o=>o.items.length);
    orders.sort((a,b)=>String(a.soNumber).localeCompare(String(b.soNumber)));
    return {success:true,orders:orders,count:orders.length,authorizedUser:user.username};
  } catch(error) {
    return {success:false,message:error.message||String(error),orders:[],count:0};
  }
}



/* MONTHLY PRODUCTION COMPLETION HISTORY */
const PLANT_COMPLETION_HEADERS_=["BATCH_ID","SO_ITEM_ID","SO_NUMBER","ITEM_NUMBER","ITEM_NAME","COMPLETED_QTY","COMPLETED_DATE","RDD_AT_COMPLETION","CLASSIFICATION","BATCH_TYPE","RECORDED_AT","RECORDED_BY"];
function getPlantCompletionBatchSheet_(){
  const ss=getSheet(CONFIG.SHEETS.SALES_ORDERS).getParent();
  let sh=ss.getSheetByName("PRODUCTION_COMPLETION_BATCHES");
  if(!sh){sh=ss.insertSheet("PRODUCTION_COMPLETION_BATCHES");sh.getRange(1,1,1,PLANT_COMPLETION_HEADERS_.length).setValues([PLANT_COMPLETION_HEADERS_]);sh.setFrozenRows(1);}
  else{const h=sh.getRange(1,1,1,Math.max(1,sh.getLastColumn())).getValues()[0].map(v=>String(v||"").trim().toUpperCase());PLANT_COMPLETION_HEADERS_.forEach(n=>{if(h.indexOf(n)<0)sh.getRange(1,sh.getLastColumn()+1).setValue(n);});}
  return sh;
}
function plantDateKey_(v){
  if(!v)return "";
  if(v instanceof Date&&!isNaN(v.getTime()))return Utilities.formatDate(v,Session.getScriptTimeZone(),"yyyy-MM-dd");
  const s=String(v).trim(),m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m)return m[1]+"-"+m[2]+"-"+m[3];
  const d=new Date(s);return isNaN(d.getTime())?"":Utilities.formatDate(d,Session.getScriptTimeZone(),"yyyy-MM-dd");
}
function plantCompletionClass_(date,rdd){if(!date||!rdd)return "UNCLASSIFIED";return date<rdd?"AHEAD":date===rdd?"ON_TIME":"DELAYED";}
function plantGetOrderRDD_(soNumber){
  const v=getSheet(CONFIG.SHEETS.SALES_ORDERS).getDataRange().getValues();if(v.length<2)return {rdd:""};
  const h=v[0].map(x=>String(x||"").trim().toUpperCase()),s=h.indexOf("SO_NUMBER"),d=h.indexOf("REQUIRED_DELIVERY_DATE");
  for(let i=1;i<v.length;i++)if(String(v[i][s]||"").trim()===String(soNumber).trim())return {rdd:d>=0?plantDateKey_(v[i][d]):""};
  return {rdd:""};
}
/* Import existing cumulative quantities once, using the last saved completion date. */
function ensurePlantCompletionBaselines_(){
  const p=getPlantProgressSheet_(),b=getPlantCompletionBatchSheet_(),pv=p.getDataRange().getValues(),ph=plantProgressHeaderMap_(p),bv=b.getDataRange().getValues(),bh={};
  b.getRange(1,1,1,b.getLastColumn()).getValues()[0].forEach((v,i)=>{const k=String(v||"").trim().toUpperCase();if(k)bh[k]=i;});
  const logged={};for(let i=1;i<bv.length;i++){const id=String(bv[i][bh.SO_ITEM_ID]||"").trim();if(id)logged[id]=true;}
  const rows=[],now=formatDateTime(new Date());
  for(let i=1;i<pv.length;i++){
    const row=pv[i],id=String(row[ph.SO_ITEM_ID]||"").trim(),qty=Number(row[ph.COMPLETED_QTY]||0);
    if(!id||qty<=0||logged[id])continue;
    const date=plantDateKey_(ph.COMPLETED_DATE!=null?row[ph.COMPLETED_DATE]:""),so=String(row[ph.SO_NUMBER]||""),rdd=plantGetOrderRDD_(so).rdd||"";
    const data={BATCH_ID:"LEGACY-"+id,SO_ITEM_ID:id,SO_NUMBER:so,ITEM_NUMBER:String(row[ph.ITEM_NUMBER]||""),ITEM_NAME:String(row[ph.ITEM_NAME]||""),COMPLETED_QTY:qty,COMPLETED_DATE:date,RDD_AT_COMPLETION:rdd,CLASSIFICATION:plantCompletionClass_(date,rdd),BATCH_TYPE:"LEGACY_BASELINE",RECORDED_AT:now,RECORDED_BY:"LEGACY_IMPORT"};
    rows.push(PLANT_COMPLETION_HEADERS_.map(k=>data[k]===undefined?"":data[k]));logged[id]=true;
  }
  if(rows.length)b.getRange(b.getLastRow()+1,1,rows.length,PLANT_COMPLETION_HEADERS_.length).setValues(rows);
}
function appendPlantCompletionMovement_(item,payload,user,previousCompleted,newCompleted,rdd){
  const delta=newCompleted-previousCompleted;if(Math.abs(delta)<0.0000001)return;
  const date=plantDateKey_(payload.completedDate);if(delta>0&&!date)throw new Error("Please select Date Completed when adding completed quantity.");
  const data={BATCH_ID:Utilities.getUuid(),SO_ITEM_ID:String(payload.soItemId||""),SO_NUMBER:item.soNumber,ITEM_NUMBER:item.itemNumber,ITEM_NAME:item.itemName,COMPLETED_QTY:delta,COMPLETED_DATE:date,RDD_AT_COMPLETION:rdd||"",CLASSIFICATION:delta>0?plantCompletionClass_(date,rdd):"ADJUSTMENT",BATCH_TYPE:delta>0?"COMPLETION":"QUANTITY_ADJUSTMENT",RECORDED_AT:formatDateTime(new Date()),RECORDED_BY:user.username};
  getPlantCompletionBatchSheet_().appendRow(PLANT_COMPLETION_HEADERS_.map(k=>data[k]===undefined?"":data[k]));
}
function getProductionAccuracyDashboard(payload){
  try{
    authorizeRole_(payload,["ADMIN","PRODUCTION","SALES","LOGISTICS","FINANCE","PAYMENT"]);
    payload=payload||{};const tz=Session.getScriptTimeZone(),now=new Date();
    const year=Number(payload.year)||Number(Utilities.formatDate(now,tz,"yyyy")),month=Number(payload.month)||Number(Utilities.formatDate(now,tz,"M"));
    if(month<1||month>12||year<2000||year>2100)throw new Error("Invalid production report month.");
    ensurePlantCompletionBaselines_();
    const so=getSheet(CONFIG.SHEETS.SALES_ORDERS).getDataRange().getValues(),it=getSheet(CONFIG.SHEETS.SALES_ORDER_ITEMS).getDataRange().getValues();
    const sh=so[0].map(v=>String(v||"").trim().toUpperCase()),ih=it[0].map(v=>String(v||"").trim().toUpperCase()),idx=(h,n)=>h.indexOf(n);
    const soIdx=idx(sh,"SO_NUMBER"),postIdx=idx(sh,"POSTED_TO_PRODUCTION"),postDateIdx=idx(sh,"PRODUCTION_POSTED_AT"),statusIdx=idx(sh,"STATUS"),itemSoIdx=idx(ih,"SO_NUMBER"),qtyIdx=idx(ih,"QTY");
    if(soIdx<0||itemSoIdx<0||qtyIdx<0)throw new Error("Sales Order quantity or posting columns are missing.");
    const posted={};for(let i=1;i<so.length;i++){const row=so[i],number=String(row[soIdx]||"").trim();if(!number||(postIdx>=0&&String(row[postIdx]||"").trim().toUpperCase()!=="POSTED")||(statusIdx>=0&&String(row[statusIdx]||"").trim().toUpperCase()==="CANCELLED"))continue;const date=postDateIdx>=0?plantDateKey_(row[postDateIdx]):"";if(date)posted[number]={date:date,qty:0};}
    for(let i=1;i<it.length;i++){const row=it[i],number=String(row[itemSoIdx]||"").trim();if(posted[number])posted[number].qty+=Math.max(0,Number(row[qtyIdx])||0);}
    const endKey=Utilities.formatDate(new Date(year,month,0,23,59,59),tz,"yyyy-MM-dd"),monthKey=year+"-"+String(month).padStart(2,"0");
    let receivedMonth=0,receivedToDate=0;Object.keys(posted).forEach(k=>{const p=posted[k];if(p.date.slice(0,7)===monthKey)receivedMonth+=p.qty;if(p.date<=endKey)receivedToDate+=p.qty;});
    const bs=getPlantCompletionBatchSheet_(),bv=bs.getDataRange().getValues(),bh={};bs.getRange(1,1,1,bs.getLastColumn()).getValues()[0].forEach((v,i)=>{const k=String(v||"").trim().toUpperCase();if(k)bh[k]=i;});
    const trend=[];for(let off=5;off>=0;off--){const d=new Date(year,month-1-off,1);trend.push({year:d.getFullYear(),month:d.getMonth()+1,label:Utilities.formatDate(d,tz,"MMM"),ahead:0,onTime:0,delayed:0,unclassified:0});}
    let completedMonth=0,completedToDate=0,ahead=0,onTime=0,delayed=0,unclassified=0;
    for(let i=1;i<bv.length;i++){const row=bv[i],date=plantDateKey_(row[bh.COMPLETED_DATE]),qty=Number(row[bh.COMPLETED_QTY]||0),soNumber=String(row[bh.SO_NUMBER]||"").trim();if(!date||!posted[soNumber]||date>endKey)continue;completedToDate+=qty;if(date.slice(0,7)!==monthKey)continue;completedMonth+=qty;const cls=String(row[bh.CLASSIFICATION]||"UNCLASSIFIED").toUpperCase();if(cls==="AHEAD")ahead+=qty;else if(cls==="ON_TIME")onTime+=qty;else if(cls==="DELAYED")delayed+=qty;else unclassified+=qty;const t=trend.find(x=>x.year===Number(date.slice(0,4))&&x.month===Number(date.slice(5,7)));if(t){if(cls==="AHEAD")t.ahead+=qty;else if(cls==="ON_TIME")t.onTime+=qty;else if(cls==="DELAYED")t.delayed+=qty;else t.unclassified+=qty;}}
    const classified=ahead+onTime+delayed;
    return {success:true,year:year,month:month,receivedThisMonth:receivedMonth,receivedToDate:receivedToDate,completedThisMonth:completedMonth,completedToDate:completedToDate,remainingBalance:Math.max(0,receivedToDate-completedToDate),completionRate:receivedToDate?Math.min(100,completedToDate/receivedToDate*100):0,aheadQty:ahead,onTimeQty:onTime,delayedQty:delayed,unclassifiedQty:unclassified,onTimeAccuracy:classified?onTime/classified*100:0,classifiedCompletedQty:classified,monthlyTrend:trend,legacyBaselineIncluded:true};
  }catch(error){return {success:false,message:error.message||String(error)};}
}


/* Bulk endpoint: one browser request for all selected production items. */
function savePlantItemsProgress(payload) {
  payload = payload || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (!items.length) return { success:false, message:"No selected production items were submitted." };
  if (items.length > 100) return { success:false, message:"Please update no more than 100 items at a time." };

  const results = [];
  let saved = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i] || {};
    const result = savePlantItemProgress({
      sessionToken: payload.sessionToken,
      activeCompany: payload.activeCompany,
      company: payload.company,
      soItemId: item.soItemId,
      completedQty: item.completedQty,
      ongoingQty: item.ongoingQty,
      onHoldQty: item.onHoldQty,
      remarks: item.remarks,
      completedDate: item.completedDate
    });
    const ok = !!(result && result.success);
    results.push({
      soItemId: String(item.soItemId || ""),
      success: ok,
      message: result && result.message ? result.message : (ok ? "Saved." : "Update failed.")
    });
    if (ok) saved++;
  }

  const failed = results.length - saved;
  return {
    success: failed === 0,
    partial: saved > 0 && failed > 0,
    saved: saved,
    failed: failed,
    total: results.length,
    results: results,
    message: failed === 0
      ? saved + " production item(s) updated successfully."
      : saved + " item(s) saved; " + failed + " item(s) failed. Review the item-level results and retry."
  };
}


function savePlantItemProgress(payload) {
  const lock=LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    payload=payload||{};
    const user=requireProductionOrdersUser_(payload,["ADMIN","PRODUCTION"]);
    const id=String(payload.soItemId||"").trim();
    if(!id) throw new Error("Missing Sales Order item reference.");
    const completed=Number(payload.completedQty), ongoing=Number(payload.ongoingQty), hold=Number(payload.onHoldQty);
    if([completed,ongoing,hold].some(v=>!isFinite(v)||v<0)) throw new Error("Enter valid non-negative quantities.");
    const sheet=getSheet(CONFIG.SHEETS.SALES_ORDER_ITEMS), values=sheet.getDataRange().getValues();
    const headers=values[0].map(v=>String(v||"").trim().toUpperCase());
    const idIdx=headers.indexOf("SO_ITEM_ID")>=0?headers.indexOf("SO_ITEM_ID"):headers.indexOf("ITEM_ID");
    const soIdx=headers.indexOf("SO_NUMBER"), noIdx=headers.indexOf("ITEM_NUMBER"), nameIdx=headers.indexOf("ITEM_NAME"), qtyIdx=headers.indexOf("QTY");
    let item=null;
    for(let r=1;r<values.length;r++) if(String(values[r][idIdx]||"").trim()===id){
      item={soNumber:String(values[r][soIdx]||"").trim(),itemNumber:String(values[r][noIdx]||""),itemName:String(values[r][nameIdx]||""),orderedQty:Number(values[r][qtyIdx]||0)};break;
    }
    if(!item) throw new Error("Sales Order item not found.");
    if(completed+ongoing+hold>item.orderedQty) throw new Error("Completed + Ongoing + On-Hold quantity cannot exceed ordered quantity ("+item.orderedQty+").");
    const soSheet=getSheet(CONFIG.SHEETS.SALES_ORDERS), soValues=soSheet.getDataRange().getValues(), sh=soValues[0].map(v=>String(v||"").trim().toUpperCase());
    const soCol=sh.indexOf("SO_NUMBER"), postCol=sh.indexOf("POSTED_TO_PRODUCTION"), rddCol=sh.indexOf("REQUIRED_DELIVERY_DATE");
    let posted=false,rdd="";
    for(let r=1;r<soValues.length;r++)if(String(soValues[r][soCol]||"").trim()===item.soNumber){
      posted=postCol<0||String(soValues[r][postCol]||"").trim().toUpperCase()==="POSTED";
      rdd=rddCol>=0?plantDateKey_(soValues[r][rddCol]):"";break;
    }
    if(!posted)throw new Error("This Sales Order has not been posted to Production.");
    const progress=getPlantProgressSheet_(),map=plantProgressHeaderMap_(progress),rows=progress.getDataRange().getValues();
    let target=-1;for(let r=1;r<rows.length;r++)if(String(rows[r][map.SO_ITEM_ID]||"").trim()===id){target=r+1;break;}
    const previousCompleted=target<0?0:Number(rows[target-1][map.COMPLETED_QTY]||0);
    const now=formatDateTime(new Date()),completedDate=String(payload.completedDate||"").trim();
    if(completedDate&&!/^\d{4}-\d{2}-\d{2}$/.test(completedDate))throw new Error("Invalid Date Completed. Please select a valid date.");
    if(completed!==previousCompleted){ensurePlantCompletionBaselines_();appendPlantCompletionMovement_(item,payload,user,previousCompleted,completed,rdd);}
    const record=target<0?Array(progress.getLastColumn()).fill(""):rows[target-1].slice();
    const setField=(name,value)=>{if(map[name]==null) throw new Error("Missing PRODUCTION_PROGRESS column: "+name);record[map[name]]=value;};
    setField("SO_ITEM_ID",id);
    setField("SO_NUMBER",item.soNumber);
    setField("JO_NUMBER","");
    setField("ITEM_NUMBER",item.itemNumber);
    setField("ITEM_NAME",item.itemName);
    setField("ORDERED_QTY",item.orderedQty);
    setField("COMPLETED_QTY",completed);
    setField("ONGOING_QTY",ongoing);
    setField("ON_HOLD_QTY",hold);
    setField("REMARKS",String(payload.remarks||"").trim());
    setField("UPDATED_AT",now);
    setField("UPDATED_BY",user.username);
    if(completedDate) setField("COMPLETED_DATE",completedDate);
    if(target<0) progress.appendRow(record);
    else progress.getRange(target,1,1,record.length).setValues([record]);
    try{if(typeof logActivity==="function")logActivity({userId:user.userId,username:user.username,action:"UPDATE",module:"Plant Monitoring",recordId:id,recordNumber:item.soNumber,details:"Production progress updated for "+item.itemName,status:"SUCCESS"});}catch(logError){}
    try{if(typeof touchSyncVersion==="function")touchSyncVersion();}catch(syncError){}
    return {success:true,message:"Production progress saved.",soNumber:item.soNumber,soItemId:id};
  } catch(error) {
    return {success:false,message:error.message||String(error)};
  } finally {
    try{lock.releaseLock();}catch(ignore){}
  }
}
