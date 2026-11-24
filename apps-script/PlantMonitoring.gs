/* =========================================================
   LOGIS-TECH — PLANT MONITORING
   Separate production progress ledger. Reads posted SO + SO items;
   stores only progress updates in PRODUCTION_PROGRESS.
========================================================= */
const PLANT_PROGRESS_HEADERS_ = [
  "SO_ITEM_ID","SO_NUMBER","JO_NUMBER","ITEM_NUMBER","ITEM_NAME","ORDERED_QTY",
  "COMPLETED_QTY","ONGOING_QTY","ON_HOLD_QTY","REMARKS","UPDATED_AT","UPDATED_BY"
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
        updatedBy:String(pvalues[r][ph.UPDATED_BY]||"")
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
        const p=progressById[id]||{completedQty:0,ongoingQty:0,onHoldQty:0,remarks:"",updatedAt:"",updatedBy:""};
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
          remarks:String(p.remarks||""),updatedAt:String(p.updatedAt||""),updatedBy:String(p.updatedBy||""),status:status
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
    const soCol=sh.indexOf("SO_NUMBER"), postCol=sh.indexOf("POSTED_TO_PRODUCTION");
    let posted=false;
    for(let r=1;r<soValues.length;r++) if(String(soValues[r][soCol]||"").trim()===item.soNumber){
      posted=postCol<0 || String(soValues[r][postCol]||"").trim().toUpperCase()==="POSTED";break;
    }
    if(!posted) throw new Error("This Sales Order has not been posted to Production.");
    const progress=getPlantProgressSheet_(), map=plantProgressHeaderMap_(progress), rows=progress.getDataRange().getValues();
    let target=-1;
    for(let r=1;r<rows.length;r++) if(String(rows[r][map.SO_ITEM_ID]||"").trim()===id){target=r+1;break;}
    const now=formatDateTime(new Date());
    const record=[
      id,item.soNumber,"",item.itemNumber,item.itemName,item.orderedQty,
      completed,ongoing,hold,String(payload.remarks||"").trim(),now,user.username
    ];
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
