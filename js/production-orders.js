/* LOGIS-TECH Production Queue and in-app notifications */
(function () {
  "use strict";
  const API = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
  let initialized = false;
  let queue = [];
  let notifications = [];
  let unreadCount = 0;
  const $ = function(id) { return document.getElementById(id); };
  function account() {
    try { const saved = JSON.parse(localStorage.getItem("logitechUser") || "{}"); return saved.account || saved.user || saved; }
    catch (error) { return {}; }
  }
  function safe(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function(c) { return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]; }); }
  function date(value) {
    const raw = String(value == null ? "" : value).trim();
    if (!raw) return "—";
    const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return m[2] + "/" + m[3] + "/" + m[1];
    return raw;
  }
  function notice(message, kind) { const el=$("poqNotice"); if(!el)return;el.textContent=message;el.className="poq-notice show "+(kind||""); }
  async function api(action, data) {
    const user=account();
    const payload=Object.assign({},data||{},{
      sessionToken:user.sessionToken||user.session_token||"",
      userId:user.userId||user.USER_ID||"",
      username:user.username||user.USERNAME||""
    });
    const response=await fetch(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:action,data:payload})});
    const body=await response.text();
    let result;
    try { result=JSON.parse(body); } catch(error) { throw new Error("Invalid server response. Check the Apps Script deployment."); }
    if(!response.ok||!result||result.success===false)throw new Error(result&&result.message||"Request failed.");
    return result;
  }
  function render() {
    const rows=$("poqRows");
    if(rows) {
      if(!queue.length) rows.innerHTML='<tr><td colspan="9" class="poq-empty">No Sales Orders have been posted to Production yet.</td></tr>';
      else {
        const unreadBySO={};
        notifications.forEach(function(n){if(!n.readAt)unreadBySO[String(n.soNumber)]=true;});
        rows.innerHTML=queue.map(function(so){
          const isNew=!!unreadBySO[String(so.soNumber)];
          return '<tr><td><strong>'+safe(so.soNumber)+'</strong></td><td>'+safe(date(so.dateCreation))+'</td><td>'+safe(so.clientName||"—")+'</td><td>'+safe(so.project||"—")+'</td><td>'+safe(so.poNumber||"—")+'</td><td><strong>'+safe(date(so.requiredDeliveryDate))+'</strong></td><td>'+safe(so.postedBy||"—")+'</td><td>'+safe(so.postedAt||"—")+'</td><td><span class="poq-pill '+(isNew?"new":"")+'">'+(isNew?"NEW":"NOTIFIED")+'</span></td></tr>';
        }).join("");
      }
    }
    const notes=$("poqNotifications");
    if(notes) {
      if(!notifications.length) notes.innerHTML='<div class="poq-empty">No notifications yet.</div>';
      else notes.innerHTML=notifications.slice(0,30).map(function(n){
        return '<article class="poq-notification"><strong>'+safe(n.title||"Sales Order notification")+' '+(!n.readAt?'<span class="poq-pill new">NEW</span>':'')+'</strong><p>'+safe(n.message||("SO "+n.soNumber+" was posted to Production."))+'</p><small>'+safe(n.createdAt||"")+' · SO '+safe(n.soNumber||"—")+'</small></article>';
      }).join("");
    }
    if($("poqOrderCount"))$("poqOrderCount").textContent=String(queue.length);
    if($("poqUnreadCount"))$("poqUnreadCount").textContent=String(unreadCount);
    if($("poqMarkRead"))$("poqMarkRead").disabled=unreadCount===0;
  }
  async function load() {
    const button=$("poqRefresh");
    if(button){button.disabled=true;button.textContent="Loading…";}
    try {
      const result=await api("getProductionQueue",{});
      queue=Array.isArray(result.orders)?result.orders:[];
      notifications=Array.isArray(result.notifications)?result.notifications:[];
      unreadCount=Number(result.unreadCount||0);
      render();
      notice("Production Queue refreshed successfully.","success");
    } catch(error) {
      notice("Unable to load Production Queue: "+error.message,"error");
      if($("poqRows"))$("poqRows").innerHTML='<tr><td colspan="9" class="poq-empty">Unable to load Sales Orders.</td></tr>';
    } finally { if(button){button.disabled=false;button.textContent="↻ Refresh";} }
  }
  async function markRead() {
    const button=$("poqMarkRead");if(!button||!unreadCount)return;
    button.disabled=true;
    try {
      const result=await api("markProductionNotificationsRead",{});
      notice(result.message||"Notifications marked as read.","success");
      await load();
    } catch(error) { notice("Unable to update notifications: "+error.message,"error");button.disabled=false; }
  }
  window.initializeProductionOrders=async function() {
    if(!initialized) {
      initialized=true;
      if($("poqRefresh"))$("poqRefresh").addEventListener("click",load);
      if($("poqMarkRead"))$("poqMarkRead").addEventListener("click",markRead);
    }
    await load();
  };
})();
