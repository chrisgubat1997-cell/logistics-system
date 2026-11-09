/* LOGIS-TECH SYSTEM — Maintenance Mode client control */
(function () {
  "use strict";
  const API_URL = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
  let lastEnabled = false, pollHandle = null, controlsBound = false;
  function getAccount() {
    try { const raw = JSON.parse(localStorage.getItem("logitechUser") || "{}"); return raw.account || raw.user || raw; }
    catch (e) { return {}; }
  }
  function getRole() {
    const a=getAccount();
    return String(a.role || a.ROLE || a.accountType || a.account_type || "").trim().toUpperCase();
  }
  function getToken() {
    const a=getAccount();
    return String(a.sessionToken || a.session_token || a.token || "").trim();
  }
  async function request(action,data) {
    const response=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:action,data:Object.assign({sessionToken:getToken()},data||{})})});
    const result=await response.json();
    if(!response.ok||!result||result.success!==true){const error=new Error(result&&(result.message||result.error)||"Unable to contact system control.");error.code=result&&result.code;throw error;}
    return result;
  }
  function ensureOverlay() {
    let overlay=document.getElementById("systemMaintenanceOverlay"); if(overlay)return overlay;
    overlay=document.createElement("div");overlay.id="systemMaintenanceOverlay";
    overlay.innerHTML='<div class="maintenance-overlay-card"><img src="assets/logo.png" alt="LOGIS-TECH"><h1>System Under Maintenance</h1><p id="systemMaintenanceOverlayMessage">The system is temporarily unavailable while maintenance is being performed.</p><div class="maintenance-caption">LOGIS-TECH SYSTEM · PLEASE CHECK BACK LATER</div></div>';
    document.body.appendChild(overlay);return overlay;
  }
  function applyStatus(status) {
    const admin=getRole()==="ADMIN",enabled=status.enabled===true;lastEnabled=enabled;
    const control=document.getElementById("systemMaintenanceControl");if(control)control.style.display=admin?"":"none";
    const dot=document.getElementById("maintenanceStatusDot"),title=document.getElementById("maintenanceStatusText"),detail=document.getElementById("maintenanceStatusDetail"),button=document.getElementById("maintenanceToggleBtn");
    if(dot)dot.className="system-control-dot "+(enabled?"offline":"online");
    if(title)title.textContent=enabled?"Maintenance Mode is ON":"System is ONLINE";
    if(detail)detail.textContent=enabled?"Non-admin accounts are blocked":"All authorized users can access the system";
    if(button){button.disabled=!admin;button.textContent=enabled?"▶ Continue System":"■ Stop System";button.classList.toggle("danger",!enabled);button.classList.toggle("secondary",enabled);}
    const overlay=ensureOverlay();
    if(enabled&&!admin){const msg=document.getElementById("systemMaintenanceOverlayMessage");if(msg)msg.textContent=status.message||"The system is temporarily unavailable while maintenance is being performed.";overlay.classList.add("visible");document.body.style.overflow="hidden";}
    else{overlay.classList.remove("visible");document.body.style.overflow="";}
  }
  async function refreshStatus() {
    if(localStorage.getItem("logitechLoggedIn")!=="true"||!getToken())return;
    try{applyStatus(await request("getSystemMaintenanceStatus"));}
    catch(error){
      if(error.code==="MAINTENANCE_MODE"&&getRole()!=="ADMIN")applyStatus({enabled:true});
      else if(/SESSION_EXPIRED|AUTH_REQUIRED|INVALID_SESSION/.test(error.message)){localStorage.removeItem("logitechLoggedIn");localStorage.removeItem("logitechUser");window.location.href="login.html";}
    }
  }
  async function toggleMaintenance() {
    if(getRole()!=="ADMIN")return;
    const enabled=!lastEnabled;
    const prompt=enabled?"Stop the system for all non-admin users? They will see a maintenance screen until you continue the system.":"Continue the system and restore access for all authorized users.";
    if(!window.confirm(prompt))return;
    const button=document.getElementById("maintenanceToggleBtn"),feedback=document.getElementById("maintenanceControlFeedback");
    if(button){button.disabled=true;button.textContent="Please wait…";}
    if(feedback){feedback.className="system-control-feedback";feedback.textContent="";}
    try{const result=await request("setSystemMaintenanceMode",{enabled:enabled});if(feedback){feedback.className="system-control-feedback success";feedback.textContent=result.message;}await refreshStatus();}
    catch(error){if(feedback){feedback.className="system-control-feedback error";feedback.textContent=error.message;}if(button)button.disabled=false;}
  }
  function bindControls(){
    const control=document.getElementById("systemMaintenanceControl"),button=document.getElementById("maintenanceToggleBtn");
    if(control&&button&&!controlsBound){controlsBound=true;control.style.display=getRole()==="ADMIN"?"":"none";button.addEventListener("click",toggleMaintenance);refreshStatus();}
  }
  function start(){
    if(localStorage.getItem("logitechLoggedIn")!=="true")return;
    ensureOverlay();refreshStatus();if(!pollHandle)pollHandle=window.setInterval(refreshStatus,15000);
    const observer=new MutationObserver(bindControls);observer.observe(document.body,{childList:true,subtree:true});bindControls();
  }
  window.initializeSystemMaintenanceControls=bindControls;
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
