/* =========================================================
   LOGIS-TECH SYSTEM
   SALES ORDER MODULE
   sales-order.js

   VERSION: 20261007-01

   FEATURES:
   - Load Sales Orders
   - Search
   - Filter
   - Select SO
   - Double Click View
   - SO Details
   - SO Items
   - Update SO
   - Cancel SO
   - SO Files
   - DR History
   - Invoice History
   - Payment History
   - Transaction Summary
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const SALES_ORDER_API_URL =
        "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";


    const API_MAX_RETRIES =
        3;


    const API_RETRY_DELAY =
        800;


    const SO_FILE_MAX_SIZE =
        10 * 1024 * 1024;


    const VAT_RATE =
        0.12;


    /* =====================================================
       STATE
    ===================================================== */

    let salesOrders =
        [];

    let selectedSO =
        null;

    let currentSO =
        null;

    let soDetailsEditMode =
        false;

    let salesOrdersLoaded =
        false;

    let customerModuleLoaded =
        false;


    const soDetailsCache =
        {};


    /* =====================================================
       BASIC HELPERS
    ===================================================== */

    function wait(ms) {

        return new Promise(
            function(resolve) {

                setTimeout(
                    resolve,
                    ms
                );

            }
        );

    }


    function getSOValue(
        object,
        ...keys
    ) {

        if (!object) {

            return "";

        }


        for (
            const key of keys
        ) {

            if (
                object[key] !==
                undefined &&
                object[key] !==
                null
            ) {

                return object[key];

            }

        }


        return "";

    }


    function setValue(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (!element) {

            return;

        }


        element.value =
            value === null ||
            value === undefined
                ? ""
                : value;

    }


    function getValue(
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


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (!element) {

            return;

        }


        element.textContent =
            value === null ||
            value === undefined
                ? ""
                : value;

    }


    function escapeHTML(
        value
    ) {

        return String(
            value === undefined ||
            value === null
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


    function escapeAttribute(
        value
    ) {

        return escapeHTML(
            value
        )
        .replace(
            /`/g,
            "&#096;"
        );

    }


    function formatMoney(
        value
    ) {

        const amount =
            Number(
                value ||
                0
            );


        return "₱" +
            amount.toLocaleString(
                "en-PH",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

    }


    function formatSODate(
        value
    ) {

        if (!value) {

            return "";

        }


        const date =
            new Date(
                value
            );


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return String(
                value
            );

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


    function parseSODate(
        value
    ) {

        if (!value) {

            return 0;

        }


        const date =
            new Date(
                value
            );


        const time =
            date.getTime();


        return isNaN(time)
            ? 0
            : time;

    }


    function compareSalesOrderDate(
        a,
        b
    ) {

        return (
            parseSODate(
                getSOValue(
                    b,
                    "dateCreation",
                    "DATE_CREATION",
                    "date"
                )
            )
            -
            parseSODate(
                getSOValue(
                    a,
                    "dateCreation",
                    "DATE_CREATION",
                    "date"
                )
            )
        );

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

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "text/plain;charset=utf-8"

                        },

                        body:
                            JSON.stringify({

                                action:
                                    action,

                                data:
                                    data

                            })

                    }
                );


            const text =
                await response.text();


            let result;


            try {

                result =
                    JSON.parse(
                        text
                    );

            } catch (
                parseError
            ) {

                throw new Error(
                    "Invalid server response."
                );

            }


            if (
                !result
            ) {

                throw new Error(
                    "Empty server response."
                );

            }


            return result;


        } catch (error) {

            console.error(
                "SALES ORDER API ERROR:",
                action,
                error
            );


            if (
                retryCount <
                API_MAX_RETRIES
            ) {

                await wait(
                    API_RETRY_DELAY *
                    (
                        retryCount + 1
                    )
                );


                return salesOrderAPI(
                    action,
                    data,
                    retryCount + 1
                );

            }


            return {

                success:
                    false,

                message:
                    error.message,

                error:
                    error.message

            };

        }

    }


    /* =====================================================
       STATUS HELPERS
    ===================================================== */

    function getSOStatus(
        so
    ) {

        return String(
            getSOValue(
                so,
                "status",
                "STATUS"
            ) ||
            "OPEN"
        )
        .trim()
        .toUpperCase();

    }


    function isActiveSO(
        so
    ) {

        const status =
            getSOStatus(
                so
            );


        return (
            status !==
            "CANCELLED"
        );

    }


    function isPartialSO(
        so
    ) {

        const status =
            getSOStatus(
                so
            );


        return (
            status ===
            "PARTIAL"
        );

    }


    function isCompletedSO(
        so
    ) {

        const status =
            getSOStatus(
                so
            );


        return (
            status ===
            "COMPLETED"
        );

    }


    function isCancelledSO(
        so
    ) {

        const status =
            getSOStatus(
                so
            );


        return (
            status ===
            "CANCELLED"
        );

    }


    /* =====================================================
       LOAD SO LIST
    ===================================================== */

    async function loadSOList(
        forceRefresh = false
    ) {

        if (
            salesOrdersLoaded &&
            !forceRefresh
        ) {

            renderSOList(
                salesOrders
            );

            updateSOSummary();

            return;

        }


        const tbody =
            document.getElementById(
                "soTableBody"
            );


        if (tbody) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="12"
                        style="text-align:center;padding:30px;"
                    >
                        Loading Sales Orders...
                    </td>

                </tr>

            `;

        }


        const result =
            await salesOrderAPI(
                "getSalesOrders",
                {}
            );


        if (
            !result ||
            result.success !== true
        ) {

            console.error(
                "LOAD SO LIST ERROR:",
                result
            );


            if (tbody) {

                tbody.innerHTML = `

                    <tr>

                        <td
                            colspan="12"
                            style="text-align:center;padding:30px;"
                        >
                            Unable to load Sales Orders.
                        </td>

                    </tr>

                `;

            }


            return;

        }


        salesOrders =
            result.salesOrders ||
            result.data ||
            [];


        salesOrdersLoaded =
            true;


        salesOrders.forEach(
            function(so) {

                const number =
                    getSOValue(
                        so,
                        "soNumber",
                        "SO_NUMBER"
                    );


                if (number) {

                    soDetailsCache[
                        String(number)
                    ] =
                        so;

                }

            }
        );


        updateSOSummary();


        renderSOList(
            salesOrders
        );


        renderRecentSalesOrders();

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function updateSOSummary() {

        const total =
            salesOrders.length;


        const active =
            salesOrders.filter(
                isActiveSO
            ).length;


        const partial =
            salesOrders.filter(
                isPartialSO
            ).length;


        const completed =
            salesOrders.filter(
                isCompletedSO
            ).length;


        const cancelled =
            salesOrders.filter(
                isCancelledSO
            ).length;


        const mappings = {

            total: [
                "totalSalesOrder",
                "totalSO"
            ],

            active: [
                "activeSalesOrder",
                "activeSO"
            ],

            partial: [
                "partialSalesOrder",
                "partialSO"
            ],

            completed: [
                "completedSalesOrder",
                "completedSO"
            ],

            cancelled: [
                "cancelledSalesOrder",
                "cancelledSO"
            ]

        };


        function updateIds(
            ids,
            value
        ) {

            ids.forEach(
                function(id) {

                    setText(
                        id,
                        value
                    );

                }
            );

        }


        updateIds(
            mappings.total,
            total
        );


        updateIds(
            mappings.active,
            active
        );


        updateIds(
            mappings.partial,
            partial
        );


        updateIds(
            mappings.completed,
            completed
        );


        updateIds(
            mappings.cancelled,
            cancelled
        );

    }


    /* =====================================================
       RECENT SALES ORDERS
    ===================================================== */

    function renderRecentSalesOrders() {

        const container =
            document.getElementById(
                "recentSalesOrders"
            );


        if (!container) {

            return;

        }


        const recent =
            [...salesOrders]
            .sort(
                compareSalesOrderDate
            )
            .slice(
                0,
                5
            );


        if (!recent.length) {

            container.innerHTML = `

                <div class="empty-state">
                    No Sales Orders found.
                </div>

            `;

            return;

        }


        container.innerHTML =
            recent
            .map(
                function(so) {

                    const number =
                        getSOValue(
                            so,
                            "soNumber",
                            "SO_NUMBER"
                        );


                    const client =
                        getSOValue(
                            so,
                            "clientName",
                            "CLIENT_NAME"
                        );


                    const date =
                        getSOValue(
                            so,
                            "dateCreation",
                            "DATE_CREATION"
                        );


                    const total =
                        getSOValue(
                            so,
                            "grandTotal",
                            "GRAND_TOTAL"
                        );


                    return `

                        <div
                            class="recent-so-item"
                            data-so="${escapeAttribute(number)}"
                        >

                            <div>

                                <strong>
                                    ${escapeHTML(number)}
                                </strong>

                                <span>
                                    ${escapeHTML(client)}
                                </span>

                            </div>

                            <div>

                                <span>
                                    ${formatSODate(date)}
                                </span>

                                <strong>
                                    ${formatMoney(total)}
                                </strong>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


        container
            .querySelectorAll(
                ".recent-so-item"
            )
            .forEach(
                function(element) {

                    const number =
                        element.dataset.so;


                    element.addEventListener(
                        "click",
                        function() {

                            selectSO(
                                number
                            );

                        }
                    );


                    element.addEventListener(
                        "dblclick",
                        function() {

                            openSODetails(
                                number
                            );

                        }
                    );

                }
            );

    }


    /* =====================================================
       RENDER SO LIST
    ===================================================== */

    function renderSOList(
        records
    ) {

        const tbody =
            document.getElementById(
                "soTableBody"
            );


        if (!tbody) {

            return;

        }


        if (
            !Array.isArray(
                records
            ) ||
            !records.length
        ) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="12"
                        style="text-align:center;padding:30px;"
                    >
                        No Sales Orders found.
                    </td>

                </tr>

            `;

            return;

        }


        tbody.innerHTML =
            records
            .map(
                function(so) {

                    const number =
                        getSOValue(
                            so,
                            "soNumber",
                            "SO_NUMBER"
                        );


                    const date =
                        getSOValue(
                            so,
                            "dateCreation",
                            "DATE_CREATION"
                        );


                    const client =
                        getSOValue(
                            so,
                            "clientName",
                            "CLIENT_NAME"
                        );


                    const se =
                        getSOValue(
                            so,
                            "salesEngineer",
                            "SALES_ENGINEER",
                            "se",
                            "SE"
                        );


                    const project =
                        getSOValue(
                            so,
                            "project",
                            "PROJECT"
                        );


                    const po =
                        getSOValue(
                            so,
                            "poNumber",
                            "PO_NUMBER"
                        );


                    const terms =
                        getSOValue(
                            so,
                            "terms",
                            "TERMS"
                        );


                    const grandTotal =
                        getSOValue(
                            so,
                            "grandTotal",
                            "GRAND_TOTAL"
                        );


                    const drNumber =
                        getSOValue(
                            so,
                            "drNumber",
                            "DR_NUMBER"
                        );


                    const invoiceNumber =
                        getSOValue(
                            so,
                            "invoiceNumber",
                            "INVOICE_NUMBER",
                            "INVOICE_NO"
                        );


                    const payment =
                        getSOValue(
                            so,
                            "paymentStatus",
                            "PAYMENT_STATUS",
                            "PAYMENT"
                        );


                    const status =
                        getSOStatus(
                            so
                        );


                    return `

                        <tr
                            data-so-number="${escapeAttribute(number)}"
                        >

                            <td>
                                ${escapeHTML(number)}
                            </td>

                            <td>
                                ${escapeHTML(
                                    formatSODate(date)
                                )}
                            </td>

                            <td>
                                ${escapeHTML(client)}
                            </td>

                            <td>
                                ${escapeHTML(se)}
                            </td>

                            <td>
                                ${escapeHTML(project)}
                            </td>

                            <td>
                                ${escapeHTML(po)}
                            </td>

                            <td>
                                ${escapeHTML(terms)}
                            </td>

                            <td>
                                ${formatMoney(grandTotal)}
                            </td>

                            <td>
                                ${escapeHTML(drNumber || "-")}
                            </td>

                            <td>
                                ${escapeHTML(
                                    invoiceNumber || "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    payment || "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(status)}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


        tbody
            .querySelectorAll(
                "tr[data-so-number]"
            )
            .forEach(
                function(row) {

                    const number =
                        row.dataset.soNumber;


                    row.addEventListener(
                        "click",
                        function() {

                            selectSO(
                                number
                            );

                        }
                    );


                    row.addEventListener(
                        "dblclick",
                        function() {

                            openSODetails(
                                number
                            );

                        }
                    );

                }
            );


        updateSOSelectionUI();

    }


    /* =====================================================
       SELECT SO
    ===================================================== */

    function selectSO(
        soNumber
    ) {

        const number =
            String(
                soNumber ||
                ""
            ).trim();


        if (!number) {

            return;

        }


        const found =
            salesOrders.find(
                function(item) {

                    return String(
                        getSOValue(
                            item,
                            "soNumber",
                            "SO_NUMBER"
                        )
                    ).trim() ===
                    number;

                }
            );


        if (!found) {

            return;

        }


        selectedSO =
            found;


        document
            .querySelectorAll(
                "#soTableBody tr"
            )
            .forEach(
                function(row) {

                    row.classList.remove(
                        "selected"
                    );

                }
            );


        const row =
            document.querySelector(
                '#soTableBody tr[data-so-number="' +
                CSS.escape(number) +
                '"]'
            );


        if (row) {

            row.classList.add(
                "selected"
            );

        }


        updateSOSelectionUI();

    }


    /* =====================================================
       SELECTION UI
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


        if (
            selectedSO
        ) {

            if (updateButton) {

                updateButton.disabled =
                    false;

            }


            if (cancelButton) {

                cancelButton.disabled =
                    isCancelledSO(
                        selectedSO
                    );

            }

        }

        else {

            if (updateButton) {

                updateButton.disabled =
                    true;

            }


            if (cancelButton) {

                cancelButton.disabled =
                    true;

            }

        }


        const selectedLabel =
            document.getElementById(
                "selectedSONumber"
            );


        if (selectedLabel) {

            selectedLabel.textContent =
                selectedSO
                    ? getSOValue(
                        selectedSO,
                        "soNumber",
                        "SO_NUMBER"
                    )
                    : "No SO selected";

        }

    }


    /* =====================================================
       SHOW ALL
    ===================================================== */

    function showAllSalesOrders() {

        renderSOList(
            salesOrders
        );

    }


    /* =====================================================
       FILTER SUMMARY
    ===================================================== */

    function filterSOBySummary(
        type
    ) {

        let filtered =
            salesOrders;


        switch (
            String(
                type ||
                ""
            ).toLowerCase()
        ) {

            case "active":

                filtered =
                    salesOrders.filter(
                        isActiveSO
                    );

                break;


            case "partial":

                filtered =
                    salesOrders.filter(
                        isPartialSO
                    );

                break;


            case "completed":

                filtered =
                    salesOrders.filter(
                        isCompletedSO
                    );

                break;


            case "cancelled":

                filtered =
                    salesOrders.filter(
                        isCancelledSO
                    );

                break;


            default:

                filtered =
                    salesOrders;

        }


        renderSOList(
            filtered
        );

    }


    /* =====================================================
       SEARCH
    ===================================================== */

    function searchSalesOrders(
        searchValue
    ) {

        const input =
            searchValue !==
            undefined
                ? searchValue
                : getValue(
                    "salesOrderSearch"
                );


        const search =
            String(
                input ||
                ""
            )
            .trim()
            .toLowerCase();


        if (!search) {

            renderSOList(
                salesOrders
            );

            return;

        }


        const filtered =
            salesOrders.filter(
                function(so) {

                    return [

                        getSOValue(
                            so,
                            "soNumber",
                            "SO_NUMBER"
                        ),

                        getSOValue(
                            so,
                            "clientName",
                            "CLIENT_NAME"
                        ),

                        getSOValue(
                            so,
                            "project",
                            "PROJECT"
                        ),

                        getSOValue(
                            so,
                            "poNumber",
                            "PO_NUMBER"
                        ),

                        getSOValue(
                            so,
                            "salesEngineer",
                            "SALES_ENGINEER",
                            "SE"
                        )

                    ]
                    .join(" ")
                    .toLowerCase()
                    .includes(
                        search
                    );

                }
            );


        renderSOList(
            filtered
        );

    }


    /* =====================================================
       REFRESH
    ===================================================== */

    async function refreshSalesOrders() {

        salesOrdersLoaded =
            false;


        await loadSOList(
            true
        );

    }


    /* =====================================================
       OPEN CREATE SO
    ===================================================== */

    function openCreateSalesOrder() {

        window.location.href =
            "pages/create-sales-order.html";

    }


    /* =====================================================
       OPEN SO DETAILS
    ===================================================== */

    async function openSODetails(
        soNumber
    ) {

        const number =
            String(
                soNumber ||
                ""
            ).trim();


        if (!number) {

            return;

        }


        showSODetailsLoading();


        try {

            const result =
                await salesOrderAPI(
                    "getSOTransactionDetails",
                    {
                        soNumber:
                            number
                    }
                );


            if (
                !result ||
                result.success !== true
            ) {

                throw new Error(
                    result &&
                    (
                        result.message ||
                        result.error
                    )
                        ? (
                            result.message ||
                            result.error
                        )
                        : "Unable to load Sales Order."
                );

            }


            const so =
                result.salesOrder ||
                result.so ||
                (
                    result.data &&
                    (
                        result.data.salesOrder ||
                        result.data.so
                    )
                );


            if (!so) {

                throw new Error(
                    "Sales Order data was not returned."
                );

            }


            so.items =
                result.items ||
                so.items ||
                [];


            so.deliveries =
                result.deliveries ||
                [];


            so.deliveryReceipts =
                result.deliveryReceipts ||
                [];


            so.invoices =
                result.invoices ||
                [];


            so.payments =
                result.payments ||
                [];


            so.documents =
                result.documents ||
                [];


            so.summary =
                result.summary ||
                {};


            currentSO =
                so;


            selectedSO =
                so;


            soDetailsCache[
                number
            ] =
                so;


            updateSOSelectionUI();


            showSODetailsPage(
                so
            );


            await loadSOFiles(
                number
            );


        } catch (error) {

            console.error(
                "OPEN SO DETAILS ERROR:",
                error
            );


            const details =
                document.getElementById(
                    "soDetails"
                );


            if (details) {

                details.innerHTML = `

                    <div class="so-error-box">

                        <h3>
                            Unable to Load Sales Order
                        </h3>

                        <p>
                            ${escapeHTML(
                                error.message
                            )}
                        </p>

                        <div>

                            <button
                                type="button"
                                onclick="openSODetails('${escapeAttribute(number)}')"
                            >
                                Retry
                            </button>

                            <button
                                type="button"
                                onclick="closeSODetails()"
                            >
                                Close
                            </button>

                        </div>

                    </div>

                `;

            }

        }

    }


    /* =====================================================
       DETAILS LOADING
    ===================================================== */

    function showSODetailsLoading() {

        const listView =
            document.getElementById(
                "salesOrderListView"
            );


        const customerArea =
            document.getElementById(
                "customerArea"
            );


        const details =
            document.getElementById(
                "soDetails"
            );


        if (listView) {

            listView.style.display =
                "none";

        }


        if (customerArea) {

            customerArea.style.display =
                "none";

        }


        if (details) {

            details.style.display =
                "block";


            details.innerHTML = `

                <div
                    class="so-details-loading"
                    style="padding:40px;text-align:center;"
                >

                    <h3>
                        Loading Sales Order...
                    </h3>

                    <p>
                        Please wait.
                    </p>

                </div>

            `;

        }

    }


    /* =====================================================
       SHOW DETAILS PAGE
    ===================================================== */

    function showSODetailsPage(
        so
    ) {

        const listView =
            document.getElementById(
                "salesOrderListView"
            );


        const customerArea =
            document.getElementById(
                "customerArea"
            );


        const details =
            document.getElementById(
                "soDetails"
            );


        if (listView) {

            listView.style.display =
                "none";

        }


        if (customerArea) {

            customerArea.style.display =
                "none";

        }


        if (details) {

            details.style.display =
                "block";

        }


        renderSODetails(
            so
        );


        setDetailsEditMode(
            false
        );


        window.scrollTo(
            {
                top: 0,
                behavior: "smooth"
            }
        );

    }


    /* =====================================================
       RENDER SO DETAILS
    ===================================================== */

    function renderSODetails(
        so
    ) {

        setValue(
            "detailSODate",
            getSOValue(
                so,
                "dateCreation",
                "DATE_CREATION"
            )
        );


        setValue(
            "detailSONumber",
            getSOValue(
                so,
                "soNumber",
                "SO_NUMBER"
            )
        );


        setValue(
            "detailClientName",
            getSOValue(
                so,
                "clientName",
                "CLIENT_NAME"
            )
        );


        setValue(
            "detailSE",
            getSOValue(
                so,
                "salesEngineer",
                "SALES_ENGINEER",
                "se",
                "SE"
            )
        );


        setValue(
            "detailAttention",
            getSOValue(
                so,
                "attention",
                "ATTENTION"
            )
        );


        setValue(
            "detailBillingAddress",
            getSOValue(
                so,
                "billingAddress",
                "BILLING_ADDRESS"
            )
        );


        setValue(
            "detailDeliveryAddress",
            getSOValue(
                so,
                "deliveryAddress",
                "DELIVERY_ADDRESS"
            )
        );


        setValue(
            "detailProject",
            getSOValue(
                so,
                "project",
                "PROJECT"
            )
        );


        setValue(
            "detailTIN",
            getSOValue(
                so,
                "tin",
                "TIN"
            )
        );


        setValue(
            "detailPONumber",
            getSOValue(
                so,
                "poNumber",
                "PO_NUMBER"
            )
        );


        setValue(
            "detailTerms",
            getSOValue(
                so,
                "terms",
                "TERMS"
            )
        );


        setValue(
            "detailJobOrder",
            getSOValue(
                so,
                "jobOrder",
                "JOB_ORDER"
            )
        );


        const items =
            Array.isArray(
                so.items
            )
                ? so.items
                : [];


        renderSODetailItems(
            items
        );


        const subtotal =
            Number(
                getSOValue(
                    so,
                    "subtotal",
                    "SUBTOTAL"
                ) ||
                0
            );


        const discount =
            Number(
                getSOValue(
                    so,
                    "discount",
                    "DISCOUNT"
                ) ||
                0
            );


        const vatable =
            Number(
                getSOValue(
                    so,
                    "vatable",
                    "VATABLE"
                ) ||
                0
            );


        const vatRate =
            Number(
                getSOValue(
                    so,
                    "vatRate",
                    "VAT_RATE"
                ) ||
                VAT_RATE
            );


        const vatAmount =
            Number(
                getSOValue(
                    so,
                    "vatAmount",
                    "VAT_AMOUNT"
                ) ||
                0
            );


        const grandTotal =
            Number(
                getSOValue(
                    so,
                    "grandTotal",
                    "GRAND_TOTAL"
                ) ||
                0
            );


        setValue(
            "detailSubtotal",
            subtotal
        );


        setValue(
            "detailDiscount",
            discount
        );


        setValue(
            "detailVatable",
            vatable
        );


        setValue(
            "detailVATRate",
            vatRate
        );


        setValue(
            "detailVATAmount",
            vatAmount
        );


        setValue(
            "detailGrandTotal",
            grandTotal
        );


        setText(
            "detailSubtotalText",
            formatMoney(
                subtotal
            )
        );


        setText(
            "detailDiscountText",
            formatMoney(
                discount
            )
        );


        setText(
            "detailVatableText",
            formatMoney(
                vatable
            )
        );


        setText(
            "detailVATAmountText",
            formatMoney(
                vatAmount
            )
        );


        setText(
            "detailGrandTotalText",
            formatMoney(
                grandTotal
            )
        );


        renderSOTransactionHistory(
            so
        );

    }


    /* =====================================================
       RENDER SO ITEMS
    ===================================================== */

    function renderSODetailItems(
        items
    ) {

        const container =
            document.getElementById(
                "detailItemsContainer"
            );


        if (!container) {

            return;

        }


        if (!items.length) {

            container.innerHTML = `

                <div class="empty-state">
                    No items found.
                </div>

            `;

            return;

        }


        container.innerHTML =
            items
            .map(
                function(item, index) {

                    const itemName =
                        getSOValue(
                            item,
                            "itemName",
                            "ITEM_NAME"
                        );


                    const description =
                        getSOValue(
                            item,
                            "description",
                            "DESCRIPTION"
                        );


                    const quantity =
                        getSOValue(
                            item,
                            "quantity",
                            "qty",
                            "QTY"
                        );


                    const unit =
                        getSOValue(
                            item,
                            "unit",
                            "UNIT"
                        );


                    const amount =
                        getSOValue(
                            item,
                            "amount",
                            "UNIT_PRICE",
                            "unitPrice"
                        );


                    const total =
                        getSOValue(
                            item,
                            "total",
                            "TOTAL"
                        );


                    return `

                        <div
                            class="detail-item-row"
                            data-item-index="${index}"
                        >

                            <input
                                type="text"
                                class="detail-item-name"
                                value="${escapeAttribute(itemName)}"
                                placeholder="Item"
                                disabled
                            >

                            <input
                                type="text"
                                class="detail-item-description"
                                value="${escapeAttribute(description)}"
                                placeholder="Description"
                                disabled
                            >

                            <input
                                type="number"
                                class="detail-item-qty"
                                value="${escapeAttribute(quantity)}"
                                min="0"
                                step="any"
                                disabled
                            >

                            <input
                                type="text"
                                class="detail-item-unit"
                                value="${escapeAttribute(unit)}"
                                placeholder="Unit"
                                disabled
                            >

                            <input
                                type="number"
                                class="detail-item-amount"
                                value="${escapeAttribute(amount)}"
                                min="0"
                                step="0.01"
                                disabled
                            >

                            <input
                                type="number"
                                class="detail-item-total"
                                value="${escapeAttribute(total)}"
                                min="0"
                                step="0.01"
                                disabled
                            >

                            <button
                                type="button"
                                class="detail-item-delete"
                                style="display:none;"
                                onclick="deleteDetailItem(this)"
                            >
                                ×
                            </button>

                        </div>

                    `;

                }
            )
            .join("");


        calculateDetailTotals();

    }


    /* =====================================================
       ADD DETAIL ITEM
    ===================================================== */

    function addDetailItem() {

        const container =
            document.getElementById(
                "detailItemsContainer"
            );


        if (!container) {

            return;

        }


        const index =
            container.querySelectorAll(
                ".detail-item-row"
            ).length;


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "detail-item-row";


        row.dataset.itemIndex =
            index;


        row.innerHTML = `

            <input
                type="text"
                class="detail-item-name"
                placeholder="Item"
            >

            <input
                type="text"
                class="detail-item-description"
                placeholder="Description"
            >

            <input
                type="number"
                class="detail-item-qty"
                value="0"
                min="0"
                step="any"
            >

            <input
                type="text"
                class="detail-item-unit"
                placeholder="Unit"
            >

            <input
                type="number"
                class="detail-item-amount"
                value="0"
                min="0"
                step="0.01"
            >

            <input
                type="number"
                class="detail-item-total"
                value="0"
                min="0"
                step="0.01"
            >

            <button
                type="button"
                class="detail-item-delete"
                onclick="deleteDetailItem(this)"
            >
                ×
            </button>

        `;


        container.appendChild(
            row
        );


        row
            .querySelectorAll(
                "input"
            )
            .forEach(
                function(input) {

                    input.addEventListener(
                        "input",
                        calculateDetailTotals
                    );

                }
            );

    }


    /* =====================================================
       DELETE DETAIL ITEM
    ===================================================== */

    function deleteDetailItem(
        button
    ) {

        const row =
            button.closest(
                ".detail-item-row"
            );


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

        const container =
            document.getElementById(
                "detailItemsContainer"
            );


        if (!container) {

            return;

        }


        container
            .querySelectorAll(
                ".detail-item-row"
            )
            .forEach(
                function(row, index) {

                    row.dataset.itemIndex =
                        index;

                }
            );

    }


    /* =====================================================
       CALCULATE DETAIL TOTALS
    ===================================================== */

    function calculateDetailTotals() {

        const container =
            document.getElementById(
                "detailItemsContainer"
            );


        if (!container) {

            return;

        }


        let subtotal =
            0;


        container
            .querySelectorAll(
                ".detail-item-row"
            )
            .forEach(
                function(row) {

                    const qty =
                        Number(
                            row.querySelector(
                                ".detail-item-qty"
                            )?.value ||
                            0
                        );


                    const amount =
                        Number(
                            row.querySelector(
                                ".detail-item-amount"
                            )?.value ||
                            0
                        );


                    const total =
                        qty *
                        amount;


                    const totalInput =
                        row.querySelector(
                            ".detail-item-total"
                        );


                    if (
                        totalInput
                    ) {

                        totalInput.value =
                            total.toFixed(
                                2
                            );

                    }


                    subtotal +=
                        total;

                }
            );


        const discount =
            Number(
                getValue(
                    "detailDiscount"
                ) ||
                0
            );


        const vatable =
            Math.max(
                subtotal -
                discount,
                0
            );


        const vatRate =
            Number(
                getValue(
                    "detailVATRate"
                ) ||
                VAT_RATE
            );


        const vatAmount =
            vatable *
            vatRate;


        const grandTotal =
            vatable +
            vatAmount;


        setValue(
            "detailSubtotal",
            subtotal.toFixed(
                2
            )
        );


        setValue(
            "detailVatable",
            vatable.toFixed(
                2
            )
        );


        setValue(
            "detailVATAmount",
            vatAmount.toFixed(
                2
            )
        );


        setValue(
            "detailGrandTotal",
            grandTotal.toFixed(
                2
            )
        );


        setText(
            "detailSubtotalText",
            formatMoney(
                subtotal
            )
        );


        setText(
            "detailVatableText",
            formatMoney(
                vatable
            )
        );


        setText(
            "detailVATAmountText",
            formatMoney(
                vatAmount
            )
        );


        setText(
            "detailGrandTotalText",
            formatMoney(
                grandTotal
            )
        );

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

    }


    /* =====================================================
       SET EDIT MODE
    ===================================================== */

    function setDetailsEditMode(
        enabled
    ) {

        soDetailsEditMode =
            enabled;


        const details =
            document.getElementById(
                "soDetails"
            );


        if (!details) {

            return;

        }


        details
            .querySelectorAll(
                "input, textarea, select"
            )
            .forEach(
                function(element) {

                    if (
                        element.id ===
                        "detailSONumber"
                    ) {

                        element.disabled =
                            true;

                        return;

                    }


                    if (
                        element.id ===
                        "detailSOFileInput"
                    ) {

                        element.disabled =
                            false;

                        return;

                    }


                    element.disabled =
                        !enabled;

                }
            );


        details
            .querySelectorAll(
                ".detail-item-delete"
            )
            .forEach(
                function(button) {

                    button.style.display =
                        enabled
                            ? "inline-flex"
                            : "none";

                }
            );


        const addButton =
            document.getElementById(
                "addDetailItemButton"
            );


        if (addButton) {

            addButton.style.display =
                enabled
                    ? "inline-flex"
                    : "none";

        }


        const saveButton =
            document.getElementById(
                "saveSOUpdateButton"
            );


        if (saveButton) {

            saveButton.style.display =
                enabled
                    ? "inline-flex"
                    : "none";

        }


        const enableButton =
            document.getElementById(
                "enableSOUpdateButton"
            );


        if (enableButton) {

            enableButton.style.display =
                enabled
                    ? "none"
                    : "inline-flex";

        }


        const cancelButton =
            document.getElementById(
                "cancelSOEditButton"
            );


        if (cancelButton) {

            cancelButton.style.display =
                enabled
                    ? "inline-flex"
                    : "none";

        }

    }


    /* =====================================================
       COLLECT DETAIL ITEMS
    ===================================================== */

    function collectDetailItems() {

        const container =
            document.getElementById(
                "detailItemsContainer"
            );


        if (!container) {

            return [];

        }


        return Array.from(
            container.querySelectorAll(
                ".detail-item-row"
            )
        )
        .map(
            function(row, index) {

                const qty =
                    Number(
                        row.querySelector(
                            ".detail-item-qty"
                        )?.value ||
                        0
                    );


                const amount =
                    Number(
                        row.querySelector(
                            ".detail-item-amount"
                        )?.value ||
                        0
                    );


                const total =
                    Number(
                        row.querySelector(
                            ".detail-item-total"
                        )?.value ||
                        (
                            qty *
                            amount
                        )
                    );


                return {

                    itemNumber:
                        String(
                            index + 1
                        ),

                    itemName:
                        row.querySelector(
                            ".detail-item-name"
                        )?.value ||
                        "",

                    description:
                        row.querySelector(
                            ".detail-item-description"
                        )?.value ||
                        "",

                    quantity:
                        qty,

                    qty:
                        qty,

                    unit:
                        row.querySelector(
                            ".detail-item-unit"
                        )?.value ||
                        "",

                    unitPrice:
                        amount,

                    amount:
                        amount,

                    total:
                        total

                };

            }
        );

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


        const soNumber =
            getSOValue(
                currentSO,
                "soNumber",
                "SO_NUMBER"
            );


        const data = {

            soNumber:
                soNumber,

            soId:
                getSOValue(
                    currentSO,
                    "soId",
                    "SO_ID"
                ),

            dateCreation:
                getValue(
                    "detailSODate"
                ),

            clientName:
                getValue(
                    "detailClientName"
                ),

            salesEngineer:
                getValue(
                    "detailSE"
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

            subtotal:
                Number(
                    getValue(
                        "detailSubtotal"
                    ) ||
                    0
                ),

            discount:
                Number(
                    getValue(
                        "detailDiscount"
                    ) ||
                    0
                ),

            vatable:
                Number(
                    getValue(
                        "detailVatable"
                    ) ||
                    0
                ),

            vatRate:
                Number(
                    getValue(
                        "detailVATRate"
                    ) ||
                    VAT_RATE
                ),

            vatAmount:
                Number(
                    getValue(
                        "detailVATAmount"
                    ) ||
                    0
                ),

            grandTotal:
                Number(
                    getValue(
                        "detailGrandTotal"
                    ) ||
                    0
                ),

            status:
                getSOStatus(
                    currentSO
                ),

            items:
                collectDetailItems(),

            updatedBy:
                getCurrentUserName()

        };


        const saveButton =
            document.getElementById(
                "saveSOUpdateButton"
            );


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving...";

        }


        try {

            const result =
                await salesOrderAPI(
                    "updateSalesOrder",
                    data
                );


            if (
                !result ||
                result.success !== true
            ) {

                throw new Error(
                    result &&
                    (
                        result.message ||
                        result.error
                    )
                        ? (
                            result.message ||
                            result.error
                        )
                        : "Unable to update Sales Order."
                );

            }


            alert(
                "Sales Order updated successfully."
            );


            soDetailsEditMode =
                false;


            salesOrdersLoaded =
                false;


            await loadSOList(
                true
            );


            await openSODetails(
                soNumber
            );


        } catch (error) {

            console.error(
                "SAVE SO UPDATE ERROR:",
                error
            );


            alert(
                "Unable to update Sales Order:\n\n" +
                error.message
            );

        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Save Update";

            }

        }

    }


    /* =====================================================
       CANCEL EDIT
    ===================================================== */

    function cancelSOEdit() {

        if (!currentSO) {

            return;

        }


        renderSODetails(
            currentSO
        );


        setDetailsEditMode(
            false
        );

    }


    /* =====================================================
       UPDATE SELECTED SO
    ===================================================== */

    async function updateSelectedSO() {

        const so =
            selectedSO ||
            currentSO;


        if (!so) {

            alert(
                "Please select a Sales Order first."
            );

            return;

        }


        const soNumber =
            getSOValue(
                so,
                "soNumber",
                "SO_NUMBER"
            );


        if (!soNumber) {

            alert(
                "Sales Order number is missing."
            );

            return;

        }


        if (
            currentSO &&
            String(
                getSOValue(
                    currentSO,
                    "soNumber",
                    "SO_NUMBER"
                )
            ) ===
            String(
                soNumber
            )
        ) {

            enableSOUpdate();

            return;

        }


        await openSODetails(
            soNumber
        );


        if (
            currentSO
        ) {

            enableSOUpdate();

        }

    }


    /* =====================================================
       CANCEL SELECTED SO
    ===================================================== */

    async function cancelSelectedSO() {

        const so =
            selectedSO ||
            currentSO;


        if (!so) {

            alert(
                "Please select a Sales Order first."
            );

            return;

        }


        const soNumber =
            getSOValue(
                so,
                "soNumber",
                "SO_NUMBER"
            );


        if (!soNumber) {

            return;

        }


        if (
            !confirm(
                "Are you sure you want to cancel " +
                soNumber +
                "?"
            )
        ) {

            return;

        }


        const result =
            await salesOrderAPI(
                "cancelSalesOrder",
                {

                    soNumber:
                        soNumber,

                    updatedBy:
                        getCurrentUserName()

                }
            );


        if (
            !result ||
            result.success !== true
        ) {

            alert(
                result?.message ||
                "Unable to cancel Sales Order."
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


        salesOrdersLoaded =
            false;


        await loadSOList(
            true
        );


        closeSODetails();

    }


    /* =====================================================
       TRANSACTION HISTORY
    ===================================================== */

    function renderSOTransactionHistory(
        so
    ) {

        const container =
            document.getElementById(
                "soTransactionHistory"
            );


        if (!container) {

            return;

        }


        const drs =
            Array.isArray(
                so.deliveryReceipts
            )
                ? so.deliveryReceipts
                : [];


        const invoices =
            Array.isArray(
                so.invoices
            )
                ? so.invoices
                : [];


        const payments =
            Array.isArray(
                so.payments
            )
                ? so.payments
                : [];


        const summary =
            so.summary ||
            {};


        let html = `

            <div class="so-transaction-header">

                <h3>
                    Transaction History
                </h3>

                <div class="so-transaction-summary">

                    <div>
                        <span>DR</span>
                        <strong>
                            ${drs.length}
                        </strong>
                    </div>

                    <div>
                        <span>Invoice</span>
                        <strong>
                            ${invoices.length}
                        </strong>
                    </div>

                    <div>
                        <span>Payment</span>
                        <strong>
                            ${payments.length}
                        </strong>
                    </div>

                </div>

            </div>

        `;


        /* =================================================
           DR
        ================================================= */

        html += `

            <div class="so-transaction-section">

                <div class="so-section-title">
                    Delivery Receipts
                </div>

        `;


        if (!drs.length) {

            html += `

                <div class="so-empty-state">
                    No Delivery Receipt recorded.
                </div>

            `;

        }

        else {

            html += `

                <div class="so-transaction-table-wrap">

                    <table class="so-transaction-table">

                        <thead>

                            <tr>

                                <th>DR Number</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Delivered</th>

                            </tr>

                        </thead>

                        <tbody>

            `;


            drs.forEach(
                function(dr) {

                    html += `

                        <tr>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        dr,
                                        "DR_NUMBER",
                                        "drNumber"
                                    ) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        dr,
                                        "DATE_CREATION",
                                        "DATE",
                                        "DATE_TRANSFER"
                                    ) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        dr,
                                        "STATUS",
                                        "status"
                                    ) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        dr,
                                        "DATE_DELIVERED",
                                        "DELIVERED_DATE"
                                    ) ||
                                    "-"
                                )}
                            </td>

                        </tr>

                    `;

                }
            );


            html += `

                        </tbody>

                    </table>

                </div>

            `;

        }


        html += `</div>`;


        /* =================================================
           INVOICE
        ================================================= */

        html += `

            <div class="so-transaction-section">

                <div class="so-section-title">
                    Invoices
                </div>

        `;


        if (!invoices.length) {

            html += `

                <div class="so-empty-state">
                    No Invoice recorded.
                </div>

            `;

        }

        else {

            html += `

                <div class="so-transaction-table-wrap">

                    <table class="so-transaction-table">

                        <thead>

                            <tr>

                                <th>Invoice No.</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>

                            </tr>

                        </thead>

                        <tbody>

            `;


            invoices.forEach(
                function(invoice) {

                    const amount =
                        Number(
                            getSOValue(
                                invoice,
                                "FINAL_AMOUNT_DUE",
                                "AMOUNT_DUE",
                                "GRAND_TOTAL",
                                "TOTAL_AMOUNT"
                            ) ||
                            0
                        );


                    html += `

                        <tr>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        invoice,
                                        "INVOICE_NO",
                                        "invoiceNo",
                                        "INVOICE_NUMBER"
                                    ) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        invoice,
                                        "DATE_CREATION",
                                        "INVOICE_DATE",
                                        "DATE"
                                    ) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${formatMoney(
                                    amount
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        invoice,
                                        "STATUS",
                                        "status"
                                    ) ||
                                    "-"
                                )}
                            </td>

                        </tr>

                    `;

                }
            );


            html += `

                        </tbody>

                    </table>

                </div>

            `;

        }


        html += `</div>`;


        /* =================================================
           PAYMENTS
        ================================================= */

        html += `

            <div class="so-transaction-section">

                <div class="so-section-title">
                    Payments
                </div>

        `;


        if (!payments.length) {

            html += `

                <div class="so-empty-state">
                    No Payment recorded.
                </div>

            `;

        }

        else {

            html += `

                <div class="so-transaction-table-wrap">

                    <table class="so-transaction-table">

                        <thead>

                            <tr>

                                <th>Payment Date</th>
                                <th>Reference</th>
                                <th>Amount</th>
                                <th>Status</th>

                            </tr>

                        </thead>

                        <tbody>

            `;


            payments.forEach(
                function(payment) {

                    const amount =
                        Number(
                            getSOValue(
                                payment,
                                "CURRENT_PAYMENT",
                                "PAYMENT_AMOUNT",
                                "AMOUNT"
                            ) ||
                            0
                        );


                    html += `

                        <tr>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        payment,
                                        "PAYMENT_DATE",
                                        "DATE_CREATION",
                                        "DATE"
                                    ) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        payment,
                                        "PAYMENT_REFERENCE",
                                        "REFERENCE_NUMBER",
                                        "OR_NUMBER"
                                    ) ||
                                    "-"
                                )}
                            </td>

                            <td>
                                ${formatMoney(
                                    amount
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    getSOValue(
                                        payment,
                                        "STATUS",
                                        "status"
                                    ) ||
                                    "-"
                                )}
                            </td>

                        </tr>

                    `;

                }
            );


            html += `

                        </tbody>

                    </table>

                </div>

            `;

        }


        html += `</div>`;


        /* =================================================
           FINANCIAL SUMMARY
        ================================================= */

        html += `

            <div class="so-financial-summary">

                <div>

                    <span>
                        SO Amount
                    </span>

                    <strong>
                        ${formatMoney(
                            summary.soAmount ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Delivered
                    </span>

                    <strong>
                        ${formatMoney(
                            summary.deliveredAmount ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Invoiced
                    </span>

                    <strong>
                        ${formatMoney(
                            summary.invoicedAmount ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Paid
                    </span>

                    <strong>
                        ${formatMoney(
                            summary.paidAmount ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        Invoice Balance
                    </span>

                    <strong>
                        ${formatMoney(
                            summary.invoiceBalance ||
                            0
                        )}
                    </strong>

                </div>


                <div>

                    <span>
                        SO Balance
                    </span>

                    <strong>
                        ${formatMoney(
                            summary.soBalance ||
                            0
                        )}
                    </strong>

                </div>

            </div>

        `;


        container.innerHTML =
            html;

    }


    /* =====================================================
       SO FILES
    ===================================================== */

    function selectDetailSOFiles(
        event
    ) {

        const files =
            event.target.files;


        handleDetailSOFiles(
            files
        );

    }


    async function handleDetailSOFiles(
        files
    ) {

        if (!files) {

            return;

        }


        const soNumber =
            getSOValue(
                currentSO,
                "soNumber",
                "SO_NUMBER"
            );


        if (!soNumber) {

            return;

        }


        for (
            const file of files
        ) {

            if (
                file.size >
                SO_FILE_MAX_SIZE
            ) {

                alert(
                    file.name +
                    " exceeds the 10 MB file limit."
                );

                continue;

            }


            await uploadDetailSOFile(
                file
            );

        }


        await loadSOFiles(
            soNumber
        );

    }


    async function uploadDetailSOFile(
        file
    ) {

        const soNumber =
            getSOValue(
                currentSO,
                "soNumber",
                "SO_NUMBER"
            );


        const soId =
            getSOValue(
                currentSO,
                "soId",
                "SO_ID"
            );


        if (!soNumber) {

            return;

        }


        try {

            const base64 =
                await fileToBase64(
                    file
                );


            const result =
                await salesOrderAPI(
                    "uploadSOFile",
                    {

                        soNumber:
                            soNumber,

                        soId:
                            soId,

                        fileName:
                            file.name,

                        mimeType:
                            file.type,

                        base64Data:
                            base64,

                        uploadedBy:
                            getCurrentUserName(),

                        dateCreation:
                            new Date().toISOString()

                    }
                );


            if (
                !result ||
                result.success !== true
            ) {

                throw new Error(
                    result?.message ||
                    "Upload failed."
                );

            }

        } catch (error) {

            console.error(
                "UPLOAD SO FILE ERROR:",
                error
            );


            alert(
                "Unable to upload " +
                file.name +
                ":\n\n" +
                error.message
            );

        }

    }


    function fileToBase64(
        file
    ) {

        return new Promise(
            function(resolve, reject) {

                const reader =
                    new FileReader();


                reader.onload =
                    function() {

                        const result =
                            String(
                                reader.result
                            );


                        const comma =
                            result.indexOf(
                                ","
                            );


                        resolve(
                            comma >= 0
                                ? result.substring(
                                    comma + 1
                                )
                                : result
                        );

                    };


                reader.onerror =
                    reject;


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    async function loadSOFiles(
        soNumber
    ) {

        if (!soNumber) {

            return;

        }


        const result =
            await salesOrderAPI(
                "getSOFiles",
                {

                    soNumber:
                        soNumber

                }
            );


        if (
            !result ||
            result.success !== true
        ) {

            return;

        }


        renderSOFiles(
            result.files ||
            result.data ||
            []
        );

    }


    function renderSOFiles(
        files
    ) {

        const container =
            document.getElementById(
                "soFilesContainer"
            );


        if (!container) {

            return;

        }


        if (
            !Array.isArray(files) ||
            !files.length
        ) {

            container.innerHTML = `

                <div class="empty-state">
                    No files uploaded.
                </div>

            `;

            return;

        }


        container.innerHTML =
            files
            .map(
                function(file) {

                    const fileId =
                        getSOValue(
                            file,
                            "FILE_ID",
                            "fileId",
                            "ID"
                        );


                    const fileName =
                        getSOValue(
                            file,
                            "FILE_NAME",
                            "fileName",
                            "NAME"
                        );


                    const size =
                        getSOValue(
                            file,
                            "FILE_SIZE",
                            "fileSize",
                            "SIZE"
                        );


                    return `

                        <div
                            class="so-file-item"
                        >

                            <div>

                                <strong>
                                    ${escapeHTML(fileName)}
                                </strong>

                                <small>
                                    ${formatFileSize(size)}
                                </small>

                            </div>

                            <div>

                                <button
                                    type="button"
                                    onclick="viewSOFile('${escapeAttribute(fileId)}')"
                                >
                                    View
                                </button>

                                <button
                                    type="button"
                                    onclick="deleteSOFile('${escapeAttribute(fileId)}')"
                                >
                                    Delete
                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

    }


    async function viewSOFile(
        fileId
    ) {

        const result =
            await salesOrderAPI(
                "getSOFile",
                {

                    fileId:
                        fileId

                }
            );


        if (
            !result ||
            result.success !== true
        ) {

            alert(
                result?.message ||
                "Unable to open file."
            );

            return;

        }


        if (
            result.url
        ) {

            window.open(
                result.url,
                "_blank"
            );

        }

    }


    async function deleteSOFile(
        fileId
    ) {

        if (
            !confirm(
                "Delete this file?"
            )
        ) {

            return;

        }


        const result =
            await salesOrderAPI(
                "deleteSOFile",
                {

                    fileId:
                        fileId

                }
            );


        if (
            !result ||
            result.success !== true
        ) {

            alert(
                result?.message ||
                "Unable to delete file."
            );

            return;

        }


        await loadSOFiles(
            getSOValue(
                currentSO,
                "soNumber",
                "SO_NUMBER"
            )
        );

    }


    function formatFileSize(
        bytes
    ) {

        const value =
            Number(
                bytes ||
                0
            );


        if (!value) {

            return "0 B";

        }


        const units =
            [
                "B",
                "KB",
                "MB",
                "GB"
            ];


        const index =
            Math.floor(
                Math.log(
                    value
                ) /
                Math.log(
                    1024
                )
            );


        return (
            value /
            Math.pow(
                1024,
                index
            )
        )
        .toFixed(
            index === 0
                ? 0
                : 2
        ) +
        " " +
        units[
            index
        ];

    }


    function formatSOFileDate(
        value
    ) {

        return formatSODate(
            value
        );

    }


    /* =====================================================
       CLOSE SO DETAILS
    ===================================================== */

    function closeSODetails() {

        const details =
            document.getElementById(
                "soDetails"
            );


        const customerArea =
            document.getElementById(
                "customerArea"
            );


        const listView =
            document.getElementById(
                "salesOrderListView"
            );


        if (details) {

            details.style.display =
                "none";

        }


        if (customerArea) {

            customerArea.style.display =
                "none";

        }


        if (listView) {

            listView.style.display =
                "block";

        }


        currentSO =
            null;


        soDetailsEditMode =
            false;


        updateSOSelectionUI();

    }


    /* =====================================================
       CUSTOMER MODULE
    ===================================================== */

    async function openNewCustomerFromSalesOrder() {

        const area =
            document.getElementById(
                "customerArea"
            );


        if (!area) {

            return;

        }


        try {

            area.style.display =
                "block";


            area.innerHTML =
                "<div>Loading Customer module...</div>";


            const response =
                await fetch(
                    "pages/create-customer.html"
                );


            const html =
                await response.text();


            area.innerHTML =
                html;


            await loadCustomerCSS();


            await loadCustomerJS();


            if (
                typeof window.initializeCustomerForm ===
                "function"
            ) {

                window.initializeCustomerForm();

            }


        } catch (error) {

            console.error(
                "CUSTOMER MODULE ERROR:",
                error
            );


            area.innerHTML = `

                <div class="error-box">

                    Unable to load Customer module.

                </div>

            `;

        }

    }


    function closeCustomerFromSalesOrder() {

        const area =
            document.getElementById(
                "customerArea"
            );


        if (area) {

            area.style.display =
                "none";

            area.innerHTML =
                "";

        }

    }


    function loadCustomerCSS() {

        return new Promise(
            function(resolve) {

                if (
                    document.querySelector(
                        'link[data-customer-css="true"]'
                    )
                ) {

                    resolve();

                    return;

                }


                const link =
                    document.createElement(
                        "link"
                    );


                link.rel =
                    "stylesheet";


                link.href =
                    "css/create-customer.css";


                link.dataset.customerCss =
                    "true";


                link.onload =
                    resolve;


                link.onerror =
                    resolve;


                document.head.appendChild(
                    link
                );

            }
        );

    }


    function loadCustomerJS() {

        return new Promise(
            function(resolve) {

                if (
                    document.querySelector(
                        'script[data-customer-js="true"]'
                    )
                ) {

                    resolve();

                    return;

                }


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "js/create-customer.js";


                script.dataset.customerJs =
                    "true";


                script.onload =
                    function() {

                        customerModuleLoaded =
                            true;

                        resolve();

                    };


                script.onerror =
                    function() {

                        resolve();

                    };


                document.body.appendChild(
                    script
                );

            }
        );

    }


    function refreshCustomerDataAfterSave() {

        closeCustomerFromSalesOrder();

        loadSOList(
            true
        );

    }


    /* =====================================================
       EMAIL SO
    ===================================================== */

    async function emailSelectedSO() {

        const so =
            selectedSO ||
            currentSO;


        if (!so) {

            alert(
                "Please select a Sales Order first."
            );

            return;

        }


        const soNumber =
            getSOValue(
                so,
                "soNumber",
                "SO_NUMBER"
            );


        const result =
            await salesOrderAPI(
                "emailSalesOrder",
                {

                    soNumber:
                        soNumber

                }
            );


        if (
            !result ||
            result.success !== true
        ) {

            alert(
                result?.message ||
                "Unable to send Sales Order."
            );

            return;

        }


        alert(
            "Sales Order email sent successfully."
        );

    }


    /* =====================================================
       CURRENT USER
    ===================================================== */

    function getCurrentUserName() {

        try {

            const user =
                localStorage.getItem(
                    "logitechUser"
                );


            if (!user) {

                return "SYSTEM";

            }


            try {

                const parsed =
                    JSON.parse(
                        user
                    );


                return (
                    parsed.name ||
                    parsed.username ||
                    parsed.accountName ||
                    parsed.email ||
                    "SYSTEM"
                );

            } catch (
                jsonError
            ) {

                return user;

            }

        } catch (error) {

            return "SYSTEM";

        }

    }


    /* =====================================================
       PUBLIC FUNCTIONS
    ===================================================== */

    window.loadSOList =
        loadSOList;


    window.renderSOList =
        renderSOList;


    window.selectSO =
        selectSO;


    window.showAllSalesOrders =
        showAllSalesOrders;


    window.filterSOBySummary =
        filterSOBySummary;


    window.searchSalesOrders =
        searchSalesOrders;


    window.refreshSalesOrders =
        refreshSalesOrders;


    window.openCreateSalesOrder =
        openCreateSalesOrder;


    window.openSODetails =
        openSODetails;


    window.closeSODetails =
        closeSODetails;


    window.updateSelectedSO =
        updateSelectedSO;


    window.enableSOUpdate =
        enableSOUpdate;


    window.saveSOUpdate =
        saveSOUpdate;


    window.cancelSOEdit =
        cancelSOEdit;


    window.cancelSelectedSO =
        cancelSelectedSO;


    window.addDetailItem =
        addDetailItem;


    window.deleteDetailItem =
        deleteDetailItem;


    window.calculateDetailTotals =
        calculateDetailTotals;


    window.selectDetailSOFiles =
        selectDetailSOFiles;


    window.handleDetailSOFiles =
        handleDetailSOFiles;


    window.viewSOFile =
        viewSOFile;


    window.deleteSOFile =
        deleteSOFile;


    window.emailSelectedSO =
        emailSelectedSO;


    window.openNewCustomerFromSalesOrder =
        openNewCustomerFromSalesOrder;


    window.closeCustomerFromSalesOrder =
        closeCustomerFromSalesOrder;


    window.refreshCustomerDataAfterSave =
        refreshCustomerDataAfterSave;


    /* =====================================================
       DOM READY
    ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function() {

            console.log(
                "========================================"
            );


            console.log(
                "LOGIS-TECH SALES ORDER JS LOADED"
            );


            console.log(
                "VERSION: 20261007-01"
            );


            console.log(
                "========================================"
            );


            /*
             * Do not automatically reload if
             * the module is injected later.
             */

        }
    );


})();
