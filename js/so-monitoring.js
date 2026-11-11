/* LOGIS-TECH SO Monitoring — read-only Sales Order 360 view */
(function () {
  "use strict";
  const API = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
  let initialized = false, orders = [], customers = [], payments = [], customerCredits = [], creditTransactions = [], selectedSO = "";
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
    function deliveredQtyFor(soItem){
      const soItemId=String(soItem.SO_ITEM_ID||soItem.ITEM_ID||"").trim();
      const itemNumber=String(soItem.ITEM_NUMBER||"").trim();
      return drs.reduce((total,dr)=>{
        if(String(dr.STATUS||"").toUpperCase()==="CANCELLED")return total;
        const drItems=Array.isArray(dr.items)?dr.items:(Array.isArray(dr.ITEMS)?dr.ITEMS:[]);
        const delivered=drItems.reduce((sum,drItem)=>{
          const drSoItemId=String(drItem.SO_ITEM_ID||drItem.ITEM_ID||"").trim();
          const drItemNumber=String(drItem.ITEM_NUMBER||"").trim();
          const matches=soItemId ? drSoItemId===soItemId : (!drSoItemId && itemNumber && drItemNumber===itemNumber);
          if(!matches)return sum;
          return sum+Number(drItem.PICK_QTY??drItem.DELIVERED_QTY??drItem.QTY??drItem.QUANTITY??0);
        },0);
        return total+delivered;
      },0);
    }
    const deliveredValue=Number(summary.deliveredAmount||0);
    const invoicedValue=Number(summary.invoicedAmount||0);
    $("soMonitorResult").innerHTML=
      '<div class="som-so-heading"><div><span class="som-eyebrow">SALES ORDER QUICK VIEW</span><h2>'+safe(getSO(so))+'</h2><p>'+safe(so.CLIENT_NAME||so.CLIENT||"—")+' · '+safe(so.PROJECT||"No project specified")+'</p></div><button type="button" class="som-refresh" id="soMonitorRefresh">↻ Refresh</button></div>'+
      '<div class="som-summary-grid">'+
      '<div><small>SO TOTAL</small><strong>'+money(total)+'</strong></div><div><small>TOTAL PAID</small><strong>'+money(paid)+'</strong></div><div><small>REMAINING BALANCE</small><strong>'+money(balance)+'</strong></div><div><small>PAYMENT STATUS</small>'+status(summary.paymentStatus||so.PAYMENT_STATUS||"UNPAID")+'</div><div><small>TOTAL DELIVERED VALUE</small><strong>'+money(deliveredValue)+'</strong></div><div><small>TOTAL INVOICED AMOUNT</small><strong>'+money(invoicedValue)+'</strong></div></div>'+
      '<section class="som-panel som-details"><div class="som-panel-head"><h3>Sales Order Details</h3>'+status(so.STATUS||"ACTIVE")+'</div><div class="som-detail-grid">'+
      '<div><small>PO NUMBER</small><b>'+safe(so.PO_NUMBER||so.PO||"—")+'</b></div><div><small>SO DATE</small><b>'+date(so.DATE_CREATION||so.SO_DATE||so.DATE||"")+'</b></div><div><small>PAYMENT TERMS</small><b>'+safe(so.TERMS||so.PAYMENT_TERMS||"—")+'</b></div><div><small>JO NUMBER</small><b>'+safe(jo||"Not assigned")+'</b></div><div><small>REQUIRED DELIVERY DATE</small><b>'+date(rdd)+'</b></div><div><small>ADJUSTMENT DATE</small><b>'+date(adjusted)+'</b></div></div></section>'+
      section("Sales Order Items",items.length,["ITEM / DESCRIPTION","QTY","DELIVERED QTY","BALANCE QTY","UNIT","UNIT PRICE","AMOUNT"],items.map(i=>{
        const orderedQty=Number(i.QTY??i.QUANTITY??0);
        const deliveredQty=deliveredQtyFor(i);
        const remainingQty=Math.max(0,orderedQty-deliveredQty);
        return row([safe(i.ITEM_NAME||i.DESCRIPTION||i.ITEM_NUMBER||"—"),safe(i.QTY??i.QUANTITY??"—"),safe(deliveredQty),safe(remainingQty),safe(i.UNIT||"—"),money(i.UNIT_PRICE||0),money(i.AMOUNT||i.TOTAL||0)]);
      }),"No item records found.")+
      section("Delivery Receipts",drs.length,["DR NO.","DR DATE","STATUS","DELIVERY / REMARKS"],drs.map(d=>row([safe(d.DR_NUMBER||"—"),date(d.DATE_OF_TRANSFER||d.DR_DATE||d.DATE),status(d.STATUS||"—"),safe(d.REMARKS||d.DELIVERY_ADDRESS||"—")])),"No Delivery Receipt linked to this SO.")+
      section("Invoices",invoices.length,["INVOICE NO.","SI NO.","DATE","TYPE","AMOUNT","STATUS"],invoices.map(i=>row([safe(i.INVOICE_NO||i.INVOICE_NUMBER||"—"),safe(i.SI_NO||i.SALES_INVOICE_NO||"—"),date(i.INVOICE_DATE||i.DATE_CREATED||i.DATE),safe(i.INVOICE_TYPE||"—"),money(i.TOTAL_AMOUNT||i.GRAND_TOTAL||i.AMOUNT||0),status(i.STATUS||"—")])),"No invoice linked to this SO.")+
      section("Payments",payments.length,["PAYMENT NO.","DATE","INVOICE NO.","PAYMENT METHOD","AMOUNT","STATUS"],payments.map(p=>row([safe(p.PAYMENT_NO||"—"),date(p.PAYMENT_DATE||p.DATE||p.CREATED_AT),safe(p.INVOICE_NO||"—"),safe(p.PAYMENT_METHOD||p.METHOD||"—"),money(p.CURRENT_PAYMENT??p.AMOUNT??p.PAYMENT_AMOUNT??0),status(p.PAYMENT_STATUS||p.STATUS||"—")])),"No payment record linked to this SO.");
    $("soMonitorRefresh").addEventListener("click",()=>loadDetails(getSO(so)));
  }
  async function loadDetails(no){selectedSO=no;$("soMonitorResult").hidden=false;$("soMonitorResult").innerHTML='<div class="som-loading">Loading complete Sales Order history…</div>';try{const r=await api("getSOTransactionDetails",{soNumber:no});const so=r.salesOrder||r.so||r.data&&r.data.salesOrder;if(!so)throw new Error("Sales Order details were not returned.");renderDetails(so);$("soMonitorSearch").value=no;$("soMonitorSuggestions").hidden=true;}catch(e){$("soMonitorResult").innerHTML='<div class="som-error">'+safe(e.message)+'</div>';}}
  async function loadOrders(){const r=await api("getSalesOrders",{});orders=Array.isArray(r.salesOrders)?r.salesOrders:Array.isArray(r.data)?r.data:[];}
  async function loadCustomerData(){
    const results=await Promise.all([
      api("getCustomers",{}), api("getPayments",{}),
      api("getCustomerCredits",{}).catch(e=>({customerCredits:[],records:[]})),
      api("getCustomerCreditTransactions",{}).catch(e=>({customerCreditTransactions:[],records:[]}))
    ]);
    customers=Array.isArray(results[0].customers)?results[0].customers:[];
    payments=Array.isArray(results[1].payments)?results[1].payments:Array.isArray(results[1].records)?results[1].records:[];
    customerCredits=Array.isArray(results[2].customerCredits)?results[2].customerCredits:Array.isArray(results[2].records)?results[2].records:[];
    creditTransactions=Array.isArray(results[3].customerCreditTransactions)?results[3].customerCreditTransactions:Array.isArray(results[3].records)?results[3].records:[];
  }
  function normalizedName(v){return String(v||"").trim().toLowerCase().replace(/\s+/g," ");}
  function customerOrders(customer){
    const id=String(customer.CUSTOMER_ID||"").trim(), name=normalizedName(customer.CLIENT_NAME||customer.CUSTOMER_NAME);
    return orders.filter(so=>{
      const soId=String(so.CUSTOMER_ID||"").trim();
      if(id&&soId)return soId===id;
      return !soId&&name&&normalizedName(so.CLIENT_NAME||so.CLIENT||so.CUSTOMER_NAME)===name;
    });
  }
  function soAmount(so){return Number(so.GRAND_TOTAL??so.TOTAL_AMOUNT??so.SO_TOTAL??so.AMOUNT??0)||0;}
  function cancelledStatus(v){return ["CANCELLED","CANCELED","VOID","VOIDED"].includes(String(v||"").trim().toUpperCase());}
  function paymentApplied(p){
    const status=String(p.PAYMENT_STATUS||p.STATUS||"").trim().toUpperCase();
    if(["CANCELLED","CANCELED","VOID","VOIDED","REJECTED","PENDING","DRAFT"].includes(status))return 0;
    const applied=p.SO_APPLIED_AMOUNT??p.soAppliedAmount??p.SO_AMOUNT_APPLIED??p.APPLIED_TO_SO;
    if(applied!==undefined&&applied!==null&&String(applied).trim()!=="")return Math.max(0,Number(applied)||0);
    if(p.CASH_APPLIED_AMOUNT!==undefined||p.CUSTOMER_CREDIT_APPLIED!==undefined)
      return Math.max(0,(Number(p.CASH_APPLIED_AMOUNT)||0)+(Number(p.CUSTOMER_CREDIT_APPLIED)||0));
    const received=Number(p.CURRENT_PAYMENT??p.PAYMENT_AMOUNT??p.AMOUNT_PAID??p.AMOUNT??0)||0;
    return Math.max(0,received-(Number(p.CREDIT_AMOUNT??p.CUSTOMER_CREDIT_AMOUNT??p.OVERPAYMENT_AMOUNT??0)||0));
  }
  function customerPaidBySO(soList){
    const allowed=new Set(soList.map(getSO)), totals={};
    payments.forEach(p=>{const no=String(p.SO_NUMBER||p.SALES_ORDER||p.SALES_ORDER_NUMBER||"").trim();if(allowed.has(no))totals[no]=(totals[no]||0)+paymentApplied(p);});
    return totals;
  }
  function customerCreditRows(customer){
    const id=String(customer.CUSTOMER_ID||"").trim(), name=normalizedName(customer.CLIENT_NAME||customer.CUSTOMER_NAME);
    return customerCredits.filter(r=>{const rid=String(r.CUSTOMER_ID||"").trim();if(id&&rid)return id===rid;return !rid&&name&&normalizedName(r.CLIENT_NAME||r.CUSTOMER_NAME)===name;});
  }
  function customerCreditTxns(customer){
    const id=String(customer.CUSTOMER_ID||"").trim(), name=normalizedName(customer.CLIENT_NAME||customer.CUSTOMER_NAME);
    return creditTransactions.filter(r=>{const rid=String(r.CUSTOMER_ID||"").trim();if(id&&rid)return id===rid;return !rid&&name&&normalizedName(r.CLIENT_NAME||r.CUSTOMER_NAME)===name;});
  }
  function renderCustomerDetails(customer){
    const projects=customerOrders(customer), paidBySO=customerPaidBySO(projects);
    const activeProjects=projects.filter(so=>!cancelledStatus(so.STATUS));
    const totalSO=activeProjects.reduce((sum,so)=>sum+soAmount(so),0);
    const totalPaid=activeProjects.reduce((sum,so)=>sum+Math.min(soAmount(so),paidBySO[getSO(so)]||0),0);
    const totalUnpaid=activeProjects.reduce((sum,so)=>sum+Math.max(0,soAmount(so)-(paidBySO[getSO(so)]||0)),0);
    const creditRows=customerCreditRows(customer);
    const totalCredit=creditRows.reduce((sum,r)=>sum+Math.max(Number(r.AVAILABLE_CREDIT)||0,Number(r.CREDIT_BALANCE)||0),0);
    const txns=customerCreditTxns(customer).slice().sort((a,b)=>String(b.TXN_DATE||b.CREATED_AT||"").localeCompare(String(a.TXN_DATE||a.CREATED_AT||"")));
    const result=$("soMonitorResult");result.hidden=false;
    const details=[["CUSTOMER ID",customer.CUSTOMER_ID],["ATTENTION",customer.ATTENTION],["TIN",customer.TIN],["CONTACT NUMBER",customer.CONTACT_NUMBER],["EMAIL",customer.EMAIL],["BILLING ADDRESS",customer.BILLING_ADDRESS],["DELIVERY ADDRESS",customer.DELIVERY_ADDRESS],["CUSTOMER STATUS",customer.STATUS],["CREATED",customer.CREATED_AT],["LAST UPDATED",customer.UPDATED_AT]];
    const projectRows=projects.slice().sort((a,b)=>String(b.DATE_CREATION||b.SO_DATE||b.DATE||"").localeCompare(String(a.DATE_CREATION||a.SO_DATE||a.DATE||""))).map(so=>{
      const no=getSO(so),total=soAmount(so),paid=Math.min(total,paidBySO[no]||0),balance=Math.max(0,total-(paidBySO[no]||0));
      return row(['<button type="button" class="som-link" data-open-so="'+safe(no)+'">'+safe(no)+'</button>',safe(so.PROJECT||"—"),date(so.DATE_CREATION||so.SO_DATE||so.DATE),money(total),money(paid),money(balance),status(balance<=0.005?"PAID":paid>0?"PARTIAL":"UNPAID"),status(so.STATUS||"ACTIVE")]);
    });
    const txnRows=txns.map(t=>row([date(t.TXN_DATE||t.CREATED_AT),safe(t.TXN_TYPE||"—"),safe(t.REFERENCE_NO||"—"),safe(t.SO_NUMBER||"—"),safe(t.PAYMENT_NO||"—"),money(t.AMOUNT||0),money(t.BALANCE_AFTER||0),safe(t.REMARKS||"—")]));
    result.innerHTML=
      '<div class="som-so-heading"><div><span class="som-eyebrow">CUSTOMER 360° VIEW</span><h2>'+safe(customer.CLIENT_NAME||customer.CUSTOMER_NAME||"Customer")+'</h2><p>'+safe(customer.CUSTOMER_ID||"No Customer ID")+' · '+projects.length+' project / Sales Order records</p></div><button type="button" class="som-refresh" id="soMonitorCustomerRefresh">↻ Refresh</button></div>'+
      '<div class="som-summary-grid som-customer-summary"><div><small>TOTAL SO AMOUNT</small><strong>'+money(totalSO)+'</strong></div><div><small>TOTAL PAID</small><strong>'+money(totalPaid)+'</strong></div><div><small>TOTAL UNPAID</small><strong>'+money(totalUnpaid)+'</strong></div><div><small>TOTAL CUSTOMER CREDIT</small><strong>'+money(totalCredit)+'</strong></div></div>'+
      '<section class="som-panel som-details"><div class="som-panel-head"><h3>Customer Details</h3>'+status(customer.STATUS||"ACTIVE")+'</div><div class="som-customer-name"><b>'+safe(customer.CLIENT_NAME||customer.CUSTOMER_NAME||"—")+'</b></div><div class="som-detail-grid">'+details.map(d=>'<div><small>'+d[0]+'</small><b>'+safe(d[1]||"—")+'</b></div>').join("")+'</div></section>'+
      section("Customer Projects / Sales Orders",projects.length,["SO NUMBER","PROJECT","SO DATE","SO AMOUNT","TOTAL PAID","UNPAID","PAYMENT","SO STATUS"],projectRows,"No Sales Orders or projects linked to this customer.")+
      section("Customer Credit Transactions",txns.length,["DATE","TRANSACTION","REFERENCE","SO NUMBER","PAYMENT NO.","AMOUNT","BALANCE AFTER","REMARKS"],txnRows,"No Customer Credit transactions found.")+
      '<div class="som-customer-footnote">Financial totals exclude cancelled / void Sales Orders. Total Paid counts applied payment amounts only; overpayment remains under Customer Credit.</div>';
    $("soMonitorCustomerRefresh").addEventListener("click",async()=>{result.innerHTML='<div class="som-loading">Refreshing customer records…</div>';try{await Promise.all([loadOrders(),loadCustomerData()]);const fresh=customers.find(c=>String(c.CUSTOMER_ID||"")===String(customer.CUSTOMER_ID||""))||customer;renderCustomerDetails(fresh);}catch(e){result.innerHTML='<div class="som-error">'+safe(e.message)+'</div>'; }});
    result.querySelectorAll("[data-open-so]").forEach(button=>button.addEventListener("click",()=>loadDetails(button.dataset.openSo)));
  }

  async function initialize(){if(initialized)return;initialized=true;const root=$("soMonitoringModule");if(!root)return;root.innerHTML='<div class="som-page"><div class="som-intro"><div><span class="som-eyebrow">SALES ORDER MANAGEMENT</span><h1>SO Monitoring</h1><p>Search once to view the complete Sales Order, JO, delivery, invoice and payment history.</p></div><button type="button" class="som-refresh" id="soMonitorReload">↻ Reload SO List</button></div><div class="som-search-card"><label for="soMonitorSearch">Search Sales Order or Customer</label><div class="som-search-control"><span>⌕</span><input id="soMonitorSearch" type="search" autocomplete="off" placeholder="SO No., Customer, Project or PO No."><small id="soMonitorCount">Loading…</small></div><div id="soMonitorSuggestions" class="som-suggestions" hidden></div></div><div id="soMonitorResult" hidden></div></div>';
    $("soMonitorSearch").addEventListener("input",renderSuggestions);$("soMonitorSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){const first=$("soMonitorSuggestions").querySelector("[data-so]");if(first)loadDetails(first.dataset.so);}if(e.key==="Escape")$("soMonitorSuggestions").hidden=true;});$("soMonitorSuggestions").addEventListener("click",e=>{const b=e.target.closest("[data-so]");if(b)loadDetails(b.dataset.so);});$("soMonitorReload").addEventListener("click",async()=>{try{await loadOrders();$("soMonitorCount").textContent=orders.length+" Sales Orders · "+customers.length+" Customers";renderSuggestions();}catch(e){$("soMonitorCount").textContent="Unable to load";}});
    try{await Promise.all([loadOrders(),loadCustomerData()]);$("soMonitorCount").textContent=orders.length+" Sales Orders · "+customers.length+" Customers";}catch(e){$("soMonitorCount").textContent="Unable to load";$("soMonitorResult").hidden=false;$("soMonitorResult").innerHTML='<div class="som-error">'+safe(e.message)+'</div>';}}
  window.getSOMonitoringSuggestions=async function(query){
    const term=String(query||"").trim().toLowerCase();if(!term)return [];
    if(!initialized)await initialize();
    if(!orders.length)await loadOrders();
    if(!customers.length)await loadCustomerData();
    const customerMatches=customers.filter(c=>{
      const related=customerOrders(c);
      return [c.CUSTOMER_ID,c.CLIENT_NAME,c.CUSTOMER_NAME,c.ATTENTION,c.TIN,c.CONTACT_NUMBER,c.EMAIL].some(v=>String(v||"").toLowerCase().includes(term)) ||
        related.some(so=>[so.PROJECT,so.SO_NUMBER,so.PO_NUMBER,so.PO].some(v=>String(v||"").toLowerCase().includes(term)));
    }).slice(0,6).map(c=>({type:"customer",customerId:String(c.CUSTOMER_ID||""),client:String(c.CLIENT_NAME||c.CUSTOMER_NAME||""),project:customerOrders(c).length+" project / SO records"}));
    const soMatches=orders.filter(o=>[getSO(o),o.CLIENT_NAME,o.CLIENT,o.PROJECT,o.PO_NUMBER,o.PO].some(v=>String(v||"").toLowerCase().includes(term))).slice(0,8).map(o=>({type:"so",soNumber:getSO(o),client:String(o.CLIENT_NAME||o.CLIENT||""),project:String(o.PROJECT||"")}));
    return customerMatches.concat(soMatches).slice(0,12);
  };
  window.openSOMonitoringCustomer=async function(customerId){
    if(!initialized)await initialize();
    if(!orders.length)await loadOrders();
    if(!customers.length||!payments.length)await loadCustomerData();
    const customer=customers.find(c=>String(c.CUSTOMER_ID||"").trim()===String(customerId||"").trim());
    if(!customer)throw new Error("Customer not found. Please reload the customer list.");
    $("soMonitorResult").hidden=false;
    $("soMonitorResult").innerHTML='<div class="som-loading">Loading complete customer history…</div>';
    $("soMonitorSearch").value=customer.CLIENT_NAME||"";
    $("soMonitorSuggestions").hidden=true;
    renderCustomerDetails(customer);
  };
  window.openSOMonitoringSO=async function(no){if(!initialized)await initialize();return loadDetails(String(no||"").trim());};
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