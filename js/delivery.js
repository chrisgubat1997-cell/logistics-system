/* =========================================================
   LOGIS-TECH SYSTEM
   DELIVERY MODULE
   =========================================================
   PURPOSE:
   - Display Posted Sales Orders
   - Open Create Delivery Receipt
   - Display Recent DRs
   - Search / Refresh
   - Summary Cards
   - Select DR
   - Preview / Update / Cancel / Post DR
   - LOCALSTORAGE VERSION
   ========================================================= */

"use strict";

/* =========================================================
   STORAGE KEYS
   ========================================================= */

const DELIVERY_STORAGE = {
    SALES_ORDERS: "logitechSalesOrders",
    DELIVERY_RECEIPTS: "logitechDeliveryReceipts"
};


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let salesOrders = [];
let deliveryReceipts = [];

let filteredSalesOrders = [];
let filteredDeliveryReceipts = [];

let selectedSO = null;
let selectedDR = null;


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("LOGIS-TECH DELIVERY MODULE LOADED");

    initializeDeliveryModule();

});


/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeDeliveryModule() {

    loadLocalStorageData();

    setupEventListeners();

    renderAll();

}


/* =========================================================
   LOAD LOCAL STORAGE
   ========================================================= */

function loadLocalStorageData() {

    try {

        const storedSO =
            localStorage.getItem(DELIVERY_STORAGE.SALES_ORDERS);

        const storedDR =
            localStorage.getItem(DELIVERY_STORAGE.DELIVERY_RECEIPTS);


        salesOrders = storedSO
            ? JSON.parse(storedSO)
            : [];


        deliveryReceipts = storedDR
            ? JSON.parse(storedDR)
            : [];


        if (!Array.isArray(salesOrders)) {
            salesOrders = [];
        }

        if (!Array.isArray(deliveryReceipts)) {
            deliveryReceipts = [];
        }


        console.log(
            "Sales Orders:",
            salesOrders
        );

        console.log(
            "Delivery Receipts:",
            deliveryReceipts
        );

    } catch (error) {

        console.error(
            "Error loading Delivery localStorage:",
            error
        );

        salesOrders = [];
        deliveryReceipts = [];

    }

}


/* =========================================================
   SAVE STORAGE
   ========================================================= */

function saveSalesOrders() {

    localStorage.setItem(
        DELIVERY_STORAGE.SALES_ORDERS,
        JSON.stringify(salesOrders)
    );

}


function saveDeliveryReceipts() {

    localStorage.setItem(
        DELIVERY_STORAGE.DELIVERY_RECEIPTS,
        JSON.stringify(deliveryReceipts)
    );

}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    /* -----------------------------------------------------
       PREPARE DR BUTTONS
       ----------------------------------------------------- */

    document.querySelectorAll(
        "[data-action='prepare-dr'], .prepare-dr-btn"
    ).forEach(function (button) {

        button.addEventListener("click", function () {

            openCreateDeliveryReceipt();

        });

    });


    /* -----------------------------------------------------
       SEARCH
       ----------------------------------------------------- */

    const searchInput =
        document.getElementById("deliverySearch");


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                filterDeliveryData(
                    this.value
                );

            }
        );

    }


    /* -----------------------------------------------------
       REFRESH
       ----------------------------------------------------- */

    const refreshButton =
        document.getElementById("deliveryRefreshBtn");


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            function () {

                refreshDeliveryModule();

            }
        );

    }


    /* -----------------------------------------------------
       FILTER
       ----------------------------------------------------- */

    const statusFilter =
        document.getElementById("deliveryStatusFilter");


    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            function () {

                applyDeliveryFilters();

            }
        );

    }


    /* -----------------------------------------------------
       DATE FILTER
       ----------------------------------------------------- */

    const dateFilter =
        document.getElementById("deliveryDateFilter");


    if (dateFilter) {

        dateFilter.addEventListener(
            "change",
            function () {

                applyDeliveryFilters();

            }
        );

    }


    /* -----------------------------------------------------
       CLOSE MODALS
       ----------------------------------------------------- */

    document.querySelectorAll(
        "[data-close-modal]"
    ).forEach(function (button) {

        button.addEventListener(
            "click",
            closeModal
        );

    });


    /* -----------------------------------------------------
       ESC KEY
       ----------------------------------------------------- */

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Escape") {

                closeModal();

            }

        }
    );

}


/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderAll() {

    updateSummaryCards();

    renderPostedSalesOrders();

    renderRecentDeliveryReceipts();

    applyDeliveryFilters();

}


/* =========================================================
   OPEN CREATE DR PAGE
   ========================================================= */

function openCreateDeliveryReceipt() {

    /*
       create-delivery-receipt.html is assumed to be
       inside the same /pages/ folder as delivery.html.
    */

    window.location.href =
        "create-delivery-receipt.html";

}


/* =========================================================
   SUMMARY CARDS
   ========================================================= */

function updateSummaryCards() {

    const totalDR =
        deliveryReceipts.filter(function (dr) {

            return dr.status !== "CANCELLED";

        }).length;


    const today =
        formatDateForCompare(
            new Date()
        );


    const todaysDR =
        deliveryReceipts.filter(function (dr) {

            if (dr.status === "CANCELLED") {
                return false;
            }

            const date =
                dr.dateOfTransfer ||
                dr.transferDate ||
                dr.createdAt;

            return formatDateForCompare(date) === today;

        }).length;


    const ongoingDR =
        deliveryReceipts.filter(function (dr) {

            return [
                "POSTED",
                "ONGOING",
                "PREPARED"
            ].includes(
                String(dr.status || "").toUpperCase()
            );

        }).length;


    const cancelledDR =
        deliveryReceipts.filter(function (dr) {

            return String(
                dr.status || ""
            ).toUpperCase() === "CANCELLED";

        }).length;


    setElementText(
        [
            "totalDeliveryReceipt",
            "totalDR",
            "deliveryTotalDR"
        ],
        totalDR
    );


    setElementText(
        [
            "todayDeliveryReceipt",
            "todayDR",
            "deliveryTodayDR"
        ],
        todaysDR
    );


    setElementText(
        [
            "ongoingDelivery",
            "ongoingDR",
            "deliveryOngoingDR"
        ],
        ongoingDR
    );


    setElementText(
        [
            "cancelledDelivery",
            "cancelledDR",
            "deliveryCancelledDR"
        ],
        cancelledDR
    );

}


/* =========================================================
   SET ELEMENT TEXT
   ========================================================= */

function setElementText(
    ids,
    value
) {

    ids.forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {

            element.textContent = value;

        }

    });

}


/* =========================================================
   POSTED SALES ORDERS
   ========================================================= */

function renderPostedSalesOrders() {

    const container =
        document.getElementById(
            "postedSalesOrdersBody"
        ) ||
        document.querySelector(
            "#postedSalesOrdersTable tbody"
        );


    if (!container) {

        console.warn(
            "Posted Sales Orders container not found."
        );

        return;

    }


    filteredSalesOrders =
        salesOrders.filter(function (so) {

            const status =
                String(
                    so.status || ""
                ).toUpperCase();


            /*
               Only POSTED and PARTIAL SOs
               are allowed for Delivery.
            */

            if (
                status !== "POSTED" &&
                status !== "PARTIAL"
            ) {

                return false;

            }


            return getSORemainingTotal(so) > 0;

        });


    if (
        filteredSalesOrders.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-content">
                        <div class="empty-state-icon">📦</div>
                        <h3>No Posted Sales Orders</h3>
                        <p>
                            Posted Sales Orders available
                            for delivery will appear here.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    container.innerHTML =
        filteredSalesOrders
            .map(function (so) {

                return createSalesOrderRow(so);

            })
            .join("");


    attachSalesOrderRowEvents();

}


/* =========================================================
   CREATE SO ROW
   ========================================================= */

function createSalesOrderRow(so) {

    const remaining =
        getSORemainingTotal(so);


    const amount =
        Number(
            so.totalAmount ||
            so.amount ||
            0
        );


    const status =
        String(
            so.status || "POSTED"
        ).toUpperCase();


    return `
        <tr
            class="delivery-so-row"
            data-so-number="${escapeHTML(
                so.soNumber || so.number || ""
            )}"
        >

            <td>
                <strong>
                    ${escapeHTML(
                        so.soNumber ||
                        so.number ||
                        "-"
                    )}
                </strong>
            </td>

            <td>
                ${escapeHTML(
                    so.clientName ||
                    so.client ||
                    "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    so.poNumber ||
                    so.po ||
                    "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    so.project ||
                    "-"
                )}
            </td>

            <td>
                <div class="delivery-address-cell">
                    ${escapeHTML(
                        so.deliveryAddress ||
                        so.address ||
                        "-"
                    )}
                </div>
            </td>

            <td>
                ₱${formatNumber(amount)}
            </td>

            <td>
                <span class="dr-status-badge ${getStatusClass(status)}">
                    ${escapeHTML(status)}
                </span>
            </td>

            <td>
                <button
                    type="button"
                    class="dr-btn dr-btn-primary dr-btn-small"
                    data-so-action="prepare"
                    data-so-number="${escapeHTML(
                        so.soNumber ||
                        so.number ||
                        ""
                    )}"
                >
                    + PREPARE
                </button>
            </td>

        </tr>
    `;

}


/* =========================================================
   ATTACH SO ROW EVENTS
   ========================================================= */

function attachSalesOrderRowEvents() {

    document.querySelectorAll(
        "[data-so-action='prepare']"
    ).forEach(function (button) {

        button.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                const soNumber =
                    this.dataset.soNumber;

                openCreateDeliveryReceiptWithSO(
                    soNumber
                );

            }
        );

    });


    document.querySelectorAll(
        ".delivery-so-row"
    ).forEach(function (row) {

        row.addEventListener(
            "click",
            function () {

                selectSalesOrder(
                    this.dataset.soNumber
                );

            }
        );

    });

}


/* =========================================================
   OPEN CREATE DR WITH SELECTED SO
   ========================================================= */

function openCreateDeliveryReceiptWithSO(
    soNumber
) {

    /*
       Pass SO number through URL.
       create-delivery-receipt.html can read:

       new URLSearchParams(
           window.location.search
       ).get("so")
    */

    const url =
        "create-delivery-receipt.html?so=" +
        encodeURIComponent(soNumber);


    window.location.href = url;

}


/* =========================================================
   SELECT SO
   ========================================================= */

function selectSalesOrder(
    soNumber
) {

    selectedSO =
        salesOrders.find(function (so) {

            return (
                (so.soNumber || so.number) ===
                soNumber
            );

        });


    document
        .querySelectorAll(".delivery-so-row")
        .forEach(function (row) {

            row.classList.remove(
                "selected"
            );

        });


    const selectedRow =
        document.querySelector(
            `[data-so-number="${CSS.escape(soNumber)}"]`
        );


    if (selectedRow) {

        selectedRow.classList.add(
            "selected"
        );

    }

}


/* =========================================================
   RECENT DELIVERY RECEIPTS
   ========================================================= */

function renderRecentDeliveryReceipts() {

    const container =
        document.getElementById(
            "recentDRBody"
        ) ||
        document.querySelector(
            "#recentDRTable tbody"
        );


    if (!container) {

        console.warn(
            "Recent DR container not found."
        );

        return;

    }


    filteredDeliveryReceipts =
        [...deliveryReceipts]
            .sort(function (a, b) {

                return getTimestamp(b) -
                       getTimestamp(a);

            });


    if (
        filteredDeliveryReceipts.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    <div class="empty-state-content">
                        <div class="empty-state-icon">📄</div>
                        <h3>No Delivery Receipts Yet</h3>
                        <p>
                            Prepared Delivery Receipts
                            will appear here.
                        </p>
                    </div>
                </td>
            </tr>
        `;

        return;

    }


    container.innerHTML =
        filteredDeliveryReceipts
            .map(function (dr) {

                return createDRRow(dr);

            })
            .join("");


    attachDREvents();

}


/* =========================================================
   CREATE DR ROW
   ========================================================= */

function createDRRow(dr) {

    const status =
        String(
            dr.status ||
            "PREPARED"
        ).toUpperCase();


    const items =
        Array.isArray(dr.items)
            ? dr.items
            : [];


    const totalQty =
        items.reduce(
            function (total, item) {

                return total +
                    Number(
                        item.quantity ||
                        item.drQty ||
                        item.qty ||
                        0
                    );

            },
            0
        );


    return `
        <tr
            class="delivery-dr-row"
            data-dr-number="${escapeHTML(
                dr.drNumber || ""
            )}"
        >

            <td>
                <strong>
                    ${escapeHTML(
                        dr.drNumber || "-"
                    )}
                </strong>
            </td>

            <td>
                ${escapeHTML(
                    dr.soNumber || "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    dr.clientName ||
                    dr.client ||
                    "-"
                )}
            </td>

            <td>
                ${escapeHTML(
                    formatDisplayDate(
                        dr.dateOfTransfer ||
                        dr.transferDate
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    dr.deliveryAddress ||
                    "-"
                )}
            </td>

            <td>
                ${items.length}
            </td>

            <td>
                ${formatNumber(totalQty)}
            </td>

            <td>
                <span class="dr-status-badge ${getStatusClass(status)}">
                    ${escapeHTML(status)}
                </span>
            </td>

        </tr>
    `;

}


/* =========================================================
   DR EVENTS
   ========================================================= */

function attachDREvents() {

    document.querySelectorAll(
        ".delivery-dr-row"
    ).forEach(function (row) {

        row.addEventListener(
            "click",
            function () {

                selectDeliveryReceipt(
                    this.dataset.drNumber
                );

            }
        );

    });


    /*
       Optional action buttons if your
       HTML already has them.
    */

    document.querySelectorAll(
        "[data-dr-action='preview']"
    ).forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                previewDeliveryReceipt(
                    this.dataset.drNumber
                );

            }
        );

    });


    document.querySelectorAll(
        "[data-dr-action='update']"
    ).forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                updateDeliveryReceipt(
                    this.dataset.drNumber
                );

            }
        );

    });


    document.querySelectorAll(
        "[data-dr-action='cancel']"
    ).forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                cancelDeliveryReceipt(
                    this.dataset.drNumber
                );

            }
        );

    });


    document.querySelectorAll(
        "[data-dr-action='post']"
    ).forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                postDeliveryReceipt(
                    this.dataset.drNumber
                );

            }
        );

    });

}


/* =========================================================
   SELECT DELIVERY RECEIPT
   ========================================================= */

function selectDeliveryReceipt(
    drNumber
) {

    selectedDR =
        deliveryReceipts.find(
            function (dr) {

                return dr.drNumber ===
                    drNumber;

            }
        );


    document
        .querySelectorAll(".delivery-dr-row")
        .forEach(function (row) {

            row.classList.remove(
                "selected"
            );

        });


    const selectedRow =
        document.querySelector(
            `[data-dr-number="${CSS.escape(drNumber)}"]`
        );


    if (selectedRow) {

        selectedRow.classList.add(
            "selected"
        );

    }


    updateDRSelectionBar();

}


/* =========================================================
   UPDATE DR SELECTION BAR
   ========================================================= */

function updateDRSelectionBar() {

    const bar =
        document.querySelector(
            ".dr-selection-bar"
        );


    if (!bar) {
        return;
    }


    if (!selectedDR) {

        bar.classList.remove(
            "active"
        );

        bar.style.display =
            "none";

        return;

    }


    bar.style.display =
        "flex";


    bar.classList.add(
        "active"
    );


    setElementText(
        [
            "selectedDRNumber",
            "selectionDRNumber"
        ],
        selectedDR.drNumber || "-"
    );


    setElementText(
        [
            "selectedSO",
            "selectionSONumber"
        ],
        selectedDR.soNumber || "-"
    );


}


/* =========================================================
   FILTER
   ========================================================= */

function filterDeliveryData(
    searchValue
) {

    applyDeliveryFilters(
        searchValue
    );

}


/* =========================================================
   APPLY FILTERS
   ========================================================= */

function applyDeliveryFilters(
    searchValue
) {

    const searchInput =
        document.getElementById(
            "deliverySearch"
        );


    const statusFilter =
        document.getElementById(
            "deliveryStatusFilter"
        );


    const dateFilter =
        document.getElementById(
            "deliveryDateFilter"
        );


    const search =
        String(
            searchValue !== undefined
                ? searchValue
                : searchInput
                    ? searchInput.value
                    : ""
        )
            .trim()
            .toLowerCase();


    const status =
        statusFilter
            ? String(
                statusFilter.value || ""
            ).toUpperCase()
            : "";


    const date =
        dateFilter
            ? dateFilter.value
            : "";


    /* -----------------------------------------------------
       SO FILTER
       ----------------------------------------------------- */

    filteredSalesOrders =
        salesOrders.filter(function (so) {

            const soStatus =
                String(
                    so.status || ""
                ).toUpperCase();


            if (
                soStatus !== "POSTED" &&
                soStatus !== "PARTIAL"
            ) {

                return false;

            }


            if (
                getSORemainingTotal(so) <= 0
            ) {

                return false;

            }


            const searchable = [

                so.soNumber,
                so.number,
                so.clientName,
                so.client,
                so.project,
                so.poNumber,
                so.po

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            return searchable.includes(
                search
            );

        });


    /* -----------------------------------------------------
       DR FILTER
       ----------------------------------------------------- */

    filteredDeliveryReceipts =
        deliveryReceipts.filter(
            function (dr) {

                const drStatus =
                    String(
                        dr.status || ""
                    ).toUpperCase();


                if (
                    status &&
                    drStatus !== status
                ) {

                    return false;

                }


                const searchable = [

                    dr.drNumber,
                    dr.soNumber,
                    dr.clientName,
                    dr.client,
                    dr.deliveryAddress

                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                if (
                    search &&
                    !searchable.includes(search)
                ) {

                    return false;

                }


                if (date) {

                    const drDate =
                        normalizeDateValue(
                            dr.dateOfTransfer ||
                            dr.transferDate ||
                            dr.createdAt
                        );


                    if (
                        drDate !== date
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    renderFilteredSOList();

    renderFilteredDRList();

}


/* =========================================================
   RENDER FILTERED SO LIST
   ========================================================= */

function renderFilteredSOList() {

    const container =
        document.getElementById(
            "postedSalesOrdersBody"
        ) ||
        document.querySelector(
            "#postedSalesOrdersTable tbody"
        );


    if (!container) {
        return;
    }


    if (
        filteredSalesOrders.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No Sales Order found.
                </td>
            </tr>
        `;

        return;

    }


    container.innerHTML =
        filteredSalesOrders
            .map(createSalesOrderRow)
            .join("");


    attachSalesOrderRowEvents();

}


/* =========================================================
   RENDER FILTERED DR LIST
   ========================================================= */

function renderFilteredDRList() {

    const container =
        document.getElementById(
            "recentDRBody"
        ) ||
        document.querySelector(
            "#recentDRTable tbody"
        );


    if (!container) {
        return;
    }


    if (
        filteredDeliveryReceipts.length === 0
    ) {

        container.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">
                    No Delivery Receipt found.
                </td>
            </tr>
        `;

        return;

    }


    container.innerHTML =
        filteredDeliveryReceipts
            .map(createDRRow)
            .join("");


    attachDREvents();

}


/* =========================================================
   REFRESH
   ========================================================= */

function refreshDeliveryModule() {

    const button =
        document.getElementById(
            "deliveryRefreshBtn"
        );


    if (button) {

        button.classList.add(
            "is-refreshing"
        );

    }


    setTimeout(
        function () {

            loadLocalStorageData();

            selectedSO = null;
            selectedDR = null;

            renderAll();


            if (button) {

                button.classList.remove(
                    "is-refreshing"
                );

            }

        },
        250
    );

}


/* =========================================================
   PREVIEW DR
   ========================================================= */

function previewDeliveryReceipt(
    drNumber
) {

    const dr =
        deliveryReceipts.find(
            function (item) {

                return item.drNumber ===
                    drNumber;

            }
        );


    if (!dr) {

        showNotification(
            "Delivery Receipt not found.",
            "error"
        );

        return;

    }


    selectedDR = dr;


    /*
       If create-delivery-receipt.html
       already has its own preview system,
       we can simply open the DR details page
       later.

       For now we use the existing preview modal
       if available.
    */

    const modal =
        document.getElementById(
            "drPreviewModal"
        );


    if (!modal) {

        showNotification(
            "Preview window is not available.",
            "warning"
        );

        return;

    }


    populateDRPreview(
        dr
    );


    modal.style.display =
        "flex";


    requestAnimationFrame(
        function () {

            modal.classList.add(
                "show"
            );

        }
    );

}


/* =========================================================
   POPULATE DR PREVIEW
   ========================================================= */

function populateDRPreview(
    dr
) {

    setElementText(
        [
            "previewDRNumber"
        ],
        dr.drNumber || "-"
    );


    setElementText(
        [
            "previewSONumber"
        ],
        dr.soNumber || "-"
    );


    setElementText(
        [
            "previewClientName"
        ],
        dr.clientName ||
        dr.client ||
        "-"
    );


    setElementText(
        [
            "previewTransferDate"
        ],
        formatDisplayDate(
            dr.dateOfTransfer ||
            dr.transferDate
        )
    );


    setElementText(
        [
            "previewDeliveryAddress"
        ],
        dr.deliveryAddress ||
        "-"
    );


    const itemsContainer =
        document.getElementById(
            "previewDRItems"
        );


    if (
        !itemsContainer
    ) {

        return;

    }


    const items =
        Array.isArray(dr.items)
            ? dr.items
            : [];


    itemsContainer.innerHTML =
        items
            .map(function (item) {

                return `
                    <tr>

                        <td>
                            ${escapeHTML(
                                item.description ||
                                item.drDescription ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${escapeHTML(
                                item.unit ||
                                ""
                            )}
                        </td>

                        <td>
                            ${formatNumber(
                                item.quantity ||
                                item.drQty ||
                                item.qty ||
                                0
                            )}
                        </td>

                    </tr>
                `;

            })
            .join("");

}


/* =========================================================
   UPDATE DR
   ========================================================= */

function updateDeliveryReceipt(
    drNumber
) {

    const dr =
        deliveryReceipts.find(
            function (item) {

                return item.drNumber ===
                    drNumber;

            }
        );


    if (!dr) {

        showNotification(
            "Delivery Receipt not found.",
            "error"
        );

        return;

    }


    /*
       For now, update returns to
       create-delivery-receipt.html
       with the DR number.

       Later we can create a dedicated
       edit mode.
    */

    window.location.href =
        "create-delivery-receipt.html?edit=" +
        encodeURIComponent(
            drNumber
        );

}


/* =========================================================
   CANCEL DR
   ========================================================= */

function cancelDeliveryReceipt(
    drNumber
) {

    const index =
        deliveryReceipts.findIndex(
            function (dr) {

                return dr.drNumber ===
                    drNumber;

            }
        );


    if (index === -1) {

        showNotification(
            "Delivery Receipt not found.",
            "error"
        );

        return;

    }


    const dr =
        deliveryReceipts[index];


    if (
        String(
            dr.status || ""
        ).toUpperCase() ===
        "CANCELLED"
    ) {

        showNotification(
            "This DR is already cancelled.",
            "warning"
        );

        return;

    }


    const confirmed =
        window.confirm(
            "Are you sure you want to cancel " +
            (dr.drNumber || "this DR") +
            "?"
        );


    if (!confirmed) {
        return;
    }


    dr.status =
        "CANCELLED";


    dr.cancelledAt =
        new Date().toISOString();


    const user =
        localStorage.getItem(
            "logitechUser"
        );


    dr.cancelledBy =
        user || "Current User";


    saveDeliveryReceipts();


    selectedDR = null;


    renderAll();


    showNotification(
        "Delivery Receipt cancelled successfully.",
        "success"
    );

}


/* =========================================================
   POST DR
   ========================================================= */

function postDeliveryReceipt(
    drNumber
) {

    const index =
        deliveryReceipts.findIndex(
            function (dr) {

                return dr.drNumber ===
                    drNumber;

            }
        );


    if (index === -1) {

        showNotification(
            "Delivery Receipt not found.",
            "error"
        );

        return;

    }


    const dr =
        deliveryReceipts[index];


    const currentStatus =
        String(
            dr.status || ""
        ).toUpperCase();


    if (
        currentStatus ===
        "CANCELLED"
    ) {

        showNotification(
            "Cancelled DR cannot be posted.",
            "error"
        );

        return;

    }


    if (
        currentStatus ===
        "POSTED"
    ) {

        showNotification(
            "This DR is already posted.",
            "warning"
        );

        return;

    }


    const confirmed =
        window.confirm(
            "Post " +
            (dr.drNumber || "this Delivery Receipt") +
            "?"
        );


    if (!confirmed) {
        return;
    }


    dr.status =
        "POSTED";


    dr.postedAt =
        new Date().toISOString();


    const user =
        localStorage.getItem(
            "logitechUser"
        );


    dr.postedBy =
        user || "Current User";


    saveDeliveryReceipts();


    selectedDR = dr;


    renderAll();


    showNotification(
        "Delivery Receipt posted successfully.",
        "success"
    );

}


/* =========================================================
   CLOSE MODAL
   ========================================================= */

function closeModal() {

    document
        .querySelectorAll(
            ".modal-overlay"
        )
        .forEach(function (modal) {

            modal.classList.remove(
                "show"
            );

            setTimeout(
                function () {

                    modal.style.display =
                        "none";

                },
                180
            );

        });

}


/* =========================================================
   SO REMAINING TOTAL
   ========================================================= */

function getSORemainingTotal(
    so
) {

    if (
        !so ||
        !Array.isArray(so.items)
    ) {

        return 0;

    }


    return so.items.reduce(
        function (total, item) {

            return total +
                getRemainingItemQty(
                    so,
                    item
                );

        },
        0
    );

}


/* =========================================================
   REMAINING ITEM QTY
   ========================================================= */

function getRemainingItemQty(
    so,
    item
) {

    const ordered =
        Number(
            item.quantity ||
            item.qty ||
            item.orderedQty ||
            0
        );


    const itemId =
        item.id ||
        item.itemId ||
        item.sourceItemId;


    const soNumber =
        so.soNumber ||
        so.number;


    const delivered =
        deliveryReceipts
            .filter(function (dr) {

                const status =
                    String(
                        dr.status || ""
                    ).toUpperCase();


                if (
                    status ===
                    "CANCELLED"
                ) {

                    return false;

                }


                const drSO =
                    dr.soNumber ||
                    dr.salesOrderNumber;


                if (
                    drSO !== soNumber
                ) {

                    return false;

                }


                return true;

            })
            .reduce(
                function (
                    total,
                    dr
                ) {

                    const items =
                        Array.isArray(
                            dr.items
                        )
                            ? dr.items
                            : [];


                    const itemDelivered =
                        items
                            .filter(
                                function (
                                    picked
                                ) {

                                    return (
                                        picked.sourceItemId ===
                                        itemId
                                    );

                                }
                            )
                            .reduce(
                                function (
                                    sum,
                                    picked
                                ) {

                                    return sum +
                                        Number(
                                            picked.quantity ||
                                            picked.drQty ||
                                            picked.qty ||
                                            0
                                        );

                                },
                                0
                            );


                    return total +
                        itemDelivered;

                },
                0
            );


    return Math.max(
        0,
        ordered - delivered
    );

}


/* =========================================================
   STATUS CLASS
   ========================================================= */

function getStatusClass(
    status
) {

    const normalized =
        String(
            status || ""
        ).toUpperCase();


    switch (
        normalized
    ) {

        case "POSTED":
            return "status-posted";

        case "PREPARED":
            return "status-prepared";

        case "ONGOING":
            return "status-ongoing";

        case "FOR INVOICE":
            return "status-invoice";

        case "COMPLETED":
            return "status-completed";

        case "PARTIAL":
            return "status-partial";

        case "CANCELLED":
            return "status-cancelled";

        case "UNPOSTED":
            return "status-unposted";

        default:
            return "status-default";

    }

}


/* =========================================================
   DATE HELPERS
   ========================================================= */

function formatDateForCompare(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(value)
            .substring(0, 10);

    }


    return [
        date.getFullYear(),
        String(
            date.getMonth() + 1
        ).padStart(2, "0"),
        String(
            date.getDate()
        ).padStart(2, "0")
    ].join("-");

}


function normalizeDateValue(
    value
) {

    return formatDateForCompare(
        value
    );

}


function formatDisplayDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

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


function getTimestamp(
    item
) {

    const value =
        item.createdAt ||
        item.dateOfTransfer ||
        item.transferDate ||
        item.updatedAt ||
        0;


    const timestamp =
        new Date(value).getTime();


    return Number.isNaN(timestamp)
        ? 0
        : timestamp;

}


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-PH",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    );

}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
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
   NOTIFICATION
   ========================================================= */

function showNotification(
    message,
    type = "info"
) {

    /*
       Use existing notification system
       if your Delivery HTML already has one.
    */

    const existing =
        document.querySelector(
            ".delivery-notification"
        );


    if (existing) {

        existing.textContent =
            message;

        existing.className =
            "delivery-notification " +
            "notification-" +
            type;

        existing.classList.add(
            "show"
        );


        setTimeout(
            function () {

                existing.classList.remove(
                    "show"
                );

            },
            3000
        );


        return;

    }


    /*
       Fallback notification
    */

    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        "delivery-notification " +
        "notification-" +
        type;


    notification.textContent =
        message;


    notification.style.cssText = `
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 99999;
        padding: 14px 18px;
        border-radius: 12px;
        background: #ffffff;
        color: #1e293b;
        box-shadow: 0 12px 35px rgba(15,23,42,.18);
        border: 1px solid #e2e8f0;
        font-size: 14px;
        font-weight: 600;
        animation: deliveryNotificationIn .25s ease;
    `;


    document.body.appendChild(
        notification
    );


    setTimeout(
        function () {

            notification.style.opacity =
                "0";

            notification.style.transform =
                "translateY(10px)";

            notification.style.transition =
                "all .2s ease";


            setTimeout(
                function () {

                    notification.remove();

                },
                250
            );

        },
        3000
    );

}


/* =========================================================
   GLOBAL FUNCTIONS
   =========================================================
   These are exposed so inline HTML buttons can use them.
   ========================================================= */

window.openCreateDeliveryReceipt =
    openCreateDeliveryReceipt;

window.openCreateDeliveryReceiptWithSO =
    openCreateDeliveryReceiptWithSO;

window.previewDeliveryReceipt =
    previewDeliveryReceipt;

window.updateDeliveryReceipt =
    updateDeliveryReceipt;

window.cancelDeliveryReceipt =
    cancelDeliveryReceipt;

window.postDeliveryReceipt =
    postDeliveryReceipt;

window.refreshDeliveryModule =
    refreshDeliveryModule;

window.filterDeliveryData =
    filterDeliveryData;

window.closeModal =
    closeModal;


/* =========================================================
   DEBUG HELPER
   ========================================================= */

window.deliveryDebug = {

    getSalesOrders: function () {
        return salesOrders;
    },

    getDeliveryReceipts: function () {
        return deliveryReceipts;
    },

    getSelectedSO: function () {
        return selectedSO;
    },

    getSelectedDR: function () {
        return selectedDR;
    },

    refresh: function () {
        refreshDeliveryModule();
    }

};


/* =========================================================
   END DELIVERY.JS
   ========================================================= */
