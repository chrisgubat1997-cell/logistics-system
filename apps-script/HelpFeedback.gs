/* =========================================================
   LOGIS-TECH SYSTEM — HELP & FEEDBACK
   Shared company database with server-side ownership checks.
========================================================= */
const HF_HEADERS_ = [
  "FEEDBACK_ID","REFERENCE_NO","COMPANY","SUBMITTED_BY_USER_ID","SUBMITTED_BY_NAME",
  "SUBMITTED_BY_USERNAME","SUBMITTED_BY_ROLE","DEPARTMENT","FEEDBACK_TYPE","MODULE",
  "SUBJECT","DESCRIPTION","PRIORITY","STATUS","ASSIGNED_TO","ADMIN_NOTES",
  "ATTACHMENT_URL","CREATED_AT","UPDATED_AT"
];

function hfSheet_(company) {
  const ss = rcDb_(company);
  let sh = ss.getSheetByName("SYSTEM_FEEDBACK");
  if (!sh) {
    sh = ss.insertSheet("SYSTEM_FEEDBACK");
    sh.getRange(1,1,1,HF_HEADERS_.length).setValues([HF_HEADERS_]);
    sh.setFrozenRows(1);
  } else {
    const actual = sh.getRange(1,1,1,Math.max(sh.getLastColumn(),1)).getDisplayValues()[0].map(v=>String(v).trim());
    if (actual[0] !== "FEEDBACK_ID") throw new Error("SYSTEM_FEEDBACK sheet exists but its headers do not match. Please inspect it before continuing.");
    if (actual.length < HF_HEADERS_.length) sh.getRange(1,actual.length+1,1,HF_HEADERS_.length-actual.length).setValues([HF_HEADERS_.slice(actual.length)]);
  }
  return sh;
}

function hfNextReference_(company, date) {
  const code = company === "GREENLIGHT" ? "GL" : "GM";
  const year = Utilities.formatDate(date, CONFIG.TIMEZONE || "Asia/Manila", "yyyy");
  const key = "HELP_FEEDBACK_SEQ_"+code+"_"+year;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = hfSheet_(company);
    const last = sh.getLastRow();
    let highest = 0;
    if (last > 1) sh.getRange(2,2,last-1,1).getDisplayValues().forEach(r=>{
      const m=String(r[0]||"").match(new RegExp("^FB-"+code+"-"+year+"-(\\d{5})$"));
      if(m) highest=Math.max(highest,Number(m[1]));
    });
    const props=PropertiesService.getScriptProperties();
    const next=Math.max(highest,Number(props.getProperty(key)||0))+1;
    props.setProperty(key,String(next));
    return "FB-"+code+"-"+year+"-"+String(next).padStart(5,"0");
  } finally { lock.releaseLock(); }
}

function helpFeedbackSubmit(payload) {
  const actor=rcActor_(payload);
  const company=rcCompany_(payload.company,actor);
  const type=String(payload.type||"").trim().toUpperCase();
  if (!["ERROR","SUGGESTION","PROCESS"].includes(type)) throw new Error("Select a valid feedback type.");
  const department=String(payload.department||"").trim();
  const moduleName=String(payload.module||"").trim();
  const subject=String(payload.subject||"").trim();
  const description=String(payload.description||"").trim();
  const priority=String(payload.priority||"NORMAL").toUpperCase();
  if(!department||!moduleName||!subject||!description) throw new Error("Please complete all required fields.");
  if(subject.length>120||description.length>3000) throw new Error("Subject or description exceeds the allowed length.");
  if(!["LOW","NORMAL","HIGH","CRITICAL"].includes(priority)) throw new Error("Invalid priority.");
  const now=new Date(), ref=hfNextReference_(company,now);
  let attachmentUrl="";
  if(payload.file && payload.file.base64) {
    const f=payload.file, mime=String(f.mimeType||"");
    if(!(mime.indexOf("image/")===0||mime==="application/pdf")) throw new Error("Only image and PDF attachments are accepted.");
    const bytes=Utilities.base64Decode(String(f.base64));
    if(bytes.length>3*1024*1024) throw new Error("Attachment exceeds the 3 MB limit.");
    const root=DriveApp.getFolderById(CONFIG.HELP_FEEDBACK_ATTACHMENTS_FOLDER_ID);
    const folder=getOrCreateFolder(getOrCreateFolder(root,company),Utilities.formatDate(now,CONFIG.TIMEZONE||"Asia/Manila","yyyy"));
    const safeName=String(f.name||"feedback-attachment").replace(/[\\/:*?"<>|]/g,"_");
    attachmentUrl=folder.createFile(Utilities.newBlob(bytes,mime,safeName)).getUrl();
  }
  const id=Utilities.getUuid(), sh=hfSheet_(company);
  const record={
    FEEDBACK_ID:id,REFERENCE_NO:ref,COMPANY:company,SUBMITTED_BY_USER_ID:actor.userId,
    SUBMITTED_BY_NAME:actor.name,SUBMITTED_BY_USERNAME:actor.username,SUBMITTED_BY_ROLE:actor.role,
    DEPARTMENT:department,FEEDBACK_TYPE:type,MODULE:moduleName,SUBJECT:subject,DESCRIPTION:description,
    PRIORITY:priority,STATUS:"NEW",ASSIGNED_TO:"",ADMIN_NOTES:"",ATTACHMENT_URL:attachmentUrl,
    CREATED_AT:now,UPDATED_AT:now
  };
  sh.appendRow(HF_HEADERS_.map(h=>record[h]!==undefined?record[h]:""));
  return {success:true,referenceNo:ref,message:"Your concern was submitted successfully."};
}

function helpFeedbackGet(payload) {
  const actor=rcActor_(payload);
  const admin=actor.role==="ADMIN";
  const companies=(Array.isArray(actor.companyAccess)&&actor.companyAccess.length?actor.companyAccess:[actor.company]).filter(c=>["GREENMETAL","GREENLIGHT"].includes(String(c).toUpperCase()));
  let records=[];
  companies.forEach(company=>{
    const sh=hfSheet_(company), values=sh.getDataRange().getValues();
    if(values.length<2)return;
    const headers=values[0].map(v=>String(v).trim());
    values.slice(1).forEach(row=>{
      if(!row.some(v=>v!==""&&v!==null))return;
      const r=rowToObject(headers,row);
      if(!admin && String(r.SUBMITTED_BY_USER_ID)!==String(actor.userId))return;
      records.push({
        id:String(r.FEEDBACK_ID),referenceNo:String(r.REFERENCE_NO),company:String(r.COMPANY),userId:String(r.SUBMITTED_BY_USER_ID),
        submitter:String(r.SUBMITTED_BY_NAME),username:String(r.SUBMITTED_BY_USERNAME),
        role:String(r.SUBMITTED_BY_ROLE),department:String(r.DEPARTMENT),type:String(r.FEEDBACK_TYPE),
        module:String(r.MODULE),subject:String(r.SUBJECT),description:String(r.DESCRIPTION),
        priority:String(r.PRIORITY),status:String(r.STATUS),assignee:String(r.ASSIGNED_TO||""),
        note:String(r.ADMIN_NOTES||""),attachmentUrl:String(r.ATTACHMENT_URL||""),
        createdAt:r.CREATED_AT,updatedAt:r.UPDATED_AT
      });
    });
  });
  records.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
  return {success:true,records:records,isAdmin:admin,actorUserId:actor.userId};
}

function helpFeedbackUpdate(payload) {
  const actor=rcActor_(payload,["ADMIN"]);
  if(actor.role!=="ADMIN") throw new Error("Only ADMIN can update feedback records.");
  const id=String(payload.id||"").trim(), company=rcCompany_(payload.company,actor);
  const status=String(payload.status||"").toUpperCase();
  const allowed=["NEW","UNDER REVIEW","IN PROGRESS","FOR TESTING","RESOLVED","DECLINED"];
  if(!id||!allowed.includes(status)) throw new Error("Invalid feedback reference or status.");
  const sh=hfSheet_(company), values=sh.getDataRange().getValues(), headers=values[0].map(v=>String(v).trim());
  const idCol=headers.indexOf("FEEDBACK_ID"), statusCol=headers.indexOf("STATUS");
  const rowIndex=values.findIndex((r,i)=>i>0&&String(r[idCol])===id);
  if(rowIndex<1) throw new Error("Feedback record was not found.");
  const rowNo=rowIndex+1;
  sh.getRange(rowNo,statusCol+1).setValue(status);
  sh.getRange(rowNo,headers.indexOf("ASSIGNED_TO")+1).setValue(String(payload.assignee||"").trim());
  sh.getRange(rowNo,headers.indexOf("ADMIN_NOTES")+1).setValue(String(payload.note||"").trim());
  sh.getRange(rowNo,headers.indexOf("UPDATED_AT")+1).setValue(new Date());
  return {success:true,message:"Feedback record updated successfully."};
}
