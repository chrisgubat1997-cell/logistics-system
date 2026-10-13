
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
   GOOGLE APPS SCRIPT API
====================================================== */

const INVOICE_API_URL =
    "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

async function invoiceAPI(action, data = {}) {
    const response = await fetch(INVOICE_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
            action: action,
            data: data
        })
    });

    const responseText = await response.text();
    let result;

    try {
        result = JSON.parse(responseText);
    } catch (error) {
        console.error("[CREATE INVOICE] Invalid API response:", responseText);
        throw new Error("Invalid server response. Please try again.");
    }

    if (!response.ok) {
        throw new Error("Invoice API request failed (HTTP " + response.status + ").");
    }

    if (!result || result.success === false) {
        throw new Error(
            result && (result.message || result.error)
                ? (result.message || result.error)
                : "Unable to save invoice to the database."
        );
    }

    return result;
}


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

let salesOrderRecords = [];
let deliveryReceiptRecords = [];
let invoiceHistoryRecords = [];
let selectedDeliveryReceipts = [];
let salesOrderBaseItems = [];
let salesOrderSuggestionIndex = -1;
let deliverySuggestionIndex = -1;
let selectedInvoiceType = "DELIVERY_RECEIPT";


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


async function initializeCreateInvoice() {

    console.log(
        "[CREATE INVOICE] Initializing..."
    );

    setDefaultInvoiceDate();
    bindEvents();
    addItem();
    updateCalculations();

    await syncInvoiceNumberFromDatabase();

    await Promise.all([
        loadSalesOrdersFromDatabase(),
        loadDeliveryReceiptsFromDatabase(),
        loadInvoiceHistoryFromDatabase()
    ]);
    bindSalesOrderPicker();
    bindDeliveryReceiptPicker();
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
       SALES ORDER SUGGESTIONS
    --------------------------------------------- */

    bindSalesOrderPicker();


    /* ---------------------------------------------
       ADD ITEM
    --------------------------------------------- */

    $("addItemBtn")?.addEventListener(
        "click",
        () => {
            const itemName = selectedInvoiceType === "FULL_PAYMENT"
                ? "Full Payment"
                : selectedInvoiceType === "DOWN_PAYMENT"
                    ? "Down payment"
                    : "";
            addItem({ isManual: true, itemName, qtyInvoice: 1, checked: true });
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
   SYNC NEXT INVOICE NUMBER FROM DATABASE
====================================================== */

async function syncInvoiceNumberFromDatabase() {
    const input = $("invoiceNo");
    if (!input) return;

    try {
        const result = await invoiceAPI("getInvoices");
        const serverRecords = Array.isArray(result.invoices)
            ? result.invoices
            : (Array.isArray(result.records) ? result.records : []);

        /*
         * Include browser-cached invoice numbers so legacy local
         * records are not accidentally reused. The server remains
         * the source of truth for saving.
         */
        const allRecords = serverRecords.concat(getStoredInvoices());
        const year = new Date().getFullYear();
        let highest = 0;

        allRecords.forEach(invoice => {
            const number = String(
                invoice.INVOICE_NO ||
                invoice.invoiceNo ||
                ""
            );
            const match = number.match(/INV-\d{4}-(\d+)/);
            if (match) highest = Math.max(highest, Number(match[1]));
        });

        input.value = `INV-${year}-${String(highest + 1).padStart(4, "0")}`;
    } catch (error) {
        console.warn(
            "[CREATE INVOICE] Could not retrieve invoice numbers from database; using cached records.",
            error
        );
        generateInvoiceNumber();
    }
}


/* =====================================================
   ADD ITEM
====================================================== */

function addItem(data = {}) {
    const defaultLabel = selectedInvoiceType === "FULL_PAYMENT"
        ? "Full Payment"
        : selectedInvoiceType === "DOWN_PAYMENT"
            ? "Down payment"
            : "";

    const item = {
        id: Date.now() + Math.random(),
        itemNo: String(data.itemNo || ""),
        itemName: String(data.itemName || data.ITEM_NAME || data.description || defaultLabel || ""),
        description: String(data.itemName || data.ITEM_NAME || data.description || defaultLabel || ""),
        soQty: toNumber(data.soQty ?? data.qtySO ?? data.qty ?? 0),
        invoicedQty: toNumber(data.invoicedQty ?? 0),
        balance: toNumber(data.balance ?? data.soQty ?? data.qty ?? 0),
        qtyInvoice: toNumber(data.pickQty ?? data.qtyInvoice ?? data.quantity ?? 0),
        unit: String(data.unit || data.uom || ""),
        unitPrice: toNumber(data.unitAmount ?? data.unitPrice ?? data.price ?? 0),
        remarks: String(data.remarks || ""),
        checked: data.checked !== false,
        sourceDRNo: data.sourceDRNo || "",
        sourceDRNumbers: data.sourceDRNumbers || [],
        sourceItemNo: String(data.sourceItemNo || data.itemNo || ""),
        sourceSONo: data.sourceSONo || "",
        isManual: Boolean(data.isManual)
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
    const body = $("invoiceItemsBody");
    const empty = $("emptyItemsMessage");
    if (!body) return;

    body.innerHTML = "";
    if (!invoiceItems.length) {
        if (empty) empty.style.display = "flex";
        return;
    }
    if (empty) empty.style.display = "none";

    invoiceItems.forEach(item => {
        const invoiceAmount = toNumber(item.qtyInvoice) * toNumber(item.unitPrice);
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="check-col"><input type="checkbox" class="item-check" data-field="checked" data-id="${item.id}" ${item.checked ? "checked" : ""} aria-label="Include item"></td>
            <td><input type="text" class="item-input" data-field="itemNo" data-id="${item.id}" value="${escapeAttribute(item.itemNo)}" placeholder="—" ${item.sourceSONo || item.sourceDRNo ? "readonly" : ""}></td>
            <td><input type="text" class="item-input" data-field="itemName" data-id="${item.id}" value="${escapeAttribute(item.itemName || item.description)}" placeholder="Item name" ${!item.isManual ? "readonly" : ""}></td>
            <td><span class="item-metric">${formatNumber(item.soQty)}</span></td>
            <td><span class="item-metric">${formatNumber(item.invoicedQty)}</span></td>
            <td><span class="item-metric">${formatNumber(item.balance)}</span></td>
            <td><span class="item-metric money">${formatCurrency(item.unitPrice)}</span></td>
            <td><span class="item-total" data-total-id="${item.id}">${formatCurrency(invoiceAmount)}</span></td>
            <td><input type="number" class="item-input number" data-field="qtyInvoice" data-id="${item.id}" value="${item.qtyInvoice || ""}" min="0" max="${item.balance || undefined}" step="any" placeholder="Pick qty"></td>
            <td><input type="text" class="item-input" data-field="remarks" data-id="${item.id}" value="${escapeAttribute(item.remarks || "")}" placeholder="Remarks"></td>
            <td><button type="button" class="remove-item-btn" data-remove-id="${item.id}" title="Remove item">×</button></td>
        `;
        body.appendChild(tr);
    });
    bindItemEvents();
}

/* =====================================================
   ITEM EVENTS
====================================================== */

function bindItemEvents() {

    document
        .querySelectorAll(".item-input")
        .forEach(input => {
            input.addEventListener("input", handleItemInput);
        });

    document
        .querySelectorAll(".item-check")
        .forEach(input => {
            input.addEventListener("change", handleItemInput);
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


    if (field === "checked") {
        item.checked = input.checked;
    } else if (field === "qtyInvoice" || field === "unitPrice") {
        item[field] = toNumber(input.value);
    } else {
        item[field] = input.value;
        if (field === "itemName") item.description = input.value;
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
                if (item.checked === false) return sum;
                return sum + (toNumber(item.qtyInvoice) * toNumber(item.unitPrice));
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

        invoiceType:
            selectedInvoiceType,

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
            invoiceItems.filter(item => item.checked !== false).map(item => ({
                itemNo: item.itemNo,
                itemName: item.itemName || item.description,
                description: item.itemName || item.description,
                soQty: toNumber(item.soQty),
                invoicedQty: toNumber(item.invoicedQty),
                balance: toNumber(item.balance),
                qtyInvoice: toNumber(item.qtyInvoice),
                pickQty: toNumber(item.qtyInvoice),
                unit: item.unit,
                unitAmount: toNumber(item.unitPrice),
                unitPrice: toNumber(item.unitPrice),
                remarks: item.remarks || "",
                totalAmount: toNumber(item.qtyInvoice) * toNumber(item.unitPrice)
            })),

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

async function saveInvoice() {

    if (isSaving) return;

    const validation = validateInvoice();

    if (!validation.valid) {
        alert(validation.message);
        return;
    }

    const invoice = collectInvoiceData();

    isSaving = true;
    let savedSuccessfully = false;

    const saveButtons = document.querySelectorAll(
        "#saveInvoiceBtn, #bottomSaveBtn"
    );
    saveButtons.forEach(button => {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.textContent = "Saving...";
    });

    try {
        /*
         * Save to Google Sheets through Apps Script.
         * Do not treat browser LocalStorage as the primary database.
         */
        const result = await invoiceAPI("createInvoice", invoice);
        const saved = result.invoice || {};

        const savedInvoice = Object.assign({}, invoice, {
            invoiceId: saved.INVOICE_ID || saved.invoiceId || "",
            invoiceNo: saved.INVOICE_NO || saved.invoiceNo || invoice.invoiceNo,
            invoiceDate: saved.INVOICE_DATE || saved.invoiceDate || invoice.invoiceDate,
            soNo: saved.SO_NUMBER || saved.soNo || invoice.soNo,
            drNo: saved.DR_NUMBER || saved.drNo || invoice.drNo,
            status: saved.STATUS || saved.status || invoice.status,
            createdAt: saved.CREATED_AT || saved.createdAt || invoice.createdAt,
            updatedAt: saved.UPDATED_AT || saved.updatedAt || new Date().toISOString()
        });

        /*
         * Keep a local cache for compatibility with older UI pieces.
         * The database save above must succeed first.
         */
        const invoices = getStoredInvoices();
        const existingIndex = invoices.findIndex(item =>
            String(item.invoiceNo || item.INVOICE_NO || "") ===
            String(savedInvoice.invoiceNo || "")
        );

        if (existingIndex >= 0) {
            invoices[existingIndex] = savedInvoice;
        } else {
            invoices.unshift(savedInvoice);
        }

        try {
            localStorage.setItem(
                INVOICE_STORAGE_KEY,
                JSON.stringify(invoices)
            );
        } catch (cacheError) {
            console.warn("[CREATE INVOICE] Database save succeeded, but local cache could not be updated.", cacheError);
        }

        currentInvoice = savedInvoice;
        savedSuccessfully = true;

        alert(
            result.message ||
            "Invoice saved to the LOGIS-TECH database."
        );

    } catch (error) {
        console.error("[CREATE INVOICE] Database save error:", error);
        alert(
            "Invoice was NOT confirmed saved.\n\n" +
            (error.message || "Please check your connection and try again.")
        );
    } finally {
        isSaving = false;
        saveButtons.forEach(button => {
            button.disabled = false;
            if (button.dataset.originalText) {
                button.textContent = button.dataset.originalText;
                delete button.dataset.originalText;
            }
        });
        if (savedSuccessfully) {
            showSavedState();
        }
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


    const soNumber = getValue("soNo");
    const drNumber = getValue("drNo");

    if (!soNumber) {
        return {
            valid: false,
            message: "Please select or enter the Sales Order Number."
        };
    }

    if (!drNumber) {
        return {
            valid: false,
            message: "Please select a Delivery Receipt or an invoice type."
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

async function invoiceGetRecords(action, keys, params = {}) {
    const query = new URLSearchParams({ action, ...params, _: String(Date.now()) });
    const url = INVOICE_API_URL + "?" + query.toString();
    const response = await fetch(url, { method: "GET", cache: "no-store", redirect: "follow" });
    if (!response.ok) throw new Error(action + " failed. HTTP " + response.status);
    const result = await response.json();
    if (!result || result.success === false) {
        throw new Error(result && (result.message || result.error) || action + " failed.");
    }
    for (const key of keys) {
        if (Array.isArray(result[key])) return result[key];
    }
    return [];
}

async function loadSalesOrdersFromDatabase() {
    const input = $("soNo");
    if (input) input.placeholder = "Search or select Sales Order No.";
    try {
        salesOrderRecords = (await invoiceGetRecords("getSalesOrders", ["salesOrders", "records", "data"]))
            .filter(so => String(getObjectValue(so, ["STATUS", "status"]) || "").trim().toUpperCase() !== "CANCELLED");
        console.log("[CREATE INVOICE] Sales Orders loaded from database:", salesOrderRecords.length);
    } catch (error) {
        console.error("[CREATE INVOICE] Failed to load Sales Orders from database:", error);
        salesOrderRecords = getStoredSalesOrders();
    }
    if (input && input.value.trim()) renderSalesOrderSuggestions(input.value);
}

async function loadDeliveryReceiptsFromDatabase() {
    try {
        deliveryReceiptRecords = await invoiceGetRecords("getDeliveryReceipts", ["deliveryReceipts", "records", "data"]);
        console.log("[CREATE INVOICE] Delivery Receipts loaded from database:", deliveryReceiptRecords.length);
    } catch (error) {
        console.error("[CREATE INVOICE] Failed to load Delivery Receipts from database:", error);
        deliveryReceiptRecords = [];
    }
}

async function loadInvoiceHistoryFromDatabase() {
    try {
        invoiceHistoryRecords = await invoiceGetRecords("getInvoices", ["invoices", "records", "data"]);
        console.log("[CREATE INVOICE] Invoice history loaded from database:", invoiceHistoryRecords.length);
    } catch (error) {
        console.warn("[CREATE INVOICE] Could not load invoice history for invoiced quantities:", error);
        invoiceHistoryRecords = [];
    }
}

function getPreviouslyInvoicedQty(soNumber, itemNo) {
    const targetSO = String(soNumber || "").trim().toLowerCase();
    const targetItem = String(itemNo || "").trim().toLowerCase();
    if (!targetSO || !targetItem) return 0;

    return invoiceHistoryRecords.reduce((sum, invoice) => {
        const status = String(getObjectValue(invoice, ["STATUS", "status"]) || "").trim().toUpperCase();
        if (status === "CANCELLED" || status === "VOID") return sum;

        const invoiceSO = String(getObjectValue(invoice, ["SO_NUMBER", "soNumber", "soNo", "salesOrderNo"]) || "").trim().toLowerCase();
        if (invoiceSO !== targetSO) return sum;

        const items = getObjectValue(invoice, ["ITEMS", "items", "INVOICE_ITEMS", "invoiceItems", "lineItems"]);
        if (!Array.isArray(items)) return sum;

        const itemQty = items.reduce((itemSum, row) => {
            const rowNo = String(getObjectValue(row, ["ITEM_NO", "ITEM_NUMBER", "itemNo", "itemNumber"]) || "").trim().toLowerCase();
            if (rowNo !== targetItem) return itemSum;
            return itemSum + toNumber(getObjectValue(row, ["QTY_INVOICE", "qtyInvoice", "PICK_QTY", "pickQty", "QTY", "qty"]));
        }, 0);
        return sum + itemQty;
    }, 0);
}


function bindSalesOrderPicker() {
    const input = $("soNo");
    if (!input || input.dataset.suggestionBound === "true") return;
    input.dataset.suggestionBound = "true";
    input.setAttribute("autocomplete", "off");

    input.addEventListener("input", () => {
        salesOrderSuggestionIndex = -1;
        renderSalesOrderSuggestions(input.value);
    });

    input.addEventListener("focus", () => {
        renderSalesOrderSuggestions(input.value);
    });

    input.addEventListener("keydown", event => {
        const box = $("soSuggestions");
        const options = box ? Array.from(box.querySelectorAll("[data-so-index]")) : [];
        if (!options.length) {
            if (event.key === "ArrowDown") renderSalesOrderSuggestions(input.value);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            salesOrderSuggestionIndex = Math.min(salesOrderSuggestionIndex + 1, options.length - 1);
            updateSalesOrderSuggestionFocus(options);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            salesOrderSuggestionIndex = Math.max(salesOrderSuggestionIndex - 1, 0);
            updateSalesOrderSuggestionFocus(options);
        } else if (event.key === "Enter" && salesOrderSuggestionIndex >= 0) {
            event.preventDefault();
            options[salesOrderSuggestionIndex].click();
        } else if (event.key === "Escape") {
            hideSalesOrderSuggestions();
        }
    });

    document.addEventListener("click", event => {
        const wrapper = $("soPickerWrap");
        if (wrapper && !wrapper.contains(event.target)) hideSalesOrderSuggestions();
    });
}

function bindDeliveryReceiptPicker() {
    const input = $("drNo");
    if (!input || input.dataset.suggestionBound === "true") return;
    input.dataset.suggestionBound = "true";
    input.setAttribute("autocomplete", "off");
    input.readOnly = true;
    input.placeholder = "Select Sales Order first";

    input.addEventListener("focus", () => renderDeliveryReceiptSuggestions(input.value));
    input.addEventListener("click", () => renderDeliveryReceiptSuggestions(input.value));
    input.addEventListener("keydown", event => {
        const box = $("drSuggestions");
        const options = box ? Array.from(box.querySelectorAll("[data-dr-index]")) : [];
        if (!options.length) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            deliverySuggestionIndex = Math.min(deliverySuggestionIndex + 1, options.length - 1);
            updateDeliveryReceiptSuggestionFocus(options);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            deliverySuggestionIndex = Math.max(deliverySuggestionIndex - 1, 0);
            updateDeliveryReceiptSuggestionFocus(options);
        } else if (event.key === "Enter" && deliverySuggestionIndex >= 0) {
            event.preventDefault();
            options[deliverySuggestionIndex].click();
        } else if (event.key === "Escape") hideDeliveryReceiptSuggestions();
    });
    document.addEventListener("click", event => {
        const wrapper = $("drPickerWrap");
        if (wrapper && !wrapper.contains(event.target)) hideDeliveryReceiptSuggestions();
    });
}

function updateDeliveryReceiptSuggestionFocus(options) {
    options.forEach((option, index) => {
        option.classList.toggle("is-active", index === deliverySuggestionIndex);
        if (index === deliverySuggestionIndex) option.scrollIntoView({ block: "nearest" });
    });
}

function hideDeliveryReceiptSuggestions() {
    const box = $("drSuggestions");
    if (box) {
        box.hidden = true;
        box.innerHTML = "";
    }
}

function renderDeliveryReceiptSuggestions() {
    const box = $("drSuggestions");
    const input = $("drNo");
    if (!box || !input) return;
    const soNumber = getValue("soNo").trim().toLowerCase();
    box.innerHTML = "";
    deliverySuggestionIndex = -1;

    if (!soNumber) {
        const empty = document.createElement("div");
        empty.className = "so-suggestion-empty";
        empty.textContent = "Select a Sales Order first.";
        box.appendChild(empty);
        box.hidden = false;
        return;
    }

    const results = deliveryReceiptRecords.filter(dr => {
        const linkedSO = String(getObjectValue(dr, ["SO_NUMBER", "soNumber", "soNo", "salesOrderNo", "salesOrderNumber"]) || "").trim().toLowerCase();
        const drNo = String(getObjectValue(dr, ["DR_NUMBER", "drNumber", "drNo", "deliveryReceiptNo", "deliveryReceiptNumber"]) || "").trim();
        const status = String(getObjectValue(dr, ["STATUS", "status"]) || "").trim().toUpperCase();
        return linkedSO === soNumber && drNo && status !== "CANCELLED";
    });

    if (!results.length) {
        const empty = document.createElement("div");
        empty.className = "so-suggestion-empty";
        empty.textContent = "No active DR found for this Sales Order. You can still choose an invoice type below.";
        box.appendChild(empty);
    }

    results.forEach(dr => {
        const number = getDRPickerNumber(dr);
        const alreadySelected = selectedDeliveryReceipts.some(selected => getDRPickerNumber(selected).toLowerCase() === number.toLowerCase());
        const date = getObjectValue(dr, ["DATE_DELIVERED", "DATE_OF_TRANSFER", "DR_DATE", "drDate", "date"]) || "";
        const status = getObjectValue(dr, ["STATUS", "status"]) || "—";
        const option = document.createElement("button");
        option.type = "button";
        option.className = "so-suggestion-option" + (alreadySelected ? " is-active" : "");
        option.dataset.drIndex = String(box.querySelectorAll("[data-dr-index]").length);
        const primary = document.createElement("strong");
        primary.textContent = (alreadySelected ? "✓ " : "") + number;
        const secondary = document.createElement("span");
        secondary.textContent = (date ? String(date) + " · " : "") + "Sales Order " + getValue("soNo");
        const badge = document.createElement("small");
        badge.textContent = alreadySelected ? "SELECTED" : String(status);
        option.append(primary, secondary, badge);
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => {
            selectedInvoiceType = "DELIVERY_RECEIPT";
            if (alreadySelected) {
                selectedDeliveryReceipts = selectedDeliveryReceipts.filter(selected => getDRPickerNumber(selected).toLowerCase() !== number.toLowerCase());
            } else {
                selectedDeliveryReceipts.push(dr);
            }
            syncSelectedDeliveryReceipts();
            renderDeliveryReceiptSuggestions();
        });
        box.appendChild(option);
    });

    const divider = document.createElement("div");
    divider.className = "so-suggestion-section-label";
    divider.textContent = "OTHER INVOICE TYPES";
    box.appendChild(divider);

    [
        { value: "DOWN_PAYMENT", label: "Down Payment Invoice", detail: "Invoice for the down payment" },
        { value: "FULL_PAYMENT", label: "Full Payment Invoice", detail: "Invoice for the full payment" },
        { value: "ADVANCE", label: "Advance Invoice", detail: "Invoice issued in advance" }
    ].forEach(type => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "so-suggestion-option invoice-type-option";
        option.dataset.invoiceType = type.value;
        const primary = document.createElement("strong");
        primary.textContent = type.label;
        const secondary = document.createElement("span");
        secondary.textContent = type.detail;
        option.append(primary, secondary);
        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => {
            selectedInvoiceType = type.value;
            setValue("drNo", type.label);
            selectedDeliveryReceipts = [];
            renderSelectedDeliveryReceiptChips();
            if (type.value === "DOWN_PAYMENT" || type.value === "FULL_PAYMENT") {
                invoiceItems = [];
                renderItems();
                updateCalculations();
            } else {
                rebuildInvoiceItemsFromSelectedDRs();
            }
            hideDeliveryReceiptSuggestions();
        });
        box.appendChild(option);
    });

    box.hidden = false;
}

function getDRPickerNumber(dr) {
    return String(getObjectValue(dr, ["DR_NUMBER", "drNumber", "drNo", "deliveryReceiptNo", "deliveryReceiptNumber"]) || "").trim();
}

function syncSelectedDeliveryReceipts() {
    const input = $("drNo");
    if (selectedDeliveryReceipts.length) {
        selectedInvoiceType = "DELIVERY_RECEIPT";
        if (input) input.value = selectedDeliveryReceipts.map(getDRPickerNumber).join(", ");
    } else if (input && selectedInvoiceType === "DELIVERY_RECEIPT") {
        input.value = "";
    }
    renderSelectedDeliveryReceiptChips();
    rebuildInvoiceItemsFromSelectedDRs();
}

function renderSelectedDeliveryReceiptChips() {
    const wrapper = $("drPickerWrap");
    if (!wrapper) return;
    let list = $("selectedDrList");
    if (!list) {
        list = document.createElement("div");
        list.id = "selectedDrList";
        list.className = "selected-dr-list";
        const suggestions = $("drSuggestions");
        wrapper.insertBefore(list, suggestions || null);
    }
    list.innerHTML = "";
    selectedDeliveryReceipts.forEach(dr => {
        const number = getDRPickerNumber(dr);
        const chip = document.createElement("span");
        chip.className = "selected-dr-chip";
        const label = document.createElement("span");
        label.textContent = number;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "selected-dr-remove";
        remove.textContent = "×";
        remove.title = "Remove " + number;
        remove.setAttribute("aria-label", "Remove DR " + number);
        remove.addEventListener("click", () => {
            selectedDeliveryReceipts = selectedDeliveryReceipts.filter(selected => getDRPickerNumber(selected).toLowerCase() !== number.toLowerCase());
            syncSelectedDeliveryReceipts();
            if ($("drSuggestions") && !$("drSuggestions").hidden) renderDeliveryReceiptSuggestions();
        });
        chip.append(label, remove);
        list.appendChild(chip);
    });
    list.hidden = selectedDeliveryReceipts.length === 0;
}

function rebuildInvoiceItemsFromSelectedDRs() {
    if (selectedInvoiceType === "DOWN_PAYMENT" || selectedInvoiceType === "FULL_PAYMENT") {
        invoiceItems = invoiceItems.filter(item => item.isManual);
        renderItems();
        updateCalculations();
        return;
    }

    const manualItems = invoiceItems.filter(item => item.isManual && !item.sourceDRNo);
    const groupedItems = new Map();
    const soNumber = getValue("soNo");

    if (selectedDeliveryReceipts.length) {
        selectedDeliveryReceipts.forEach(dr => {
            const drNo = getDRPickerNumber(dr);
            const items = getObjectValue(dr, ["ITEMS", "items", "DR_ITEMS", "drItems", "lineItems"]);
            if (!Array.isArray(items)) return;

            items.forEach(rawItem => {
                const normalized = normalizeSalesOrderItem(rawItem);
                const sourceItemNo = String(normalized.itemNo || "").trim();
                const soItem = salesOrderBaseItems.find(item =>
                    String(item.itemNo || "").trim().toLowerCase() === sourceItemNo.toLowerCase()
                );
                const itemName = String((soItem && soItem.itemName) || normalized.itemName || normalized.description || "").trim();
                const unit = String((soItem && soItem.unit) || normalized.unit || "").trim();
                const unitPrice = toNumber((soItem && soItem.unitPrice) || normalized.unitPrice);
                const qty = toNumber(normalized.qtyInvoice);
                const key = sourceItemNo ? "ITEM:" + sourceItemNo.toLowerCase() : "DETAIL:" + [itemName.toLowerCase(), unit.toLowerCase(), unitPrice].join("|");

                if (!groupedItems.has(key)) {
                    const soQty = soItem ? toNumber(soItem.soQty) : getSOItemQty(sourceItemNo);
                    const invoicedQty = getPreviouslyInvoicedQty(soNumber, sourceItemNo);
                    groupedItems.set(key, {
                        id: Date.now() + Math.random(),
                        itemNo: sourceItemNo,
                        itemName,
                        description: itemName,
                        soQty,
                        invoicedQty,
                        balance: Math.max(0, soQty - invoicedQty),
                        qtyInvoice: 0,
                        unit,
                        unitPrice,
                        remarks: "",
                        checked: true,
                        sourceDRNo: drNo,
                        sourceDRNumbers: [],
                        sourceItemNo,
                        sourceSONo: soNumber,
                        isManual: false
                    });
                }
                const row = groupedItems.get(key);
                row.qtyInvoice += qty;
                if (!row.itemName && itemName) {
                    row.itemName = itemName;
                    row.description = itemName;
                }
                if (!row.unit && unit) row.unit = unit;
                if (!row.unitPrice && unitPrice) row.unitPrice = unitPrice;
                if (!row.sourceDRNumbers.includes(drNo)) row.sourceDRNumbers.push(drNo);
            });
        });

        invoiceItems = Array.from(groupedItems.values()).sort((a, b) =>
            a.itemNo.localeCompare(b.itemNo, undefined, { numeric: true, sensitivity: "base" })
        ).concat(manualItems);
    } else {
        invoiceItems = salesOrderBaseItems.map(item => {
            const soQty = toNumber(item.soQty);
            const invoicedQty = getPreviouslyInvoicedQty(soNumber, item.itemNo);
            const balance = Math.max(0, soQty - invoicedQty);
            return {
                ...item,
                id: Date.now() + Math.random(),
                invoicedQty,
                balance,
                qtyInvoice: selectedInvoiceType === "ADVANCE" ? balance : 0,
                checked: true,
                sourceSONo: soNumber,
                sourceDRNo: ""
            };
        }).concat(manualItems);
    }

    renderItems();
    updateCalculations();
    if (selectedDeliveryReceipts.length && !invoiceItems.some(item => item.sourceDRNo)) {
        console.warn("[CREATE INVOICE] Selected DR records have no embedded item details in the API response.");
    }
}

function getSOItemQty(itemNo) {
    const target = String(itemNo || "").trim().toLowerCase();
    const match = salesOrderBaseItems.find(item => String(item.itemNo || "").trim().toLowerCase() === target);
    return match ? toNumber(match.soQty) : 0;
}

function populateFromDeliveryReceipt(dr) {
    if (!selectedDeliveryReceipts.some(selected => getDRPickerNumber(selected) === getDRPickerNumber(dr))) {
        selectedDeliveryReceipts.push(dr);
    }
    syncSelectedDeliveryReceipts();
}

function updateSalesOrderSuggestionFocus(options) {
    options.forEach((option, index) => {
        option.classList.toggle("is-active", index === salesOrderSuggestionIndex);
        if (index === salesOrderSuggestionIndex) option.scrollIntoView({ block: "nearest" });
    });
}

function hideSalesOrderSuggestions() {
    const box = $("soSuggestions");
    if (box) {
        box.hidden = true;
        box.innerHTML = "";
    }
}

function renderSalesOrderSuggestions(query) {
    const box = $("soSuggestions");
    if (!box) return;

    const normalizedQuery = String(query || "").trim().toLowerCase();
    const results = salesOrderRecords.filter(so => {
        const number = String(getObjectValue(so, ["SO_NUMBER", "soNumber", "soNo", "salesOrderNo", "salesOrder", "SO"]) || "");
        const client = String(getObjectValue(so, ["CLIENT_NAME", "clientName", "client", "customerName"]) || "");
        const project = String(getObjectValue(so, ["PROJECT", "project", "projectName"]) || "");
        return !normalizedQuery || (number + " " + client + " " + project).toLowerCase().includes(normalizedQuery);
    }).slice(0, 10);

    box.innerHTML = "";
    salesOrderSuggestionIndex = -1;

    if (!results.length) {
        if (normalizedQuery) {
            const empty = document.createElement("div");
            empty.className = "so-suggestion-empty";
            empty.textContent = salesOrderRecords.length
                ? "No matching Sales Order found."
                : "No Sales Orders loaded. Check the database connection.";
            box.appendChild(empty);
            box.hidden = false;
        } else {
            box.hidden = true;
        }
        return;
    }

    results.forEach((so, index) => {
        const number = getObjectValue(so, ["SO_NUMBER", "soNumber", "soNo", "salesOrderNo", "salesOrder", "SO"]) || "—";
        const client = getObjectValue(so, ["CLIENT_NAME", "clientName", "client", "customerName"]) || "Client not specified";
        const project = getObjectValue(so, ["PROJECT", "project", "projectName"]) || "Project not specified";
        const status = getObjectValue(so, ["STATUS", "status"]) || "—";
        const option = document.createElement("button");
        option.type = "button";
        option.className = "so-suggestion-option";
        option.dataset.soIndex = String(index);
        option.innerHTML = "";

        const primary = document.createElement("strong");
        primary.textContent = String(number);
        const secondary = document.createElement("span");
        secondary.textContent = String(client) + " · " + String(project);
        const badge = document.createElement("small");
        badge.textContent = String(status);
        option.append(primary, secondary, badge);

        option.addEventListener("mousedown", event => event.preventDefault());
        option.addEventListener("click", () => {
            inputSetSalesOrder(String(number), so);
        });
        box.appendChild(option);
    });

    box.hidden = false;

    function inputSetSalesOrder(number, salesOrder) {
        selectedInvoiceType = "DELIVERY_RECEIPT";
        selectedDeliveryReceipts = [];
        setValue("soNo", number);
        setValue("drNo", "");
        renderSelectedDeliveryReceiptChips();
        rebuildInvoiceItemsFromSelectedDRs();
        const drInput = $("drNo");
        if (drInput) {
            drInput.readOnly = false;
            drInput.placeholder = "Select Delivery Receipt";
        }
        hideSalesOrderSuggestions();
        hideDeliveryReceiptSuggestions();
        populateFromSalesOrder(salesOrder);
    }
}

function loadSalesOrderFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const soNo = params.get("so");
    if (!soNo) return;

    selectedDeliveryReceipts = [];
    setValue("soNo", soNo);
    setValue("drNo", "");
    renderSelectedDeliveryReceiptChips();
    rebuildInvoiceItemsFromSelectedDRs();
    const drInput = $("drNo");
    if (drInput) {
        drInput.readOnly = false;
        drInput.placeholder = "Select Delivery Receipt";
    }
    const salesOrder = findSalesOrderByNumber(soNo);
    if (salesOrder) {
        populateFromSalesOrder(salesOrder);
        return;
    }

    // The URL may be opened before the API has returned or the SO may
    // not be in the browser cache. Refresh once from the database.
    loadSalesOrdersFromDatabase().then(() => {
        const found = findSalesOrderByNumber(soNo);
        if (found) populateFromSalesOrder(found);
    });
}

function findSalesOrderByNumber(soNo) {
    const target = String(soNo || "").trim().toLowerCase();
    return salesOrderRecords.find(so =>
        String(getObjectValue(so, ["SO_NUMBER", "soNumber", "soNo", "salesOrderNo", "salesOrder", "SO"]) || "")
            .trim().toLowerCase() === target
    ) || getStoredSalesOrders().find(so =>
        String(getObjectValue(so, ["SO_NUMBER", "soNumber", "soNo", "salesOrderNo", "salesOrder", "SO"]) || "")
            .trim().toLowerCase() === target
    );
}


/* =====================================================
   POPULATE SALES ORDER
====================================================== */

async function populateFromSalesOrder(
    salesOrder
) {

    const client =
        getObjectValue(
            salesOrder,
            [
                "CLIENT_NAME",
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
                "BILLING_ADDRESS",
                "billingAddress",
                "billTo",
                "billing"
            ]
        );


    const project =
        getObjectValue(
            salesOrder,
            [
                "PROJECT",
                "project",
                "projectName"
            ]
        );


    const poNo =
        getObjectValue(
            salesOrder,
            [
                "PO_NUMBER",
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
                "TIN",
                "tinNo",
                "tin",
                "tinNumber"
            ]
        );


    const terms =
        getObjectValue(
            salesOrder,
            [
                "TERMS",
                "PAYMENT_TERMS",
                "terms",
                "paymentTerms"
            ]
        );


    const se =
        getObjectValue(
            salesOrder,
            [
                "SALES_ENGINEER",
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
     * Load the original SO line items. The list endpoint may return
     * headers only, so fall back to the dedicated SO_ITEMS endpoint.
     */
    let items = getObjectValue(salesOrder, ["ITEMS", "items", "SO_ITEMS", "soItems", "lineItems", "orderItems", "products"]);
    invoiceItems = [];
    salesOrderBaseItems = [];

    if (!Array.isArray(items) || !items.length) {
        // Legacy browser cache may contain the original SO line items.
        const cachedSO = getStoredSalesOrders().find(row =>
            String(getObjectValue(row, ["SO_NUMBER", "soNumber", "soNo", "salesOrderNo", "SO"]) || "").trim().toLowerCase()
            === getValue("soNo").trim().toLowerCase()
        );
        const cachedItems = getObjectValue(cachedSO, ["ITEMS", "items", "SO_ITEMS", "soItems", "lineItems", "orderItems", "products"]);
        if (Array.isArray(cachedItems) && cachedItems.length) items = cachedItems;
    }

    if (!Array.isArray(items) || !items.length) {
        try {
            items = await invoiceGetRecords("getSalesOrderItems", ["items", "salesOrderItems", "records", "data"], {
                soNumber: getValue("soNo")
            });
        } catch (error) {
            console.error("[CREATE INVOICE] Could not load SO item details:", error);
            items = [];
        }
    }

    if (Array.isArray(items) && items.length) {
        salesOrderBaseItems = items.map(rawItem => {
            const normalized = normalizeSalesOrderItem(rawItem);
            const itemNo = String(getObjectValue(rawItem, ["ITEM_NO", "ITEM_NUMBER", "ITEM_NUMBER", "itemNo", "itemNumber", "number", "code"]) || normalized.itemNo || "");
            const itemName = String(getObjectValue(rawItem, ["ITEM_NAME", "itemName", "ITEM", "name", "DESCRIPTION", "description"]) || normalized.itemName || normalized.description || "");
            const soQty = toNumber(getObjectValue(rawItem, ["QTY", "QUANTITY", "SO_QTY", "QTY_SO", "ORDER_QTY", "QTY_ORDERED", "qty", "quantity", "soQty"]) || normalized.qtyInvoice);
            const unitAmount = toNumber(getObjectValue(rawItem, ["UNIT_AMOUNT", "UNIT_PRICE", "AMOUNT", "unitAmount", "unitPrice", "price"]));
            const invoicedQty = getPreviouslyInvoicedQty(getValue("soNo"), itemNo);
            return {
                id: Date.now() + Math.random(),
                itemNo,
                itemName,
                description: itemName,
                soQty,
                invoicedQty,
                balance: Math.max(0, soQty - invoicedQty),
                qtyInvoice: 0,
                unit: String(getObjectValue(rawItem, ["UNIT", "UOM", "unit", "uom"]) || normalized.unit || ""),
                unitPrice: unitAmount,
                remarks: "",
                checked: true,
                sourceSONo: getValue("soNo"),
                sourceItemNo: itemNo,
                isManual: false
            };
        });
    } else {
        console.warn("[CREATE INVOICE] No Sales Order line items were returned for " + getValue("soNo"));
    }

    rebuildInvoiceItemsFromSelectedDRs();

}


/* =====================================================
   NORMALIZE SO ITEM
====================================================== */

function normalizeSalesOrderItem(item) {
    const itemName = getObjectValue(item, ["ITEM_NAME", "itemName", "ITEM", "name", "DESCRIPTION", "description", "itemDescription"]) || "";
    return {
        itemNo: getObjectValue(item, ["ITEM_NO", "ITEM_NUMBER", "ITEM_NUMBER", "itemNo", "itemNumber", "number", "code"]) || "",
        itemName: String(itemName),
        description: String(itemName),
        qtyInvoice: toNumber(getObjectValue(item, ["QTY_DELIVERED", "QTY_DR", "DELIVERED_QTY", "deliveredQty", "pickQty", "PICK_QTY", "QTY_INVOICE", "QTY", "QUANTITY", "qtyInvoice", "qty", "quantity", "totalDelivered", "totalOrder"]) || 0),
        unit: getObjectValue(item, ["UNIT", "UOM", "uom", "unit"]) || "",
        unitPrice: toNumber(getObjectValue(item, ["UNIT_AMOUNT", "UNIT_PRICE", "AMOUNT", "unitAmount", "unitPrice", "price", "sellingPrice"]) || 0)
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

    window.location.href = "../index.html";

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
