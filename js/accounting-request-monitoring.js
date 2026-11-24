(function(){ "use strict";
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn);else fn();}
ready(function(){
 const panel=document.getElementById("accountingRequestMonitoring");if(!panel)return;
 function getAccount(){try{const s=JSON.parse(localStorage.getItem("logitechUser")||"{}");return s.account||s.user||s.profile||s;}catch(e){return {};}}
 const a=getAccount(),role=String(a.role||a.ROLE||a.accountType||a.account_type||"").trim().toUpperCase();
 const allowed=["ACCOUNTING","FINANCE","PAYMENT"].includes(role);
 panel.hidden=!allowed;
 if(!allowed)return;
 const rows=document.getElementById("acctRequestRows");
 const search=document.getElementById("acctRequestSearch"),type=document.getElementById("acctRequestType"),status=document.getElementById("acctRequestStatus"),company=document.getElementById("acctRequestCompany");
 function render(){
  const data=Array.isArray(window.LOGISTECH_ACCOUNTING_REQUESTS)?window.LOGISTECH_ACCOUNTING_REQUESTS:[];
  const filtered=data.filter(r=>{
   const get=(...keys)=>{for(const k of keys)if(r[k]!=null)return String(r[k]);return "";};
   const q=search.value.trim().toLowerCase(),kind=get("type","requestType","TYPE").toUpperCase(),st=get("status","STATUS"),co=get("company","COMPANY").toUpperCase(),hay=[get("requestNo","REQUEST_NO","requestNumber"),get("requestor","REQUESTOR","requestorName"),get("department","DEPARTMENT"),get("supplier","SUPPLIER","payee")].join(" ").toLowerCase();
   return (!q||hay.includes(q))&&(!type.value||kind.includes(type.value))&&(!status.value||st.toLowerCase()===status.value.toLowerCase())&&(!company.value||co===company.value);
  });
  const getStatus=r=>String(r.status||r.STATUS||"").toLowerCase();
  document.getElementById("acctTotalRequests").textContent=data.length;
  document.getElementById("acctForReview").textContent=data.filter(r=>["submitted","for approval","for accounting","returned"].includes(getStatus(r))).length;
  document.getElementById("acctProcessing").textContent=data.filter(r=>["processing","for payment"].includes(getStatus(r))).length;
  document.getElementById("acctCompleted").textContent=data.filter(r=>["completed","paid","closed"].includes(getStatus(r))).length;
  rows.innerHTML="";
  if(!filtered.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=8;td.className="accounting-monitoring-empty";td.textContent=data.length?"No requests match the selected filters.":"No accounting request records are connected yet.";tr.appendChild(td);rows.appendChild(tr);}
  filtered.forEach(r=>{const values=[r.requestNo||r.REQUEST_NO||r.requestNumber||"—",r.date||r.DATE||"—",r.requestor||r.REQUESTOR||r.requestorName||"—",r.department||r.DEPARTMENT||"—",r.company||r.COMPANY||"—",r.type||r.requestType||r.TYPE||"—",r.amount||r.AMOUNT||"—",r.status||r.STATUS||"—"];const tr=document.createElement("tr");values.forEach(v=>{const td=document.createElement("td");td.textContent=String(v);tr.appendChild(td);});rows.appendChild(tr);});
  document.getElementById("acctRequestResultCount").textContent=filtered.length+" records";
 }
 [search,type,status,company].forEach(el=>el.addEventListener("input",render));
 document.addEventListener("logistech:data-updated",render);window.addEventListener("storage",render);render();
});
})();