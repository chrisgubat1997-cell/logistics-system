/* =========================================================
   LOGIS-TECH SYSTEM
   CREATE DELIVERY RECEIPT
   =========================================================

   WORKFLOW
   01 Prepare Delivery Receipt
   02 Review / Verify DR
   03 Completed / DR Saved

   DATA SOURCE
   - localStorage
   - Existing Sales Order records
   - Existing Delivery Receipt records

   IMPORTANT
   - Pick Qty is manually entered.
   - Pick Qty cannot exceed Balance.
   - Sales Order details are editable before review.
   ========================================================= */


/* =========================================================
   STORAGE KEYS
   ========================================================= */

const SELECTED_SO_KEY = "logitechSelectedDeliverySO";
const SALES_ORDER_STORAGE_KEY = "logitechSalesOrders";
const DR_STORAGE_KEY = "logitechDeliveryReceipts";
const RETURN_MODULE_KEY = "logitechReturnModule";


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let selectedSO = null;

let itemState = [];

let currentDR = null;

let savedDR = null;

let currentStep = 1;


/* =========================================================
   DOM HELPER
   ========================================================= */

function getElement(id) {
    return document.getElementById(id);
}


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const salesOrderSelect = getElement("salesOrderSelect");

const soInformationSection = getElement("soInformationSection");
const deliveryDetailsSection = getElement("deliveryDetailsSection");
const itemPickingSection = getElement("itemPickingSection");
const prepareActions = getElement("prepareActions");

const prepareView = getElement("prepareView");
const reviewView = getElement("reviewView");
const completedView = getElement("completedView");

const itemsTableBody = getElement("itemsTableBody");
const reviewItemsBody = getElement("reviewItemsBody");

const dateOfTransfer = getElement("dateOfTransfer");
const deliveryAddress = getElement("deliveryAddress");

const availableItemCount = getElement("availableItemCount");
const selectedItemCount = getElement("selectedItemCount");
const totalPickedQty = getElement("totalPickedQty");

const pickingWarning = getElement("pickingWarning");

const reviewTotalQty = getElement("reviewTotalQty");

const warningModal = getElement("warningModal");
const warningTitle = getElement("warningTitle");
const warningMessage = getElement("warningMessage");
const closeWarningButton = getElement("closeWarningButton");

const leaveConfirmModal = getElement("leaveConfirmModal");
const stayButton = getElement("stayButton");
const confirmLeaveButton = getElement("confirmLeaveButton");

const previewModal = getElement("previewModal");
const closePreviewButton = getElement("closePreviewButton");
const closePreviewButton2 = getElement("closePreviewButton2");
const printButton = getElement("printButton");

const backButton = getElement("backButton");
const cancelButton = getElement("cancelButton");

const reviewButton = getElement("reviewButton");
const backToPrepareButton = getElement("backToPrepareButton");
const saveDeliveryReceiptButton = getElement(
    "saveDeliveryReceiptButton"
);

const printCompletedButton = getElement(
    "printCompletedButton"
);

const backToDeliveryButton = getElement(
    "backToDeliveryButton"
);


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", initCreateDR);


function initCreateDR() {

    console.log(
        "LOGIS-TECH SYSTEM | Create Delivery Receipt initialized"
    );

    setDefaultDate();

    generateAndDisplayDRNumber();

    loadSalesOrders();

    setupEvents();

    updateWorkflow(1);
}


/* =========================================================
   EVENT SETUP
   ========================================================= */

function setupEvents() {

    /* SALES ORDER SEARCH */

    if (salesOrderSelect) {

        salesOrderSelect.addEventListener(
            "input",
            handleSalesOrderSearch
        );

        salesOrderSelect.addEventListener(
            "change",
            handleSalesOrderChange
        );
    }


    /* BACK */

    if (backButton) {

        backButton.addEventListener(
            "click",
            requestLeave
        );
    }


    /* CANCEL */

    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            requestLeave
        );
    }


    /* REVIEW */

    if (reviewButton) {

        reviewButton.addEventListener(
            "click",
            reviewDeliveryReceipt
        );
    }


    /* BACK TO PREPARE */

    if (backToPrepareButton) {

        backToPrepareButton.addEventListener(
            "click",
            backToPrepare
        );
    }


    /* SAVE */

    if (saveDeliveryReceiptButton) {

        saveDeliveryReceiptButton.addEventListener(
            "click",
            saveDeliveryReceipt
        );
    }


    /* WARNING */

    if (closeWarningButton) {

        closeWarningButton.addEventListener(
            "click",
            closeWarning
        );
    }


    /* LEAVE MODAL */

    if (stayButton) {

        stayButton.addEventListener(
            "click",
            closeLeaveModal
        );
    }


    if (confirmLeaveButton) {

        confirmLeaveButton.addEventListener(
            "click",
            goBackToMain
        );
    }


    /* PRINT */

    if (printCompletedButton) {

        printCompletedButton.addEventListener(
            "click",
            openPreview
        );
    }


    if (printButton) {

        printButton.addEventListener(
            "click",
            printDeliveryReceipt
        );
    }


    if (closePreviewButton) {

        closePreviewButton.addEventListener(
            "click",
            closePreview
        );
    }


    if (closePreviewButton2) {

        closePreviewButton2.addEventListener(
            "click",
            closePreview
        );
    }


    /* BACK TO DELIVERY */

    if (backToDeliveryButton) {

        backToDeliveryButton.addEventListener(
            "click",
            goBackToMain
        );
    }


    /* ESC KEY */

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key !== "Escape") {
                return;
            }

            closeWarning();
            closeLeaveModal();
            closePreview();
        }
    );
}


/* =========================================================
   DATE
   ========================================================= */

function setDefaultDate() {

    if (!dateOfTransfer) {
        return;
    }

    if (!dateOfTransfer.value) {

        const today = new Date();

        const year = today.getFullYear();

        const month = String(
            today.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            today.getDate()
        ).padStart(2, "0");

        dateOfTransfer.value =
            `${year}-${month}-${day}`;
    }
}


/* =========================================================
   SALES ORDER STORAGE
   ========================================================= */

function getSalesOrders() {

    const possibleKeys = [

        SALES_ORDER_STORAGE_KEY,

        "logitechSalesOrder",

        "logitechSO",

        "salesOrders",

        "salesOrderData"
    ];


    for (const key of possibleKeys) {

        try {

            const raw =
                localStorage.getItem(key);

            if (!raw) {
                continue;
            }

            const parsed =
                JSON.parse(raw);

            if (Array.isArray(parsed)) {

                return parsed;
            }

            if (
                parsed &&
                Array.isArray(parsed.data)
            ) {

                return parsed.data;
            }

            if (
                parsed &&
                Array.isArray(parsed.salesOrders)
            ) {

                return parsed.salesOrders;
            }

        } catch (error) {

            console.warn(
                "Unable to read Sales Order storage:",
                key,
                error
            );
        }
    }


    return [];
}


/* =========================================================
   LOAD SALES ORDERS
   ========================================================= */

function loadSalesOrders() {

    if (!salesOrderSelect) {
        return;
    }


    const salesOrders =
        getSalesOrders();


    /*
       Clear existing options except placeholder.
    */

    salesOrderSelect.innerHTML = `
        <option value="">
            -- Search Sales Order --
        </option>
    `;


    salesOrders.forEach(
        function (so, index) {

            const normalized =
                normalizeSalesOrder(
                    so,
                    index
                );


            if (!normalized.soNumber) {
                return;
            }


            const option =
                document.createElement("option");


            option.value =
                normalized.soNumber;


            option.textContent =
                `${normalized.soNumber} — ${normalized.clientName || "No Client"}`;


            option.dataset.index =
                index;


            salesOrderSelect.appendChild(
                option
            );
        }
    );


    /*
       If Delivery page previously selected
       an SO, automatically load it.
    */

    loadPreviouslySelectedSO();
}


/* =========================================================
   SALES ORDER SEARCH
   ========================================================= */

function handleSalesOrderSearch() {

    const search =
        String(
            salesOrderSelect.value || ""
        )
        .trim()
        .toLowerCase();


    if (!search) {
        return;
    }


    const salesOrders =
        getSalesOrders();


    const matched =
        salesOrders.find(
            function (so, index) {

                const normalized =
                    normalizeSalesOrder(
                        so,
                        index
                    );


                const soNumber =
                    normalized.soNumber
                        .toLowerCase();


                const client =
                    normalized.clientName
                        .toLowerCase();


                return (
                    soNumber.includes(search) ||
                    client.includes(search)
                );
            }
        );


    /*
       Do not automatically select while
       the user is still typing.

       The browser datalist-like behavior
       is handled through select options.
    */

    if (matched) {

        /*
           Nothing here intentionally.
           Selection happens on change.
        */
    }
}


/* =========================================================
   SALES ORDER CHANGE
   ========================================================= */

function handleSalesOrderChange(event) {

    const value =
        String(
            event.target.value || ""
        ).trim();


    if (!value) {

        clearSalesOrder();

        return;
    }


    const salesOrders =
        getSalesOrders();


    let foundSO = null;


    for (
        let index = 0;
        index < salesOrders.length;
        index++
    ) {

        const normalized =
            normalizeSalesOrder(
                salesOrders[index],
                index
            );


        if (
            normalized.soNumber === value
        ) {

            foundSO =
                normalized;

            break;
        }
    }


    /*
       Check previously selected SO
       if it isn't in the main list.
    */

    if (!foundSO) {

        try {

            const raw =
                localStorage.getItem(
                    SELECTED_SO_KEY
                );


            if (raw) {

                const saved =
                    JSON.parse(raw);


                const normalized =
                    normalizeSalesOrder(
                        saved,
                        0
                    );


                if (
                    normalized.soNumber === value
                ) {

                    foundSO =
                        normalized;
                }
            }

        } catch (error) {

            console.warn(
                "Unable to load selected SO.",
                error
            );
        }
    }


    if (!foundSO) {

        showWarning(
            "Sales Order Not Found",
            "The selected Sales Order could not be found."
        );

        return;
    }


    selectSalesOrder(
        foundSO
    );
}


/* =========================================================
   PREVIOUSLY SELECTED SO
   ========================================================= */

function loadPreviouslySelectedSO() {

    try {

        const raw =
            localStorage.getItem(
                SELECTED_SO_KEY
            );


        if (!raw) {
            return;
        }


        const saved =
            JSON.parse(raw);


        if (!saved) {
            return;
        }


        const normalized =
            normalizeSalesOrder(
                saved,
                0
            );


        if (!normalized.soNumber) {
            return;
        }


        /*
           Add selected SO if it does not
           exist in the current options.
        */

        let optionExists = false;


        Array.from(
            salesOrderSelect.options
        ).forEach(
            function (option) {

                if (
                    option.value ===
                    normalized.soNumber
                ) {

                    optionExists = true;
                }
            }
        );


        if (!optionExists) {

            const option =
                document.createElement("option");


            option.value =
                normalized.soNumber;


            option.textContent =
                `${normalized.soNumber} — ${normalized.clientName || "No Client"}`;


            salesOrderSelect.appendChild(
                option
            );
        }


        salesOrderSelect.value =
            normalized.soNumber;


        selectSalesOrder(
            normalized
        );


    } catch (error) {

        console.warn(
            "No previous Sales Order could be loaded.",
            error
        );
    }
}


/* =========================================================
   NORMALIZE SALES ORDER
   ========================================================= */

function normalizeSalesOrder(
    so,
    index = 0
) {

    if (!so) {

        return {
            soNumber: "",
            dateCreation: "",
            clientName: "",
            salesEngineer: "",
            attention: "",
            tinNumber: "",
            poNumber: "",
            paymentTerms: "",
            jobOrder: "",
            billingAddress: "",
            project: "",
            deliveryAddress: "",
            items: []
        };
    }


    const normalized = {

        soNumber:
            getFirstValue(
                so,
                [
                    "soNumber",
                    "salesOrder",
                    "salesOrderNumber",
                    "soNo",
                    "so",
                    "id",
                    "number"
                ]
            ),


        dateCreation:
            getFirstValue(
                so,
                [
                    "dateCreation",
                    "dateCreated",
                    "creationDate",
                    "date",
                    "soDate"
                ]
            ),


        clientName:
            getFirstValue(
                so,
                [
                    "clientName",
                    "client",
                    "customer",
                    "customerName"
                ]
            ),


        salesEngineer:
            getFirstValue(
                so,
                [
                    "salesEngineer",
                    "se",
                    "SE",
                    "salesEngineerName"
                ]
            ),


        attention:
            getFirstValue(
                so,
                [
                    "attention",
                    "attn",
                    "contactPerson",
                    "contact"
                ]
            ),


        tinNumber:
            getFirstValue(
                so,
                [
                    "tinNumber",
                    "tin",
                    "TIN",
                    "tinNo"
                ]
            ),


        poNumber:
            getFirstValue(
                so,
                [
                    "poNumber",
                    "po",
                    "PO",
                    "purchaseOrder"
                ]
            ),


        paymentTerms:
            getFirstValue(
                so,
                [
                    "paymentTerms",
                    "terms",
                    "paymentTerm"
                ]
            ),


        jobOrder:
            getFirstValue(
                so,
                [
                    "jobOrder",
                    "jo",
                    "JO",
                    "jobOrderNumber"
                ]
            ),


        billingAddress:
            getFirstValue(
                so,
                [
                    "billingAddress",
                    "billing",
                    "billAddress"
                ]
            ),


        project:
            getFirstValue(
                so,
                [
                    "project",
                    "projectName"
                ]
            ),


        deliveryAddress:
            getFirstValue(
                so,
                [
                    "deliveryAddress",
                    "delivery",
                    "shipTo",
                    "shippingAddress"
                ]
            ),


        items:
            getSOItems(so)
    };


    /*
       Keep original SO object.

       This is useful when the actual Sales Order
       contains additional fields.
    */

    normalized.originalData =
        so;


    normalized.index =
        index;


    return normalized;
}


/* =========================================================
   GET FIRST VALUE
   ========================================================= */

function getFirstValue(
    object,
    keys
) {

    for (const key of keys) {

        if (
            object[key] !== undefined &&
            object[key] !== null &&
            String(object[key]).trim() !== ""
        ) {

            return String(
                object[key]
            ).trim();
        }
    }


    return "";
}


/* =========================================================
   GET SALES ORDER ITEMS
   ========================================================= */

function getSOItems(so) {

    const possibleItems = [

        so.items,

        so.lineItems,

        so.orderItems,

        so.products,

        so.itemList,

        so.details
    ];


    for (
        const items of possibleItems
    ) {

        if (
            Array.isArray(items)
        ) {

            return items;
        }
    }


    /*
       Some systems may store one item
       directly inside "data".
    */

    if (
        so.data &&
        Array.isArray(so.data)
    ) {

        return so.data;
    }


    return [];
}


/* =========================================================
   SELECT SALES ORDER
   ========================================================= */

function selectSalesOrder(so) {

    selectedSO =
        normalizeSalesOrder(
            so,
            so.index || 0
        );


    /*
       Save currently selected SO
       so refresh/reload can recover it.
    */

    try {

        localStorage.setItem(
            SELECTED_SO_KEY,
            JSON.stringify(selectedSO.originalData || selectedSO)
        );

    } catch (error) {

        console.warn(
            "Unable to save selected SO.",
            error
        );
    }


    populateSalesOrderDetails();


    /*
       Delivery address comes from SO,
       but remains editable.
    */

    if (deliveryAddress) {

        deliveryAddress.value =
            selectedSO.deliveryAddress || "";
    }


    /*
       Recalculate delivered quantity
       from previously SAVED DRs.
    */

    itemState =
        buildItemState(
            selectedSO
        );


    renderItems();


    showPrepareSections();


    updateCounters();


    updateWorkflow(1);
}


/* =========================================================
   BUILD ITEM STATE
   ========================================================= */

function buildItemState(so) {

    const items =
        so.items || [];


    return items.map(
        function (item, index) {

            const itemData =
                normalizeItem(
                    item,
                    index
                );


            const deliveredQty =
                getPreviouslyDeliveredQty(
                    so.soNumber,
                    itemData
                );


            const balanceQty =
                Math.max(
                    itemData.totalOrder -
                    deliveredQty,
                    0
                );


            return {

                index,

                id:
                    itemData.id,

                itemNo:
                    itemData.itemNo,

                itemName:
                    itemData.itemName,

                description:
                    itemData.description,

                unit:
                    itemData.unit,

                totalOrder:
                    itemData.totalOrder,

                totalDelivered:
                    deliveredQty,

                balance:
                    balanceQty,

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
}


/* =========================================================
   NORMALIZE ITEM
   ========================================================= */

function normalizeItem(
    item,
    index
) {

    item =
        item || {};


    const totalOrderRaw =
        getFirstValue(
            item,
            [
                "totalOrder",
                "orderQty",
                "orderedQty",
                "soQty",
                "quantity",
                "qty",
                "totalQuantity"
            ]
        );


    const itemNo =
        getFirstValue(
            item,
            [
                "itemNo",
                "itemNumber",
                "itemCode",
                "code",
                "sku"
            ]
        ) ||
        String(index + 1);


    const itemName =
        getFirstValue(
            item,
            [
                "itemName",
                "name",
                "productName",
                "product"
            ]
        );


    const description =
        getFirstValue(
            item,
            [
                "description",
                "itemDescription",
                "details",
                "specification",
                "specs"
            ]
        );


    return {

        id:
            getFirstValue(
                item,
                [
                    "id",
                    "itemId",
                    "itemCode",
                    "sku"
                ]
            ) || itemNo,


        itemNo,

        itemName,

        description,

        unit:
            getFirstValue(
                item,
                [
                    "unit",
                    "uom",
                    "unitOfMeasure"
                ]
            ),


        totalOrder:
            parseNumber(
                totalOrderRaw
            ),


        originalData:
            item
    };
}


/* =========================================================
   PREVIOUSLY DELIVERED
   ========================================================= */

function getPreviouslyDeliveredQty(
    soNumber,
    currentItem
) {

    const drs =
        getDeliveryReceipts();


    let totalDelivered = 0;


    drs.forEach(
        function (dr) {

            if (!dr) {
                return;
            }


            const drSO =
                getFirstValue(
                    dr,
                    [
                        "soNumber",
                        "salesOrder",
                        "salesOrderNumber"
                    ]
                );


            if (
                drSO !== soNumber
            ) {

                return;
            }


            const items =
                Array.isArray(dr.items)
                    ? dr.items
                    : [];


            items.forEach(
                function (deliveredItem) {

                    if (
                        !isSameItem(
                            currentItem,
                            deliveredItem
                        )
                    ) {

                        return;
                    }


                    const qty =
                        getFirstValue(
                            deliveredItem,
                            [
                                "pickQty",
                                "deliveredQty",
                                "quantity",
                                "qty",
                                "pickedQty"
                            ]
                        );


                    totalDelivered +=
                        parseNumber(qty);
                }
            );
        }
    );


    return totalDelivered;
}


/* =========================================================
   COMPARE ITEMS
   ========================================================= */

function isSameItem(
    itemA,
    itemB
) {

    if (!itemA || !itemB) {
        return false;
    }


    const idA =
        getFirstValue(
            itemA,
            [
                "id",
                "itemId",
                "itemCode",
                "sku"
            ]
        );


    const idB =
        getFirstValue(
            itemB,
            [
                "id",
                "itemId",
                "itemCode",
                "sku"
            ]
        );


    if (
        idA &&
        idB &&
        idA === idB
    ) {

        return true;
    }


    const itemNoA =
        getFirstValue(
            itemA,
            [
                "itemNo",
                "itemNumber",
                "code",
                "itemCode"
            ]
        );


    const itemNoB =
        getFirstValue(
            itemB,
            [
                "itemNo",
                "itemNumber",
                "code",
                "itemCode"
            ]
        );


    if (
        itemNoA &&
        itemNoB &&
        itemNoA === itemNoB
    ) {

        return true;
    }


    const descA =
        getFirstValue(
            itemA,
            [
                "description",
                "itemDescription",
                "name"
            ]
        )
        .toLowerCase();


    const descB =
        getFirstValue(
            itemB,
            [
                "description",
                "itemDescription",
                "name"
            ]
        )
        .toLowerCase();


    return (
        descA &&
        descB &&
        descA === descB
    );
}


/* =========================================================
   DELIVERY RECEIPT STORAGE
   ========================================================= */

function getDeliveryReceipts() {

    try {

        const raw =
            localStorage.getItem(
                DR_STORAGE_KEY
            );


        if (!raw) {
            return [];
        }


        const parsed =
            JSON.parse(raw);


        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.warn(
            "Unable to read Delivery Receipts.",
            error
        );

        return [];
    }
}


/* =========================================================
   POPULATE SALES ORDER DETAILS
   ========================================================= */

function populateSalesOrderDetails() {

    if (!selectedSO) {
        return;
    }


    setText(
        "soNumberDisplay",
        selectedSO.soNumber
    );


    setText(
        "soDateDisplay",
        formatDateDisplay(
            selectedSO.dateCreation
        )
    );


    setText(
        "clientNameDisplay",
        selectedSO.clientName
    );


    setText(
        "attentionDisplay",
        selectedSO.attention
    );


    setText(
        "poNumberDisplay",
        selectedSO.poNumber
    );


    setText(
        "projectDisplay",
        selectedSO.project
    );


    setText(
        "tinDisplay",
        selectedSO.tinNumber
    );


    setText(
        "termsDisplay",
        selectedSO.paymentTerms
    );


    setText(
        "salesEngineerDisplay",
        selectedSO.salesEngineer
    );


    /*
       IMPORTANT:

       The HTML currently uses strong elements
       for SO details.

       We make these fields editable
       when selected.

       This is done dynamically so the existing
       HTML does not need to be rebuilt.
    */

    makeSOFieldEditable(
        "soDateDisplay",
        "dateCreation"
    );

    makeSOFieldEditable(
        "clientNameDisplay",
        "clientName"
    );

    makeSOFieldEditable(
        "salesEngineerDisplay",
        "salesEngineer"
    );

    makeSOFieldEditable(
        "attentionDisplay",
        "attention"
    );

    makeSOFieldEditable(
        "tinDisplay",
        "tinNumber"
    );

    makeSOFieldEditable(
        "poNumberDisplay",
        "poNumber"
    );

    makeSOFieldEditable(
        "termsDisplay",
        "paymentTerms"
    );

    makeSOFieldEditable(
        "jobOrderDisplay",
        "jobOrder"
    );

    makeSOFieldEditable(
        "billingAddressDisplay",
        "billingAddress"
    );

    makeSOFieldEditable(
        "projectDisplay",
        "project"
    );

    makeSOFieldEditable(
        "deliveryAddressDisplay",
        "deliveryAddress"
    );
}


/* =========================================================
   MAKE SO DETAIL EDITABLE
   ========================================================= */

function makeSOFieldEditable(
    elementId,
    fieldName
) {

    const element =
        getElement(elementId);


    if (!element) {
        return;
    }


    /*
       Do not destroy the existing design.

       Replace the <strong> with an input only
       if the CSS/HTML does not already provide
       an editable field.
    */

    const currentValue =
        selectedSO[fieldName] || "";


    let input =
        element.querySelector(
            "input, textarea"
        );


    if (!input) {

        input =
            document.createElement(
                fieldName === "billingAddress" ||
                fieldName === "deliveryAddress"
                    ? "textarea"
                    : "input"
            );


        input.className =
            "so-editable-input";


        if (
            fieldName === "billingAddress" ||
            fieldName === "deliveryAddress"
        ) {

            input.rows = 2;
        }


        element.replaceChildren(
            input
        );
    }


    input.value =
        currentValue;


    input.dataset.field =
        fieldName;


    input.addEventListener(
        "input",
        function () {

            selectedSO[fieldName] =
                input.value.trim();


            /*
               Delivery address also updates
               the main Delivery Address field.
            */

            if (
                fieldName ===
                "deliveryAddress"
            ) {

                if (deliveryAddress) {

                    deliveryAddress.value =
                        input.value;
                }
            }
        }
    );
}


/* =========================================================
   SHOW PREPARE SECTIONS
   ========================================================= */

function showPrepareSections() {

    removeHidden(
        soInformationSection
    );

    removeHidden(
        deliveryDetailsSection
    );

    removeHidden(
        itemPickingSection
    );

    removeHidden(
        prepareActions
    );
}


/* =========================================================
   CLEAR SALES ORDER
   ========================================================= */

function clearSalesOrder() {

    selectedSO = null;

    itemState = [];

    addHidden(
        soInformationSection
    );

    addHidden(
        deliveryDetailsSection
    );

    addHidden(
        itemPickingSection
    );

    addHidden(
        prepareActions
    );

    if (itemsTableBody) {

        itemsTableBody.innerHTML = "";
    }


    updateCounters();
}


/* =========================================================
   RENDER ITEM TABLE
   ========================================================= */

function renderItems() {

    if (!itemsTableBody) {
        return;
    }


    itemsTableBody.innerHTML = "";


    if (!itemState.length) {

        itemsTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-items">
                    No items found in this Sales Order.
                </td>
            </tr>
        `;

        return;
    }


    itemState.forEach(
        function (item, index) {

            const row =
                document.createElement("tr");


            row.dataset.index =
                index;


            if (
                item.balance <= 0
            ) {

                row.classList.add(
                    "fully-delivered"
                );
            }


            row.innerHTML = `

                <td class="check-column">

                    <input
                        type="checkbox"
                        class="item-check"
                        data-index="${index}"
                        ${item.balance <= 0 ? "disabled" : ""}
                    >

                </td>


                <td class="item-no-column">

                    <strong>
                        ${escapeHTML(item.itemNo)}
                    </strong>

                </td>


                <td class="description-column">

                    <div class="item-name">
                        ${escapeHTML(
                            item.itemName || "—"
                        )}
                    </div>

                    <div class="item-description">
                        ${escapeHTML(
                            item.description || "—"
                        )}
                    </div>

                </td>


                <td class="qty-column">

                    <strong>
                        ${formatNumber(item.totalOrder)}
                    </strong>

                    ${
                        item.unit
                            ? `<small>${escapeHTML(item.unit)}</small>`
                            : ""
                    }

                </td>


                <td class="qty-column">

                    ${formatNumber(
                        item.totalDelivered
                    )}

                </td>


                <td class="qty-column">

                    <strong>
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
                        ${item.balance <= 0 ? "disabled" : ""}
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
                        placeholder="Enter remarks"
                        ${item.balance <= 0 ? "disabled" : ""}
                    >

                </td>

            `;


            itemsTableBody.appendChild(
                row
            );
        }
    );


    attachItemEvents();

    updateCounters();
}


/* =========================================================
   ITEM EVENTS
   ========================================================= */

function attachItemEvents() {

    const checkboxes =
        itemsTableBody.querySelectorAll(
            ".item-check"
        );


    const pickInputs =
        itemsTableBody.querySelectorAll(
            ".pick-qty-input"
        );


    const remarksInputs =
        itemsTableBody.querySelectorAll(
            ".remarks-input"
        );


    checkboxes.forEach(
        function (checkbox) {

            checkbox.addEventListener(
                "change",
                function () {

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
                        row.querySelector(
                            ".pick-qty-input"
                        );


                    const remarksInput =
                        row.querySelector(
                            ".remarks-input"
                        );


                    if (
                        !checkbox.checked
                    ) {

                        item.pickQty =
                            0;

                        item.remarks =
                            "";

                        item.error =
                            "";


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


                        clearItemError(
                            index
                        );

                    } else {

                        if (pickInput) {

                            pickInput.disabled =
                                false;

                            pickInput.focus();
                        }


                        if (remarksInput) {

                            remarksInput.disabled =
                                false;
                        }
                    }


                    updateCounters();
                }
            );
        }
    );


    pickInputs.forEach(
        function (input) {

            input.addEventListener(
                "input",
                function () {

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
                        parseNumber(
                            input.value
                        );


                    item.pickQty =
                        value;


                    validatePickQty(
                        index,
                        input
                    );


                    updateCounters();
                }
            );
        }
    );


    remarksInputs.forEach(
        function (input) {

            input.addEventListener(
                "input",
                function () {

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
    input
) {

    const item =
        itemState[index];


    if (!item) {
        return false;
    }


    const value =
        parseNumber(
            input.value
        );


    if (value < 0) {

        item.error =
            "Pick Qty cannot be negative.";

        showItemError(
            index,
            item.error
        );

        return false;
    }


    if (
        value >
        item.balance
    ) {

        item.error =
            `Pick Qty cannot exceed the balance of ${formatNumber(item.balance)}.`;


        showItemError(
            index,
            item.error
        );


        showWarning(
            "Invalid Pick Quantity",
            `Item ${item.itemNo}: Pick Qty (${formatNumber(value)}) is greater than the available balance (${formatNumber(item.balance)}).`
        );


        return false;
    }


    item.error = "";

    clearItemError(
        index
    );


    return true;
}


/* =========================================================
   ITEM ERROR
   ========================================================= */

function showItemError(
    index,
    message
) {

    const errorElement =
        itemsTableBody.querySelector(
            `[data-error-index="${index}"]`
        );


    if (!errorElement) {
        return;
    }


    errorElement.textContent =
        message;


    const row =
        errorElement.closest("tr");


    if (row) {

        row.classList.add(
            "has-error"
        );
    }
}


/* =========================================================
   CLEAR ITEM ERROR
   ========================================================= */

function clearItemError(
    index
) {

    const errorElement =
        itemsTableBody.querySelector(
            `[data-error-index="${index}"]`
        );


    if (errorElement) {

        errorElement.textContent = "";
    }


    const row =
        errorElement
            ? errorElement.closest("tr")
            : null;


    if (row) {

        row.classList.remove(
            "has-error"
        );
    }
}


/* =========================================================
   UPDATE COUNTERS
   ========================================================= */

function updateCounters() {

    const selected =
        itemState.filter(
            item =>
                item.checked &&
                item.pickQty > 0
        );


    const selectedCount =
        itemState.filter(
            item =>
                item.checked
        ).length;


    const totalQty =
        selected.reduce(
            function (total, item) {

                return total +
                    item.pickQty;

            },
            0
        );


    const available =
        itemState.filter(
            item =>
                item.balance > 0
        ).length;


    if (availableItemCount) {

        availableItemCount.textContent =
            formatNumber(
                available
            );
    }


    if (selectedItemCount) {

        selectedItemCount.textContent =
            formatNumber(
                selectedCount
            );
    }


    if (totalPickedQty) {

        totalPickedQty.textContent =
            formatNumber(
                totalQty
            );
    }


    if (pickingWarning) {

        if (!selectedCount) {

            pickingWarning.textContent =
                "Select at least one item.";

            pickingWarning.classList.add(
                "visible"
            );

        } else if (
            selected.some(
                item =>
                    item.pickQty >
                    item.balance
            )
        ) {

            pickingWarning.textContent =
                "One or more Pick Qty values exceed the available balance.";

            pickingWarning.classList.add(
                "visible"
            );

        } else {

            pickingWarning.textContent =
                "Ready for review.";

            pickingWarning.classList.remove(
                "visible"
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
            "Please select a Sales Order first."
        );

        return;
    }


    /*
       Sync editable Sales Order fields.
    */

    syncEditableSOFields();


    /*
       Date
    */

    if (
        !dateOfTransfer ||
        !dateOfTransfer.value
    ) {

        showWarning(
            "Date of Transfer Required",
            "Please enter the Date of Transfer before reviewing the Delivery Receipt."
        );

        if (dateOfTransfer) {
            dateOfTransfer.focus();
        }

        return;
    }


    /*
       Delivery Address
    */

    if (
        !deliveryAddress ||
        !deliveryAddress.value.trim()
    ) {

        showWarning(
            "Delivery Address Required",
            "Please enter the Delivery Address before reviewing the Delivery Receipt."
        );

        if (deliveryAddress) {
            deliveryAddress.focus();
        }

        return;
    }


    /*
       Selected items
    */

    const selectedItems =
        itemState.filter(
            item =>
                item.checked
        );


    if (!selectedItems.length) {

        showWarning(
            "No Items Selected",
            "Please select at least one item to deliver."
        );

        return;
    }


    /*
       Validate every selected item.
    */

    for (
        const item of selectedItems
    ) {

        if (
            !item.pickQty ||
            item.pickQty <= 0
        ) {

            showWarning(
                "Pick Quantity Required",
                `Please enter a Pick Qty for Item ${item.itemNo}.`
            );

            focusPickInput(
                item.index
            );

            return;
        }


        if (
            item.pickQty >
            item.balance
        ) {

            showWarning(
                "Invalid Pick Quantity",
                `Item ${item.itemNo}: Pick Qty cannot exceed the balance of ${formatNumber(item.balance)}.`
            );

            focusPickInput(
                item.index
            );

            return;
        }
    }


    /*
       Build temporary DR.
       Nothing is saved yet.
    */

    currentDR = buildCurrentDR();


    renderReview();


    addHidden(
        prepareView
    );

    removeHidden(
        reviewView
    );

    addHidden(
        completedView
    );


    currentStep = 2;

    updateWorkflow(2);


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   SYNC EDITABLE SO FIELDS
   ========================================================= */

function syncEditableSOFields() {

    if (!selectedSO) {
        return;
    }


    const editableFields = [

        "dateCreation",
        "clientName",
        "salesEngineer",
        "attention",
        "tinNumber",
        "poNumber",
        "paymentTerms",
        "jobOrder",
        "billingAddress",
        "project",
        "deliveryAddress"
    ];


    editableFields.forEach(
        function (field) {

            const element =
                document.querySelector(
                    `[data-field="${field}"]`
                );


            if (element) {

                selectedSO[field] =
                    element.value.trim();
            }
        }
    );


    /*
       Delivery Address is always taken
       from the editable delivery field.
    */

    if (deliveryAddress) {

        selectedSO.deliveryAddress =
            deliveryAddress.value.trim();
    }
}


/* =========================================================
   BUILD CURRENT DR
   ========================================================= */

function buildCurrentDR() {

    const selectedItems =
        itemState
            .filter(
                item =>
                    item.checked &&
                    item.pickQty > 0
            )
            .map(
                function (item) {

                    return {

                        id:
                            item.id,

                        itemNo:
                            item.itemNo,

                        itemName:
                            item.itemName,

                        description:
                            item.description,

                        unit:
                            item.unit,

                        totalOrder:
                            item.totalOrder,

                        totalDelivered:
                            item.totalDelivered,

                        balance:
                            item.balance,

                        pickQty:
                            item.pickQty,

                        remarks:
                            item.remarks
                    };
                }
            );


    return {

        drNumber:
            getElement("drNumber")
                ?.textContent.trim() || "",


        soNumber:
            selectedSO.soNumber,


        dateCreation:
            selectedSO.dateCreation,


        clientName:
            selectedSO.clientName,


        salesEngineer:
            selectedSO.salesEngineer,


        attention:
            selectedSO.attention,


        tinNumber:
            selectedSO.tinNumber,


        poNumber:
            selectedSO.poNumber,


        paymentTerms:
            selectedSO.paymentTerms,


        jobOrder:
            selectedSO.jobOrder,


        billingAddress:
            selectedSO.billingAddress,


        project:
            selectedSO.project,


        deliveryAddress:
            deliveryAddress
                ? deliveryAddress.value.trim()
                : selectedSO.deliveryAddress,


        dateOfTransfer:
            dateOfTransfer
                ? dateOfTransfer.value
                : "",


        items:
            selectedItems,


        totalPickedQty:
            selectedItems.reduce(
                function (total, item) {

                    return total +
                        item.pickQty;

                },
                0
            ),


        status:
            "DRAFT",


        createdAt:
            new Date().toISOString()
    };
}


/* =========================================================
   RENDER REVIEW
   ========================================================= */

function renderReview() {

    if (!currentDR) {
        return;
    }


    setText(
        "reviewDrNumber",
        currentDR.drNumber
    );


    setText(
        "reviewSO",
        currentDR.soNumber
    );


    setText(
        "reviewSODate",
        formatDateDisplay(
            currentDR.dateCreation
        )
    );


    setText(
        "reviewClient",
        currentDR.clientName
    );


    setText(
        "reviewPO",
        currentDR.poNumber
    );


    setText(
        "reviewProject",
        currentDR.project
    );


    setText(
        "reviewTransferDate",
        formatDateDisplay(
            currentDR.dateOfTransfer
        )
    );


    setText(
        "reviewAddress",
        currentDR.deliveryAddress
    );


    if (reviewTotalQty) {

        reviewTotalQty.textContent =
            formatNumber(
                currentDR.totalPickedQty
            );
    }


    renderReviewItems();
}


/* =========================================================
   RENDER REVIEW ITEMS
   ========================================================= */

function renderReviewItems() {

    if (!reviewItemsBody) {
        return;
    }


    reviewItemsBody.innerHTML = "";


    if (
        !currentDR ||
        !currentDR.items.length
    ) {

        reviewItemsBody.innerHTML = `
            <tr>
                <td colspan="7">
                    No delivery items.
                </td>
            </tr>
        `;

        return;
    }


    currentDR.items.forEach(
        function (item) {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(item.itemNo)}
                    </strong>
                </td>

                <td>
                    <div class="item-name">
                        ${escapeHTML(
                            item.itemName || "—"
                        )}
                    </div>

                    <div class="item-description">
                        ${escapeHTML(
                            item.description || "—"
                        )}
                    </div>
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
                    <strong>
                        ${formatNumber(
                            item.pickQty
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        item.remarks || "—"
                    )}
                </td>

            `;


            reviewItemsBody.appendChild(
                row
            );
        }
    );
}


/* =========================================================
   BACK TO PREPARE
   ========================================================= */

function backToPrepare() {

    addHidden(
        reviewView
    );

    removeHidden(
        prepareView
    );

    addHidden(
        completedView
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

function saveDeliveryReceipt() {

    if (!currentDR) {

        showWarning(
            "Nothing to Save",
            "There is no Delivery Receipt ready to save."
        );

        return;
    }


    /*
       Recheck data before final save.
    */

    if (
        !currentDR.items ||
        !currentDR.items.length
    ) {

        showWarning(
            "No Delivery Items",
            "Please go back to Prepare and select delivery items."
        );

        return;
    }


    const deliveryReceipts =
        getDeliveryReceipts();


    /*
       Generate a fresh DR number
       in case another DR was saved
       while this page was open.
    */

    currentDR.drNumber =
        generateDRNumber(
            deliveryReceipts
        );


    currentDR.status =
        "SAVED";


    currentDR.savedAt =
        new Date().toISOString();


    /*
       Add newest DR to beginning.
    */

    deliveryReceipts.unshift(
        currentDR
    );


    try {

        localStorage.setItem(
            DR_STORAGE_KEY,
            JSON.stringify(
                deliveryReceipts
            )
        );

    } catch (error) {

        console.error(
            "Unable to save Delivery Receipt.",
            error
        );


        showWarning(
            "Save Failed",
            "The Delivery Receipt could not be saved to local storage."
        );

        return;
    }


    savedDR =
        currentDR;


    /*
       Remove temporary selected SO.
    */

    try {

        localStorage.removeItem(
            SELECTED_SO_KEY
        );

    } catch (error) {

        console.warn(
            "Unable to clear selected SO.",
            error
        );
    }


    showCompleted();


    console.log(
        "Delivery Receipt saved:",
        savedDR
    );
}


/* =========================================================
   GENERATE DR NUMBER
   ========================================================= */

function generateDRNumber(
    existingDRs = []
) {

    const year =
        new Date().getFullYear();


    let maxNumber = 0;


    existingDRs.forEach(
        function (dr) {

            if (!dr || !dr.drNumber) {
                return;
            }


            const match =
                String(
                    dr.drNumber
                ).match(
                    new RegExp(
                        `^DR-${year}-(\\d+)$`
                    )
                );


            if (!match) {
                return;
            }


            const number =
                Number(
                    match[1]
                );


            if (
                number >
                maxNumber
            ) {

                maxNumber =
                    number;
            }
        }
    );


    return (
        `DR-${year}-` +
        String(
            maxNumber + 1
        ).padStart(5, "0")
    );
}


/* =========================================================
   DISPLAY GENERATED DR NUMBER
   ========================================================= */

function generateAndDisplayDRNumber() {

    const existingDRs =
        getDeliveryReceipts();


    const number =
        generateDRNumber(
            existingDRs
        );


    setText(
        "drNumber",
        number
    );
}


/* =========================================================
   COMPLETED
   ========================================================= */

function showCompleted() {

    if (!savedDR) {
        return;
    }


    setText(
        "completedDrNumber",
        savedDR.drNumber
    );


    setText(
        "completedSO",
        savedDR.soNumber
    );


    setText(
        "completedClient",
        savedDR.clientName
    );


    setText(
        "completedTransferDate",
        formatDateDisplay(
            savedDR.dateOfTransfer
        )
    );


    setText(
        "completedAddress",
        savedDR.deliveryAddress
    );


    /*
       Also update preview data.
    */

    populatePreview();


    addHidden(
        prepareView
    );

    addHidden(
        reviewView
    );

    removeHidden(
        completedView
    );


    currentStep = 3;

    updateWorkflow(3);


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   WORKFLOW
   ========================================================= */

function updateWorkflow(
    step
) {

    currentStep =
        step;


    for (
        let i = 1;
        i <= 3;
        i++
    ) {

        const workflowStep =
            getElement(
                `workflowStep${i}`
            );


        if (!workflowStep) {
            continue;
        }


        workflowStep.classList.remove(
            "active",
            "completed"
        );


        if (
            i === step
        ) {

            workflowStep.classList.add(
                "active"
            );
        }


        if (
            i < step
        ) {

            workflowStep.classList.add(
                "completed"
            );
        }
    }
}


/* =========================================================
   WARNING MODAL
   ========================================================= */

function showWarning(
    title,
    message
) {

    if (warningTitle) {

        warningTitle.textContent =
            title;
    }


    if (warningMessage) {

        warningMessage.textContent =
            message;
    }


    if (warningModal) {

        removeHidden(
            warningModal
        );
    }
}


/* =========================================================
   CLOSE WARNING
   ========================================================= */

function closeWarning() {

    if (warningModal) {

        addHidden(
            warningModal
        );
    }
}


/* =========================================================
   LEAVE CONFIRMATION
   ========================================================= */

function requestLeave() {

    /*
       If DR has already been saved,
       leaving does not lose anything.
    */

    if (
        savedDR ||
        currentStep === 3
    ) {

        goBackToMain();

        return;
    }


    /*
       No SO selected and no work:
       leave immediately.
    */

    const hasWork =
        Boolean(selectedSO) ||
        itemState.some(
            item =>
                item.checked ||
                item.pickQty > 0 ||
                item.remarks
        );


    if (!hasWork) {

        goBackToMain();

        return;
    }


    if (leaveConfirmModal) {

        removeHidden(
            leaveConfirmModal
        );
    }
}


/* =========================================================
   CLOSE LEAVE MODAL
   ========================================================= */

function closeLeaveModal() {

    if (leaveConfirmModal) {

        addHidden(
            leaveConfirmModal
        );
    }
}


/* =========================================================
   GO BACK TO MAIN
   ========================================================= */

function goBackToMain() {

    /*
       Tell index.html that the user came
       from the Delivery module.

       If index.js supports this key,
       it can reopen Delivery automatically.
    */

    try {

        localStorage.setItem(
            RETURN_MODULE_KEY,
            "delivery"
        );

    } catch (error) {

        console.warn(
            "Unable to set return module.",
            error
        );
    }


    /*
       IMPORTANT:

       DO NOT use:

           window.location.href = "delivery.html";

       because create-delivery-receipt.html
       is inside /pages/ while delivery.html
       is a module/fragment.

       Going directly to delivery.html can
       destroy the main index layout.

       Always return to the root index.
    */

    window.location.href =
        "../index.html";
}


/* =========================================================
   PREVIEW
   ========================================================= */

function openPreview() {

    if (!savedDR) {
        return;
    }


    populatePreview();


    if (previewModal) {

        removeHidden(
            previewModal
        );
    }
}


/* =========================================================
   POPULATE PREVIEW
   ========================================================= */

function populatePreview() {

    if (!savedDR) {
        return;
    }


    setText(
        "previewDrNumber",
        savedDR.drNumber
    );


    setText(
        "previewNumber",
        savedDR.drNumber
    );


    setText(
        "previewDate",
        formatDateDisplay(
            savedDR.dateOfTransfer
        )
    );


    setText(
        "previewSO",
        savedDR.soNumber
    );


    setText(
        "previewPO",
        savedDR.poNumber
    );


    setText(
        "previewClient",
        savedDR.clientName
    );


    setText(
        "previewProject",
        savedDR.project
    );


    setText(
        "previewAddress",
        savedDR.deliveryAddress
    );


    const previewItemsBody =
        getElement(
            "previewItemsBody"
        );


    if (!previewItemsBody) {
        return;
    }


    previewItemsBody.innerHTML = "";


    savedDR.items.forEach(
        function (item) {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        item.itemNo
                    )}
                </td>

                <td>
                    <strong>
                        ${escapeHTML(
                            item.itemName || "—"
                        )}
                    </strong>

                    <br>

                    <small>
                        ${escapeHTML(
                            item.description || ""
                        )}
                    </small>
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
                    ${escapeHTML(
                        item.remarks || "—"
                    )}
                </td>

            `;


            previewItemsBody.appendChild(
                row
            );
        }
    );
}


/* =========================================================
   CLOSE PREVIEW
   ========================================================= */

function closePreview() {

    if (previewModal) {

        addHidden(
            previewModal
        );
    }
}


/* =========================================================
   PRINT
   ========================================================= */

function printDeliveryReceipt() {

    if (!savedDR) {
        return;
    }


    window.print();
}


/* =========================================================
   NUMBER PARSER
   ========================================================= */

function parseNumber(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return 0;
    }


    const cleaned =
        String(value)
            .replace(
                /,/g,
                ""
            )
            .trim();


    const number =
        Number(
            cleaned
        );


    return Number.isFinite(number)
        ? number
        : 0;
}


/* =========================================================
   FORMAT NUMBER
   ========================================================= */

function formatNumber(
    value
) {

    const number =
        parseNumber(
            value
        );


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
            maximumFractionDigits: 2
        }
    );
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDateDisplay(
    value
) {

    if (!value) {
        return "—";
    }


    /*
       Handle ISO date and normal
       date strings.
    */

    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value);
    }


    return date.toLocaleDateString(
        "en-US",
        {
            year: "numeric",
            month: "short",
            day: "2-digit"
        }
    );
}


/* =========================================================
   FOCUS PICK INPUT
   ========================================================= */

function focusPickInput(
    index
) {

    if (!itemsTableBody) {
        return;
    }


    const input =
        itemsTableBody.querySelector(
            `.pick-qty-input[data-index="${index}"]`
        );


    if (input) {

        input.focus();

        input.select();
    }
}


/* =========================================================
   SET TEXT
   ========================================================= */

function setText(
    id,
    value
) {

    const element =
        getElement(id);


    if (!element) {
        return;
    }


    element.textContent =
        value ||
        "—";
}


/* =========================================================
   HIDDEN HELPERS
   ========================================================= */

function addHidden(
    element
) {

    if (!element) {
        return;
    }


    element.classList.add(
        "hidden"
    );
}


function removeHidden(
    element
) {

    if (!element) {
        return;
    }


    element.classList.remove(
        "hidden"
    );
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";
    }


    return String(value)
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
   DEBUG
   ========================================================= */

window.LOGISTECH_DR = {

    getSelectedSO:
        function () {
            return selectedSO;
        },

    getItems:
        function () {
            return itemState;
        },

    getCurrentDR:
        function () {
            return currentDR;
        },

    getSavedDR:
        function () {
            return savedDR;
        },

    getSalesOrders:
        function () {
            return getSalesOrders();
        },

    getDeliveryReceipts:
        function () {
            return getDeliveryReceipts();
        }

};
