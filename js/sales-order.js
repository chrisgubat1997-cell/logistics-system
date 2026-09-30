/* =========================================================
   LOGIS-TECH SYSTEM
   SALES ORDER MODULE
   GOOGLE APPS SCRIPT API
========================================================= */


/* =========================================================
   API CONFIG
========================================================= */

// ILAGAY DITO ANG WEB APP URL NG GOOGLE APPS SCRIPT
const SALES_ORDER_API_URL =
    "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let salesOrders = [];
let selectedSO = null;
let currentSO = null;

let soDetailsEditMode = false;


/* =========================================================
   API REQUEST
========================================================= */

async function salesOrderAPI(action, data = {}) {

    try {

        const response = await fetch(
            SALES_ORDER_API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "text/plain;charset=utf-8"
                },

                body: JSON.stringify({
                    action: action,
                    ...data
                })
            }
        );


        if (!response.ok) {

            throw new Error(
                "API request failed: " +
                response.status
            );

        }


        const result =
            await response.json();


        return result;


    } catch (error) {

        console.error(
            "Sales Order API Error:",
            error
        );


        alert(
            "Hindi makakonekta sa LOGIS-TECH database.\n\n" +
            "Check ang Google Apps Script Web App URL."
        );


        return {
            success: false,
            message: error.message
        };

    }

}


/* =========================================================
   LOAD SALES ORDERS
========================================================= */

async function loadSOList() {

    const tbody =
        document.getElementById(
            "soTableBody"
        );


    if (tbody) {

        tbody.innerHTML = `
            <tr>
                <td colspan="100%" style="text-align:center;">
                    Loading Sales Orders...
                </td>
            </tr>
        `;

    }


    const result =
        await salesOrderAPI(
            "getSalesOrders"
        );


    if (!result.success) {

        if (tbody) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" style="text-align:center;">
                        Failed to load Sales Orders.
                    </td>
                </tr>
            `;

        }

        console.error(result.message);

        return;

    }


    salesOrders =
        Array.isArray(
            result.salesOrders
        )
            ? result.salesOrders
            : [];


    renderSOList(
        salesOrders
    );

}


/* =========================================================
   RENDER SALES ORDER LIST
========================================================= */

function renderSOList(list) {

    const tbody =
        document.getElementById(
            "soTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (!list || list.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="100%" style="text-align:center;">
                    No Sales Order found.
                </td>
            </tr>
        `;

        return;

    }


    list.forEach(function(so) {

        const row =
            document.createElement("tr");


        row.dataset.soNumber =
            so.soNumber;


        row.innerHTML = `
            <td>${escapeHTML(so.soNumber)}</td>
            <td>${escapeHTML(so.dateCreation || "")}</td>
            <td>${escapeHTML(so.clientName || "")}</td>
            <td>${escapeHTML(so.project || "")}</td>
            <td>${escapeHTML(so.poNumber || "")}</td>
            <td>${escapeHTML(so.status || "")}</td>
            <td style="text-align:right;">
                ${formatMoney(so.grandTotal)}
            </td>
        `;


        /* ==========================================
           SINGLE CLICK
        ========================================== */

        row.addEventListener(
            "click",
            function() {

                selectSO(
                    so.soNumber
                );

            }
        );


        /* ==========================================
           DOUBLE CLICK
        ========================================== */

        row.addEventListener(
            "dblclick",
            function() {

                openSODetails(
                    so.soNumber
                );

            }
        );


        tbody.appendChild(row);

    });

}


/* =========================================================
   SELECT SALES ORDER
========================================================= */

function selectSO(soNumber) {

    selectedSO =
        salesOrders.find(
            function(so) {

                return (
                    String(so.soNumber)
                    === String(soNumber)
                );

            }
        );


    if (!selectedSO) {
        return;
    }


    /* Highlight selected row */

    document
        .querySelectorAll(
            "#soTableBody tr"
        )
        .forEach(function(row) {

            row.classList.remove(
                "selected"
            );

        });


    const selectedRow =
        document.querySelector(
            `#soTableBody tr[data-so-number="${cssEscape(soNumber)}"]`
        );


    if (selectedRow) {

        selectedRow.classList.add(
            "selected"
        );

    }


    /* ==========================================
       COMPACT PREVIEW
    ========================================== */

    const preview =
        document.getElementById(
            "selectedSOInfo"
        );


    if (!preview) {
        return;
    }


    preview.innerHTML = `

        <div class="so-preview">

            <strong>
                ${escapeHTML(selectedSO.soNumber)}
            </strong>

            <br>

            Client:
            ${escapeHTML(selectedSO.clientName || "-")}

            <br>

            Project:
            ${escapeHTML(selectedSO.project || "-")}

            <br>

            Status:
            ${escapeHTML(selectedSO.status || "-")}

            <br>

            Grand Total:
            <strong>
                ${formatMoney(selectedSO.grandTotal)}
            </strong>

        </div>

    `;

}


/* =========================================================
   SEARCH SALES ORDER
========================================================= */

function searchSO() {

    const input =
        document.getElementById(
            "soSearch"
        );


    const keyword =
        String(
            input ? input.value : ""
        )
        .trim()
        .toLowerCase();


    if (!keyword) {

        renderSOList(
            salesOrders
        );

        return;

    }


    const filtered =
        salesOrders.filter(
            function(so) {

                return [

                    so.soNumber,
                    so.clientName,
                    so.project,
                    so.poNumber,
                    so.jobOrder,
                    so.se,
                    so.status

                ]
                .join(" ")
                .toLowerCase()
                .includes(keyword);

            }
        );


    renderSOList(
        filtered
    );

}


/* =========================================================
   OPEN CREATE SO
========================================================= */

function openCreateSO() {

    window.location.href =
        "pages/create-sales-order.html";

}


/* =========================================================
   OPEN SO DETAILS
========================================================= */

async function openSODetails(soNumber) {

    const result =
        await salesOrderAPI(
            "getSalesOrder",
            {
                soNumber:
                    soNumber
            }
        );


    if (!result.success) {

        alert(
            result.message ||
            "Hindi ma-load ang Sales Order."
        );

        return;

    }


    currentSO =
        result.so;


    selectedSO =
        currentSO;


    const salesPage =
        document.getElementById(
            "sales"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    if (salesPage) {

        salesPage.classList.remove(
            "active"
        );

        salesPage.style.display =
            "none";

    }


    if (detailsPage) {

        detailsPage.classList.add(
            "active"
        );

        detailsPage.style.display =
            "block";

    }


    renderSODetails(
        currentSO
    );


    setDetailsEditMode(
        false
    );

}


/* =========================================================
   RENDER SO DETAILS
========================================================= */

function renderSODetails(so) {

    if (!so) {
        return;
    }


    setValue(
        "detailSODate",
        so.dateCreation
    );


    setValue(
        "detailSONumber",
        so.soNumber
    );


    setValue(
        "detailClientName",
        so.clientName
    );


    setValue(
        "detailSE",
        so.se
    );


    setValue(
        "detailAttention",
        so.attention
    );


    setValue(
        "detailBillingAddress",
        so.billingAddress
    );


    setValue(
        "detailDeliveryAddress",
        so.deliveryAddress
    );


    setValue(
        "detailProject",
        so.project
    );


    setValue(
        "detailTIN",
        so.tin
    );


    setValue(
        "detailPONumber",
        so.poNumber
    );


    setValue(
        "detailTerms",
        so.terms
    );


    setValue(
        "detailJobOrder",
        so.jobOrder
    );


    renderSODetailItems(
        so.items || []
    );


    setText(
        "detailSubtotal",
        formatMoney(
            so.subtotal
        )
    );


    setText(
        "detailDiscount",
        formatMoney(
            so.discount
        )
    );


    setText(
        "detailVatable",
        formatMoney(
            so.vatable
        )
    );


    setText(
        "detailVAT",
        formatMoney(
            so.vatAmount
        )
    );


    setText(
        "detailGrandTotal",
        formatMoney(
            so.grandTotal
        )
    );

}


/* =========================================================
   RENDER DETAIL ITEMS
========================================================= */

function renderSODetailItems(items) {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (!items.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="100%" style="text-align:center;">
                    No items.
                </td>
            </tr>
        `;

        return;

    }


    items.forEach(
        function(item, index) {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    <input
                        type="text"
                        class="so-detail-item-name"
                        value="${escapeAttribute(item.itemName || "")}"
                        disabled
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="so-detail-description"
                        value="${escapeAttribute(item.description || "")}"
                        disabled
                    >
                </td>

                <td>
                    <input
                        type="number"
                        class="so-detail-qty"
                        value="${Number(item.qty || 0)}"
                        disabled
                        oninput="calculateDetailTotals()"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="so-detail-unit"
                        value="${escapeAttribute(item.unit || "")}"
                        disabled
                    >
                </td>

                <td>
                    <input
                        type="number"
                        class="so-detail-amount"
                        value="${Number(item.amount || 0)}"
                        disabled
                        oninput="calculateDetailTotals()"
                    >
                </td>

                <td class="so-detail-total">
                    ${formatMoney(item.total)}
                </td>

                <td>
                    <button
                        type="button"
                        class="detail-delete-item"
                        onclick="deleteDetailItem(this)"
                        style="display:none;"
                    >
                        DELETE
                    </button>
                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   DETAIL EDIT MODE
========================================================= */

function enableSOUpdate() {

    setDetailsEditMode(
        true
    );

}


/* =========================================================
   SET DETAIL EDIT MODE
========================================================= */

function setDetailsEditMode(enabled) {

    soDetailsEditMode =
        Boolean(enabled);


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    if (!detailsPage) {
        return;
    }


    const inputs =
        detailsPage.querySelectorAll(
            "input, textarea, select"
        );


    inputs.forEach(
        function(input) {

            /* SO Number remains readonly */

            if (
                input.id ===
                "detailSONumber"
            ) {

                input.disabled =
                    true;

                return;

            }


            input.disabled =
                !enabled;

        }
    );


    document
        .querySelectorAll(
            ".detail-delete-item"
        )
        .forEach(
            function(button) {

                button.style.display =
                    enabled
                        ? "inline-block"
                        : "none";

            }
        );


    const addButton =
        document.getElementById(
            "detailAddItemButton"
        );


    if (addButton) {

        addButton.style.display =
            enabled
                ? "inline-block"
                : "none";

    }


    const saveButton =
        document.querySelector(
            '[onclick="saveSOUpdate()"]'
        );


    if (saveButton) {

        saveButton.style.display =
            enabled
                ? "inline-block"
                : "none";

    }

}


/* =========================================================
   ADD DETAIL ITEM
========================================================= */

function addDetailItem() {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return;
    }


    const row =
        document.createElement("tr");


    const index =
        tbody.querySelectorAll(
            "tr"
        ).length + 1;


    row.innerHTML = `

        <td>
            ${index}
        </td>

        <td>
            <input
                type="text"
                class="so-detail-item-name"
                value=""
            >
        </td>

        <td>
            <input
                type="text"
                class="so-detail-description"
                value=""
            >
        </td>

        <td>
            <input
                type="number"
                class="so-detail-qty"
                value="1"
                min="0"
                oninput="calculateDetailTotals()"
            >
        </td>

        <td>
            <input
                type="text"
                class="so-detail-unit"
                value=""
            >
        </td>

        <td>
            <input
                type="number"
                class="so-detail-amount"
                value="0"
                min="0"
                step="0.01"
                oninput="calculateDetailTotals()"
            >
        </td>

        <td class="so-detail-total">
            ${formatMoney(0)}
        </td>

        <td>
            <button
                type="button"
                class="detail-delete-item"
                onclick="deleteDetailItem(this)"
            >
                DELETE
            </button>
        </td>

    `;


    tbody.appendChild(
        row
    );


    renumberDetailItems();


    calculateDetailTotals();

}


/* =========================================================
   DELETE DETAIL ITEM
========================================================= */

function deleteDetailItem(button) {

    if (!soDetailsEditMode) {
        return;
    }


    const row =
        button.closest("tr");


    if (row) {

        row.remove();

    }


    renumberDetailItems();


    calculateDetailTotals();

}


/* =========================================================
   RENUMBER DETAIL ITEMS
========================================================= */

function renumberDetailItems() {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return;
    }


    const rows =
        tbody.querySelectorAll(
            "tr"
        );


    rows.forEach(
        function(row, index) {

            if (
                row.children[0]
            ) {

                row.children[0]
                    .textContent =
                    index + 1;

            }

        }
    );

}


/* =========================================================
   CALCULATE DETAIL TOTALS
========================================================= */

function calculateDetailTotals() {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return;
    }


    let subtotal = 0;


    const rows =
        tbody.querySelectorAll(
            "tr"
        );


    rows.forEach(
        function(row) {

            const qtyInput =
                row.querySelector(
                    ".so-detail-qty"
                );


            const amountInput =
                row.querySelector(
                    ".so-detail-amount"
                );


            const totalCell =
                row.querySelector(
                    ".so-detail-total"
                );


            if (
                !qtyInput ||
                !amountInput
            ) {
                return;
            }


            const qty =
                Number(
                    qtyInput.value || 0
                );


            const amount =
                Number(
                    amountInput.value || 0
                );


            const total =
                qty * amount;


            subtotal += total;


            if (totalCell) {

                totalCell.textContent =
                    formatMoney(total);

            }

        }
    );


    /*
     * Discount is taken from current SO.
     */

    const discount =
        Number(
            currentSO?.discount || 0
        );


    const vatable =
        subtotal - discount;


    const vatRate =
        0.12;


    const vatAmount =
        vatable * vatRate;


    const grandTotal =
        vatable + vatAmount;


    setText(
        "detailSubtotal",
        formatMoney(subtotal)
    );


    setText(
        "detailDiscount",
        formatMoney(discount)
    );


    setText(
        "detailVatable",
        formatMoney(vatable)
    );


    setText(
        "detailVAT",
        formatMoney(vatAmount)
    );


    setText(
        "detailGrandTotal",
        formatMoney(grandTotal)
    );

}


/* =========================================================
   SAVE SO UPDATE
========================================================= */

async function saveSOUpdate() {

    if (!currentSO) {

        alert(
            "Walang selected Sales Order."
        );

        return;

    }


    const items =
        collectDetailItems();


    let subtotal = 0;


    items.forEach(
        function(item) {

            subtotal +=
                Number(item.total || 0);

        }
    );


    const discount =
        Number(
            currentSO.discount || 0
        );


    const vatable =
        subtotal - discount;


    const vatRate =
        0.12;


    const vatAmount =
        vatable * vatRate;


    const grandTotal =
        vatable + vatAmount;


    const data = {

        soNumber:
            currentSO.soNumber,

        dateCreation:
            getValue(
                "detailSODate"
            ),

        clientName:
            getValue(
                "detailClientName"
            ),

        se:
            getValue(
                "detailSE"
            ),

        attention:
            getValue(
                "detailAttention"
            ),

        billingAddress:
            getValue(
                "detailBillingAddress"
            ),

        deliveryAddress:
            getValue(
                "detailDeliveryAddress"
            ),

        project:
            getValue(
                "detailProject"
            ),

        tin:
            getValue(
                "detailTIN"
            ),

        poNumber:
            getValue(
                "detailPONumber"
            ),

        terms:
            getValue(
                "detailTerms"
            ),

        jobOrder:
            getValue(
                "detailJobOrder"
            ),

        status:
            currentSO.status ||
            "ACTIVE",

        subtotal:
            subtotal,

        discount:
            discount,

        vatable:
            vatable,

        vatRate:
            vatRate,

        vatAmount:
            vatAmount,

        grandTotal:
            grandTotal,

        createdBy:
            currentSO.createdBy ||
            "",

        createdDate:
            currentSO.createdDate ||
            "",

        items:
            items

    };


    const saveButton =
        document.querySelector(
            '[onclick="saveSOUpdate()"]'
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "SAVING...";

    }


    const result =
        await salesOrderAPI(
            "updateSalesOrder",
            data
        );


    if (saveButton) {

        saveButton.disabled =
            false;

        saveButton.textContent =
            "SAVE";

    }


    if (!result.success) {

        alert(
            result.message ||
            "Failed to update Sales Order."
        );

        return;

    }


    alert(
        "Sales Order updated successfully."
    );


    soDetailsEditMode =
        false;


    await openSODetails(
        currentSO.soNumber
    );


    await loadSOList();

}


/* =========================================================
   COLLECT DETAIL ITEMS
========================================================= */

function collectDetailItems() {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return [];
    }


    const rows =
        tbody.querySelectorAll(
            "tr"
        );


    const items =
        [];


    rows.forEach(
        function(row, index) {

            const itemNameInput =
                row.querySelector(
                    ".so-detail-item-name"
                );


            const descriptionInput =
                row.querySelector(
                    ".so-detail-description"
                );


            const qtyInput =
                row.querySelector(
                    ".so-detail-qty"
                );


            const unitInput =
                row.querySelector(
                    ".so-detail-unit"
                );


            const amountInput =
                row.querySelector(
                    ".so-detail-amount"
                );


            if (!itemNameInput) {
                return;
            }


            const itemName =
                itemNameInput.value.trim();


            const description =
                descriptionInput
                    ? descriptionInput.value.trim()
                    : "";


            const qty =
                Number(
                    qtyInput
                        ? qtyInput.value
                        : 0
                );


            const unit =
                unitInput
                    ? unitInput.value.trim()
                    : "";


            const amount =
                Number(
                    amountInput
                        ? amountInput.value
                        : 0
                );


            const total =
                qty * amount;


            items.push({

                itemNumber:
                    index + 1,

                itemName:
                    itemName,

                description:
                    description,

                qty:
                    qty,

                unit:
                    unit,

                amount:
                    amount,

                total:
                    total

            });

        }
    );


    return items;

}


/* =========================================================
   CANCEL SELECTED SO
========================================================= */

async function cancelSelectedSO() {

    const so =
        selectedSO ||
        currentSO;


    if (!so) {

        alert(
            "Pumili muna ng Sales Order."
        );

        return;

    }


    if (
        String(so.status)
            .toUpperCase()
        === "CANCELLED"
    ) {

        alert(
            "Cancelled na ang Sales Order na ito."
        );

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to cancel SO " +
            so.soNumber +
            "?"
        );


    if (!confirmed) {
        return;
    }


    const result =
        await salesOrderAPI(
            "cancelSalesOrder",
            {
                soNumber:
                    so.soNumber
            }
        );


    if (!result.success) {

        alert(
            result.message ||
            "Failed to cancel Sales Order."
        );

        return;

    }


    alert(
        "Sales Order cancelled successfully."
    );


    selectedSO =
        null;


    currentSO =
        null;


    await loadSOList();


    closeSODetails();

}


/* =========================================================
   UPDATE SELECTED SO
========================================================= */

function updateSelectedSO() {

    const so =
        selectedSO ||
        currentSO;


    if (!so) {

        alert(
            "Pumili muna ng Sales Order."
        );

        return;

    }


    openSODetails(
        so.soNumber
    );

}


/* =========================================================
   CLOSE SO DETAILS
========================================================= */

function closeSODetails() {

    const salesPage =
        document.getElementById(
            "sales"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    if (detailsPage) {

        detailsPage.classList.remove(
            "active"
        );

        detailsPage.style.display =
            "none";

    }


    if (salesPage) {

        salesPage.classList.add(
            "active"
        );

        salesPage.style.display =
            "block";

    }


    soDetailsEditMode =
        false;


    currentSO =
        null;

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function setValue(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.value =
        value == null
            ? ""
            : value;

}


function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return String(
        element.value || ""
    ).trim();

}


function setText(id, value) {

    const element =
        document.getElementById(id);


    if (!element) {
        return;
    }


    element.textContent =
        value == null
            ? ""
            : value;

}


/* =========================================================
   MONEY FORMAT
========================================================= */

function formatMoney(value) {

    const number =
        Number(value || 0);


    return number.toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(
        value == null
            ? ""
            : value
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


function escapeAttribute(value) {

    return escapeHTML(
        value
    );

}


function cssEscape(value) {

    if (
        window.CSS &&
        typeof window.CSS.escape ===
            "function"
    ) {

        return window.CSS.escape(
            String(value)
        );

    }


    return String(value)
        .replace(
            /([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
            "\\$1"
        );

}


/* =========================================================
   INITIALIZE SALES ORDER MODULE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        /*
         * Huwag automatic mag-load kung
         * hindi pa naka-display ang Sales Order page.
         *
         * Main index.html ang tatawag sa
         * loadSOList().
         */

        console.log(
            "LOGIS-TECH Sales Order module loaded."
        );

    }
);
