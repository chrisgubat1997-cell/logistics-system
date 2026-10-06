
/* =========================================================
LOGIS-TECH SYSTEM
CREATE INVOICE
VERSION: 20261006-02

WORKFLOW:

INVOICING
↓
PREPARE INVOICE
↓
create-invoice.html
↓
REVIEW / PREVIEW
↓
PRINT
↓
SAVE INVOICE

STORAGE:
localStorage muna

VAT:
12%

EWT:
SUPPLY = 1%
EWORKS = 2%
========================================================= */

(() => {

 
"use strict";


/* =====================================================
   STORAGE
====================================================== */

const INVOICE_STORAGE_KEY =
    "logitechInvoices";

const SALES_ORDER_STORAGE_KEY =
    "logitechSalesOrders";


/* =====================================================
   CONSTANTS
====================================================== */

const VAT_RATE = 0.12;

const EWT_RATES = {
    NONE: 0,
    SUPPLY: 0.01,
    EWORKS: 0.02
};


/* =====================================================
   STATE
====================================================== */

let invoiceItems = [];

let currentInvoice = null;

let isSaving = false;


/* =====================================================
   DOM
====================================================== */

const $ = (id) =>
    document.getElementById(id);


/* =====================================================
   INIT
====================================================== */

document.addEventListener(
    "DOMContentLoaded",
    initializeCreateInvoice
);


function initializeCreateInvoice() {

    console.log(
        "[CREATE INVOICE] Initializing..."
    );


    setDefaultInvoiceDate();

    generateInvoiceNumber();

    bindEvents();

    addItem();

    updateCalculations();

    loadSalesOrderFromUrl();

}


/* =====================================================
   EVENT BINDINGS
====================================================== */

function bindEvents() {


    /* ---------------------------------------------
       BACK
    --------------------------------------------- */

    $("backBtn")?.addEventListener(
        "click",
        goBackToInvoicing
    );


    $("cancelBtn")?.addEventListener(
        "click",
        goBackToInvoicing
    );


    $("bottomCancelBtn")?.addEventListener(
        "click",
        goBackToInvoicing
    );


    /* ---------------------------------------------
       ADD ITEM
    --------------------------------------------- */

    $("addItemBtn")?.addEventListener(
        "click",
        () => {
            addItem();
        }
    );


    /* ---------------------------------------------
       PREVIEW
    --------------------------------------------- */

    $("previewBtn")?.addEventListener(
        "click",
        openInvoicePreview
    );


    $("bottomPreviewBtn")?.addEventListener(
        "click",
        openInvoicePreview
    );


    $("closePreviewBtn")?.addEventListener(
        "click",
        closeInvoicePreview
    );


    $("previewOverlay")?.addEventListener(
        "click",
        closeInvoicePreview
    );


    /* ---------------------------------------------
       PRINT
    --------------------------------------------- */

    $("printInvoiceBtn")?.addEventListener(
        "click",
        printInvoice
    );


    /* ---------------------------------------------
       SAVE
    --------------------------------------------- */

    $("saveInvoiceBtn")?.addEventListener(
        "click",
        saveInvoice
    );


    $("bottomSaveBtn")?.addEventListener(
        "click",
        saveInvoice
    );


    /* ---------------------------------------------
       EWT
    --------------------------------------------- */

    document
        .querySelectorAll(
            'input[name="ewtType"]'
        )
        .forEach(radio => {

            radio.addEventListener(
                "change",
                handleEwtChange
            );

        });


    /* ---------------------------------------------
       ESCAPE
    --------------------------------------------- */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                const modal =
                    $("invoicePreviewModal");

                if (
                    modal &&
                    modal.classList.contains("active")
                ) {

                    closeInvoicePreview();

                }

            }

        }
    );

}


/* =====================================================
   DEFAULT DATE
====================================================== */

function setDefaultInvoiceDate() {

    const input =
        $("invoiceDate");

    if (!input) return;

    if (!input.value) {

        const now =
            new Date();

        const localDate =
            new Date(
                now.getTime()
                -
                now.getTimezoneOffset()
                * 60000
            )
                .toISOString()
                .split("T")[0];

        input.value =
            localDate;

    }

}


/* =====================================================
   INVOICE NUMBER
====================================================== */

function generateInvoiceNumber() {

    const input =
        $("invoiceNo");

    if (!input) return;


    const existingInvoices =
        getStoredInvoices();


    const year =
        new Date().getFullYear();


    let highest =
        0;


    existingInvoices.forEach(
        invoice => {

            const number =
                String(
                    invoice.invoiceNo ||
                    ""
                );


            const match =
                number.match(
                    /INV-\d{4}-(\d+)/
                );


            if (match) {

                const sequence =
                    Number(
                        match[1]
                    );


                if (
                    sequence > highest
                ) {

                    highest =
                        sequence;

                }

            }

        }
    );


    const nextNumber =
        highest + 1;


    input.value =
        `INV-${year}-${String(nextNumber).padStart(4, "0")}`;

}


/* =====================================================
   ADD ITEM
====================================================== */

function addItem(data = {}) {

    const item = {

        id:
            Date.now()
            +
            Math.random(),

        itemNo:
            data.itemNo ||
            "",

        description:
            data.description ||
            data.itemName ||
            data.itemDescription ||
            "",

        qtyInvoice:
            toNumber(
                data.qtyInvoice ??
                data.qty ??
                data.quantity ??
                0
            ),

        unit:
            data.unit ||
            data.uom ||
            "",

        unitPrice:
            toNumber(
                data.unitPrice ??
                data.price ??
                0
            )

    };


    invoiceItems.push(item);

    renderItems();

    updateCalculations();

}


/* =====================================================
   REMOVE ITEM
====================================================== */

function removeItem(id) {

    invoiceItems =
        invoiceItems.filter(
            item =>
                item.id !== id
        );

    renderItems();

    updateCalculations();

}


/* =====================================================
   RENDER ITEMS
====================================================== */

function renderItems() {

    const body =
        $("invoiceItemsBody");

    const empty =
        $("emptyItemsMessage");

    if (!body) return;


    body.innerHTML = "";


    if (!invoiceItems.length) {

        if (empty) {
            empty.style.display =
                "flex";
        }

        return;

    }


    if (empty) {
        empty.style.display =
            "none";
    }


    invoiceItems.forEach(
        (item, index) => {

            const tr =
                document.createElement("tr");


            tr.innerHTML = `

                <td>
                    <input
                        type="text"
                        class="item-input"
                        data-field="itemNo"
                        data-id="${item.id}"
                        value="${escapeAttribute(item.itemNo)}"
                        placeholder="Item No."
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="item-input"
                        data-field="description"
                        data-id="${item.id}"
                        value="${escapeAttribute(item.description)}"
                        placeholder="Description"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        class="item-input number"
                        data-field="qtyInvoice"
                        data-id="${item.id}"
                        value="${item.qtyInvoice || ""}"
                        min="0"
                        step="any"
                        placeholder="0"
                    >
                </td>

                <td>
                    <input
                        type="text"
                        class="item-input"
                        data-field="unit"
                        data-id="${item.id}"
                        value="${escapeAttribute(item.unit)}"
                        placeholder="Unit"
                    >
                </td>

                <td>
                    <input
                        type="number"
                        class="item-input number"
                        data-field="unitPrice"
                        data-id="${item.id}"
                        value="${item.unitPrice || ""}"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                    >
                </td>

                <td>
                    <span
                        class="item-total"
                        data-total-id="${item.id}"
                    >
                        ${formatCurrency(
                            item.qtyInvoice *
                            item.unitPrice
                        )}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="remove-item-btn"
                        data-remove-id="${item.id}"
                        title="Remove item"
                    >
                        ×
                    </button>
                </td>

            `;


            body.appendChild(tr);

        }
    );


    bindItemEvents();

}


/* =====================================================
   ITEM EVENTS
====================================================== */

function bindItemEvents() {

    document
        .querySelectorAll(
            ".item-input"
        )
        .forEach(input => {

            input.addEventListener(
                "input",
                handleItemInput
            );

        });


    document
        .querySelectorAll(
            ".remove-item-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    removeItem(
                        Number(
                            button.dataset.removeId
                        )
                    );

                }
            );

        });

}


/* =====================================================
   ITEM INPUT
====================================================== */

function handleItemInput(event) {

    const input =
        event.target;

    const id =
        Number(
            input.dataset.id
        );

    const field =
        input.dataset.field;


    const item =
        invoiceItems.find(
            row =>
                row.id === id
        );


    if (!item) return;


    if (
        field === "qtyInvoice" ||
        field === "unitPrice"
    ) {

        item[field] =
            toNumber(
                input.value
            );

    } else {

        item[field] =
            input.value;

    }


    updateItemTotal(id);

    updateCalculations();

}


/* =====================================================
   ITEM TOTAL
====================================================== */

function updateItemTotal(id) {

    const item =
        invoiceItems.find(
            row =>
                row.id === id
        );

    if (!item) return;


    const total =
        item.qtyInvoice *
        item.unitPrice;


    const element =
        document.querySelector(
            `[data-total-id="${id}"]`
        );


    if (element) {

        element.textContent =
            formatCurrency(total);

    }

}


/* =====================================================
   CALCULATIONS
====================================================== */

function calculateInvoice() {

    const totalSales =
        invoiceItems.reduce(
            (sum, item) => {

                return (
                    sum
                    +
                    (
                        toNumber(
                            item.qtyInvoice
                        )
                        *
                        toNumber(
                            item.unitPrice
                        )
                    )
                );

            },
            0
        );


    /*
     * USER FORMULA
     *
     * Total Sales / 1.12
     * = Net of VAT
     *
     * Net of VAT x .12
     * = VAT
     *
     * Net of VAT + VAT
     * = Amount Due
     */

    const netOfVat =
        totalSales /
        (1 + VAT_RATE);


    const vat =
        netOfVat *
        VAT_RATE;


    const amountDue =
        netOfVat +
        vat;


    const ewtType =
        getSelectedEwtType();


    const ewtRate =
        EWT_RATES[
            ewtType
        ] || 0;


    /*
     * EWT is based on
     * VAT-inclusive Amount Due.
     */

    const ewtAmount =
        amountDue *
        ewtRate;


    const finalAmountDue =
        amountDue -
        ewtAmount;


    return {

        totalSales,

        netOfVat,

        vat,

        amountDue,

        ewtType,

        ewtRate,

        ewtAmount,

        finalAmountDue

    };

}


/* =====================================================
   UPDATE CALCULATIONS
====================================================== */

function updateCalculations() {

    const totals =
        calculateInvoice();


    setText(
        "totalSalesDisplay",
        formatCurrency(
            totals.totalSales
        )
    );


    setText(
        "netVatDisplay",
        formatCurrency(
            totals.netOfVat
        )
    );


    setText(
        "vatDisplay",
        formatCurrency(
            totals.vat
        )
    );


    setText(
        "amountDueDisplay",
        formatCurrency(
            totals.amountDue
        )
    );


    setText(
        "ewtDisplay",
        formatCurrency(
            totals.ewtAmount
        )
    );


    setText(
        "finalAmountDueDisplay",
        formatCurrency(
            totals.finalAmountDue
        )
    );


    updateEwtDisplay(
        totals
    );

}


/* =====================================================
   EWT DISPLAY
====================================================== */

function updateEwtDisplay(
    totals
) {

    const ewtRow =
        $("ewtRow");

    const ewtLabel =
        $("ewtLabel");

    const formula =
        $("ewtFormulaText");


    if (
        totals.ewtType ===
        "NONE"
    ) {

        if (ewtRow) {

            ewtRow.style.display =
                "none";

        }


        if (ewtLabel) {

            ewtLabel.textContent =
                "Less: EWT";

        }


        if (formula) {

            formula.textContent =
                "No EWT selected.";

        }

        return;

    }


    if (ewtRow) {

        ewtRow.style.display =
            "flex";

    }


    const label =
        totals.ewtType ===
        "SUPPLY"
            ? "Less: EWT - SUPPLY"
            : "Less: EWT - EWORKS";


    if (ewtLabel) {

        ewtLabel.textContent =
            label;

    }


    if (formula) {

        formula.textContent =
            `EWT - ${totals.ewtType} = Amount Due × ${(
                totals.ewtRate * 100
            ).toFixed(0)}%`;

    }

}


/* =====================================================
   EWT CHANGE
====================================================== */

function handleEwtChange() {

    updateEwtOptionStyles();

    updateCalculations();

}


function updateEwtOptionStyles() {

    document
        .querySelectorAll(
            ".ewt-option"
        )
        .forEach(option => {

            const radio =
                option.querySelector(
                    'input[name="ewtType"]'
                );


            option.classList.toggle(
                "active",
                Boolean(
                    radio &&
                    radio.checked
                )
            );

        });

}


function getSelectedEwtType() {

    const selected =
        document.querySelector(
            'input[name="ewtType"]:checked'
        );


    return selected
        ? selected.value
        : "NONE";

}


/* =====================================================
   BUILD INVOICE OBJECT
====================================================== */

function collectInvoiceData() {

    const totals =
        calculateInvoice();


    return {

        invoiceNo:
            getValue(
                "invoiceNo"
            ),

        invoiceDate:
            getValue(
                "invoiceDate"
            ),

        createdDate:
            getValue(
                "invoiceDate"
            ),

        siNo:
            getValue(
                "siNo"
            ),

        soNo:
            getValue(
                "soNo"
            ),

        drNo:
            getValue(
                "drNo"
            ),

        poNo:
            getValue(
                "poNo"
            ),

        terms:
            getValue(
                "terms"
            ),

        se:
            getValue(
                "se"
            ),

        clientName:
            getValue(
                "clientName"
            ),

        billingAddress:
            getValue(
                "billingAddress"
            ),

        tinNo:
            getValue(
                "tinNo"
            ),

        project:
            getValue(
                "project"
            ),

        ewtType:
            totals.ewtType,

        ewtRate:
            totals.ewtRate,

        items:
            invoiceItems.map(
                item => ({

                    itemNo:
                        item.itemNo,

                    description:
                        item.description,

                    qtyInvoice:
                        toNumber(
                            item.qtyInvoice
                        ),

                    unit:
                        item.unit,

                    unitPrice:
                        toNumber(
                            item.unitPrice
                        ),

                    totalAmount:
                        toNumber(
                            item.qtyInvoice
                        )
                        *
                        toNumber(
                            item.unitPrice
                        )

                })
            ),

        totalSales:
            totals.totalSales,

        netOfVat:
            totals.netOfVat,

        vat:
            totals.vat,

        amountDue:
            totals.amountDue,

        ewtAmount:
            totals.ewtAmount,

        finalAmountDue:
            totals.finalAmountDue,

        status:
            "DRAFT",

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()

    };

}


/* =====================================================
   SAVE
====================================================== */

function saveInvoice() {

    if (isSaving) return;


    const validation =
        validateInvoice();


    if (!validation.valid) {

        alert(
            validation.message
        );

        return;

    }


    const invoice =
        collectInvoiceData();


    const invoices =
        getStoredInvoices();


    /*
     * Prevent duplicate invoice number.
     */

    const existingIndex =
        invoices.findIndex(
            item =>
                item.invoiceNo ===
                invoice.invoiceNo
        );


    if (
        existingIndex >= 0
    ) {

        invoice.updatedAt =
            new Date().toISOString();

        invoices[
            existingIndex
        ] = invoice;

    } else {

        invoices.unshift(
            invoice
        );

    }


    isSaving = true;


    try {

        localStorage.setItem(
            INVOICE_STORAGE_KEY,
            JSON.stringify(
                invoices
            )
        );


        currentInvoice =
            invoice;


        showSavedState();


    } catch (error) {

        console.error(
            "[CREATE INVOICE] Save error:",
            error
        );


        alert(
            "Unable to save invoice. Please check your browser storage."
        );

    } finally {

        isSaving = false;

    }

}


/* =====================================================
   VALIDATION
====================================================== */

function validateInvoice() {

    const client =
        getValue(
            "clientName"
        );


    if (!client) {

        return {

            valid: false,

            message:
                "Please enter the Client Name."

        };

    }


    if (
        !invoiceItems.length
    ) {

        return {

            valid: false,

            message:
                "Please add at least one invoice item."

        };

    }


    const hasValidItem =
        invoiceItems.some(
            item =>
                toNumber(
                    item.qtyInvoice
                ) > 0
                &&
                toNumber(
                    item.unitPrice
                ) > 0
        );


    if (!hasValidItem) {

        return {

            valid: false,

            message:
                "Please enter a valid Qty Invoice and Unit Price."

        };

    }


    return {

        valid: true

    };

}


/* =====================================================
   SAVED STATE
====================================================== */

function showSavedState() {

    const buttons =
        document.querySelectorAll(
            "#saveInvoiceBtn, #bottomSaveBtn"
        );


    buttons.forEach(
        button => {

            const original =
                button.textContent;


            button.textContent =
                "✓ Saved";


            button.disabled =
                true;


            setTimeout(
                () => {

                    button.textContent =
                        original;

                    button.disabled =
                        false;

                },
                1600
            );

        }
    );

}


/* =====================================================
   PREVIEW
====================================================== */

function openInvoicePreview() {

    const validation =
        validateInvoice();


    if (!validation.valid) {

        alert(
            validation.message
        );

        return;

    }


    updateInvoicePreview();


    const modal =
        $("invoicePreviewModal");


    if (!modal) return;


    modal.classList.add(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";

}


/* =====================================================
   CLOSE PREVIEW
====================================================== */

function closeInvoicePreview() {

    const modal =
        $("invoicePreviewModal");


    if (!modal) return;


    modal.classList.remove(
        "active"
    );


    modal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";

}


/* =====================================================
   UPDATE PREVIEW
====================================================== */

function updateInvoicePreview() {

    const totals =
        calculateInvoice();


    setText(
        "previewInvoiceNo",
        getValue("invoiceNo") || "—"
    );


    setText(
        "previewInvoiceDate",
        formatDate(
            getValue(
                "invoiceDate"
            )
        )
    );


    setText(
        "previewClient",
        getValue(
            "clientName"
        ) || "—"
    );


    setText(
        "previewBillingAddress",
        getValue(
            "billingAddress"
        ) || "—"
    );


    setText(
        "previewProject",
        getValue(
            "project"
        ) || "—"
    );


    setText(
        "previewTINNo",
        getValue(
            "tinNo"
        ) || "—"
    );


    setText(
        "previewSINo",
        getValue(
            "siNo"
        ) || "—"
    );


    setText(
        "previewSONo",
        getValue(
            "soNo"
        ) || "—"
    );


    setText(
        "previewDRNo",
        getValue(
            "drNo"
        ) || "—"
    );


    setText(
        "previewPONo",
        getValue(
            "poNo"
        ) || "—"
    );


    setText(
        "previewSE",
        getValue(
            "se"
        ) || "—"
    );


    setText(
        "previewTerms",
        formatTerms(
            getValue(
                "terms"
            )
        )
    );


    renderPreviewItems();


    setText(
        "previewTotalSales",
        formatCurrency(
            totals.totalSales
        )
    );


    setText(
        "previewNetVat",
        formatCurrency(
            totals.netOfVat
        )
    );


    setText(
        "previewVAT",
        formatCurrency(
            totals.vat
        )
    );


    setText(
        "previewAmountDue",
        formatCurrency(
            totals.amountDue
        )
    );


    setText(
        "previewEWT",
        formatCurrency(
            totals.ewtAmount
        )
    );


    setText(
        "previewTotal",
        formatCurrency(
            totals.finalAmountDue
        )
    );


    const ewtLabel =
        $("previewEwtLabel");


    const ewtNote =
        $("previewEwtNote");


    if (
        totals.ewtType ===
        "NONE"
    ) {

        if (ewtLabel) {

            ewtLabel.textContent =
                "Less: EWT";

        }


        if (ewtNote) {

            ewtNote.textContent =
                "No EWT deduction.";

        }

    } else {

        if (ewtLabel) {

            ewtLabel.textContent =
                `Less: EWT - ${totals.ewtType}`;

        }


        if (ewtNote) {

            ewtNote.textContent =
                `EWT - ${totals.ewtType}: ${(
                    totals.ewtRate * 100
                ).toFixed(0)}% of Amount Due.`;

        }

    }

}


/* =====================================================
   PREVIEW ITEMS
====================================================== */

function renderPreviewItems() {

    const body =
        $("previewInvoiceItems");


    if (!body) return;


    body.innerHTML = "";


    invoiceItems.forEach(
        item => {

            const total =
                toNumber(
                    item.qtyInvoice
                )
                *
                toNumber(
                    item.unitPrice
                );


            const tr =
                document.createElement("tr");


            tr.innerHTML = `

                <td>
                    ${escapeHtml(
                        item.itemNo || "—"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.description || "—"
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.qtyInvoice
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.unit || "—"
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        item.unitPrice
                    )}
                </td>

                <td>
                    ${formatCurrency(
                        total
                    )}
                </td>

            `;


            body.appendChild(tr);

        }
    );

}


/* =====================================================
   PRINT
====================================================== */

function printInvoice() {

    updateInvoicePreview();


    /*
     * Print only the invoice preview.
     * CSS handles hiding the application UI.
     */

    window.print();

}


/* =====================================================
   LOAD SALES ORDER FROM URL
====================================================== */

function loadSalesOrderFromUrl() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const soNo =
        params.get("so");


    if (!soNo) return;


    setValue(
        "soNo",
        soNo
    );


    const salesOrders =
        getStoredSalesOrders();


    const salesOrder =
        salesOrders.find(
            so =>
                String(
                    getObjectValue(
                        so,
                        [
                            "soNo",
                            "salesOrderNo",
                            "salesOrder",
                            "SO",
                            "soNumber"
                        ]
                    ) || ""
                )
                .trim()
                .toLowerCase()
                ===
                String(soNo)
                    .trim()
                    .toLowerCase()
        );


    if (!salesOrder) {

        console.log(
            "[CREATE INVOICE] SO not found in localStorage:",
            soNo
        );

        return;

    }


    populateFromSalesOrder(
        salesOrder
    );

}


/* =====================================================
   POPULATE SALES ORDER
====================================================== */

function populateFromSalesOrder(
    salesOrder
) {

    const client =
        getObjectValue(
            salesOrder,
            [
                "clientName",
                "client",
                "customerName",
                "customer"
            ]
        );


    const billingAddress =
        getObjectValue(
            salesOrder,
            [
                "billingAddress",
                "billTo",
                "billing"
            ]
        );


    const project =
        getObjectValue(
            salesOrder,
            [
                "project",
                "projectName"
            ]
        );


    const poNo =
        getObjectValue(
            salesOrder,
            [
                "poNo",
                "poNumber",
                "PO",
                "po"
            ]
        );


    const tinNo =
        getObjectValue(
            salesOrder,
            [
                "tinNo",
                "tin",
                "TIN",
                "tinNumber"
            ]
        );


    const terms =
        getObjectValue(
            salesOrder,
            [
                "terms",
                "paymentTerms"
            ]
        );


    const se =
        getObjectValue(
            salesOrder,
            [
                "se",
                "salesEngineer"
            ]
        );


    if (client) {
        setValue(
            "clientName",
            client
        );
    }


    if (billingAddress) {
        setValue(
            "billingAddress",
            billingAddress
        );
    }


    if (project) {
        setValue(
            "project",
            project
        );
    }


    if (poNo) {
        setValue(
            "poNo",
            poNo
        );
    }


    if (tinNo) {
        setValue(
            "tinNo",
            tinNo
        );
    }


    if (terms) {

        setSelectValue(
            "terms",
            terms
        );

    }


    if (se) {

        setSelectValue(
            "se",
            se
        );

    }


    /*
     * Try to load SO items.
     */

    const items =
        getObjectValue(
            salesOrder,
            [
                "items",
                "lineItems",
                "orderItems",
                "products"
            ]
        );


    if (
        Array.isArray(items)
        &&
        items.length
    ) {

        invoiceItems = [];


        items.forEach(
            item => {

                addItem(
                    normalizeSalesOrderItem(
                        item
                    )
                );

            }
        );

    }


    updateCalculations();

}


/* =====================================================
   NORMALIZE SO ITEM
====================================================== */

function normalizeSalesOrderItem(
    item
) {

    return {

        itemNo:
            getObjectValue(
                item,
                [
                    "itemNo",
                    "itemNumber",
                    "number",
                    "code"
                ]
            ) || "",

        description:
            getObjectValue(
                item,
                [
                    "description",
                    "itemDescription",
                    "itemName",
                    "name"
                ]
            ) || "",

        qtyInvoice:
            getObjectValue(
                item,
                [
                    "qtyInvoice",
                    "qty",
                    "quantity",
                    "totalOrder"
                ]
            ) || 0,

        unit:
            getObjectValue(
                item,
                [
                    "unit",
                    "uom"
                ]
            ) || "",

        unitPrice:
            getObjectValue(
                item,
                [
                    "unitPrice",
                    "price",
                    "sellingPrice"
                ]
            ) || 0

    };

}


/* =====================================================
   STORAGE HELPERS
====================================================== */

function getStoredInvoices() {

    try {

        const data =
            localStorage.getItem(
                INVOICE_STORAGE_KEY
            );


        if (!data) {
            return [];
        }


        const parsed =
            JSON.parse(data);


        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "[CREATE INVOICE] Invoice storage error:",
            error
        );

        return [];

    }

}


function getStoredSalesOrders() {

    try {

        const data =
            localStorage.getItem(
                SALES_ORDER_STORAGE_KEY
            );


        if (!data) {
            return [];
        }


        const parsed =
            JSON.parse(data);


        return Array.isArray(parsed)
            ? parsed
            : [];

    } catch (error) {

        console.error(
            "[CREATE INVOICE] SO storage error:",
            error
        );

        return [];

    }

}


/* =====================================================
   VALUE HELPERS
====================================================== */

function getValue(id) {

    const element =
        $(id);


    return element
        ? String(
            element.value || ""
          ).trim()
        : "";

}


function setValue(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.value =
            value ?? "";

    }

}


function setSelectValue(
    id,
    value
) {

    const element =
        $(id);


    if (!element) return;


    const target =
        String(
            value ?? ""
        ).trim();


    const option =
        Array.from(
            element.options
        ).find(
            item =>
                item.value
                    .toLowerCase()
                ===
                target
                    .toLowerCase()
        );


    if (option) {

        element.value =
            option.value;

    }

}


function setText(
    id,
    value
) {

    const element =
        $(id);


    if (element) {

        element.textContent =
            value ?? "";

    }

}


function getObjectValue(
    object,
    keys
) {

    if (!object) return "";


    for (
        const key of keys
    ) {

        if (
            Object.prototype.hasOwnProperty.call(
                object,
                key
            )
            &&
            object[key] !== null
            &&
            object[key] !== undefined
            &&
            object[key] !== ""
        ) {

            return object[key];

        }

    }


    return "";

}


/* =====================================================
   NUMBER
====================================================== */

function toNumber(value) {

    if (
        typeof value ===
        "number"
    ) {

        return Number.isFinite(
            value
        )
            ? value
            : 0;

    }


    const cleaned =
        String(
            value ?? ""
        )
            .replace(
                /₱/g,
                ""
            )
            .replace(
                /,/g,
                ""
            )
            .trim();


    const number =
        Number(
            cleaned
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


/* =====================================================
   FORMAT CURRENCY
====================================================== */

function formatCurrency(
    value
) {

    const number =
        toNumber(
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
    ).format(number);

}


/* =====================================================
   FORMAT NUMBER
====================================================== */

function formatNumber(
    value
) {

    const number =
        toNumber(
            value
        );


    return new Intl.NumberFormat(
        "en-PH",
        {
            minimumFractionDigits:
                Number.isInteger(number)
                    ? 0
                    : 2,

            maximumFractionDigits:
                2
        }
    ).format(number);

}


/* =====================================================
   FORMAT DATE
====================================================== */

function formatDate(
    value
) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "long",
            day: "numeric"
        }
    );

}


/* =====================================================
   FORMAT TERMS
====================================================== */

function formatTerms(
    value
) {

    if (!value) {
        return "—";
    }


    if (
        String(value)
            .toUpperCase()
        === "COD"
    ) {

        return "COD";

    }


    return `${value} Days`;

}


/* =====================================================
   HTML ESCAPE
====================================================== */

function escapeHtml(
    value
) {

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


function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}


/* =====================================================
   BACK
====================================================== */

function goBackToInvoicing() {

    window.location.href =
        "invoicing.html";

}


/* =====================================================
   GLOBAL FUNCTIONS
====================================================== */

window.openInvoicePreview =
    openInvoicePreview;

window.closeInvoicePreview =
    closeInvoicePreview;

window.calculateInvoice =
    calculateInvoice;

window.saveInvoice =
    saveInvoice;
 

})();
