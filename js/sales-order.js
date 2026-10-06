/* =========================================================
   LOGIS-TECH SYSTEM
   SALES ORDER MODULE
   GOOGLE APPS SCRIPT API
   VERSION: 20261006-03
========================================================= */


/* =========================================================
   API CONFIG
========================================================= */

const SALES_ORDER_API_URL =
    "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let salesOrders = [];

let selectedSO = null;

let currentSO = null;

let soDetailsEditMode = false;

let salesOrdersLoaded = false;

let customerModuleLoaded = false;


/* =========================================================
   SO DETAILS CACHE
========================================================= */

const soDetailsCache = {};


/* =========================================================
   API RETRY SETTINGS
========================================================= */

const API_MAX_RETRIES = 3;

const API_RETRY_DELAY = 800;


/* =========================================================
   SO FILE CONFIG
========================================================= */

const SO_FILE_MAX_SIZE =
    10 * 1024 * 1024;


/* =========================================================
   SALES ORDER STATUS HELPERS
========================================================= */

function getSOStatus(so) {

    if (!so) {
        return "";
    }

    return String(
        so.status ||
        so.Status ||
        so.STATUS ||
        ""
    )
    .trim()
    .toUpperCase();

}


function isActiveSO(so) {

    const status = getSOStatus(so);

    return (
        status === "ACTIVE" ||
        status === "OPEN" ||
        status === ""
    );

}


function isPartialSO(so) {

    const status = getSOStatus(so);

    return (
        status === "PARTIAL" ||
        status === "PARTIALLY COMPLETED" ||
        status === "PARTIALLY DELIVERED"
    );

}


function isCompletedSO(so) {

    const status = getSOStatus(so);

    return (
        status === "COMPLETED" ||
        status === "COMPLETE"
    );

}


function isCancelledSO(so) {

    const status = getSOStatus(so);

    return (
        status === "CANCELLED" ||
        status === "CANCELED"
    );

}


/* =========================================================
   UPDATE SUMMARY CARDS
   DATA COMES FROM GOOGLE SHEETS
========================================================= */

function updateSOSummary() {

    const totalCount =
        salesOrders.length;

    const activeCount =
        salesOrders.filter(
            isActiveSO
        ).length;

    const partialCount =
        salesOrders.filter(
            isPartialSO
        ).length;

    const completedCount =
        salesOrders.filter(
            isCompletedSO
        ).length;

    const cancelledCount =
        salesOrders.filter(
            isCancelledSO
        ).length;


    setText(
        "soTotalCount",
        totalCount
    );

    setText(
        "soPartialCount",
        partialCount
    );

    setText(
        "soActiveCount",
        activeCount
    );

    setText(
        "soCompletedCount",
        completedCount
    );

    setText(
        "soCancelledCount",
        cancelledCount
    );


    console.log(
        "================================="
    );

    console.log(
        "LOGIS-TECH SO SUMMARY"
    );

    console.log(
        "TOTAL:",
        totalCount
    );

    console.log(
        "ACTIVE:",
        activeCount
    );

    console.log(
        "PARTIAL:",
        partialCount
    );

    console.log(
        "COMPLETED:",
        completedCount
    );

    console.log(
        "CANCELLED:",
        cancelledCount
    );

    console.log(
        "================================="
    );

}


/* =========================================================
   DELAY HELPER
========================================================= */

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


/* =========================================================
   API REQUEST
========================================================= */

async function salesOrderAPI(
    action,
    data = {},
    retryCount = 0
) {

    try {

        console.log(
            "LOGIS-TECH API REQUEST:",
            action,
            data,
            "Attempt:",
            retryCount + 1
        );


        const response =
            await fetch(
                SALES_ORDER_API_URL,
                {
                    method: "POST",

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


        const responseText =
            await response.text();


        console.log(
            "LOGIS-TECH API STATUS:",
            response.status
        );


        if (!response.ok) {

            const retryable =
                [
                    404,
                    408,
                    429,
                    500,
                    502,
                    503,
                    504
                ].includes(
                    response.status
                );


            if (
                retryable &&
                retryCount <
                    API_MAX_RETRIES - 1
            ) {

                await wait(
                    API_RETRY_DELAY *
                    (retryCount + 1)
                );


                return await salesOrderAPI(
                    action,
                    data,
                    retryCount + 1
                );

            }


            throw new Error(
                "API request failed: " +
                response.status
            );

        }


        let result;


        try {

            result =
                JSON.parse(
                    responseText
                );

        } catch (jsonError) {

            console.error(
                "Invalid JSON response:",
                responseText
            );


            if (
                retryCount <
                API_MAX_RETRIES - 1
            ) {

                await wait(
                    API_RETRY_DELAY *
                    (retryCount + 1)
                );


                return await salesOrderAPI(
                    action,
                    data,
                    retryCount + 1
                );

            }


            throw new Error(
                "Invalid response from LOGIS-TECH API."
            );

        }


        return result;


    } catch (error) {

        console.error(
            "Sales Order API Error:",
            error
        );


        if (
            retryCount <
            API_MAX_RETRIES - 1
        ) {

            await wait(
                API_RETRY_DELAY *
                (retryCount + 1)
            );


            return await salesOrderAPI(
                action,
                data,
                retryCount + 1
            );

        }


        return {

            success:
                false,

            message:
                error.message

        };

    }

}


/* =========================================================
   LOAD SALES ORDERS
   MAIN DATA SOURCE:
   GOOGLE SHEETS -> APPS SCRIPT -> WEBSITE
========================================================= */

async function loadSOList(
    forceRefresh = false
) {

    const tbody =
        document.getElementById(
            "soTableBody"
        );


    /*
     * USE CACHE
     */

    if (
        salesOrdersLoaded &&
        !forceRefresh
    ) {

        console.log(
            "Using cached Sales Orders."
        );


        updateSOSummary();

        renderSOList(
            salesOrders
        );

        renderRecentSalesOrders();

        updateSOSelectionUI();

        return;

    }


    /*
     * LOADING
     */

    if (tbody) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    style="text-align:center;"
                >

                    Loading Sales Orders...

                </td>

            </tr>

        `;

    }


    /*
     * GET SALES ORDERS
     */

    const result =
        await salesOrderAPI(
            "getSalesOrders",
            {}
        );


    console.log(
        "GET SALES ORDERS RESULT:",
        result
    );


    if (
        !result ||
        !result.success
    ) {

        if (tbody) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="12"
                        style="
                            text-align:center;
                            color:red;
                            padding:30px;
                        "
                    >

                        Failed to load Sales Orders.

                        <br>

                        <small>

                            ${escapeHTML(
                                result?.message ||
                                "Unknown API error."
                            )}

                        </small>

                    </td>

                </tr>

            `;

        }


        updateSOSummary();

        renderRecentSalesOrders();

        return;

    }


    /*
     * GET DATA FROM APPS SCRIPT
     */

    salesOrders =
        Array.isArray(
            result.salesOrders
        )
            ? result.salesOrders
            : Array.isArray(
                result.data
            )
                ? result.data
                : [];


    /*
     * MARK LOADED
     */

    salesOrdersLoaded =
        true;


    /*
     * CACHE EACH SO
     */

    salesOrders.forEach(
        function(so) {

            const soNumber =
                getSOValue(
                    so,
                    "soNumber",
                    "SO_NUMBER",
                    "SO Number"
                );


            if (soNumber) {

                soDetailsCache[
                    String(
                        soNumber
                    )
                ] = so;

            }

        }
    );


    /*
     * SUMMARY CARDS
     */

    updateSOSummary();


    /*
     * MAIN LIST
     */

    renderSOList(
        salesOrders
    );


    /*
     * RECENT SALES ORDERS
     */

    renderRecentSalesOrders();


    /*
     * RESTORE SELECTION
     */

    if (selectedSO) {

        const selectedNumber =
            String(
                selectedSO.soNumber ||
                selectedSO.SO_NUMBER ||
                ""
            );


        const refreshedSelected =
            salesOrders.find(
                function(so) {

                    return (
                        String(
                            getSOValue(
                                so,
                                "soNumber",
                                "SO_NUMBER",
                                "SO Number"
                            )
                        ) ===
                        selectedNumber
                    );

                }
            );


        if (refreshedSelected) {

            selectedSO =
                refreshedSelected;

        }

    }


    updateSOSelectionUI();

}


/* =========================================================
   RECENT SALES ORDERS
========================================================= */

function renderRecentSalesOrders() {

    const container =
        document.getElementById(
            "recentSalesOrderList"
        );


    if (!container) {
        return;
    }


    if (
        !Array.isArray(
            salesOrders
        ) ||
        salesOrders.length === 0
    ) {

        container.innerHTML = `

            <div class="so-recent-empty">

                <div class="so-recent-empty-icon">
                    ▤
                </div>

                <strong>
                    No Sales Orders yet
                </strong>

                <span>
                    Sales Orders from the database
                    will appear here.
                </span>

            </div>

        `;

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


    container.innerHTML =
        "";


    recent.forEach(
        function(so) {

            const soNumber =
                getSOValue(
                    so,
                    "soNumber",
                    "SO_NUMBER",
                    "SO Number"
                );


            const dateCreation =
                getSOValue(
                    so,
                    "dateCreation",
                    "DATE_CREATION",
                    "DATE CREATED",
                    "Date Creation"
                );


            const clientName =
                getSOValue(
                    so,
                    "clientName",
                    "CLIENT_NAME",
                    "CLIENT NAME"
                );


            const project =
                getSOValue(
                    so,
                    "project",
                    "PROJECT"
                );


            const grandTotal =
                getSOValue(
                    so,
                    "grandTotal",
                    "GRAND_TOTAL",
                    "GRAND TOTAL"
                );


            let statusClass =
                "status-active";

            let statusLabel =
                "ACTIVE";


            if (
                isPartialSO(so)
            ) {

                statusClass =
                    "status-partial";

                statusLabel =
                    "PARTIAL";

            }
            else if (
                isCompletedSO(so)
            ) {

                statusClass =
                    "status-completed";

                statusLabel =
                    "COMPLETED";

            }
            else if (
                isCancelledSO(so)
            ) {

                statusClass =
                    "status-cancelled";

                statusLabel =
                    "CANCELLED";

            }


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "so-recent-item";


            item.dataset.soNumber =
                soNumber;


            item.innerHTML = `

                <div class="so-recent-main">

                    <div class="so-recent-number">

                        ${escapeHTML(
                            soNumber || "-"
                        )}

                    </div>


                    <div class="so-recent-client">

                        ${escapeHTML(
                            clientName || "-"
                        )}

                    </div>


                    <div class="so-recent-project">

                        ${escapeHTML(
                            project || "-"
                        )}

                    </div>

                </div>


                <div class="so-recent-middle">

                    <div class="so-recent-date">

                        ${escapeHTML(
                            formatSODate(
                                dateCreation
                            )
                        )}

                    </div>


                    <div class="so-recent-total">

                        ₱${formatMoney(
                            grandTotal
                        )}

                    </div>

                </div>


                <div class="so-recent-status">

                    <span
                        class="status-badge ${statusClass}"
                    >

                        <span class="status-dot"></span>

                        ${escapeHTML(
                            statusLabel
                        )}

                    </span>

                </div>

            `;


            item.addEventListener(
                "click",
                function() {

                    selectSO(
                        soNumber
                    );


                    document
                        .querySelectorAll(
                            ".so-recent-item"
                        )
                        .forEach(
                            function(row) {

                                row.classList.remove(
                                    "selected"
                                );

                            }
                        );


                    item.classList.add(
                        "selected"
                    );

                }
            );


            item.addEventListener(
                "dblclick",
                function() {

                    openSODetails(
                        soNumber
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   RECENT SALES ORDER DATE SORT
========================================================= */

function compareSalesOrderDate(
    a,
    b
) {

    const dateA =
        parseSODate(
            getSOValue(
                a,
                "dateCreation",
                "DATE_CREATION",
                "DATE CREATED",
                "Date Creation"
            )
        );


    const dateB =
        parseSODate(
            getSOValue(
                b,
                "dateCreation",
                "DATE_CREATION",
                "DATE CREATED",
                "Date Creation"
            )
        );


    return (
        dateB.getTime() -
        dateA.getTime()
    );

}


/* =========================================================
   PARSE SO DATE
========================================================= */

function parseSODate(
    value
) {

    if (!value) {

        return new Date(0);

    }


    const date =
        new Date(
            value
        );


    if (
        !Number.isNaN(
            date.getTime()
        )
    ) {

        return date;

    }


    const parts =
        String(
            value
        ).split(
            "/"
        );


    if (
        parts.length === 3
    ) {

        const month =
            Number(
                parts[0]
            ) - 1;

        const day =
            Number(
                parts[1]
            );

        const year =
            Number(
                parts[2]
            );


        const parsed =
            new Date(
                year,
                month,
                day
            );


        if (
            !Number.isNaN(
                parsed.getTime()
            )
        ) {

            return parsed;

        }

    }


    return new Date(0);

}


/* =========================================================
   FORMAT SO DATE
========================================================= */

function formatSODate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        parseSODate(
            value
        );


    if (
        date.getTime() === 0
    ) {

        return String(
            value
        );

    }


    return date.toLocaleDateString(
        "en-PH",
        {
            year:
                "numeric",

            month:
                "short",

            day:
                "2-digit"
        }
    );

}


/* =========================================================
   VIEW ALL SALES ORDERS
========================================================= */

function showAllSalesOrders() {

    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const customerArea =
        document.getElementById(
            "customerArea"
        );


    if (customerArea) {

        customerArea.style.display =
            "none";

    }


    if (listView) {

        listView.style.display =
            "block";

    }


    const table =
        document.getElementById(
            "soTable"
        );


    if (table) {

        table.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }

}


/* =========================================================
   SUMMARY CARD FILTER
========================================================= */

function filterSOBySummary(
    type
) {

    const statusFilter =
        document.getElementById(
            "soStatusFilter"
        );


    if (
        !type ||
        type === "ALL"
    ) {

        if (statusFilter) {

            statusFilter.value =
                "ALL";

        }


        renderSOList(
            salesOrders
        );


        updateSOSelectionUI();

        return;

    }


    if (statusFilter) {

        statusFilter.value =
            type;

    }


    let filtered =
        salesOrders;


    if (
        type === "ACTIVE"
    ) {

        filtered =
            salesOrders.filter(
                isActiveSO
            );

    }
    else if (
        type === "PARTIAL"
    ) {

        filtered =
            salesOrders.filter(
                isPartialSO
            );

    }
    else if (
        type === "COMPLETED"
    ) {

        filtered =
            salesOrders.filter(
                isCompletedSO
            );

    }
    else if (
        type === "CANCELLED"
    ) {

        filtered =
            salesOrders.filter(
                isCancelledSO
            );

    }


    renderSOList(
        filtered
    );


    updateSOSelectionUI();


    const table =
        document.getElementById(
            "soTable"
        );


    if (table) {

        table.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }

}


/* =========================================================
   RENDER SALES ORDER LIST
   FIXED:
   EXACTLY 12 COLUMNS
========================================================= */

function renderSOList(
    list
) {

    const tbody =
        document.getElementById(
            "soTableBody"
        );


    if (!tbody) {

        console.error(
            "soTableBody element not found."
        );

        return;

    }


    tbody.innerHTML =
        "";


    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        tbody.innerHTML = `

            <tr class="so-empty-row">

                <td
                    colspan="12"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >

                    <div class="so-empty-state">

                        <div class="so-empty-icon">
                            ▤
                        </div>

                        <strong>
                            No Sales Order Found
                        </strong>

                        <span>
                            Try changing your search or filter.
                        </span>

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    list.forEach(
        function(so) {

            /* =================================================
               BASIC SALES ORDER DATA
            ================================================= */

            const soNumber =
                getSOValue(
                    so,
                    "soNumber",
                    "SO_NUMBER",
                    "SO Number"
                );


            const dateCreation =
                getSOValue(
                    so,
                    "dateCreation",
                    "DATE_CREATION",
                    "DATE CREATED",
                    "Date Creation"
                );


            const clientName =
                getSOValue(
                    so,
                    "clientName",
                    "CLIENT_NAME",
                    "CLIENT NAME"
                );


            const se =
                getSOValue(
                    so,
                    "se",
                    "SE",
                    "SALES_ENGINEER"
                );


            const project =
                getSOValue(
                    so,
                    "project",
                    "PROJECT"
                );


            const poNumber =
                getSOValue(
                    so,
                    "poNumber",
                    "PO_NUMBER",
                    "PO NUMBER"
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
                    "GRAND_TOTAL",
                    "GRAND TOTAL"
                );


            /* =================================================
               DR NUMBER
            ================================================= */

            const drNumber =
                getSOValue(
                    so,
                    "drNumber",
                    "DR_NUMBER",
                    "DR NUMBER",
                    "deliveryReceiptNumber",
                    "DELIVERY_RECEIPT_NUMBER"
                );


            /* =================================================
               INVOICE NUMBER
            ================================================= */

            const invoiceNumber =
                getSOValue(
                    so,
                    "invoiceNumber",
                    "INVOICE_NUMBER",
                    "INVOICE NUMBER"
                );


            /* =================================================
               PAYMENT
            ================================================= */

            const payment =
                getSOValue(
                    so,
                    "payment",
                    "PAYMENT",
                    "paymentStatus",
                    "PAYMENT_STATUS"
                );


            /* =================================================
               STATUS
            ================================================= */

            let statusClass =
                "status-active";


            let statusLabel =
                "ACTIVE";


            if (
                isPartialSO(so)
            ) {

                statusClass =
                    "status-partial";

                statusLabel =
                    "PARTIAL";

            }
            else if (
                isCompletedSO(so)
            ) {

                statusClass =
                    "status-completed";

                statusLabel =
                    "COMPLETED";

            }
            else if (
                isCancelledSO(so)
            ) {

                statusClass =
                    "status-cancelled";

                statusLabel =
                    "CANCELLED";

            }


            /* =================================================
               CREATE ROW
            ================================================= */

            const row =
                document.createElement(
                    "tr"
                );


            row.dataset.soNumber =
                soNumber || "";


            /* =================================================
               TABLE COLUMNS
               
               01 SO NUMBER
               02 DATE
               03 CLIENT
               04 SE
               05 PROJECT
               06 PO NUMBER
               07 TERMS
               08 GRAND TOTAL
               09 DR NUMBER
               10 INVOICE NUMBER
               11 PAYMENT
               12 STATUS
            ================================================= */

            row.innerHTML = `

                <!-- 01 SO NUMBER -->

                <td>

                    <strong class="so-number-cell">

                        ${escapeHTML(
                            soNumber || ""
                        )}

                    </strong>

                </td>


                <!-- 02 DATE -->

                <td>

                    ${escapeHTML(
                        dateCreation || ""
                    )}

                </td>


                <!-- 03 CLIENT -->

                <td>

                    <span class="client-name-cell">

                        ${escapeHTML(
                            clientName || ""
                        )}

                    </span>

                </td>


                <!-- 04 SE -->

                <td>

                    ${escapeHTML(
                        se || ""
                    )}

                </td>


                <!-- 05 PROJECT -->

                <td>

                    ${escapeHTML(
                        project || ""
                    )}

                </td>


                <!-- 06 PO NUMBER -->

                <td>

                    ${escapeHTML(
                        poNumber || ""
                    )}

                </td>


                <!-- 07 TERMS -->

                <td>

                    ${escapeHTML(
                        terms || ""
                    )}

                </td>


                <!-- 08 GRAND TOTAL -->

                <td class="so-amount-cell">

                    ${formatMoney(
                        grandTotal
                    )}

                </td>


                <!-- 09 DR NUMBER -->

                <td>

                    ${escapeHTML(
                        drNumber || ""
                    )}

                </td>


                <!-- 10 INVOICE NUMBER -->

                <td>

                    ${escapeHTML(
                        invoiceNumber || ""
                    )}

                </td>


                <!-- 11 PAYMENT -->

                <td>

                    ${escapeHTML(
                        payment || ""
                    )}

                </td>


                <!-- 12 STATUS -->

                <td>

                    <span
                        class="status-badge ${statusClass}"
                    >

                        <span class="status-dot"></span>

                        ${escapeHTML(
                            statusLabel
                        )}

                    </span>

                </td>

            `;


            /* =================================================
               RESTORE SELECTED ROW
            ================================================= */

            if (
                selectedSO &&
                String(
                    selectedSO.soNumber ||
                    selectedSO.SO_NUMBER ||
                    ""
                ) ===
                String(
                    soNumber
                )
            ) {

                row.classList.add(
                    "selected"
                );

            }


            /* =================================================
               CLICK
            ================================================= */

            row.addEventListener(
                "click",
                function() {

                    selectSO(
                        soNumber
                    );

                }
            );


            /* =================================================
               DOUBLE CLICK
            ================================================= */

            row.addEventListener(
                "dblclick",
                function() {

                    openSODetails(
                        soNumber
                    );

                }
            );


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   SELECT SALES ORDER
========================================================= */

function selectSO(
    soNumber
) {

    const clickedSONumber =
        String(
            soNumber || ""
        ).trim();


    if (!clickedSONumber) {
        return;
    }


    const currentlySelected =
        selectedSO &&
        String(
            selectedSO.soNumber ||
            selectedSO.SO_NUMBER ||
            ""
        ).trim() ===
        clickedSONumber;


    if (currentlySelected) {

        clearSOSelection();

        return;

    }


    let so =
        salesOrders.find(
            function(item) {

                return (
                    String(
                        item.soNumber ||
                        item.SO_NUMBER ||
                        ""
                    ).trim() ===
                    clickedSONumber
                );

            }
        );


    if (!so) {

        so =
            soDetailsCache[
                clickedSONumber
            ];

    }


    if (!so) {

        console.warn(
            "Sales Order not found:",
            clickedSONumber
        );

        return;

    }


    selectedSO =
        so;


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


    const selectedRow =
        document.querySelector(
            `#soTableBody tr[data-so-number="${cssEscape(
                clickedSONumber
            )}"]`
        );


    if (selectedRow) {

        selectedRow.classList.add(
            "selected"
        );

    }


    updateSOSelectionUI();

}


/* =========================================================
   UPDATE TOP SELECTION UI
========================================================= */

function updateSOSelectionUI() {

    const selectionText =
        document.getElementById(
            "soSelectionText"
        );


    const updateButton =
        document.getElementById(
            "updateSOButton"
        );


    const cancelButton =
        document.getElementById(
            "cancelSOButton"
        );


    const statusDot =
        document.querySelector(
            ".so-status-dot"
        );


    const hasSelection =
        !!selectedSO;


    if (!hasSelection) {

        if (selectionText) {

            selectionText.innerHTML =
                "No Sales Order selected";

        }


        if (statusDot) {

            statusDot.classList.remove(
                "selected"
            );

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


    const so =
        selectedSO;


    const soNumber =
        getSOValue(
            so,
            "soNumber",
            "SO_NUMBER",
            "SO Number"
        );


    const clientName =
        getSOValue(
            so,
            "clientName",
            "CLIENT_NAME",
            "CLIENT NAME"
        );


    const project =
        getSOValue(
            so,
            "project",
            "PROJECT"
        );


    const poNumber =
        getSOValue(
            so,
            "poNumber",
            "PO_NUMBER",
            "PO NUMBER"
        );


    const se =
        getSOValue(
            so,
            "se",
            "SE",
            "SALES_ENGINEER"
        );


    const grandTotal =
        getSOValue(
            so,
            "grandTotal",
            "GRAND_TOTAL",
            "GRAND TOTAL"
        );


    const status =
        getSOStatus(so) ||
        "ACTIVE";


    let statusClass =
        "selection-active";


    let statusLabel =
        "ACTIVE";


    if (
        isPartialSO(so)
    ) {

        statusClass =
            "selection-partial";

        statusLabel =
            "PARTIAL";

    }
    else if (
        isCompletedSO(so)
    ) {

        statusClass =
            "selection-completed";

        statusLabel =
            "COMPLETED";

    }
    else if (
        isCancelledSO(so)
    ) {

        statusClass =
            "selection-cancelled";

        statusLabel =
            "CANCELLED";

    }


    if (selectionText) {

        selectionText.innerHTML = `

            <span class="so-selection-main">

                <strong class="so-selection-number">

                    ${escapeHTML(
                        soNumber || "-"
                    )}

                </strong>

                <span class="so-selection-divider">
                    •
                </span>

                <span class="so-selection-client">

                    ${escapeHTML(
                        clientName || "-"
                    )}

                </span>

            </span>


            <span class="so-selection-details">

                <span>

                    PROJECT:

                    <strong>
                        ${escapeHTML(
                            project || "-"
                        )}
                    </strong>

                </span>


                <span>

                    PO:

                    <strong>
                        ${escapeHTML(
                            poNumber || "-"
                        )}
                    </strong>

                </span>


                <span>

                    SE:

                    <strong>
                        ${escapeHTML(
                            se || "-"
                        )}
                    </strong>

                </span>


                <span>

                    TOTAL:

                    <strong>
                        ₱${formatMoney(
                            grandTotal
                        )}
                    </strong>

                </span>


                <span
                    class="so-selection-status-label ${statusClass}"
                >

                    ${escapeHTML(
                        statusLabel
                    )}

                </span>

            </span>

        `;

    }


    if (statusDot) {

        statusDot.classList.add(
            "selected"
        );

    }


    if (updateButton) {

        updateButton.disabled =
            false;

    }


    if (cancelButton) {

        cancelButton.disabled =
            false;

    }


    document
        .querySelectorAll(
            "#soTableBody tr"
        )
        .forEach(
            function(row) {

                row.classList.toggle(
                    "selected",
                    String(
                        row.dataset.soNumber ||
                        ""
                    ) ===
                    String(
                        soNumber ||
                        ""
                    )
                );

            }
        );

}


/* =========================================================
   CLEAR SELECTION
========================================================= */

function clearSOSelection() {

    selectedSO =
        null;


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


    document
        .querySelectorAll(
            ".so-recent-item"
        )
        .forEach(
            function(row) {

                row.classList.remove(
                    "selected"
                );

            }
        );


    updateSOSelectionUI();

    renderSelectedSOEmpty();

}


/* =========================================================
   LEGACY PREVIEW
========================================================= */

function renderSelectedSOPreview(
    so
) {

    if (!so) {
        return;
    }

}


/* =========================================================
   EMPTY OLD PREVIEW
========================================================= */

function renderSelectedSOEmpty() {

    const preview =
        document.getElementById(
            "selectedSOInfo"
        );


    if (!preview) {
        return;
    }


    preview.innerHTML =
        "";

    preview.style.display =
        "none";

}


/* =========================================================
   SEARCH
========================================================= */

function searchSO() {

    filterSOList();

}


/* =========================================================
   FILTER SALES ORDERS
========================================================= */

function filterSOList() {

    const searchInput =
        document.getElementById(
            "soSearch"
        );


    const statusFilter =
        document.getElementById(
            "soStatusFilter"
        );


    const keyword =
        String(
            searchInput
                ? searchInput.value
                : ""
        )
        .trim()
        .toLowerCase();


    const selectedStatus =
        String(
            statusFilter
                ? statusFilter.value
                : "ALL"
        )
        .trim()
        .toUpperCase();


    let filtered =
        salesOrders;


    if (keyword) {

        filtered =
            filtered.filter(
                function(so) {

                    return [

                        so.soNumber,
                        so.SO_NUMBER,
                        so.clientName,
                        so.CLIENT_NAME,
                        so.project,
                        so.PROJECT,
                        so.poNumber,
                        so.PO_NUMBER,
                        so.jobOrder,
                        so.JOB_ORDER,
                        so.se,
                        so.SE,
                        so.status,
                        so.STATUS

                    ]
                    .join(" ")
                    .toLowerCase()
                    .includes(
                        keyword
                    );

                }
            );

    }


    if (
        selectedStatus &&
        selectedStatus !== "ALL"
    ) {

        filtered =
            filtered.filter(
                function(so) {

                    if (
                        selectedStatus ===
                        "ACTIVE"
                    ) {

                        return isActiveSO(so);

                    }


                    if (
                        selectedStatus ===
                        "PARTIAL"
                    ) {

                        return isPartialSO(so);

                    }


                    if (
                        selectedStatus ===
                        "COMPLETED"
                    ) {

                        return isCompletedSO(so);

                    }


                    if (
                        selectedStatus ===
                        "CANCELLED"
                    ) {

                        return isCancelledSO(so);

                    }


                    return (
                        getSOStatus(so) ===
                        selectedStatus
                    );

                }
            );

    }


    renderSOList(
        filtered
    );


    updateSOSelectionUI();

}


/* =========================================================
   REFRESH SO LIST
========================================================= */

async function refreshSOList() {

    const button =
        document.getElementById(
            "soRefreshBtn"
        );


    if (button) {

        button.classList.add(
            "refreshing"
        );

        button.disabled =
            true;

    }


    try {

        salesOrdersLoaded =
            false;


        await loadSOList(
            true
        );


    } catch (error) {

        console.error(
            "Refresh Sales Order error:",
            error
        );


    } finally {

        if (button) {

            button.disabled =
                false;

            setTimeout(
                function() {

                    button.classList.remove(
                        "refreshing"
                    );

                },
                300
            );

        }

    }

}


/* =========================================================
   OPEN CREATE SO
========================================================= */

function openCreateSO() {

    window.location.href =
        "pages/create-sales-order.html";

}


/* =========================================================
   NEW CUSTOMER
   OPEN INSIDE SALES ORDER
========================================================= */

/*
 * IMPORTANT:
 * customerModuleLoaded is already declared
 * in GLOBAL VARIABLES above.
 *
 * Do NOT declare it again here.
 */

let customerSavedEventBound = false;

let customerCancelEventBound = false;


/* =========================================================
   OPEN NEW CUSTOMER
========================================================= */

async function openNewCustomerFromSalesOrder() {

    console.log(
        "================================="
    );

    console.log(
        "LOGIS-TECH: OPEN NEW CUSTOMER"
    );

    console.log(
        "================================="
    );


    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    const customerArea =
        document.getElementById(
            "customerArea"
        );


    const container =
        document.getElementById(
            "customerFormContainer"
        );


    if (!customerArea) {

        console.error(
            "customerArea not found."
        );

        alert(
            "Customer area not found in Sales Order."
        );

        return;

    }


    if (!container) {

        console.error(
            "customerFormContainer not found."
        );

        alert(
            "Customer form container not found."
        );

        return;

    }


    if (listView) {

        listView.style.display =
            "none";

    }


    if (detailsPage) {

        detailsPage.style.display =
            "none";

    }


    customerArea.style.display =
        "block";


    container.innerHTML = `

        <div
            class="customer-module-loading"
            style="
                padding:60px 30px;
                text-align:center;
            "
        >

            <div
                style="
                    font-size:40px;
                    margin-bottom:15px;
                "
            >
                ⏳
            </div>

            <strong
                style="
                    display:block;
                    font-size:18px;
                    margin-bottom:8px;
                "
            >
                Loading Customer Form...
            </strong>

            <span>
                Please wait...
            </span>

        </div>

    `;


    try {

        await loadCustomerCSS();


        const response =
            await fetch(
                "pages/create-customer.html?v=" +
                Date.now(),
                {
                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to load create-customer.html. HTTP " +
                response.status
            );

        }


        const html =
            await response.text();


        if (!html || !html.trim()) {

            throw new Error(
                "create-customer.html is empty."
            );

        }


        console.log(
            "Customer HTML loaded successfully."
        );


        const parser =
            new DOMParser();


        const doc =
            parser.parseFromString(
                html,
                "text/html"
            );


        if (!doc.body) {

            throw new Error(
                "Customer HTML body was not found."
            );

        }


        doc
            .querySelectorAll(
                "script"
            )
            .forEach(
                function(script) {

                    script.remove();

                }
            );


        doc
            .querySelectorAll(
                "link"
            )
            .forEach(
                function(link) {

                    link.remove();

                }
            );


        container.innerHTML =
            doc.body.innerHTML;


        const customerForm =
            document.getElementById(
                "customerForm"
            );


        if (!customerForm) {

            throw new Error(
                "Customer form was not found after loading HTML."
            );

        }


        await loadCustomerJS();


        customerModuleLoaded =
            true;


        if (
            typeof window.initializeCustomerForm ===
            "function"
        ) {

            const initialized =
                window.initializeCustomerForm();


            if (
                initialized === false
            ) {

                throw new Error(
                    "Customer form initialization failed."
                );

            }

        }
        else {

            throw new Error(
                "initializeCustomerForm() was not found."
            );

        }


        bindCustomerModuleEvents();


        customerArea.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });


        console.log(
            "================================="
        );

        console.log(
            "CUSTOMER MODULE READY"
        );

        console.log(
            "================================="
        );


    } catch (error) {

        console.error(
            "NEW CUSTOMER ERROR:",
            error
        );


        container.innerHTML = `

            <div
                style="
                    padding:50px 30px;
                    text-align:center;
                    color:#b42318;
                "
            >

                <div
                    style="
                        font-size:42px;
                        margin-bottom:15px;
                    "
                >
                    ⚠
                </div>

                <strong
                    style="
                        display:block;
                        font-size:18px;
                        margin-bottom:10px;
                    "
                >
                    Unable to Load Customer Form
                </strong>

                <small
                    style="
                        display:block;
                        margin-bottom:20px;
                    "
                >

                    ${escapeHTML(
                        error.message ||
                        "Unknown error."
                    )}

                </small>


                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="
                        openNewCustomerFromSalesOrder()
                    "
                >

                    TRY AGAIN

                </button>


                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="
                        closeCustomerFromSalesOrder()
                    "
                    style="
                        margin-left:8px;
                    "
                >

                    CLOSE

                </button>

            </div>

        `;

    }

}


/* =========================================================
   CLOSE NEW CUSTOMER
========================================================= */

function closeCustomerFromSalesOrder() {

    console.log(
        "Closing Customer Form..."
    );


    const customerArea =
        document.getElementById(
            "customerArea"
        );


    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    if (customerArea) {

        customerArea.style.display =
            "none";

    }


    if (detailsPage) {

        detailsPage.style.display =
            "none";

    }


    if (listView) {

        listView.style.display =
            "block";

    }


    refreshCustomerDataAfterSave();


    customerModuleLoaded =
        false;


    const salesPage =
        document.getElementById(
            "salesOrderPage"
        );


    if (salesPage) {

        salesPage.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }


    console.log(
        "Customer Form closed."
    );

}


/* =========================================================
   CUSTOMER MODULE EVENTS
========================================================= */

function bindCustomerModuleEvents() {

    if (
        !customerSavedEventBound
    ) {

        window.addEventListener(
            "customerSaved",
            function(event) {

                console.log(
                    "Customer saved event received:",
                    event
                );


                refreshCustomerDataAfterSave();

            }
        );


        customerSavedEventBound =
            true;

    }


    if (
        !customerCancelEventBound
    ) {

        window.addEventListener(
            "customerFormCancel",
            function() {

                console.log(
                    "Customer cancel event received."
                );


                closeCustomerFromSalesOrder();

            }
        );


        customerCancelEventBound =
            true;

    }

}


/* =========================================================
   CUSTOMER CSS LOADER
========================================================= */

function loadCustomerCSS() {

    return new Promise(
        function(resolve, reject) {

            const existing =
                document.querySelector(
                    'link[data-customer-css="true"]'
                );


            if (existing) {

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
                "css/create-customer.css?v=20261006";


            link.dataset.customerCss =
                "true";


            link.onload =
                function() {

                    console.log(
                        "create-customer.css loaded."
                    );

                    resolve();

                };


            link.onerror =
                function() {

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


/* =========================================================
   CUSTOMER JS LOADER
========================================================= */

function loadCustomerJS() {

    return new Promise(
        function(resolve, reject) {

            const existing =
                document.querySelector(
                    'script[data-customer-js="true"]'
                );


            if (existing) {

                resolve();

                return;

            }


            const script =
                document.createElement(
                    "script"
                );


            script.src =
                "js/create-customer.js?v=20261006";


            script.dataset.customerJs =
                "true";


            script.onload =
                function() {

                    console.log(
                        "create-customer.js loaded."
                    );

                    resolve();

                };


            script.onerror =
                function() {

                    reject(
                        new Error(
                            "Unable to load create-customer.js"
                        )
                    );

                };


            document.body.appendChild(
                script
            );

        }
    );

}


/* =========================================================
   REFRESH CUSTOMER DATA
========================================================= */

function refreshCustomerDataAfterSave() {

    try {

        if (
            typeof window.loadCustomers ===
            "function"
        ) {

            window.loadCustomers();

        }

    } catch (error) {

        console.warn(
            "Unable to refresh customer dropdown:",
            error
        );

    }

}

/* =========================================================
   OPEN SALES ORDER DETAILS
========================================================= */

async function openSODetails(
    soNumber
) {

    const number =
        String(
            soNumber || ""
        ).trim();


    if (!number) {

        console.warn(
            "Sales Order number is required."
        );

        return;

    }


    console.log(
        "Opening Sales Order Details:",
        number
    );


    showSODetailsLoading();


    try {

        const result =
            await salesOrderAPI(
                "getSalesOrder",
                {
                    soNumber:
                        number
                }
            );


        console.log(
            "GET SO DETAILS RESULT:",
            result
        );


        if (
            !result ||
            !result.success
        ) {

            throw new Error(
                result?.message ||
                result?.error ||
                "Unable to load Sales Order details."
            );

        }


        const so =
            result.so ||
            result.salesOrder ||
            result.data;


        if (!so) {

            throw new Error(
                "Sales Order details were not returned."
            );

        }


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

                <div
                    style="
                        padding:50px;
                        text-align:center;
                        color:#b42318;
                    "
                >

                    <div
                        style="
                            font-size:42px;
                            margin-bottom:15px;
                        "
                    >
                        ⚠
                    </div>


                    <strong
                        style="
                            display:block;
                            font-size:18px;
                            margin-bottom:10px;
                        "
                    >

                        Unable to Load Sales Order

                    </strong>


                    <p>

                        ${escapeHTML(
                            error.message ||
                            "Unknown error."
                        )}

                    </p>


                    <button
                        type="button"
                        class="btn btn-primary"
                        onclick="
                            openSODetails(
                                '${escapeAttribute(
                                    number
                                )}'
                            )
                        "
                    >

                        TRY AGAIN

                    </button>


                    <button
                        type="button"
                        class="btn btn-secondary"
                        onclick="
                            closeSODetails()
                        "
                        style="
                            margin-left:8px;
                        "
                    >

                        CLOSE

                    </button>

                </div>

            `;

        }

    }

}


/* =========================================================
   SHOW SO DETAILS LOADING
========================================================= */

function showSODetailsLoading() {

    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const details =
        document.getElementById(
            "soDetails"
        );


    const customerArea =
        document.getElementById(
            "customerArea"
        );


    if (listView) {

        listView.style.display =
            "none";

    }


    if (customerArea) {

        customerArea.style.display =
            "none";

    }


    if (!details) {

        console.error(
            "soDetails element not found."
        );

        return;

    }


    details.style.display =
        "block";


    details.innerHTML = `

        <div
            style="
                padding:70px 30px;
                text-align:center;
            "
        >

            <div
                style="
                    font-size:42px;
                    margin-bottom:15px;
                "
            >
                ⏳
            </div>


            <strong
                style="
                    display:block;
                    font-size:18px;
                    margin-bottom:8px;
                "
            >

                Loading Sales Order Details...

            </strong>


            <span>

                Please wait...

            </span>

        </div>

    `;

}


/* =========================================================
   SHOW SO DETAILS PAGE
========================================================= */

function showSODetailsPage(
    so
) {

    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const details =
        document.getElementById(
            "soDetails"
        );


    const customerArea =
        document.getElementById(
            "customerArea"
        );


    if (listView) {

        listView.style.display =
            "none";

    }


    if (customerArea) {

        customerArea.style.display =
            "none";

    }


    if (!details) {

        console.error(
            "soDetails element not found."
        );

        return;

    }


    details.style.display =
        "block";


    renderSODetails(
        so
    );


    const soNumber =
        getSOValue(
            so,
            "soNumber",
            "SO_NUMBER",
            "SO Number"
        );


    loadSOFiles(
        soNumber
    );


    setDetailsEditMode(
        false
    );


    details.scrollIntoView({

        behavior:
            "smooth",

        block:
            "start"

    });

}


/* =========================================================
   RENDER SO DETAILS
========================================================= */

function renderSODetails(
    so
) {

    if (!so) {
        return;
    }


    /* =====================================================
       HEADER / BASIC DETAILS
    ===================================================== */

    setValue(
        "detailSODate",
        getSOValue(
            so,
            "dateCreation",
            "DATE_CREATION",
            "DATE CREATED",
            "Date Creation"
        )
    );


    setValue(
        "detailSONumber",
        getSOValue(
            so,
            "soNumber",
            "SO_NUMBER",
            "SO Number"
        )
    );


    setValue(
        "detailClientName",
        getSOValue(
            so,
            "clientName",
            "CLIENT_NAME",
            "CLIENT NAME"
        )
    );


    setValue(
        "detailSE",
        getSOValue(
            so,
            "se",
            "SE",
            "SALES_ENGINEER"
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
            "BILLING_ADDRESS",
            "BILLING ADDRESS"
        )
    );


    setValue(
        "detailDeliveryAddress",
        getSOValue(
            so,
            "deliveryAddress",
            "DELIVERY_ADDRESS",
            "DELIVERY ADDRESS"
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
            "PO_NUMBER",
            "PO NUMBER"
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
            "JOB_ORDER",
            "JOB ORDER"
        )
    );


    /* =====================================================
       ITEMS
    ===================================================== */

    const items =
        Array.isArray(
            so.items
        )
            ? so.items
            : Array.isArray(
                so.ITEMS
            )
                ? so.ITEMS
                : [];


    renderSODetailItems(
        items
    );


    /* =====================================================
       TOTALS
    ===================================================== */

    const subtotal =
        getSOValue(
            so,
            "subtotal",
            "SUBTOTAL"
        );


    const discount =
        getSOValue(
            so,
            "discount",
            "DISCOUNT"
        );


    const vatable =
        getSOValue(
            so,
            "vatable",
            "VATABLE"
        );


    const vatRate =
        getSOValue(
            so,
            "vatRate",
            "VAT_RATE"
        ) || 0.12;


    const vatAmount =
        getSOValue(
            so,
            "vatAmount",
            "VAT_AMOUNT"
        );


    const grandTotal =
        getSOValue(
            so,
            "grandTotal",
            "GRAND_TOTAL",
            "GRAND TOTAL"
        );


    setValue(
        "detailSubtotal",
        formatMoney(
            subtotal
        )
    );


    setValue(
        "detailDiscount",
        formatMoney(
            discount
        )
    );


    setValue(
        "detailVatable",
        formatMoney(
            vatable
        )
    );


    setValue(
        "detailVATRate",
        Number(
            vatRate
        ) * 100
    );


    setValue(
        "detailVATAmount",
        formatMoney(
            vatAmount
        )
    );


    setValue(
        "detailGrandTotal",
        formatMoney(
            grandTotal
        )
    );


    /* =====================================================
       TEXT-ONLY TOTAL ELEMENTS
    ===================================================== */

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

}


/* =========================================================
   RENDER SO DETAIL ITEMS
========================================================= */

function renderSODetailItems(
    items
) {

    const container =
        document.getElementById(
            "detailItemsContainer"
        );


    if (!container) {

        console.warn(
            "detailItemsContainer not found."
        );

        return;

    }


    container.innerHTML =
        "";


    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        container.innerHTML = `

            <div
                class="so-detail-empty-items"
            >

                No Sales Order items found.

            </div>

        `;

        return;

    }


    items.forEach(
        function(item, index) {

            const itemName =
                getSOValue(
                    item,
                    "itemName",
                    "ITEM_NAME",
                    "ITEM NAME",
                    "description",
                    "DESCRIPTION"
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
                    "QTY",
                    "QUANTITY"
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
                    "UNIT PRICE",
                    "PRICE"
                );


            const total =
                getSOValue(
                    item,
                    "total",
                    "TOTAL",
                    "LINE_TOTAL"
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "so-detail-item-row";


            row.dataset.itemIndex =
                index;


            row.innerHTML = `

                <div
                    class="so-detail-item-number"
                >

                    ${index + 1}

                </div>


                <div
                    class="so-detail-item-field"
                >

                    <label>
                        Item
                    </label>

                    <input
                        type="text"
                        class="detail-item-name"
                        value="${escapeAttribute(
                            itemName || ""
                        )}"
                        disabled
                    >

                </div>


                <div
                    class="so-detail-item-field"
                >

                    <label>
                        Description
                    </label>

                    <input
                        type="text"
                        class="detail-item-description"
                        value="${escapeAttribute(
                            description || ""
                        )}"
                        disabled
                    >

                </div>


                <div
                    class="so-detail-item-field small"
                >

                    <label>
                        Qty
                    </label>

                    <input
                        type="number"
                        class="detail-item-qty"
                        value="${escapeAttribute(
                            quantity || 0
                        )}"
                        min="0"
                        step="any"
                        disabled
                        oninput="
                            calculateDetailTotals()
                        "
                    >

                </div>


                <div
                    class="so-detail-item-field small"
                >

                    <label>
                        Unit
                    </label>

                    <input
                        type="text"
                        class="detail-item-unit"
                        value="${escapeAttribute(
                            unit || ""
                        )}"
                        disabled
                    >

                </div>


                <div
                    class="so-detail-item-field"
                >

                    <label>
                        Amount
                    </label>

                    <input
                        type="number"
                        class="detail-item-amount"
                        value="${escapeAttribute(
                            amount || 0
                        )}"
                        min="0"
                        step="0.01"
                        disabled
                        oninput="
                            calculateDetailTotals()
                        "
                    >

                </div>


                <div
                    class="so-detail-item-field"
                >

                    <label>
                        Total
                    </label>

                    <input
                        type="number"
                        class="detail-item-total"
                        value="${escapeAttribute(
                            total || 0
                        )}"
                        readonly
                    >

                </div>


                <div
                    class="so-detail-item-actions"
                >

                    <button
                        type="button"
                        class="detail-item-delete"
                        onclick="
                            deleteDetailItem(
                                ${index}
                            )
                        "
                        style="
                            display:none;
                        "
                    >

                        ×

                    </button>

                </div>

            `;


            container.appendChild(
                row
            );

        }
    );


    calculateDetailTotals();

}


/* =========================================================
   ENABLE SO UPDATE
========================================================= */

function enableSOUpdate() {

    if (!currentSO) {

        alert(
            "Please select a Sales Order first."
        );

        return;

    }


    setDetailsEditMode(
        true
    );

}


/* =========================================================
   SET DETAILS EDIT MODE
========================================================= */

function setDetailsEditMode(
    enabled
) {

    soDetailsEditMode =
        !!enabled;


    const details =
        document.getElementById(
            "soDetails"
        );


    if (!details) {
        return;
    }


    /*
     * INPUTS
     */

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


    /*
     * DELETE BUTTONS
     */

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


    /*
     * ADD ITEM BUTTON
     */

    const addItemButton =
        document.getElementById(
            "addDetailItemButton"
        );


    if (addItemButton) {

        addItemButton.style.display =
            enabled
                ? "inline-flex"
                : "none";

    }


    /*
     * SAVE BUTTON
     */

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


    /*
     * UPDATE BUTTON
     */

    const updateButton =
        document.getElementById(
            "enableSOUpdateButton"
        );


    if (updateButton) {

        updateButton.style.display =
            enabled
                ? "none"
                : "inline-flex";

    }


    /*
     * CANCEL EDIT BUTTON
     */

    const cancelEditButton =
        document.getElementById(
            "cancelSOEditButton"
        );


    if (cancelEditButton) {

        cancelEditButton.style.display =
            enabled
                ? "inline-flex"
                : "none";

    }


    /*
     * ADD FILE BUTTON
     *
     * File upload remains available.
     */

    const addFileButton =
        document.getElementById(
            "addSOFileButton"
        );


    if (addFileButton) {

        addFileButton.style.display =
            "inline-flex";

    }

}


/* =========================================================
   ADD DETAIL ITEM
========================================================= */

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
            ".so-detail-item-row"
        ).length;


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "so-detail-item-row";


    row.dataset.itemIndex =
        index;


    row.innerHTML = `

        <div
            class="so-detail-item-number"
        >

            ${index + 1}

        </div>


        <div
            class="so-detail-item-field"
        >

            <label>
                Item
            </label>

            <input
                type="text"
                class="detail-item-name"
                value=""
            >

        </div>


        <div
            class="so-detail-item-field"
        >

            <label>
                Description
            </label>

            <input
                type="text"
                class="detail-item-description"
                value=""
            >

        </div>


        <div
            class="so-detail-item-field small"
        >

            <label>
                Qty
            </label>

            <input
                type="number"
                class="detail-item-qty"
                value="0"
                min="0"
                step="any"
                oninput="
                    calculateDetailTotals()
                "
            >

        </div>


        <div
            class="so-detail-item-field small"
        >

            <label>
                Unit
            </label>

            <input
                type="text"
                class="detail-item-unit"
                value=""
            >

        </div>


        <div
            class="so-detail-item-field"
        >

            <label>
                Amount
            </label>

            <input
                type="number"
                class="detail-item-amount"
                value="0"
                min="0"
                step="0.01"
                oninput="
                    calculateDetailTotals()
                "
            >

        </div>


        <div
            class="so-detail-item-field"
        >

            <label>
                Total
            </label>

            <input
                type="number"
                class="detail-item-total"
                value="0"
                readonly
            >

        </div>


        <div
            class="so-detail-item-actions"
        >

            <button
                type="button"
                class="detail-item-delete"
                onclick="
                    deleteDetailItem(
                        ${index}
                    )
                "
            >

                ×

            </button>

        </div>

    `;


    container.appendChild(
        row
    );


    renumberDetailItems();

    calculateDetailTotals();

}


/* =========================================================
   DELETE DETAIL ITEM
========================================================= */

function deleteDetailItem(
    index
) {

    const container =
        document.getElementById(
            "detailItemsContainer"
        );


    if (!container) {
        return;
    }


    const rows =
        container.querySelectorAll(
            ".so-detail-item-row"
        );


    const row =
        rows[index];


    if (!row) {
        return;
    }


    row.remove();


    renumberDetailItems();

    calculateDetailTotals();

}


/* =========================================================
   RENUMBER DETAIL ITEMS
========================================================= */

function renumberDetailItems() {

    const container =
        document.getElementById(
            "detailItemsContainer"
        );


    if (!container) {
        return;
    }


    const rows =
        container.querySelectorAll(
            ".so-detail-item-row"
        );


    rows.forEach(
        function(row, index) {

            row.dataset.itemIndex =
                index;


            const number =
                row.querySelector(
                    ".so-detail-item-number"
                );


            if (number) {

                number.textContent =
                    index + 1;

            }


            const deleteButton =
                row.querySelector(
                    ".detail-item-delete"
                );


            if (deleteButton) {

                deleteButton.setAttribute(
                    "onclick",
                    "deleteDetailItem(" +
                    index +
                    ")"
                );

            }

        }
    );

}


/* =========================================================
   CALCULATE DETAIL TOTALS
========================================================= */

function calculateDetailTotals() {

    const rows =
        document.querySelectorAll(
            "#detailItemsContainer .so-detail-item-row"
        );


    let subtotal =
        0;


    rows.forEach(
        function(row) {

            const qtyInput =
                row.querySelector(
                    ".detail-item-qty"
                );


            const amountInput =
                row.querySelector(
                    ".detail-item-amount"
                );


            const totalInput =
                row.querySelector(
                    ".detail-item-total"
                );


            const qty =
                Number(
                    qtyInput?.value ||
                    0
                );


            const amount =
                Number(
                    amountInput?.value ||
                    0
                );


            const total =
                qty *
                amount;


            if (totalInput) {

                totalInput.value =
                    total.toFixed(
                        2
                    );

            }


            subtotal +=
                total;

        }
    );


    const discountInput =
        document.getElementById(
            "detailDiscount"
        );


    const discount =
        Number(
            discountInput?.value ||
            0
        );


    const vatable =
        subtotal -
        discount;


    const vatRate =
        0.12;


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


/* =========================================================
   SAVE SALES ORDER UPDATE
========================================================= */

async function saveSOUpdate() {

    if (!currentSO) {

        alert(
            "No Sales Order selected."
        );

        return;

    }


    const soNumber =
        getSOValue(
            currentSO,
            "soNumber",
            "SO_NUMBER",
            "SO Number"
        );


    const items =
        collectDetailItems();


    const subtotal =
        Number(
            getValue(
                "detailSubtotal"
            ) ||
            0
        );


    const discount =
        Number(
            getValue(
                "detailDiscount"
            ) ||
            0
        );


    const vatable =
        Number(
            getValue(
                "detailVatable"
            ) ||
            0
        );


    const vatRate =
        0.12;


    const vatAmount =
        Number(
            getValue(
                "detailVATAmount"
            ) ||
            0
        );


    const grandTotal =
        Number(
            getValue(
                "detailGrandTotal"
            ) ||
            0
        );


    const data = {

        soNumber:
            soNumber,

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
            currentSO.STATUS ||
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
            currentSO.CREATED_BY ||
            "",

        createdDate:
            currentSO.createdDate ||
            currentSO.CREATED_DATE ||
            "",

        items:
            items

    };


    console.log(
        "UPDATING SALES ORDER:",
        data
    );


    const saveButton =
        document.getElementById(
            "saveSOUpdateButton"
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "SAVING...";

    }


    try {

        const result =
            await salesOrderAPI(
                "updateSalesOrder",
                data
            );


        console.log(
            "UPDATE SO RESULT:",
            result
        );


        if (
            !result ||
            !result.success
        ) {

            throw new Error(
                result?.message ||
                result?.error ||
                "Unable to update Sales Order."
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
            "Unable to update Sales Order.\n\n" +
            error.message
        );


    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "SAVE UPDATE";

        }

    }

}


/* =========================================================
   COLLECT DETAIL ITEMS
========================================================= */

function collectDetailItems() {

    const rows =
        document.querySelectorAll(
            "#detailItemsContainer .so-detail-item-row"
        );


    const items =
        [];


    rows.forEach(
        function(row, index) {

            const itemName =
                row.querySelector(
                    ".detail-item-name"
                )?.value ||
                "";


            const description =
                row.querySelector(
                    ".detail-item-description"
                )?.value ||
                "";


            const quantity =
                Number(
                    row.querySelector(
                        ".detail-item-qty"
                    )?.value ||
                    0
                );


            const unit =
                row.querySelector(
                    ".detail-item-unit"
                )?.value ||
                "";


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
                    quantity *
                    amount
                );


            items.push({

                itemNo:
                    index + 1,

                itemName:
                    itemName,

                description:
                    description,

                quantity:
                    quantity,

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
   CANCEL SELECTED SALES ORDER
========================================================= */

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
            "SO_NUMBER",
            "SO Number"
        );


    if (
        isCancelledSO(so)
    ) {

        alert(
            "This Sales Order is already cancelled."
        );

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to CANCEL Sales Order " +
            soNumber +
            "?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const result =
            await salesOrderAPI(
                "cancelSalesOrder",
                {
                    soNumber:
                        soNumber
                }
            );


        console.log(
            "CANCEL SO RESULT:",
            result
        );


        if (
            !result ||
            !result.success
        ) {

            throw new Error(
                result?.message ||
                result?.error ||
                "Unable to cancel Sales Order."
            );

        }


        alert(
            "Sales Order cancelled successfully."
        );


        /*
         * UPDATE LOCAL CACHE
         */

        const index =
            salesOrders.findIndex(
                function(item) {

                    return (
                        String(
                            getSOValue(
                                item,
                                "soNumber",
                                "SO_NUMBER",
                                "SO Number"
                            )
                        ) ===
                        String(
                            soNumber
                        )
                    );

                }
            );


        if (index !== -1) {

            salesOrders[
                index
            ].status =
                "CANCELLED";

        }


        if (
            soDetailsCache[
                soNumber
            ]
        ) {

            soDetailsCache[
                soNumber
            ].status =
                "CANCELLED";

        }


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


    } catch (error) {

        console.error(
            "CANCEL SO ERROR:",
            error
        );


        alert(
            "Unable to cancel Sales Order.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   UPDATE SELECTED SALES ORDER
========================================================= */

function updateSelectedSO() {

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
            "SO_NUMBER",
            "SO Number"
        );


    openSODetails(
        soNumber
    );

}


/* =========================================================
   CLOSE SO DETAILS
========================================================= */

function closeSODetails() {

    const details =
        document.getElementById(
            "soDetails"
        );


    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const customerArea =
        document.getElementById(
            "customerArea"
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


    const salesPage =
        document.getElementById(
            "salesOrderPage"
        );


    if (salesPage) {

        salesPage.scrollIntoView({

            behavior:
                "smooth",

            block:
                "start"

        });

    }

}


/* =========================================================
   SELECT SO FILES
========================================================= */

function selectDetailSOFiles() {

    const input =
        document.getElementById(
            "detailSOFileInput"
        );


    if (!input) {

        alert(
            "SO file input not found."
        );

        return;

    }


    input.click();

}


/* =========================================================
   HANDLE SO FILES
========================================================= */

async function handleDetailSOFiles(
    event
) {

    const files =
        Array.from(
            event.target.files ||
            []
        );


    if (
        files.length === 0
    ) {

        return;

    }


    if (!currentSO) {

        alert(
            "Please open a Sales Order first."
        );

        return;

    }


    for (
        const file of files
    ) {

        try {

            await uploadDetailSOFile(
                file
            );

        } catch (error) {

            console.error(
                "SO FILE UPLOAD ERROR:",
                error
            );

            alert(
                "Unable to upload " +
                file.name +
                ".\n\n" +
                error.message
            );

        }

    }


    event.target.value =
        "";


    const soNumber =
        getSOValue(
            currentSO,
            "soNumber",
            "SO_NUMBER",
            "SO Number"
        );


    loadSOFiles(
        soNumber
    );

}


/* =========================================================
   UPLOAD SO FILE
========================================================= */

async function uploadDetailSOFile(
    file
) {

    if (!file) {
        return;
    }


    const fileName =
        String(
            file.name ||
            ""
        );


    const extension =
        fileName
            .split(".")
            .pop()
            .toLowerCase();


    if (
        extension !==
        "pdf"
    ) {

        throw new Error(
            "Only PDF files are allowed."
        );

    }


    if (
        file.size >
        SO_FILE_MAX_SIZE
    ) {

        throw new Error(
            "PDF file is too large. Maximum size is 10 MB."
        );

    }


    const soNumber =
        getSOValue(
            currentSO,
            "soNumber",
            "SO_NUMBER",
            "SO Number"
        );


    if (!soNumber) {

        throw new Error(
            "Sales Order number is missing."
        );

    }


    const base64Data =
        await fileToBase64(
            file
        );


    const currentUser =
        localStorage.getItem(
            "logitechUser"
        ) ||
        localStorage.getItem(
            "currentUser"
        ) ||
        "";


    const result =
        await salesOrderAPI(
            "uploadSOFile",
            {

                soNumber:
                    soNumber,

                soId:
                    currentSO.soId ||
                    currentSO.SO_ID ||
                    currentSO.id ||
                    "",

                fileName:
                    fileName,

                mimeType:
                    file.type ||
                    "application/pdf",

                base64Data:
                    base64Data,

                uploadedBy:
                    currentSO.createdBy ||
                    currentSO.CREATED_BY ||
                    currentUser,

                dateCreation:
                    getSOValue(
                        currentSO,
                        "dateCreation",
                        "DATE_CREATION",
                        "DATE CREATED"
                    )

            }
        );


    console.log(
        "UPLOAD SO FILE RESULT:",
        result
    );


    if (
        !result ||
        !result.success
    ) {

        throw new Error(
            result?.message ||
            result?.error ||
            "Unable to upload SO file."
        );

    }


    alert(
        fileName +
        " uploaded successfully."
    );


    return result;

}


/* =========================================================
   FILE TO BASE64
========================================================= */

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
                            reader.result ||
                            ""
                        );


                    const commaIndex =
                        result.indexOf(
                            ","
                        );


                    if (
                        commaIndex ===
                        -1
                    ) {

                        resolve(
                            result
                        );

                        return;

                    }


                    resolve(
                        result.substring(
                            commaIndex + 1
                        )
                    );

                };


            reader.onerror =
                function() {

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


/* =========================================================
   LOAD SO FILES
========================================================= */

async function loadSOFiles(
    soNumber
) {

    const container =
        document.getElementById(
            "soFilesList"
        );


    if (!container) {

        return;

    }


    if (!soNumber) {

        container.innerHTML =
            "";

        return;

    }


    container.innerHTML = `

        <div
            class="so-files-loading"
        >

            Loading files...

        </div>

    `;


    try {

        const result =
            await salesOrderAPI(
                "getSOFiles",
                {
                    soNumber:
                        soNumber
                }
            );


        console.log(
            "GET SO FILES RESULT:",
            result
        );


        if (
            !result ||
            !result.success
        ) {

            throw new Error(
                result?.message ||
                result?.error ||
                "Unable to load SO files."
            );

        }


        const files =
            Array.isArray(
                result.files
            )
                ? result.files
                : [];


        renderSOFiles(
            files
        );


    } catch (error) {

        console.error(
            "LOAD SO FILES ERROR:",
            error
        );


        container.innerHTML = `

            <div
                class="so-files-error"
            >

                Unable to load files.

                <br>

                <small>

                    ${escapeHTML(
                        error.message
                    )}

                </small>

            </div>

        `;

    }

}


/* =========================================================
   RENDER SO FILES
========================================================= */

function renderSOFiles(
    files
) {

    const container =
        document.getElementById(
            "soFilesList"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        "";


    if (
        !Array.isArray(files) ||
        files.length === 0
    ) {

        container.innerHTML = `

            <div
                class="so-files-empty"
            >

                No attached Sales Order files.

            </div>

        `;

        return;

    }


    files.forEach(
        function(file) {

            const fileId =
                getSOValue(
                    file,
                    "fileId",
                    "FILE_ID",
                    "id",
                    "ID"
                );


            const fileName =
                getSOValue(
                    file,
                    "fileName",
                    "FILE_NAME",
                    "name",
                    "NAME"
                );


            const fileUrl =
                getSOValue(
                    file,
                    "fileUrl",
                    "FILE_URL",
                    "url",
                    "URL",
                    "webViewUrl"
                );


            const uploadedBy =
                getSOValue(
                    file,
                    "uploadedBy",
                    "UPLOADED_BY"
                );


            const uploadedAt =
                getSOValue(
                    file,
                    "uploadedAt",
                    "UPLOADED_AT",
                    "createdAt",
                    "CREATED_AT"
                );


            const fileSize =
                getSOValue(
                    file,
                    "fileSize",
                    "FILE_SIZE",
                    "size",
                    "SIZE"
                );


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "so-file-item";


            item.innerHTML = `

                <div
                    class="so-file-icon"
                >

                    PDF

                </div>


                <div
                    class="so-file-info"
                >

                    <strong>

                        ${escapeHTML(
                            fileName || "-"
                        )}

                    </strong>


                    <span>

                        ${escapeHTML(
                            formatFileSize(
                                fileSize
                            )
                        )}

                    </span>


                    <span>

                        Uploaded by:

                        ${escapeHTML(
                            uploadedBy || "-"
                        )}

                    </span>


                    <span>

                        ${escapeHTML(
                            formatSOFileDate(
                                uploadedAt
                            )
                        )}

                    </span>

                </div>


                <div
                    class="so-file-actions"
                >

                    <button
                        type="button"
                        onclick="
                            viewSOFile(
                                '${escapeAttribute(
                                    fileUrl || ""
                                )}'
                            )
                        "
                    >

                        VIEW

                    </button>


                    <button
                        type="button"
                        class="danger"
                        onclick="
                            deleteSOFile(
                                '${escapeAttribute(
                                    fileId || ""
                                )}',
                                '${escapeAttribute(
                                    fileName || ""
                                )}'
                            )
                        "
                    >

                        DELETE

                    </button>

                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   VIEW SO FILE
========================================================= */

function viewSOFile(
    fileUrl
) {

    const url =
        String(
            fileUrl || ""
        ).trim();


    if (!url) {

        alert(
            "File URL is not available."
        );

        return;

    }


    window.open(
        url,
        "_blank",
        "noopener,noreferrer"
    );

}


/* =========================================================
   DELETE SO FILE
========================================================= */

async function deleteSOFile(
    fileId,
    fileName
) {

    if (!fileId) {

        alert(
            "File ID is missing."
        );

        return;

    }


    const confirmed =
        confirm(
            "Delete this file?\n\n" +
            fileName
        );


    if (!confirmed) {
        return;
    }


    try {

        const result =
            await salesOrderAPI(
                "deleteSOFile",
                {
                    fileId:
                        fileId
                }
            );


        console.log(
            "DELETE SO FILE RESULT:",
            result
        );


        if (
            !result ||
            !result.success
        ) {

            throw new Error(
                result?.message ||
                result?.error ||
                "Unable to delete file."
            );

        }


        alert(
            "File deleted successfully."
        );


        const soNumber =
            getSOValue(
                currentSO,
                "soNumber",
                "SO_NUMBER",
                "SO Number"
            );


        loadSOFiles(
            soNumber
        );


    } catch (error) {

        console.error(
            "DELETE SO FILE ERROR:",
            error
        );


        alert(
            "Unable to delete file.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   FORMAT FILE SIZE
========================================================= */

function formatFileSize(
    bytes
) {

    const size =
        Number(
            bytes
        );


    if (
        !Number.isFinite(size) ||
        size <= 0
    ) {

        return "-";

    }


    if (
        size < 1024
    ) {

        return (
            size +
            " B"
        );

    }


    if (
        size < 1024 * 1024
    ) {

        return (
            (size / 1024)
                .toFixed(1) +
            " KB"
        );

    }


    return (
        (size / (
            1024 *
            1024
        ))
        .toFixed(1) +
        " MB"
    );

}


/* =========================================================
   FORMAT SO FILE DATE
========================================================= */

function formatSOFileDate(
    value
) {

    if (!value) {

        return "-";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleString(
        "en-PH",
        {
            year:
                "numeric",

            month:
                "short",

            day:
                "2-digit",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


/* =========================================================
   EMAIL SELECTED SALES ORDER
========================================================= */

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


    const recipient =
        prompt(
            "Enter recipient email address:"
        );


    if (!recipient) {
        return;
    }


    const soNumber =
        getSOValue(
            so,
            "soNumber",
            "SO_NUMBER",
            "SO Number"
        );


    const clientName =
        getSOValue(
            so,
            "clientName",
            "CLIENT_NAME",
            "CLIENT NAME"
        );


    const project =
        getSOValue(
            so,
            "project",
            "PROJECT"
        );


    try {

        const result =
            await salesOrderAPI(
                "emailSalesOrder",
                {

                    soNumber:
                        soNumber,

                    clientName:
                        clientName,

                    project:
                        project,

                    recipient:
                        recipient

                }
            );


        console.log(
            "EMAIL SO RESULT:",
            result
        );


        if (
            !result ||
            !result.success
        ) {

            throw new Error(
                result?.message ||
                result?.error ||
                "Unable to email Sales Order."
            );

        }


        alert(
            "Sales Order sent successfully."
        );


    } catch (error) {

        console.error(
            "EMAIL SO ERROR:",
            error
        );


        alert(
            "Unable to send Sales Order.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   GENERIC VALUE HELPER
========================================================= */

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
            Object.prototype.hasOwnProperty.call(
                object,
                key
            )
        ) {

            const value =
                object[key];


            if (
                value !== null &&
                value !== undefined &&
                String(
                    value
                ).trim() !== ""
            ) {

                return value;

            }

        }

    }


    return "";

}


/* =========================================================
   SET VALUE
========================================================= */

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


/* =========================================================
   GET VALUE
========================================================= */

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return "";
    }


    return element.value;

}


/* =========================================================
   SET TEXT
========================================================= */

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


/* =========================================================
   FORMAT MONEY
========================================================= */

function formatMoney(
    value
) {

    const number =
        Number(
            value
        );


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "0.00";

    }


    return number.toLocaleString(
        "en-PH",
        {
            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(
        value === null ||
        value === undefined
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


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return String(
        value === null ||
        value === undefined
            ? ""
            : value
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    );

}


/* =========================================================
   CSS ESCAPE
========================================================= */

function cssEscape(
    value
) {

    if (
        window.CSS &&
        typeof window.CSS.escape ===
            "function"
    ) {

        return window.CSS.escape(
            String(
                value
            )
        );

    }


    return String(
        value
    )
    .replace(
        /([^\w-])/g,
        "\\$1"
    );

}


/* =========================================================
   DOM CONTENT LOADED
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "================================="
        );

        console.log(
            "LOGIS-TECH SALES ORDER.JS LOADED"
        );

        console.log(
            "VERSION: 20261006-03"
        );

        console.log(
            "================================="
        );

    }
);
