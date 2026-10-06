/* =========================================================
   LOGIS-TECH SYSTEM
   SALES ORDER MODULE
   GOOGLE APPS SCRIPT API
   VERSION: 20261006-02
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
                    colspan="100%"
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
                        colspan="100%"
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


    /*
     * COPY ARRAY
     * para hindi mabago ang main list
     */

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


            const status =
                getSOStatus(so) ||
                "ACTIVE";


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


            /*
             * CLICK
             */

            item.addEventListener(
                "click",
                function() {

                    selectSO(
                        soNumber
                    );


                    /*
                     * Highlight recent item
                     */

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


            /*
             * DOUBLE CLICK
             */

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


    /*
     * MM/DD/YYYY
     */

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


    /*
     * Scroll to SO table
     */

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


    /*
     * ALL
     */

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


    /*
     * SET FILTER
     */

    if (statusFilter) {

        statusFilter.value =
            type;

    }


    /*
     * FILTER
     */

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


    /*
     * Scroll to list
     */

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
                    colspan="100%"
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


            const row =
                document.createElement(
                    "tr"
                );


            row.dataset.soNumber =
                soNumber || "";


            row.innerHTML = `

                <td>

                    <strong class="so-number-cell">

                        ${escapeHTML(
                            soNumber || ""
                        )}

                    </strong>

                </td>


                <td>

                    ${escapeHTML(
                        dateCreation || ""
                    )}

                </td>


                <td>

                    <span class="client-name-cell">

                        ${escapeHTML(
                            clientName || ""
                        )}

                    </span>

                </td>


                <td>

                    ${escapeHTML(
                        se || ""
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        project || ""
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        poNumber || ""
                    )}

                </td>


                <td>

                    ${escapeHTML(
                        terms || ""
                    )}

                </td>


                <td class="so-amount-cell">

                    ${formatMoney(
                        grandTotal
                    )}

                </td>


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


            /*
             * CLICK
             */

            row.addEventListener(
                "click",
                function() {

                    selectSO(
                        soNumber
                    );

                }
            );


            /*
             * DOUBLE CLICK
             */

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


    /*
     * HIDE SALES ORDER CONTENT
     */

    if (listView) {

        listView.style.display =
            "none";

    }


    if (detailsPage) {

        detailsPage.style.display =
            "none";

    }


    /*
     * SHOW CUSTOMER AREA
     */

    customerArea.style.display =
        "block";


    /*
     * LOADING DISPLAY
     */

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

        /*
         * =================================================
         * LOAD CUSTOMER CSS
         * =================================================
         */

        await loadCustomerCSS();


        /*
         * =================================================
         * FETCH CUSTOMER HTML
         * =================================================
         */

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


        /*
         * =================================================
         * PARSE HTML
         * =================================================
         */

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


        /*
         * REMOVE SCRIPTS
         *
         * create-customer.js is loaded separately.
         */

        doc
            .querySelectorAll(
                "script"
            )
            .forEach(
                function(script) {

                    script.remove();

                }
            );


        /*
         * REMOVE LINK TAGS
         *
         * CSS is loaded separately.
         */

        doc
            .querySelectorAll(
                "link"
            )
            .forEach(
                function(link) {

                    link.remove();

                }
            );


        /*
         * =================================================
         * INJECT CUSTOMER BODY
         * =================================================
         */

        container.innerHTML =
            doc.body.innerHTML;


        /*
         * VERIFY FORM EXISTS
         */

        const customerForm =
            document.getElementById(
                "customerForm"
            );


        if (!customerForm) {

            throw new Error(
                "Customer form was not found after loading HTML."
            );

        }


        /*
         * =================================================
         * LOAD CUSTOMER JS
         * =================================================
         */

        await loadCustomerJS();


        customerModuleLoaded =
            true;


        /*
         * =================================================
         * INITIALIZE CUSTOMER MODULE
         * =================================================
         */

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


        /*
         * =================================================
         * BIND EVENTS
         * =================================================
         */

        bindCustomerModuleEvents();


        /*
         * =================================================
         * SCROLL
         * =================================================
         */

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


    /*
     * HIDE CUSTOMER
     */

    if (customerArea) {

        customerArea.style.display =
            "none";

    }


    /*
     * HIDE DETAILS
     */

    if (detailsPage) {

        detailsPage.style.display =
            "none";

    }


    /*
     * SHOW SALES ORDER LIST
     */

    if (listView) {

        listView.style.display =
            "block";

    }


    /*
     * REFRESH CUSTOMER DATA
     */

    refreshCustomerDataAfterSave();


    /*
     * RESET CUSTOMER MODULE STATE
     */

    customerModuleLoaded =
        false;


    /*
     * SCROLL TO SALES ORDER
     */

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


                /*
                 * Keep the success panel visible.
                 *
                 * User can click DONE.
                 */

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

            /*
             * Already loaded
             */

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

    /*
     * If Create Sales Order customer loader exists,
     * refresh it.
     */

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
   OPEN SO DETAILS
========================================================= */

async function openSODetails(
    soNumber
) {

    const cacheKey =
        String(
            soNumber
        );


    showSODetailsLoading();


    const result =
        await salesOrderAPI(
            "getSalesOrder",
            {
                soNumber:
                    soNumber
            }
        );


    console.log(
        "GET SO DETAILS RESULT:",
        result
    );


    if (
        !result ||
        !result.success ||
        !result.so
    ) {

        alert(
            result?.message ||
            "Hindi ma-load ang Sales Order."
        );


        closeSODetails();

        return;

    }


    currentSO =
        result.so;


    selectedSO =
        result.so;


    soDetailsCache[
        cacheKey
    ] =
        result.so;


    updateSOSelectionUI();


    showSODetailsPage(
        result.so
    );

}


/* =========================================================
   SHOW DETAILS LOADING
========================================================= */

function showSODetailsLoading() {

    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    if (listView) {

        listView.style.display =
            "none";

    }


    if (detailsPage) {

        detailsPage.style.display =
            "block";


        const itemsBody =
            document.getElementById(
                "soDetailsItemsBody"
            );


        if (itemsBody) {

            itemsBody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        style="
                            text-align:center;
                            padding:30px;
                        "
                    >

                        Loading Sales Order...

                    </td>

                </tr>

            `;

        }

    }

}


/* =========================================================
   SHOW DETAILS PAGE
========================================================= */

function showSODetailsPage(
    so
) {

    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    if (listView) {

        listView.style.display =
            "none";

    }


    if (detailsPage) {

        detailsPage.style.display =
            "block";

    }


    renderSODetails(
        so
    );


    loadSOFiles(
        so.soNumber
    );


    setDetailsEditMode(
        false
    );

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
        Array.isArray(
            so.items
        )
            ? so.items
            : []
    );


    setText(
        "detailSubtotal",
        formatMoney(
            so.subtotal
        )
    );


    setValue(
        "detailDiscount",
        so.discount || 0
    );


    const vatableCheckbox =
        document.getElementById(
            "detailVatable"
        );


    if (vatableCheckbox) {

        vatableCheckbox.checked =
            Boolean(
                so.vatable
            );

    }


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
   DETAIL ITEMS
========================================================= */

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


    tbody.innerHTML =
        "";


    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="100%"
                    style="text-align:center;"
                >

                    No items.

                </td>

            </tr>

        `;

        return;

    }


    items.forEach(
        function(item, index) {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>

                    <input
                        type="text"
                        class="so-detail-item-name"
                        value="${escapeAttribute(
                            item.itemName || ""
                        )}"
                        disabled
                    >

                </td>


                <td>

                    <input
                        type="text"
                        class="so-detail-description"
                        value="${escapeAttribute(
                            item.description || ""
                        )}"
                        disabled
                    >

                </td>


                <td>

                    <input
                        type="number"
                        class="so-detail-qty"
                        value="${Number(
                            item.qty || 0
                        )}"
                        disabled
                        oninput="calculateDetailTotals()"
                    >

                </td>


                <td>

                    <input
                        type="text"
                        class="so-detail-unit"
                        value="${escapeAttribute(
                            item.unit || ""
                        )}"
                        disabled
                    >

                </td>


                <td>

                    <input
                        type="number"
                        class="so-detail-amount"
                        value="${Number(
                            item.amount || 0
                        )}"
                        disabled
                        oninput="calculateDetailTotals()"
                    >

                </td>


                <td class="so-detail-total">

                    ${formatMoney(
                        item.total
                    )}

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
   ENABLE SO UPDATE
========================================================= */

function enableSOUpdate() {

    setDetailsEditMode(
        true
    );

}


/* =========================================================
   SET DETAIL EDIT MODE
========================================================= */

function setDetailsEditMode(
    enabled
) {

    soDetailsEditMode =
        Boolean(
            enabled
        );


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

            if (
                input.id ===
                "detailSONumber"
            ) {

                input.disabled =
                    true;

                return;

            }


            if (
                input.id ===
                "detailSOFileInput"
            ) {

                input.disabled =
                    false;

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


    const addFileButton =
        document.getElementById(
            "detailAddFileButton"
        );


    if (addFileButton) {

        addFileButton.style.display =
            "inline-block";

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
        document.createElement(
            "tr"
        );


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

function deleteDetailItem(
    button
) {

    if (!soDetailsEditMode) {
        return;
    }


    const row =
        button.closest(
            "tr"
        );


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


    tbody
        .querySelectorAll(
            "tr"
        )
        .forEach(
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


    let subtotal =
        0;


    tbody
        .querySelectorAll(
            "tr"
        )
        .forEach(
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
                    qty *
                    amount;


                subtotal +=
                    total;


                if (totalCell) {

                    totalCell.textContent =
                        formatMoney(
                            total
                        );

                }

            }
        );


    const discountInput =
        document.getElementById(
            "detailDiscount"
        );


    const discount =
        Number(
            discountInput
                ? discountInput.value || 0
                : 0
        );


    if (
        discount >
        subtotal
    ) {

        alert(
            "Discount cannot be greater than subtotal."
        );

        return;

    }


    const vatable =
        subtotal -
        discount;


    const vatAmount =
        vatable *
        0.12;


    const grandTotal =
        vatable +
        vatAmount;


    setText(
        "detailSubtotal",
        formatMoney(
            subtotal
        )
    );


    setText(
        "detailVAT",
        formatMoney(
            vatAmount
        )
    );


    setText(
        "detailGrandTotal",
        formatMoney(
            grandTotal
        )
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


    let subtotal =
        0;


    items.forEach(
        function(item) {

            subtotal +=
                Number(
                    item.total || 0
                );

        }
    );


    const discount =
        Number(
            document.getElementById(
                "detailDiscount"
            )?.value || 0
        );


    if (
        discount >
        subtotal
    ) {

        alert(
            "Discount cannot be greater than subtotal."
        );

        return;

    }


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
        document.getElementById(
            "detailSaveButton"
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


    if (
        !result ||
        !result.success
    ) {

        alert(
            result?.message ||
            "Failed to update Sales Order."
        );

        return;

    }


    alert(
        "Sales Order updated successfully."
    );


    soDetailsEditMode =
        false;


    delete soDetailsCache[
        String(
            currentSO.soNumber
        )
    ];


    const updatedSONumber =
        currentSO.soNumber;


    salesOrdersLoaded =
        false;


    await loadSOList(
        true
    );


    await openSODetails(
        updatedSONumber
    );

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


    const items =
        [];


    tbody
        .querySelectorAll(
            "tr"
        )
        .forEach(
            function(row, index) {

                const itemNameInput =
                    row.querySelector(
                        ".so-detail-item-name"
                    );


                if (!itemNameInput) {
                    return;
                }


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
                        qty * amount

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
        getSOStatus(so) ===
        "CANCELLED"
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


    if (
        !result ||
        !result.success
    ) {

        alert(
            result?.message ||
            "Failed to cancel Sales Order."
        );

        return;

    }


    alert(
        "Sales Order cancelled successfully."
    );


    const cacheKey =
        String(
            so.soNumber
        );


    if (
        soDetailsCache[
            cacheKey
        ]
    ) {

        soDetailsCache[
            cacheKey
        ].status =
            "CANCELLED";

    }


    const listSO =
        salesOrders.find(
            function(item) {

                return (
                    String(
                        item.soNumber
                    ) ===
                    cacheKey
                );

            }
        );


    if (listSO) {

        listSO.status =
            "CANCELLED";

    }


    selectedSO =
        null;


    currentSO =
        null;


    updateSOSelectionUI();


    salesOrdersLoaded =
        false;


    await loadSOList(
        true
    );


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

    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    if (detailsPage) {

        detailsPage.style.display =
            "none";

    }


    if (listView) {

        listView.style.display =
            "block";

    }


    soDetailsEditMode =
        false;


    currentSO =
        null;


    updateSOSelectionUI();

}


/* =========================================================
   SO FILES
========================================================= */

function selectDetailSOFiles() {

    if (!currentSO) {

        alert(
            "Walang selected Sales Order."
        );

        return;

    }


    const input =
        document.getElementById(
            "detailSOFileInput"
        );


    if (input) {

        input.click();

    }

}


/* =========================================================
   HANDLE SO FILES
========================================================= */

async function handleDetailSOFiles(
    event
) {

    const files =
        event.target.files;


    if (
        !files ||
        files.length === 0
    ) {

        return;

    }


    if (!currentSO) {

        alert(
            "Walang selected Sales Order."
        );

        event.target.value =
            "";

        return;

    }


    for (
        let i = 0;
        i < files.length;
        i++
    ) {

        await uploadDetailSOFile(
            files[i]
        );

    }


    event.target.value =
        "";


    await loadSOFiles(
        currentSO.soNumber
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


    const isPDF =
        file.type ===
            "application/pdf" ||
        file.name
            .toLowerCase()
            .endsWith(".pdf");


    if (!isPDF) {

        alert(
            file.name +
            "\n\nPDF files only."
        );

        return;

    }


    if (
        file.size >
        SO_FILE_MAX_SIZE
    ) {

        alert(
            file.name +
            "\n\nFile is too large.\n" +
            "Maximum file size is 10 MB."
        );

        return;

    }


    const addButton =
        document.getElementById(
            "detailAddFileButton"
        );


    if (addButton) {

        addButton.disabled =
            true;

        addButton.textContent =
            "UPLOADING...";

    }


    try {

        const base64Data =
            await fileToBase64(
                file
            );


        const cleanBase64 =
            base64Data.includes(",")
                ? base64Data.split(",")[1]
                : base64Data;


        const uploadedBy =
            currentSO.createdBy ||
            localStorage.getItem(
                "loggedInUser"
            ) ||
            localStorage.getItem(
                "username"
            ) ||
            "LOGIS-TECH USER";


        const result =
            await salesOrderAPI(
                "uploadSOFile",
                {

                    soNumber:
                        currentSO.soNumber,

                    soId:
                        currentSO.soId ||
                        "",

                    fileName:
                        file.name,

                    mimeType:
                        file.type ||
                        "application/pdf",

                    base64Data:
                        cleanBase64,

                    uploadedBy:
                        uploadedBy,

                    dateCreation:
                        currentSO.dateCreation ||
                        ""

                }
            );


        if (
            !result ||
            !result.success
        ) {

            alert(
                result?.message ||
                "Failed to upload file."
            );

            return;

        }


        console.log(
            "SO FILE UPLOADED:",
            result
        );


    } catch (error) {

        console.error(
            "SO FILE UPLOAD ERROR:",
            error
        );


        alert(
            "Failed to upload " +
            file.name +
            ".\n\n" +
            error.message
        );


    } finally {

        if (addButton) {

            addButton.disabled =
                false;

            addButton.textContent =
                "+ ADD PDF";

        }

    }

}


/* =========================================================
   FILE BASE64
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

                    resolve(
                        reader.result
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
            "detailSOFileList"
        );


    if (!container) {
        return;
    }


    if (!soNumber) {

        container.innerHTML = `

            <div class="no-files">
                No Sales Order selected.
            </div>

        `;

        return;

    }


    container.innerHTML = `

        <div class="no-files">
            Loading files...
        </div>

    `;


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
        !result.success
    ) {

        container.innerHTML = `

            <div
                class="no-files"
                style="color:red;"
            >

                Failed to load files.

                <br>

                <small>

                    ${escapeHTML(
                        result?.message ||
                        "Unknown error."
                    )}

                </small>

            </div>

        `;

        return;

    }


    renderSOFiles(
        Array.isArray(
            result.files
        )
            ? result.files
            : []
    );

}


/* =========================================================
   RENDER SO FILES
========================================================= */

function renderSOFiles(
    files
) {

    const container =
        document.getElementById(
            "detailSOFileList"
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

            <div class="no-files">

                No PDF files attached.

            </div>

        `;

        return;

    }


    files.forEach(
        function(file) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "so-file-row";


            const fileName =
                file.fileName ||
                "Unnamed PDF";


            const fileType =
                file.fileType ||
                "PDF";


            const fileSize =
                formatFileSize(
                    file.fileSize
                );


            const uploadedBy =
                file.uploadedBy ||
                "-";


            const uploadedDate =
                formatSOFileDate(
                    file.uploadedDate
                );


            const fileUrl =
                file.fileUrl ||
                "";


            row.innerHTML = `

                <div class="so-file-info">

                    <div class="so-file-name">

                        📄

                        <strong>

                            ${escapeHTML(
                                fileName
                            )}

                        </strong>

                    </div>


                    <div class="so-file-meta">

                        ${escapeHTML(
                            fileType
                        )}

                        •

                        ${escapeHTML(
                            fileSize
                        )}

                        •

                        Uploaded by:

                        ${escapeHTML(
                            uploadedBy
                        )}

                        •

                        ${escapeHTML(
                            uploadedDate
                        )}

                    </div>

                </div>


                <div class="so-file-actions">

                    <button
                        type="button"
                        class="btn btn-secondary"
                        onclick='viewSOFile(${JSON.stringify(
                            fileUrl
                        )})'
                    >

                        VIEW

                    </button>


                    <button
                        type="button"
                        class="btn btn-danger"
                        onclick='deleteSOFile(
                            ${JSON.stringify(
                                file.fileId
                            )},
                            ${JSON.stringify(
                                fileName
                            )}
                        )'
                    >

                        DELETE

                    </button>

                </div>

            `;


            container.appendChild(
                row
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

    if (!fileUrl) {

        alert(
            "File URL is not available."
        );

        return;

    }


    window.open(
        fileUrl,
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
            "Invalid file ID."
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
        !result.success
    ) {

        alert(
            result?.message ||
            "Failed to delete file."
        );

        return;

    }


    alert(
        "File deleted successfully."
    );


    if (currentSO) {

        await loadSOFiles(
            currentSO.soNumber
        );

    }

}


/* =========================================================
   FILE SIZE
========================================================= */

function formatFileSize(
    bytes
) {

    const size =
        Number(
            bytes || 0
        );


    if (size <= 0) {
        return "0 KB";
    }


    if (size < 1024) {

        return (
            size +
            " B"
        );

    }


    if (
        size <
        1024 * 1024
    ) {

        return (
            (size / 1024)
                .toFixed(1) +
            " KB"
        );

    }


    return (
        (size / (1024 * 1024))
            .toFixed(2) +
        " MB"
    );

}


/* =========================================================
   SO FILE DATE
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
   EMAIL SALES ORDER
========================================================= */

async function emailSelectedSO() {

    const so =
        currentSO ||
        selectedSO;


    if (!so) {

        alert(
            "Walang selected Sales Order."
        );

        return;

    }


    const recipient =
        prompt(
            "Enter recipient email address:"
        );


    if (recipient === null) {
        return;
    }


    const email =
        recipient.trim();


    if (!email) {

        alert(
            "Kailangan ng recipient email address."
        );

        return;

    }


    try {

        alert(
            "Creating Gmail draft...\n\nPlease wait."
        );


        const result =
            await salesOrderAPI(
                "emailSalesOrder",
                {

                    soNumber:
                        so.soNumber,

                    clientName:
                        so.clientName,

                    project:
                        so.project,

                    recipient:
                        email

                }
            );


        if (
            !result ||
            !result.success
        ) {

            alert(
                "Hindi nagawa ang Gmail draft.\n\n" +
                (
                    result?.message ||
                    "Unknown error."
                )
            );

            return;

        }


        alert(
            "GMAIL DRAFT CREATED SUCCESSFULLY!\n\n" +

            "Recipient:\n" +
            email +

            "\n\nSubject:\n" +
            result.subject +

            "\n\nPDF Attached:\n" +
            result.fileName +

            "\n\nBuksan ang Gmail → Drafts."
        );


    } catch (error) {

        console.error(
            "EMAIL SO ERROR:",
            error
        );


        alert(
            "Nagkaroon ng error.\n\n" +
            error.message
        );

    }

}


/* =========================================================
   GENERIC VALUE READER
========================================================= */

function getSOValue(
    object,
    ...keys
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
            Object.prototype.hasOwnProperty.call(
                object,
                key
            )
        ) {

            const value =
                object[key];


            if (
                value !== null &&
                value !== undefined
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
        value == null
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


    return String(
        element.value || ""
    ).trim();

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
        value == null
            ? ""
            : value;

}


/* =========================================================
   MONEY
========================================================= */

function formatMoney(
    value
) {

    const number =
        Number(
            value || 0
        );


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
   HTML ESCAPE
========================================================= */

function escapeHTML(
    value
) {

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


/* =========================================================
   ATTRIBUTE ESCAPE
========================================================= */

function escapeAttribute(
    value
) {

    return escapeHTML(
        value
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
   INITIALIZE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "================================="
        );

        console.log(
            "LOGIS-TECH SALES ORDER MODULE LOADED"
        );

        console.log(
            "Google Sheets / Apps Script Database"
        );

        console.log(
            "================================="
        );

    }
);
