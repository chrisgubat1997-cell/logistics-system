/* LOGIS-TECH JO Register. Server validates session, username and role for every request. */
(function () {
  "use strict";
  const API = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
  let initialized = false;
  let orders = [];
  let selectedCard = "all";
  const $ = function(id) { return document.getElementById(id); };
  function account() {
    try { const saved = JSON.parse(localStorage.getItem("logitechUser") || "{}"); return saved.account || saved.user || saved; }
    catch (error) { return {}; }
  }
  function token() { return String(account().sessionToken || account().session_token || "").trim(); }
  function safe(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function(c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]; }); }
  function notice(message, kind) { const el=$("joNotice"); if(!el)return;el.textContent=message;el.className="jo-notice show "+(kind||""); }
  async function api(action, data) {
    const response = await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:action,data:Object.assign({},data||{},{sessionToken:token()})})});
    const raw=await response.text();let result;
    try{result=JSON.parse(raw)}catch(error){throw new Error("Invalid response from the database.")}
    if(!response.ok||!result||result.success===false)throw new Error(result&&(result.message||result.error)||"Request failed.");
    return result;
  }
  function fmtDate(value) {
    const raw=String(value||"").trim();if(!raw)return "—";
    const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(m)return new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12).toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"2-digit"});
    const date=new Date(raw);return isNaN(date.getTime())?raw:date.toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"2-digit"});
  }
  function filteredOrders() {
    const q=String($("joSearch")&&$("joSearch").value||"").trim().toLowerCase();
    const joFilter=String($("joStatusFilter")&&$("joStatusFilter").value||"all");
    const adjustmentFilter=String($("joAdjustmentFilter")&&$("joAdjustmentFilter").value||"all");
    return orders.filter(function(so){
      const hasJO=String(so.jobOrder||"").trim()!=="";
      const adjusted=!!so.deliveryDateAdjusted;
      if(joFilter==="assigned"&&!hasJO)return false;
      if(joFilter==="pending"&&hasJO)return false;
      if(adjustmentFilter==="adjusted"&&!adjusted)return false;
      if(adjustmentFilter==="not-adjusted"&&adjusted)return false;
      return !q||[so.soNumber,so.clientName,so.project,so.poNumber,so.jobOrder].some(function(v){return String(v||"").toLowerCase().includes(q);});
    });
  }
  function render() {
    const total=orders.length;
    const assigned=orders.filter(function(so){return String(so.jobOrder||"").trim()!=="";}).length;
    const adjusted=orders.filter(function(so){return !!so.deliveryDateAdjusted;}).length;
    [["joTotalCard",total],["joAssignedCard",assigned],["joPendingCard",total-assigned],["joAdjustedCard",adjusted],["joNotAdjustedCard",total-adjusted]].forEach(function(pair){if($(pair[0]))$(pair[0]).textContent=String(pair[1]);});
    const tbody=$("joRows");if(!tbody)return;
    const list=filteredOrders();
    if(!list.length){tbody.innerHTML='<tr><td colspan="9" class="jo-empty">'+(orders.length?'No Sales Orders match your filters.':'No Sales Orders were found.')+'</td></tr>';}
    else tbody.innerHTML=list.map(function(so){
      const hasJO=String(so.jobOrder||"").trim()!=="";
      const dateAvailable=so.deliveryDateColumnAvailable!==false;
      const adjusted=!!so.deliveryDateAdjusted;
      const currentDate=String(so.requiredDeliveryDate||"");
      return '<tr data-so="'+safe(so.soNumber)+'">'+
        '<td><div class="jo-so-number">'+safe(so.soNumber)+'</div><div class="jo-project">Created: '+safe(fmtDate(so.dateCreation))+'</div></td>'+
        '<td><div class="jo-client">'+safe(so.clientName||"—")+'</div><div class="jo-project">'+safe(so.project||"No project specified")+'</div></td>'+
        '<td>'+safe(so.poNumber||"—")+'</td>'+
        '<td class="jo-date-text">'+safe(fmtDate(currentDate))+'</td>'+
        '<td>'+(hasJO?'<div class="jo-client">'+safe(so.jobOrder)+'</div>':'<span class="jo-muted">Not assigned</span>')+'</td>'+
        '<td><span class="jo-status '+(hasJO?'jo-status-assigned':'jo-status-pending')+'">'+(hasJO?'With JO':'Without JO')+'</span></td>'+
        '<td><span class="jo-status '+(adjusted?'jo-status-adjusted':'jo-status-none')+'">'+(adjusted?'Adjusted':'Not Adjusted')+'</span>'+(adjusted&&so.deliveryDateAdjustedAt?'<div class="jo-project">Updated: '+safe(fmtDate(so.deliveryDateAdjustedAt))+'</div>':'')+'</td>'+
        '<td><input type="date" class="jo-date-input" value="'+safe(currentDate)+'" '+(!dateAvailable?'disabled title="No delivery-date column exists in SALES_ORDERS"':'')+' aria-label="Adjusted delivery date for '+safe(so.soNumber)+'"><div class="jo-project">'+(adjusted?'Previously adjusted; change only if needed.':'Leave unchanged if no adjustment is needed.')+'</div></td>'+
        '<td>'+(hasJO?'<button type="button" class="jo-row-save" data-jo-save="'+safe(so.soNumber)+'">SAVE DATE</button>':'<input type="text" class="jo-number-input" maxlength="100" required placeholder="Enter JO Number" aria-label="JO Number for '+safe(so.soNumber)+'"><button type="button" class="jo-row-save" data-jo-save="'+safe(so.soNumber)+'">SAVE JO</button>')+'</td></tr>';
    }).join("");
    $("joCount").textContent=list.length+" of "+orders.length+" Sales Order"+(orders.length===1?"":"s");
  }
  async function load() {
    const refresh=$("joRefreshBtn");if(refresh){refresh.disabled=true;refresh.textContent="Loading…";}
    if($("joRows"))$("joRows").innerHTML='<tr><td colspan="7" class="jo-empty">Loading Sales Orders…</td></tr>';
    notice("Loading Sales Orders from the database…","");
    try{
      const result=await api("getJORegisterData",{});
      orders=Array.isArray(result.salesOrders)?result.salesOrders:[];
      render();
      notice(orders.length+" Sales Order"+(orders.length===1?"":"s")+" loaded, including assigned and unassigned JO records.","success");
    }catch(error){
      orders=[];render();notice("Unable to load JO Register: "+error.message,"error");
      if($("joRows"))$("joRows").innerHTML='<tr><td colspan="7" class="jo-empty">Could not load Sales Orders. Check your session and Production account access.</td></tr>';
    }finally{if(refresh){refresh.disabled=false;refresh.textContent="↻ Refresh";}}
  }
  async function save(button) {
    const row=button.closest("tr");if(!row)return;
    const soNumber=button.getAttribute("data-jo-save");
    const joInput=row.querySelector(".jo-number-input");
    const dateInput=row.querySelector(".jo-date-input");
    const jobOrder=String(joInput&&joInput.value||"").trim();
    const existing=orders.find(function(so){return String(so.soNumber)===String(soNumber);});
    const hasExistingJO=!!(existing&&String(existing.jobOrder||"").trim());
    const deliveryDate=String(dateInput&&dateInput.value||"").trim();
    if(!hasExistingJO&&!jobOrder){notice("Enter a manual JO Number for "+soNumber+".","error");joInput&&joInput.focus();return;}
    if(jobOrder.length>100||/[\r\n]/.test(jobOrder)){notice("JO Number must be a single line with 100 characters or fewer.","error");joInput.focus();return;}
    button.disabled=true;button.textContent="SAVING…";
    try{
      const result=await api("updateJORegisterEntry",{soNumber:soNumber,jobOrder:jobOrder,deliveryDate:deliveryDate,adjustmentOnly:hasExistingJO});
      notice(result.message||("Saved "+soNumber+"."),"success");
      await load();
    }catch(error){notice("Not saved: "+error.message,"error");button.disabled=false;button.textContent=hasExistingJO?"SAVE DATE":"SAVE JO";}
  }
  function syncCards() {
    document.querySelectorAll("[data-jo-card]").forEach(function(button){
      const active=button.getAttribute("data-jo-card")===selectedCard;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",active?"true":"false");
    });
  }
  async function initialize() {
    if(!token()){notice("Login session not found. Please log in again.","error");if($("joRows"))$("joRows").innerHTML='<tr><td colspan="7" class="jo-empty">Please log in again to use JO Register.</td></tr>';return;}
    if(!initialized){
      initialized=true;
      if($("joRefreshBtn"))$("joRefreshBtn").addEventListener("click",load);
      if($("joSearch"))$("joSearch").addEventListener("input",render);
      if($("joStatusFilter"))$("joStatusFilter").addEventListener("change",function(){selectedCard="all";syncCards();render();});
      if($("joAdjustmentFilter"))$("joAdjustmentFilter").addEventListener("change",function(){selectedCard="all";syncCards();render();});
      document.querySelectorAll("[data-jo-card]").forEach(function(button){button.addEventListener("click",function(){
        selectedCard=button.getAttribute("data-jo-card")||"all";
        if($("joStatusFilter"))$("joStatusFilter").value=["assigned","pending"].includes(selectedCard)?selectedCard:"all";
        if($("joAdjustmentFilter"))$("joAdjustmentFilter").value=["adjusted","not-adjusted"].includes(selectedCard)?selectedCard:"all";
        syncCards();render();
      });});
      if($("joRows"))$("joRows").addEventListener("click",function(event){const button=event.target.closest("[data-jo-save]");if(button)save(button);});
    }
    await load();
  }
  window.initializeJORegister=initialize;
})();