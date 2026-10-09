/* =========================================================
   LOGIS-TECH SYSTEM
   CREATE DELIVERY RECEIPT
   =========================================================
   VERSION:
   20261005-04

   WORKFLOW:
   01 Prepare Delivery Receipt
   02 Review / Verify DR
   03 Completed / DR Saved

   DATA SOURCE:
   LocalStorage muna

   SALES ORDER SEARCH:
   - SO Number
   - Client Name
   - Project
   - PO Number

   ITEM DATA:
   - Item Number
   - Item Name
   - Item Description
   - Total Order
   - Total Delivered
   - Balance
   - Pick Qty
   - Remarks
   ========================================================= */



/* =========================================================
   LOGIS-TECH SYSTEM
   CREATE DELIVERY RECEIPT
   GOOGLE APPS SCRIPT API
   VERSION: 20261009-02
========================================================= */

const DELIVERY_API_URL =
    "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

const SELECTED_SO_KEY =
    "logitechSelectedDeliverySO";

const RETURN_MODULE_KEY =
    "logitechReturnModule";


/* =========================================================
   GLOBAL STATE
========================================================= */

let selectedSO = null;
let itemState = [];
let currentDR = null;
let savedDR = null;
let currentStep = 1;
let warningTimeout = null;
let salesOrdersCache = [];
let deliveryReceiptsCache = [];
let isLoadingSalesOrders = false;
let isSavingDR = false;
let isLoadingSOSelection = false;


/* =========================================================
   GOOGLE APPS SCRIPT API
========================================================= */

async function callDeliveryAPI(action, data = null) {

    if (
        !DELIVERY_API_URL ||
        !DELIVERY_API_URL.startsWith(
            "https://script.google.com/macros/s/"
        ) ||
        !DELIVERY_API_URL.endsWith("/exec")
    ) {
        throw new Error(
            "Invalid Apps Script Web App URL. Check DELIVERY_API_URL."
        );
    }

    const url = new URL(DELIVERY_API_URL);

    if (data === null) {
        url.searchParams.set("action", action);
    }

    const response = await fetch(
        data === null ? url.toString() : DELIVERY_API_URL,
        data === null
            ? {
                method: "GET",
                redirect: "follow"
            }
            : {
                method: "POST",
                redirect: "follow",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },
                body: JSON.stringify({
                    action: action,
                    data: data
                })
            }
    );

    if (!response.ok) {
        throw new Error(
            "API request failed: HTTP " + response.status
        );
    }

    let result;

    try {
        result = await response.json();
    } catch (error) {
        throw new Error(
            "Hindi valid JSON ang response ng Apps Script. I-check ang deployment at access permissions."
        );
    }

    if (result.success === false) {
        throw new Error(
            result.error || result.message || "API request failed."
        );
    }

    return result;
}




async function fetchSOTransactionDetails(soNumber) {
    const response = await callDeliveryAPI(
        "getSOTransactionDetails",
        { soNumber: soNumber }
    );

    if (!response || response.success !== true) {
        throw new Error(
            response?.message ||
            response?.error ||
            "Unable to load Sales Order details."
        );
    }

    const salesOrder =
        response.salesOrder ||
        response.so ||
        response.data?.salesOrder ||
        response.data?.so;

    if (!salesOrder) {
        throw new Error(
            "Hindi ibinalik ng API ang Sales Order details."
        );
    }

    // Items may be at the root or inside the Sales Order object.
    const rawItems =
        response.items ||
        response.data?.items ||
        salesOrder.items ||
        [];

    return {
        ...salesOrder,
        items: normalizeItems(rawItems)
    };
}



/* =========================================================
   DOM HELPER
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", initCreateDeliveryReceipt);



document.addEventListener(
    "DOMContentLoaded",
    initCreateDeliveryReceipt
);

async function initCreateDeliveryReceipt() {
    console.log(
        "LOGIS-TECH Create Delivery Receipt - API mode"
    );

    setupButtons();
    setupSalesOrderSearch();
    setupDate();
    updateWorkflow(1);

    try {
        isLoadingSalesOrders = true;

        const [soResult, drResult] = await Promise.all([
            callDeliveryAPI("getSalesOrders"),
            callDeliveryAPI("getDeliveryReceipts")
        ]);

        salesOrdersCache =
            soResult.salesOrders ||
            soResult.data ||
            soResult.records ||
            [];

        deliveryReceiptsCache =
            drResult.deliveryReceipts ||
            drResult.records ||
            [];

        console.log(
            "Sales Orders loaded:",
            salesOrdersCache.length
        );

        console.log(
            "Delivery Receipts loaded:",
            deliveryReceiptsCache.length
        );

        await loadSelectedSalesOrder();

    } catch (error) {
        console.error(
            "Unable to initialize Delivery Receipt:",
            error
        );

        showWarning(
            "Database Connection Error",
            error.message ||
            "Hindi ma-load ang Sales Orders at Delivery Receipts mula sa Google Sheets."
        );

    } finally {
        isLoadingSalesOrders = false;
    }
}


/* =========================================================
   BUTTON SETUP
   ========================================================= */

function setupButtons() {

    /* ---------------------------------------------
       HEADER BACK
       --------------------------------------------- */

    const backButton = $("backButton");

    if (backButton) {

        backButton.addEventListener(
            "click",
            handleBackRequest
        );

    }


    /* ---------------------------------------------
       CANCEL
       --------------------------------------------- */

    const cancelButton = $("cancelButton");

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            handleBackRequest
        );

    }


    /* ---------------------------------------------
       CHANGE SALES ORDER
       --------------------------------------------- */

    const changeSOButton = $("changeSOButton");

    if (changeSOButton) {

        changeSOButton.addEventListener(
            "click",
            changeSalesOrder
        );

    }


    /* ---------------------------------------------
       REVIEW
       --------------------------------------------- */

    const reviewButton = $("reviewButton");

    if (reviewButton) {

        reviewButton.addEventListener(
            "click",
            reviewDeliveryReceipt
        );

    }


    /* ---------------------------------------------
       BACK TO PREPARE
       --------------------------------------------- */

    const backToPrepareButton =
        $("backToPrepareButton");

    if (backToPrepareButton) {

        backToPrepareButton.addEventListener(
            "click",
            backToPrepare
        );

    }


    /* ---------------------------------------------
       SAVE
       --------------------------------------------- */

    const saveButton =
        $("saveDeliveryReceiptButton");

    if (saveButton) {

        saveButton.addEventListener(
            "click",
            saveDeliveryReceipt
        );

    }


    /* ---------------------------------------------
       BACK TO DELIVERY
       --------------------------------------------- */

    const backToDeliveryButton =
        $("backToDeliveryButton");

    if (backToDeliveryButton) {

        backToDeliveryButton.addEventListener(
            "click",
            goBackToMain
        );

    }


    /* ---------------------------------------------
       PRINT COMPLETED
       --------------------------------------------- */

    const printCompletedButton =
        $("printCompletedButton");

    if (printCompletedButton) {

        printCompletedButton.addEventListener(
            "click",
            openPrintPreview
        );

    }


    /* ---------------------------------------------
       WARNING MODAL
       --------------------------------------------- */

    const closeWarningButton =
        $("closeWarningButton");

    if (closeWarningButton) {

        closeWarningButton.addEventListener(
            "click",
            closeWarningModal
        );

    }


    /* ---------------------------------------------
       LEAVE MODAL
       --------------------------------------------- */

    const stayButton = $("stayButton");

    if (stayButton) {

        stayButton.addEventListener(
            "click",
            closeLeaveModal
        );

    }


    const confirmLeaveButton =
        $("confirmLeaveButton");

    if (confirmLeaveButton) {

        confirmLeaveButton.addEventListener(
            "click",
            goBackToMain
        );

    }


    /* ---------------------------------------------
       PREVIEW
       --------------------------------------------- */

    const closePreviewButton =
        $("closePreviewButton");

    if (closePreviewButton) {

        closePreviewButton.addEventListener(
            "click",
            closePreviewModal
        );

    }


    const closePreviewButton2 =
        $("closePreviewButton2");

    if (closePreviewButton2) {

        closePreviewButton2.addEventListener(
            "click",
            closePreviewModal
        );

    }


    const printButton =
        $("printButton");

    if (printButton) {

        printButton.addEventListener(
            "click",
            printDeliveryReceipt
        );

    }


    /* ---------------------------------------------
       ESCAPE KEY
       --------------------------------------------- */

    document.addEventListener(
        "keydown",
        function(event) {

            if (event.key !== "Escape") {
                return;
            }

            closeWarningModal();

            closeLeaveModal();

            closePreviewModal();

        }
    );

}


/* =========================================================
   DATE SETUP
   ========================================================= */

function setupDate() {

    const dateInput = $("dateOfTransfer");

    if (!dateInput) {
        return;
    }

    if (!dateInput.value) {

        const today = new Date();

        const year =
            today.getFullYear();

        const month =
            String(
                today.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                today.getDate()
            ).padStart(2, "0");

        dateInput.value =
            `${year}-${month}-${day}`;

    }

}


/* =========================================================
   DR NUMBER
   ========================================================= */

function generateAndDisplayDRNumber() {
    const element = $("drNumber");

    if (element) {
        element.textContent = "GENERATED ON SAVE";
    }
}


/* =========================================================
   GENERATE DR NUMBER
   ========================================================= */

function generateDRNumber() {
    // The server generates the official DR number.
    return "GENERATED ON SAVE";
}


/* =========================================================
   SALES ORDER SEARCH
   ========================================================= */

function setupSalesOrderSearch() {

    const searchInput =
        $("salesOrderSearch");

    const clearButton =
        $("clearSalesOrderSearch");

    if (!searchInput) {
        return;
    }


    /* ---------------------------------------------
       SEARCH INPUT
       --------------------------------------------- */

    searchInput.addEventListener(
        "input",
        function() {

            const query =
                searchInput.value.trim();

            if (clearButton) {

                clearButton.classList.toggle(
                    "hidden",
                    query.length === 0
                );

            }

            if (!query) {

                hideSalesOrderSuggestions();

                return;

            }

            showSalesOrderSuggestions(query);

        }
    );


    /* ---------------------------------------------
       FOCUS
       --------------------------------------------- */

    searchInput.addEventListener(
        "focus",
        function() {

            const query =
                searchInput.value.trim();

            if (query) {

                showSalesOrderSuggestions(query);

            }

        }
    );


    /* ---------------------------------------------
       CLEAR
       --------------------------------------------- */

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            function() {

                searchInput.value = "";

                clearButton.classList.add(
                    "hidden"
                );

                hideSalesOrderSuggestions();

                clearSelectedSalesOrder();

            }
        );

    }


    /* ---------------------------------------------
       CLICK OUTSIDE
       --------------------------------------------- */

    document.addEventListener(
        "click",
        function(event) {

            const wrapper =
                document.querySelector(
                    ".sales-order-search-wrapper"
                );

            if (!wrapper) {
                return;
            }

            if (!wrapper.contains(event.target)) {

                hideSalesOrderSuggestions();

            }

        }
    );

}


function getSalesOrders() {
    return salesOrdersCache.map(function (so) {
        return normalizeSalesOrder(so);
    });
}


/* =========================================================
   NORMALIZE SALES ORDER
   ========================================================= */


function normalizeSalesOrder(so) {
    so = so || {};

    return {
        id:
            so.SO_ID ||
            so.soId ||
            so.id ||
            "",

        soNumber:
            so.SO_NUMBER ||
            so.soNumber ||
            so.salesOrderNumber ||
            "",

        dateCreation:
            so.DATE_CREATION ||
            so.dateCreation ||
            "",

        clientName:
            so.CLIENT_NAME ||
            so.clientName ||
            "",

        salesEngineer:
            so.SALES_ENGINEER ||
            so.salesEngineer ||
            so.SE ||
            "",

        attention:
            so.ATTENTION ||
            so.attention ||
            "",

        tinNumber:
            so.TIN ||
            so.tinNumber ||
            "",

        poNumber:
            so.PO_NUMBER ||
            so.poNumber ||
            "",

        paymentTerms:
            so.TERMS ||
            so.PAYMENT_TERMS ||
            so.paymentTerms ||
            "",

        jobOrder:
            so.JOB_ORDER ||
            so.jobOrder ||
            "",

        billingAddress:
            so.BILLING_ADDRESS ||
            so.billingAddress ||
            "",

        project:
            so.PROJECT ||
            so.project ||
            "",

        deliveryAddress:
            so.DELIVERY_ADDRESS ||
            so.deliveryAddress ||
            "",

        status:
            so.STATUS ||
            so.status ||
            "",

        items: [],

        original: so
    };
}


/* =========================================================
   NORMALIZE ITEMS
   ========================================================= */


function normalizeItems(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    return items.map(function (item, index) {
        item = item || {};

        const itemId = String(
            item.SO_ITEM_ID ||
            item.soItemId ||
            item.ITEM_ID ||
            item.itemId ||
            item.id ||
            ""
        ).trim();

        const itemNumber = String(
            item.ITEM_NUMBER ||
            item.ITEM_NO ||
            item.ITEM_CODE ||
            item.itemNumber ||
            item.itemNo ||
            item.itemCode ||
            (index + 1)
        ).trim();

        const itemName = String(
            item.ITEM_NAME ||
            item.PRODUCT_NAME ||
            item.NAME ||
            item.itemName ||
            item.productName ||
            item.name ||
            ""
        );

        const itemDescription = String(
            item.ITEM_DESCRIPTION ||
            item.DESCRIPTION ||
            item.DETAILS ||
            item.itemDescription ||
            item.description ||
            ""
        );

        const totalOrder = toNumber(
            item.SO_QTY ??
            item.TOTAL_ORDER ??
            item.ORDER_QTY ??
            item.ORDERED_QTY ??
            item.QUANTITY ??
            item.QTY ??
            item.ITEM_QTY ??
            item.totalOrder ??
            item.orderQty ??
            item.quantity ??
            0
        );

        const unit = String(
            item.UNIT ||
            item.UOM ||
            item.unit ||
            item.uom ||
            ""
        );

        return {
            id: itemId,
            soItemId: itemId,
            itemNumber: itemNumber,
            itemName: itemName,
            itemDescription: itemDescription,
            totalOrder: totalOrder,
            unit: unit,
            original: item
        };
    });
}


/* =========================================================
   SEARCH SALES ORDER
   ========================================================= */

function showSalesOrderSuggestions(query) {

    const container =
        $("salesOrderSuggestions");

    if (!container) {
        return;
    }


    const salesOrders =
        getSalesOrders();

    const search =
        query.toLowerCase();


    const matches =
        salesOrders.filter(
            function(so) {

                const searchable = [

                    so.soNumber,

                    so.clientName,

                    so.project,

                    so.poNumber,

                    so.jobOrder,

                    so.attention

                ]
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(search);

            }
        );


    container.innerHTML = "";


    if (!matches.length) {

        container.innerHTML = `
            <div class="suggestion-empty">
                No Sales Order found.
            </div>
        `;

        container.classList.remove(
            "hidden"
        );

        return;

    }


    /*
     * LIMIT RESULTS
     */

    const visibleMatches =
        matches.slice(0, 10);


    visibleMatches.forEach(
        function(so) {

            const option =
                document.createElement("button");

            option.type = "button";

            option.className =
                "sales-order-suggestion";


            option.innerHTML = `

                <div class="suggestion-main">

                    <strong>
                        ${escapeHTML(
                            so.soNumber || "NO SO NUMBER"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            so.clientName || "No Client"
                        )}
                    </span>

                </div>

                <div class="suggestion-meta">

                    ${
                        so.project
                        ? `
                            <span>
                                PROJECT:
                                ${escapeHTML(
                                    so.project
                                )}
                            </span>
                        `
                        : ""
                    }

                    ${
                        so.poNumber
                        ? `
                            <span>
                                PO:
                                ${escapeHTML(
                                    so.poNumber
                                )}
                            </span>
                        `
                        : ""
                    }

                </div>

            `;


            option.addEventListener(
                "click",
                function() {

                    selectSalesOrder(
                        so
                    );

                }
            );


            container.appendChild(
                option
            );

        }
    );


    container.classList.remove(
        "hidden"
    );

}



/* =========================================================
   SELECT SALES ORDER - FASTER LOADING
========================================================= */

async function selectSalesOrder(so) {

    if (isLoadingSOSelection) {
        return;
    }

    const selected = normalizeSalesOrder(so);

    if (!selected.soNumber) {
        showWarning(
            "Invalid Sales Order",
            "Walang Sales Order Number ang napiling record."
        );
        return;
    }

    isLoadingSOSelection = true;

    try {

        // 1. SHOW CACHED SALES ORDER HEADER IMMEDIATELY
        selectedSO = {
            ...selected,
            items: [],
            original: so
        };

        itemState = [];
        currentDR = null;
        savedDR = null;
        currentStep = 1;

        const searchInput = $("salesOrderSearch");

        if (searchInput) {
            searchInput.value = selectedSO.soNumber;
        }

        const clearButton = $("clearSalesOrderSearch");

        if (clearButton) {
            clearButton.classList.remove("hidden");
        }

        hideSalesOrderSuggestions();

        // Show customer and delivery information first
        fillSalesOrderDetails();

        showElement("selectedSOIndicator");
        showElement("soInformationSection");
        showElement("deliveryDetailsSection");
        showElement("itemPickingSection");
        showElement("prepareActions");

        updateWorkflow(1);

        // 2. FETCH FULL SALES ORDER DETAILS
        const details = await fetchSOTransactionDetails(
            selected.soNumber
        );

        // 3. MERGE DETAILS WITHOUT LOSING CACHED HEADER DATA
        const detailedSO = normalizeSalesOrder(details);

        const mergedSO = {
            ...selectedSO
        };

        Object.keys(detailedSO).forEach(function (key) {

            const value = detailedSO[key];

            if (
                value !== undefined &&
                value !== null &&
                value !== ""
            ) {
                mergedSO[key] = value;
            }

        });

        mergedSO.items = normalizeItems(
            details.items || []
        );

        mergedSO.original = details;

        selectedSO = mergedSO;

        // Save selected SO reference
        try {

            localStorage.setItem(
                SELECTED_SO_KEY,
                JSON.stringify({
                    soNumber: selectedSO.soNumber
                })
            );

        } catch (storageError) {

            console.warn(
                "Unable to save selected SO reference:",
                storageError
            );

        }

        // 4. BUILD ITEMS AFTER DETAILS ARE LOADED
        if (!selectedSO.items.length) {

            buildItemState();
            fillSalesOrderDetails();

            showWarning(
                "No Sales Order Items",
                "Walang items na nakuha para sa " +
                selectedSO.soNumber +
                ". Pakisuri ang SALES_ORDER_ITEMS sheet at ang SO_ITEM_ID/SO_NUMBER linkage."
            );

            return;
        }

        buildItemState();

        // Refresh all fields using complete details
        fillSalesOrderDetails();

        currentStep = 1;
        updateWorkflow(1);

        console.log(
            "Sales Order selected:",
            selectedSO.soNumber
        );

        console.log(
            "Sales Order items loaded:",
            selectedSO.items.length
        );

        window.setTimeout(function () {

            const section = $("soInformationSection");

            if (section) {
                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

        }, 100);

    } catch (error) {

        console.error(
            "Unable to select Sales Order:",
            error
        );

        showWarning(
            "Sales Order Loading Error",
            error.message ||
            "Hindi ma-load ang SO items mula sa Google Sheets."
        );

    } finally {

        isLoadingSOSelection = false;

        if (typeof showWarningLoading === "function") {
            showWarningLoading(false);
        }

    }

}


async function loadSelectedSalesOrder() {
    try {
        const stored = localStorage.getItem(
            SELECTED_SO_KEY
        );

        if (!stored) {
            return;
        }

        const parsed = JSON.parse(stored);

        if (parsed && typeof parsed === "object") {
            const soNumber =
                parsed.soNumber ||
                parsed.SO_NUMBER ||
                "";

            if (!soNumber) {
                return;
            }

            const matchingSO = getSalesOrders().find(
                function (so) {
                    return normalizeText(so.soNumber) ===
                        normalizeText(soNumber);
                }
            );

            await selectSalesOrder(
                matchingSO || { soNumber: soNumber }
            );
        }

    } catch (error) {
        console.error(
            "Unable to load selected Sales Order:",
            error
        );
    }
}


function showWarningLoading(show) {
    const searchInput = $("salesOrderSearch");

    if (searchInput) {
        searchInput.disabled = Boolean(show);
    }
}

/* =========================================================
   FILL SALES ORDER DETAILS
   ========================================================= */

function fillSalesOrderDetails() {

    if (!selectedSO) {
        return;
    }


    setValue(
        "soDateCreation",
        selectedSO.dateCreation
    );

    setValue(
        "clientName",
        selectedSO.clientName
    );

    setValue(
        "salesEngineer",
        selectedSO.salesEngineer
    );

    setValue(
        "attention",
        selectedSO.attention
    );

    setValue(
        "tinNumber",
        selectedSO.tinNumber
    );

    setValue(
        "poNumber",
        selectedSO.poNumber
    );

    setValue(
        "paymentTerms",
        selectedSO.paymentTerms
    );

    setValue(
        "jobOrder",
        selectedSO.jobOrder
    );

    setValue(
        "billingAddress",
        selectedSO.billingAddress
    );

    setValue(
        "project",
        selectedSO.project
    );

    setValue(
        "deliveryAddress",
        selectedSO.deliveryAddress
    );


    /*
     * STATUS
     */

    const status =
        $("soStatusDisplay");

    if (status) {

        const value =
            selectedSO.status ||
            "ACTIVE";

        status.textContent =
            String(value).toUpperCase();

        status.classList.remove(
            "status-active",
            "status-inactive"
        );

        if (
            String(value).toLowerCase() ===
            "active"
        ) {

            status.classList.add(
                "status-active"
            );

        } else {

            status.classList.add(
                "status-inactive"
            );

        }

    }


    /*
     * SELECTED SO INDICATOR
     */

    setText(
        "selectedSONumber",
        selectedSO.soNumber || "—"
    );

}


/* =========================================================
   GET CURRENT EDITED SALES ORDER DETAILS
   ========================================================= */

function getEditedSalesOrderDetails() {

    return {

        soNumber:
            selectedSO?.soNumber || "",

        dateCreation:
            getValue("soDateCreation"),

        clientName:
            getValue("clientName"),

        salesEngineer:
            getValue("salesEngineer"),

        attention:
            getValue("attention"),

        tinNumber:
            getValue("tinNumber"),

        poNumber:
            getValue("poNumber"),

        paymentTerms:
            getValue("paymentTerms"),

        jobOrder:
            getValue("jobOrder"),

        billingAddress:
            getValue("billingAddress"),

        project:
            getValue("project"),

        deliveryAddress:
            getValue("deliveryAddress")

    };

}


/* =========================================================
   BUILD ITEM STATE
   ========================================================= */


function buildItemState() {
    if (!selectedSO) {
        itemState = [];
        renderItemsTable();
        return;
    }

    const items = Array.isArray(selectedSO.items)
        ? selectedSO.items
        : [];

    itemState = items.map(function (item, index) {
        const previousDelivered =
            getPreviouslyDeliveredQty(selectedSO, item);

        const totalOrder = toNumber(item.totalOrder);

        const balance = Math.max(
            totalOrder - previousDelivered,
            0
        );

        return {
            index: index,
            id: item.id,
            soItemId: item.soItemId || item.id,
            itemNumber: item.itemNumber,
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            unit: item.unit,
            totalOrder: totalOrder,
            totalDelivered: previousDelivered,
            balance: balance,
            pickQty: 0,
            remarks: "",
            checked: false,
            error: ""
        };
    });

    renderItemsTable();
}



/* =========================================================
   PREVIOUS DELIVERED QTY
========================================================= */


function getPreviouslyDeliveredQty(salesOrder, currentItem) {
    const records = Array.isArray(deliveryReceiptsCache)
        ? deliveryReceiptsCache
        : [];

    const targetSO = String(
        salesOrder?.soNumber ||
        salesOrder?.SO_NUMBER ||
        ""
    ).trim().toUpperCase();

    const targetItemId = String(
        currentItem?.soItemId ||
        currentItem?.id ||
        currentItem?.SO_ITEM_ID ||
        currentItem?.original?.SO_ITEM_ID ||
        ""
    ).trim().toUpperCase();

    if (!targetSO || !targetItemId) {
        return 0;
    }

    let totalDelivered = 0;

    records.forEach(function (dr) {
        if (!dr) return;

        const drSO = String(
            dr.SO_NUMBER ||
            dr.soNumber ||
            dr.salesOrderNumber ||
            ""
        ).trim().toUpperCase();

        const status = String(
            dr.STATUS ||
            dr.status ||
            ""
        ).trim().toLowerCase();

        if (drSO !== targetSO) return;

        if (
            ["cancelled", "canceled", "void", "deleted"]
                .includes(status)
        ) {
            return;
        }

        const items = Array.isArray(dr.items)
            ? dr.items
            : Array.isArray(dr.ITEMS)
                ? dr.ITEMS
                : [];

        items.forEach(function (savedItem) {
            if (!savedItem) return;

            const savedItemId = String(
                savedItem.SO_ITEM_ID ||
                savedItem.soItemId ||
                savedItem.ITEM_ID ||
                savedItem.itemId ||
                savedItem.id ||
                ""
            ).trim().toUpperCase();

            if (savedItemId !== targetItemId) return;

            const qty = Number(
                savedItem.DELIVERED_QTY ??
                savedItem.deliveredQty ??
                savedItem.PICK_QTY ??
                savedItem.pickQty ??
                savedItem.pickedQty ??
                0
            );

            if (Number.isFinite(qty) && qty > 0) {
                totalDelivered += qty;
            }
        });
    });

    return totalDelivered;
}


function sameItem(savedItem, currentItem) {
    if (!savedItem || !currentItem) {
        return false;
    }

    const currentId = normalizeText(
        currentItem.soItemId ||
        currentItem.id ||
        currentItem.SO_ITEM_ID
    );

    const savedId = normalizeText(
        savedItem.SO_ITEM_ID ||
        savedItem.soItemId ||
        savedItem.ITEM_ID ||
        savedItem.itemId ||
        savedItem.id
    );

    if (currentId && savedId && currentId === savedId) {
        return true;
    }

    const currentNumber = normalizeText(
        currentItem.itemNumber ||
        currentItem.ITEM_NUMBER
    );

    const savedNumber = normalizeText(
        savedItem.ITEM_NUMBER ||
        savedItem.itemNumber ||
        savedItem.ITEM_NO ||
        savedItem.itemNo
    );

    if (
        currentNumber &&
        savedNumber &&
        currentNumber === savedNumber
    ) {
        return true;
    }

    return false;
}


/* =========================================================
   MATCH ITEM
   ========================================================= */

function sameItem(
    savedItem,
    currentItem
) {

    if (!savedItem || !currentItem) {
        return false;
    }


    const currentId =
        normalizeText(
            currentItem.id
        );

    const savedId =
        normalizeText(
            savedItem.id ||
            savedItem.itemId
        );


    if (
        currentId &&
        savedId &&
        currentId === savedId
    ) {

        return true;

    }


    const currentNumber =
        normalizeText(
            currentItem.itemNumber
        );

    const savedNumber =
        normalizeText(
            savedItem.itemNumber ||
            savedItem.itemNo ||
            savedItem.itemCode
        );


    if (
        currentNumber &&
        savedNumber &&
        currentNumber === savedNumber
    ) {

        return true;

    }


    const currentName =
        normalizeText(
            currentItem.itemName
        );

    const savedName =
        normalizeText(
            savedItem.itemName ||
            savedItem.name
        );


    if (
        currentName &&
        savedName &&
        currentName === savedName
    ) {

        return true;

    }


    const currentDescription =
        normalizeText(
            currentItem.itemDescription
        );

    const savedDescription =
        normalizeText(
            savedItem.itemDescription ||
            savedItem.description
        );


    if (
        currentDescription &&
        savedDescription &&
        currentDescription === savedDescription
    ) {

        return true;

    }


    return false;

}


/* =========================================================
   RENDER ITEMS TABLE
   ========================================================= */

function renderItemsTable() {

    const tbody =
        $("itemsTableBody");

    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (!itemState.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="empty-items"
                >
                    No items found in this Sales Order.
                </td>

            </tr>

        `;

        updatePickingStats();

        return;

    }


    itemState.forEach(
        function(item, index) {

            const row =
                document.createElement("tr");

            row.dataset.index =
                String(index);


            if (item.balance <= 0) {

                row.classList.add(
                    "fully-delivered"
                );

            }


            row.innerHTML = `

                <td class="check-column">

                    <input
                        type="checkbox"
                        class="item-checkbox"
                        data-index="${index}"
                        ${
                            item.balance <= 0
                            ? "disabled"
                            : ""
                        }
                    >

                </td>


                <td class="item-no-column">

                    <strong>
                        ${escapeHTML(
                            item.itemNumber || "—"
                        )}
                    </strong>

                </td>


                <td class="description-column">

                    <div class="item-name">

                        ${escapeHTML(
                            item.itemName || "—"
                        )}

                    </div>

                    ${
                        item.itemDescription
                        ? `
                            <div class="item-description">

                                ${escapeHTML(
                                    item.itemDescription
                                )}

                            </div>
                        `
                        : ""
                    }

                </td>


                <td class="qty-column">

                    <strong>
                        ${formatNumber(
                            item.totalOrder
                        )}
                    </strong>

                    ${
                        item.unit
                        ? `
                            <small>
                                ${escapeHTML(
                                    item.unit
                                )}
                            </small>
                        `
                        : ""
                    }

                </td>


                <td class="qty-column">

                    ${formatNumber(
                        item.totalDelivered
                    )}

                </td>


                <td class="qty-column">

                    <strong
                        class="${
                            item.balance <= 0
                            ? "balance-zero"
                            : ""
                        }"
                    >

                        ${formatNumber(
                            item.balance
                        )}

                    </strong>

                </td>


                <td class="pick-qty-column">

                    <input
                        type="number"
                        class="pick-qty-input"
                        data-index="${index}"
                        min="0"
                        step="any"
                        value="0"
                        placeholder="0"
                        ${
                            item.balance <= 0
                            ? "disabled"
                            : "disabled"
                        }
                    >

                    <div
                        class="qty-error"
                        data-error-index="${index}"
                    ></div>

                </td>


                <td class="remarks-column">

                    <input
                        type="text"
                        class="remarks-input"
                        data-index="${index}"
                        placeholder="Remarks"
                        disabled
                    >

                </td>

            `;


            tbody.appendChild(row);

        }
    );


    setupItemEvents();

    updatePickingStats();

}


/* =========================================================
   ITEM EVENTS
   ========================================================= */

function setupItemEvents() {

    const checkboxes =
        document.querySelectorAll(
            ".item-checkbox"
        );


    checkboxes.forEach(
        function(checkbox) {

            checkbox.addEventListener(
                "change",
                function() {

                    const index =
                        Number(
                            checkbox.dataset.index
                        );

                    const item =
                        itemState[index];

                    if (!item) {
                        return;
                    }


                    item.checked =
                        checkbox.checked;


                    const row =
                        checkbox.closest("tr");


                    const pickInput =
                        row?.querySelector(
                            ".pick-qty-input"
                        );


                    const remarksInput =
                        row?.querySelector(
                            ".remarks-input"
                        );


                    if (checkbox.checked) {

                        if (pickInput) {

                            pickInput.disabled =
                                false;

                            pickInput.focus();

                        }

                        if (remarksInput) {

                            remarksInput.disabled =
                                false;

                        }

                        row?.classList.add(
                            "item-selected"
                        );

                    } else {

                        item.pickQty = 0;

                        item.remarks = "";

                        item.error = "";

                        if (pickInput) {

                            pickInput.value =
                                "0";

                            pickInput.disabled =
                                true;

                        }

                        if (remarksInput) {

                            remarksInput.value =
                                "";

                            remarksInput.disabled =
                                true;

                        }

                        row?.classList.remove(
                            "item-selected"
                        );

                        clearItemError(
                            index
                        );

                    }


                    updatePickingStats();

                }
            );

        }
    );


    const pickInputs =
        document.querySelectorAll(
            ".pick-qty-input"
        );


    pickInputs.forEach(
        function(input) {

            input.addEventListener(
                "input",
                function() {

                    const index =
                        Number(
                            input.dataset.index
                        );

                    const item =
                        itemState[index];

                    if (!item) {
                        return;
                    }


                    const value =
                        input.value;


                    const qty =
                        value === ""
                        ? 0
                        : Number(value);


                    item.pickQty =
                        Number.isFinite(qty)
                        ? qty
                        : 0;


                    validatePickQty(
                        index,
                        false
                    );


                    updatePickingStats();

                }
            );


            input.addEventListener(
                "blur",
                function() {

                    const index =
                        Number(
                            input.dataset.index
                        );

                    validatePickQty(
                        index,
                        false
                    );

                }
            );

        }
    );


    const remarksInputs =
        document.querySelectorAll(
            ".remarks-input"
        );


    remarksInputs.forEach(
        function(input) {

            input.addEventListener(
                "input",
                function() {

                    const index =
                        Number(
                            input.dataset.index
                        );

                    const item =
                        itemState[index];

                    if (!item) {
                        return;
                    }


                    item.remarks =
                        input.value;

                }
            );

        }
    );

}


/* =========================================================
   VALIDATE PICK QTY
   ========================================================= */

function validatePickQty(
    index,
    showModal
) {

    const item =
        itemState[index];

    if (!item) {
        return false;
    }


    const qty =
        toNumber(
            item.pickQty
        );


    const balance =
        toNumber(
            item.balance
        );


    if (qty < 0) {

        item.error =
            "Pick Qty cannot be negative.";

        setItemError(
            index,
            item.error
        );

        if (showModal) {

            showWarning(
                "Invalid Pick Quantity",
                item.error
            );

        }

        return false;

    }


    if (qty > balance) {

        item.error =
            `Pick Qty (${formatNumber(qty)}) cannot exceed Balance (${formatNumber(balance)}).`;

        setItemError(
            index,
            item.error
        );

        if (showModal) {

            showWarning(
                "Pick Quantity Exceeded",
                item.error
            );

        }

        return false;

    }


    item.error = "";

    clearItemError(index);

    return true;

}


/* =========================================================
   ITEM ERROR
   ========================================================= */

function setItemError(
    index,
    message
) {

    const errorElement =
        document.querySelector(
            `[data-error-index="${index}"]`
        );


    if (errorElement) {

        errorElement.textContent =
            message;

        errorElement.classList.add(
            "show"
        );

    }


    const input =
        document.querySelector(
            `.pick-qty-input[data-index="${index}"]`
        );


    if (input) {

        input.classList.add(
            "input-error"
        );

    }

}


/* =========================================================
   CLEAR ITEM ERROR
   ========================================================= */

function clearItemError(index) {

    const errorElement =
        document.querySelector(
            `[data-error-index="${index}"]`
        );


    if (errorElement) {

        errorElement.textContent =
            "";

        errorElement.classList.remove(
            "show"
        );

    }


    const input =
        document.querySelector(
            `.pick-qty-input[data-index="${index}"]`
        );


    if (input) {

        input.classList.remove(
            "input-error"
        );

    }

}


/* =========================================================
   PICKING STATS
   ========================================================= */

function updatePickingStats() {

    const selected =
        itemState.filter(
            item => item.checked
        );


    const totalPicked =
        selected.reduce(
            function(total, item) {

                return (
                    total +
                    toNumber(item.pickQty)
                );

            },
            0
        );


    const available =
        itemState.filter(
            item => item.balance > 0
        ).length;


    setText(
        "availableItemCount",
        available
    );

    setText(
        "selectedItemCount",
        selected.length
    );

    setText(
        "totalPickedQty",
        formatNumber(totalPicked)
    );


    const warning =
        $("pickingWarning");


    if (warning) {

        if (!selected.length) {

            warning.textContent =
                "Select at least one item.";

            warning.classList.add(
                "show"
            );

        } else {

            warning.classList.remove(
                "show"
            );

        }

    }

}


/* =========================================================
   REVIEW DELIVERY RECEIPT
   ========================================================= */

function reviewDeliveryReceipt() {

    if (!selectedSO) {

        showWarning(
            "Sales Order Required",
            "Please search and select a Sales Order first."
        );

        return;

    }


    /*
     * VALIDATE SO DETAILS
     */

    const client =
        getValue("clientName").trim();

    const deliveryAddress =
        getValue("deliveryAddress").trim();

    const dateOfTransfer =
        getValue("dateOfTransfer").trim();


    if (!client) {

        showWarning(
            "Client Name Required",
            "Please enter the Client Name."
        );

        focusElement(
            "clientName"
        );

        return;

    }


    if (!deliveryAddress) {

        showWarning(
            "Delivery Address Required",
            "Please enter the Delivery Address."
        );

        focusElement(
            "deliveryAddress"
        );

        return;

    }


    if (!dateOfTransfer) {

        showWarning(
            "Date of Transfer Required",
            "Please enter the Date of Transfer before reviewing the Delivery Receipt."
        );

        focusElement(
            "dateOfTransfer"
        );

        return;

    }


    /*
     * VALIDATE ITEMS
     */

    const selectedItems =
        itemState.filter(
            item => item.checked
        );


    if (!selectedItems.length) {

        showWarning(
            "No Items Selected",
            "Please select at least one item to deliver."
        );

        return;

    }


    let invalidItem = null;


    for (
        const item of selectedItems
    ) {

        const valid =
            validatePickQty(
                item.index,
                false
            );


        if (!valid) {

            invalidItem =
                item;

            break;

        }


        if (
            toNumber(item.pickQty) <= 0
        ) {

            item.error =
                "Please enter a Pick Qty greater than 0.";

            setItemError(
                item.index,
                item.error
            );

            invalidItem =
                item;

            break;

        }

    }


    if (invalidItem) {

        showWarning(
            "Check Pick Quantity",
            invalidItem.error ||
            "Please check the Pick Qty."
        );

        return;

    }


    /*
     * BUILD CURRENT DR
     */

    currentDR =
        buildCurrentDeliveryReceipt();


    /*
     * RENDER REVIEW
     */

    renderReview(
        currentDR
    );


    /*
     * CHANGE VIEW
     */

    hideElement(
        "prepareView"
    );

    showElement(
        "reviewView"
    );

    hideElement(
        "completedView"
    );


    currentStep = 2;

    updateWorkflow(2);


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   BUILD CURRENT DR
   ========================================================= */

function buildCurrentDeliveryReceipt() {

    const edited =
        getEditedSalesOrderDetails();


    const selectedItems =
        itemState
            .filter(
                item => item.checked
            )
            .map(
                function(item) {

                    return {
    id: item.id,
    soItemId: item.soItemId || item.id || "",

    itemNumber: item.itemNumber,
    itemName: item.itemName,
    itemDescription: item.itemDescription,
    description: item.itemDescription || item.itemName || "",

    unit: item.unit,
    totalOrder: item.totalOrder,
    soQty: item.totalOrder,

    totalDelivered: item.totalDelivered,
    balance: item.balance,

    pickQty: toNumber(item.pickQty),
    remarks: item.remarks || ""
};

                }
            );


    return {

        drNumber:
            getCurrentDRNumber(),

        soNumber:
            edited.soNumber,

        dateCreation:
            edited.dateCreation,

        clientName:
            edited.clientName,

        salesEngineer:
            edited.salesEngineer,

        attention:
            edited.attention,

        tinNumber:
            edited.tinNumber,

        poNumber:
            edited.poNumber,

        paymentTerms:
            edited.paymentTerms,

        jobOrder:
            edited.jobOrder,

        billingAddress:
            edited.billingAddress,

        project:
            edited.project,

        deliveryAddress:
            edited.deliveryAddress,

        dateOfTransfer:
            getValue("dateOfTransfer"),

        items:
            selectedItems,

        status:
            "PREPARED",

        createdAt:
            new Date().toISOString()

    };

}


/* =========================================================
   RENDER REVIEW
   ========================================================= */

function renderReview(dr) {

    if (!dr) {
        return;
    }


    setText(
        "reviewDrNumber",
        dr.drNumber
    );


    setText(
        "reviewSO",
        dr.soNumber || "—"
    );

    setText(
        "reviewSODate",
        formatDateDisplay(
            dr.dateCreation
        )
    );

    setText(
        "reviewClient",
        dr.clientName || "—"
    );

    setText(
        "reviewSE",
        dr.salesEngineer || "—"
    );

    setText(
        "reviewAttention",
        dr.attention || "—"
    );

    setText(
        "reviewTIN",
        dr.tinNumber || "—"
    );

    setText(
        "reviewPO",
        dr.poNumber || "—"
    );

    setText(
        "reviewTerms",
        dr.paymentTerms || "—"
    );

    setText(
        "reviewJO",
        dr.jobOrder || "—"
    );

    setText(
        "reviewBillingAddress",
        dr.billingAddress || "—"
    );

    setText(
        "reviewProject",
        dr.project || "—"
    );

    setText(
        "reviewTransferDate",
        formatDateDisplay(
            dr.dateOfTransfer
        )
    );

    setText(
        "reviewAddress",
        dr.deliveryAddress || "—"
    );


    /*
     * TOTAL
     */

    const total =
        dr.items.reduce(
            function(sum, item) {

                return (
                    sum +
                    toNumber(item.pickQty)
                );

            },
            0
        );


    setText(
        "reviewTotalQty",
        formatNumber(total)
    );


    /*
     * ITEMS
     */

    const tbody =
        $("reviewItemsBody");

    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    dr.items.forEach(
        function(item) {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                            item.itemNumber || "—"
                        )}
                    </strong>
                </td>


                <td>

                    <div class="review-item-name">

                        ${escapeHTML(
                            item.itemName || "—"
                        )}

                    </div>

                    ${
                        item.itemDescription
                        ? `
                            <div class="review-item-description">

                                ${escapeHTML(
                                    item.itemDescription
                                )}

                            </div>
                        `
                        : ""
                    }

                </td>


                <td>
                    ${formatNumber(
                        item.totalOrder
                    )}
                </td>


                <td>
                    ${formatNumber(
                        item.totalDelivered
                    )}
                </td>


                <td>
                    ${formatNumber(
                        item.balance
                    )}
                </td>


                <td>

                    <strong class="review-pick-qty">

                        ${formatNumber(
                            item.pickQty
                        )}

                    </strong>

                    ${
                        item.unit
                        ? `
                            <small>
                                ${escapeHTML(
                                    item.unit
                                )}
                            </small>
                        `
                        : ""
                    }

                </td>


                <td>

                    ${
                        item.remarks
                        ? escapeHTML(
                            item.remarks
                        )
                        : "—"
                    }

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   BACK TO PREPARE
   ========================================================= */

function backToPrepare() {

    if (!currentDR) {

        showElement(
            "prepareView"
        );

        hideElement(
            "reviewView"
        );

        currentStep = 1;

        updateWorkflow(1);

        return;

    }


    /*
     * PUT CURRENT REVIEW DATA BACK
     * INTO ITEM STATE
     */

    currentDR.items.forEach(
        function(reviewItem) {

            const stateItem =
                itemState.find(
                    item =>
                        sameItem(
                            reviewItem,
                            item
                        )
                );


            if (!stateItem) {
                return;
            }


            stateItem.checked =
                true;

            stateItem.pickQty =
                toNumber(
                    reviewItem.pickQty
                );

            stateItem.remarks =
                reviewItem.remarks || "";

        }
    );


    /*
     * RENDER AGAIN
     */

    renderItemsTable();


    /*
     * RESTORE CHECKED STATES
     */

    itemState.forEach(
        function(item) {

            const checkbox =
                document.querySelector(
                    `.item-checkbox[data-index="${item.index}"]`
                );

            const pickInput =
                document.querySelector(
                    `.pick-qty-input[data-index="${item.index}"]`
                );

            const remarksInput =
                document.querySelector(
                    `.remarks-input[data-index="${item.index}"]`
                );


            if (checkbox) {

                checkbox.checked =
                    item.checked;

            }


            if (pickInput) {

                pickInput.disabled =
                    !item.checked;

                pickInput.value =
                    item.pickQty || 0;

            }


            if (remarksInput) {

                remarksInput.disabled =
                    !item.checked;

                remarksInput.value =
                    item.remarks || "";

            }

        }
    );


    updatePickingStats();


    /*
     * VIEW
     */

    hideElement(
        "reviewView"
    );

    showElement(
        "prepareView"
    );

    hideElement(
        "completedView"
    );


    currentStep = 1;

    updateWorkflow(1);


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   SAVE DELIVERY RECEIPT
   ========================================================= */


async function saveDeliveryReceipt() {
    if (isSavingDR) return;

    if (!currentDR) {
        showWarning(
            "Nothing to Save",
            "Walang nakahandang Delivery Receipt."
        );
        return;
    }

    if (!currentDR.soNumber || !currentDR.dateOfTransfer) {
        showWarning(
            "Required Information",
            "Kailangan ang Sales Order at Date of Transfer."
        );
        return;
    }

    if (!currentDR.items || !currentDR.items.length) {
        showWarning(
            "No Delivery Items",
            "Pumili muna ng kahit isang item."
        );
        return;
    }

    for (const item of currentDR.items) {
        if (
            !Number.isFinite(Number(item.pickQty)) ||
            Number(item.pickQty) <= 0
        ) {
            showWarning(
                "Invalid Pick Quantity",
                "Ang Pick Qty ng bawat item ay dapat higit sa zero."
            );
            return;
        }

        if (Number(item.pickQty) > Number(item.balance)) {
            showWarning(
                "Pick Quantity Exceeded",
                "Hindi maaaring lumampas ang Pick Qty sa available balance."
            );
            return;
        }
    }

    const saveButton = $("saveDeliveryReceiptButton");

    isSavingDR = true;

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";
    }

    try {
        const payload = {
    soNumber: currentDR.soNumber,
    dateOfTransfer: currentDR.dateOfTransfer,
    deliveryAddress: currentDR.deliveryAddress,
    username: localStorage.getItem("logitechUser") || "",
    items: currentDR.items.map(function (item) {
        if (!item.soItemId && !item.id) {
            throw new Error(
                "May item na walang SO_ITEM_ID. Hindi ito ligtas i-save."
            );
        }

        return {
            soItemId: item.soItemId || item.id,
            itemNumber: item.itemNumber || "",
            pickQty: Number(item.pickQty),
            remarks: item.remarks || ""
        };
    })
};

        const result = await callDeliveryAPI(
            "createDeliveryReceipt",
            payload
        );

        if (!result.success || !result.drNumber) {
            throw new Error(
                result.error ||
                "Hindi natanggap ang valid DR number mula sa server."
            );
        }

        savedDR = {
            ...currentDR,
            drNumber: result.drNumber,
            drId: result.drId || "",
            status: "SAVED",
            savedAt: new Date().toISOString()
        };

        currentDR = savedDR;

        // Refresh saved records from Google Sheets.
        const drResult = await callDeliveryAPI(
            "getDeliveryReceipts"
        );

        deliveryReceiptsCache =
            drResult.deliveryReceipts ||
            drResult.records ||
            [];

        renderCompleted(savedDR);

        hideElement("prepareView");
        hideElement("reviewView");
        showElement("completedView");

        try {
            localStorage.removeItem(SELECTED_SO_KEY);
        } catch (error) {
            console.warn(
                "Unable to clear selected Sales Order.",
                error
            );
        }

        currentStep = 3;
        updateWorkflow(3);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {
        console.error(
            "Unable to save Delivery Receipt:",
            error
        );

        showWarning(
            "Save Failed",
            error.message ||
            "Hindi na-save ang Delivery Receipt sa Google Sheets."
        );

    } finally {
        isSavingDR = false;

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = "Save Delivery Receipt";
        }
    }
}


/* =========================================================
   RENDER COMPLETED
   ========================================================= */

function renderCompleted(dr) {

    if (!dr) {
        return;
    }


    setText(
        "completedDrNumber",
        dr.drNumber || "—"
    );

    setText(
        "completedSO",
        dr.soNumber || "—"
    );

    setText(
        "completedClient",
        dr.clientName || "—"
    );

    setText(
        "completedTransferDate",
        formatDateDisplay(
            dr.dateOfTransfer
        )
    );

    setText(
        "completedAddress",
        dr.deliveryAddress || "—"
    );


    /*
     * UPDATE PREVIEW TOO
     */

    renderPreview(
        dr
    );

}


/* =========================================================
   PREVIEW
   ========================================================= */

function openPrintPreview() {

    if (!savedDR) {

        showWarning(
            "No Saved Delivery Receipt",
            "Please save the Delivery Receipt first."
        );

        return;

    }


    renderPreview(
        savedDR
    );


    const modal =
        $("previewModal");

    if (modal) {

        modal.classList.remove(
            "hidden"
        );

        document.body.classList.add(
            "modal-open"
        );

    }

}


/* =========================================================
   RENDER PREVIEW
   ========================================================= */

function renderPreview(dr) {

    if (!dr) {
        return;
    }


    setText(
        "previewDrNumber",
        dr.drNumber || "—"
    );

    setText(
        "previewNumber",
        dr.drNumber || "—"
    );

    setText(
        "previewDate",
        formatDateDisplay(
            dr.dateOfTransfer
        )
    );

    setText(
        "previewSO",
        dr.soNumber || "—"
    );

    setText(
        "previewPO",
        dr.poNumber || "—"
    );

    setText(
        "previewClient",
        dr.clientName || "—"
    );

    setText(
        "previewProject",
        dr.project || "—"
    );

    setText(
        "previewAddress",
        dr.deliveryAddress || "—"
    );


    const tbody =
        $("previewItemsBody");

    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    const items =
        Array.isArray(dr.items)
        ? dr.items
        : [];


    items.forEach(
        function(item) {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        item.itemNumber || "—"
                    )}
                </td>

                <td>

                    <strong>
                        ${escapeHTML(
                            item.itemName || "—"
                        )}
                    </strong>

                    ${
                        item.itemDescription
                        ? `
                            <div class="preview-item-description">

                                ${escapeHTML(
                                    item.itemDescription
                                )}

                            </div>
                        `
                        : ""
                    }

                </td>

                <td>
                    ${formatNumber(
                        item.pickQty
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        item.unit || "—"
                    )}
                </td>

                <td>
                    ${
                        item.remarks
                        ? escapeHTML(
                            item.remarks
                        )
                        : "—"
                    }
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   PRINT
   ========================================================= */

function printDeliveryReceipt() {

    /*
     * Close modal before printing.
     */

    closePreviewModal();


    /*
     * Browser print.
     */

    setTimeout(
        function() {

            window.print();

        },
        150
    );

}


/* =========================================================
   CLOSE PREVIEW
   ========================================================= */

function closePreviewModal() {

    const modal =
        $("previewModal");

    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

    document.body.classList.remove(
        "modal-open"
    );

}


/* =========================================================
   CHANGE SALES ORDER
   ========================================================= */

function changeSalesOrder() {

    /*
     * Reset only the current SO selection.
     */

    selectedSO = null;

    itemState = [];

    currentDR = null;


    /*
     * Hide SO dependent sections.
     */

    hideElement(
        "selectedSOIndicator"
    );

    hideElement(
        "soInformationSection"
    );

    hideElement(
        "deliveryDetailsSection"
    );

    hideElement(
        "itemPickingSection"
    );

    hideElement(
        "prepareActions"
    );


    /*
     * Clear search.
     */

    const input =
        $("salesOrderSearch");

    if (input) {

        input.value = "";

        input.focus();

    }


    const clearButton =
        $("clearSalesOrderSearch");

    if (clearButton) {

        clearButton.classList.add(
            "hidden"
        );

    }


    /*
     * Workflow.
     */

    currentStep = 1;

    updateWorkflow(1);


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   CLEAR SELECTED SO
   ========================================================= */

function clearSelectedSalesOrder() {

    selectedSO = null;

    itemState = [];

    currentDR = null;


    hideElement(
        "selectedSOIndicator"
    );

    hideElement(
        "soInformationSection"
    );

    hideElement(
        "deliveryDetailsSection"
    );

    hideElement(
        "itemPickingSection"
    );

    hideElement(
        "prepareActions"
    );


    updateWorkflow(1);

}


/* =========================================================
   WORKFLOW
   ========================================================= */

function updateWorkflow(step) {

    currentStep =
        step;


    for (
        let i = 1;
        i <= 3;
        i++
    ) {

        const workflow =
            $(
                `workflowStep${i}`
            );


        if (!workflow) {
            continue;
        }


        workflow.classList.remove(
            "active",
            "completed"
        );


        if (i === step) {

            workflow.classList.add(
                "active"
            );

        } else if (i < step) {

            workflow.classList.add(
                "completed"
            );

        }

    }

}


/* =========================================================
   BACK / LEAVE
   ========================================================= */

function handleBackRequest() {

    /*
     * If already saved,
     * no warning needed.
     */

    if (
        savedDR ||
        currentStep === 3
    ) {

        goBackToMain();

        return;

    }


    /*
     * Check if there is actual work.
     */

    const hasWork =
        Boolean(selectedSO) ||
        itemState.some(
            item =>
                item.checked ||
                toNumber(item.pickQty) > 0 ||
                item.remarks
        ) ||
        Boolean(
            getValue("clientName") ||
            getValue("deliveryAddress")
        );


    if (!hasWork) {

        goBackToMain();

        return;

    }


    showLeaveModal();

}


/* =========================================================
   SHOW LEAVE MODAL
   ========================================================= */

function showLeaveModal() {

    const modal =
        $("leaveConfirmModal");

    if (!modal) {

        /*
         * Fallback
         */

        if (
            window.confirm(
                "Your current Delivery Receipt preparation will be lost if you leave this page. Continue?"
            )
        ) {

            goBackToMain();

        }

        return;

    }


    modal.classList.remove(
        "hidden"
    );

    document.body.classList.add(
        "modal-open"
    );

}


/* =========================================================
   CLOSE LEAVE MODAL
   ========================================================= */

function closeLeaveModal() {

    const modal =
        $("leaveConfirmModal");

    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

    document.body.classList.remove(
        "modal-open"
    );

}


/* =========================================================
   GO BACK TO MAIN
   ========================================================= */

function goBackToMain() {

    closeLeaveModal();

    closeWarningModal();

    closePreviewModal();


    /*
     * Tell main system that we came from
     * Create Delivery Receipt.
     *
     * The important part:
     *
     * DO NOT USE:
     *
     * delivery.html
     *
     * because delivery.html is a module/page
     * and not the main shell.
     */

    try {

        localStorage.setItem(
            RETURN_MODULE_KEY,
            "delivery"
        );

    } catch (error) {

        console.warn(
            "Unable to set return module."
        );

    }


    /*
     * Correct path:
     *
     * create-delivery-receipt.html
     * is inside /pages/
     *
     * ../index.html
     * goes back to the main system.
     */

    window.location.href =
        "../index.html";

}


/* =========================================================
   WARNING MODAL
   ========================================================= */

function showWarning(
    title,
    message
) {

    const modal =
        $("warningModal");


    setText(
        "warningTitle",
        title || "Warning"
    );

    setText(
        "warningMessage",
        message ||
        "Please check the information."
    );


    if (!modal) {

        alert(
            `${title}\n\n${message}`
        );

        return;

    }


    modal.classList.remove(
        "hidden"
    );

    document.body.classList.add(
        "modal-open"
    );


    if (warningTimeout) {

        clearTimeout(
            warningTimeout
        );

    }

}


function closeWarningModal() {

    const modal =
        $("warningModal");

    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }

    document.body.classList.remove(
        "modal-open"
    );

}


/* =========================================================
   SALES ORDER SUGGESTION HIDE
   ========================================================= */

function hideSalesOrderSuggestions() {

    const container =
        $("salesOrderSuggestions");

    if (container) {

        container.classList.add(
            "hidden"
        );

    }

}



/* =========================================================
   STORAGE - DELIVERY RECEIPTS
   Read records loaded from Google Sheets API
========================================================= */

function readDeliveryReceipts() {

    if (Array.isArray(deliveryReceiptsCache)) {
        return deliveryReceiptsCache;
    }

    return [];

}


/* =========================================================
   CURRENT DR NUMBER
   ========================================================= */

function getCurrentDRNumber() {
    const element = $("drNumber");

    return element?.textContent?.trim() ||
        "GENERATED ON SAVE";
}


/* =========================================================
   ELEMENT HELPERS
   ========================================================= */

function showElement(id) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.classList.remove(
        "hidden"
    );

}


function hideElement(id) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.classList.add(
        "hidden"
    );

}


function setText(
    id,
    value
) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.textContent =
        value ??
        "—";

}


function setValue(
    id,
    value
) {

    const element =
        $(id);

    if (!element) {
        return;
    }

    element.value =
        value ??
        "";

}


function getValue(id) {

    const element =
        $(id);

    if (!element) {
        return "";
    }

    return element.value || "";

}


function focusElement(id) {

    const element =
        $(id);

    if (element) {

        element.focus();

        element.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    }

}


/* =========================================================
   FORMAT NUMBER
   ========================================================= */

function formatNumber(value) {

    const number =
        toNumber(value);


    if (
        Number.isInteger(number)
    ) {

        return number.toLocaleString(
            "en-US"
        );

    }


    return number.toLocaleString(
        "en-US",
        {
            maximumFractionDigits: 3
        }
    );

}


/* =========================================================
   NUMBER CONVERSION
   ========================================================= */

function toNumber(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;

    }


    const number =
        Number(
            String(value)
                .replace(/,/g, "")
                .trim()
        );


    return Number.isFinite(number)
        ? number
        : 0;

}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDateDisplay(value) {

    if (!value) {
        return "—";
    }


    /*
     * Avoid timezone problems with
     * YYYY-MM-DD values.
     */

    const match =
        String(value).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (match) {

        return (
            `${match[2]}/` +
            `${match[3]}/` +
            `${match[1]}`
        );

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    );

}


/* =========================================================
   TEXT NORMALIZATION
   ========================================================= */

function normalizeText(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();

}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   PAGE BEFORE UNLOAD
   =========================================================
   IMPORTANT:
   We intentionally DO NOT use browser
   beforeunload confirmation here.

   The custom Leave modal handles navigation
   so the user gets the LOGIS-TECH design.
   ========================================================= */


/* =========================================================
   DEBUG HELPER
   ========================================================= */

window.LOGISTECH_DR_DEBUG = {

    getSelectedSO:
        function() {
            return selectedSO;
        },

    getItems:
        function() {
            return itemState;
        },

    getCurrentDR:
        function() {
            return currentDR;
        },

    getSavedDR:
        function() {
            return savedDR;
        },

    getSalesOrders:
        function() {
            return getSalesOrders();
        },

    getDeliveryReceipts:
        function() {
            return readDeliveryReceipts();
        }

};


console.log(
    "LOGIS-TECH Create DR JS v20261005-04 loaded."
);
