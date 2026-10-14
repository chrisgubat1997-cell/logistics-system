/* LOGIS-TECH SYSTEM — Fleet Performance (Google Sheets data only) */
let fleetKmChart=null, fleetFuelChart=null, fleetKmlChart=null, fleetMaintenanceChart=null;
let fleetAnalyticsRecords=null;

async function loadFleetAnalyticsRecords(force=false){
    if(fleetAnalyticsRecords && !force) return fleetAnalyticsRecords;
    const url="https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec?action=getFleetAnalyticsData&_="+Date.now();
    const response=await fetch(url,{method:"GET",cache:"no-store",redirect:"follow"});
    if(!response.ok) throw new Error("Analytics API HTTP "+response.status);
    const result=await response.json();
    if(!result || result.success===false) throw new Error(result?.error||result?.message||"Analytics API failed.");
    fleetAnalyticsRecords=result;
    return result;
}
window.loadFleetAnalyticsRecords=loadFleetAnalyticsRecords;

function fleetField(row,...keys){ for(const key of keys){ if(row && row[key]!==undefined && row[key]!==null && row[key]!=="") return row[key]; } return ""; }
function fleetDate(value){
    if(value instanceof Date && !isNaN(value)) return value;
    if(value===null||value===undefined||value==="") return null;
    if(typeof value==="number" && value>20000 && value<80000) return new Date(Date.UTC(1899,11,30)+value*86400000);
    const d=new Date(value); return isNaN(d)?null:d;
}
function fleetInFilter(row,dateValue,vehicleId,vehicleCode){
    const f=window.getAnalyticsFilters ? window.getAnalyticsFilters() : {vehicle:"ALL",year:"ALL",month:"ALL"};
    const code=String(fleetField(row,vehicleCode,"VEHICLE_CODE","vehicleCode","vehicle")||"");
    const id=String(fleetField(row,vehicleId,"VEHICLE_ID","vehicleId")||"");
    if(f.vehicle && f.vehicle!=="ALL" && f.vehicle!=="All Vehicle" && f.vehicle!==code && f.vehicle!==id) return false;
    const d=fleetDate(dateValue);
    if(f.year && f.year!=="ALL" && (!d || d.getFullYear()!==Number(f.year))) return false;
    if(f.month && f.month!=="ALL" && (!d || d.getMonth()+1!==Number(f.month))) return false;
    return !!d;
}
function fleetNum(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function fleetChartEmpty(canvasId,message="No Data Available"){
    const canvas=document.getElementById(canvasId); if(!canvas)return;
    if(canvas._emptyNode) canvas._emptyNode.remove();
    canvas.style.display="none";
    const parent=canvas.parentElement;
    if(parent){ const div=document.createElement("div");div.className="analytics-empty-state";div.style.cssText="padding:34px 12px;text-align:center;color:#64748b;font-size:13px";div.textContent=message;parent.appendChild(div);canvas._emptyNode=div;}
}
function fleetChartReady(canvasId){
    const canvas=document.getElementById(canvasId);if(!canvas)return null;
    if(canvas._emptyNode){canvas._emptyNode.remove();canvas._emptyNode=null;}
    canvas.style.display="";
    return canvas;
}
function fleetDestroyCharts(){[fleetKmChart,fleetFuelChart,fleetKmlChart,fleetMaintenanceChart].forEach(c=>{if(c)c.destroy();});fleetKmChart=fleetFuelChart=fleetKmlChart=fleetMaintenanceChart=null;}
function fleetCreateBar(canvasId,oldChart,labels,label,data,labelText,options={}){
    const canvas=fleetChartReady(canvasId); if(!canvas)return null;
    if(!labels.length){fleetChartEmpty(canvasId);return null;}
    if(oldChart)oldChart.destroy();
    return new Chart(canvas,{type:options.type||"bar",data:{labels,datasets:[{label:labelText,data,borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>" "+(options.format?options.format(ctx.raw):Number(ctx.raw).toLocaleString())}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>options.axis?options.axis(v):Number(v).toLocaleString()}}}}});
}
async function refreshFleetPerformance(){
    ["totalVehicles","totalKm","totalFuel","averageKmL"].forEach(id=>setElementText(id,"—"));
    try{
        const data=await loadFleetAnalyticsRecords();
        const vehicles=Array.isArray(data.vehicles)?data.vehicles:[];
        const trips=(Array.isArray(data.tripTickets)?data.tripTickets:[]).filter(r=>fleetInFilter(r,fleetField(r,"TRIP_DATE","tripDate","date"),"VEHICLE_ID","VEHICLE_CODE"));
        const fuel=(Array.isArray(data.fuelTransactions)?data.fuelTransactions:[]).filter(r=>fleetInFilter(r,fleetField(r,"FUEL_DATE","fuelDate","date"),"VEHICLE_ID","VEHICLE_CODE"));
        const maintenance=(Array.isArray(data.maintenance)?data.maintenance:[]).filter(r=>fleetInFilter(r,fleetField(r,"MAINTENANCE_DATE","maintenanceDate","date"),"VEHICLE_ID","VEHICLE_CODE"));
        const f=window.getAnalyticsFilters?window.getAnalyticsFilters():{vehicle:"ALL"};
        const activeVehicles=vehicles.filter(v=>{
            const status=String(fleetField(v,"STATUS","status")).toUpperCase();
            const code=String(fleetField(v,"VEHICLE_CODE","vehicleCode")||"");
            const id=String(fleetField(v,"VEHICLE_ID","vehicleId")||"");
            return !["INACTIVE","CANCELLED","CANCELED","RETIRED","DISABLED"].includes(status) && (!f.vehicle||f.vehicle==="ALL"||f.vehicle==="All Vehicle"||f.vehicle===code||f.vehicle===id);
        });
        // If the vehicle master sheet has not been populated yet, count only
        // distinct vehicles present in actual filtered records (never mock data).
        const observedVehicleCodes = Array.from(new Set(
            trips.concat(fuel, maintenance)
                .map(r => String(fleetField(r,"VEHICLE_CODE","vehicleCode","vehicle") || fleetField(r,"VEHICLE_ID","vehicleId") || ""))
                .filter(Boolean)
        ));
        const vehicleCount = activeVehicles.length || observedVehicleCodes.length;
        const map={};
        function ensure(r){const code=String(fleetField(r,"VEHICLE_CODE","vehicleCode","vehicle")||fleetField(r,"VEHICLE_ID","vehicleId")||"Unknown");if(!map[code])map[code]={vehicle:code,km:0,fuel:0,cost:0,idle:0};return map[code];}
        trips.forEach(r=>{const x=ensure(r);const km=fleetNum(fleetField(r,"TOTAL_KM","totalKm"));if(km>=0)x.km+=km;});
        fuel.forEach(r=>{const x=ensure(r);x.fuel+=Math.max(0,fleetNum(fleetField(r,"LITERS","liters")));});
        maintenance.forEach(r=>{const x=ensure(r);x.cost+=Math.max(0,fleetNum(fleetField(r,"COST","cost")));x.idle+=Math.max(0,fleetNum(fleetField(r,"IDLE_DAYS","idleDays")));});
        const rows=Object.values(map).sort((a,b)=>a.vehicle.localeCompare(b.vehicle));
        rows.forEach(x=>x.kmL=x.fuel>0?x.km/x.fuel:0);
        const totalKm=rows.reduce((s,x)=>s+x.km,0),totalFuel=rows.reduce((s,x)=>s+x.fuel,0);
        setElementText("totalVehicles",formatNumber(vehicleCount));
        setElementText("totalKm",formatNumber(totalKm));
        setElementText("totalFuel",formatNumber(totalFuel,2));
        setElementText("averageKmL",totalFuel>0?formatNumber(totalKm/totalFuel,2):"—");
        fleetDestroyCharts();
        fleetKmChart=fleetCreateBar("kmChart",fleetKmChart,rows.map(x=>x.vehicle),null,rows.map(x=>x.km),"Actual Kilometer",{format:v=>formatNumber(v)+" km",axis:v=>formatNumber(v)+" km"});
        fleetFuelChart=fleetCreateBar("fuelChart",fleetFuelChart,rows.map(x=>x.vehicle),null,rows.map(x=>x.fuel),"Fuel Consumption",{format:v=>formatNumber(v,2)+" L",axis:v=>formatNumber(v)+" L"});
        fleetKmlChart=fleetCreateBar("kmlChart",fleetKmlChart,rows.map(x=>x.vehicle),null,rows.map(x=>x.kmL),"Fuel Efficiency",{format:v=>formatNumber(v,2)+" km/L",axis:v=>formatNumber(v,2)+" km/L"});
        fleetMaintenanceChart=fleetCreateBar("maintenanceChart",fleetMaintenanceChart,rows.map(x=>x.vehicle),null,rows.map(x=>x.cost),"Maintenance Cost",{format:v=>"₱"+formatNumber(v,2),axis:v=>"₱"+formatNumber(v)});
        if(!rows.length){["kmChart","fuelChart","kmlChart","maintenanceChart"].forEach(id=>fleetChartEmpty(id));}
    }catch(error){
        console.error("Fleet analytics load failed:",error);
        ["totalVehicles","totalKm","totalFuel","averageKmL"].forEach(id=>setElementText(id,"—"));
        fleetDestroyCharts();
        ["kmChart","fuelChart","kmlChart","maintenanceChart"].forEach(id=>fleetChartEmpty(id,"Unable to load data. Check Apps Script API setup."));
    }
}
window.refreshFleetPerformance=refreshFleetPerformance;
