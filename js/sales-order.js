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
let customers = [];
let customersLoaded = false;
let selectedSO = null;
    let currentSO = null;
    let soDetailsEditMode = false;
    let salesOrdersLoaded = false;
    let customerModuleLoaded = false;
    const soDetailsCache = {};
    /* =====================================================
       INITIALIZE
    ===================================================== */
function getLogisTechCurrentRole() {
    try {
        const saved = JSON.parse(localStorage.getItem("logitechUser") || "{}");
        const account = saved.account || saved.user || saved;
        return String(account.role || account.ROLE || account.accountType || account.account_type || account.accounttype || account.type || "").trim().toUpperCase();
    } catch (error) { return ""; }
}

    function canCreateSalesOrderByRole() {
        return ["ADMIN", "SALES"].includes(getLogisTechCurrentRole());
    }

    function applySalesOrderRolePermissions() {
        const allowed = canCreateSalesOrderByRole();
        document.querySelectorAll('#createSalesOrderButton, [onclick="openCreateSalesOrder()"]').forEach(function (button) {
            button.style.display = allowed ? "" : "none";
            button.disabled = !allowed;
            button.setAttribute("aria-disabled", String(!allowed));
            if (!allowed) button.title = "View Only: your account role cannot create Sales Orders.";
        });
    }

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
        applySalesOrderRolePermissions();
        bindSalesOrderEvents();
        // The page loader starts data loading after the HTML is mounted.
        // Avoid duplicate Sales Order and Customer requests during initialization.
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

        // Keep loading feedback inside the Sales Order table.
        // Do not show the full-page "Loading Sales Order..." overlay.


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
                    Array.isArray(cachedSalesOrders) &&
                    cachedSalesOrders.length > 0
                ) {
                    console.log("LOGIS-TECH: Loading Sales Orders from local cache...");

                    salesOrders = normalizeSalesOrders(cachedSalesOrders);
                    salesOrdersLoaded = true;

                    renderSOList();
                    updateSOSummary();

                    console.log("LOGIS-TECH: Sales Orders loaded from cache:", salesOrders.length);
                    return;
                }

                // On a first visit, Sync Manager is already downloading the
                // initial dataset. Avoid making a second, competing API call.
                // The logistech:data-updated event below will populate the table
                // as soon as IndexedDB has been refreshed.
                if (Array.isArray(cachedSalesOrders) && cachedSalesOrders.length === 0 &&
                    window.LogisTechSync && !forceRefresh) {
                    console.log("LOGIS-TECH: Waiting for initial sync to populate the Sales Order cache.");

                    const tbody = document.getElementById("soTableBody");
                    const emptyState = document.getElementById("soEmptyState");
                    if (tbody) {
                        tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;padding:24px;">Loading Sales Orders from database...</td></tr>';
                    }
                    if (emptyState) emptyState.style.display = "none";
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
            getFilteredSalesOrders().slice(0, 5);


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

                const requiredDeliveryDate =
                    getSOValue(
                        so,
                        [
                            "REQUIRED_DELIVERY_DATE",
                            "REQUIRED_DEL_DATE",
                            "RDD",
                            "DELIVERY_DATE",
                            "DEL_DATE",
                            "requiredDeliveryDate"
                        ]
                    );

                const productionPostStatus = String(
                    getSOValue(so, ["POSTED_TO_PRODUCTION", "postedToProduction"]) || ""
                ).trim().toUpperCase();


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
                        ${escapeHTML(requiredDeliveryDate ? formatDate(requiredDeliveryDate) : "-")}
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

                    <td class="so-action-cell">
                        <button
                            type="button"
                            class="so-view-button"
                            aria-label="View Sales Order ${escapeAttribute(soNumber)}"
                        >View</button>
                        ${["ADMIN", "SALES"].includes(getLogisTechCurrentRole()) ? (
                            '<button type="button" class="so-post-production-button" data-so-post-production="' + escapeAttribute(soNumber) + '"' +
                            (productionPostStatus === "POSTED" ? ' disabled title="Already posted to Production"' : '') + '>' +
                            (productionPostStatus === "POSTED" ? 'Posted to Production' : 'Post to Production') + '</button>'
                        ) : ""}
                    </td>

                `;


                const viewButton =
                    row.querySelector(".so-view-button");

                if (viewButton) {
                    viewButton.addEventListener("click", function (event) {
                        event.preventDefault();
                        event.stopPropagation();

                        if (soNumber) {
                            openSOFormPreview(soNumber);
                        }
                    });
                }

                const postProductionButton = row.querySelector(".so-post-production-button");
                if (postProductionButton && productionPostStatus !== "POSTED") {
                    postProductionButton.addEventListener("click", async function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!soNumber) return;
                        if (!confirm("Post Sales Order " + soNumber + " to Production?\\n\\nThis will add it to the Production Queue and notify active Production accounts.")) return;
                        const button = postProductionButton;
                        button.disabled = true;
                        button.textContent = "Posting…";
                        try {
                            let account = {};
                            try {
                                const saved = JSON.parse(localStorage.getItem("logitechUser") || "{}");
                                account = saved.account || saved.user || saved;
                            } catch (ignored) {}
                            const result = await salesOrderAPI("postSalesOrderToProduction", {
                                soNumber: soNumber,
                                sessionToken: account.sessionToken || account.session_token || "",
                                userId: account.userId || account.USER_ID || "",
                                username: account.username || account.USERNAME || ""
                            });
                            alert(result.message || ("SO " + soNumber + " posted to Production."));
                            so.POSTED_TO_PRODUCTION = "POSTED";
                            so.PRODUCTION_POSTED_AT = result.postedAt || "";
                            so.PRODUCTION_POSTED_BY = account.username || account.USERNAME || "";
                            if (window.LogisTechSync && typeof window.LogisTechSync.backgroundSync === "function") {
                                try { await window.LogisTechSync.backgroundSync(); } catch (syncError) { console.warn("Sync after Production posting failed:", syncError); }
                            }
                            await loadSOList(true);
                        } catch (error) {
                            alert("Unable to post SO to Production.\\n\\n" + error.message);
                            button.disabled = false;
                            button.textContent = "Post to Production";
                        }
                    });
                }


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
       SALES ORDER FORM PREVIEW (MATCHES SOF PDF TEMPLATE)
    ===================================================== */
    async function openSOFormPreview(soNumber) {
        if (!soNumber) {
            alert("Sales Order number is required.");
            return;
        }

        let result;
        try {
            showLoading(true);
            result = await salesOrderAPI("getSOTransactionDetails", { soNumber: soNumber });
            const data = normalizeTransactionResult(result);
            renderSOFormPreview(data);
        } catch (error) {
            console.error("Unable to open Sales Order Form preview:", error);
            alert("Unable to load Sales Order Form preview.\n\n" +
                (error && error.message ? error.message : String(error)));
        } finally {
            showLoading(false);
        }
    }

    function renderSOFormPreview(data) {
        const so = data.salesOrder || data.so || {};
        const items = Array.isArray(data.items) ? data.items : [];
        const value = function(keys) {
            const v = getSOValue(so, keys);
            return v === null || v === undefined ? "" : String(v);
        };
        const shown = function(keys) {
            const v = value(keys).trim();
            return v ? escapeHTML(v) : "&nbsp;";
        };
        const billingAddressShown = function() {
            const v = value(["BILLING_ADDRESS", "billingAddress"]).trim();
            if (!v) return "&nbsp;";
            return escapeHTML(v.replace(/(1400)\\s*(Caloocan City)/i, "$1\\n$2")).replace(/\\n/g, "<br>");
        };
        const dateShown = function(keys) {
            const raw = value(keys).trim();
            if (!raw) return "&nbsp;";
            const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (!match && raw.indexOf("T") === -1) return escapeHTML(raw);
            const date = match
                ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0)
                : new Date(raw);
            if (isNaN(date.getTime())) return escapeHTML(raw);
            return escapeHTML(date.getDate() + "-" +
                date.toLocaleString("en-US", { month: "short" }) + "-" +
                String(date.getFullYear()).slice(-2));
        };
        const money = function(v) {
            return toNumber(v).toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };
        const field = function(label, keys, extraClass) {
            return "<div class='sof-field " + (extraClass || "") + "'><span>" +
                escapeHTML(label) + "</span><b>" + shown(keys) + "</b></div>";
        };
        const soNumber = value(["SO_NUMBER", "soNumber", "so_number"]);
        const itemRows = items.map(function(item, index) {
            const qty = toNumber(getSOValue(item, ["QTY", "qty", "QUANTITY", "quantity"]));
            const unitPrice = toNumber(getSOValue(item, ["UNIT_PRICE", "unitPrice", "AMOUNT", "amount"]));
            const total = toNumber(getSOValue(item, ["TOTAL", "total", "EXTENDED_PRICE", "extendedPrice"])) || qty * unitPrice;
            const rawNumber = getSOValue(item, ["ITEM_NUMBER", "itemNumber", "LINE_NUMBER", "lineNumber"]) || (index + 1);
            const number = isFinite(Number(rawNumber)) ? Number(rawNumber).toFixed(1) : rawNumber;
            const name = getSOValue(item, ["ITEM_NAME", "itemName", "ITEM_CODE", "itemCode", "ITEM", "item"]);
            return "<tr class='sof-item'><td class='sof-center'>" + escapeHTML(number) +
                "</td><td><b>" + escapeHTML(name || "") + "</b>" +
                "</td><td class='sof-center'>" + escapeHTML(qty) +
                "</td><td class='sof-center'>" + escapeHTML(getSOValue(item, ["UNIT", "unit"]) || "") +
                "</td><td class='sof-number'>" + money(unitPrice) +
                "</td><td class='sof-number'>" + money(total) + "</td></tr>";
        }).join("");
        const blankRows = Array.from({length: Math.max(0, 24 - items.length)}, function() {
            return "<tr class='sof-blank'><td></td><td></td><td></td><td></td><td></td><td></td></tr>";
        }).join("");
        const subtotal = toNumber(getSOValue(so, ["SUBTOTAL", "subtotal"]));
        const discount = toNumber(getSOValue(so, ["DISCOUNT", "discount"]));
        const vatable = toNumber(getSOValue(so, ["VATABLE", "vatable", "VATABLE_SALES", "vatableSales"]));
        const vat = toNumber(getSOValue(so, ["VAT_AMOUNT", "vatAmount", "VAT", "vat"]));
        const grandTotal = toNumber(getSOValue(so, ["GRAND_TOTAL", "grandTotal"]));
        const selling = grandTotal || vatable || (subtotal - discount);
        const logo = "https://raw.githubusercontent.com/chrisgubat1997-cell/logistics-system/main/assets/drlogo.png";

        const old = document.getElementById("soFormPreviewOverlay");
        if (old) old.remove();
        if (!document.getElementById("soFormPreviewStyles")) {
            const style = document.createElement("style");
            style.id = "soFormPreviewStyles";
            style.textContent = `
                @page{size:8.5in 14in;margin:0.75in 0.7in}
                .sof-overlay{position:fixed;inset:0;z-index:10070;background:rgba(15,23,42,.68);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px;animation:sofFade .18s ease-out}
                .sof-dialog{width:min(1040px,100%);height:min(94vh,1200px);display:flex;flex-direction:column;background:#eef1f5;border-radius:14px;overflow:hidden;box-shadow:0 25px 90px rgba(0,0,0,.35)}
                .sof-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:#173b72;color:#fff;flex-shrink:0}
                .sof-toolbar h2{font-size:14px;margin:0}.sof-toolbar p{font-size:10px;margin:3px 0 0;color:#dbeafe}
                .sof-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sof-actions button{border:1px solid rgba(255,255,255,.4);border-radius:7px;padding:8px 12px;background:rgba(255,255,255,.12);color:#fff;font:700 10px inherit;cursor:pointer}.sof-actions button:hover{background:rgba(255,255,255,.22)}.sof-actions .sof-zoom-btn{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:5px;border:1px solid rgba(255,255,255,.45);border-radius:7px;background:rgba(255,255,255,.12);color:#fff}.sof-zoom-btn svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.sof-zoom-level{min-width:40px;text-align:center;color:#fff;font:600 10px Arial,sans-serif}
                .sof-scroll{overflow:auto;padding:22px;flex:1}.sof-paper{box-sizing:border-box;display:flex;flex-direction:column;width:8.5in;max-width:none;height:14in;min-height:14in;margin:0 auto;padding:0.75in 0.7in;background:#fff;box-shadow:0 5px 24px rgba(15,23,42,.15);color:#111;font-family:'Century Gothic','CenturyGothic',AppleGothic,sans-serif;font-size:13px;zoom:1}
                .sof-paper table{border-collapse:collapse;table-layout:fixed;width:100%}.sof-header td{border:0;height:58px;padding:3px 5px}.sof-logo-cell{width:47%;vertical-align:middle}.sof-logo{width:215px;height:auto;max-height:48px;object-fit:contain}.sof-title-cell{text-align:center;font-size:23px;font-weight:800;white-space:nowrap}.sof-check-cell{width:20%;font-size:13px}.sof-check-row{white-space:nowrap;line-height:16px}.sof-check{display:inline-block;width:11px;height:11px;border:1px solid #111;vertical-align:middle;margin-right:5px}.sof-dept{display:inline-block;border:1px solid #111;padding:1px 5px;line-height:12px;vertical-align:middle;box-sizing:border-box}
                .sof-meta,.sof-meta tr,.sof-meta td{background:#fff!important}.sof-meta td{background:#fff!important;border:0;min-height:16px;padding:2px 4px;vertical-align:middle;overflow-wrap:anywhere;font-size:13px}.sof-meta{width:100%;table-layout:fixed;border-collapse:collapse}.sof-meta .sof-label{width:15%;white-space:nowrap;text-align:left;padding-left:0!important;padding-right:3px!important;box-sizing:border-box}.sof-meta .sof-value{width:40%;text-align:left;text-decoration:none;border-bottom:1px solid #111!important;font-size:13px;padding-left:0!important;padding-right:4px!important;box-sizing:border-box;overflow-wrap:anywhere}.sof-meta .sof-right-label{width:23%;white-space:nowrap;text-align:left;padding-left:77px!important;padding-right:3px!important;box-sizing:border-box;position:static;left:auto;z-index:auto;overflow:visible;overflow-wrap:normal}.sof-meta .sof-right-value{width:22%;text-align:center;text-decoration:none;border-bottom:0!important;font-size:13px;padding-left:0!important;padding-right:4px!important;box-sizing:border-box;position:relative;white-space:nowrap}.sof-meta .sof-right-value:after{content:"";position:absolute;left:0;right:4px;bottom:1px;border-bottom:1px solid #111}.sof-meta .sof-no-underline:after{display:none!important}
                .sof-meta tr:first-child .sof-value,.sof-meta tr:first-child .sof-right-value{font-size:14px;font-weight:700}                                 
                .sof-items{margin-top:10px;flex:1 1 auto;min-height:0;height:100%}.sof-items th{height:17px;background:#000;color:#fff;border:1px solid #000;font-size:13px;text-align:center;padding:3px 2px}.sof-items th:nth-child(1){width:5.6%}.sof-items th:nth-child(2){width:50.8%}.sof-items th:nth-child(3){width:5.8%}.sof-items th:nth-child(4){width:5.6%}.sof-items th:nth-child(5){width:12%}.sof-items th:nth-child(6){width:20.2%}.sof-items td{border:1px solid #888;text-align:center;height:10px;padding:0 3px;vertical-align:middle;line-height:11px}.sof-items .sof-item td{height:10px}.sof-center{text-align:center}.sof-number{text-align:right;white-space:nowrap}.sof-desc{font-size:13px;margin-top:3px}
                .sof-notes{height:22px;text-align:center;font-weight:bold;font-style:italic;color:#e00000;padding-top:0;font-size:13px}.sof-nothing{text-align:center;font-weight:bold;font-style:italic;height:16px}.sof-page-no{text-align:center;font-weight:bold;font-style:italic;height:16px;border-bottom:1px solid #aaa}
                .sof-bottom{break-inside:avoid}.sof-bottom td{border:1px solid #aaa;padding:2px 4px;height:14px}.sof-bottom .sof-spacer{border-left:0;border-right:0}.sof-bottom .sof-total-label{font-weight:600}.sof-bottom .sof-currency{text-align:center;width:4%}.sof-bottom .sof-amount{text-align:right;white-space:nowrap;width:19%}.sof-bottom .sof-selling td{background:#bdbdbd;font-weight:bold}.sof-bottom .sof-selling .sof-amount{font-size:12px}.sof-bottom .sof-gross td,.sof-bottom .sof-pct td{background:#bdbdbd;font-weight:bold}
                .sof-signatures{margin-top:5px;break-inside:avoid}.sof-signatures td{width:33.33%;border:0;border-top:1px solid #aaa;padding:4px 3px;text-align:center;height:21px;vertical-align:bottom}.sof-signatures .sof-sign-label{text-align:left;vertical-align:top;height:18px}.sof-signatures .sof-sign-name{font-weight:bold;text-decoration:underline;height:18px}.sof-signatures .sof-sign-role{font-size:13px;height:16px}.sof-signatures .sof-sign-gap td{height:11.5px;padding:0;border:0}.sof-dr-invoice{text-align:right;height:15px}
                .sof-company-footer{margin-top:5px;border-top:1px solid #aaa;border-bottom:1px solid #aaa;padding:3px 2px;font-size:9px;white-space:normal;line-height:1.15;break-inside:avoid;flex-shrink:0}.sof-code{font-size:9px;margin-top:auto;padding-top:4px;line-height:1.1;break-inside:avoid;flex-shrink:0}.sof-code div{margin-top:1px}
                @keyframes sofFade{from{opacity:0}to{opacity:1}}
                @media(max-width:650px){.sof-overlay{padding:5px}.sof-dialog{height:97vh}.sof-scroll{padding:8px}.sof-paper{width:8.5in;min-width:8.5in;padding:0.75in 0.7in}.sof-toolbar{padding:10px}.sof-toolbar h2{font-size:12px}}
                @media print{body>*:not(#soFormPreviewOverlay){display:none!important}.sof-overlay{position:static;display:block;padding:0;background:#fff}.sof-dialog{height:auto;width:100%;box-shadow:none;border-radius:0;overflow:visible}.sof-toolbar{display:none}.sof-scroll{overflow:visible;padding:0}.sof-paper{box-sizing:border-box;width:100%;box-shadow:none;max-width:none;min-height:0;padding:0;zoom:1}}
                /* Compact all Sales Order Form typography for preview and print */
                .sof-paper{font-size:10px!important}
                .sof-title-cell{font-size:18px!important}
                .sof-check-cell{font-size:10px!important}.sof-check-row{line-height:13px!important}
                .sof-meta td,.sof-meta .sof-value,.sof-meta .sof-right-value{font-size:10px!important;line-height:1.1!important}
                .sof-meta tr:first-child .sof-value,.sof-meta tr:first-child .sof-right-value{font-size:11px!important}
                .sof-items th{font-size:10px!important;padding:2px 1px!important;height:14px!important}
                .sof-items td,.sof-items .sof-item td{font-size:9px!important;line-height:9px!important;height:9px!important}
                .sof-desc{font-size:10px!important}.sof-items tbody tr:not(.sof-desc-footer) td:nth-child(2){text-align:left!important}.sof-items .sof-desc-footer td{font-size:9px!important;line-height:10px!important;height:10px!important;padding:1px 3px!important;border:1px solid #888!important;vertical-align:middle!important;color:#000!important;font-weight:700!important;text-align:center!important}.sof-items .sof-desc-footer td:nth-child(2){text-align:center!important;color:#000!important;font-weight:700!important}.sof-items .sof-desc-footer:nth-last-child(3) td,.sof-items .sof-desc-footer:nth-last-child(3) td:nth-child(2){color:#e00000!important}
                .sof-notes{font-size:10px!important;height:18px!important;line-height:1.1!important}
                .sof-nothing,.sof-page-no{font-size:9px!important;height:13px!important;line-height:1.1!important}
                .sof-bottom td{font-size:9px!important;padding:1px 3px!important;height:12px!important}
                .sof-bottom .sof-selling .sof-amount{font-size:10px!important}
                .sof-signatures td{font-size:9px!important;padding:3px 2px!important;height:17px!important}
                .sof-signatures .sof-sign-label,.sof-signatures .sof-sign-name{font-size:9px!important;height:15px!important}
                .sof-signatures .sof-sign-role{font-size:9px!important;height:13px!important}
                .sof-signatures .sof-sign-gap td{height:8px!important}
                .sof-dr-invoice{font-size:9px!important;height:12px!important}
                .sof-company-footer,.sof-code{font-size:8px!important}
                .sof-toolbar h2{font-size:12px!important}.sof-toolbar p{font-size:9px!important}
                .sof-actions button{font-size:9px!important}
            `;
            document.head.appendChild(style);
        }

        const overlay = document.createElement("div");
        overlay.id = "soFormPreviewOverlay";
        overlay.className = "sof-overlay";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Sales Order Form preview");
        overlay.innerHTML = `
            <div class="sof-dialog">
                <div class="sof-toolbar">
                    <div><h2>SALES ORDER FORM PREVIEW</h2><p>SOF No. ${escapeHTML(soNumber)} · document layout</p></div>
                    <div class="sof-actions"><button type="button" class="sof-zoom-btn sof-zoom-out" aria-label="Zoom out" title="Zoom out"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M7.5 10.5h6"></path></svg></button><button type="button" class="sof-zoom-btn sof-zoom-in" aria-label="Zoom in" title="Zoom in"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21M7.5 10.5h6M10.5 7.5v6"></path></svg></button><span class="sof-zoom-level" aria-live="polite">100%</span><button type="button" class="sof-print">PRINT</button><button type="button" class="sof-close">CLOSE ✕</button></div>
                </div>
                <div class="sof-scroll">
                    <div class="sof-paper">
                        <table class="sof-header"><tr>
                            <td class="sof-logo-cell"><img class="sof-logo" src="${logo}" alt="Greenmetal Electric Manufacturing Corporation"></td>
                            <td class="sof-title-cell">SALES ORDER FORM</td>
                            <td class="sof-check-cell"><div class="sof-check-row"><span class="sof-check"></span><span class="sof-dept">ACCOUNTING</span></div><div class="sof-check-row"><span class="sof-check"></span><span class="sof-dept">PURCHASING</span></div><div class="sof-check-row"><span class="sof-check"></span><span class="sof-dept">SALES</span></div></td>
                        </tr></table>
                        <table class="sof-meta">
                            <tr><td class="sof-label">Sold to:</td><td class="sof-value"><b>${shown(["CLIENT_NAME","clientName"])}</b></td><td class="sof-right-label">SOF No.:</td><td class="sof-right-value"><b>${shown(["SO_NUMBER","soNumber"])}</b></td></tr>
                            <tr><td class="sof-label">Billing Address:</td><td class="sof-value">${billingAddressShown()}</td><td class="sof-right-label">Date:</td><td class="sof-right-value">${dateShown(["DATE_CREATION","dateCreation","DATE","date"])}</td></tr>
                            <tr><td class="sof-label">Delivery Address:</td><td class="sof-value">${shown(["DELIVERY_ADDRESS","deliveryAddress"])}</td><td class="sof-right-label">P.O Number:</td><td class="sof-right-value">${shown(["PO_NUMBER","poNumber"])}</td></tr>
                            <tr><td class="sof-label">Classification:</td><td class="sof-value">${shown(["CLASSIFICATION","classification"])}</td><td class="sof-right-label">Terms:</td><td class="sof-right-value">${shown(["TERMS","terms"])}</td></tr>
                            <tr><td class="sof-label">Required Del. Date:</td><td class="sof-value">${dateShown(["REQUIRED_DELIVERY_DATE","requiredDeliveryDate","REQUIRED_DEL_DATE"])}</td><td class="sof-right-label">J.O No.:</td><td class="sof-right-value">${shown(["JOB_ORDER","jobOrder","JO"])}</td></tr>
                            <tr><td class="sof-label">Attention:</td><td class="sof-value">${shown(["ATTENTION","attention"])}</td><td class="sof-right-label">Quotation No.:</td><td class="sof-right-value">${shown(["QUOTATION_NO","quotationNo","QUOTATION_NUMBER","quotationNumber"])}</td></tr>
                            <tr><td class="sof-label">Project Name:</td><td class="sof-value">${shown(["PROJECT","project"])}</td><td class="sof-right-label">Account Manager:</td><td class="sof-right-value">${shown(["ACCOUNT_MANAGER","accountManager","SALES_ENGINEER","salesEngineer","SE","se"])}</td></tr>
                            <tr><td class="sof-label">Tin Number:</td><td class="sof-value">${shown(["TIN","tin"])}</td><td class="sof-right-label"></td><td class="sof-right-value sof-no-underline"></td></tr>
                        </table>
                        <table class="sof-items"><thead><tr><th>ITEM</th><th>DESCRIPTION</th><th>QTY</th><th>UNIT</th><th>UNIT PRICE</th><th>EXTENDED PRICE</th></tr></thead><tbody>
                            ${itemRows || ""}${blankRows}
                            <tr class="sof-desc-footer"><td></td><td>***WITH SHOPDRAWING***　***WITHOUT STOCK***</td><td colspan="4"></td></tr>
                            <tr class="sof-desc-footer"><td></td><td>***Nothing follows*******</td><td colspan="4"></td></tr>
                            <tr class="sof-desc-footer"><td></td><td>Page 1 of 1</td><td colspan="4"></td></tr>
                        </tbody></table>
                        <table class="sof-bottom">
                            <tr><td class="sof-spacer" colspan="3"></td><td class="sof-total-label">TOTAL</td><td class="sof-currency">₱</td><td class="sof-amount">${money(subtotal)}</td></tr>
                            <tr><td class="sof-spacer" colspan="3"></td><td class="sof-total-label">LESS DISCOUNT</td><td class="sof-currency">₱</td><td class="sof-amount">${money(discount)}</td></tr>
                            <tr><td class="sof-spacer" colspan="3"></td><td class="sof-total-label">ADDED VAT</td><td class="sof-currency">${vat ? "₱" : ""}</td><td class="sof-amount">${vat ? money(vat) : ""}</td></tr>
                            <tr class="sof-selling"><td class="sof-spacer" colspan="3"></td><td class="sof-total-label">TOTAL SELLING PRICE</td><td class="sof-currency">₱</td><td class="sof-amount">${money(selling)}</td></tr>
                            <tr class="sof-gross"><td class="sof-spacer" colspan="3"></td><td class="sof-total-label">TPC</td><td class="sof-currency"></td><td class="sof-amount">${value(["TPC","tpc"]) ? money(value(["TPC","tpc"])) : ""}</td></tr>
                            <tr class="sof-gross"><td class="sof-spacer" colspan="3"></td><td class="sof-total-label">GROSS PROFIT</td><td class="sof-currency">${value(["GROSS_PROFIT","grossProfit"]) ? "₱" : ""}</td><td class="sof-amount">${value(["GROSS_PROFIT","grossProfit"]) ? money(value(["GROSS_PROFIT","grossProfit"])) : ""}</td></tr>
                            <tr class="sof-pct"><td class="sof-spacer" colspan="3"></td><td class="sof-total-label">PERCENTAGE</td><td class="sof-currency"></td><td class="sof-amount">${escapeHTML(value(["PERCENTAGE","percentage"]))}</td></tr>
                        </table>
                        <table class="sof-signatures">
                            <tr><td class="sof-sign-label">Prepared by:</td><td class="sof-sign-label">Checked by:</td><td class="sof-sign-label">Approved by:</td></tr>
                            <tr class="sof-sign-gap"><td></td><td></td><td></td></tr>
                            <tr><td class="sof-sign-name">Katrina Mae S. Tagatac</td><td class="sof-sign-name">Kaye B. Ochoa</td><td class="sof-sign-name">Melannie C. Mendiola</td></tr>
                            <tr><td class="sof-sign-role">Sales Coordinator</td><td class="sof-sign-role">Sales Account Manager</td><td class="sof-sign-role">Finance Manager</td></tr>
                            <tr class="sof-sign-gap"><td></td><td></td><td></td></tr>
                            <tr><td></td><td></td><td class="sof-dr-invoice">DR # __________________</td></tr>
                            <tr class="sof-sign-gap"><td></td><td></td><td></td></tr>
                            <tr><td></td><td></td><td class="sof-dr-invoice">Invoice # _______________</td></tr>
                        </table>
                        <div class="sof-company-footer">Greenmetal Electric Manufacturing Corporation: Dolores St. cor. Camia St., Dolmar Golden Hills Subd., Llano Road, Caloocan City　 Contact Nos.: 0917 708 4533 (Globe) 8356-5128 (Landline)</div>
                        <div class="sof-code"><div>F-SAM-003</div><div>Rev. 2 06-01-23</div></div>
                    </div>
                </div>
            </div>`;

        let sofZoom = 1;
        const sofPaper = overlay.querySelector(".sof-paper");
        const sofZoomLevel = overlay.querySelector(".sof-zoom-level");
        const applySofZoom = function() {
            sofPaper.style.zoom = String(sofZoom);
            sofZoomLevel.textContent = Math.round(sofZoom * 100) + "%";
        };
        overlay.querySelector(".sof-zoom-in").addEventListener("click", function() {
            sofZoom = Math.min(1.6, Math.round((sofZoom + 0.1) * 10) / 10);
            applySofZoom();
        });
        overlay.querySelector(".sof-zoom-out").addEventListener("click", function() {
            sofZoom = Math.max(0.5, Math.round((sofZoom - 0.1) * 10) / 10);
            applySofZoom();
        });

        const close = function() {
            overlay.remove();
            document.removeEventListener("keydown", escapeHandler);
        };
        const escapeHandler = function(event) {
            if (event.key === "Escape") close();
        };
        overlay.addEventListener("click", function(event) {
            if (event.target === overlay) close();
        });
        overlay.querySelector(".sof-close").addEventListener("click", close);
        overlay.querySelector(".sof-print").addEventListener("click", function() {
            /*
             * Print the exact same rendered preview in an isolated window.
             * This avoids the application's global print CSS hiding the SOF
             * and prevents a blank print page.
             */
            const printWindow = window.open("", "_blank", "width=1000,height=800");
            if (!printWindow) {
                alert("Hindi mabuksan ang print window. Payagan ang pop-ups para sa site na ito, pagkatapos subukan ulit.");
                return;
            }

            const previewStyles = document.getElementById("soFormPreviewStyles");
            const printStyles = previewStyles ? previewStyles.textContent : "";
            const previewMarkup = overlay.outerHTML;

            printWindow.document.open();
            printWindow.document.write(
                "<!doctype html><html><head><meta charset='utf-8'>" +
                "<meta name='viewport' content='width=device-width, initial-scale=1'>" +
                "<title></title>" +
                "<style>" + printStyles + "\\n" +
                "@page{size:8.5in 14in;margin:0!important}" +
                "html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}" +
                "#soFormPreviewOverlay{position:static!important;display:block!important;inset:auto!important;padding:0!important;background:#fff!important;backdrop-filter:none!important}" +
                ".sof-dialog{height:auto!important;width:auto!important;max-width:none!important;overflow:visible!important;box-shadow:none!important;border-radius:0!important;background:#fff!important}" +
                ".sof-toolbar{display:none!important}.sof-scroll{overflow:visible!important;padding:0!important;display:block!important}" +
                ".sof-paper{box-sizing:border-box!important;display:flex!important;flex-direction:column!important;width:8.5in!important;min-width:8.5in!important;max-width:8.5in!important;height:14in!important;min-height:14in!important;margin:0!important;padding:.75in .7in!important;box-shadow:none!important;zoom:1!important}.sof-items{flex:1 1 auto!important;min-height:0!important;height:100%!important}.sof-company-footer,.sof-code{flex-shrink:0!important}.sof-code{margin-top:auto!important}" +
                "</style></head><body>" + previewMarkup + "</body></html>"
            );
            printWindow.document.close();

            const startPrint = function() {
                const images = Array.from(printWindow.document.images);
                Promise.all(images.map(function(img) {
                    if (img.complete) return Promise.resolve();
                    return new Promise(function(resolve) {
                        img.onload = resolve;
                        img.onerror = resolve;
                    });
                })).then(function() {
                    printWindow.focus();
                    printWindow.print();
                });
            };

            if (printWindow.document.readyState === "complete") {
                startPrint();
            } else {
                printWindow.onload = startPrint;
            }
        });
        document.addEventListener("keydown", escapeHandler);
        document.body.appendChild(overlay);
        overlay.querySelector(".sof-close").focus();
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
                        colspan="7"
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


                const itemName =
                    getSOValue(
                        item,
                        [
                            "ITEM_NAME",
                            "itemName",
                            "item_name",
                            "ITEM NAME",
                            "NAME"
                        ]
                    ) || "";


                const description =
                    getSOValue(
                        item,
                        [
                            "DESCRIPTION",
                            "description",
                            "ITEM_DESCRIPTION",
                            "itemDescription"
                        ]
                    ) || "";


                const unit =
                    getSOValue(
                        item,
                        [
                            "UNIT",
                            "unit",
                            "UOM",
                            "uom"
                        ]
                    ) || "";


                const quantity =
                    toNumber(
                        getSOValue(
                            item,
                            [
                                "QTY",
                                "qty",
                                "QUANTITY",
                                "quantity"
                            ]
                        )
                    );


                // Sales Order entry saves the per-piece price as amount.
                const unitPrice =
                    toNumber(
                        getSOValue(
                            item,
                            [
                                "UNIT_PRICE",
                                "unitPrice",
                                "AMOUNT",
                                "amount",
                                "PRICE",
                                "price"
                            ]
                        )
                    );


                row.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>
                        <input
                            type="text"
                            class="detail-item-input"
                            data-field="ITEM_NAME"
                            value="${escapeAttribute(itemName)}"
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
                    data-field="ITEM_NAME"
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

   async function loadSOFiles(data) {
    const container = document.getElementById("detailSOFileList");

    if (!container) return;

    const documents =
        data.documents ||
        data.salesOrder?.documents ||
        data.so?.documents ||
        [];

    container.innerHTML = "";

    if (!documents.length) {
        container.innerHTML =
            `<div class="so-file-empty">No files attached.</div>`;
        return;
    }

    documents.forEach(function (fileDocument) {
        const name =
            getSOValue(
                fileDocument,
                ["FILE_NAME", "fileName", "NAME", "name"]
            ) || "File";

        const url =
            getSOValue(
                fileDocument,
                ["FILE_URL", "fileUrl", "URL", "url"]
            );

        const item = document.createElement("div");
        item.className = "so-file-item";

        if (url) {
            const link = document.createElement("a");
            link.href = url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.textContent = name;

            item.appendChild(link);
        } else {
            item.textContent = name;
        }

        container.appendChild(item);
    });
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

        if (!canCreateSalesOrderByRole()) {
            alert("Access denied. Only ADMIN and SALES roles can create Sales Orders.");
            return;
        }

        window.location.href =
            CREATE_SALES_ORDER_PAGE;

    }

/* =========================================================
   CUSTOMER TABLE - ULTRA FAST LOAD
========================================================= */

async function loadCustomerTable(
    forceRefresh = false
) {

    /* -----------------------------------------------------
       ALREADY LOADED
    ----------------------------------------------------- */

    if (
        customersLoaded &&
        !forceRefresh
    ) {

        renderCustomerTable();

        return;

    }


    /* -----------------------------------------------------
       1. LOAD FROM INDEXEDDB FIRST
    ----------------------------------------------------- */

    let cachedCustomers = [];

    if (window.LogisTechCache) {

        try {

            cachedCustomers =
                await window.LogisTechCache
                    .getAll("customers");

        } catch (error) {

            console.warn(
                "Customer cache read failed:",
                error
            );

        }

    }


    /* -----------------------------------------------------
       2. RENDER CACHE IMMEDIATELY
    ----------------------------------------------------- */

    if (
        Array.isArray(
            cachedCustomers
        ) &&
        cachedCustomers.length > 0
    ) {

        customers =
            normalizeCustomers(
                cachedCustomers
            );

        customersLoaded = true;

        renderCustomerTable();

        return;

    }


    /* -----------------------------------------------------
       3. NO CACHE
       LOAD FROM GOOGLE APPS SCRIPT
    ----------------------------------------------------- */

    try {

        const result =
            await salesOrderAPI(
                "getCustomers",
                {}
            );


        customers =
            normalizeCustomers(
                result
            );

        customersLoaded = true;


        renderCustomerTable();


        /* -------------------------------------------------
           4. SAVE TO CACHE IN BACKGROUND
           DO NOT WAIT FOR IT
        ------------------------------------------------- */

        if (
            window.LogisTechCache &&
            customers.length
        ) {

            Promise.all(
                customers.map(
                    function (customer) {

                        return window.LogisTechCache
                            .put(
                                "customers",
                                customer
                            )
                            .catch(
                                function (error) {

                                    console.warn(
                                        "Customer cache write failed:",
                                        error
                                    );

                                }
                            );

                    }
                )
            );

        }


    } catch (error) {

        console.error(
            "Unable to load customers:",
            error
        );


        if (
            customers.length
        ) {

            renderCustomerTable();

            return;

        }


        renderCustomerTableError(
            error.message
        );

    }

}

/* =====================================================
   NORMALIZE CUSTOMERS
===================================================== */

function normalizeCustomers(
    result
) {

    if (!result) {

        return [];

    }


    if (
        Array.isArray(result)
    ) {

        return result;

    }


    if (
        Array.isArray(result.records)
    ) {

        return result.records;

    }


    if (
        Array.isArray(result.customers)
    ) {

        return result.customers;

    }


    if (
        Array.isArray(result.data)
    ) {

        return result.data;

    }


    if (
        result.data &&
        Array.isArray(
            result.data.records
        )
    ) {

        return result.data.records;

    }


    if (
        result.data &&
        Array.isArray(
            result.data.customers
        )
    ) {

        return result.data.customers;

    }


    return [];

}


/* =====================================================
   RENDER CUSTOMER TABLE
===================================================== */

function renderCustomerTable() {

    const tbody =
        document.getElementById(
            "customerTableBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    const filteredCustomers =
        getFilteredCustomers()
            .slice()
            .sort(function (a, b) {
                function customerRecency(customer) {
                    const rawDate = getCustomerValue(customer, [
                        "DATE_CREATED", "dateCreated", "CREATED_AT", "createdAt",
                        "CREATED_DATE", "createdDate", "DATE_CREATION", "dateCreation",
                        "TIMESTAMP", "timestamp"
                    ]);
                    const parsed = rawDate ? new Date(rawDate).getTime() : 0;
                    if (parsed && !Number.isNaN(parsed)) return parsed;

                    const id = String(getCustomerValue(customer, [
                        "CUSTOMER_ID", "customerId", "CUSTOMERID", "ID", "id"
                    ]) || "");
                    const match = id.match(/(\d+)\s*$/);
                    return match ? Number(match[1]) : 0;
                }
                return customerRecency(b) - customerRecency(a);
            })
            .slice(0, 5);


    if (!filteredCustomers.length) {

        const row =
            document.createElement(
                "tr"
            );


        row.innerHTML = `

            <td
                colspan="7"
                class="customer-table-empty"
            >
                No customers found.
            </td>

        `;


        tbody.appendChild(
            row
        );


        bindCustomerTableControls();

        return;

    }


    filteredCustomers.forEach(
        function (customer) {

            const row =
                document.createElement(
                    "tr"
                );


            const customerId =
                getCustomerValue(
                    customer,
                    [
                        "CUSTOMER_ID",
                        "customerId",
                        "CUSTOMERID",
                        "ID",
                        "id"
                    ]
                );


            const clientName =
                getCustomerValue(
                    customer,
                    [
                        "CLIENT_NAME",
                        "clientName",
                        "CLIENT",
                        "client"
                    ]
                );


            const attention =
                getCustomerValue(
                    customer,
                    [
                        "ATTENTION",
                        "attention"
                    ]
                );


            const contact =
                getCustomerValue(
                    customer,
                    [
                        "CONTACT",
                        "contact",
                        "CONTACT_NUMBER",
                        "contactNumber",
                        "PHONE",
                        "phone"
                    ]
                );


            const email =
                getCustomerValue(
                    customer,
                    [
                        "EMAIL",
                        "email",
                        "EMAIL_ADDRESS",
                        "emailAddress"
                    ]
                );


            const status =
                getCustomerValue(
                    customer,
                    [
                        "STATUS",
                        "status"
                    ]
                ) || "ACTIVE";


            row.dataset.customerId =
                customerId;


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                            customerId || "-"
                        )}
                    </strong>
                </td>

                <td>
                    ${escapeHTML(
                        clientName || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        attention || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        contact || "-"
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        email || "-"
                    )}
                </td>

                <td>

                    <span
                        class="customer-status-badge ${getStatusClass(status)}"
                    >
                        ${escapeHTML(
                            status
                        )}
                    </span>

                </td>

                <td>

                    <button
                        type="button"
                        class="customer-edit-button"
                        data-customer-id="${escapeAttribute(customerId)}"
                    >
                        EDIT
                    </button>

                    <button
                        type="button"
                        class="customer-view-button"
                        data-customer-id="${escapeAttribute(customerId)}"
                        aria-label="View customer details"
                    >
                        VIEW
                    </button>

                </td>

            `;


            /*
             * Always reopen and initialize the Customer module before
             * calling editCustomer(). After Back, the global function can
             * still exist even though the Customer form DOM was cleared.
             * Calling it directly in that state makes the Edit button fail.
             */
            const editButton =
                row.querySelector(".customer-edit-button");

            if (editButton) {
                editButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    const selectedCustomerId = customerId;

                    openCustomerModule()
                        .then(function () {
                            if (typeof window.editCustomer !== "function") {
                                throw new Error("Customer Edit module failed to initialize.");
                            }

                            window.editCustomer(selectedCustomerId);
                        })
                        .catch(function (error) {
                            console.error("Unable to open Customer Edit:", error);
                            alert("Unable to open Customer Edit module. Please try again. " +
                                (error && error.message ? error.message : ""));
                        });
                });
            }


            const viewButton = row.querySelector(".customer-view-button");

            if (viewButton) {
                viewButton.addEventListener("click", function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    const selectedCustomer = customers.find(function (entry) {
                        return String(getCustomerValue(entry, [
                            "CUSTOMER_ID", "customerId", "CUSTOMERID", "ID", "id"
                        ]) || "") === String(customerId || "");
                    }) || customer;

                    openCustomerViewModal(selectedCustomer);
                });
            }


            tbody.appendChild(
                row
            );

        }
    );


    bindCustomerTableControls();

}

/* =========================================================
   CUSTOMER VIEW MODAL
========================================================= */
function openCustomerViewModal(customer) {
    if (!customer) {
        alert("Customer details are not available.");
        return;
    }

    const existingModal = document.getElementById("customerViewModal");
    if (existingModal) existingModal.remove();

    if (!document.getElementById("customerViewModalStyles")) {
        const style = document.createElement("style");
        style.id = "customerViewModalStyles";
        style.textContent = `
            .customer-view-overlay {
                position: fixed; inset: 0; z-index: 10050;
                display: flex; align-items: center; justify-content: center;
                padding: 22px; background: rgba(15, 23, 42, .58);
                backdrop-filter: blur(4px);
                animation: customerViewFadeIn .18s ease-out;
            }
            .customer-view-dialog {
                width: min(760px, 100%); max-height: min(88vh, 900px);
                overflow: auto; background: #f8fafc; color: #172033;
                border: 1px solid #dbe3ef; border-radius: 16px;
                box-shadow: 0 24px 80px rgba(15, 23, 42, .28);
                animation: customerViewSlideIn .2s ease-out;
            }
            .customer-view-head {
                display: flex; align-items: flex-start; justify-content: space-between;
                gap: 16px; padding: 22px 24px; color: white;
                background: linear-gradient(125deg, #173b72, #315ea8);
                border-radius: 15px 15px 0 0;
            }
            .customer-view-head h2 { margin: 0 0 5px; font-size: 20px; line-height: 1.3; }
            .customer-view-head p { margin: 0; font-size: 12px; color: #dbeafe; }
            .customer-view-close {
                display: inline-flex; align-items: center; justify-content: center;
                width: 34px; height: 34px; flex: 0 0 34px; border-radius: 9px;
                border: 1px solid rgba(255,255,255,.35); background: rgba(255,255,255,.12);
                color: #fff; font-size: 22px; cursor: pointer;
            }
            .customer-view-body { display: grid; gap: 14px; padding: 20px 24px 24px; }
            .customer-view-section {
                padding: 16px; background: #fff; border: 1px solid #e1e8f0;
                border-radius: 11px; box-shadow: 0 2px 8px rgba(15,23,42,.025);
            }
            .customer-view-section h3 {
                margin: 0 0 13px; color: #315ea8; font-size: 11px;
                letter-spacing: .7px; text-transform: uppercase;
            }
            .customer-view-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px 18px; }
            .customer-view-field { min-width: 0; }
            .customer-view-field.wide { grid-column: 1 / -1; }
            .customer-view-field span {
                display: block; margin-bottom: 5px; color: #748094;
                font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .35px;
            }
            .customer-view-field strong {
                display: block; color: #1e293b; font-size: 12.5px; font-weight: 600;
                line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere;
            }
            .customer-view-status {
                display: inline-flex !important; width: fit-content; padding: 4px 9px;
                border-radius: 20px; background: #e8f7ee; color: #187443 !important;
                font-size: 10px !important; letter-spacing: .3px;
            }
            .customer-view-footer {
                display: flex; justify-content: flex-end; padding-top: 2px;
            }
            .customer-view-footer button {
                min-height: 38px; padding: 0 17px; border: 1px solid #d5dce7;
                border-radius: 8px; background: #fff; color: #334155;
                font: 700 11px inherit; cursor: pointer;
            }
            @keyframes customerViewFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes customerViewSlideIn { from { opacity: 0; transform: translateY(10px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @media (max-width: 560px) {
                .customer-view-overlay { padding: 10px; }
                .customer-view-head { padding: 18px; }
                .customer-view-head h2 { font-size: 17px; }
                .customer-view-body { padding: 12px; }
                .customer-view-grid { grid-template-columns: 1fr; }
                .customer-view-field.wide { grid-column: auto; }
            }
        `;
        document.head.appendChild(style);
    }

    const value = function (keys) {
        const result = getCustomerValue(customer, keys);
        return result == null || String(result).trim() === "" ? "—" : String(result);
    };
    const field = function (label, keys, wide, status) {
        const result = value(keys);
        return `<div class="customer-view-field${wide ? " wide" : ""}">
            <span>${escapeHTML(label)}</span>
            ${status && result !== "—"
                ? `<strong class="customer-view-status">${escapeHTML(result)}</strong>`
                : `<strong>${escapeHTML(result)}</strong>`}
        </div>`;
    };
    const clientName = value(["CLIENT_NAME", "clientName", "CLIENT", "client"]);
    const customerId = value(["CUSTOMER_ID", "customerId", "CUSTOMERID", "ID", "id"]);
    const status = value(["STATUS", "status"]) || "ACTIVE";

    const modal = document.createElement("div");
    modal.id = "customerViewModal";
    modal.className = "customer-view-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "Customer details");
    modal.innerHTML = `
        <div class="customer-view-dialog">
            <header class="customer-view-head">
                <div>
                    <h2>${escapeHTML(clientName)}</h2>
                    <p>Customer Details · ${escapeHTML(customerId)}</p>
                </div>
                <button type="button" class="customer-view-close" aria-label="Close customer details">×</button>
            </header>
            <div class="customer-view-body">
                <section class="customer-view-section">
                    <h3>Customer Identification</h3>
                    <div class="customer-view-grid">
                        ${field("Customer ID", ["CUSTOMER_ID", "customerId", "CUSTOMERID", "ID", "id"])}
                        ${field("Status", ["STATUS", "status"], false, true)}
                        ${field("Client Name", ["CLIENT_NAME", "clientName", "CLIENT", "client"])}
                        ${field("Attention / Contact Person", ["ATTENTION", "attention"])}
                        ${field("TIN", ["TIN", "tin"])}
                    </div>
                </section>
                <section class="customer-view-section">
                    <h3>Contact Information</h3>
                    <div class="customer-view-grid">
                        ${field("Contact Number", ["CONTACT_NUMBER", "contactNumber", "CONTACT", "contact", "PHONE", "phone"])}
                        ${field("Email Address", ["EMAIL", "email", "EMAIL_ADDRESS", "emailAddress"])}
                    </div>
                </section>
                <section class="customer-view-section">
                    <h3>Addresses</h3>
                    <div class="customer-view-grid">
                        ${field("Billing Address", ["BILLING_ADDRESS", "billingAddress"], true)}
                        ${field("Delivery Address", ["DELIVERY_ADDRESS", "deliveryAddress"], true)}
                    </div>
                </section>
                <section class="customer-view-section">
                    <h3>System Information</h3>
                    <div class="customer-view-grid">
                        ${field("Created At", ["CREATED_AT", "createdAt", "DATE_CREATED", "dateCreated"])}
                        ${field("Updated At", ["UPDATED_AT", "updatedAt", "DATE_UPDATED", "dateUpdated"])}
                    </div>
                </section>
                <div class="customer-view-footer">
                    <button type="button" class="customer-view-dismiss">Close</button>
                </div>
            </div>
        </div>`;

    const closeModal = function () {
        modal.remove();
        document.removeEventListener("keydown", handleEscape);
    };
    const handleEscape = function (event) {
        if (event.key === "Escape") closeModal();
    };
    modal.addEventListener("click", function (event) {
        if (event.target === modal) closeModal();
    });
    modal.querySelector(".customer-view-close").addEventListener("click", closeModal);
    modal.querySelector(".customer-view-dismiss").addEventListener("click", closeModal);
    document.addEventListener("keydown", handleEscape);
    document.body.appendChild(modal);
    modal.querySelector(".customer-view-close").focus();
}


/* =========================================================
   CUSTOMER TABLE SEARCH / FILTER
========================================================= */

function bindCustomerTableControls() {

    const searchInput =
        document.getElementById(
            "customerSearchInput"
        );

    const statusFilter =
        document.getElementById(
            "customerStatusFilter"
        );


    if (searchInput) {

        searchInput.oninput =
            function () {

                renderCustomerTable();

            };

    }


    if (statusFilter) {

        statusFilter.onchange =
            function () {

                renderCustomerTable();

            };

    }

}


/* =========================================================
   GET FILTERED CUSTOMERS
========================================================= */

function getFilteredCustomers() {

    const searchInput =
        document.getElementById(
            "customerSearchInput"
        );

    const statusFilter =
        document.getElementById(
            "customerStatusFilter"
        );


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const status =
        statusFilter
            ? statusFilter.value
            : "ALL";


    return customers.filter(
        function (customer) {

            const customerId =
                getCustomerValue(
                    customer,
                    [
                        "CUSTOMER_ID",
                        "customerId",
                        "CUSTOMERID",
                        "ID",
                        "id"
                    ]
                );


            const clientName =
                getCustomerValue(
                    customer,
                    [
                        "CLIENT_NAME",
                        "clientName",
                        "CLIENT",
                        "client"
                    ]
                );


            const attention =
                getCustomerValue(
                    customer,
                    [
                        "ATTENTION",
                        "attention"
                    ]
                );


            const contact =
                getCustomerValue(
                    customer,
                    [
                        "CONTACT",
                        "contact",
                        "CONTACT_NUMBER",
                        "contactNumber",
                        "PHONE",
                        "phone"
                    ]
                );


            const email =
                getCustomerValue(
                    customer,
                    [
                        "EMAIL",
                        "email",
                        "EMAIL_ADDRESS",
                        "emailAddress"
                    ]
                );


            const customerStatus =
                String(
                    getCustomerValue(
                        customer,
                        [
                            "STATUS",
                            "status"
                        ]
                    ) || "ACTIVE"
                )
                    .trim()
                    .toUpperCase();


            const searchableText = [

                customerId,
                clientName,
                attention,
                contact,
                email

            ]
                .map(
                    function (value) {

                        return String(
                            value || ""
                        ).toLowerCase();

                    }
                )
                .join(" ");


            const matchesSearch =
                !search ||
                searchableText.includes(
                    search
                );


            const matchesStatus =
                status === "ALL" ||
                customerStatus === status;


            return (
                matchesSearch &&
                matchesStatus
            );
        }
    );
}
/* =====================================================
   CUSTOMER VALUE HELPER
===================================================== */
function getCustomerValue(
    customer,
    keys
) {
    if (!customer) {
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
            customer[key] !== undefined &&
            customer[key] !== null
        ) {
            return customer[key];
        }
    }
    return "";
}
/* =====================================================
   CUSTOMER TABLE ERROR
===================================================== */
function renderCustomerTableError(
    message
) {
    const tbody =
        document.getElementById(
            "customerTableBody"
        );
    if (!tbody) {
        return;
    }
    tbody.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="customer-table-empty"
            >
                Unable to load customers.
                ${escapeHTML(
                    message || ""
                )}
            </td>
        </tr>    
    `;
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


    /*
     * Refresh Customer Table
     *
     * create-customer.js already saves
     * the customer into IndexedDB.
     */

    customersLoaded =
        false;


    loadCustomerTable();

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

               /*
         * Reload Customers from synchronized cache
         */

        if (
            window.LogisTechCache
        ) {

            window.LogisTechCache
                .getAll("customers")
                .then(
                    function (cachedCustomers) {

                        if (
                            !Array.isArray(
                                cachedCustomers
                            )
                        ) {

                            return;

                        }


                        customers =
                            normalizeCustomers(
                                cachedCustomers
                            );


                        customersLoaded =
                            true;


                        renderCustomerTable();


                        console.log(
                            "LOGIS-TECH: Customer Table updated from synchronized cache."
                        );

                    }
                )
                .catch(
                    function (error) {

                        console.error(
                            "Unable to refresh Customer cache:",
                            error
                        );

                    }
                );

        }

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

   window.loadCustomerTable =
    loadCustomerTable;

window.renderCustomerTable =
    renderCustomerTable;

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
