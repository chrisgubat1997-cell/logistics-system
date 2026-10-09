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
    "PASTE_YOUR_EXISTING_APPS_SCRIPT_WEB_APP_URL_HERE";

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


/* =========================================================
   GOOGLE APPS SCRIPT API
========================================================= */

async function callDeliveryAPI(action, data = null) {
    if (
        !DELIVERY_API_URL ||
        DELIVERY_API_URL.includes(
            "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec"
        )
    ) {
        throw new Error(
            "Ilagay muna ang existing Apps Script Web App URL sa DELIVERY_API_URL."
        );
    }

    const url = new URL(DELIVERY_API_URL);

    if (data === null) {
        url.searchParams.set("action", action);

        const response = await fetch(url.toString(), {
            method: "GET",
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(
                "API request failed: HTTP " + response.status
            );
        }

        const result = await response.json();

        if (result.success === false) {
            throw new Error(
                result.error || "API request failed."
            );
        }

        return result;
    }

    const response = await fetch(url.toString(), {
        method: "POST",
        redirect: "follow",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
            action: action,
            data: data
        })
    });

    if (!response.ok) {
        throw new Error(
            "API request failed: HTTP " + response.status
        );
    }

    const result = await response.json();

    if (result.success === false) {
        throw new Error(
            result.error || "API request failed."
        );
    }

    return result;
}


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let selectedSO = null;

let itemState = [];

let currentDR = null;

let savedDR = null;

let currentStep = 1;

let warningTimeout = null;


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

    const drNumber =
        generateDRNumber();

    const element =
        $("drNumber");

    if (element) {

        element.textContent =
            drNumber;

    }

}


/* =========================================================
   GENERATE DR NUMBER
   ========================================================= */

function generateDRNumber() {

    const year =
        new Date().getFullYear();

    const records =
        readDeliveryReceipts();

    let highestNumber = 0;

    records.forEach(
        function(dr) {

            const number =
                String(
                    dr.drNumber || ""
                );

            const pattern =
                new RegExp(
                    `^DR-${year}-(\\d+)$`
                );

            const match =
                number.match(pattern);

            if (match) {

                highestNumber =
                    Math.max(
                        highestNumber,
                        Number(match[1])
                    );

            }

        }
    );

    const nextNumber =
        highestNumber + 1;

    return (
        `DR-${year}-` +
        String(nextNumber).padStart(5, "0")
    );

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


    return items.map(
        function(item, index) {

            item = item || {};


            const itemNumber =
                item.itemNumber ||
                item.itemNo ||
                item.itemCode ||
                item.code ||
                item.sku ||
                item.partNumber ||
                String(index + 1);


            const itemName =
                item.itemName ||
                item.name ||
                item.productName ||
                item.product ||
                "";


            const itemDescription =
                item.itemDescription ||
                item.description ||
                item.desc ||
                item.details ||
                "";


            const totalOrder =
                toNumber(
                    item.totalOrder ??
                    item.orderQty ??
                    item.orderedQty ??
                    item.quantity ??
                    item.qty ??
                    item.soQty ??
                    item.totalQty ??
                    0
                );


            const unit =
                item.unit ||
                item.uom ||
                item.UOM ||
                "";


            return {

                id:
                    item.id ||
                    item.itemId ||
                    itemNumber,

                itemNumber:
                    String(itemNumber),

                itemName:
                    String(itemName),

                itemDescription:
                    String(itemDescription),

                totalOrder:
                    totalOrder,

                unit:
                    String(unit),

                original:
                    item

            };

        }
    );

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
   SELECT SALES ORDER
   ========================================================= */

function selectSalesOrder(so) {

    selectedSO =
        normalizeSalesOrder(so);


    /*
     * SAVE SELECTED SO
     */

    try {

        localStorage.setItem(
            SELECTED_SO_KEY,
            JSON.stringify(selectedSO)
        );

    } catch (error) {

        console.warn(
            "Unable to save selected SO:",
            error
        );

    }


    /*
     * SEARCH BOX
     */

    const searchInput =
        $("salesOrderSearch");

    if (searchInput) {

        searchInput.value =
            selectedSO.soNumber || "";

    }


    const clearButton =
        $("clearSalesOrderSearch");

    if (clearButton) {

        clearButton.classList.remove(
            "hidden"
        );

    }


    hideSalesOrderSuggestions();


    /*
     * BUILD ITEM STATE
     */

    buildItemState();


    /*
     * FILL SO DETAILS
     */

    fillSalesOrderDetails();


    /*
     * SHOW SECTIONS
     */

    showElement(
        "selectedSOIndicator"
    );

    showElement(
        "soInformationSection"
    );

    showElement(
        "deliveryDetailsSection"
    );

    showElement(
        "itemPickingSection"
    );

    showElement(
        "prepareActions"
    );


    /*
     * WORKFLOW
     */

    currentStep = 1;

    updateWorkflow(1);


    /*
     * SCROLL TO SO DETAILS
     */

    setTimeout(
        function() {

            const section =
                $("soInformationSection");

            if (section) {

                section.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        },
        100
    );

}


/* =========================================================
   LOAD SELECTED SO FROM PREVIOUS PAGE
   ========================================================= */

function loadSelectedSalesOrder() {

    try {

        const stored =
            localStorage.getItem(
                SELECTED_SO_KEY
            );

        if (!stored) {
            return;
        }


        const parsed =
            JSON.parse(stored);


        if (
            parsed &&
            typeof parsed === "object"
        ) {

            selectSalesOrder(
                parsed
            );

        }

    } catch (error) {

        console.error(
            "Unable to load selected Sales Order:",
            error
        );

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

        return;

    }


    const items =
        selectedSO.items || [];


    itemState =
        items.map(
            function(item, index) {

                const previousDelivered =
                    getPreviouslyDeliveredQty(
                        selectedSO,
                        item
                    );


                const totalOrder =
                    toNumber(
                        item.totalOrder
                    );


                const balance =
                    Math.max(
                        totalOrder -
                        previousDelivered,
                        0
                    );


                return {

                    index:

                        index,

                    id:
                        item.id,

                    itemNumber:
                        item.itemNumber,

                    itemName:
                        item.itemName,

                    itemDescription:
                        item.itemDescription,

                    unit:
                        item.unit,

                    totalOrder:
                        totalOrder,

                    totalDelivered:
                        previousDelivered,

                    balance:
                        balance,

                    pickQty:
                        0,

                    remarks:
                        "",

                    checked:
                        false,

                    error:
                        ""

                };

            }
        );


    renderItemsTable();

}


/* =========================================================
   PREVIOUS DELIVERED QTY
   ========================================================= */

function getPreviouslyDeliveredQty(
    salesOrder,
    currentItem
) {

    const records =
        readDeliveryReceipts();


    if (!records.length) {
        return 0;
    }


    let totalDelivered = 0;


    records.forEach(
        function(dr) {

            if (!dr) {
                return;
            }


            const drSO =
                normalizeText(
                    dr.soNumber
                );

            const selectedSO =
                normalizeText(
                    salesOrder.soNumber
                );


            if (
                !drSO ||
                !selectedSO ||
                drSO !== selectedSO
            ) {

                return;

            }


            const items =
                Array.isArray(dr.items)
                ? dr.items
                : [];


            items.forEach(
                function(item) {

                    if (
                        sameItem(
                            item,
                            currentItem
                        )
                    ) {

                        const qty =
                            toNumber(
                                item.pickQty ??
                                item.pickedQty ??
                                item.deliveredQty ??
                                item.qty ??
                                0
                            );

                        totalDelivered += qty;

                    }

                }
            );

        }
    );


    return totalDelivered;

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

                        id:
                            item.id,

                        itemNumber:
                            item.itemNumber,

                        itemName:
                            item.itemName,

                        itemDescription:
                            item.itemDescription,

                        description:
                            item.itemDescription ||
                            item.itemName ||
                            "",

                        unit:
                            item.unit,

                        totalOrder:
                            item.totalOrder,

                        soQty:
                            item.totalOrder,

                        totalDelivered:
                            item.totalDelivered,

                        deliveredQty:
                            item.totalDelivered,

                        balance:
                            item.balance,

                        pickQty:
                            toNumber(
                                item.pickQty
                            ),

                        remarks:
                            item.remarks || ""

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
            username:
                localStorage.getItem("logitechUser") || "",
            items: currentDR.items.map(function (item) {
                return {
                    soItemId:
                        item.soItemId ||
                        item.id ||
                        "",
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
   ========================================================= */

function readDeliveryReceipts() {

    try {

        const stored =
            localStorage.getItem(
                DR_STORAGE_KEY
            );

        if (!stored) {

            return [];

        }


        const parsed =
            JSON.parse(stored);


        if (
            Array.isArray(parsed)
        ) {

            return parsed;

        }

    } catch (error) {

        console.error(
            "Unable to read Delivery Receipts:",
            error
        );

    }


    return [];

}


/* =========================================================
   CURRENT DR NUMBER
   ========================================================= */

function getCurrentDRNumber() {

    const element =
        $("drNumber");

    if (
        element &&
        element.textContent.trim()
    ) {

        return element.textContent.trim();

    }


    return generateDRNumber();

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
