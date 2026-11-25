(function(){ "use strict";
const API="https://script.google.com/macros/s/AKfycbwfVW5SWJUmhsuQPEolozrtOV6t_vKG2KGkovlNVDMJBcBQFy_loCVUflXMUHdZsPo6/exec";
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn);else fn();}
function account(){try{const x=JSON.parse(localStorage.getItem("logitechUser")||"{}");return x.account||x.user||x.profile||x;}catch(e){return {};}}
function token(){const a=account();return a.sessionToken||a.session_token||"";}
async function api(action,data){const response=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:action,data:Object.assign({sessionToken:token()},data||{})})});const result=await response.json();if(!response.ok||result.success===false)throw new Error(result.message||result.error||"Request Center API failed.");return result;}
function filePayload(input){return Promise.all([...(input&&input.files||[])].map(file=>new Promise((resolve,reject)=>{if(file.size>5*1024*1024){reject(new Error(file.name+" exceeds the 5 MB per-file limit."));return;}const reader=new FileReader();reader.onload=()=>resolve({name:file.name,mimeType:file.type,base64:String(reader.result).split(",")[1]||""});reader.onerror=()=>reject(new Error("Unable to read "+file.name));reader.readAsDataURL(file);}))); }
function msg(el,text,error){el.textContent=text;el.className="rfp-form-message show"+(error?" error":"");}
ready(function(){
 const form=document.getElementById("rfpRequestForm");if(!form||form.dataset.bound==="1")return;form.dataset.bound="1";
 const $=id=>document.getElementById(id),company=$("rfpCompany"),department=$("rfpDepartment"),approver=$("rfpApprovingHead"),type=$("rfpType"),files=$("rfpFiles"),guide=$("rfpDocumentGuide"),message=$("rfpFormMessage");
 const a=account(),activeCompany=String(a.activeCompany||a.ACTIVE_COMPANY||a.defaultCompany||a.DEFAULT_COMPANY||"GREENMETAL").toUpperCase(),access=String(a.companyAccess||a.COMPANY_ACCESS||"").toUpperCase(),allowed=access==="BOTH"?["GREENMETAL","GREENLIGHT"]:access.split(/[,;|]/).filter(x=>["GREENMETAL","GREENLIGHT"].includes(x));
 if(a.fullName||a.FULL_NAME)$("rfpRequestorName").value=a.fullName||a.FULL_NAME;
 if(a.email||a.EMAIL)$("rfpRequestorEmail").value=a.email||a.EMAIL;
 [...company.options].forEach(o=>{if(o.value)o.hidden=allowed.length?!allowed.includes(o.value):o.value!==activeCompany;});
 company.value=activeCompany;company.disabled=allowed.length<2;
 if(a.department||a.DEPARTMENT){const d=[...department.options].find(o=>o.value.toLowerCase()===String(a.department||a.DEPARTMENT).toLowerCase());if(d)department.value=d.value;}
 function approvers(){const list=Array.isArray(window.LOGISTECH_ACTIVE_DEPARTMENT_APPROVERS)?window.LOGISTECH_ACTIVE_DEPARTMENT_APPROVERS:[],matches=list.filter(x=>x&&x.active!==false&&String(x.department||"").toLowerCase()===department.value.toLowerCase()&&(!x.company||String(x.company).toUpperCase()===company.value));approver.innerHTML='<option value="">'+(department.value?"Select approving head":"Select department first")+'</option>';matches.forEach(x=>{const o=document.createElement("option");o.value=x.userId||x.email||x.fullName;o.textContent=x.fullName||x.name||x.email;approver.appendChild(o);});approver.disabled=!matches.length;const hint=approver.parentElement.querySelector("small");if(hint)hint.textContent=matches.length?"Choose the active department approver.":"Approver list has not yet been configured by the administrator.";}
 company.addEventListener("change",approvers);department.addEventListener("change",approvers);approvers();
 const soInput=$("rfpSalesOrder"),client=$("rfpClientName"),soList=$("rfpSalesOrderSuggestions");let soRows=[];
 const val=(r,keys)=>{for(const k of keys)if(r&&r[k]!=null&&r[k]!=="")return r[k];return "";};
 async function loadSO(){if(!window.LogisTechCache||typeof window.LogisTechCache.getAll!=="function")return;try{soRows=await window.LogisTechCache.getAll("salesOrders")||[];const q=soInput.value.toLowerCase();soList.innerHTML="";soRows.filter(r=>String(val(r,["SO_NUMBER","soNumber","so_number"])).toLowerCase().includes(q)).slice(0,30).forEach(r=>{const o=document.createElement("option");o.value=val(r,["SO_NUMBER","soNumber","so_number"]);o.label=val(r,["CLIENT_NAME","clientName","CLIENT"]);soList.appendChild(o);});}catch(e){console.warn(e);}}
 soInput.addEventListener("input",loadSO);soInput.addEventListener("change",()=>{const r=soRows.find(x=>String(val(x,["SO_NUMBER","soNumber","so_number"])).toLowerCase()===soInput.value.toLowerCase());if(r)client.value=val(r,["CLIENT_NAME","clientName","CLIENT"]);});loadSO();
 const requirements={"Subcon Payment Request":["Approved subcontractor / project authorization and internal approval.","Subcontractor billing, accomplishment / progress billing, invoice and applicable tax documents.","Signed approvals and required original billing documents must be received in hard copy before processing."],"TPC Request":["Approved TPC / project request and applicable internal approval.","TPC supporting computation, quotation / billing and related external documents.","Signed approval and required original supporting documents must be received in hard copy before processing."],"Manpower Agency Payments":["Approved manpower requirement / service agreement and department approval.","Agency billing, employee deployment / attendance summary and invoice.","Signed approval and original agency billing documents must be received in hard copy before processing."],"Reimbursement":["Approved expense / business purpose and applicable department approval.","Official receipts, invoices and expense breakdown under the claimant’s name, where applicable.","Original receipts and signed approvals must be submitted in hard copy when required by Finance."],"OPEX - Non-PO Transactions":["Department justification and approval for the non-PO transaction.","Supplier invoice, billing statement, quotation or other payee support.","Signed approvals and required original documents must be received in hard copy before processing."],"Cash Advance (CA)":["Approved activity / purpose, requested amount and expected liquidation date.","Budget / cost breakdown and any available quotation or activity support.","Signed cash-advance approval and required original documents must be received before release."],"Revolving Fund (RF)":["Fund custodian request, purpose and replenishment / adjustment justification.","Expense summary, receipts and fund balance / reconciliation support.","Original receipts and signed replenishment documents must be submitted as required by Finance."],"CA Liquidation":["Cash advance reference number and approved cash advance details.","Expense liquidation report, official receipts / invoices and return-of-cash proof, if applicable.","Original receipts and signed liquidation report must be submitted to Finance."]};
 function renderGuide(){const r=requirements[type.value];[...guide.children].forEach((el,i)=>{const p=el.querySelector("p");if(p)p.textContent=r?r[i]:"Select a Type to review the applicable document requirements.";});}
 type.addEventListener("change",renderGuide);
 files.addEventListener("change",()=>{const chosen=[...files.files],bad=chosen.filter(f=>!(f.type.startsWith("image/")||f.type==="application/pdf"));$("rfpFileNames").textContent=bad.length?"Only image and PDF files are allowed.":chosen.length?chosen.map(f=>f.name).join(" · "):"Images and PDF files only · Multiple files allowed";if(bad.length)files.value="";});
 form.addEventListener("submit",async e=>{e.preventDefault();message.className="rfp-form-message";if(!form.reportValidity())return;if(!approver.value){msg(message,"An active department approver must be configured before this request can be submitted.",true);approver.focus();return;}const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent="Submitting…";try{const data=Object.fromEntries(new FormData(form).entries());data.company=company.value;data.type=type.value;data.requestType=form.elements.requestType.value;data.approvingHead=approver.options[approver.selectedIndex].text;data.amount=Number(data.amount);data.files=await filePayload(files);const result=await api("requestCenterSubmitRfp",data);msg(message,result.message||("Submitted successfully: "+result.requestNo+". Your request has been saved."),false);form.reset();company.value=activeCompany;approvers();$("rfpFileNames").textContent="Images and PDF files only · Multiple files allowed";document.dispatchEvent(new Event("logistech:request-center-updated"));}catch(err){msg(message,err.message,true);}finally{submit.disabled=false;submit.innerHTML='Submit request <span>→</span>'; }});
});
window.LogisTechRequestCenterAPI={api:api,account:account,token:token,filePayload:filePayload};
})();

/* Personal Request Center workspace: records are returned only for the authenticated account. */
(function(){
 "use strict";
 function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn);else fn();}
 ready(async function(){
  const api=window.LogisTechRequestCenterAPI&&window.LogisTechRequestCenterAPI.api;
  const requestList=document.getElementById("myRequestList"),caList=document.getElementById("myCaList");
  if(!api||!requestList||!caList)return;
  const money=n=>"₱"+(Number(n)||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
  const date=v=>{if(!v)return "—";const d=new Date(v);return isNaN(d.getTime())?String(v):d.toLocaleDateString("en-PH");};
  function card(title,subtitle,status){const el=document.createElement("div");el.className="request-personal-record";const h=document.createElement("strong");h.textContent=title;const p=document.createElement("p");p.textContent=subtitle;const b=document.createElement("span");b.textContent=status||"SUBMITTED";el.append(h,p,b);return el;}
  async function load(){
   try{
    const [mine,ca]=await Promise.all([api("requestCenterGetMyRequests"),api("requestCenterGetCashAdvances")]);
    const records=mine.records||[],advances=ca.advances||[];
    document.getElementById("myRequestCount").textContent=records.length;
    requestList.innerHTML="";
    if(!records.length){requestList.innerHTML='<span class="request-empty-icon">▤</span><strong>No submitted requests yet</strong><p>Your requests will appear here after submission.</p>';}
    else records.forEach(r=>requestList.appendChild(card(r.REQUEST_NO||r.LIQUIDATION_NO||"Request",date(r.REQUEST_DATE||r.LIQUIDATION_DATE)+" · "+(r.REQUEST_TYPE||"Liquidation")+" · "+money(r.AMOUNT||r.TOTAL_EXPENSES),r.STATUS)));
    document.getElementById("myCaCount").textContent=advances.length;
    document.getElementById("myCaOutstanding").textContent=money(advances.reduce((s,x)=>s+Number(x.approvedAmount||0),0));
    document.getElementById("myCaBalance").textContent=money(advances.reduce((s,x)=>s+Number(x.remainingBalance||0),0));
    caList.innerHTML="";
    if(!advances.length){caList.innerHTML="<strong>No cash advance records</strong><p>Only approved and released cash advances belonging to your account appear here.</p>";}
    else advances.forEach(x=>caList.appendChild(card(x.requestNo||"Cash Advance",money(x.remainingBalance)+" remaining · "+(x.purpose||""),"FOR LIQUIDATION")));
   }catch(err){requestList.innerHTML="";const p=document.createElement("p");p.textContent=err.message;requestList.appendChild(p);}
  }
  load();document.addEventListener("logistech:request-center-updated",load);document.addEventListener("logistech:data-updated",load);
 });
})();