/* LOGIS-TECH SO Monitoring — read-only Sales Order 360 view */
(function () {
  "use strict";
  const API = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
  let initialized = false, orders = [], selectedSO = "";
  const $ = id => document.getElementById(id);
  function account(){try{const x=JSON.parse(localStorage.getItem("logitechUser")||"{}");return x.account||x.user||x;}catch(e){return {};}}
  function token(){const a=account();return String(a.sessionToken||a.session_token||"").trim();}
  function safe(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function money(v){const n=Number(v||0);return "₱"+n.toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});}
  function date(v){if(!v)return "—";const s=String(v);const m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);const d=m?new Date(+m[1],+m[2]-1,+m[3],12):new Date(s);return isNaN(d.getTime())?safe(v):d.toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"2-digit"});}
  async function api(action,data){const response=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action,data:Object.assign({},data||{},{sessionToken:token()})})});const raw=await response.text();let result;try{result=JSON.parse(raw);}catch(e){throw new Error("Invalid database response.");}if(!response.ok||!result||result.success===false)throw new Error(result&&(result.message||result.error)||action+" failed.");return result;}
  function getSO(o){return String(o.SO_NUMBER||o.soNumber||o.soNo||"").trim();}
  function renderSuggestions(){const q=String($("soMonitorSearch").value||"").trim().toLowerCase();const box=$("soMonitorSuggestions");if(!q){box.hidden=true;box.innerHTML="";return;}const matches=orders.filter(o=>[getSO(o),o.CLIENT_NAME,o.CLIENT,o.PROJECT,o.PO_NUMBER,o.PO].some(v=>String(v||"").toLowerCase().includes(q))).slice(0,12);box.innerHTML=matches.length?matches.map(o=>'<button type="button" class="som-suggestion" data-so="'+safe(getSO(o))+'"><strong>'+safe(getSO(o))+'</strong><span>'+safe(o.CLIENT_NAME||o.CLIENT||"")+'</span><small>'+safe(o.PROJECT||"")+(o.PO_NUMBER||o.PO?" · PO "+safe(o.PO_NUMBER||o.PO):"")+'</small></button>').join(""):'<div class="som-no-match">No matching Sales Order found.</div>';box.hidden=false;}
  function section(title,count,headers,rows,empty){return '<section class="som-panel"><div class="som-panel-head"><h3>'+title+'</h3><span>'+count+'</span></div>'+(rows.length?'<div class="som-table-wrap"><table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join("")+'</tr></thead><tbody>'+rows.join("")+'</tbody></table></div>':'<div class="som-empty">'+empty+'</div>')+'</section>';}
  function row(cells){return '<tr>'+cells.map(v=>'<td>'+v+'</td>').join("")+'</tr>';}
  function status(v){const s=String(v||"—");const k=s.toLowerCase().replace(/[^a-z0-9]+/g,"-");return '<span class="som-status '+k+'">'+safe(s)+'</span>';}
  function renderDetails(so){
    const summary=so.summary||{}, items=Array.isArray(so.items)?so.items:[], drs=Array.isArray(so.deliveryReceipts)?so.deliveryReceipts:[], invoices=Array.isArray(so.invoices)?so.invoices:[], payments=Array.isArray(so.payments)?so.payments:[];
    const total=Number(summary.soAmount??so.GRAND_TOTAL??so.TOTAL_AMOUNT??so.SO_TOTAL??0),paid=Number(summary.paidAmount||0),balance=Number(summary.soBalance??Math.max(0,total-paid));
    const jo=so.JOB_ORDER||so.JO||so.jobOrder||"";
    const rdd=so.REQUIRED_DELIVERY_DATE||so.REQUIRED_DEL_DATE||so.RDD||"";
    const adjusted=so.RDD_ADJUSTED_AT||so.DELIVERY_DATE_ADJUSTED_AT||"";
    $("soMonitorResult").hidden=false;
    $("soMonitorResult").innerHTML=
      '<div class="som-so-heading"><div><span class="som-eyebrow">SALES ORDER QUICK VIEW</span><h2>'+safe(getSO(so))+'</h2><p>'+safe(so.CLIENT_NAME||so.CLIENT||"—")+' · '+safe(so.PROJECT||"No project specified")+'</p></div><button type="button" class="som-refresh" id="soMonitorRefresh">↻ Refresh</button></div>'+
      '<div class="som-summary-grid">'+
      '<div><small>SO TOTAL</small><strong>'+money(total)+'</strong></div><div><small>TOTAL PAID</small><strong>'+money(paid)+'</strong></div><div><small>REMAINING BALANCE</small><strong>'+money(balance)+'</strong></div><div><small>PAYMENT STATUS</small>'+status(summary.paymentStatus||so.PAYMENT_STATUS||"UNPAID")+'</div></div>'+
      '<section class="som-panel som-details"><div class="som-panel-head"><h3>Sales Order Details</h3>'+status(so.STATUS||"ACTIVE")+'</div><div class="som-detail-grid">'+
      '<div><small>PO NUMBER</small><b>'+safe(so.PO_NUMBER||so.PO||"—")+'</b></div><div><small>SO DATE</small><b>'+date(so.DATE_CREATION||so.SO_DATE||so.DATE||"")+'</b></div><div><small>PAYMENT TERMS</small><b>'+safe(so.TERMS||so.PAYMENT_TERMS||"—")+'</b></div><div><small>JO NUMBER</small><b>'+safe(jo||"Not assigned")+'</b></div><div><small>REQUIRED DELIVERY DATE</small><b>'+date(rdd)+'</b></div><div><small>RDD ADJUSTMENT</small><b>'+(adjusted?'Original '+date(so.RDD_ORIGINAL_DATE||'')+' → '+date(rdd)+' · '+date(adjusted)+' · '+safe(so.RDD_ADJUSTED_BY||'User not recorded'):'No adjustment recorded')+'</b></div></div></section>'+
      section("Sales Order Items",items.length,["ITEM / DESCRIPTION","QTY","UNIT","UNIT PRICE","AMOUNT"],items.map(i=>row([safe(i.ITEM_NAME||i.DESCRIPTION||i.ITEM_NUMBER||"—"),safe(i.QTY??i.QUANTITY??"—"),safe(i.UNIT||"—"),money(i.UNIT_PRICE||0),money(i.AMOUNT||i.TOTAL||0)])),"No item records found.")+
      section("Delivery Receipts",drs.length,["DR NO.","DR DATE","STATUS","DELIVERY / REMARKS"],drs.map(d=>row([safe(d.DR_NUMBER||"—"),date(d.DATE_OF_TRANSFER||d.DR_DATE||d.DATE),status(d.STATUS||"—"),safe(d.REMARKS||d.DELIVERY_ADDRESS||"—")])),"No Delivery Receipt linked to this SO.")+
      section("Invoices",invoices.length,["INVOICE NO.","SI NO.","DATE","TYPE","AMOUNT","STATUS"],invoices.map(i=>row([safe(i.INVOICE_NO||i.INVOICE_NUMBER||"—"),safe(i.SI_NO||i.SALES_INVOICE_NO||"—"),date(i.INVOICE_DATE||i.DATE_CREATED||i.DATE),safe(i.INVOICE_TYPE||"—"),money(i.TOTAL_AMOUNT||i.GRAND_TOTAL||i.AMOUNT||0),status(i.STATUS||"—")])),"No invoice linked to this SO.")+
      section("Payments",payments.length,["PAYMENT NO.","DATE","INVOICE NO.","PAYMENT METHOD","AMOUNT","STATUS"],payments.map(p=>row([safe(p.PAYMENT_NO||"—"),date(p.PAYMENT_DATE||p.DATE||p.CREATED_AT),safe(p.INVOICE_NO||"—"),safe(p.PAYMENT_METHOD||p.METHOD||"—"),money(p.CURRENT_PAYMENT??p.AMOUNT??p.PAYMENT_AMOUNT??0),status(p.PAYMENT_STATUS||p.STATUS||"—")])),"No payment record linked to this SO.");
    $("soMonitorRefresh").addEventListener("click",()=>loadDetails(getSO(so)));
  }
  async function loadDetails(no){selectedSO=no;$("soMonitorResult").hidden=false;$("soMonitorResult").innerHTML='<div class="som-loading">Loading complete Sales Order history…</div>';try{const r=await api("getSOTransactionDetails",{soNumber:no});const so=r.salesOrder||r.so||r.data&&r.data.salesOrder;if(!so)throw new Error("Sales Order details were not returned.");renderDetails(so);$("soMonitorSearch").value=no;$("soMonitorSuggestions").hidden=true;}catch(e){$("soMonitorResult").innerHTML='<div class="som-error">'+safe(e.message)+'</div>';}}
  async function loadOrders(){const r=await api("getSalesOrders",{});orders=Array.isArray(r.salesOrders)?r.salesOrders:Array.isArray(r.data)?r.data:[];}
  async function initialize(){if(initialized)return;initialized=true;const root=$("soMonitoringModule");if(!root)return;root.innerHTML='<div class="som-page"><div class="som-intro"><div><span class="som-eyebrow">SALES ORDER MANAGEMENT</span><h1>SO Monitoring</h1><p>Search once to view the complete Sales Order, JO, delivery, invoice and payment history.</p></div><button type="button" class="som-refresh" id="soMonitorReload">↻ Reload SO List</button></div><div class="som-search-card"><label for="soMonitorSearch">Search Sales Order</label><div class="som-search-control"><span>⌕</span><input id="soMonitorSearch" type="search" autocomplete="off" placeholder="Enter SO No., Client, Project or PO No."><small id="soMonitorCount">Loading…</small></div><div id="soMonitorSuggestions" class="som-suggestions" hidden></div></div><div id="soMonitorResult" hidden></div></div>';
    $("soMonitorSearch").addEventListener("input",renderSuggestions);$("soMonitorSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){const first=$("soMonitorSuggestions").querySelector("[data-so]");if(first)loadDetails(first.dataset.so);}if(e.key==="Escape")$("soMonitorSuggestions").hidden=true;});$("soMonitorSuggestions").addEventListener("click",e=>{const b=e.target.closest("[data-so]");if(b)loadDetails(b.dataset.so);});$("soMonitorReload").addEventListener("click",async()=>{try{await loadOrders();$("soMonitorCount").textContent=orders.length+" Sales Orders";renderSuggestions();}catch(e){$("soMonitorCount").textContent="Unable to load";}});
    try{await loadOrders();$("soMonitorCount").textContent=orders.length+" Sales Orders";}catch(e){$("soMonitorCount").textContent="Unable to load";$("soMonitorResult").hidden=false;$("soMonitorResult").innerHTML='<div class="som-error">'+safe(e.message)+'</div>';}}
  window.searchSOMonitoring=async function(query){
    const term=String(query||"").trim().toLowerCase();
    if(!term)return;
    if(!initialized)await initialize();
    if(!orders.length)await loadOrders();
    const match=orders.find(o=>getSO(o).toLowerCase()===term)||
      orders.find(o=>[getSO(o),o.CLIENT_NAME,o.CLIENT,o.PROJECT,o.PO_NUMBER,o.PO].some(v=>String(v||"").toLowerCase().includes(term)));
    if(match){await loadDetails(getSO(match));return;}
    const result=$("soMonitorResult");
    if(result){result.hidden=false;result.innerHTML='<div class="som-error">No matching Sales Order found. Check the SO number, client, project or PO number.</div>';}
  };
  window.initializeSOMonitoring=initialize;
})();