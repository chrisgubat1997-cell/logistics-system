(function(){ "use strict";
function ready(fn){if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fn);else fn();}
ready(function(){
 const panel=document.getElementById("accountingRequestMonitoring");
 const myTab=document.getElementById("requestMyAccountTab");
 const acctTab=document.getElementById("requestAccountingTab");
 const myView=document.getElementById("requestMyAccountView");
 const acctView=document.getElementById("requestAccountingView");
 if(!panel||!myTab||!acctTab||!myView||!acctView)return;
 function getAccount(){try{const s=JSON.parse(localStorage.getItem("logitechUser")||"{}");return s.account||s.user||s.profile||s;}catch(e){return {};}}
 const a=getAccount(),role=String(a.role||a.ROLE||a.accountType||a.account_type||"").trim().toUpperCase();
 const allowed=role==="ACCOUNTING";
 acctTab.hidden=!allowed;
 panel.hidden=!allowed;
 function activate(which){
  const accounting=which==="accounting"&&allowed;
  myView.hidden=accounting;
  acctView.hidden=!accounting;
  myTab.classList.toggle("is-active",!accounting);
  acctTab.classList.toggle("is-active",accounting);
  myTab.setAttribute("aria-selected",String(!accounting));
  acctTab.setAttribute("aria-selected",String(accounting));
 }
 myTab.addEventListener("click",()=>activate("account"));
 acctTab.addEventListener("click",()=>activate("accounting"));
 activate("account");
 if(!allowed)return;
 const rows=document.getElementById("acctRequestRows");
 const search=document.getElementById("acctRequestSearch"),type=document.getElementById("acctRequestType"),status=document.getElementById("acctRequestStatus"),company=document.getElementById("acctRequestCompany");
 if(!rows||!search||!type||!status||!company)return;
 const val=(r,...keys)=>{for(const k of keys)if(r[k]!=null&&r[k]!=="")return String(r[k]);return "";};
 function render(){
  const data=Array.isArray(window.LOGISTECH_ACCOUNTING_REQUESTS)?window.LOGISTECH_ACCOUNTING_REQUESTS:[];
  const filtered=data.filter(r=>{
   const q=search.value.trim().toLowerCase(),kind=val(r,"type","requestType","TYPE").toUpperCase(),st=val(r,"status","STATUS"),co=val(r,"company","COMPANY").toUpperCase();
   const hay=[val(r,"requestNo","REQUEST_NO","requestNumber"),val(r,"requestor","REQUESTOR","requestorName","fullName","FULL_NAME"),val(r,"department","DEPARTMENT"),val(r,"supplier","SUPPLIER","payee"),val(r,"projectClass","PROJECT_CLASS","project","PROJECT"),val(r,"salesOrder","SO_NUMBER","soNumber")].join(" ").toLowerCase();
   return (!q||hay.includes(q))&&(!type.value||kind.includes(type.value))&&(!status.value||st.toLowerCase()===status.value.toLowerCase())&&(!company.value||co===company.value);
  });
  const getStatus=r=>val(r,"status","STATUS").toLowerCase();
  document.getElementById("acctTotalRequests").textContent=data.length;
  document.getElementById("acctForReview").textContent=data.filter(r=>["submitted","for approval","for accounting","returned"].includes(getStatus(r))).length;
  document.getElementById("acctProcessing").textContent=data.filter(r=>["processing","for payment"].includes(getStatus(r))).length;
  document.getElementById("acctCompleted").textContent=data.filter(r=>["completed","paid","closed"].includes(getStatus(r))).length;
  rows.innerHTML="";
  if(!filtered.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=11;td.className="accounting-monitoring-empty";td.textContent=data.length?"No requests match the selected filters.":"No accounting request records are connected yet.";tr.appendChild(td);rows.appendChild(tr);}
  filtered.forEach(r=>{
   const values=[
    val(r,"requestNo","REQUEST_NO","requestNumber")||"—",
    val(r,"date","DATE","submittedAt","createdAt")||"—",
    val(r,"requestor","REQUESTOR","requestorName","fullName","FULL_NAME")||"—",
    val(r,"amount","AMOUNT","requestedAmount")||"—",
    val(r,"details","DETAILS","description","purpose","PURPOSE")||"—",
    val(r,"salesOrder","SO_NUMBER","soNumber","salesOrderNo")||"—",
    val(r,"projectClass","PROJECT_CLASS","project","PROJECT","className")||"—",
    val(r,"department","DEPARTMENT")||"—",
    val(r,"company","COMPANY")||"—",
    val(r,"type","requestType","TYPE")||"—",
    val(r,"status","STATUS")||"—"
   ];
   const tr=document.createElement("tr");values.forEach(v=>{const td=document.createElement("td");td.textContent=String(v);tr.appendChild(td);});rows.appendChild(tr);
  });
  document.getElementById("acctRequestResultCount").textContent=filtered.length+" records";
 }
 [search,type,status,company].forEach(el=>el.addEventListener("input",render));
 document.addEventListener("logistech:data-updated",render);window.addEventListener("storage",render);render();
});
})();