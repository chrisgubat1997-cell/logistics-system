/* LOGIS-TECH SYSTEM — Delivery Performance (Google Sheets data only) */
let deliveryLeadChart=null,deliveryAccuracyChart=null;
function deliveryField(r,...keys){for(const k of keys){if(r&&r[k]!==undefined&&r[k]!==null&&r[k]!=="")return r[k];}return "";}
function deliveryDate(v){if(!v)return null;const d=new Date(v);return isNaN(d)?null:d;}
function deliveryNumber(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function deliveryIsFiltered(r,dateValue){
 const f=window.getAnalyticsFilters?window.getAnalyticsFilters():{vehicle:"ALL",year:"ALL",month:"ALL"};
 const code=String(deliveryField(r,"VEHICLE_CODE","vehicleCode")||"");
 const id=String(deliveryField(r,"VEHICLE_ID","vehicleId")||"");
 if(f.vehicle&&f.vehicle!=="ALL"&&f.vehicle!=="All Vehicle"&&f.vehicle!==code&&f.vehicle!==id)return false;
 const d=deliveryDate(dateValue);
 if(f.year&&f.year!=="ALL"&&(!d||d.getFullYear()!==Number(f.year)))return false;
 if(f.month&&f.month!=="ALL"&&(!d||d.getMonth()+1!==Number(f.month)))return false;
 return !!d;
}
function deliveryChart(canvasId,old,labels,values,label,formatter){
 const canvas=document.getElementById(canvasId);if(!canvas)return null;
 if(old)old.destroy();
 const parent=canvas.parentElement;
 const oldEmpty=parent&&parent.querySelector(".analytics-empty-state");if(oldEmpty)oldEmpty.remove();
 if(!labels.length){canvas.style.display="none";if(parent){const e=document.createElement("div");e.className="analytics-empty-state";e.style.cssText="padding:30px;text-align:center;color:#64748b";e.textContent="No Data Available";parent.appendChild(e);}return null;}
 canvas.style.display="";
 return new Chart(canvas,{type:"bar",data:{labels,datasets:[{label,data:values,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>" "+formatter(c.raw)}}},scales:{y:{beginAtZero:true}}}});
}
async function refreshDeliveryPerformance(){
 ["averageLeadTime","fastestDelivery","longestDelivery","deliveryAccuracy"].forEach(id=>setElementText(id,"—"));
 try{
  const data=await loadFleetAnalyticsRecords();const all=Array.isArray(data.drMonitoring)?data.drMonitoring:[];
  const records=all.filter(r=>deliveryIsFiltered(r,deliveryField(r,"DATE_TRANSFER","dateTransfer")));
  const valid=records.map(r=>{const start=deliveryDate(deliveryField(r,"DATE_TRANSFER","dateTransfer"));const end=deliveryDate(deliveryField(r,"DATE_DELIVERED","dateDelivered"));const due=deliveryDate(deliveryField(r,"COMMITTED_DATE","committedDate"));const status=String(deliveryField(r,"STATUS","status")).toUpperCase();return {r,start,end,due,status,lead:start&&end?(end-start)/86400000:null};});
  const completed=valid.filter(x=>x.end&&x.start&&x.lead>=0&&!["CANCELLED","CANCELED","VOID"].includes(x.status));
  const accurate=completed.filter(x=>x.due).length?completed.filter(x=>x.due&&x.end<=new Date(x.due.getFullYear(),x.due.getMonth(),x.due.getDate(),23,59,59,999)).length:0;
  const accuracyBase=completed.filter(x=>x.due).length;
  const leads=completed.map(x=>x.lead);
  setElementText("averageLeadTime",leads.length?formatDays(leads.reduce((s,v)=>s+v,0)/leads.length)+" days":"—");
  setElementText("fastestDelivery",leads.length?formatDays(Math.min(...leads))+" days":"—");
  setElementText("longestDelivery",leads.length?formatDays(Math.max(...leads))+" days":"—");
  setElementText("deliveryAccuracy",accuracyBase?(accurate/accuracyBase*100).toFixed(1)+"%":"—");
  const chartRows=completed.filter(x=>x.lead!==null).slice().sort((a,b)=>a.start-b.start).slice(-30);
  if(deliveryLeadChart)deliveryLeadChart.destroy();deliveryLeadChart=deliveryChart("leadTimeChart",null,chartRows.map(x=>String(deliveryField(x.r,"DR_NUMBER","drNumber")||deliveryField(x.r,"SO_NUMBER","soNumber")||"DR")),chartRows.map(x=>x.lead),"Lead Time (days)",v=>formatDays(v)+" days");
  const accRows=completed.filter(x=>x.due).slice().sort((a,b)=>a.start-b.start).slice(-30);
  if(deliveryAccuracyChart)deliveryAccuracyChart.destroy();deliveryAccuracyChart=deliveryChart("accuracyChart",null,accRows.map(x=>String(deliveryField(x.r,"DR_NUMBER","drNumber")||deliveryField(x.r,"SO_NUMBER","soNumber")||"DR")),accRows.map(x=>x.end<=new Date(x.due.getFullYear(),x.due.getMonth(),x.due.getDate(),23,59,59,999)?100:0),"On-time delivery (%)",v=>v===100?"On time":"Late");
  ["productionDelayCount","truckDelayCount","clientDelayCount","trafficDelayCount","otherDelayCount"].forEach(id=>setElementText(id,"0"));
  const delayMap={"PRODUCTION":"productionDelayCount","TRUCK":"truckDelayCount","CLIENT":"clientDelayCount","TRAFFIC":"trafficDelayCount"};
  valid.filter(x=>x.end&&x.due&&x.end>x.due).forEach(x=>{const source=String(deliveryField(x.r,"DELAY_SOURCE","delaySource")).toUpperCase();const key=Object.keys(delayMap).find(k=>source.includes(k));setElementText(key?delayMap[key]:"otherDelayCount",String(deliveryNumber(document.getElementById(key?delayMap[key]:"otherDelayCount")?.textContent)+1));});
 }catch(e){console.error("Delivery analytics load failed:",e);["averageLeadTime","fastestDelivery","longestDelivery","deliveryAccuracy"].forEach(id=>setElementText(id,"—"));if(deliveryLeadChart)deliveryLeadChart.destroy();if(deliveryAccuracyChart)deliveryAccuracyChart.destroy();deliveryLeadChart=deliveryAccuracyChart=null;["leadTimeChart","accuracyChart"].forEach(id=>{const c=document.getElementById(id);if(c){c.style.display="none";const p=c.parentElement;if(p&&!p.querySelector(".analytics-empty-state")){const n=document.createElement("div");n.className="analytics-empty-state";n.style.cssText="padding:30px;text-align:center;color:#64748b";n.textContent="Unable to load data. Check Apps Script API setup.";p.appendChild(n);}}});}
}
window.refreshDeliveryPerformance=refreshDeliveryPerformance;
