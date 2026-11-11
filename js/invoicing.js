/* =========================================================
   LOGIS-TECH SYSTEM
   INVOICING MODULE
   =========================================================
   VERSION: 20261006-01

   FUNCTIONS:
   01. Load invoice module
   02. Prepare Invoice -> create-invoice.html
   03. Refresh invoice data
   04. Invoice search + suggestions
   05. Sales Order search + suggestions
   06. LocalStorage data support
   07. Invoice summary counters
   08. Recent invoice display
   09. Recent sales order display

   DATA SOURCE:
   LocalStorage muna

   IMPORTANT:
   This JS is loaded AFTER pages/invoicing.html
   has been injected into index.html.
========================================================= */


/* =========================================================
   STORAGE KEYS
========================================================= */

const INVOICE_STORAGE_KEY = "logitechInvoices";

const INVOICE_API_URL =
    "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

async function fetchInvoicesFromDatabase() {
    try {
        const response = await fetch(INVOICE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "getInvoices",
                data: {}
            })
        });

        const responseText = await response.text();
        let result;

        try {
            result = JSON.parse(responseText);
        } catch (error) {
            throw new Error("Invalid response from Invoice API.");
        }

        if (!response.ok || !result || result.success === false) {
            throw new Error(
                result && (result.message || result.error)
                    ? (result.message || result.error)
                    : "Could not load invoices from database."
            );
        }

        const records = Array.isArray(result.invoices)
            ? result.invoices
            : (Array.isArray(result.records) ? result.records : []);

        invoiceRecords = records.map(record => {
            const rawItems = Array.isArray(record.ITEMS)
                ? record.ITEMS
                : (Array.isArray(record.items) ? record.items : []);

            return {
                invoiceId: record.INVOICE_ID || "",
                invoiceNo: record.INVOICE_NO || "",
                invoiceDate: record.INVOICE_DATE || "",
                siNo: record.SI_NO || "",
                soNo: record.SO_NUMBER || "",
                drNo: record.DR_NUMBER || "",
                poNo: record.PO_NUMBER || "",
                terms: record.TERMS || "",
                se: record.SALES_ENGINEER || "",
                client: record.CLIENT_NAME || "",
                clientName: record.CLIENT_NAME || "",
                billingAddress: record.BILLING_ADDRESS || "",
                tinNo: record.TIN || "",
                project: record.PROJECT || "",
                ewtType: record.EWT_TYPE || "",
                ewtRate: record.EWT_RATE || 0,
                ewtAmount: record.EWT_AMOUNT || 0,
                totalSales: record.TOTAL_SALES || 0,
                totalAmount: record.TOTAL_SALES || record.AMOUNT_DUE || record.FINAL_AMOUNT_DUE || 0,
                amount: record.AMOUNT_DUE || record.FINAL_AMOUNT_DUE || record.TOTAL_SALES || 0,
                netOfVat: record.NET_OF_VAT || 0,
                vat: record.VAT || 0,
                amountDue: record.AMOUNT_DUE || 0,
                finalAmountDue: record.FINAL_AMOUNT_DUE || 0,
                status: record.STATUS || "",
                releaseStatus: record.RELEASE_STATUS || "",
                releaseDestination: record.RELEASE_DESTINATION || "",
                releaseDate: record.RELEASE_DATE || "",
                createdAt: record.CREATED_AT || "",
                items: rawItems.map(item => ({
                    itemNo: item.ITEM_NO || "",
                    description: item.DESCRIPTION || "",
                    qtyInvoice: item.QTY_INVOICE || 0,
                    unit: item.UNIT || "",
                    unitPrice: item.UNIT_PRICE || 0,
                    totalAmount: item.TOTAL_AMOUNT || 0
                })),
                _source: "DATABASE"
            };
        });

        return true;
    } catch (error) {
        console.error(
            "LOGIS-TECH: Could not load invoices from database. Local invoice records will not be displayed.",
            error
        );
        invoiceRecords = [];
        return false;
    }
}



async function fetchPendingInvoiceQueueFromDatabase() {
    try {
        const response = await fetch(INVOICE_API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "getPendingInvoiceQueue", data: {} })
        });
        const raw = await response.text();
        const result = JSON.parse(raw);
        if (!response.ok || !result || result.success === false) {
            throw new Error(result?.message || result?.error || "Could not load pending invoice queue.");
        }
        pendingInvoiceQueue = {
            FULL_PAYMENT: Array.isArray(result.fullPayments) ? result.fullPayments : [],
            DOWN_PAYMENT: Array.isArray(result.downPayments) ? result.downPayments : [],
            DELIVERY_RECEIPT: Array.isArray(result.deliveryReceipts) ? result.deliveryReceipts : []
        };
        return true;
    } catch (error) {
        console.error("LOGIS-TECH: Failed to load pending invoice queue.", error);
        pendingInvoiceQueue = { FULL_PAYMENT: [], DOWN_PAYMENT: [], DELIVERY_RECEIPT: [] };
        return false;
    }
}

/* =========================================================
   MODULE STATE
========================================================= */

let invoicingInitialized = false;

let invoiceRecords = [];
let pendingInvoiceQueue = { FULL_PAYMENT: [], DOWN_PAYMENT: [], DELIVERY_RECEIPT: [] };
let activePendingInvoiceType = "FULL_PAYMENT";
let pendingInvoiceSearchTimer = null;

let invoiceSearchTimer = null;
let salesOrderSearchTimer = null;


/* =========================================================
   SAFE LOCAL STORAGE
========================================================= */

function getLocalStorageArray(key) {

    try {

        const rawData = localStorage.getItem(key);

        if (!rawData) {
            return [];
        }

        const parsedData = JSON.parse(rawData);

        return Array.isArray(parsedData)
            ? parsedData
            : [];

    } catch (error) {

        console.error(
            "LOGIS-TECH: Failed to read",
            key,
            error
        );

        return [];

    }

}


/* =========================================================
   LOAD DATA
========================================================= */

function loadInvoicingData() {

    // Invoice history must come only from the Google Sheets database.
    invoiceRecords = [];

}


/* =========================================================
   INITIALIZE INVOICING MODULE
========================================================= */

function initializeInvoicing() {

    if (invoicingInitialized) {
        return;
    }

    /*
       Make sure the dynamically loaded HTML
       already exists before binding events.
    */

    const invoicingContainer =
        document.querySelector(".invoicing-container");

    if (!invoicingContainer) {

        console.warn(
            "LOGIS-TECH: Invoicing HTML not found."
        );

        return;

    }


    loadInvoicingData();

    bindInvoicingEvents();

    renderInvoiceSummary();

    renderRecentInvoices();

    renderPendingInvoiceQueue();
    bindPendingInvoiceControls();

    invoicingInitialized = true;

    // Invoice history is loaded only from Google Sheets.
    Promise.all([
        fetchInvoicesFromDatabase(),
        fetchPendingInvoiceQueueFromDatabase()
    ]).then(function () {
        renderInvoiceSummary();
        renderRecentInvoices();
        renderPendingInvoiceQueue();
    });


    console.log(
        "LOGIS-TECH: Invoicing module initialized."
    );

}


/* =========================================================
   BIND EVENTS
========================================================= */

function bindInvoicingEvents() {

    // Close the recent-invoice preview using the Close/X button or overlay.
    const invoicePreviewModal = document.getElementById("invoicePreviewModal");
    const closePreviewBtn = document.getElementById("closeInvoicePreviewModal");
    const previewOverlay = document.getElementById("previewOverlay");

    if (closePreviewBtn && closePreviewBtn.dataset.closeBound !== "true") {
        closePreviewBtn.dataset.closeBound = "true";
        closePreviewBtn.addEventListener("click", closeExistingInvoicePreview);
    }

    if (previewOverlay && previewOverlay.dataset.closeBound !== "true") {
        previewOverlay.dataset.closeBound = "true";
        previewOverlay.addEventListener("click", closeExistingInvoicePreview);
    }

    if (invoicePreviewModal && invoicePreviewModal.dataset.escapeBound !== "true") {
        invoicePreviewModal.dataset.escapeBound = "true";
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && !invoicePreviewModal.hidden) {
                closeExistingInvoicePreview();
            }
        });
    }


    /* =====================================================
       PREPARE INVOICE
    ===================================================== */

    const prepareInvoiceBtn =
        document.getElementById("prepareInvoiceBtn");

    if (prepareInvoiceBtn) {

        prepareInvoiceBtn.addEventListener(
            "click",
            openCreateInvoicePage
        );

    }



    /* =====================================================
       REFRESH
    ===================================================== */

    const refreshInvoiceBtn =
        document.getElementById("refreshInvoiceBtn");

    if (refreshInvoiceBtn) {

        refreshInvoiceBtn.addEventListener(
            "click",
            refreshInvoicing
        );

    }



    /* =====================================================
       INVOICE SEARCH BUTTON
    ===================================================== */

    const invoiceSearchBtn =
        document.getElementById("invoiceSearchBtn");

    if (invoiceSearchBtn) {

        invoiceSearchBtn.addEventListener(
            "click",
            toggleInvoiceSearch
        );

    }



    /* =====================================================
       INVOICE SEARCH INPUT
    ===================================================== */

    const invoiceSearchInput =
        document.getElementById("invoiceSearchInput");

    if (invoiceSearchInput) {

        invoiceSearchInput.addEventListener(
            "input",
            handleInvoiceSearch
        );

        invoiceSearchInput.addEventListener(
            "keydown",
            handleInvoiceSearchKeyboard
        );

    }



    /* =====================================================
       CLEAR INVOICE SEARCH
    ===================================================== */

    const invoiceSearchClearBtn =
        document.getElementById(
            "invoiceSearchClearBtn"
        );

    if (invoiceSearchClearBtn) {

        invoiceSearchClearBtn.addEventListener(
            "click",
            clearInvoiceSearch
        );

    }





}

/* =========================================================
   OPEN CREATE INVOICE PAGE
========================================================= */

function openCreateInvoicePage() {

    console.log(
        "LOGIS-TECH: Prepare Invoice button clicked."
    );

    /*
       IMPORTANT:

       index.html is the main page.
       Therefore navigation must be relative
       to index.html, NOT invoicing.html.
    */

    const targetPage =
        "pages/create-invoice.html";


    try {

        window.location.assign(targetPage);

    } catch (error) {

        console.error(
            "LOGIS-TECH: Failed to open Create Invoice page.",
            error
        );

    }

}



/* =========================================================
   REFRESH INVOICING
========================================================= */

async function refreshInvoicing() {

    const refreshButton =
        document.getElementById("refreshInvoiceBtn");

    if (refreshButton && refreshButton.disabled) {
        return;
    }

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.classList.add("is-refreshing");
        refreshButton.setAttribute("aria-busy", "true");
    }

    try {

        /*
         * Refresh the module's data only.
         * Do not reload the browser page or navigate away.
         */
        await Promise.all([
            fetchInvoicesFromDatabase(),
            fetchPendingInvoiceQueueFromDatabase()
        ]);

        renderInvoiceSummary();
        renderRecentInvoices();
        renderPendingInvoiceQueue();

        clearInvoiceSearch(false);
        clearPendingInvoiceSearch();

        console.log(
            "LOGIS-TECH: Invoice tables refreshed without reloading the page."
        );

    } catch (error) {

        console.error(
            "LOGIS-TECH: Failed to refresh invoice tables.",
            error
        );

    } finally {

        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.classList.remove("is-refreshing");
            refreshButton.removeAttribute("aria-busy");
        }

    }

}


/* =========================================================
   TOGGLE INVOICE SEARCH
========================================================= */

function toggleInvoiceSearch() {

    const searchBox =
        document.getElementById(
            "invoiceSearchBox"
        );

    const searchInput =
        document.getElementById(
            "invoiceSearchInput"
        );


    if (!searchBox) {
        return;
    }


    searchBox.hidden =
        !searchBox.hidden;


    if (!searchBox.hidden && searchInput) {

        setTimeout(() => {

            searchInput.focus();

        }, 50);

    }

}


/* =========================================================
   INVOICE SEARCH
========================================================= */

function handleInvoiceSearch(event) {

    const query =
        String(event.target.value || "")
            .trim()
            .toLowerCase();


    clearTimeout(invoiceSearchTimer);


    invoiceSearchTimer = setTimeout(() => {

        if (!query) {

            removeInvoiceSuggestions();

            renderRecentInvoices();

            return;

        }


        const results =
            filterInvoices(query);


        renderInvoiceSearchSuggestions(
            results,
            query
        );


        renderInvoiceTable(results);

    }, 120);

}


/* =========================================================
   FILTER INVOICES
========================================================= */

function filterInvoices(query) {

    return invoiceRecords.filter(invoice => {

        const invoiceNo =
            getRecordValue(
                invoice,
                [
                    "invoiceNo",
                    "invoiceNumber",
                    "invoice_no",
                    "Invoice No.",
                    "INVOICE NO."
                ]
            );

        const soNo =
            getRecordValue(
                invoice,
                [
                    "soNo",
                    "salesOrderNo",
                    "salesOrder",
                    "SO No.",
                    "SO NO."
                ]
            );

        const client =
            getRecordValue(
                invoice,
                [
                    "client",
                    "clientName",
                    "Client"
                ]
            );

        const project =
            getRecordValue(
                invoice,
                [
                    "project",
                    "projectName",
                    "Project"
                ]
            );

        const drNo =
            getRecordValue(
                invoice,
                [
                    "drNo",
                    "deliveryReceiptNo",
                    "DR No."
                ]
            );

        const poNo =
            getRecordValue(
                invoice,
                [
                    "poNo",
                    "poNumber",
                    "P.O. No."
                ]
            );


        const searchText = [

            invoiceNo,
            soNo,
            client,
            project,
            drNo,
            poNo

        ]
            .join(" ")
            .toLowerCase();


        return searchText.includes(query);

    });

}


/* =========================================================
   INVOICE SEARCH SUGGESTIONS
========================================================= */

function renderInvoiceSearchSuggestions(
    results,
    query
) {

    removeInvoiceSuggestions();


    const searchBox =
        document.getElementById(
            "invoiceSearchBox"
        );


    const input =
        document.getElementById(
            "invoiceSearchInput"
        );


    if (!searchBox || !input) {
        return;
    }


    const wrapper =
        document.createElement("div");


    wrapper.className =
        "invoice-search-suggestions";


    wrapper.id =
        "invoiceSearchSuggestions";


    if (!results.length) {

        wrapper.innerHTML = `

            <div class="search-suggestion-empty">
                No invoice found for
                "<strong>${escapeHtml(query)}</strong>"
            </div>

        `;

        searchBox.appendChild(wrapper);

        return;

    }


    const limitedResults =
        results.slice(0, 8);


    limitedResults.forEach((invoice, index) => {

        const invoiceNo =
            getRecordValue(
                invoice,
                [
                    "invoiceNo",
                    "invoiceNumber",
                    "invoice_no",
                    "Invoice No."
                ]
            ) || "—";


        const client =
            getRecordValue(
                invoice,
                [
                    "client",
                    "clientName"
                ]
            ) || "—";


        const project =
            getRecordValue(
                invoice,
                [
                    "project",
                    "projectName"
                ]
            ) || "—";


        const amount =
            getRecordValue(
                invoice,
                [
                    "total",
                    "totalAmount",
                    "amount",
                    "grandTotal"
                ]
            );


        const item =
            document.createElement("button");


        item.type = "button";

        item.className =
            "search-suggestion-item";


        item.dataset.index =
            String(index);


        item.innerHTML = `

            <span class="suggestion-main">
                <strong>
                    ${escapeHtml(invoiceNo)}
                </strong>

                <small>
                    ${escapeHtml(client)}
                </small>
            </span>

            <span class="suggestion-side">

                <small>
                    ${escapeHtml(project)}
                </small>

                <strong>
                    ${formatCurrency(amount)}
                </strong>

            </span>

        `;


        item.addEventListener(
            "click",
            () => {

                selectInvoiceSuggestion(
                    invoice
                );

            }
        );


        wrapper.appendChild(item);

    });


    searchBox.appendChild(wrapper);

}


/* =========================================================
   SELECT INVOICE SUGGESTION
========================================================= */

function selectInvoiceSuggestion(invoice) {

    const invoiceNo =
        getRecordValue(
            invoice,
            [
                "invoiceNo",
                "invoiceNumber",
                "invoice_no"
            ]
        );


    const searchInput =
        document.getElementById(
            "invoiceSearchInput"
        );


    if (searchInput) {

        searchInput.value =
            invoiceNo || "";

    }


    removeInvoiceSuggestions();

    renderInvoiceTable([invoice]);

}


/* =========================================================
   INVOICE KEYBOARD SEARCH
========================================================= */

function handleInvoiceSearchKeyboard(event) {

    if (event.key === "Escape") {

        removeInvoiceSuggestions();

        return;

    }

}


/* =========================================================
   CLEAR INVOICE SEARCH
========================================================= */

function clearInvoiceSearch(
    render = true
) {

    const input =
        document.getElementById(
            "invoiceSearchInput"
        );


    if (input) {
        input.value = "";
    }


    removeInvoiceSuggestions();


    if (render) {
        renderRecentInvoices();
    }

}


/* =========================================================
   REMOVE INVOICE SUGGESTIONS
========================================================= */

function removeInvoiceSuggestions() {

    const existing =
        document.getElementById(
            "invoiceSearchSuggestions"
        );


    if (existing) {
        existing.remove();
    }

}


/* =========================================================
   RENDER SUMMARY
========================================================= */

function renderInvoiceSummary() {
    const total = document.getElementById("totalInvoice");
    const amount = document.getElementById("todaysInvoiced");
    const cancelled = document.getElementById("cancelledInvoice");
    if (total) total.textContent = invoiceRecords.length;
    if (amount) amount.textContent = formatCurrency(invoiceRecords
        .filter(x => String(x.status || "").toUpperCase() !== "CANCELLED")
        .reduce((sum, x) => sum + Number(x.finalAmountDue || x.amountDue || x.totalAmount || 0), 0));
    if (cancelled) cancelled.textContent = invoiceRecords.filter(x => String(x.status || "").toUpperCase() === "CANCELLED").length;
}

function getInvoicedRecordsFiltered() {
    const q = String(document.getElementById("invoicedRecordsSearch")?.value || "").trim().toLowerCase();
    const range = document.getElementById("invoicedRecordsDateRange")?.value || "ALL";
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (range === "12M") start.setMonth(now.getMonth() - 11);
    if (range === "6M") start.setMonth(now.getMonth() - 5);
    if (range === "3M") start.setMonth(now.getMonth() - 2);
    return invoiceRecords.filter(inv => {
        const haystack = [inv.invoiceNo, inv.siNo, inv.soNo, inv.client, inv.project].join(" ").toLowerCase();
        if (q && !haystack.includes(q)) return false;
        if (range !== "ALL") {
            const d = new Date(inv.invoiceDate);
            if (Number.isNaN(d.getTime()) || d < start || d > now) return false;
        }
        return true;
    });
}

function renderRecentInvoices() { renderInvoiceTable(getInvoicedRecordsFiltered()); }

function renderInvoiceTable(records) {
    const tbody = document.getElementById("recentInvoiceTableBody");
    if (!tbody) return;
    if (!records.length) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="12">No invoice records found.</td></tr>';
        updateInvoiceSelectionCount();
        return;
    }
    tbody.innerHTML = records.map(invoice => {
        const status = String(invoice.status || "ONGOING").toUpperCase();
        const released = String(invoice.releaseStatus || "").toUpperCase() === "RELEASED";
        const disabled = status === "CANCELLED" || released;
        return `<tr>
            <td><input type="checkbox" class="invoiced-record-select" data-invoice-select="${escapeHtml(invoice.invoiceNo)}" ${disabled ? "disabled" : ""} aria-label="Select invoice ${escapeHtml(invoice.invoiceNo)}"></td>
            <td><strong>${escapeHtml(invoice.invoiceNo || "—")}</strong></td>
            <td>${escapeHtml(invoice.siNo || "—")}</td>
            <td>${escapeHtml(invoice.soNo || "—")}</td>
            <td>${escapeHtml(invoice.client || "—")}</td>
            <td>${escapeHtml(invoice.project || "—")}</td>
            <td>${escapeHtml(formatDisplayDate(invoice.invoiceDate))}</td>
            <td><strong>${formatCurrency(invoice.finalAmountDue || invoice.amountDue || invoice.totalAmount || 0)}</strong></td>
            <td><span class="status-badge ${getStatusClass(status)}">${escapeHtml(status)}</span></td>
            <td>${escapeHtml(invoice.releaseDestination || "—")}</td>
            <td>${escapeHtml(invoice.releaseDate ? formatDisplayDate(invoice.releaseDate) : "—")}</td>
            <td class="invoice-row-actions">
                <button type="button" class="table-action" data-invoice-view="${escapeHtml(invoice.invoiceNo)}">VIEW</button>
                ${status === "CANCELLED" ? "" : `<button type="button" class="table-action primary" data-invoice-edit="${escapeHtml(invoice.invoiceNo)}">EDIT</button><button type="button" class="table-action danger" data-invoice-cancel="${escapeHtml(invoice.invoiceNo)}">CANCEL</button>`}
                ${status === "CANCELLED" || released ? "" : `<button type="button" class="table-action primary" data-invoice-release="${escapeHtml(invoice.invoiceNo)}">RELEASE</button>`}
            </td>
        </tr>`;
    }).join("");
    bindInvoiceViewButtons();
    bindInvoiceEditButtons();
    bindInvoiceCancelButtons();
    bindInvoiceReleaseButtons();
    bindInvoicedRecordSelection();
    updateInvoiceSelectionCount();
}

function bindInvoicedRecordSelection() {
    document.querySelectorAll("[data-invoice-select]").forEach(el => {
        if (el.dataset.bound === "true") return;
        el.dataset.bound = "true";
        el.addEventListener("change", updateInvoiceSelectionCount);
    });
    const all = document.getElementById("selectAllInvoicedRecords");
    if (all && all.dataset.bound !== "true") {
        all.dataset.bound = "true";
        all.addEventListener("change", () => {
            document.querySelectorAll("[data-invoice-select]:not(:disabled)").forEach(el => el.checked = all.checked);
            updateInvoiceSelectionCount();
        });
    }
    const release = document.getElementById("releaseSelectedInvoicesBtn");
    if (release && release.dataset.bound !== "true") {
        release.dataset.bound = "true";
        release.addEventListener("click", () => {
            const selected = [...document.querySelectorAll("[data-invoice-select]:checked")].map(el => el.dataset.invoiceSelect);
            openInvoiceReleaseModal(selected);
        });
    }
    const search = document.getElementById("invoicedRecordsSearch");
    if (search && search.dataset.bound !== "true") {
        search.dataset.bound = "true";
        search.addEventListener("input", renderRecentInvoices);
    }
    const range = document.getElementById("invoicedRecordsDateRange");
    if (range && range.dataset.bound !== "true") {
        range.dataset.bound = "true";
        range.addEventListener("change", renderRecentInvoices);
    }
}

function updateInvoiceSelectionCount() {
    const selected = document.querySelectorAll("[data-invoice-select]:checked").length;
    const label = document.getElementById("selectedInvoiceCount");
    const btn = document.getElementById("releaseSelectedInvoicesBtn");
    const all = document.getElementById("selectAllInvoicedRecords");
    if (label) label.textContent = selected + " selected";
    if (btn) btn.disabled = selected === 0;
    if (all) {
        const available = [...document.querySelectorAll("[data-invoice-select]:not(:disabled)")];
        all.checked = available.length > 0 && available.every(el => el.checked);
        all.indeterminate = available.some(el => el.checked) && !all.checked;
    }
}

function openInvoiceReleaseModal(invoiceNos) {
    const selected = [...new Set(invoiceNos)].filter(Boolean);
    if (!selected.length) return;
    let modal = document.getElementById("invoiceReleaseModal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "invoiceReleaseModal";
        modal.className = "modal-overlay";
        modal.hidden = true;
        modal.innerHTML = `<div class="modal"><div class="modal-header"><div><h2>RELEASE INVOICES</h2><p id="invoiceReleaseCount"></p></div><button type="button" class="modal-close" id="closeInvoiceReleaseModal">×</button></div><div class="modal-body"><div class="form-group"><label for="invoiceReleaseDestination">RELEASE TO</label><select id="invoiceReleaseDestination"><option value="HEAD OFFICE - FOR COUNTER">HEAD OFFICE – FOR COUNTER</option><option value="LOGISTICS">LOGISTICS</option></select></div><div class="form-group"><label for="invoiceReleaseDate">RELEASE DATE</label><input type="date" id="invoiceReleaseDate" required></div><div class="form-group"><label>SELECTED INVOICES</label><div id="invoiceReleaseList"></div></div></div><div class="modal-footer"><button type="button" class="btn btn-secondary" id="cancelInvoiceRelease">CANCEL</button><button type="button" class="btn btn-primary" id="confirmInvoiceRelease">CONFIRM RELEASE</button></div></div>`;
        document.querySelector(".invoicing-container")?.appendChild(modal);
        const close = () => { modal.hidden = true; modal.classList.remove("active"); };
        modal.querySelector("#closeInvoiceReleaseModal").addEventListener("click", close);
        modal.querySelector("#cancelInvoiceRelease").addEventListener("click", close);
        modal.querySelector("#confirmInvoiceRelease").addEventListener("click", async () => {
            const date = modal.querySelector("#invoiceReleaseDate").value;
            if (!date) { window.alert("Please select the release date."); return; }
            const destination = modal.querySelector("#invoiceReleaseDestination").value;
            const btn = modal.querySelector("#confirmInvoiceRelease");
            btn.disabled = true;
            try {
                await sendInvoiceAction("releaseInvoices", { invoiceNumbers: selected, destination, releaseDate: date });
                close();
                await refreshInvoicing();
                window.alert(selected.length + " invoice(s) released successfully.");
            } catch (error) {
                window.alert("Could not release invoices: " + error.message);
            } finally { btn.disabled = false; }
        });
    }
    modal.querySelector("#invoiceReleaseCount").textContent = selected.length + " invoice(s) selected";
    modal.querySelector("#invoiceReleaseList").textContent = selected.join(", ");
    modal.querySelector("#invoiceReleaseDate").value = getTodayString();
    modal.hidden = false;
    modal.classList.add("active");
}

function bindInvoiceReleaseButtons() {
    document.querySelectorAll("[data-invoice-release]").forEach(button => {
        if (button.dataset.bound === "true") return;
        button.dataset.bound = "true";
        button.addEventListener("click", () => openInvoiceReleaseModal([button.dataset.invoiceRelease]));
    });
}

/* =========================================================
   INVOICE VIEW BUTTONS
========================================================= */

function bindInvoiceViewButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-invoice-view]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const invoiceNo =
                    button.dataset.invoiceView;


                const invoice =
                    invoiceRecords.find(item => {

                        const number =
                            getRecordValue(
                                item,
                                [
                                    "invoiceNo",
                                    "invoiceNumber",
                                    "invoice_no"
                                ]
                            );

                        return String(number) ===
                            String(invoiceNo);

                    });


                if (invoice) {

                    openInvoicePreview(
                        invoice
                    );

                }

            }
        );

    });

}


/* =========================================================
   CLOSE EXISTING INVOICE PREVIEW
========================================================= */

function closeExistingInvoicePreview() {
    const modal = document.getElementById("invoicePreviewModal");
    if (!modal) return;
    modal.classList.remove("active");
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
}


/* =========================================================
   OPEN EXISTING INVOICE PREVIEW
========================================================= */

function openInvoicePreview(invoice) {

    const modal =
        document.getElementById(
            "invoicePreviewModal"
        );


    if (!modal) {
        return;
    }


    setText(
        "previewInvoiceNo",
        getRecordValue(
            invoice,
            [
                "invoiceNo",
                "invoiceNumber",
                "invoice_no"
            ]
        ) || "—"
    );


    setText(
        "previewInvoiceDate",
        formatDisplayDate(
            getRecordValue(
                invoice,
                [
                    "invoiceDate",
                    "date"
                ]
            )
        )
    );


    setText(
        "previewSONo",
        getRecordValue(
            invoice,
            [
                "soNo",
                "salesOrderNo"
            ]
        ) || "—"
    );


    setText(
        "previewDRNo",
        getRecordValue(
            invoice,
            [
                "drNo",
                "deliveryReceiptNo"
            ]
        ) || "—"
    );


    setText(
        "previewClient",
        getRecordValue(
            invoice,
            [
                "client",
                "clientName"
            ]
        ) || "—"
    );


    setText(
        "previewProject",
        getRecordValue(
            invoice,
            [
                "project",
                "projectName"
            ]
        ) || "—"
    );


    setText(
        "previewPONo",
        getRecordValue(
            invoice,
            [
                "poNo",
                "poNumber"
            ]
        ) || "—"
    );


    setText(
        "previewTerms",
        getRecordValue(
            invoice,
            [
                "terms",
                "paymentTerms"
            ]
        ) || "—"
    );


    renderPreviewItems(invoice);

    setText(
        "previewSubtotal",
        formatCurrency(
            getRecordValue(
                invoice,
                [
                    "subtotal"
                ]
            )
        )
    );


    setText(
        "previewVAT",
        formatCurrency(
            getRecordValue(
                invoice,
                [
                    "vat",
                    "vatAmount"
                ]
            )
        )
    );


    setText(
        "previewTotal",
        formatCurrency(
            getRecordValue(
                invoice,
                [
                    "totalAmount",
                    "total",
                    "grandTotal"
                ]
            )
        )
    );


    modal.hidden = false;
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

}


/* =========================================================
   RENDER PREVIEW ITEMS
========================================================= */

function renderPreviewItems(invoice) {

    const tbody =
        document.getElementById(
            "previewInvoiceItems"
        );


    if (!tbody) {
        return;
    }


    const items =
        Array.isArray(invoice.items)
            ? invoice.items
            : [];


    if (!items.length) {

        tbody.innerHTML = `

            <tr>

                <td colspan="5">
                    No invoice items.
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        items.map(item => {

            const itemNo =
                getRecordValue(
                    item,
                    [
                        "item",
                        "itemNo",
                        "itemNumber"
                    ]
                ) || "—";


            const description =
                getRecordValue(
                    item,
                    [
                        "description",
                        "itemDescription",
                        "name"
                    ]
                ) || "—";


            const qty =
                getRecordValue(
                    item,
                    [
                        "qty",
                        "quantity"
                    ]
                ) || 0;


            const unit =
                getRecordValue(
                    item,
                    [
                        "unit"
                    ]
                ) || "—";


            const amount =
                getRecordValue(
                    item,
                    [
                        "amount",
                        "total"
                    ]
                );


            return `

                <tr>

                    <td>
                        ${escapeHtml(itemNo)}
                    </td>

                    <td>
                        ${escapeHtml(description)}
                    </td>

                    <td>
                        ${escapeHtml(qty)}
                    </td>

                    <td>
                        ${escapeHtml(unit)}
                    </td>

                    <td>
                        ${formatCurrency(amount)}
                    </td>

                </tr>

            `;

        })
        .join("");

}


/* =========================================================
   PENDING FOR INVOICE — TYPE TABS, SEARCH AND TABLE
========================================================= */
function bindPendingInvoiceControls() {
    document.querySelectorAll("[data-pending-invoice-type]").forEach(button => {
        if (button.dataset.bound === "true") return;
        button.dataset.bound = "true";
        button.addEventListener("click", () => {
            activePendingInvoiceType = button.dataset.pendingInvoiceType;
            document.querySelectorAll("[data-pending-invoice-type]").forEach(tab => {
                const active = tab === button;
                tab.classList.toggle("active", active);
                tab.setAttribute("aria-selected", active ? "true" : "false");
            });
            renderPendingInvoiceQueue();
        });
    });

    const search = document.getElementById("pendingInvoiceSearchInput");
    if (search && search.dataset.bound !== "true") {
        search.dataset.bound = "true";
        search.addEventListener("input", () => {
            clearTimeout(pendingInvoiceSearchTimer);
            pendingInvoiceSearchTimer = setTimeout(renderPendingInvoiceQueue, 120);
        });
    }
}

function clearPendingInvoiceSearch() {
    const search = document.getElementById("pendingInvoiceSearchInput");
    if (search) search.value = "";
}

function renderPendingInvoiceQueue() {
    const body = document.getElementById("pendingInvoiceTableBody");
    if (!body) return;

    const fullCount = document.getElementById("pendingFullPaymentCount");
    const dpCount = document.getElementById("pendingDownPaymentCount");
    const drCount = document.getElementById("pendingDeliveryReceiptCount");
    if (fullCount) fullCount.textContent = (pendingInvoiceQueue.FULL_PAYMENT || []).length;
    if (dpCount) dpCount.textContent = (pendingInvoiceQueue.DOWN_PAYMENT || []).length;
    if (drCount) drCount.textContent = (pendingInvoiceQueue.DELIVERY_RECEIPT || []).length;

    const query = String(document.getElementById("pendingInvoiceSearchInput")?.value || "").trim().toLowerCase();
    const records = (pendingInvoiceQueue[activePendingInvoiceType] || []).filter(record => {
        return [
            record.referenceNo, record.soNumber, record.clientName,
            record.project, record.paymentNo, record.drNumber
        ].join(" ").toLowerCase().includes(query);
    });

    if (!records.length) {
        body.innerHTML = '<tr class="empty-row"><td colspan="6">No pending ' +
            (activePendingInvoiceType === "FULL_PAYMENT" ? "full payment" :
             activePendingInvoiceType === "DOWN_PAYMENT" ? "down payment" : "delivery receipt") +
            ' records found.</td></tr>';
        return;
    }

    body.innerHTML = records.slice(0, 100).map(record => {
        const ref = record.referenceNo || record.paymentNo || record.drNumber || record.soNumber || "—";
        const date = record.date || "";
        return `<tr>
            <td><strong>${escapeHtml(ref)}</strong></td>
            <td>${escapeHtml(record.soNumber || "—")}</td>
            <td>${escapeHtml(record.clientName || "—")}</td>
            <td>${escapeHtml(record.project || "—")}</td>
            <td>${escapeHtml(date ? formatDisplayDate(date) : "—")}</td>
            <td><strong>${formatCurrency(record.amount || 0)}</strong></td>
        </tr>`;
    }).join("");
}

/* =========================================================
   SALES ORDER SELECT
========================================================= */

function bindSalesOrderSelectButtons() {

    const buttons =
        document.querySelectorAll(
            "[data-so-select]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const soNo =
                    button.dataset.soSelect;


                /*
                   For now, selection opens the
                   Create Invoice page.

                   The SO data integration can be added
                   later so the selected SO automatically
                   fills the invoice form.
                */

                window.location.href =
                    "pages/create-invoice.html"
                    +
                    "?so="
                    +
                    encodeURIComponent(
                        soNo
                    );

            }
        );

    });

}


/* =========================================================
   HELPER:
   GET RECORD VALUE
========================================================= */

function getRecordValue(
    record,
    possibleKeys
) {

    if (!record || typeof record !== "object") {
        return "";
    }


    for (const key of possibleKeys) {

        if (
            Object.prototype.hasOwnProperty.call(
                record,
                key
            )
        ) {

            const value =
                record[key];

            if (
                value !== null &&
                value !== undefined &&
                value !== ""
            ) {

                return value;

            }

        }

    }


    return "";

}


/* =========================================================
   HELPER:
   SET TEXT
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value ?? "";

    }

}


/* =========================================================
   HELPER:
   CURRENCY
========================================================= */

function formatCurrency(value) {

    const number =
        Number(
            String(value ?? "")
                .replace(/₱/g, "")
                .replace(/,/g, "")
                .trim()
        );


    if (!Number.isFinite(number)) {

        return "₱0.00";

    }


    return number.toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


/* =========================================================
   HELPER:
   DATE
========================================================= */

function normalizeDate(value) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {

        return String(value);

    }


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


/* =========================================================
   HELPER:
   TODAY
========================================================= */

function getTodayString() {

    const today =
        new Date();


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


    return `${year}-${month}-${day}`;

}


/* =========================================================
   HELPER:
   DISPLAY DATE
========================================================= */

function formatDisplayDate(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {

        return String(value);

    }


    return date.toLocaleDateString(
        "en-PH",
        {
            year: "numeric",
            month: "short",
            day: "2-digit"
        }
    );

}


/* =========================================================
   HELPER:
   STATUS CLASS
========================================================= */

function getStatusClass(status) {

    const normalized =
        String(status || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-");


    return `status-${normalized}`;

}


/* =========================================================
   HELPER:
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =========================================================
   INVOICE API ACTIONS: UPDATE / CANCEL
========================================================= */

async function sendInvoiceAction(action, data) {
    const response = await fetch(INVOICE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: action, data: data || {} })
    });

    const text = await response.text();
    let result;

    try {
        result = JSON.parse(text);
    } catch (error) {
        throw new Error("Invalid response from Invoice API.");
    }

    if (!response.ok || !result || result.success === false) {
        throw new Error(
            result && (result.message || result.error)
                ? (result.message || result.error)
                : "Invoice request failed."
        );
    }

    return result;
}

function findInvoiceByNumber(invoiceNo) {
    return invoiceRecords.find(invoice =>
        String(invoice.invoiceNo || "") === String(invoiceNo || "")
    );
}

function bindInvoiceEditButtons() {
    document.querySelectorAll("[data-invoice-edit]").forEach(button => {
        if (button.dataset.bound === "true") return;
        button.dataset.bound = "true";

        button.addEventListener("click", () => {
            const invoice = findInvoiceByNumber(button.dataset.invoiceEdit);
            if (invoice) openInvoiceEditModal(invoice);
        });
    });
}

function bindInvoiceCancelButtons() {
    document.querySelectorAll("[data-invoice-cancel]").forEach(button => {
        if (button.dataset.bound === "true") return;
        button.dataset.bound = "true";

        button.addEventListener("click", async () => {
            const invoice = findInvoiceByNumber(button.dataset.invoiceCancel);
            if (!invoice) return;

            const invoiceNo = invoice.invoiceNo || "this invoice";
            if (!window.confirm(
                "Cancel invoice " + invoiceNo + "?\n\nThe invoice will remain in the database with CANCELLED status."
            )) return;

            button.disabled = true;
            try {
                await sendInvoiceAction("cancelInvoice", {
                    invoiceId: invoice.invoiceId,
                    invoiceNo: invoice.invoiceNo
                });
                await refreshInvoicing();
                window.alert("Invoice " + invoiceNo + " was cancelled.");
            } catch (error) {
                console.error("Failed to cancel invoice:", error);
                window.alert("Could not cancel invoice: " + error.message);
            } finally {
                button.disabled = false;
            }
        });
    });
}

function openInvoiceEditModal(invoice) {
    if (String(invoice.status || "").toUpperCase() === "CANCELLED") {
        window.alert("Cancelled invoices cannot be updated.");
        return;
    }

    let overlay = document.getElementById("invoiceEditModal");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "invoiceEditModal";
        overlay.className = "modal-overlay";
        overlay.hidden = true;
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <div>
                        <h2>UPDATE INVOICE</h2>
                        <p id="editInvoiceSubtitle">Edit existing invoice details</p>
                    </div>
                    <button type="button" class="modal-close" id="closeEditInvoiceModal">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-grid">
                        <div class="form-group"><label>Invoice No.</label><input id="editInvoiceNo" readonly></div>
                        <div class="form-group"><label>Invoice Date</label><input id="editInvoiceDate" type="date"></div>
                        <div class="form-group"><label>SI No.</label><input id="editInvoiceSiNo"></div>
                        <div class="form-group"><label>PO No.</label><input id="editInvoicePoNo"></div>
                        <div class="form-group"><label>Client</label><input id="editInvoiceClient"></div>
                        <div class="form-group"><label>Project</label><input id="editInvoiceProject"></div>
                        <div class="form-group"><label>Terms</label>
                            <select id="editInvoiceTerms">
                                <option value="">Select Terms</option>
                                <option value="COD">COD</option>
                                <option value="15">15 DAYS</option>
                                <option value="30">30 DAYS</option>
                                <option value="45">45 DAYS</option>
                                <option value="60">60 DAYS</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Sales Engineer</label><input id="editInvoiceSE"></div>
                        <div class="form-group"><label>Billing Address</label><input id="editInvoiceBilling"></div>
                        <div class="form-group"><label>TIN</label><input id="editInvoiceTin"></div>
                        <div class="form-group"><label>EWT Type</label>
                            <select id="editInvoiceEwtType">
                                <option value="NONE">None</option>
                                <option value="SUPPLY">SUPPLY</option>
                                <option value="EWORKS">EWORKS</option>
                            </select>
                        </div>
                    </div>
                    <div class="invoice-items-section">
                        <div class="items-header">
                            <h3>INVOICE ITEMS</h3>
                            <button type="button" class="btn btn-secondary" id="editAddInvoiceItem">+ ADD ITEM</button>
                        </div>
                        <div class="table-wrapper">
                            <table class="invoice-items-table">
                                <thead><tr><th>ITEM</th><th>DESCRIPTION</th><th>QTY</th><th>UNIT</th><th>UNIT PRICE</th><th>AMOUNT</th><th></th></tr></thead>
                                <tbody id="editInvoiceItemsBody"></tbody>
                            </table>
                        </div>
                    </div>
                    <div class="invoice-total-section">
                        <div class="total-row"><span>SUBTOTAL</span><strong id="editInvoiceSubtotal">₱0.00</strong></div>
                        <div class="total-row"><span>VAT 12%</span><strong id="editInvoiceVat">₱0.00</strong></div>
                        <div class="total-row grand-total"><span>TOTAL AMOUNT</span><strong id="editInvoiceTotal">₱0.00</strong></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="cancelEditInvoiceBtn">CLOSE</button>
                    <button type="button" class="btn btn-primary" id="saveEditInvoiceBtn">SAVE CHANGES</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const close = () => { overlay.hidden = true; };
        document.getElementById("closeEditInvoiceModal").addEventListener("click", close);
        document.getElementById("cancelEditInvoiceBtn").addEventListener("click", close);
        overlay.addEventListener("click", event => {
            if (event.target === overlay) close();
        });
        document.getElementById("editAddInvoiceItem").addEventListener("click", () => {
            addInvoiceEditItemRow({});
        });
        document.getElementById("editInvoiceItemsBody").addEventListener("input", calculateInvoiceEditTotals);
        document.getElementById("editInvoiceItemsBody").addEventListener("click", event => {
            const button = event.target.closest("[data-remove-edit-item]");
            if (button) {
                button.closest("tr").remove();
                calculateInvoiceEditTotals();
            }
        });
        document.getElementById("saveEditInvoiceBtn").addEventListener("click", saveInvoiceEdit);
    }

    overlay.dataset.invoiceId = invoice.invoiceId || "";
    overlay.dataset.invoiceNo = invoice.invoiceNo || "";

    setEditInvoiceValue("editInvoiceNo", invoice.invoiceNo);
    setEditInvoiceValue("editInvoiceDate", normalizeDate(invoice.invoiceDate));
    setEditInvoiceValue("editInvoiceSiNo", invoice.siNo);
    setEditInvoiceValue("editInvoicePoNo", invoice.poNo);
    setEditInvoiceValue("editInvoiceClient", invoice.clientName || invoice.client);
    setEditInvoiceValue("editInvoiceProject", invoice.project);
    setEditInvoiceValue("editInvoiceTerms", invoice.terms);
    setEditInvoiceValue("editInvoiceSE", invoice.se);
    setEditInvoiceValue("editInvoiceBilling", invoice.billingAddress);
    setEditInvoiceValue("editInvoiceTin", invoice.tinNo);
    setEditInvoiceValue("editInvoiceEwtType", invoice.ewtType);

    const body = document.getElementById("editInvoiceItemsBody");
    body.innerHTML = "";
    (Array.isArray(invoice.items) ? invoice.items : []).forEach(item => addInvoiceEditItemRow(item));
    if (!body.children.length) addInvoiceEditItemRow({});
    calculateInvoiceEditTotals();

    document.getElementById("editInvoiceSubtitle").textContent =
        (invoice.invoiceNo || "Invoice") + " · " + (invoice.soNo || "No SO");
    overlay.hidden = false;
}

function setEditInvoiceValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value == null ? "" : String(value);
}

function addInvoiceEditItemRow(item) {
    const body = document.getElementById("editInvoiceItemsBody");
    const row = document.createElement("tr");
    const description = item.description || item.DESCRIPTION || item.itemName || "";
    const qty = item.qtyInvoice ?? item.QTY_INVOICE ?? item.qty ?? "";
    const unit = item.unit || item.UNIT || "";
    const price = item.unitPrice ?? item.UNIT_PRICE ?? "";
    const itemNo = item.itemNo || item.ITEM_NO || (body.children.length + 1);

    row.innerHTML = `
        <td><input type="text" data-edit-item-no value="${escapeHtml(itemNo)}" aria-label="Item number"></td>
        <td><input type="text" data-edit-description value="${escapeHtml(description)}" aria-label="Description"></td>
        <td><input type="number" min="0.01" step="any" data-edit-qty value="${escapeHtml(qty)}" aria-label="Quantity"></td>
        <td><input type="text" data-edit-unit value="${escapeHtml(unit)}" aria-label="Unit"></td>
        <td><input type="number" min="0" step="0.01" data-edit-price value="${escapeHtml(price)}" aria-label="Unit price"></td>
        <td data-edit-amount>₱0.00</td>
        <td><button type="button" class="remove-item-btn" data-remove-edit-item aria-label="Remove item">×</button></td>`;
    body.appendChild(row);
    calculateInvoiceEditTotals();
}

function calculateInvoiceEditTotals() {
    const body = document.getElementById("editInvoiceItemsBody");
    if (!body) return;

    let subtotal = 0;
    body.querySelectorAll("tr").forEach(row => {
        const qty = Number(row.querySelector("[data-edit-qty]").value || 0);
        const price = Number(row.querySelector("[data-edit-price]").value || 0);
        const amount = Number.isFinite(qty * price) ? qty * price : 0;
        subtotal += amount;
        row.querySelector("[data-edit-amount]").textContent = formatCurrency(amount);
    });

    subtotal = Math.round(subtotal * 100) / 100;
    const net = Math.round((subtotal / 1.12) * 100) / 100;
    const vat = Math.round((subtotal - net) * 100) / 100;
    setText("editInvoiceSubtotal", formatCurrency(net));
    setText("editInvoiceVat", formatCurrency(vat));
    setText("editInvoiceTotal", formatCurrency(subtotal));
}

async function saveInvoiceEdit() {
    const overlay = document.getElementById("invoiceEditModal");
    const saveButton = document.getElementById("saveEditInvoiceBtn");
    const body = document.getElementById("editInvoiceItemsBody");
    if (!overlay || !saveButton || !body) return;

    const items = Array.from(body.querySelectorAll("tr")).map(row => ({
        itemNo: row.querySelector("[data-edit-item-no]").value.trim(),
        description: row.querySelector("[data-edit-description]").value.trim(),
        qtyInvoice: Number(row.querySelector("[data-edit-qty]").value),
        unit: row.querySelector("[data-edit-unit]").value.trim(),
        unitPrice: Number(row.querySelector("[data-edit-price]").value)
    }));

    if (!items.length || items.some(item =>
        !Number.isFinite(item.qtyInvoice) || item.qtyInvoice <= 0 ||
        !Number.isFinite(item.unitPrice) || item.unitPrice < 0
    )) {
        window.alert("Please enter a valid quantity and unit price for every invoice item.");
        return;
    }

    const payload = {
        invoiceId: overlay.dataset.invoiceId,
        invoiceNo: overlay.dataset.invoiceNo,
        invoiceDate: document.getElementById("editInvoiceDate").value,
        siNo: document.getElementById("editInvoiceSiNo").value.trim(),
        poNo: document.getElementById("editInvoicePoNo").value.trim(),
        clientName: document.getElementById("editInvoiceClient").value.trim(),
        project: document.getElementById("editInvoiceProject").value.trim(),
        terms: document.getElementById("editInvoiceTerms").value,
        se: document.getElementById("editInvoiceSE").value.trim(),
        billingAddress: document.getElementById("editInvoiceBilling").value.trim(),
        tinNo: document.getElementById("editInvoiceTin").value.trim(),
        ewtType: document.getElementById("editInvoiceEwtType").value,
        items: items
    };

    saveButton.disabled = true;
    saveButton.textContent = "SAVING...";
    try {
        await sendInvoiceAction("updateInvoice", payload);
        overlay.hidden = true;
        await refreshInvoicing();
        window.alert("Invoice updated successfully.");
    } catch (error) {
        console.error("Failed to update invoice:", error);
        window.alert("Could not update invoice: " + error.message);
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = "SAVE CHANGES";
    }
}


/* =========================================================
   GLOBAL ACCESS
========================================================= */

window.initializeInvoicing =
    initializeInvoicing;

window.refreshInvoicing =
    refreshInvoicing;

window.openCreateInvoicePage =
    openCreateInvoicePage;


/* =========================================================
   NOTE
=========================================================

DO NOT automatically call initializeInvoicing()
here if index.html already controls the module loading.

Recommended:

1. index.html loads pages/invoicing.html
2. index.html loads js/invoicing.js
3. index.html calls initializeInvoicing()

This prevents duplicate event listeners.
========================================================= */
