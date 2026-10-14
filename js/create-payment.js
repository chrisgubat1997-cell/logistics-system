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

    const sequenceKey =
        "logisTechPaymentSequence";

    let sequence =
        parseInt(
            localStorage.getItem(sequenceKey) || "0",
            10
        );

    sequence++;

    localStorage.setItem(
        sequenceKey,
        String(sequence)
    );

    return (
        "PAY-" +
        year +
        "-" +
        String(sequence).padStart(4, "0")
    );
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
        document.addEventListener("click",function(event){const wrap=document.querySelector(".create-payment-so-search-wrap");if(wrap&&!wrap.contains(event.target))hideSOSuggestions();});
    }
    if(referenceInput)referenceInput.addEventListener("input",updatePaymentSummary);

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
        const results=await Promise.all([paymentAPI("getSalesOrders",{}),paymentAPI("getPayments",{})]);
        const soRows=Array.isArray(results[0].salesOrders)?results[0].salesOrders:(Array.isArray(results[0].records)?results[0].records:[]);
        const paymentRows=Array.isArray(results[1].payments)?results[1].payments:(Array.isArray(results[1].records)?results[1].records:[]);
        databaseSalesOrders=soRows.map(function(row){return Object.assign({},row,{
            soNo:row.SO_NUMBER||row.soNo||row.salesOrderNo||"",poNo:row.PO_NUMBER||row.poNo||row.poNumber||"",
            client:row.CLIENT_NAME||row.client||row.clientName||"",project:row.PROJECT||row.project||"",
            billingAddress:row.BILLING_ADDRESS||row.billingAddress||"",
            total:row.GRAND_TOTAL??row.TOTAL_AMOUNT??row.SO_TOTAL??row.total??row.grandTotal??0,
            terms:row.TERMS||row.PAYMENT_TERMS||row.terms||"",status:row.STATUS||row.status||""
        });});
        databasePayments=paymentRows.map(function(row){return Object.assign({},row,{
            soNo:row.SO_NUMBER||row.soNo||"",currentPayment:row.CURRENT_PAYMENT??row.currentPayment??row.amount??0,
            status:row.PAYMENT_STATUS||row.status||"RECEIVED"
        });});
        paymentDataLoaded=true; return true;
    } catch(error) { console.error("Could not load payment data from database:",error); paymentDataLoaded=false; return false; }
}
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
    const salesOrders = databaseSalesOrders.length ? databaseSalesOrders : getStoredSalesOrders();


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

    if (databaseSalesOrders.length) return databaseSalesOrders;

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

}


/* =========================================================
   CALCULATE REQUIRED DP
   ========================================================= */

function calculateRequiredDP(
    total,
    terms,
    so
) {

    /*
       First try explicit DP fields from SO.
    */

    const explicitDPFields = [

        so.requiredDP,

        so.requiredDp,

        so.downPayment,

        so.downpayment,

        so.dpAmount,

        so.depositAmount,

        so.requiredDownPayment

    ];


    for (
        let i = 0;
        i < explicitDPFields.length;
        i++
    ) {

        const value =
            parseMoney(
                explicitDPFields[i]
            );

        if (value > 0) {

            return Math.min(
                total,
                value
            );

        }

    }


    /*
       If there is no explicit DP amount,
       calculate from payment terms.
    */

    const percentage =
        extractPercentage(
            terms
        );


    if (percentage > 0) {

        return Math.min(
            total,
            total * percentage
        );

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
        databasePayments.length ? databasePayments : getStoredPayments();


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


            const amount =
                getPaymentAmount(
                    payment
                );


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

    if (databasePayments.length) return databasePayments;

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
    const paymentOver = Math.max(0, currentPayment - Math.max(0, currentSalesOrderTotal - currentPreviousPaid));
    setValue("paymentOverInput", formatCurrency(paymentOver));


    /*
       Update SO information balance.
    */

    setValue(
        "paymentRemainingDP",
        formatCurrency(
            Math.max(
                0,
                currentRequiredDP -
                totalPaidAfterPayment
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

async function savePayment(){
    const validation=validatePayment();if(!validation.valid){alert(validation.message);return;}
    const paymentNo=getValue("paymentNo"),paymentDate=getValue("paymentDate"),paymentMethod=getValue("paymentMethod");
    const soNo=getValue("paymentSONo"),receiptType=getValue("paymentReceiptType"),receiptNo=getValue("paymentReceiptNo");
    const referenceNo=getValue("paymentReferenceNo"),client=getValue("paymentClient"),project=getValue("paymentProject");
    const billingAddress=getValue("paymentBillingAddress"),currentPayment=getNumericInput("paymentCurrentAmountInput");
    try{
        const result=await paymentAPI("createPayment",{paymentNo:paymentNo,paymentDate:paymentDate,paymentMethod:paymentMethod,soNumber:soNo,
            clientName:client,project:project,billingAddress:billingAddress,currentPayment:currentPayment,receiptType:receiptType,
            receiptNo:receiptNo,referenceNo:referenceNo,remarks:getValue("paymentRemarks"),createdBy:localStorage.getItem("logitechUser")||""});
        if(!result||result.success!==true)throw new Error(result&&(result.message||result.error)||"Payment could not be saved.");
        localStorage.setItem("logitechLastPayment",JSON.stringify(result.payment||{}));
        alert("Payment saved to Google Sheets database.\n\nPayment No.: "+((result.payment&&result.payment.PAYMENT_NO)||paymentNo)+"\nSO No.: "+soNo+"\nAmount: "+formatCurrency(currentPayment));
        window.location.href="../index.html";
    }catch(error){console.error("Create Payment API error:",error);alert("Payment was not saved.\n\n"+(error.message||"Please try again."));}
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
       Prevent payment beyond SO balance.
    */

    const allowedBalance =
        Math.max(
            0,
            currentSalesOrderTotal -
            currentPreviousPaid
        );


    if (currentPayment > allowedBalance + 0.005) {

        return {
            valid: false,
            message:
                "The payment amount is greater than the remaining SO balance.\n\n" +
                "Remaining Balance: " +
                formatCurrency(
                    allowedBalance
                )
        };

    }


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
