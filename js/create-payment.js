/* =========================================================
   LOGIS-TECH SYSTEM
   CREATE PAYMENT
   =========================================================

   WORKFLOW

   01. Open Create Payment
   02. Generate Payment Number
   03. Enter / Search SO Number
   04. Load Sales Order information
   05. Calculate Required DP
   06. Calculate Previous Payments
   07. Calculate Remaining Balance
   08. Enter Current Payment
   09. Select Receipt Type
   10. Save Payment

   IMPORTANT

   - Invoice is OPTIONAL
   - SI is OPTIONAL
   - DR is OPTIONAL
   - Collection Receipt / Acknowledgment Receipt is OPTIONAL
   - SO is the PRIMARY reference for payment
   ========================================================= */


/* =========================================================
   STORAGE KEYS
   ========================================================= */

const PAYMENT_STORAGE_KEYS = [
    "logitechPayments",
    "logisTechPayments",
    "payments",
    "paymentRecords",
    "logitechPaymentRecords"
];

const PAYMENT_PRIMARY_STORAGE_KEY = "logitechPayments";
const PAYMENT_API_URL = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
let databaseSalesOrders = [];
let databasePayments = [];
let databaseDeliveryReceipts = [];
let deliveryDataLoaded = false;
let paymentDataLoaded = false;

const SALES_ORDER_STORAGE_KEYS = [
    "logitechSalesOrders",
    "logisTechSalesOrders",
    "salesOrders",
    "salesOrderRecords"
];


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let createPaymentInitialized = false;

let selectedSalesOrder = null;

let currentSalesOrderTotal = 0;
let currentRequiredDP = 0;
let currentPreviousPaid = 0;
let currentRemainingBalance = 0;


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeCreatePayment() {

    if (createPaymentInitialized) {
        return;
    }

    createPaymentInitialized = true;

    console.log("========================================");
    console.log("LOGIS-TECH CREATE PAYMENT");
    console.log("Initializing...");
    console.log("========================================");

    setDefaultPaymentDate();
    bindCreatePaymentEvents();
    await loadPaymentDataFromDatabase();
    setDefaultPaymentNumber();

    updatePaymentSummary();

    console.log("Create Payment initialized.");
}


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    initializeCreatePayment();

});


/* =========================================================
   DEFAULT PAYMENT DATE
   ========================================================= */

function setDefaultPaymentDate() {

    const input = document.getElementById("paymentDate");

    if (!input) {
        return;
    }

    if (!input.value) {

        const today = new Date();

        const year = today.getFullYear();

        const month = String(
            today.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            today.getDate()
        ).padStart(2, "0");

        input.value =
            `${year}-${month}-${day}`;
    }
}


/* =========================================================
   PAYMENT NUMBER
   ========================================================= */

function setDefaultPaymentNumber() {

    const input = document.getElementById("paymentNo");

    if (!input) {
        return;
    }

    if (!input.value) {
        input.value = generatePaymentNumber();
    }

}


/* =========================================================
   GENERATE PAYMENT NUMBER
   ========================================================= */

function generatePaymentNumber() {
    const year = new Date().getFullYear();
    let maxSequence = 0;
    (Array.isArray(databasePayments) ? databasePayments : []).forEach(function(payment) {
        const number = String(payment.PAYMENT_NO || payment.paymentNo || "");
        const match = number.match(new RegExp("^PAY-" + year + "-(\\d+)$"));
        if (match) maxSequence = Math.max(maxSequence, Number(match[1]) || 0);
    });
    const sequenceKey = "logisTechPaymentSequence";
    const localSequence = parseInt(localStorage.getItem(sequenceKey) || "0", 10) || 0;
    const nextSequence = Math.max(maxSequence, localSequence) + 1;
    localStorage.setItem(sequenceKey, String(nextSequence));
    return "PAY-" + year + "-" + String(nextSequence).padStart(4, "0");
}

/* =========================================================
   BIND EVENTS
   ========================================================= */

function bindCreatePaymentEvents() {

    const backButton =
        document.getElementById(
            "backToPaymentBtn"
        );

    const cancelButton =
        document.getElementById(
            "cancelPaymentBtn"
        );

    const bottomCancelButton =
        document.getElementById(
            "bottomCancelPaymentBtn"
        );

    const saveButton =
        document.getElementById(
            "savePaymentBtn"
        );

    const bottomSaveButton =
        document.getElementById(
            "bottomSavePaymentBtn"
        );

    const checkSOButton =
        document.getElementById(
            "checkPaymentSOBtn"
        );

    const soInput =
        document.getElementById(
            "paymentSONo"
        );

    const currentPaymentInput =
        document.getElementById(
            "paymentCurrentAmountInput"
        );

    const paymentDate =
        document.getElementById(
            "paymentDate"
        );

    const paymentMethod =
        document.getElementById(
            "paymentMethod"
        );

    const paymentStatus =
        document.getElementById(
            "paymentStatus"
        );

    const receiptType =
        document.getElementById(
            "paymentReceiptType"
        );

    const receiptNo =
        document.getElementById(
            "paymentReceiptNo"
        );

    const invoiceNo =
        document.getElementById(
            "paymentInvoiceNo"
        );

    const siNo =
        document.getElementById(
            "paymentSINo"
        );

    const drNo =
        document.getElementById(
            "paymentDRNo"
        );


    /* =====================================================
       BACK
       ===================================================== */

    if (backButton) {

        backButton.addEventListener(
            "click",
            function () {

                window.location.href =
                    "../index.html";

            }
        );

    }


    /* =====================================================
       CANCEL
       ===================================================== */

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            cancelPayment
        );

    }

    if (bottomCancelButton) {

        bottomCancelButton.addEventListener(
            "click",
            cancelPayment
        );

    }


    /* =====================================================
       SAVE
       ===================================================== */

    if (saveButton) {

        saveButton.addEventListener(
            "click",
            savePayment
        );

    }

    if (bottomSaveButton) {

        bottomSaveButton.addEventListener(
            "click",
            savePayment
        );

    }


    /* =====================================================
       CHECK SO
       ===================================================== */

    if (checkSOButton) {

        checkSOButton.addEventListener(
            "click",
            checkSalesOrder
        );

    }


    /* =====================================================
       ENTER ON SO INPUT
       ===================================================== */

    if (soInput) {

        soInput.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    checkSalesOrder();

                }

            }
        );

    }


    /* =====================================================
       CURRENT PAYMENT
       ===================================================== */

    if (currentPaymentInput) {

        currentPaymentInput.addEventListener(
            "input",
            function () {

                updatePaymentSummary();

            }
        );

    }


    /* =====================================================
       PAYMENT DATE
       ===================================================== */

    if (paymentDate) {

        paymentDate.addEventListener(
            "change",
            updatePaymentSummary
        );

    }


    /* =====================================================
       PAYMENT METHOD
       ===================================================== */

    if (paymentMethod) {

        paymentMethod.addEventListener(
            "change",
            updatePaymentSummary
        );

    }


    /* =====================================================
       STATUS
       ===================================================== */

    if (paymentStatus) {

        paymentStatus.addEventListener(
            "change",
            updatePaymentSummary
        );

    }


    /* =====================================================
       RECEIPT
       ===================================================== */

    if (receiptType) {

        receiptType.addEventListener(
            "change",
            updatePaymentSummary
        );

    }

    if (receiptNo) {

        receiptNo.addEventListener(
            "input",
            updatePaymentSummary
        );

    }

    if (invoiceNo) {

        invoiceNo.addEventListener(
            "input",
            updatePaymentSummary
        );

    }

    if (siNo) {

        siNo.addEventListener(
            "input",
            updatePaymentSummary
        );

    }

    if (drNo) drNo.addEventListener("input", updatePaymentSummary);
    const soSearchInput=document.getElementById("paymentSONo"),referenceInput=document.getElementById("paymentReferenceNo");
    if(soSearchInput){
        soSearchInput.addEventListener("input",handleSOSearchInput);
        soSearchInput.addEventListener("focus",handleSOSearchInput);
        soSearchInput.addEventListener("keydown",handleSOSearchKeyboard);
        document.addEventListener("click",function(event){const wrap=document.querySelector(".create-payment-so-search");if(wrap&&!wrap.contains(event.target))hideSOSuggestions();});
    }
    if(referenceInput)referenceInput.addEventListener("input",updatePaymentSummary);
    const refreshUnpaidSOBtn = document.getElementById("refreshUnpaidPaymentSOBtn");
    if (refreshUnpaidSOBtn) refreshUnpaidSOBtn.addEventListener("click", async function() {
        refreshUnpaidSOBtn.disabled = true;
        await loadPaymentDataFromDatabase();
        refreshUnpaidSOBtn.disabled = false;
    });

}


/* =========================================================
   CANCEL PAYMENT
   ========================================================= */

function cancelPayment() {

    const confirmed =
        confirm(
            "Cancel this payment preparation?"
        );

    if (!confirmed) {
        return;
    }

    window.location.href =
        "../index.html";

}


/* GOOGLE SHEETS API + SALES ORDER AUTOCOMPLETE */
async function paymentAPIGet(action) {
    const response = await fetch(PAYMENT_API_URL + "?action=" + encodeURIComponent(action) + "&_=" + Date.now(), { method: "GET", cache: "no-store", redirect: "follow" });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch (error) { throw new Error("Invalid response from LOGIS-TECH database."); }
    if (!response.ok || !result || result.success === false) throw new Error(result && (result.message || result.error) || (action + " failed."));
    return result;
}

async function paymentAPI(action, data = {}) {
    const response = await fetch(PAYMENT_API_URL, { method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({action:action,data:data}) });
    const raw = await response.text();
    let result;
    try { result=JSON.parse(raw); } catch(error) { throw new Error("Invalid response from LOGIS-TECH database."); }
    if (!response.ok || !result || result.success===false) throw new Error(result && (result.message||result.error) || "Database request failed.");
    return result;
}
async function loadPaymentDataFromDatabase() {
    try {
        const results = await Promise.all([
            paymentAPI("getSalesOrders", {}),
            paymentAPI("getPayments", {})
        ]);
        const soRows = Array.isArray(results[0].salesOrders) ? results[0].salesOrders : (Array.isArray(results[0].records) ? results[0].records : (Array.isArray(results[0].data) ? results[0].data : []));
        const paymentRows = Array.isArray(results[1].payments) ? results[1].payments : (Array.isArray(results[1].records) ? results[1].records : (Array.isArray(results[1].data) ? results[1].data : []));
        databaseSalesOrders = soRows.map(function(row) { return Object.assign({}, row, {
            soNo: row.SO_NUMBER || row.soNo || row.salesOrderNo || "", poNo: row.PO_NUMBER || row.poNo || row.poNumber || "",
            client: row.CLIENT_NAME || row.client || row.clientName || "", project: row.PROJECT || row.project || "",
            billingAddress: row.BILLING_ADDRESS || row.billingAddress || "",
            total: row.GRAND_TOTAL ?? row.TOTAL_AMOUNT ?? row.SO_TOTAL ?? row.total ?? row.grandTotal ?? 0,
            terms: row.TERMS || row.PAYMENT_TERMS || row.terms || "", status: row.STATUS || row.status || ""
        }); });
        databasePayments = paymentRows.map(function(row) { return Object.assign({}, row, {
            soNo: row.SO_NUMBER || row.soNo || "", currentPayment: row.SO_APPLIED_AMOUNT ?? row.soAppliedAmount ?? row.CURRENT_PAYMENT ?? row.currentPayment ?? row.amount ?? 0,
            status: row.PAYMENT_STATUS || row.status || "RECEIVED"
        }); });
        try {
            const drResult = await paymentAPIGet("getDeliveryReceipts");
            databaseDeliveryReceipts = Array.isArray(drResult.deliveryReceipts) ? drResult.deliveryReceipts : (Array.isArray(drResult.records) ? drResult.records : (Array.isArray(drResult.data) ? drResult.data : []));
            deliveryDataLoaded = true;
        } catch (deliveryError) {
            databaseDeliveryReceipts = [];
            deliveryDataLoaded = false;
            console.warn("Delivery Receipt records are not available; payment records will still load.", deliveryError);
        }
        paymentDataLoaded = true;
        renderUnpaidPaymentSOTable();
        renderSelectedSOPaymentTransactions(selectedSalesOrder ? getSalesOrderNumber(selectedSalesOrder) : getValue("paymentSONo"));
        return true;
    } catch(error) {
        console.error("Could not load payment and sales order data from database:", error);
        paymentDataLoaded = false;
        const tbody = document.getElementById("unpaidPaymentSOTableBody");
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="create-payment-unpaid-empty">Unable to load Sales Orders and payment transactions from the database. Please refresh.</td></tr>';
        const historyBody = document.getElementById("selectedSOPaymentHistoryBody");
        if (historyBody) historyBody.innerHTML = '<tr><td colspan="7" class="create-payment-unpaid-empty">Unable to load payment transactions from the database.</td></tr>';
        return false;
    }
}
function paymentSOKey(value) { return String(value || "").trim().toLowerCase(); }

function getPaymentAppliedForSO(soNumber) {
    const accepted = ["RECEIVED", "PAID", "CONFIRMED", "COMPLETED", "POSTED"];
    return databasePayments.reduce(function(total, payment) {
        if (paymentSOKey(payment.SO_NUMBER || payment.soNo || payment.salesOrderNo) !== paymentSOKey(soNumber)) return total;
        const status = String(payment.PAYMENT_STATUS || payment.status || "RECEIVED").trim().toUpperCase();
        if (!accepted.includes(status)) return total;
        const applied = payment.SO_APPLIED_AMOUNT ?? payment.soAppliedAmount;
        return total + parseMoney(applied !== undefined && applied !== null && applied !== "" ? applied : (payment.CURRENT_PAYMENT ?? payment.currentPayment ?? payment.amount ?? 0));
    }, 0);
}

function paymentSOItems(so) {
    if (Array.isArray(so.items)) return so.items;
    if (Array.isArray(so.ITEMS)) return so.ITEMS;
    if (Array.isArray(so.SO_ITEMS)) return so.SO_ITEMS;
    return [];
}

function paymentDRItems(dr) {
    if (Array.isArray(dr.items)) return dr.items;
    if (Array.isArray(dr.ITEMS)) return dr.ITEMS;
    if (Array.isArray(dr.DR_ITEMS)) return dr.DR_ITEMS;
    return [];
}

function paymentDeliveryStatus(so) {
    const soNo = getSalesOrderNumber(so);
    const deliveryStatusRaw = String(so.DELIVERY_STATUS || so.DELIVERY_PROGRESS || so.deliveryStatus || "").trim().toUpperCase().replace(/[ _-]+/g, " ");
    if (/FULLY DELIVERED|FULL DELIVERY|COMPLETED DELIVERY/.test(deliveryStatusRaw)) return "FULLY DELIVERED";
    if (/PARTIALLY DELIVERED|PARTIAL DELIVERY/.test(deliveryStatusRaw)) return "PARTIALLY DELIVERED";
    const matching = databaseDeliveryReceipts.filter(function(dr) {
        const ref = dr.SO_NUMBER || dr.soNumber || dr.SO_NO || dr.soNo || dr.SALES_ORDER_NO || dr.salesOrderNo || "";
        const status = String(dr.STATUS || dr.status || "").trim().toUpperCase().replace(/[ _-]+/g, "_");
        return paymentSOKey(ref) === paymentSOKey(soNo) && !["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(status);
    });
    if (!deliveryDataLoaded) return "STATUS UNAVAILABLE";
    if (!matching.length) return "UNDELIVERED";
    const delivered = matching.filter(function(dr) {
        const status = String(dr.STATUS || dr.status || "").trim().toUpperCase().replace(/[ _-]+/g, "_");
        const deliveredDate = dr.DATE_DELIVERED || dr.DATE_DELIVERY || dr.DELIVERED_DATE || dr.dateDelivered || "";
        return !!deliveredDate || ["COMPLETED", "DELIVERED", "FULLY_DELIVERED", "FOR_INVOICE", "FOR_BILLING"].includes(status);
    });
    if (!delivered.length) return "UNDELIVERED";
    const orderedItems = paymentSOItems(so);
    const totalOrdered = orderedItems.reduce(function(sum, item) { return sum + parseMoney(item.QTY ?? item.QUANTITY ?? item.ORDER_QTY ?? item.ORDERED_QTY ?? item.qty ?? item.quantity ?? item.orderQty ?? 0); }, 0);
    if (totalOrdered > 0) {
        const deliveredQty = delivered.reduce(function(sum, dr) {
            return sum + paymentDRItems(dr).reduce(function(itemSum, item) { return itemSum + parseMoney(item.DELIVERED_QTY ?? item.QTY_DELIVERED ?? item.QUANTITY_DELIVERED ?? item.QTY ?? item.QUANTITY ?? item.qty ?? item.quantity ?? 0); }, 0);
        }, 0);
        return deliveredQty >= totalOrdered - 0.0001 ? "FULLY DELIVERED" : (deliveredQty > 0 ? "PARTIALLY DELIVERED" : "UNDELIVERED");
    }
    const explicitStatus = String(so.DELIVERY_STATUS || so.DELIVERY_PROGRESS || so.deliveryStatus || "").trim().toUpperCase().replace(/[ _-]+/g, " ");
    if (/FULLY DELIVERED|FULL DELIVERY|COMPLETED DELIVERY/.test(explicitStatus)) return "FULLY DELIVERED";
    return "PARTIALLY DELIVERED";
}

function renderUnpaidPaymentSOTable() {
    const tbody = document.getElementById("unpaidPaymentSOTableBody");
    if (!tbody) return;
    const rows = databaseSalesOrders.map(function(so) {
        const soNo = getSalesOrderNumber(so);
        const total = getSalesOrderTotal(so);
        const paid = getPaymentAppliedForSO(soNo);
        return { so: so, soNo: soNo, total: total, paid: paid, balance: Math.max(0, total - paid), deliveryStatus: paymentDeliveryStatus(so) };
    }).filter(function(row) {
        const status = String(row.so.STATUS || row.so.status || "").trim().toUpperCase();
        return row.soNo && row.balance > 0.005 && !["CANCELLED", "CANCELED", "VOID", "VOIDED"].includes(status);
    }).sort(function(a, b) { return String(getSalesOrderDateForPayment(b.so) || "").localeCompare(String(getSalesOrderDateForPayment(a.so) || "")); });
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="create-payment-unpaid-empty">No unpaid Sales Orders found in the database.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(function(row, index) {
        return '<tr><td>'+escapePaymentHTML(row.soNo)+'</td><td>'+escapePaymentHTML(getSalesOrderClient(row.so)||"—")+'</td><td>'+escapePaymentHTML(getSalesOrderProject(row.so)||"—")+'</td><td>'+escapePaymentHTML(formatPaymentSODate(getSalesOrderDateForPayment(row.so)))+'</td><td>'+escapePaymentHTML(formatPaymentCurrency(row.total))+'</td><td>'+escapePaymentHTML(formatPaymentCurrency(row.paid))+'</td><td class="create-payment-unpaid-balance">'+escapePaymentHTML(formatPaymentCurrency(row.balance))+'</td><td><span class="create-payment-delivery-status '+paymentDeliveryStatusClass(row.deliveryStatus)+'">'+escapePaymentHTML(row.deliveryStatus)+'</span></td><td><button type="button" class="create-payment-btn create-payment-btn-primary create-payment-select-so" data-unpaid-so-index="'+index+'">SELECT</button></td></tr>';
    }).join("");
    tbody.querySelectorAll("[data-unpaid-so-index]").forEach(function(button) {
        button.addEventListener("click", function() {
            const row = rows[Number(button.getAttribute("data-unpaid-so-index"))];
            if (!row) return;
            const input = document.getElementById("paymentSONo");
            if (input) input.value = row.soNo;
            selectedSalesOrder = row.so;
            hideSOSuggestions();
            loadSalesOrderInformation(row.so);
            updatePaymentSummary();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    });
}

function renderSelectedSOPaymentTransactions(soNumber) {
    const tbody = document.getElementById("selectedSOPaymentHistoryBody");
    const caption = document.getElementById("selectedSOPaymentHistoryCaption");
    if (!tbody) return;
    const soKey = paymentSOKey(soNumber);
    if (caption) caption.textContent = soNumber ? "Saved payment transactions recorded against " + soNumber + "." : "Select a Sales Order to view its saved payment transactions from the database.";
    if (!soKey) { tbody.innerHTML = '<tr><td colspan="7" class="create-payment-unpaid-empty">No Sales Order selected.</td></tr>'; return; }
    const rows = databasePayments.filter(function(payment) {
        return paymentSOKey(payment.SO_NUMBER || payment.soNo || payment.salesOrderNo || payment.salesOrderNumber) === soKey;
    }).sort(function(a,b) {
        return String(b.PAYMENT_DATE || b.paymentDate || b.date || b.CREATED_AT || "").localeCompare(String(a.PAYMENT_DATE || a.paymentDate || a.date || a.CREATED_AT || ""));
    });
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="7" class="create-payment-unpaid-empty">No saved payment transactions found for this Sales Order.</td></tr>'; return; }
    tbody.innerHTML = rows.map(function(payment) {
        const amount = payment.SO_APPLIED_AMOUNT ?? payment.soAppliedAmount ?? payment.CURRENT_PAYMENT ?? payment.currentPayment ?? payment.AMOUNT ?? payment.amount ?? 0;
        const date = payment.PAYMENT_DATE || payment.paymentDate || payment.date || "";
        const status = String(payment.PAYMENT_STATUS || payment.paymentStatus || payment.status || "—").toUpperCase();
        return '<tr><td>'+escapePaymentHTML(payment.PAYMENT_NO || payment.paymentNo || payment.PAYMENT_ID || "—")+'</td><td>'+escapePaymentHTML(formatPaymentSODate(date))+'</td><td>'+escapePaymentHTML(payment.PAYMENT_METHOD || payment.paymentMethod || "—")+'</td><td>'+escapePaymentHTML(payment.RECEIPT_NO || payment.receiptNo || "—")+'</td><td>'+escapePaymentHTML(payment.REFERENCE_NO || payment.referenceNo || "—")+'</td><td class="create-payment-unpaid-balance">'+escapePaymentHTML(formatPaymentCurrency(amount))+'</td><td>'+escapePaymentHTML(status)+'</td></tr>';
    }).join("");
}

function getSalesOrderDateForPayment(so) { return so.DATE_CREATION || so.SO_DATE || so.DATE || so.date || so.createdAt || so.CREATED_AT || ""; }
function formatPaymentSODate(value) { if (!value) return "—"; const date = new Date(value); return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-PH"); }
function formatPaymentCurrency(value) { return "₱" + parseMoney(value).toLocaleString("en-PH", {minimumFractionDigits:2, maximumFractionDigits:2}); }
function paymentDeliveryStatusClass(status) { return status === "FULLY DELIVERED" ? "is-fully-delivered" : status === "PARTIALLY DELIVERED" ? "is-partially-delivered" : status === "STATUS UNAVAILABLE" ? "is-status-unavailable" : "is-undelivered"; }

function getSalesOrderPONumber(so){return String(so.PO_NUMBER||so.poNo||so.poNumber||"").trim();}
function handleSOSearchInput(){
    const input=document.getElementById("paymentSONo"),query=normalizeText(input?input.value:"");
    if(!query){hideSOSuggestions();return;}
    if(!paymentDataLoaded){loadPaymentDataFromDatabase().then(function(ok){if(ok)renderSOSuggestions(query);});return;}
    renderSOSuggestions(query);
}
function renderSOSuggestions(query){
    const box=document.getElementById("paymentSOSuggestions");if(!box)return;
    const matches=databaseSalesOrders.filter(function(so){
        const status=normalizeText(so.STATUS||so.status||"");if(status==="cancelled")return false;
        return [getSalesOrderNumber(so),getSalesOrderPONumber(so),getSalesOrderClient(so),getSalesOrderProject(so)].some(function(value){return normalizeText(value).includes(query);});
    }).slice(0,10);
    if(!matches.length){box.innerHTML='<div class="create-payment-so-suggestion-empty">No matching Sales Orders found</div>';box.hidden=false;return;}
    box.innerHTML=matches.map(function(so,index){return '<button type="button" class="create-payment-so-suggestion" role="option" data-index="'+index+'">'+
        '<span class="create-payment-so-suggestion-main">'+escapePaymentHTML(getSalesOrderNumber(so))+'</span>'+
        '<span class="create-payment-so-suggestion-meta">'+escapePaymentHTML(getSalesOrderClient(so))+' · PO: '+escapePaymentHTML(getSalesOrderPONumber(so)||"—")+'</span>'+
        '<span class="create-payment-so-suggestion-project">'+escapePaymentHTML(getSalesOrderProject(so)||"No project")+'</span></button>';}).join("");
    box.hidden=false;
    box.querySelectorAll("[data-index]").forEach(function(button){button.addEventListener("click",function(){
        const so=matches[Number(button.dataset.index)];if(!so)return;
        setValue("paymentSONo",getSalesOrderNumber(so));hideSOSuggestions();selectedSalesOrder=so;
        loadSalesOrderInformation(so);updatePaymentSummary();
    });});
}
function handleSOSearchKeyboard(event){
    if(event.key==="Escape")hideSOSuggestions();
    if(event.key==="Enter"){const box=document.getElementById("paymentSOSuggestions"),first=box&&box.querySelector("[data-index]");if(first&&!box.hidden){event.preventDefault();first.click();}}
}
function hideSOSuggestions(){const box=document.getElementById("paymentSOSuggestions");if(box){box.hidden=true;box.innerHTML="";}}
function escapePaymentHTML(value){return String(value==null?"":value).replace(/[&<>"']/g,function(char){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char];});}


/* =========================================================
   CHECK SALES ORDER
   ========================================================= */

async function checkSalesOrder() {

    const input =
        document.getElementById(
            "paymentSONo"
        );

    if (!input) {
        return;
    }

    const soNumber =
        String(
            input.value || ""
        ).trim();

    if (!soNumber) {

        alert(
            "Please enter a Sales Order number."
        );

        input.focus();

        return;
    }


    console.log(
        "Checking Sales Order:",
        soNumber
    );


    if (!paymentDataLoaded) {
        const loaded = await loadPaymentDataFromDatabase();
        if (!loaded) { alert("Could not load Sales Orders from the Google Sheets database. Please try again."); return; }
    }
    const salesOrders = paymentDataLoaded ? databaseSalesOrders : getStoredSalesOrders();


    if (!salesOrders.length) {

        clearSalesOrderInformation();

        alert(
            "No Sales Order records were found in the system."
        );

        return;
    }


    const foundSO =
        salesOrders.find(
            function (so) {

                return isSameSalesOrder(
                    so,
                    soNumber
                );

            }
        );


    if (!foundSO) {

        clearSalesOrderInformation();

        alert(
            "Sales Order not found:\n\n" +
            soNumber
        );

        return;
    }


    selectedSalesOrder = foundSO;


    console.log(
        "Sales Order found:",
        foundSO
    );


    loadSalesOrderInformation(
        foundSO
    );


    updatePaymentSummary();


    alert(
        "Sales Order found.\n\n" +
        "SO No.: " +
        getSalesOrderNumber(foundSO)
    );

}


/* =========================================================
   GET SALES ORDERS
   ========================================================= */

function getStoredSalesOrders() {

    if (paymentDataLoaded) return databaseSalesOrders;

    for (
        let i = 0;
        i < SALES_ORDER_STORAGE_KEYS.length;
        i++
    ) {

        const key =
            SALES_ORDER_STORAGE_KEYS[i];

        const raw =
            localStorage.getItem(key);

        if (!raw) {
            continue;
        }


        try {

            const parsed =
                JSON.parse(raw);


            const records =
                normalizeStoredArray(
                    parsed
                );


            if (records.length) {

                console.log(
                    "Sales Orders loaded from:",
                    key,
                    records.length
                );

                return records;
            }

        } catch (error) {

            console.warn(
                "Invalid Sales Order storage:",
                key,
                error
            );

        }

    }


    return [];

}


/* =========================================================
   NORMALIZE STORED ARRAY
   ========================================================= */

function normalizeStoredArray(data) {

    if (Array.isArray(data)) {
        return data;
    }


    if (
        data &&
        Array.isArray(data.data)
    ) {

        return data.data;

    }


    if (
        data &&
        Array.isArray(data.records)
    ) {

        return data.records;

    }


    if (
        data &&
        Array.isArray(data.salesOrders)
    ) {

        return data.salesOrders;

    }


    return [];

}


/* =========================================================
   COMPARE SALES ORDER
   ========================================================= */

function isSameSalesOrder(
    so,
    searchNumber
) {

    const search =
        normalizeText(
            searchNumber
        );


    const possibleNumbers = [

        so.SO_NUMBER,

        so.soNo,

        so.salesOrderNo,

        so.salesOrderNumber,

        so.salesOrder,

        so.soNumber,

        so.orderNo,

        so.orderNumber,

        so.number

    ];


    return possibleNumbers.some(
        function (value) {

            return (
                normalizeText(value) ===
                search
            );

        }
    );

}


/* =========================================================
   LOAD SO INFORMATION
   ========================================================= */

function loadSalesOrderInformation(
    so
) {

    const soNumber =
        getSalesOrderNumber(so);

    const client =
        getSalesOrderClient(so);

    const project =
        getSalesOrderProject(so);

    const billingAddress =
        getSalesOrderBillingAddress(so);

    const total =
        getSalesOrderTotal(so);

    const terms =
        getPaymentTerms(so);


    currentSalesOrderTotal =
        total;


    currentRequiredDP =
        calculateRequiredDP(
            total,
            terms,
            so
        );


    currentPreviousPaid =
        calculatePreviousPaid(
            soNumber
        );


    currentRemainingBalance =
        Math.max(
            0,
            total - currentPreviousPaid
        );


    /* =====================================================
       SO INFORMATION
       ===================================================== */

    setValue(
        "paymentSOClient",
        client
    );

    setValue(
        "paymentSOProject",
        project
    );

    setValue(
        "paymentSOTotal",
        formatCurrency(total)
    );

    setValue(
        "paymentTerms",
        terms
    );

    setValue(
        "paymentRequiredDP",
        formatCurrency(
            currentRequiredDP
        )
    );

    setValue(
        "paymentPreviousPaid",
        formatCurrency(
            currentPreviousPaid
        )
    );

    setValue(
        "paymentRemainingDP",
        formatCurrency(
            currentRemainingBalance
        )
    );

    setValue(
        "paymentSOStatus",
        getPaymentStatusFromBalance(
            total,
            currentPreviousPaid
        )
    );


    /* =====================================================
       CUSTOMER INFORMATION
       ===================================================== */

    setValue(
        "paymentClient",
        client
    );

    setValue(
        "paymentProject",
        project
    );

    setValue(
        "paymentBillingAddress",
        billingAddress
    );


    /* =====================================================
       PAYMENT AMOUNT
       ===================================================== */

    setValue(
        "paymentInvoiceAmountInput",
        total
    );

    setValue(
        "paymentPreviousPaidInput",
        currentPreviousPaid
    );


    /* =====================================================
       SUMMARY
       ===================================================== */

    setText(
        "summaryPaymentSO",
        soNumber || "—"
    );

    setText(
        "summaryPaymentClient",
        client || "—"
    );


    console.log(
        "SO Total:",
        total
    );

    console.log(
        "Required DP:",
        currentRequiredDP
    );

    console.log(
        "Previous Paid:",
        currentPreviousPaid
    );

    console.log(
        "Remaining:",
        currentRemainingBalance
    );

    renderSelectedSOPaymentTransactions(soNumber);

}


/* =========================================================
   CLEAR SO INFORMATION
   ========================================================= */

function clearSalesOrderInformation() {

    selectedSalesOrder = null;

    currentSalesOrderTotal = 0;
    currentRequiredDP = 0;
    currentPreviousPaid = 0;
    currentRemainingBalance = 0;


    setValue(
        "paymentSOClient",
        ""
    );

    setValue(
        "paymentSOProject",
        ""
    );

    setValue(
        "paymentSOTotal",
        "₱0.00"
    );

    setValue(
        "paymentTerms",
        ""
    );

    setValue(
        "paymentRequiredDP",
        "₱0.00"
    );

    setValue(
        "paymentPreviousPaid",
        "₱0.00"
    );

    setValue(
        "paymentRemainingDP",
        "₱0.00"
    );

    setValue(
        "paymentSOStatus",
        "NO PAYMENT"
    );


    setValue(
        "paymentClient",
        ""
    );

    setValue(
        "paymentProject",
        ""
    );

    setValue(
        "paymentBillingAddress",
        ""
    );


    setValue(
        "paymentInvoiceAmountInput",
        "0"
    );

    setValue(
        "paymentPreviousPaidInput",
        "0"
    );


    setText(
        "summaryPaymentSO",
        "—"
    );

    setText(
        "summaryPaymentClient",
        "No Sales Order selected"
    );


    updatePaymentSummary();
    renderSelectedSOPaymentTransactions("");

}


/* =========================================================
   CALCULATE REQUIRED DP
   ========================================================= */

function calculateRequiredDP(
    total,
    terms,
    so
) {
    const orderTotal = parseMoney(total);

    /*
       Prefer the original Required DP stored on the Sales Order.
       This prevents the value from becoming zero or changing after
       payments are recorded. Only calculate from terms when no
       explicit Required DP amount is available.
    */
    const explicitDPFields = [
        so && so.REQUIRED_DP,
        so && so.REQUIRED_DP_AMOUNT,
        so && so.REQUIRED_DOWN_PAYMENT,
        so && so.requiredDP,
        so && so.requiredDp,
        so && so.requiredDownPayment,
        so && so.downPayment,
        so && so.downpayment,
        so && so.dpAmount,
        so && so.depositAmount
    ];

    for (let i = 0; i < explicitDPFields.length; i++) {
        const rawValue = explicitDPFields[i];
        if (rawValue !== "" && rawValue !== undefined && rawValue !== null) {
            const value = parseMoney(rawValue);
            if (value > 0) return Math.min(orderTotal, value);
        }
    }

    const termKey = String(terms || "").replace(/\s+/g, " ").trim().toUpperCase();
    const requiredDPMultipliers = {
        "COD": 0.5,
        "50% DP, 50% UPON DELIVERY": 0.5,
        "30% DP, 70% UPON DELIVERY": 0.3,
        "30% DP BAL 30 DAYS PDC": 0.3,
        "20% DP, 70% UPON DELIVERY": 0.2,
        "30 DAYS PDC": 0,
        "60 DAYS PDC": 0,
        "30 DAYS": 0,
        "60 DAYS": 0,
        "15 DAYS PDC": 0,
        "50% DP, 50% 15 DAYS PDC UPON DELIVERY": 0.5,
        "50% DP, 50% 30 DAYS PDC UPON DELIVERY": 0.5,
        "50% DP, 50% 60 DAYS PDC UPON DELIVERY": 0.5,
        "7 DAYS UPI": 0,
        "CASH": 0,
        "60 DAYS UPI TO FINANCE": 0,
        "30% DP, BAL. PROGRESS BILLING": 0.3,
        "30 DAYS UPI": 0,
        "50% DP, 30DAYS UPI": 0.5,
        "15 DAYS": 0,
        "15 DAYS UPI": 0,
        "20% D.P.BAL COD": 0.2,
        "30% D.P.,BAL. 15 DAYS PDC": 0.3,
        "30% D.P.,BAL. 30DAYS": 0.3,
        "30% DOWNPAYMENT, 70% BAL WITHIN 30 DAYS BASED ON PROGRESS BILLING": 0.3,
        "45 DAYS PDC": 0,
        "30% DP, 70% 30 DAYS PDC": 0.3,
        "PAID": 0,
        "30% DP, BALANCE 30 DAYS PDC UPON DELIVERY (STAGGERED DELIVERY)": 0.3,
        "15 DAYS UPON DELIVERY": 0,
        "50% DP, 50% 30 DAYS": 0.5,
        "30% DP, 70% 30 DAYS UPI": 0.3,
        "45 DAYS": 0,
        "FULL PAYMENT": 0,
        "30% 15 DAYS, 70% 30 DAYS": 0,
        "30% DP, 60% UPON DEL. 10% RETENTION": 0.3,
        "50% DP, BAL. 30 DAYS UPI": 0.5,
        "50% CASH, 50% POSTED CHECK BEFORE DELIVERY": 0.5,
        "50% DP, 50% UPON ACCEPTANCE": 0.5,
        "30% DP, BAL COD": 0.3,
        "10% DP, BALANCE PB, 10% RETENTION": 0.1,
        "45 DAYS UPI": 0,
        "30% DP, 70% 30 DAYS": 0.3,
        "15 DAYS UPON RECEIPT OF S.I": 0,
        "7 DAYS UPON COMPLETION": 0,
        "10% DP, BALANCE UPON DELIVERY": 0.1,
        "30% DP, 70% 7 DAYS": 0.3,
        "7 DAYS UD": 0,
        "30% DP, 70% 30 DAYS PDC": 0.3,
        "40% DP, 60% UPON DELIVERY": 0.4,
        "30% DP, BAL. 15 DAYS PDC": 0.3,
        "30% DP, BAL. 7 DAYS UPI": 0.3,
        "30% DP, 70% 30 DAYS PROGRESS BILLING": 0.3,
        "20% DP, BAL. FULL PAYMENT CHECK UPON DELIVERY": 0.2,
        "30% DP, 40% UPON DELIVERY, 30% PDC 30DAYS": 0.3
    };

    if (Object.prototype.hasOwnProperty.call(requiredDPMultipliers, termKey)) {
        return Math.max(0, Math.min(orderTotal, parseMoney(orderTotal * requiredDPMultipliers[termKey])));
    }

    const percentage = extractPercentage(terms);
    if (percentage > 0) {
        return Math.min(orderTotal, orderTotal * percentage);
    }

    return 0;
}

/* =========================================================
   EXTRACT PAYMENT PERCENTAGE
   ========================================================= */

function extractPercentage(
    terms
) {

    const text =
        String(
            terms || ""
        ).toUpperCase();


    /*
       Examples:

       30% DP
       30% DOWN PAYMENT
       DP 30%
       50% ADVANCE
    */

    const match =
        text.match(
            /(\d+(?:\.\d+)?)\s*%/
        );


    if (!match) {
        return 0;
    }


    const percentage =
        parseFloat(
            match[1]
        );


    if (
        isNaN(percentage) ||
        percentage <= 0
    ) {

        return 0;

    }


    return percentage / 100;

}


/* =========================================================
   CALCULATE PREVIOUS PAID
   ========================================================= */

function calculatePreviousPaid(
    soNumber
) {

    if (!soNumber) {
        return 0;
    }


    const payments =
        paymentDataLoaded ? databasePayments : getStoredPayments();


    let totalPaid = 0;


    payments.forEach(
        function (payment) {

            const paymentSO =
                getPaymentSONumber(
                    payment
                );


            if (
                normalizeText(
                    paymentSO
                ) !==
                normalizeText(
                    soNumber
                )
            ) {

                return;

            }


            const appliedAmount = payment.SO_APPLIED_AMOUNT ?? payment.soAppliedAmount;
            const amount = parseMoney(appliedAmount !== undefined && appliedAmount !== null && appliedAmount !== "" ? appliedAmount : getPaymentAmount(payment));


            const paymentStatus=normalizeText(payment.PAYMENT_STATUS||payment.paymentStatus||payment.status||"received");
            const countsAsPaid=["received","paid","confirmed","completed","posted"].includes(paymentStatus);
            if(amount>0&&countsAsPaid)totalPaid+=amount;

        }
    );


    return totalPaid;

}


/* =========================================================
   GET PAYMENTS
   ========================================================= */

function getStoredPayments() {

    if (paymentDataLoaded) return databasePayments;

    for (
        let i = 0;
        i < PAYMENT_STORAGE_KEYS.length;
        i++
    ) {

        const key =
            PAYMENT_STORAGE_KEYS[i];

        const raw =
            localStorage.getItem(key);

        if (!raw) {
            continue;
        }


        try {

            const parsed =
                JSON.parse(raw);

            const records =
                normalizeStoredArray(
                    parsed
                );


            if (records.length) {

                return records;

            }

        } catch (error) {

            console.warn(
                "Invalid payment storage:",
                key,
                error
            );

        }

    }


    return [];

}


/* =========================================================
   PAYMENT SO NUMBER
   ========================================================= */

function getPaymentSONumber(
    payment
) {

    return (

        payment.SO_NUMBER ||

        payment.soNo ||

        payment.salesOrderNo ||

        payment.salesOrderNumber ||

        payment.salesOrder ||

        payment.soNumber ||

        payment.orderNo ||

        ""

    );

}


/* =========================================================
   PAYMENT AMOUNT
   ========================================================= */

function getPaymentAmount(
    payment
) {

    const fields = [

        payment.CURRENT_PAYMENT,

        payment.amount,

        payment.paymentAmount,

        payment.amountPaid,

        payment.paidAmount,

        payment.currentPayment

    ];


    for (
        let i = 0;
        i < fields.length;
        i++
    ) {

        const value =
            parseMoney(
                fields[i]
            );


        if (value > 0) {

            return value;

        }

    }


    return 0;

}


/* =========================================================
   SALES ORDER NUMBER
   ========================================================= */

function getSalesOrderNumber(
    so
) {

    return (

        so.soNo ||

        so.salesOrderNo ||

        so.salesOrderNumber ||

        so.salesOrder ||

        so.soNumber ||

        so.orderNo ||

        so.orderNumber ||

        so.number ||

        ""

    );

}


/* =========================================================
   SALES ORDER CLIENT
   ========================================================= */

function getSalesOrderClient(
    so
) {

    return (

        so.CLIENT_NAME ||

        so.client ||

        so.clientName ||

        so.customer ||

        so.customerName ||

        so.company ||

        so.companyName ||

        ""

    );

}


/* =========================================================
   SALES ORDER PROJECT
   ========================================================= */

function getSalesOrderProject(
    so
) {

    return (

        so.PROJECT ||

        so.project ||

        so.projectName ||

        so.projectTitle ||

        ""

    );

}


/* =========================================================
   SALES ORDER BILLING ADDRESS
   ========================================================= */

function getSalesOrderBillingAddress(
    so
) {

    return (

        so.BILLING_ADDRESS ||

        so.billingAddress ||

        so.billTo ||

        so.billToAddress ||

        so.address ||

        ""

    );

}


/* =========================================================
   SALES ORDER TOTAL
   ========================================================= */

function getSalesOrderTotal(
    so
) {

    const fields = [

        so.GRAND_TOTAL,

        so.TOTAL_AMOUNT,

        so.SO_TOTAL,

        so.total,

        so.totalAmount,

        so.totalSales,

        so.grandTotal,

        so.amount,

        so.orderTotal,

        so.netAmount,

        so.totalOrder

    ];


    for (
        let i = 0;
        i < fields.length;
        i++
    ) {

        const value =
            parseMoney(
                fields[i]
            );


        if (
            value > 0
        ) {

            return value;

        }

    }


    /*
       Try items if there is no direct total.
    */

    const items =
        Array.isArray(
            so.items
        )
            ? so.items
            : [];


    if (items.length) {

        let total = 0;


        items.forEach(
            function (item) {

                const qty =
                    parseMoney(
                        item.qty ||
                        item.quantity ||
                        item.orderQty ||
                        0
                    );


                const price =
                    parseMoney(
                        item.unitPrice ||
                        item.price ||
                        item.rate ||
                        0
                    );


                total +=
                    qty * price;

            }
        );


        return total;

    }


    return 0;

}


/* =========================================================
   PAYMENT TERMS
   ========================================================= */

function getPaymentTerms(
    so
) {

    return (

        so.TERMS ||

        so.PAYMENT_TERMS ||

        so.terms ||

        so.paymentTerms ||

        so.paymentTerm ||

        so.term ||

        so.creditTerms ||

        ""

    );

}


/* =========================================================
   PAYMENT STATUS
   ========================================================= */

function getPaymentStatusFromBalance(
    total,
    paid
) {

    if (
        total <= 0
    ) {

        return "NO SO AMOUNT";

    }


    if (
        paid <= 0
    ) {

        return "NO PAYMENT";

    }


    if (
        paid >= total
    ) {

        return "FULLY PAID";

    }


    return "PARTIAL PAYMENT";

}


/* =========================================================
   UPDATE PAYMENT SUMMARY
   ========================================================= */

function updatePaymentSummary() {

    const currentPayment =
        getNumericInput(
            "paymentCurrentAmountInput"
        );


    const remaining =
        Math.max(
            0,
            currentSalesOrderTotal -
            currentPreviousPaid -
            currentPayment
        );


    const totalPaidAfterPayment =
        currentPreviousPaid +
        currentPayment;


    /* =====================================================
       PAYMENT AMOUNT
       ===================================================== */

    setText(
        "paymentInvoiceAmountDisplay",
        formatCurrency(
            currentSalesOrderTotal
        )
    );

    setText(
        "paymentRequiredDPDisplay",
        formatCurrency(
            currentRequiredDP
        )
    );

    setText(
        "paymentPreviousPaidDisplay",
        formatCurrency(
            currentPreviousPaid
        )
    );

    setText(
        "paymentCurrentAmountDisplay",
        formatCurrency(
            currentPayment
        )
    );

    setText(
        "paymentBalanceDisplay",
        formatCurrency(
            remaining
        )
    );


    setValue("paymentRemainingBalanceInput", formatCurrency(remaining));
    const paymentOver = Math.max(
        0,
        currentPayment -
        Math.max(0, currentSalesOrderTotal - currentPreviousPaid)
    );

    // Preview excess payment as Customer Credit in the right summary card.
    setText(
        "paymentCreditAmountDisplay",
        formatCurrency(paymentOver)
    );

    setValue("paymentOverInput", formatCurrency(paymentOver));


    /*
       Remaining DP / Balance in SALES ORDER INFORMATION:
       No previous payment = full SO total.
       Previous payments = SO total minus previous paid.
       Do not subtract the current payment until it is saved.
    */

    setValue(
        "paymentRemainingDP",
        formatCurrency(
            Math.max(
                0,
                currentSalesOrderTotal -
                currentPreviousPaid
            )
        )
    );


    const status=getPaymentStatusFromBalance(currentSalesOrderTotal,totalPaidAfterPayment);
    setValue("paymentSOStatus",status);setText("paymentStatusPreview",status);


    /*
       Transaction summary.
    */

    setText(
        "summaryPaymentNo",
        getValue(
            "paymentNo"
        ) || "—"
    );

    setText(
        "summaryPaymentDate",
        getValue(
            "paymentDate"
        ) || "—"
    );

    setText(
        "summaryPaymentMethod",
        getValue(
            "paymentMethod"
        ) || "—"
    );

    setText(
        "summaryPaymentInvoice",
        getValue(
            "paymentInvoiceNo"
        ) || "—"
    );

    setText(
        "summaryPaymentSI",
        getValue(
            "paymentSINo"
        ) || "—"
    );

    setText(
        "summaryPaymentDR",
        getValue(
            "paymentDRNo"
        ) || "—"
    );


    setText(
        "summaryPaymentReceiptType",
        getValue(
            "paymentReceiptType"
        ) || "—"
    );

    setText(
        "summaryPaymentReceiptNo",
        getValue(
            "paymentReceiptNo"
        ) || "—"
    );


    updateStatusBadge(
        status
    );

}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function updateStatusBadge(
    status
) {

    const badge =
        document.getElementById(
            "paymentStatusPreview"
        );


    if (!badge) {
        return;
    }


    badge.classList.remove(
        "payment-status-paid",
        "payment-status-partial",
        "payment-status-pending"
    );


    const normalized =
        normalizeText(
            status
        );


    if (
        normalized ===
        "paid" ||
        normalized ===
        "fully paid"
    ) {

        badge.classList.add(
            "payment-status-paid"
        );

    } else if (
        normalized ===
        "partial" ||
        normalized ===
        "partial payment"
    ) {

        badge.classList.add(
            "payment-status-partial"
        );

    } else if (
        normalized ===
        "pending" ||
        normalized ===
        "no payment"
    ) {

        badge.classList.add(
            "payment-status-pending"
        );

    }

}


/* =========================================================
   SAVE PAYMENT
   ========================================================= */

async function savePayment() {
    const validation = validatePayment();
    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    if (!paymentDataLoaded) {
        const connected = await loadPaymentDataFromDatabase();
        if (!connected) {
            alert("Hindi makakonekta sa Google Sheets database. Walang na-save na payment. Pakisubukan ulit.");
            return;
        }
    }

    const saveButtons = [
        document.getElementById("savePaymentBtn"),
        document.getElementById("bottomSavePaymentBtn")
    ].filter(Boolean);

    if (saveButtons.some(function(button) { return button.disabled; })) return;

    saveButtons.forEach(function(button) {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = "SAVING...";
    });

    const paymentNo = getValue("paymentNo");
    const paymentDate = getValue("paymentDate");
    const paymentMethod = getValue("paymentMethod");
    const soNo = getSalesOrderNumber(selectedSalesOrder) || getValue("paymentSONo");
    const client = getSalesOrderClient(selectedSalesOrder) || getValue("paymentClient");
    const project = getSalesOrderProject(selectedSalesOrder) || getValue("paymentProject");
    const billingAddress = getSalesOrderBillingAddress(selectedSalesOrder) || getValue("paymentBillingAddress");
    const currentPayment = getNumericInput("paymentCurrentAmountInput");

    const payload = {
        paymentNo: paymentNo,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        soNumber: soNo,
        clientName: client,
        project: project,
        billingAddress: billingAddress,
        currentPayment: currentPayment,
        receiptType: getValue("paymentReceiptType"),
        receiptNo: getValue("paymentReceiptNo"),
        referenceNo: getValue("paymentReferenceNo"),
        remarks: getValue("paymentRemarks"),
        createdBy: localStorage.getItem("logitechUser") || ""
    };

    try {
        const result = await paymentAPI("createPayment", payload);
        if (!result || result.success !== true) {
            throw new Error((result && (result.message || result.error)) || "Payment could not be saved.");
        }

        const savedPayment = result.payment || result.record || result.data || {};
        localStorage.setItem("logitechLastPayment", JSON.stringify(savedPayment));

        // Refresh the database records so the next payment uses current totals and sequence.
        await loadPaymentDataFromDatabase();

        alert(
            "Payment successfully saved to the Google Sheets database.\n\n" +
            "Payment No.: " + (savedPayment.PAYMENT_NO || savedPayment.paymentNo || paymentNo) + "\n" +
            "SO No.: " + soNo + "\n" +
            "Amount: " + formatCurrency(currentPayment)
        );

        window.location.href = "../index.html";
    } catch (error) {
        console.error("Create Payment API error:", error);
        alert(
            "Payment was NOT saved.\n\n" +
            (error.message || "Hindi makumpleto ang pag-save. Pakisubukan ulit.")
        );
    } finally {
        saveButtons.forEach(function(button) {
            button.disabled = false;
            button.textContent = button.dataset.originalText || "SAVE PAYMENT";
            delete button.dataset.originalText;
        });
    }
}


/* =========================================================
   VALIDATE PAYMENT
   ========================================================= */

function validatePayment() {

    const soNo =
        getValue(
            "paymentSONo"
        );


    const paymentDate =
        getValue(
            "paymentDate"
        );


    const paymentMethod =
        getValue(
            "paymentMethod"
        );


    const client =
        getValue(
            "paymentClient"
        );


    const invoiceNo =
        getValue(
            "paymentInvoiceNo"
        );


    const currentPayment =
        getNumericInput(
            "paymentCurrentAmountInput"
        );


    if (!soNo) {

        return {
            valid: false,
            message:
                "Please enter and check the Sales Order first."
        };

    }


    if (!selectedSalesOrder) {

        return {
            valid: false,
            message:
                "Please click CHECK SO and load the Sales Order before saving."
        };

    }


    if (!paymentDate) {

        return {
            valid: false,
            message:
                "Please enter the payment date."
        };

    }


    if (!paymentMethod) {
        return { valid:false, message:"Please select the payment method." };
    }
    if (!getValue("paymentReferenceNo")) {
        return { valid:false, message:"Reference No. is required." };
    }
    if (!client) {

        return {
            valid: false,
            message:
                "Client information is missing from the Sales Order."
        };

    }


    if (
        currentPayment <= 0
    ) {

        return {
            valid: false,
            message:
                "Please enter a payment amount greater than ₱0.00."
        };

    }


    /*
       Overpayment is allowed.
       The backend allocates payment to the selected SO first,
       then stores any confirmed excess as Customer Credit.
       Do not block payments greater than the remaining SO balance here.
    */


    /*
       Invoice is intentionally NOT required.
    */

    return {
        valid: true
    };

}


/* =========================================================
   GET VALUE
   ========================================================= */

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return "";
    }


    return String(
        element.value || ""
    ).trim();

}


/* =========================================================
   SET VALUE
   ========================================================= */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.value =
        value ?? "";

}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.textContent =
        value ?? "";

}


/* =========================================================
   NUMERIC INPUT
   ========================================================= */

function getNumericInput(
    id
) {

    const value =
        getValue(id);


    return parseMoney(
        value
    );

}


/* =========================================================
   PARSE MONEY
   ========================================================= */

function parseMoney(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    if (
        typeof value ===
        "number"
    ) {

        return isNaN(value)
            ? 0
            : value;

    }


    let cleaned =
        String(value)
            .replace(
                /₱/g,
                ""
            )
            .replace(
                /,/g,
                ""
            )
            .replace(
                /PHP/gi,
                ""
            )
            .trim();


    /*
       Handle parentheses:

       (5000) = -5000
    */

    let negative = false;


    if (
        cleaned.startsWith("(") &&
        cleaned.endsWith(")")
    ) {

        negative = true;

        cleaned =
            cleaned.slice(
                1,
                -1
            );

    }


    const number =
        parseFloat(
            cleaned
        );


    if (
        isNaN(number)
    ) {

        return 0;

    }


    return negative
        ? -number
        : number;

}


/* =========================================================
   FORMAT CURRENCY
   ========================================================= */

function formatCurrency(
    value
) {

    const amount =
        parseMoney(
            value
        );


    return new Intl.NumberFormat(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    ).format(
        amount
    );

}


/* =========================================================
   NORMALIZE TEXT
   ========================================================= */

function normalizeText(
    value
) {

    return String(
        value || ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        );

}


/* =========================================================
   PUBLIC FUNCTIONS
   ========================================================= */

window.initializeCreatePayment =
    initializeCreatePayment;

window.savePayment =
    savePayment;

window.updatePaymentSummary =
    updatePaymentSummary;

window.checkSalesOrder =
    checkSalesOrder;

window.loadSalesOrderInformation =
    loadSalesOrderInformation;

window.getStoredPayments =
    getStoredPayments;

window.getStoredSalesOrders =
    getStoredSalesOrders;
