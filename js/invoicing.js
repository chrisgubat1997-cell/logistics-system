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
const SALES_ORDER_STORAGE_KEY = "logitechSalesOrders";


/* =========================================================
   MODULE STATE
========================================================= */

let invoicingInitialized = false;

let invoiceRecords = [];
let salesOrderRecords = [];

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

    invoiceRecords =
        getLocalStorageArray(INVOICE_STORAGE_KEY);

    salesOrderRecords =
        getLocalStorageArray(SALES_ORDER_STORAGE_KEY);

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

    renderRecentSalesOrders();

    invoicingInitialized = true;


    console.log(
        "LOGIS-TECH: Invoicing module initialized."
    );

}


/* =========================================================
   BIND EVENTS
========================================================= */

function bindInvoicingEvents() {


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



    /* =====================================================
       SALES ORDER SEARCH BUTTON
    ===================================================== */

    const salesOrderSearchBtn =
        document.getElementById(
            "salesOrderSearchBtn"
        );

    if (salesOrderSearchBtn) {

        salesOrderSearchBtn.addEventListener(
            "click",
            toggleSalesOrderSearch
        );

    }



    /* =====================================================
       SALES ORDER SEARCH INPUT
    ===================================================== */

    const salesOrderSearchInput =
        document.getElementById(
            "salesOrderSearchInput"
        );

    if (salesOrderSearchInput) {

        salesOrderSearchInput.addEventListener(
            "input",
            handleSalesOrderSearch
        );

        salesOrderSearchInput.addEventListener(
            "keydown",
            handleSalesOrderSearchKeyboard
        );

    }



    /* =====================================================
       CLEAR SALES ORDER SEARCH
    ===================================================== */

    const salesOrderSearchClearBtn =
        document.getElementById(
            "salesOrderSearchClearBtn"
        );

    if (salesOrderSearchClearBtn) {

        salesOrderSearchClearBtn.addEventListener(
            "click",
            clearSalesOrderSearch
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

function refreshInvoicing() {

    const refreshButton =
        document.getElementById(
            "refreshInvoiceBtn"
        );


    /* Reload LocalStorage data */

    loadInvoicingData();


    /* Re-render everything */

    renderInvoiceSummary();

    renderRecentInvoices();

    renderRecentSalesOrders();


    /* Clear searches */

    clearInvoiceSearch(false);

    clearSalesOrderSearch(false);


    /* Button animation */

    if (refreshButton) {

        refreshButton.classList.add(
            "is-refreshing"
        );

        setTimeout(() => {

            refreshButton.classList.remove(
                "is-refreshing"
            );

        }, 500);

    }


    console.log(
        "LOGIS-TECH: Invoicing data refreshed."
    );

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
   TOGGLE SALES ORDER SEARCH
========================================================= */

function toggleSalesOrderSearch() {

    const searchBox =
        document.getElementById(
            "salesOrderSearchBox"
        );

    const searchInput =
        document.getElementById(
            "salesOrderSearchInput"
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
   SALES ORDER SEARCH
========================================================= */

function handleSalesOrderSearch(event) {

    const query =
        String(event.target.value || "")
            .trim()
            .toLowerCase();


    clearTimeout(salesOrderSearchTimer);


    salesOrderSearchTimer = setTimeout(() => {

        if (!query) {

            removeSalesOrderSuggestions();

            renderRecentSalesOrders();

            return;

        }


        const results =
            filterSalesOrders(query);


        renderSalesOrderSearchSuggestions(
            results,
            query
        );


        renderSalesOrderTable(results);

    }, 120);

}


/* =========================================================
   FILTER SALES ORDERS
========================================================= */

function filterSalesOrders(query) {

    return salesOrderRecords.filter(so => {

        const soNo =
            getRecordValue(
                so,
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
                so,
                [
                    "client",
                    "clientName",
                    "Client"
                ]
            );

        const project =
            getRecordValue(
                so,
                [
                    "project",
                    "projectName",
                    "Project"
                ]
            );

        const poNo =
            getRecordValue(
                so,
                [
                    "poNo",
                    "poNumber",
                    "P.O. No."
                ]
            );


        const searchText = [

            soNo,
            client,
            project,
            poNo

        ]
            .join(" ")
            .toLowerCase();


        return searchText.includes(query);

    });

}


/* =========================================================
   SALES ORDER SEARCH SUGGESTIONS
========================================================= */

function renderSalesOrderSearchSuggestions(
    results,
    query
) {

    removeSalesOrderSuggestions();


    const searchBox =
        document.getElementById(
            "salesOrderSearchBox"
        );


    if (!searchBox) {
        return;
    }


    const wrapper =
        document.createElement("div");


    wrapper.className =
        "sales-order-search-suggestions";


    wrapper.id =
        "salesOrderSearchSuggestions";


    if (!results.length) {

        wrapper.innerHTML = `

            <div class="search-suggestion-empty">
                No sales order found for
                "<strong>${escapeHtml(query)}</strong>"
            </div>

        `;

        searchBox.appendChild(wrapper);

        return;

    }


    results
        .slice(0, 8)
        .forEach((so, index) => {

            const soNo =
                getRecordValue(
                    so,
                    [
                        "soNo",
                        "salesOrderNo",
                        "salesOrder",
                        "SO No."
                    ]
                ) || "—";


            const client =
                getRecordValue(
                    so,
                    [
                        "client",
                        "clientName"
                    ]
                ) || "—";


            const project =
                getRecordValue(
                    so,
                    [
                        "project",
                        "projectName"
                    ]
                ) || "—";


            const status =
                getRecordValue(
                    so,
                    [
                        "status",
                        "Status"
                    ]
                ) || "—";


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
                        ${escapeHtml(soNo)}
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
                        ${escapeHtml(status)}
                    </strong>

                </span>

            `;


            item.addEventListener(
                "click",
                () => {

                    selectSalesOrderSuggestion(
                        so
                    );

                }
            );


            wrapper.appendChild(item);

        });


    searchBox.appendChild(wrapper);

}


/* =========================================================
   SELECT SALES ORDER SUGGESTION
========================================================= */

function selectSalesOrderSuggestion(so) {

    const soNo =
        getRecordValue(
            so,
            [
                "soNo",
                "salesOrderNo",
                "salesOrder"
            ]
        );


    const searchInput =
        document.getElementById(
            "salesOrderSearchInput"
        );


    if (searchInput) {

        searchInput.value =
            soNo || "";

    }


    removeSalesOrderSuggestions();

    renderSalesOrderTable([so]);

}


/* =========================================================
   SALES ORDER KEYBOARD
========================================================= */

function handleSalesOrderSearchKeyboard(event) {

    if (event.key === "Escape") {

        removeSalesOrderSuggestions();

        return;

    }

}


/* =========================================================
   CLEAR SALES ORDER SEARCH
========================================================= */

function clearSalesOrderSearch(
    render = true
) {

    const input =
        document.getElementById(
            "salesOrderSearchInput"
        );


    if (input) {
        input.value = "";
    }


    removeSalesOrderSuggestions();


    if (render) {
        renderRecentSalesOrders();
    }

}


/* =========================================================
   REMOVE SALES ORDER SUGGESTIONS
========================================================= */

function removeSalesOrderSuggestions() {

    const existing =
        document.getElementById(
            "salesOrderSearchSuggestions"
        );


    if (existing) {
        existing.remove();
    }

}


/* =========================================================
   RENDER SUMMARY
========================================================= */

function renderInvoiceSummary() {

    const totalInvoice =
        document.getElementById(
            "totalInvoice"
        );

    const todaysInvoiced =
        document.getElementById(
            "todaysInvoiced"
        );

    const ongoingInvoice =
        document.getElementById(
            "ongoingInvoice"
        );

    const cancelledInvoice =
        document.getElementById(
            "cancelledInvoice"
        );


    if (totalInvoice) {

        totalInvoice.textContent =
            invoiceRecords.length;

    }


    const today =
        getTodayString();


    const todayCount =
        invoiceRecords.filter(invoice => {

            const date =
                getRecordValue(
                    invoice,
                    [
                        "invoiceDate",
                        "date",
                        "Invoice Date"
                    ]
                );

            return normalizeDate(date) === today;

        }).length;


    if (todaysInvoiced) {

        todaysInvoiced.textContent =
            todayCount;

    }


    const ongoingCount =
        invoiceRecords.filter(invoice => {

            const status =
                String(
                    getRecordValue(
                        invoice,
                        [
                            "status",
                            "invoiceStatus",
                            "Status"
                        ]
                    ) || ""
                )
                    .trim()
                    .toUpperCase();


            return (
                status === "ONGOING" ||
                status === "DRAFT"
            );

        }).length;


    if (ongoingInvoice) {

        ongoingInvoice.textContent =
            ongoingCount;

    }


    const cancelledCount =
        invoiceRecords.filter(invoice => {

            const status =
                String(
                    getRecordValue(
                        invoice,
                        [
                            "status",
                            "invoiceStatus",
                            "Status"
                        ]
                    ) || ""
                )
                    .trim()
                    .toUpperCase();


            return status === "CANCELLED";

        }).length;


    if (cancelledInvoice) {

        cancelledInvoice.textContent =
            cancelledCount;

    }

}


/* =========================================================
   RENDER RECENT INVOICES
========================================================= */

function renderRecentInvoices() {

    renderInvoiceTable(
        invoiceRecords.slice(0, 30)
    );

}


/* =========================================================
   RENDER INVOICE TABLE
========================================================= */

function renderInvoiceTable(records) {

    const tbody =
        document.getElementById(
            "recentInvoiceTableBody"
        );


    if (!tbody) {
        return;
    }


    if (!records.length) {

        tbody.innerHTML = `

            <tr class="empty-row">

                <td colspan="8">
                    No invoice records found.
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        records
            .slice(0, 30)
            .map(invoice => {

                const invoiceNo =
                    getRecordValue(
                        invoice,
                        [
                            "invoiceNo",
                            "invoiceNumber",
                            "invoice_no"
                        ]
                    ) || "—";


                const soNo =
                    getRecordValue(
                        invoice,
                        [
                            "soNo",
                            "salesOrderNo"
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


                const date =
                    getRecordValue(
                        invoice,
                        [
                            "invoiceDate",
                            "date"
                        ]
                    ) || "—";


                const amount =
                    getRecordValue(
                        invoice,
                        [
                            "totalAmount",
                            "total",
                            "grandTotal",
                            "amount"
                        ]
                    );


                const status =
                    getRecordValue(
                        invoice,
                        [
                            "status",
                            "invoiceStatus"
                        ]
                    ) || "ONGOING";


                return `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(invoiceNo)}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(soNo)}
                        </td>

                        <td>
                            ${escapeHtml(client)}
                        </td>

                        <td>
                            ${escapeHtml(project)}
                        </td>

                        <td>
                            ${escapeHtml(
                                formatDisplayDate(date)
                            )}
                        </td>

                        <td>
                            <strong>
                                ${formatCurrency(amount)}
                            </strong>
                        </td>

                        <td>
                            <span
                                class="status-badge
                                ${getStatusClass(status)}"
                            >
                                ${escapeHtml(status)}
                            </span>
                        </td>

                        <td>

                            <button
                                type="button"
                                class="table-action-btn"
                                data-invoice-view="${escapeHtml(
                                    invoiceNo
                                )}"
                            >
                                VIEW
                            </button>

                        </td>

                    </tr>

                `;

            })
            .join("");


    bindInvoiceViewButtons();

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
   RENDER RECENT SALES ORDERS
========================================================= */

function renderRecentSalesOrders() {

    renderSalesOrderTable(
        salesOrderRecords.slice(0, 30)
    );

}


/* =========================================================
   RENDER SALES ORDER TABLE
========================================================= */

function renderSalesOrderTable(records) {

    const tbody =
        document.getElementById(
            "recentSalesOrderTableBody"
        );


    if (!tbody) {
        return;
    }


    if (!records.length) {

        tbody.innerHTML = `

            <tr class="empty-row">

                <td colspan="7">
                    No sales order records found.
                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        records
            .slice(0, 30)
            .map(so => {

                const soNo =
                    getRecordValue(
                        so,
                        [
                            "soNo",
                            "salesOrderNo",
                            "salesOrder"
                        ]
                    ) || "—";


                const client =
                    getRecordValue(
                        so,
                        [
                            "client",
                            "clientName"
                        ]
                    ) || "—";


                const project =
                    getRecordValue(
                        so,
                        [
                            "project",
                            "projectName"
                        ]
                    ) || "—";


                const date =
                    getRecordValue(
                        so,
                        [
                            "date",
                            "soDate",
                            "salesOrderDate"
                        ]
                    ) || "—";


                const status =
                    getRecordValue(
                        so,
                        [
                            "status"
                        ]
                    ) || "ACTIVE";


                const balance =
                    getRecordValue(
                        so,
                        [
                            "balance",
                            "balanceAmount"
                        ]
                    );


                return `

                    <tr>

                        <td>
                            <strong>
                                ${escapeHtml(soNo)}
                            </strong>
                        </td>

                        <td>
                            ${escapeHtml(client)}
                        </td>

                        <td>
                            ${escapeHtml(project)}
                        </td>

                        <td>
                            ${escapeHtml(
                                formatDisplayDate(date)
                            )}
                        </td>

                        <td>

                            <span
                                class="status-badge
                                ${getStatusClass(status)}"
                            >
                                ${escapeHtml(status)}
                            </span>

                        </td>

                        <td>
                            ${formatCurrency(balance)}
                        </td>

                        <td>

                            <button
                                type="button"
                                class="table-action-btn"
                                data-so-select="${escapeHtml(soNo)}"
                            >
                                SELECT
                            </button>

                        </td>

                    </tr>

                `;

            })
            .join("");


    bindSalesOrderSelectButtons();

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
