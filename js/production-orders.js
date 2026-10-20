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
  let selectedCard = "all";
  function parseDate(value) {
    const raw=String(value==null?"":value).trim();
    if(!raw)return null;
    let match=raw.match(/^(\\d{4})-(\\d{1,2})-(\\d{1,2})/);
    if(match) { const d=new Date(Number(match[1]),Number(match[2])-1,Number(match[3])); return isNaN(d.getTime())?null:d; }
    match=raw.match(/^(\\d{1,2})[\\/.-](\\d{1,2})[\\/.-](\\d{4})$/);
    if(match) { const d=new Date(Number(match[3]),Number(match[1])-1,Number(match[2])); return isNaN(d.getTime())?null:d; }
    const parsed=new Date(raw);
    return isNaN(parsed.getTime())?null:new Date(parsed.getFullYear(),parsed.getMonth(),parsed.getDate());
  }
  function rddStatus(so) {
    const raw=so.requiredDeliveryDate;
    if(!String(raw==null?"":raw).trim()||String(raw).trim()==="—")return "missing";
    const due=parseDate(raw);
    if(!due)return "missing";
    const today=new Date();today.setHours(0,0,0,0);
    const diff=Math.round((due.getTime()-today.getTime())/86400000);
    if(diff<0)return "overdue";
    if(diff<=7)return "upcoming";
    return "future";
  }
  function unreadForSO(so) {
    return notifications.some(function(n){return !n.readAt&&String(n.soNumber)===String(so.soNumber);});
  }
  function filteredQueue() {
    const search=String(($("poqSearch")&&$("poqSearch").value)||"").trim().toLowerCase();
    const rdd=String(($("poqRDDFilter")&&$("poqRDDFilter").value)||"all");
    const notification=String(($("poqNotificationFilter")&&$("poqNotificationFilter").value)||"all");
    return queue.filter(function(so) {
      const status=rddStatus(so), unread=unreadForSO(so);
      if(rdd!=="all"&&status!==rdd)return false;
      if(notification==="unread"&&!unread)return false;
      if(notification==="read"&&unread)return false;
      if(selectedCard==="upcoming"&&status!=="upcoming")return false;
      if(selectedCard==="overdue"&&status!=="overdue")return false;
      if(selectedCard==="missing"&&status!=="missing")return false;
      if(selectedCard==="unread"&&!unread)return false;
      if(search) {
        const haystack=[so.soNumber,so.dateCreation,so.clientName,so.project,so.poNumber,so.requiredDeliveryDate,so.postedBy,so.postedAt].join(" ").toLowerCase();
        if(!haystack.includes(search))return false;
      }
      return true;
    });
  }
  function setSelectedCard(card) {
    selectedCard=card;
    if($("poqRDDFilter")&&["upcoming","overdue","missing"].includes(card))$("poqRDDFilter").value=card;
    else if($("poqRDDFilter"))$("poqRDDFilter").value="all";
    if($("poqNotificationFilter"))$("poqNotificationFilter").value=card==="unread"?"unread":"all";
    document.querySelectorAll("[data-poq-card]").forEach(function(button) {
      const active=button.getAttribute("data-poq-card")===card;
      button.classList.toggle("active",active);
      button.setAttribute("aria-pressed",active?"true":"false");
    });
    render();
  }
  function render() {
    const upcomingCount=queue.filter(function(so){return rddStatus(so)==="upcoming";}).length;
    const overdueCount=queue.filter(function(so){return rddStatus(so)==="overdue";}).length;
    const missingCount=queue.filter(function(so){return rddStatus(so)==="missing";}).length;
    if($("poqOrderCount"))$("poqOrderCount").textContent=String(queue.length);
    if($("poqUnreadCount"))$("poqUnreadCount").textContent=String(unreadCount);
    if($("poqUpcomingCount"))$("poqUpcomingCount").textContent=String(upcomingCount);
    if($("poqOverdueCount"))$("poqOverdueCount").textContent=String(overdueCount);
    if($("poqMissingCount"))$("poqMissingCount").textContent=String(missingCount);
    if($("poqMarkRead"))$("poqMarkRead").disabled=unreadCount===0;

    const rows=$("poqRows");
    const visible=filteredQueue();
    if($("poqResultCount"))$("poqResultCount").textContent=visible.length+" of "+queue.length+" orders";
    if(rows) {
      if(!visible.length) rows.innerHTML='<tr><td colspan="9" class="poq-empty">No Sales Orders match the selected filters.</td></tr>';
      else rows.innerHTML=visible.map(function(so){
        const isNew=unreadForSO(so);
        const status=rddStatus(so);
        const rddBadge=status==="overdue"?' <span class="poq-pill new">PAST DUE</span>':status==="upcoming"?' <span class="poq-pill">DUE SOON</span>':"";
        return '<tr><td><strong>'+safe(so.soNumber)+'</strong></td><td>'+safe(date(so.dateCreation))+'</td><td>'+safe(so.clientName||"—")+'</td><td>'+safe(so.project||"—")+'</td><td>'+safe(so.poNumber||"—")+'</td><td><strong>'+safe(date(so.requiredDeliveryDate))+'</strong>'+rddBadge+'</td><td>'+safe(so.postedBy||"—")+'</td><td>'+safe(so.postedAt||"—")+'</td><td><span class="poq-pill '+(isNew?"new":"")+'">'+(isNew?"UNREAD":"READ")+'</span></td></tr>';
      }).join("");
    }
    const notes=$("poqNotifications");
    if(notes) {
      if(!notifications.length) notes.innerHTML='<div class="poq-empty">No notifications yet.</div>';
      else notes.innerHTML=notifications.slice(0,30).map(function(n){
        return '<article class="poq-notification"><strong>'+safe(n.title||"Sales Order notification")+' '+(!n.readAt?'<span class="poq-pill new">NEW</span>':'')+'</strong><p>'+safe(n.message||("SO "+n.soNumber+" was posted to Production."))+'</p><small>'+safe(n.createdAt||"")+' · SO '+safe(n.soNumber||"—")+'</small></article>';
      }).join("");
    }
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
      document.querySelectorAll("[data-poq-card]").forEach(function(button) {
        button.addEventListener("click",function(){setSelectedCard(button.getAttribute("data-poq-card")||"all");});
      });
      ["poqSearch","poqRDDFilter","poqNotificationFilter"].forEach(function(id) {
        const control=$(id); if(control)control.addEventListener(id==="poqSearch"?"input":"change",function(){selectedCard="all";document.querySelectorAll("[data-poq-card]").forEach(function(button){const active=button.getAttribute("data-poq-card")==="all";button.classList.toggle("active",active);button.setAttribute("aria-pressed",active?"true":"false");});render();});
      });
      if($("poqClearFilters"))$("poqClearFilters").addEventListener("click",function(){
        if($("poqSearch"))$("poqSearch").value="";
        if($("poqRDDFilter"))$("poqRDDFilter").value="all";
        if($("poqNotificationFilter"))$("poqNotificationFilter").value="all";
        setSelectedCard("all");
      });
    }
    await load();
  };
})();
