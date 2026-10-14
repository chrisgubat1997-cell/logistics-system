/* LOGIS-TECH SYSTEM — DR Monitoring (Google Sheets data only) */
let drDayChart=null,drMonthChart=null;
function drField(r,...keys){for(const k of keys){if(r&&r[k]!==undefined&&r[k]!==null&&r[k]!=="")return r[k];}return "";}
function drDate(v){if(!v)return null;const d=new Date(v);return isNaN(d)?null:d;}
function drFiltered(r){const f=window.getAnalyticsFilters?window.getAnalyticsFilters():{vehicle:"ALL",year:"ALL",month:"ALL"};const code=String(drField(r,"VEHICLE_CODE","vehicleCode")||""),id=String(drField(r,"VEHICLE_ID","vehicleId")||"");if(f.vehicle&&f.vehicle!=="ALL"&&f.vehicle!=="All Vehicle"&&f.vehicle!==code&&f.vehicle!==id)return false;const d=drDate(drField(r,"DATE_TRANSFER","dateTransfer"));if(f.year&&f.year!=="ALL"&&(!d||d.getFullYear()!==Number(f.year)))return false;if(f.month&&f.month!=="ALL"&&(!d||d.getMonth()+1!==Number(f.month)))return false;return !!d;}
function drRender(canvasId,old,labels,values,label){const c=document.getElementById(canvasId);if(!c)return null;if(old)old.destroy();const p=c.parentElement;const oldEmpty=p&&p.querySelector(".analytics-empty-state");if(oldEmpty)oldEmpty.remove();if(!labels.length){c.style.display="none";if(p){const e=document.createElement("div");e.className="analytics-empty-state";e.style.cssText="padding:30px;text-align:center;color:#64748b";e.textContent="No Data Available";p.appendChild(e);}return null;}c.style.display="";return new Chart(c,{type:"bar",data:{labels,datasets:[{label,data:values,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});}
async function refreshDRMonitoring(){
 ["totalDR","monthlyDR","pendingDR","overdueDR","preparedDR","releasedDR","deliveredDR","statusPendingDR","statusOverdueDR"].forEach(id=>setElementText(id,"—"));
 try{
  const data=await loadFleetAnalyticsRecords();const records=(Array.isArray(data.drMonitoring)?data.drMonitoring:[]).filter(drFiltered);
  const active=records.filter(r=>!["CANCELLED","CANCELED","VOID"].includes(String(drField(r,"STATUS","status")).toUpperCase()));
  const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const pending=active.filter(r=>{const s=String(drField(r,"STATUS","status")).toUpperCase();return !drDate(drField(r,"DATE_DELIVERED","dateDelivered"))&&!["DELIVERED","COMPLETED","CLOSED"].includes(s);});
  const overdue=pending.filter(r=>{const due=drDate(drField(r,"COMMITTED_DATE","committedDate"));return due&&new Date(due.getFullYear(),due.getMonth(),due.getDate())<today;});
  setElementText("totalDR",formatNumber(active.length));
  setElementText("monthlyDR",formatNumber(active.filter(r=>{const d=drDate(drField(r,"DATE_TRANSFER","dateTransfer"));return d&&d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth();}).length));
  setElementText("pendingDR",formatNumber(pending.length));setElementText("overdueDR",formatNumber(overdue.length));
  setElementText("preparedDR",formatNumber(active.filter(r=>/PREPARED|PREPARING|SAVED|DRAFT/.test(String(drField(r,"STATUS","status")).toUpperCase())).length));
  setElementText("releasedDR",formatNumber(active.filter(r=>/RELEASED|ONGOING|IN.?TRANSIT/.test(String(drField(r,"STATUS","status")).toUpperCase())).length));
  setElementText("deliveredDR",formatNumber(active.filter(r=>drDate(drField(r,"DATE_DELIVERED","dateDelivered"))||/DELIVERED|COMPLETED/.test(String(drField(r,"STATUS","status")).toUpperCase())).length));
  setElementText("statusPendingDR",formatNumber(pending.length));setElementText("statusOverdueDR",formatNumber(overdue.length));
  const byDay={},byMonth={};active.forEach(r=>{const d=drDate(drField(r,"DATE_TRANSFER","dateTransfer"));if(!d)return;const day=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");const month=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");byDay[day]=(byDay[day]||0)+1;byMonth[month]=(byMonth[month]||0)+1;});
  if(drDayChart)drDayChart.destroy();drDayChart=drRender("drDayChart",null,Object.keys(byDay).sort().slice(-31),Object.keys(byDay).sort().slice(-31).map(k=>byDay[k]),"DR per Day");
  if(drMonthChart)drMonthChart.destroy();drMonthChart=drRender("drMonthChart",null,Object.keys(byMonth).sort(),Object.keys(byMonth).sort().map(k=>byMonth[k]),"DR per Month");
 }catch(e){console.error("DR analytics load failed:",e);["totalDR","monthlyDR","pendingDR","overdueDR","preparedDR","releasedDR","deliveredDR","statusPendingDR","statusOverdueDR"].forEach(id=>setElementText(id,"—"));if(drDayChart)drDayChart.destroy();if(drMonthChart)drMonthChart.destroy();drDayChart=drMonthChart=null;["drDayChart","drMonthChart"].forEach(id=>{const c=document.getElementById(id);if(c){c.style.display="none";const p=c.parentElement;if(p&&!p.querySelector(".analytics-empty-state")){const n=document.createElement("div");n.className="analytics-empty-state";n.style.cssText="padding:30px;text-align:center;color:#64748b";n.textContent="Unable to load data. Check Apps Script API setup.";p.appendChild(n);}}});}
}
window.refreshDRMonitoring=refreshDRMonitoring;
