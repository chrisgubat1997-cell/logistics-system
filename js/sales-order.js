/* =========================================================
   LOGIS-TECH SYSTEM
   SALES ORDER MODULE
   sales-order.js
   VERSION: 20261007-01
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const SALES_ORDER_API_URL =
        "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

    const CREATE_SALES_ORDER_PAGE =
        "pages/create-sales-order.html";

    const API_MAX_RETRIES = 3;
    const API_RETRY_DELAY = 800;

    const SO_FILE_MAX_SIZE =
        10 * 1024 * 1024;

    const VAT_RATE = 0.12;


    /* =====================================================
       STATE
    ===================================================== */

    let salesOrders = [];

    let selectedSO = null;

    let currentSO = null;

    let soDetailsEditMode = false;

    let salesOrdersLoaded = false;

    let customerModuleLoaded = false;

    const soDetailsCache = {};


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initializeSalesOrderModule() {

        console.log(
            "========================================"
        );

        console.log(
            "LOGIS-TECH SALES ORDER MODULE"
        );

        console.log(
            "VERSION: 20261007-01"
        );

        console.log(
            "========================================"
        );


        bindSalesOrderEvents();

        loadSOList();

    }


    /* =====================================================
       EVENT BINDINGS
    ===================================================== */

    function bindSalesOrderEvents() {

        const searchInput =
            document.getElementById("soSearchInput");

        if (searchInput) {

            searchInput.addEventListener(
                "input",
                function () {

                    renderSOList();

                }
            );

        }


        const statusFilter =
            document.getElementById("soStatusFilter");

        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                function () {

                    renderSOList();

                }
            );

        }


        const paymentFilter =
            document.getElementById("soPaymentFilter");

        if (paymentFilter) {

            paymentFilter.addEventListener(
                "change",
                function () {

                    renderSOList();

                }
            );

        }


        const fileInput =
            document.getElementById("detailSOFileInput");

        if (fileInput) {

            fileInput.addEventListener(
                "change",
                handleDetailFileSelected
            );

        }

    }


    /* =====================================================
       API
    ===================================================== */

    async function salesOrderAPI(
        action,
        data = {},
        retryCount = 0
    ) {

        try {

            const response =
                await fetch(
                    SALES_ORDER_API_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "text/plain;charset=utf-8"
                        },

                        body: JSON.stringify({
                            action: action,
                            data: data
                        })
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "HTTP " + response.status
                );

            }


            const text =
                await response.text();


            let result;

            try {

                result =
                    JSON.parse(text);

            } catch (parseError) {

                console.error(
                    "Invalid API response:",
                    text
                );

                throw new Error(
                    "Invalid server response."
                );

            }


            if (
                result &&
                result.success === false
            ) {

                throw new Error(
                    result.message ||
                    "API request failed."
                );

            }


            return result;

        } catch (error) {

            console.error(
                "Sales Order API Error:",
                action,
                error
            );


            if (
                retryCount <
                API_MAX_RETRIES
            ) {

                await delay(
                    API_RETRY_DELAY *
                    (retryCount + 1)
                );


                return salesOrderAPI(
                    action,
                    data,
                    retryCount + 1
                );

            }


            throw error;

        }

    }


    /* =====================================================
       LOAD SALES ORDERS
    ===================================================== */

    /* =====================================================
   LOAD SALES ORDERS
   CACHE-FIRST VERSION
===================================================== */

async function loadSOList(
    forceRefresh = false
) {

    try {

        showLoading(true);


        /* =================================================
           1. ALREADY LOADED IN CURRENT SESSION
        ================================================= */

        if (
            salesOrdersLoaded &&
            !forceRefresh
        ) {

            renderSOList();

            updateSOSummary();

            return;

        }


        /* =================================================
           2. TRY LOCAL INDEXEDDB CACHE FIRST
        ================================================= */

        if (
            !forceRefresh &&
            window.LogisTechCache
        ) {

            try {

                const cachedSalesOrders =
                    await window.LogisTechCache.getAll(
                        "salesOrders"
                    );


                if (
                    Array.isArray(
                        cachedSalesOrders
                    ) &&
                    cachedSalesOrders.length > 0
                ) {

                    console.log(
                        "LOGIS-TECH: Loading Sales Orders from local cache..."
                    );


                    salesOrders =
                        normalizeSalesOrders(
                            cachedSalesOrders
                        );


                    salesOrdersLoaded =
                        true;


                    renderSOList();

                    updateSOSummary();


                    console.log(
                        "LOGIS-TECH: Sales Orders loaded from cache:",
                        salesOrders.length
                    );


                    /*
                     * IMPORTANT:
                     * Do NOT wait for Google Sheets here.
                     *
                     * Background Sync Manager will check
                     * whether the data has changed.
                     */

                    return;

                }

            } catch (cacheError) {

                console.warn(
                    "Sales Order cache unavailable. Falling back to API.",
                    cacheError
                );

            }

        }


        /* =================================================
           3. NO CACHE → LOAD FROM GOOGLE APPS SCRIPT
        ================================================= */

        console.log(
            "LOGIS-TECH: No Sales Order cache found."
        );

        console.log(
            "LOGIS-TECH: Loading Sales Orders from API..."
        );


        const result =
            await salesOrderAPI(
                "getSalesOrders",
                {}
            );


        salesOrders =
            normalizeSalesOrders(
                result
            );


        salesOrdersLoaded =
            true;


        /* =================================================
           4. SAVE API RESULT TO CACHE
        ================================================= */

        if (
            window.LogisTechCache &&
            salesOrders.length > 0
        ) {

            try {

                await window.LogisTechCache.replaceAll(
                    "salesOrders",
                    salesOrders
                );


                console.log(
                    "LOGIS-TECH: Sales Orders saved to local cache."
                );

            } catch (cacheError) {

                console.warn(
                    "Unable to save Sales Orders to cache:",
                    cacheError
                );

            }

        }


        /* =================================================
           5. DISPLAY
        ================================================= */

        renderSOList();

        updateSOSummary();


    } catch (error) {

        console.error(
            "Unable to load sales orders:",
            error
        );


        /*
         * If API failed but cache exists,
         * try showing cached data.
         */

        if (
            window.LogisTechCache
        ) {

            try {

                const cachedSalesOrders =
                    await window.LogisTechCache.getAll(
                        "salesOrders"
                    );


                if (
                    Array.isArray(
                        cachedSalesOrders
                    ) &&
                    cachedSalesOrders.length > 0
                ) {

                    salesOrders =
                        normalizeSalesOrders(
                            cachedSalesOrders
                        );


                    salesOrdersLoaded =
                        true;


                    renderSOList();

                    updateSOSummary();


                    console.warn(
                        "LOGIS-TECH: Using cached Sales Orders because API is unavailable."
                    );


                    return;

                }

            } catch (cacheError) {

                console.error(
                    "Unable to read fallback cache:",
                    cacheError
                );

            }

        }


        showError(
            "Unable to load Sales Orders.\n\n" +
            error.message
        );


    } finally {

        showLoading(false);

    }

}


    /* =====================================================
       NORMALIZE SALES ORDERS
    ===================================================== */

    function normalizeSalesOrders(result) {

        if (!result) {
            return [];
        }


        if (Array.isArray(result)) {
            return result;
        }


        if (
            Array.isArray(result.records)
        ) {

            return result.records;

        }


        if (
            Array.isArray(result.data)
        ) {

            return result.data;

        }


        if (
            result.data &&
            Array.isArray(result.data.records)
        ) {

            return result.data.records;

        }


        return [];

    }


    /* =====================================================
       RENDER LIST
    ===================================================== */

    function renderSOList() {

        const tbody =
            document.getElementById(
                "soTableBody"
            );

        const emptyState =
            document.getElementById(
                "soEmptyState"
            );


        if (!tbody) {
            return;
        }


        const filtered =
            getFilteredSalesOrders();


        tbody.innerHTML = "";


        if (!filtered.length) {

            if (emptyState) {

                emptyState.style.display =
                    "block";

            }

            return;

        }


        if (emptyState) {

            emptyState.style.display =
                "none";

        }


        filtered.forEach(
            function (so, index) {

                const row =
                    document.createElement("tr");


                const soNumber =
                    getSOValue(
                        so,
                        [
                            "SO_NUMBER",
                            "soNumber",
                            "so_number"
                        ]
                    );


                const date =
                    getSOValue(
                        so,
                        [
                            "DATE_CREATION",
                            "dateCreation",
                            "date",
                            "DATE"
                        ]
                    );


                const client =
                    getSOValue(
                        so,
                        [
                            "CLIENT_NAME",
                            "clientName",
                            "CLIENT"
                        ]
                    );


                const salesEngineer =
                    getSOValue(
                        so,
                        [
                            "SALES_ENGINEER",
                            "salesEngineer",
                            "SE"
                        ]
                    );


                const project =
                    getSOValue(
                        so,
                        [
                            "PROJECT",
                            "project"
                        ]
                    );


                const poNumber =
                    getSOValue(
                        so,
                        [
                            "PO_NUMBER",
                            "poNumber"
                        ]
                    );


                const terms =
                    getSOValue(
                        so,
                        [
                            "TERMS",
                            "terms"
                        ]
                    );


                const grandTotal =
                    toNumber(
                        getSOValue(
                            so,
                            [
                                "GRAND_TOTAL",
                                "grandTotal"
                            ]
                        )
                    );


                const drNumber =
                    getSOValue(
                        so,
                        [
                            "DR_NUMBER",
                            "drNumber",
                            "DR"
                        ]
                    ) || "-";


                const invoiceNumber =
                    getSOValue(
                        so,
                        [
                            "INVOICE_NUMBER",
                            "invoiceNumber",
                            "INVOICE"
                        ]
                    ) || "-";


                const paymentStatus =
                    getSOValue(
                        so,
                        [
                            "PAYMENT_STATUS",
                            "paymentStatus",
                            "PAYMENT"
                        ]
                    ) || "-";


                const status =
                    getSOValue(
                        so,
                        [
                            "STATUS",
                            "status"
                        ]
                    ) || "ACTIVE";


                row.dataset.soNumber =
                    soNumber;


                row.innerHTML = `

                    <td>
                        <strong>
                            ${escapeHTML(soNumber || "-")}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(date)
                        )}
                    </td>

                    <td>
                        ${escapeHTML(client || "-")}
                    </td>

                    <td>
                        ${escapeHTML(
                            salesEngineer || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(project || "-")}
                    </td>

                    <td>
                        ${escapeHTML(
                            poNumber || "-"
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            terms || "-"
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            grandTotal
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            drNumber
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            invoiceNumber
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            paymentStatus
                        )}
                    </td>

                    <td>
                        ${renderStatusBadge(
                            status
                        )}
                    </td>

                `;


                /* =========================================
                   CLICK
                ========================================== */

                row.addEventListener(
                    "click",
                    function () {

                        selectSO(
                            so,
                            row
                        );

                    }
                );


                /* =========================================
                   DOUBLE CLICK
                ========================================== */

                row.addEventListener(
                    "dblclick",
                    function () {

                        const number =
                            getSOValue(
                                so,
                                [
                                    "SO_NUMBER",
                                    "soNumber",
                                    "so_number"
                                ]
                            );


                        if (number) {

                            openSODetails(
                                number
                            );

                        }

                    }
                );


                tbody.appendChild(row);

            }
        );

    }


    /* =====================================================
       RECENT SALES ORDERS
    ===================================================== */

    function renderRecentSalesOrders(
        records = salesOrders
    ) {

        const recent =
            [...records]
                .sort(
                    function (a, b) {

                        return (
                            new Date(
                                getSOValue(
                                    b,
                                    [
                                        "DATE_CREATION",
                                        "dateCreation",
                                        "DATE"
                                    ]
                                ) || 0
                            ) -
                            new Date(
                                getSOValue(
                                    a,
                                    [
                                        "DATE_CREATION",
                                        "dateCreation",
                                        "DATE"
                                    ]
                                ) || 0
                            )
                        );

                    }
                )
                .slice(0, 10);


        renderSOListFromRecords(
            recent
        );

    }


    /* =====================================================
       SHOW ALL
    ===================================================== */

    function showAllSalesOrders() {

        const search =
            document.getElementById(
                "soSearchInput"
            );

        const status =
            document.getElementById(
                "soStatusFilter"
            );

        const payment =
            document.getElementById(
                "soPaymentFilter"
            );


        if (search) {
            search.value = "";
        }

        if (status) {
            status.value = "";
        }

        if (payment) {
            payment.value = "";
        }


        renderSOList();

    }


    /* =====================================================
       RENDER RECORDS HELPER
    ===================================================== */

    function renderSOListFromRecords(
        records
    ) {

        const original =
            salesOrders;

        salesOrders =
            records || [];

        renderSOList();

        salesOrders =
            original;

    }


    /* =====================================================
       FILTER
    ===================================================== */

    function getFilteredSalesOrders() {

        const searchInput =
            document.getElementById(
                "soSearchInput"
            );

        const statusFilter =
            document.getElementById(
                "soStatusFilter"
            );

        const paymentFilter =
            document.getElementById(
                "soPaymentFilter"
            );


        const search =
            (
                searchInput?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const status =
            (
                statusFilter?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const payment =
            (
                paymentFilter?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        return salesOrders.filter(
            function (so) {

                const soNumber =
                    String(
                        getSOValue(
                            so,
                            [
                                "SO_NUMBER",
                                "soNumber"
                            ]
                        ) || ""
                    ).toLowerCase();


                const client =
                    String(
                        getSOValue(
                            so,
                            [
                                "CLIENT_NAME",
                                "clientName"
                            ]
                        ) || ""
                    ).toLowerCase();


                const project =
                    String(
                        getSOValue(
                            so,
                            [
                                "PROJECT",
                                "project"
                            ]
                        ) || ""
                    ).toLowerCase();


                const po =
                    String(
                        getSOValue(
                            so,
                            [
                                "PO_NUMBER",
                                "poNumber"
                            ]
                        ) || ""
                    ).toLowerCase();


                const currentStatus =
                    String(
                        getSOValue(
                            so,
                            [
                                "STATUS",
                                "status"
                            ]
                        ) || ""
                    ).toLowerCase();


                const currentPayment =
                    String(
                        getSOValue(
                            so,
                            [
                                "PAYMENT_STATUS",
                                "paymentStatus",
                                "PAYMENT"
                            ]
                        ) || ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    soNumber.includes(search) ||
                    client.includes(search) ||
                    project.includes(search) ||
                    po.includes(search);


                const matchesStatus =
                    !status ||
                    currentStatus === status;


                const matchesPayment =
                    !payment ||
                    currentPayment === payment;


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesPayment
                );

            }
        );

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function updateSOSummary() {

        const total =
            salesOrders.length;


        let partial = 0;
        let active = 0;
        let completed = 0;
        let cancelled = 0;


        salesOrders.forEach(
            function (so) {

                const status =
                    String(
                        getSOValue(
                            so,
                            [
                                "STATUS",
                                "status"
                            ]
                        ) || ""
                    ).toUpperCase();


                if (
                    status === "PARTIAL"
                ) {

                    partial++;

                }


                if (
                    status === "ACTIVE" ||
                    status === "OPEN" ||
                    status === "POSTED"
                ) {

                    active++;

                }


                if (
                    status === "COMPLETED" ||
                    status === "CLOSED"
                ) {

                    completed++;

                }


                if (
                    status === "CANCELLED" ||
                    status === "CANCELED"
                ) {

                    cancelled++;

                }

            }
        );


        setText(
            "totalSOCount",
            total
        );

        setText(
            "partialSOCount",
            partial
        );

        setText(
            "activeSOCount",
            active
        );

        setText(
            "completedSOCount",
            completed
        );

        setText(
            "cancelledSOCount",
            cancelled
        );

    }


    /* =====================================================
       SUMMARY FILTER
    ===================================================== */

    function filterSOBySummary(
        filter
    ) {

        const status =
            document.getElementById(
                "soStatusFilter"
            );


        const payment =
            document.getElementById(
                "soPaymentFilter"
            );


        if (payment) {
            payment.value = "";
        }


        if (status) {

            switch (
                String(filter).toLowerCase()
            ) {

                case "partial":
                    status.value = "PARTIAL";
                    break;

                case "active":
                    status.value = "ACTIVE";
                    break;

                case "completed":
                    status.value = "COMPLETED";
                    break;

                case "cancelled":
                    status.value = "CANCELLED";
                    break;

                default:
                    status.value = "";

            }

        }


        renderSOList();

    }


    /* =====================================================
       SELECT SO
    ===================================================== */

    function selectSO(
        so,
        row
    ) {

        selectedSO = so;


        document
            .querySelectorAll(
                "#soTableBody tr"
            )
            .forEach(
                function (item) {

                    item.classList.remove(
                        "selected"
                    );

                }
            );


        if (row) {

            row.classList.add(
                "selected"
            );

        }


        updateSOSelectionUI();

    }


    /* =====================================================
       UPDATE SELECTION UI
    ===================================================== */

    function updateSOSelectionUI() {

        const updateButton =
            document.getElementById(
                "updateSOButton"
            );


        const cancelButton =
            document.getElementById(
                "cancelSOButton"
            );


        const selectionText =
            document.getElementById(
                "soSelectionText"
            );


        const so =
            selectedSO;


        if (!so) {

            if (selectionText) {

                selectionText.textContent =
                    "No sales order selected";

            }


            if (updateButton) {

                updateButton.disabled =
                    true;

            }


            if (cancelButton) {

                cancelButton.disabled =
                    true;

            }


            return;

        }


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        if (selectionText) {

            selectionText.textContent =
                "Selected: " +
                soNumber;

        }


        if (updateButton) {

            updateButton.disabled =
                false;

        }


        if (cancelButton) {

            cancelButton.disabled =
                false;

        }

    }


    /* =====================================================
       OPEN SO DETAILS
    ===================================================== */

    async function openSODetails(
        soNumber,
        enableEditAfterLoad = false
    ) {

        if (!soNumber) {

            alert(
                "Sales Order number is required."
            );

            return;

        }


        try {

            showLoading(true);


            /*
             * IMPORTANT:
             * Use getSOTransactionDetails instead
             * of getSalesOrder.
             *
             * This loads:
             * SO
             * Items
             * Deliveries
             * DR
             * Invoices
             * Payments
             * Summary
             */

            const result =
                await salesOrderAPI(
                    "getSOTransactionDetails",
                    {
                        soNumber:
                            soNumber
                    }
                );


            const transactionData =
                normalizeTransactionResult(
                    result
                );


            currentSO =
                transactionData;


            soDetailsCache[
                soNumber
            ] =
                transactionData;


            showSODetailsPage(
                transactionData
            );


            if (
                enableEditAfterLoad
            ) {

                enableSOUpdate();

            }


        } catch (error) {

            console.error(
                "Unable to open SO:",
                error
            );


            alert(
                "Unable to load Sales Order.\n\n" +
                error.message
            );

        } finally {

            showLoading(false);

        }

    }


    /* =====================================================
       NORMALIZE TRANSACTION RESULT
    ===================================================== */

    function normalizeTransactionResult(
        result
    ) {

        if (!result) {

            return {
                salesOrder: {},
                so: {},
                items: [],
                deliveries: [],
                deliveryReceipts: [],
                invoices: [],
                payments: [],
                summary: {}
            };

        }


        return {

            salesOrder:
                result.salesOrder ||
                result.so ||
                result.data?.salesOrder ||
                result.data?.so ||
                {},

            so:
                result.so ||
                result.salesOrder ||
                result.data?.so ||
                result.data?.salesOrder ||
                {},

            items:
                result.items ||
                result.data?.items ||
                [],

            deliveries:
                result.deliveries ||
                result.data?.deliveries ||
                [],

            deliveryReceipts:
                result.deliveryReceipts ||
                result.data?.deliveryReceipts ||
                [],

            invoices:
                result.invoices ||
                result.data?.invoices ||
                [],

            payments:
                result.payments ||
                result.data?.payments ||
                [],

            summary:
                result.summary ||
                result.data?.summary ||
                {}

        };

    }


    /* =====================================================
       SHOW DETAILS PAGE
    ===================================================== */

    function showSODetailsPage(
        data
    ) {

        const listView =
            document.getElementById(
                "salesOrderListView"
            );


        const details =
            document.getElementById(
                "soDetails"
            );


        if (listView) {

            listView.style.display =
                "none";

        }


        if (details) {

            details.style.display =
                "block";

        }


        renderSODetails(
            data
        );


        renderSODetailItems(
            data.items || []
        );


        renderSOTransactions(
            data
        );


        loadSOFiles(
            data
        );


        setDetailsEditMode(
            false
        );

    }


    /* =====================================================
       RENDER SO DETAILS
    ===================================================== */

    function renderSODetails(
        data
    ) {

        const so =
            data.salesOrder ||
            data.so ||
            {};


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        const date =
            getSOValue(
                so,
                [
                    "DATE_CREATION",
                    "dateCreation",
                    "DATE",
                    "date"
                ]
            );


        const client =
            getSOValue(
                so,
                [
                    "CLIENT_NAME",
                    "clientName"
                ]
            );


        const salesEngineer =
            getSOValue(
                so,
                [
                    "SALES_ENGINEER",
                    "salesEngineer",
                    "SE"
                ]
            );


        const attention =
            getSOValue(
                so,
                [
                    "ATTENTION",
                    "attention"
                ]
            );


        const tin =
            getSOValue(
                so,
                [
                    "TIN",
                    "tin"
                ]
            );


        const poNumber =
            getSOValue(
                so,
                [
                    "PO_NUMBER",
                    "poNumber"
                ]
            );


        const terms =
            getSOValue(
                so,
                [
                    "TERMS",
                    "terms"
                ]
            );


        const jobOrder =
            getSOValue(
                so,
                [
                    "JOB_ORDER",
                    "jobOrder",
                    "JO"
                ]
            );


        const billingAddress =
            getSOValue(
                so,
                [
                    "BILLING_ADDRESS",
                    "billingAddress"
                ]
            );


        const deliveryAddress =
            getSOValue(
                so,
                [
                    "DELIVERY_ADDRESS",
                    "deliveryAddress"
                ]
            );


        const project =
            getSOValue(
                so,
                [
                    "PROJECT",
                    "project"
                ]
            );


        const subtotal =
            toNumber(
                getSOValue(
                    so,
                    [
                        "SUBTOTAL",
                        "subtotal"
                    ]
                )
            );


        const discount =
            toNumber(
                getSOValue(
                    so,
                    [
                        "DISCOUNT",
                        "discount"
                    ]
                )
            );


        const vatable =
            toNumber(
                getSOValue(
                    so,
                    [
                        "VATABLE",
                        "vatable",
                        "VATABLE_SALES",
                        "vatableSales"
                    ]
                )
            );


        const vatAmount =
            toNumber(
                getSOValue(
                    so,
                    [
                        "VAT_AMOUNT",
                        "vatAmount",
                        "VAT"
                    ]
                )
            );


        const grandTotal =
            toNumber(
                getSOValue(
                    so,
                    [
                        "GRAND_TOTAL",
                        "grandTotal"
                    ]
                )
            );


        const status =
            getSOValue(
                so,
                [
                    "STATUS",
                    "status"
                ]
            ) || "ACTIVE";


        setValue(
            "detailSODate",
            formatDateInput(date)
        );

        setValue(
            "detailSONumber",
            soNumber
        );

        setValue(
            "detailClientName",
            client
        );

        setValue(
            "detailSE",
            salesEngineer
        );

        setValue(
            "detailAttention",
            attention
        );

        setValue(
            "detailTIN",
            tin
        );

        setValue(
            "detailPONumber",
            poNumber
        );

        setValue(
            "detailTerms",
            terms
        );

        setValue(
            "detailJobOrder",
            jobOrder
        );

        setValue(
            "detailBillingAddress",
            billingAddress
        );

        setValue(
            "detailDeliveryAddress",
            deliveryAddress
        );

        setValue(
            "detailProject",
            project
        );


        setText(
            "detailSONumberDisplay",
            soNumber || "-"
        );

        setText(
            "detailSODateDisplay",
            formatDate(date)
        );

        setText(
            "detailClientDisplay",
            client || "-"
        );

        setText(
            "detailProjectDisplay",
            project || "-"
        );

        setText(
            "detailGrandTotalDisplay",
            formatCurrency(
                grandTotal
            )
        );


        setText(
            "detailSubtotal",
            formatCurrency(
                subtotal
            )
        );

        setText(
            "detailDiscount",
            formatCurrency(
                discount
            )
        );

        setText(
            "detailVatable",
            formatCurrency(
                vatable
            )
        );

        setText(
            "detailVAT",
            formatCurrency(
                vatAmount
            )
        );

        setText(
            "detailGrandTotal",
            formatCurrency(
                grandTotal
            )
        );


        const badge =
            document.getElementById(
                "detailStatusBadge"
            );


        if (badge) {

            badge.textContent =
                status;

            badge.className =
                "so-status-badge " +
                getStatusClass(
                    status
                );

        }


        renderPostingStatus(
            so
        );

    }


    /* =====================================================
       POSTING STATUS
    ===================================================== */

    function renderPostingStatus(
        so
    ) {

        const status =
            String(
                getSOValue(
                    so,
                    [
                        "POSTING_STATUS",
                        "postingStatus",
                        "POST_STATUS",
                        "postStatus"
                    ]
                ) || ""
            ).toUpperCase();


        const postedBy =
            getSOValue(
                so,
                [
                    "POSTED_BY",
                    "postedBy"
                ]
            );


        const postedDate =
            getSOValue(
                so,
                [
                    "POSTED_DATE",
                    "postedDate"
                ]
            );


        const isPosted =
            status === "POSTED" ||
            !!postedBy ||
            !!postedDate;


        setText(
            "soPostingStatusText",
            isPosted
                ? "Posted"
                : "Not Posted"
        );


        setText(
            "soPostingStatusDescription",
            isPosted
                ? "This Sales Order has been posted."
                : "This Sales Order has not yet been posted."
        );


        setText(
            "soPostedBy",
            postedBy || "-"
        );


        setText(
            "soPostedDate",
            postedDate
                ? formatDateTime(postedDate)
                : "-"
        );


        const panel =
            document.getElementById(
                "soPostingStatusPanel"
            );


        if (panel) {

            panel.classList.toggle(
                "posted",
                isPosted
            );

        }

    }


    /* =====================================================
       RENDER ITEMS
    ===================================================== */

    function renderSODetailItems(
        items
    ) {

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

                    <td
                        colspan="9"
                        class="so-table-empty"
                    >
                        No items found.
                    </td>

                </tr>

            `;

            return;

        }


        items.forEach(
            function (item, index) {

                const row =
                    document.createElement("tr");


                const itemCode =
                    getSOValue(
                        item,
                        [
                            "ITEM_CODE",
                            "itemCode",
                            "CODE"
                        ]
                    ) || "";


                const description =
                    getSOValue(
                        item,
                        [
                            "DESCRIPTION",
                            "description",
                            "ITEM_DESCRIPTION"
                        ]
                    ) || "";


                const unit =
                    getSOValue(
                        item,
                        [
                            "UNIT",
                            "unit",
                            "UOM"
                        ]
                    ) || "";


                const quantity =
                    toNumber(
                        getSOValue(
                            item,
                            [
                                "QUANTITY",
                                "quantity",
                                "QTY"
                            ]
                        )
                    );


                const unitPrice =
                    toNumber(
                        getSOValue(
                            item,
                            [
                                "UNIT_PRICE",
                                "unitPrice"
                            ]
                        )
                    );


                const discount =
                    toNumber(
                        getSOValue(
                            item,
                            [
                                "DISCOUNT",
                                "discount"
                            ]
                        )
                    );


                const amount =
                    toNumber(
                        getSOValue(
                            item,
                            [
                                "AMOUNT",
                                "amount",
                                "TOTAL"
                            ]
                        )
                    ) ||
                    (
                        quantity *
                        unitPrice
                    );


                row.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        <input
                            type="text"
                            class="detail-item-input"
                            data-field="ITEM_CODE"
                            value="${escapeAttribute(itemCode)}"
                            disabled
                        >
                    </td>

                    <td>
                        <input
                            type="text"
                            class="detail-item-input"
                            data-field="DESCRIPTION"
                            value="${escapeAttribute(description)}"
                            disabled
                        >
                    </td>

                    <td>
                        <input
                            type="text"
                            class="detail-item-input"
                            data-field="UNIT"
                            value="${escapeAttribute(unit)}"
                            disabled
                        >
                    </td>

                    <td>
                        <input
                            type="number"
                            class="detail-item-input detail-item-qty"
                            data-field="QUANTITY"
                            value="${quantity}"
                            min="0"
                            step="0.01"
                            disabled
                        >
                    </td>

                    <td>
                        <input
                            type="number"
                            class="detail-item-input detail-item-price"
                            data-field="UNIT_PRICE"
                            value="${unitPrice}"
                            min="0"
                            step="0.01"
                            disabled
                        >
                    </td>

                    <td>
                        <input
                            type="number"
                            class="detail-item-input detail-item-discount"
                            data-field="DISCOUNT"
                            value="${discount}"
                            min="0"
                            step="0.01"
                            disabled
                        >
                    </td>

                    <td class="detail-item-amount">
                        ${formatCurrency(amount)}
                    </td>

                    <td>

                        <button
                            type="button"
                            class="detail-delete-item-button"
                            onclick="deleteDetailItem(this)"
                            style="display:none;"
                        >
                            Delete
                        </button>

                    </td>

                `;


                tbody.appendChild(row);

            }
        );


        bindDetailItemCalculations();

    }


    /* =====================================================
       BIND ITEM CALCULATIONS
    ===================================================== */

    function bindDetailItemCalculations() {

        document
            .querySelectorAll(
                "#soDetailsItemsBody .detail-item-input"
            )
            .forEach(
                function (input) {

                    input.addEventListener(
                        "input",
                        calculateDetailTotals
                    );

                }
            );

    }


    /* =====================================================
       TRANSACTIONS
    ===================================================== */

    function renderSOTransactions(
        data
    ) {

        const drs =
            data.deliveryReceipts ||
            [];


        const deliveries =
            data.deliveries ||
            [];


        const invoices =
            data.invoices ||
            [];


        const payments =
            data.payments ||
            [];


        const summary =
            data.summary ||
            {};


        renderDRTransactions(
            drs,
            deliveries
        );


        renderInvoiceTransactions(
            invoices
        );


        renderPaymentTransactions(
            payments
        );


        const paidAmount =
            toNumber(
                summary.paidAmount
            );


        const paymentBalance =
            toNumber(
                summary.invoiceBalance ??
                summary.soBalance
            );


        const paymentStatus =
            summary.paymentStatus ||
            calculatePaymentStatus(
                summary
            );


        setText(
            "detailPaidAmount",
            formatCurrency(
                paidAmount
            )
        );


        setText(
            "detailPaymentBalance",
            formatCurrency(
                paymentBalance
            )
        );


        setText(
            "detailPaymentStatus",
            paymentStatus || "UNPAID"
        );

    }


    /* =====================================================
       DR TRANSACTIONS
    ===================================================== */

    function renderDRTransactions(
        drs,
        deliveries
    ) {

        const tbody =
            document.getElementById(
                "detailDRBody"
            );


        if (!tbody) {
            return;
        }


        setText(
            "detailDRCount",
            drs.length
        );

        setText(
            "detailDRHeaderCount",
            drs.length
        );


        tbody.innerHTML = "";


        if (!drs.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="so-table-empty"
                    >
                        No Delivery Receipts linked.
                    </td>

                </tr>

            `;

            return;

        }


        drs.forEach(
            function (dr) {

                const drNumber =
                    getSOValue(
                        dr,
                        [
                            "DR_NUMBER",
                            "drNumber",
                            "DOCUMENT_NUMBER"
                        ]
                    ) || "-";


                const date =
                    getSOValue(
                        dr,
                        [
                            "DATE",
                            "date",
                            "DATE_CREATION",
                            "dateCreation"
                        ]
                    );


                const dateTransfer =
                    getSOValue(
                        dr,
                        [
                            "DATE_TRANSFER",
                            "dateTransfer"
                        ]
                    );


                const dateDelivered =
                    getSOValue(
                        dr,
                        [
                            "DATE_DELIVERED",
                            "dateDelivered"
                        ]
                    );


                const status =
                    getSOValue(
                        dr,
                        [
                            "STATUS",
                            "status"
                        ]
                    ) || "-";


                const amount =
                    toNumber(
                        getSOValue(
                            dr,
                            [
                                "GRAND_TOTAL",
                                "grandTotal",
                                "TOTAL_AMOUNT",
                                "totalAmount",
                                "AMOUNT",
                                "amount"
                            ]
                        )
                    );


                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <td>
                        <strong>
                            ${escapeHTML(drNumber)}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(date)
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(dateTransfer)
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(dateDelivered)
                        )}
                    </td>

                    <td>
                        ${renderStatusBadge(
                            status
                        )}
                    </td>

                    <td>
                        ${formatCurrency(amount)}
                    </td>

                `;


                tbody.appendChild(row);

            }
        );

    }


    /* =====================================================
       INVOICE TRANSACTIONS
    ===================================================== */

    function renderInvoiceTransactions(
        invoices
    ) {

        const tbody =
            document.getElementById(
                "detailInvoiceBody"
            );


        if (!tbody) {
            return;
        }


        setText(
            "detailInvoiceCount",
            invoices.length
        );

        setText(
            "detailInvoiceHeaderCount",
            invoices.length
        );


        tbody.innerHTML = "";


        if (!invoices.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        class="so-table-empty"
                    >
                        No invoices linked.
                    </td>

                </tr>

            `;

            return;

        }


        invoices.forEach(
            function (invoice) {

                const invoiceNumber =
                    getSOValue(
                        invoice,
                        [
                            "INVOICE_NUMBER",
                            "invoiceNumber",
                            "DOCUMENT_NUMBER"
                        ]
                    ) || "-";


                const date =
                    getSOValue(
                        invoice,
                        [
                            "DATE",
                            "date",
                            "DATE_CREATION",
                            "dateCreation"
                        ]
                    );


                const drNumber =
                    getSOValue(
                        invoice,
                        [
                            "DR_NUMBER",
                            "drNumber"
                        ]
                    ) || "-";


                const amount =
                    toNumber(
                        getSOValue(
                            invoice,
                            [
                                "GRAND_TOTAL",
                                "grandTotal",
                                "TOTAL_AMOUNT",
                                "totalAmount",
                                "AMOUNT",
                                "amount"
                            ]
                        )
                    );


                const status =
                    getSOValue(
                        invoice,
                        [
                            "STATUS",
                            "status"
                        ]
                    ) || "-";


                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <td>
                        <strong>
                            ${escapeHTML(
                                invoiceNumber
                            )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHTML(
                            formatDate(date)
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            drNumber
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            amount
                        )}
                    </td>

                    <td>
                        ${renderStatusBadge(
                            status
                        )}
                    </td>

                `;


                tbody.appendChild(row);

            }
        );

    }


    /* =====================================================
       PAYMENT TRANSACTIONS
    ===================================================== */

    function renderPaymentTransactions(
        payments
    ) {

        const tbody =
            document.getElementById(
                "detailPaymentBody"
            );


        if (!tbody) {
            return;
        }


        setText(
            "detailPaymentHeaderCount",
            payments.length
        );


        tbody.innerHTML = "";


        if (!payments.length) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="so-table-empty"
                    >
                        No payments linked.
                    </td>

                </tr>

            `;

            return;

        }


        payments.forEach(
            function (payment) {

                const paymentDate =
                    getSOValue(
                        payment,
                        [
                            "PAYMENT_DATE",
                            "paymentDate",
                            "DATE",
                            "date"
                        ]
                    );


                const reference =
                    getSOValue(
                        payment,
                        [
                            "REFERENCE_NUMBER",
                            "referenceNumber",
                            "REFERENCE",
                            "reference"
                        ]
                    ) || "-";


                const invoice =
                    getSOValue(
                        payment,
                        [
                            "INVOICE_NUMBER",
                            "invoiceNumber"
                        ]
                    ) || "-";


                const amount =
                    toNumber(
                        getSOValue(
                            payment,
                            [
                                "AMOUNT",
                                "amount",
                                "PAYMENT_AMOUNT",
                                "paymentAmount"
                            ]
                        )
                    );


                const method =
                    getSOValue(
                        payment,
                        [
                            "PAYMENT_METHOD",
                            "paymentMethod",
                            "METHOD",
                            "method"
                        ]
                    ) || "-";


                const status =
                    getSOValue(
                        payment,
                        [
                            "STATUS",
                            "status"
                        ]
                    ) || "POSTED";


                const row =
                    document.createElement("tr");


                row.innerHTML = `

                    <td>
                        ${escapeHTML(
                            formatDate(paymentDate)
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            reference
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            invoice
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            amount
                        )}
                    </td>

                    <td>
                        ${escapeHTML(
                            method
                        )}
                    </td>

                    <td>
                        ${renderStatusBadge(
                            status
                        )}
                    </td>

                `;


                tbody.appendChild(row);

            }
        );

    }


    /* =====================================================
       PAYMENT STATUS
    ===================================================== */

    function calculatePaymentStatus(
        summary
    ) {

        const paid =
            toNumber(
                summary.paidAmount
            );


        const invoiceAmount =
            toNumber(
                summary.invoicedAmount
            );


        const soAmount =
            toNumber(
                summary.soAmount
            );


        const target =
            invoiceAmount ||
            soAmount;


        if (
            target <= 0 &&
            paid <= 0
        ) {

            return "UNPAID";

        }


        if (paid <= 0) {

            return "UNPAID";

        }


        if (paid >= target) {

            return "PAID";

        }


        return "PARTIAL";

    }


    /* =====================================================
       EDIT MODE
    ===================================================== */

    function setDetailsEditMode(
        enabled
    ) {

        soDetailsEditMode =
            !!enabled;


        const editableFields = [

            "detailSODate",
            "detailClientName",
            "detailSE",
            "detailAttention",
            "detailTIN",
            "detailPONumber",
            "detailTerms",
            "detailJobOrder",
            "detailBillingAddress",
            "detailDeliveryAddress",
            "detailProject"

        ];


        editableFields.forEach(
            function (id) {

                const element =
                    document.getElementById(
                        id
                    );


                if (element) {

                    element.disabled =
                        !enabled;

                }

            }
        );


        document
            .querySelectorAll(
                "#soDetailsItemsBody .detail-item-input"
            )
            .forEach(
                function (input) {

                    input.disabled =
                        !enabled;

                }
            );


        document
            .querySelectorAll(
                "#soDetailsItemsBody .detail-delete-item-button"
            )
            .forEach(
                function (button) {

                    button.style.display =
                        enabled
                            ? "inline-block"
                            : "none";

                }
            );


        const addItemButton =
            document.getElementById(
                "detailAddItemButton"
            );


        if (addItemButton) {

            addItemButton.style.display =
                enabled
                    ? "inline-flex"
                    : "none";

        }


        const addFileButton =
            document.getElementById(
                "detailAddFileButton"
            );


        if (addFileButton) {

            addFileButton.style.display =
                enabled
                    ? "inline-flex"
                    : "none";

        }


        const editButton =
            document.getElementById(
                "detailEditButton"
            );


        if (editButton) {

            editButton.style.display =
                enabled
                    ? "none"
                    : "inline-flex";

        }


        const saveButton =
            document.getElementById(
                "detailSaveButton"
            );


        if (saveButton) {

            saveButton.style.display =
                enabled
                    ? "inline-flex"
                    : "none";

        }


        const actionBar =
            document.getElementById(
                "soUpdateActionBar"
            );


        if (actionBar) {

            actionBar.style.display =
                enabled
                    ? "flex"
                    : "none";

        }

    }


    /* =====================================================
       ENABLE UPDATE
    ===================================================== */

    function enableSOUpdate() {

        if (!currentSO) {

            alert(
                "Please open a Sales Order first."
            );

            return;

        }


        setDetailsEditMode(
            true
        );


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    /* =====================================================
       UPDATE SELECTED SO
    ===================================================== */

    async function updateSelectedSO() {

        let so =
            selectedSO ||
            currentSO;


        if (!so) {

            alert(
                "Please select a Sales Order."
            );

            return;

        }


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        if (!soNumber) {

            alert(
                "Sales Order number not found."
            );

            return;

        }


        /*
         * If already viewing the SO,
         * simply enable edit mode.
         */

        if (
            currentSO &&
            getSOValue(
                currentSO.salesOrder ||
                currentSO.so ||
                {},
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            ) === soNumber
        ) {

            enableSOUpdate();

            return;

        }


        /*
         * Otherwise open the SO first,
         * then automatically enable update mode.
         */

        await openSODetails(
            soNumber,
            true
        );

    }


    /* =====================================================
       ADD ITEM
    ===================================================== */

    function addDetailItem() {

        const tbody =
            document.getElementById(
                "soDetailsItemsBody"
            );


        if (!tbody) {
            return;
        }


        const emptyRow =
            tbody.querySelector(
                ".so-table-empty"
            );


        if (emptyRow) {

            tbody.innerHTML = "";

        }


        const row =
            document.createElement("tr");


        const index =
            tbody.children.length + 1;


        row.innerHTML = `

            <td>
                ${index}
            </td>

            <td>
                <input
                    type="text"
                    class="detail-item-input"
                    data-field="ITEM_CODE"
                    value=""
                >
            </td>

            <td>
                <input
                    type="text"
                    class="detail-item-input"
                    data-field="DESCRIPTION"
                    value=""
                >
            </td>

            <td>
                <input
                    type="text"
                    class="detail-item-input"
                    data-field="UNIT"
                    value=""
                >
            </td>

            <td>
                <input
                    type="number"
                    class="detail-item-input detail-item-qty"
                    data-field="QUANTITY"
                    value="1"
                    min="0"
                    step="0.01"
                >
            </td>

            <td>
                <input
                    type="number"
                    class="detail-item-input detail-item-price"
                    data-field="UNIT_PRICE"
                    value="0"
                    min="0"
                    step="0.01"
                >
            </td>

            <td>
                <input
                    type="number"
                    class="detail-item-input detail-item-discount"
                    data-field="DISCOUNT"
                    value="0"
                    min="0"
                    step="0.01"
                >
            </td>

            <td class="detail-item-amount">
                ${formatCurrency(0)}
            </td>

            <td>

                <button
                    type="button"
                    class="detail-delete-item-button"
                    onclick="deleteDetailItem(this)"
                >
                    Delete
                </button>

            </td>

        `;


        tbody.appendChild(row);


        bindDetailItemCalculations();

        calculateDetailTotals();

    }


    /* =====================================================
       DELETE ITEM
    ===================================================== */

    function deleteDetailItem(
        button
    ) {

        const row =
            button.closest("tr");


        if (!row) {
            return;
        }


        row.remove();


        renumberDetailItems();

        calculateDetailTotals();

    }


    /* =====================================================
       RENUMBER ITEMS
    ===================================================== */

    function renumberDetailItems() {

        const rows =
            document.querySelectorAll(
                "#soDetailsItemsBody tr"
            );


        rows.forEach(
            function (row, index) {

                const firstCell =
                    row.querySelector(
                        "td:first-child"
                    );


                if (firstCell) {

                    firstCell.textContent =
                        index + 1;

                }

            }
        );

    }


    /* =====================================================
       CALCULATE TOTALS
    ===================================================== */

    function calculateDetailTotals() {

        const rows =
            document.querySelectorAll(
                "#soDetailsItemsBody tr"
            );


        let subtotal = 0;

        let discount = 0;


        rows.forEach(
            function (row) {

                const qtyInput =
                    row.querySelector(
                        ".detail-item-qty"
                    );


                const priceInput =
                    row.querySelector(
                        ".detail-item-price"
                    );


                const discountInput =
                    row.querySelector(
                        ".detail-item-discount"
                    );


                if (!qtyInput) {
                    return;
                }


                const qty =
                    toNumber(
                        qtyInput.value
                    );


                const price =
                    toNumber(
                        priceInput?.value
                    );


                const itemDiscount =
                    toNumber(
                        discountInput?.value
                    );


                const gross =
                    qty * price;


                const amount =
                    Math.max(
                        gross -
                        itemDiscount,
                        0
                    );


                subtotal += gross;

                discount +=
                    itemDiscount;


                const amountCell =
                    row.querySelector(
                        ".detail-item-amount"
                    );


                if (amountCell) {

                    amountCell.textContent =
                        formatCurrency(
                            amount
                        );

                }

            }
        );


        const vatable =
            Math.max(
                subtotal -
                discount,
                0
            );


        const vat =
            vatable *
            VAT_RATE;


        const grandTotal =
            vatable +
            vat;


        setText(
            "detailSubtotal",
            formatCurrency(
                subtotal
            )
        );

        setText(
            "detailDiscount",
            formatCurrency(
                discount
            )
        );

        setText(
            "detailVatable",
            formatCurrency(
                vatable
            )
        );

        setText(
            "detailVAT",
            formatCurrency(
                vat
            )
        );

        setText(
            "detailGrandTotal",
            formatCurrency(
                grandTotal
            )
        );


        setText(
            "detailGrandTotalDisplay",
            formatCurrency(
                grandTotal
            )
        );

    }


    /* =====================================================
       COLLECT ITEMS
    ===================================================== */

    function collectDetailItems() {

        const rows =
            document.querySelectorAll(
                "#soDetailsItemsBody tr"
            );


        const items = [];


        rows.forEach(
            function (row) {

                const inputs =
                    row.querySelectorAll(
                        ".detail-item-input"
                    );


                if (!inputs.length) {
                    return;
                }


                const item = {};


                inputs.forEach(
                    function (input) {

                        item[
                            input.dataset.field
                        ] =
                            input.value;

                    }
                );


                const qty =
                    toNumber(
                        item.QUANTITY
                    );


                const price =
                    toNumber(
                        item.UNIT_PRICE
                    );


                const discount =
                    toNumber(
                        item.DISCOUNT
                    );


                item.QUANTITY =
                    qty;

                item.UNIT_PRICE =
                    price;

                item.DISCOUNT =
                    discount;

                item.AMOUNT =
                    Math.max(
                        (
                            qty *
                            price
                        ) -
                        discount,
                        0
                    );


                items.push(
                    item
                );

            }
        );


        return items;

    }


    /* =====================================================
       SAVE SO UPDATE
    ===================================================== */

    async function saveSOUpdate() {

        if (!currentSO) {

            alert(
                "No Sales Order is currently open."
            );

            return;

        }


        const so =
            currentSO.salesOrder ||
            currentSO.so ||
            {};


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        if (!soNumber) {

            alert(
                "Sales Order number not found."
            );

            return;

        }


        const items =
            collectDetailItems();


        if (!items.length) {

            alert(
                "Sales Order must have at least one item."
            );

            return;

        }


        const subtotal =
            items.reduce(
                function (total, item) {

                    return total +
                        (
                            toNumber(
                                item.QUANTITY
                            ) *
                            toNumber(
                                item.UNIT_PRICE
                            )
                        );

                },
                0
            );


        const discount =
            items.reduce(
                function (total, item) {

                    return total +
                        toNumber(
                            item.DISCOUNT
                        );

                },
                0
            );


        const vatable =
            Math.max(
                subtotal -
                discount,
                0
            );


        const vatAmount =
            vatable *
            VAT_RATE;


        const grandTotal =
            vatable +
            vatAmount;


        const payload = {

            soNumber:
                soNumber,

            date:
                getElementValue(
                    "detailSODate"
                ),

            clientName:
                getElementValue(
                    "detailClientName"
                ),

            salesEngineer:
                getElementValue(
                    "detailSE"
                ),

            attention:
                getElementValue(
                    "detailAttention"
                ),

            tin:
                getElementValue(
                    "detailTIN"
                ),

            poNumber:
                getElementValue(
                    "detailPONumber"
                ),

            terms:
                getElementValue(
                    "detailTerms"
                ),

            jobOrder:
                getElementValue(
                    "detailJobOrder"
                ),

            billingAddress:
                getElementValue(
                    "detailBillingAddress"
                ),

            deliveryAddress:
                getElementValue(
                    "detailDeliveryAddress"
                ),

            project:
                getElementValue(
                    "detailProject"
                ),

            subtotal:
                subtotal,

            discount:
                discount,

            vatable:
                vatable,

            vatRate:
                VAT_RATE,

            vatAmount:
                vatAmount,

            grandTotal:
                grandTotal,

            items:
                items

        };


        try {

            showLoading(true);


            const result =
                await salesOrderAPI(
                    "updateSalesOrder",
                    payload
                );


            if (
                result &&
                result.success === false
            ) {

                throw new Error(
                    result.message ||
                    "Unable to update Sales Order."
                );

            }


            alert(
                "Sales Order updated successfully."
            );


            soDetailsCache[
                soNumber
            ] = null;


            setDetailsEditMode(
                false
            );
await loadSOList(
    true
);

            /* Update sync/cache version */

if (
    window.LogisTechSync
) {

    try {

        await window.LogisTechSync.backgroundSync();

    } catch (syncError) {

        console.warn(
            "Background sync after SO update failed:",
            syncError
        );

    }

}


            await openSODetails(
                soNumber
            );


        } catch (error) {

            console.error(
                "Save SO error:",
                error
            );


            alert(
                "Unable to update Sales Order.\n\n" +
                error.message
            );

        } finally {

            showLoading(false);

        }

    }


    /* =====================================================
       CANCEL UPDATE MODE
    ===================================================== */

    function cancelSOUpdateMode() {

        if (!currentSO) {

            return;

        }


        const confirmed =
            confirm(
                "Cancel editing?\n\n" +
                "Any unsaved changes will be discarded."
            );


        if (!confirmed) {
            return;
        }


        const so =
            currentSO.salesOrder ||
            currentSO.so ||
            {};


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        setDetailsEditMode(
            false
        );


        if (soNumber) {

            openSODetails(
                soNumber
            );

        }

    }


    /* =====================================================
       CANCEL SALES ORDER
    ===================================================== */

    async function cancelSelectedSO() {

        const so =
            selectedSO ||
            (
                currentSO
                    ? (
                        currentSO.salesOrder ||
                        currentSO.so
                    )
                    : null
            );


        if (!so) {

            alert(
                "Please select a Sales Order."
            );

            return;

        }


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        if (!soNumber) {

            alert(
                "Sales Order number not found."
            );

            return;

        }


        const confirmed =
            confirm(
                "Are you sure you want to cancel Sales Order " +
                soNumber +
                "?"
            );


        if (!confirmed) {
            return;
        }


        try {

            showLoading(true);


            await salesOrderAPI(
                "cancelSalesOrder",
                {
                    soNumber:
                        soNumber
                }
            );


            alert(
                "Sales Order cancelled successfully."
            );


            selectedSO = null;

            currentSO = null;


            await loadSOList(
    true
);


/* Update local cache */

if (
    window.LogisTechSync
) {

    try {

        await window.LogisTechSync.backgroundSync();

    } catch (syncError) {

        console.warn(
            "Background sync after SO cancellation failed:",
            syncError
        );

    }

}


            closeSODetails();

        } catch (error) {

            console.error(
                "Cancel SO error:",
                error
            );


            alert(
                "Unable to cancel Sales Order.\n\n" +
                error.message
            );

        } finally {

            showLoading(false);

        }

    }


    /* =====================================================
       POST SALES ORDER
    ===================================================== */

    async function postSelectedSO() {

        const so =
            currentSO
                ? (
                    currentSO.salesOrder ||
                    currentSO.so
                )
                : (
                    selectedSO ||
                    null
                );


        if (!so) {

            alert(
                "Please select a Sales Order."
            );

            return;

        }


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        if (!soNumber) {

            alert(
                "Sales Order number not found."
            );

            return;

        }


        const confirmed =
            confirm(
                "Post Sales Order " +
                soNumber +
                "?\n\n" +
                "Once posted, this SO will be available for the next transaction workflow."
            );


        if (!confirmed) {
            return;
        }


        try {

            showLoading(true);


            /*
             * If the SO is currently in edit mode,
             * save it first.
             */

            if (soDetailsEditMode) {

                await saveSOUpdate();

            }


            await salesOrderAPI(
                "postSalesOrder",
                {
                    soNumber:
                        soNumber
                }
            );


            alert(
                "Sales Order posted successfully."
            );


            setDetailsEditMode(
                false
            );


            await loadSOList(
    true
);


/* Update local cache */

if (
    window.LogisTechSync
) {

    try {

        await window.LogisTechSync.backgroundSync();

    } catch (syncError) {

        console.warn(
            "Background sync after SO posting failed:",
            syncError
        );

    }

}


await openSODetails(
    soNumber
);


        } catch (error) {

            console.error(
                "Post SO error:",
                error
            );


            alert(
                "Unable to post Sales Order.\n\n" +
                error.message
            );

        } finally {

            showLoading(false);

        }

    }


    /* =====================================================
       FILES
    ===================================================== */

    async function loadSOFiles(
        data
    ) {

        const container =
            document.getElementById(
                "detailSOFileList"
            );


        if (!container) {
            return;
        }


        const documents =
            data.documents ||
            data.salesOrder?.documents ||
            data.so?.documents ||
            [];


        container.innerHTML = "";


        if (!documents.length) {

            container.innerHTML = `

                <div class="so-file-empty">
                    No files attached.
                </div>

            `;

            return;

        }


        documents.forEach(
            function (document) {

                const name =
                    getSOValue(
                        document,
                        [
                            "FILE_NAME",
                            "fileName",
                            "NAME",
                            "name"
                        ]
                    ) || "File";


                const url =
                    getSOValue(
                        document,
                        [
                            "FILE_URL",
                            "fileUrl",
                            "URL",
                            "url"
                        ]
                    );


                const item =
                    document.createElement("div");

                item.className =
                    "so-file-item";


                item.innerHTML = `

                    <div class="so-file-name">
                        ${escapeHTML(name)}
                    </div>

                    ${
                        url
                            ? `
                                <a
                                    href="${escapeAttribute(url)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="so-file-open"
                                >
                                    Open
                                </a>
                              `
                            : ""
                    }

                `;


                container.appendChild(
                    item
                );

            }
        );

    }


    /* =====================================================
       FILE SELECTED
    ===================================================== */

    async function handleDetailFileSelected(
        event
    ) {

        const file =
            event.target.files?.[0];


        if (!file) {
            return;
        }


        if (
            file.size >
            SO_FILE_MAX_SIZE
        ) {

            alert(
                "File is too large.\n\n" +
                "Maximum allowed size is 10 MB."
            );


            event.target.value = "";

            return;

        }


        if (!currentSO) {

            alert(
                "Please open a Sales Order first."
            );


            event.target.value = "";

            return;

        }


        const so =
            currentSO.salesOrder ||
            currentSO.so ||
            {};


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        if (!soNumber) {

            alert(
                "Sales Order number not found."
            );


            event.target.value = "";

            return;

        }


        try {

            showLoading(true);


            const base64 =
                await fileToBase64(
                    file
                );


            await salesOrderAPI(
                "uploadSOFile",
                {

                    soNumber:
                        soNumber,

                    fileName:
                        file.name,

                    mimeType:
                        file.type,

                    fileData:
                        base64

                }
            );


            alert(
                "File uploaded successfully."
            );


            event.target.value = "";


            await openSODetails(
                soNumber
            );


        } catch (error) {

            console.error(
                "File upload error:",
                error
            );


            alert(
                "Unable to upload file.\n\n" +
                error.message
            );

        } finally {

            showLoading(false);

        }

    }


    /* =====================================================
       EMAIL SO
    ===================================================== */

    function emailSelectedSO() {

        const so =
            currentSO
                ? (
                    currentSO.salesOrder ||
                    currentSO.so
                )
                : selectedSO;


        if (!so) {

            alert(
                "Please select a Sales Order first."
            );

            return;

        }


        const soNumber =
            getSOValue(
                so,
                [
                    "SO_NUMBER",
                    "soNumber"
                ]
            );


        alert(
            "Email workflow for " +
            soNumber +
            " will be connected here."
        );

    }


    /* =====================================================
       CLOSE DETAILS
    ===================================================== */

    function closeSODetails() {

        const details =
            document.getElementById(
                "soDetails"
            );


        const listView =
            document.getElementById(
                "salesOrderListView"
            );


        if (details) {

            details.style.display =
                "none";

        }


        if (listView) {

            listView.style.display =
                "block";

        }


        setDetailsEditMode(
            false
        );


        currentSO = null;

        selectedSO = null;


        updateSOSelectionUI();

    }


    /* =====================================================
       CREATE SALES ORDER
    ===================================================== */

    function openCreateSalesOrder() {

        window.location.href =
            CREATE_SALES_ORDER_PAGE;

    }


/* =====================================================
   CUSTOMER MODULE
===================================================== */

async function openCustomerModule() {

    console.log(
        "================================="
    );

    console.log(
        "LOGIS-TECH: OPEN CUSTOMER MODULE"
    );

    console.log(
        "================================="
    );


    const customerArea =
        document.getElementById(
            "customerArea"
        );


    if (!customerArea) {

        console.error(
            "Customer area not found."
        );

        return;

    }


    try {

        /* =============================================
           SHOW CUSTOMER AREA
        ============================================== */

        customerArea.style.display =
            "block";


        /* =============================================
           HIDE SALES ORDER LIST
        ============================================== */

        const salesOrderListView =
            document.getElementById(
                "salesOrderListView"
            );


        if (salesOrderListView) {

            salesOrderListView.style.display =
                "none";

        }


        /* =============================================
           HIDE SALES ORDER DETAILS
        ============================================== */

        const soDetails =
            document.getElementById(
                "soDetails"
            );


        if (soDetails) {

            soDetails.style.display =
                "none";

        }


        /* =============================================
           SHOW LOADING
        ============================================== */

        customerArea.innerHTML = `

            <div class="customer-loading">

                <div class="customer-loading-spinner">
                    ⟳
                </div>

                <div>
                    Loading Customer Module...
                </div>

            </div>

        `;


        /* =============================================
           LOAD CUSTOMER CSS
        ============================================== */

        await loadCustomerStyles();


        /* =============================================
           LOAD CUSTOMER HTML
        ============================================== */

        const response =
            await fetch(
                "pages/create-customer.html?v=20261008-01",
                {
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load Customer module. HTTP " +
                response.status
            );

        }


        const html =
            await response.text();


        /* =============================================
           PARSE CUSTOMER HTML
           
           IMPORTANT:
           We only inject BODY content.
           HEAD / LINK / SCRIPT are handled separately.
        ============================================== */

        const parser =
            new DOMParser();


        const customerDocument =
            parser.parseFromString(
                html,
                "text/html"
            );


        if (
            !customerDocument.body
        ) {

            throw new Error(
                "Invalid Customer HTML structure."
            );

        }


        customerArea.innerHTML =
            customerDocument.body.innerHTML;


        console.log(
            "Customer HTML loaded."
        );


        /* =============================================
           LOAD CUSTOMER JAVASCRIPT
        ============================================== */

        await loadCustomerScript();


        /* =============================================
           INITIALIZE CUSTOMER FORM
        ============================================== */

        if (
            typeof window.initializeCustomerForm !==
            "function"
        ) {

            throw new Error(
                "initializeCustomerForm() is not available."
            );

        }


        const initialized =
            window.initializeCustomerForm();


        if (!initialized) {

            throw new Error(
                "Unable to initialize Customer form."
            );

        }


        /* =============================================
           BIND BACK BUTTON
        ============================================== */

        bindCustomerBackButton();


        /* =============================================
           MARK MODULE AS LOADED
        ============================================== */

        customerModuleLoaded =
            true;


        console.log(
            "Customer form initialized successfully."
        );

    } catch (error) {

        console.error(
            "================================="
        );

        console.error(
            "LOGIS-TECH CUSTOMER MODULE ERROR"
        );

        console.error(
            error
        );

        console.error(
            "================================="
        );


        customerArea.innerHTML = `

            <div class="customer-module-error">

                <h2>
                    Unable to Load Customer Module
                </h2>

                <p>
                    ${escapeHTML(
                        error.message ||
                        "Unknown error."
                    )}
                </p>

                <button
                    type="button"
                    class="so-secondary-button"
                    id="customerModuleErrorBackButton"
                >
                    ← Back to Sales Orders
                </button>

            </div>

        `;


        const errorBackButton =
            document.getElementById(
                "customerModuleErrorBackButton"
            );


        if (errorBackButton) {

            errorBackButton.addEventListener(
                "click",
                closeCustomerFromSalesOrder
            );

        }

    }

}


/* =====================================================
   LOAD CUSTOMER CSS
===================================================== */

function loadCustomerStyles() {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const STYLE_ID =
                "logistech-customer-css";


            /*
             * Already loaded.
             */

            const existingStyle =
                document.getElementById(
                    STYLE_ID
                );


            if (existingStyle) {

                resolve();

                return;

            }


            /*
             * Create stylesheet.
             */

            const link =
                document.createElement(
                    "link"
                );


            link.id =
                STYLE_ID;


            link.rel =
                "stylesheet";


            /*
             * IMPORTANT:
             * index.html is at repository root.
             *
             * Therefore the correct path is:
             *
             * css/create-customer.css
             */

            link.href =
                "css/create-customer.css?v=20261008-01";


            link.onload =
                function () {

                    console.log(
                        "Customer CSS loaded successfully."
                    );

                    resolve();

                };


            link.onerror =
                function () {

                    reject(
                        new Error(
                            "Unable to load create-customer.css"
                        )
                    );

                };


            document.head.appendChild(
                link
            );

        }
    );

}


async function loadCustomerScript() {

    console.log("=================================");
    console.log("LOGIS-TECH: LOAD CUSTOMER JS");
    console.log("=================================");

    const SCRIPT_ID =
        "logistech-customer-js";

    const SCRIPT_SRC =
        "js/create-customer.js?v=20261008-02";


    /*
     * Already loaded?
     */
    const existingScript =
        document.getElementById(SCRIPT_ID);


    if (existingScript) {

        console.log(
            "Customer JS script tag already exists."
        );


        /*
         * IMPORTANT:
         * Give the browser a moment to finish
         * executing the existing script.
         */
        await new Promise(function (resolve) {

            setTimeout(resolve, 100);

        });


        if (
            typeof window.initializeCustomerForm ===
            "function"
        ) {

            console.log(
                "Customer initialize function found."
            );

            return true;

        }

    }


    /*
     * Remove stale Customer JS script
     * if one exists without the expected ID.
     */
    document
        .querySelectorAll(
            'script[src*="create-customer.js"]'
        )
        .forEach(function (script) {

            if (
                script.id !== SCRIPT_ID
            ) {

                script.remove();

            }

        });


    /*
     * Create fresh script.
     */
    const script =
        document.createElement("script");


    script.id =
        SCRIPT_ID;

    script.src =
        SCRIPT_SRC;


    return new Promise(function (
        resolve,
        reject
    ) {

        script.onload =
            function () {

                console.log(
                    "Customer JS file loaded."
                );


                /*
                 * IMPORTANT:
                 * Check the actual public API
                 * after the script executes.
                 */
                if (
                    typeof window.initializeCustomerForm !==
                    "function"
                ) {

                    console.error(
                        "Customer JS loaded, BUT initializeCustomerForm() was not registered."
                    );

                    console.error(
                        "window.initializeCustomerForm =",
                        window.initializeCustomerForm
                    );


                    reject(
                        new Error(
                            "Customer JavaScript loaded but initializeCustomerForm() was not found."
                        )
                    );

                    return;

                }


                console.log(
                    "Customer initialize function found."
                );


                resolve(true);

            };


        script.onerror =
            function () {

                console.error(
                    "Unable to load Customer JavaScript."
                );


                reject(
                    new Error(
                        "Unable to load Customer JavaScript."
                    )
                );

            };


        document.body.appendChild(
            script
        );

    });

}


/* =====================================================
   CUSTOMER BACK BUTTON
===================================================== */

function bindCustomerBackButton() {

    const backButton =
        document.getElementById(
            "customerBackButton"
        );


    if (!backButton) {

        console.warn(
            "Customer Back button not found."
        );

        return;

    }


    /*
     * Prevent duplicate event listeners.
     */

    if (
        backButton.dataset.bound ===
        "true"
    ) {

        return;

    }


    backButton.dataset.bound =
        "true";


    backButton.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            event.stopPropagation();


            closeCustomerFromSalesOrder();

        }
    );


    console.log(
        "Customer Back button bound."
    );

}


/* =====================================================
   CLOSE CUSTOMER MODULE
===================================================== */

function closeCustomerFromSalesOrder() {

    console.log(
        "Closing Customer Module..."
    );


    const customerArea =
        document.getElementById(
            "customerArea"
        );


    const salesOrderListView =
        document.getElementById(
            "salesOrderListView"
        );


    const soDetails =
        document.getElementById(
            "soDetails"
        );


    /*
     * Hide Customer module.
     */

    if (customerArea) {

        customerArea.style.display =
            "none";


        customerArea.innerHTML =
            "";

    }


    /*
     * Show Sales Order list.
     */

    if (salesOrderListView) {

        salesOrderListView.style.display =
            "block";

    }


    /*
     * Keep SO details hidden.
     */

    if (soDetails) {

        soDetails.style.display =
            "none";

    }


    /*
     * Reset selection.
     */

    selectedSO =
        null;


    updateSOSelectionUI();


    console.log(
        "Customer Module closed."
    );

}


/* =====================================================
   CUSTOMER SAVED EVENT
===================================================== */

function handleCustomerSaved(
    event
) {

    console.log(
        "Customer saved:",
        event?.detail || {}
    );


    customerModuleLoaded =
        true;

}


/* =====================================================
   CUSTOMER CANCEL EVENT
===================================================== */

function handleCustomerFormCancel() {

    console.log(
        "Customer form cancelled."
    );

}


/* =====================================================
   CUSTOMER EVENTS
===================================================== */

window.addEventListener(
    "customerSaved",
    handleCustomerSaved
);


window.addEventListener(
    "customerFormCancel",
    handleCustomerFormCancel
);

   /* =====================================================
   CACHE / SYNC EVENTS
===================================================== */

window.addEventListener(
    "logistech:data-updated",
    function (event) {

        console.log(
            "LOGIS-TECH: Background data update received.",
            event?.detail || {}
        );


        /*
         * Reload Sales Orders from IndexedDB
         * without calling Google Sheets directly.
         */

        if (
            window.LogisTechCache
        ) {

            window.LogisTechCache
                .getAll("salesOrders")
                .then(
                    function (cachedSalesOrders) {

                        if (
                            !Array.isArray(
                                cachedSalesOrders
                            )
                        ) {

                            return;

                        }


                        if (
                            !cachedSalesOrders.length
                        ) {

                            return;

                        }


                        salesOrders =
                            normalizeSalesOrders(
                                cachedSalesOrders
                            );


                        salesOrdersLoaded =
                            true;


                        renderSOList();

                        updateSOSummary();


                        console.log(
                            "LOGIS-TECH: Sales Order list updated from synchronized cache."
                        );

                    }
                )
                .catch(
                    function (error) {

                        console.error(
                            "Unable to refresh Sales Order cache:",
                            error
                        );

                    }
                );

        }

    }
);
   

    /* =====================================================
       GENERIC HELPERS
    ===================================================== */

    function getSOValue(
        object,
        keys
    ) {

        if (!object) {
            return "";
        }


        for (
            let i = 0;
            i < keys.length;
            i++
        ) {

            const key =
                keys[i];


            if (
                object[key] !== undefined &&
                object[key] !== null
            ) {

                return object[key];

            }

        }


        return "";

    }


    function getElementValue(
        id
    ) {

        const element =
            document.getElementById(
                id
            );


        return element
            ? element.value
            : "";

    }


    function setValue(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.value =
                value ?? "";

        }

    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.textContent =
                value ?? "";

        }

    }


    function toNumber(
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
            typeof value === "number"
        ) {

            return isNaN(value)
                ? 0
                : value;

        }


        const cleaned =
            String(value)
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
            parseFloat(
                cleaned
            );


        return isNaN(number)
            ? 0
            : number;

    }


    function formatCurrency(
        value
    ) {

        const number =
            toNumber(value);


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


    function formatDate(
        value
    ) {

        if (!value) {
            return "-";
        }


        const date =
            new Date(value);


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }


        return new Intl.DateTimeFormat(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "2-digit"
            }
        ).format(date);

    }


    function formatDateInput(
        value
    ) {

        if (!value) {
            return "";
        }


        const date =
            new Date(value);


        if (
            isNaN(
                date.getTime()
            )
        ) {

            const match =
                String(value)
                    .match(
                        /^(\d{4})-(\d{2})-(\d{2})/
                    );


            return match
                ? match[0]
                : "";

        }


        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        return (
            year +
            "-" +
            month +
            "-" +
            day
        );

    }


    function formatDateTime(
        value
    ) {

        if (!value) {
            return "-";
        }


        const date =
            new Date(value);


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }


        return new Intl.DateTimeFormat(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(date);

    }


    function renderStatusBadge(
        status
    ) {

        const value =
            String(
                status || "-"
            );


        return `
            <span class="so-status-badge ${getStatusClass(value)}">
                ${escapeHTML(value)}
            </span>
        `;

    }


    function getStatusClass(
        status
    ) {

        return (
            String(
                status || ""
            )
                .toLowerCase()
                .replace(
                    /\s+/g,
                    "-"
                )
        );

    }


    function escapeHTML(
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

        return escapeHTML(
            value
        );

    }


    function delay(
        milliseconds
    ) {

        return new Promise(
            function (resolve) {

                setTimeout(
                    resolve,
                    milliseconds
                );

            }
        );

    }


    function fileToBase64(
        file
    ) {

        return new Promise(
            function (
                resolve,
                reject
            ) {

                const reader =
                    new FileReader();


                reader.onload =
                    function () {

                        const result =
                            reader.result;


                        const base64 =
                            String(result)
                                .split(",")[1];


                        resolve(
                            base64
                        );

                    };


                reader.onerror =
                    function () {

                        reject(
                            new Error(
                                "Unable to read file."
                            )
                        );

                    };


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    /* =====================================================
       LOADING
    ===================================================== */

    function showLoading(
        visible
    ) {

        const overlay =
            document.getElementById(
                "salesOrderLoadingOverlay"
            );


        if (!overlay) {
            return;
        }


        overlay.style.display =
            visible
                ? "flex"
                : "none";

    }


    function showError(
        message
    ) {

        alert(
            message
        );

    }


    /* =====================================================
       GLOBAL EXPORTS
    ===================================================== */

    window.loadSOList =
        loadSOList;

    window.renderRecentSalesOrders =
        renderRecentSalesOrders;

    window.showAllSalesOrders =
        showAllSalesOrders;

    window.filterSOBySummary =
        filterSOBySummary;

    window.selectSO =
        selectSO;

    window.openSODetails =
        openSODetails;

    window.closeSODetails =
        closeSODetails;

    window.updateSelectedSO =
        updateSelectedSO;

    window.enableSOUpdate =
        enableSOUpdate;

    window.setDetailsEditMode =
        setDetailsEditMode;

    window.addDetailItem =
        addDetailItem;

    window.deleteDetailItem =
        deleteDetailItem;

    window.calculateDetailTotals =
        calculateDetailTotals;

    window.saveSOUpdate =
        saveSOUpdate;

    window.cancelSOUpdateMode =
        cancelSOUpdateMode;

    window.cancelSelectedSO =
        cancelSelectedSO;

    window.postSelectedSO =
        postSelectedSO;

    window.openCreateSalesOrder =
        openCreateSalesOrder;

    window.openCustomerModule =
        openCustomerModule;

    window.emailSelectedSO =
        emailSelectedSO;


    /* =====================================================
       AUTO INITIALIZATION
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeSalesOrderModule
        );

    } else {

        initializeSalesOrderModule();

    }


})();
