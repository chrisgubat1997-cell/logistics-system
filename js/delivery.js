/* =========================================================
   LOGIS-TECH SYSTEM
   DELIVERY / DR MODULE
   =========================================================
   MATCHED TO:
   delivery.html

   CURRENT MODE:
   LOCALSTORAGE ONLY

   STORAGE:
   - logitechSalesOrders
   - logitechDeliveryReceipts

   WORKFLOW:
   POSTED SO
      ↓
   PREPARE DR
      ↓
   PREPARED
      ↓
   POST DR
      ↓
   ONGOING
      ↓
   COMPLETED / FOR INVOICE
========================================================= */

"use strict";


/* =========================================================
   STORAGE KEYS
========================================================= */

const DELIVERY_STORAGE = {

    SALES_ORDERS:
        "logitechSalesOrders",

    DELIVERY_RECEIPTS:
        "logitechDeliveryReceipts"

};


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let salesOrders = [];

let deliveryReceipts = [];

let selectedDR = null;

let selectedSO = null;


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "LOGIS-TECH DELIVERY.JS LOADED"
        );

        initializeDeliveryModule();

    }
);


/* =========================================================
   INITIALIZE
========================================================= */

function initializeDeliveryModule() {

    loadData();

    updateSummaryCards();

    renderPostedSalesOrders();

    renderRecentDR();

    setupPrepareDRButtons();

    setupSearchAndFilters();

    setupDRSelection();

    setupActionButtons();

    setupViewButtons();

    setupQuantityInputs();

}


/* =========================================================
   LOAD LOCALSTORAGE
========================================================= */

function loadData() {

    try {

        const storedSO =
            localStorage.getItem(
                DELIVERY_STORAGE.SALES_ORDERS
            );


        const storedDR =
            localStorage.getItem(
                DELIVERY_STORAGE.DELIVERY_RECEIPTS
            );


        salesOrders =
            storedSO
                ? JSON.parse(storedSO)
                : [];


        deliveryReceipts =
            storedDR
                ? JSON.parse(storedDR)
                : [];


        if (
            !Array.isArray(
                salesOrders
            )
        ) {

            salesOrders = [];

        }


        if (
            !Array.isArray(
                deliveryReceipts
            )
        ) {

            deliveryReceipts = [];

        }


        console.log(
            "DELIVERY SO:",
            salesOrders
        );


        console.log(
            "DELIVERY DR:",
            deliveryReceipts
        );


    } catch (error) {

        console.error(
            "Failed to load Delivery data:",
            error
        );

        salesOrders = [];

        deliveryReceipts = [];

    }

}


/* =========================================================
   SAVE DATA
========================================================= */

function saveSalesOrders() {

    localStorage.setItem(
        DELIVERY_STORAGE.SALES_ORDERS,
        JSON.stringify(
            salesOrders
        )
    );

}


function saveDeliveryReceipts() {

    localStorage.setItem(
        DELIVERY_STORAGE.DELIVERY_RECEIPTS,
        JSON.stringify(
            deliveryReceipts
        )
    );

}


/* =========================================================
   PREPARE DR BUTTON
========================================================= */

function setupPrepareDRButtons() {

    const mainButton =
        document.getElementById(
            "prepareDRButton"
        );


    if (mainButton) {

        mainButton.addEventListener(
            "click",
            function () {

                openCreateDR();

            }
        );

    }


    /*
       Existing buttons inside
       Posted SO table.

       Since the original HTML has
       multiple:

       <button class="btn btn-primary btn-small">

       we detect them based on
       their position inside the
       Posted SO table.
    */

    const soTable =
        document.querySelector(
            ".posted-so-table"
        );


    if (!soTable) {
        return;
    }


    const rows =
        soTable.querySelectorAll(
            "tbody tr"
        );


    rows.forEach(
        function (row) {

            const button =
                row.querySelector(
                    "button"
                );


            if (!button) {
                return;
            }


            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    event.stopPropagation();


                    const soNumber =
                        getSONumberFromRow(
                            row
                        );


                    if (!soNumber) {

                        openCreateDR();

                        return;

                    }


                    openCreateDR(
                        soNumber
                    );

                }
            );

        }
    );

}


/* =========================================================
   GET SO NUMBER FROM TABLE ROW
========================================================= */

function getSONumberFromRow(
    row
) {

    if (!row) {
        return "";
    }


    const firstCell =
        row.querySelector(
            "td:first-child"
        );


    if (!firstCell) {
        return "";
    }


    return firstCell
        .textContent
        .trim();

}


/* =========================================================
   OPEN CREATE DR
========================================================= */

function openCreateDR(
    soNumber = ""
) {

    let url =
        "create-delivery-receipt.html";


    if (soNumber) {

        url +=
            "?so=" +
            encodeURIComponent(
                soNumber
            );

    }


    console.log(
        "Opening Create DR:",
        url
    );


    window.location.href =
        url;

}


/* =========================================================
   SUMMARY CARDS
========================================================= */

function updateSummaryCards() {

    const totalDR =
        deliveryReceipts.filter(
            function (dr) {

                return normalizeStatus(
                    dr.status
                ) !== "CANCELLED";

            }
        ).length;


    const today =
        getTodayString();


    const todayDR =
        deliveryReceipts.filter(
            function (dr) {

                const status =
                    normalizeStatus(
                        dr.status
                    );


                if (
                    status ===
                    "CANCELLED"
                ) {

                    return false;

                }


                const date =
                    getDRDate(
                        dr
                    );


                return (
                    normalizeDate(
                        date
                    ) ===
                    today
                );

            }
        ).length;


    const ongoingDR =
        deliveryReceipts.filter(
            function (dr) {

                return (
                    normalizeStatus(
                        dr.status
                    ) ===
                    "ONGOING"
                );

            }
        ).length;


    const cancelledDR =
        deliveryReceipts.filter(
            function (dr) {

                return (
                    normalizeStatus(
                        dr.status
                    ) ===
                    "CANCELLED"
                );

            }
        ).length;


    setText(
        "totalDRCount",
        totalDR
    );


    setText(
        "todayDRCount",
        todayDR
    );


    setText(
        "ongoingDRCount",
        ongoingDR
    );


    setText(
        "cancelledDRCount",
        cancelledDR
    );

}


/* =========================================================
   RENDER POSTED SALES ORDERS
========================================================= */

function renderPostedSalesOrders(
    search = "",
    filter = "ALL"
) {

    const table =
        document.querySelector(
            ".posted-so-table"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector(
            "tbody"
        );


    if (!tbody) {
        return;
    }


    const searchText =
        String(
            search || ""
        )
        .trim()
        .toLowerCase();


    const filtered =
        salesOrders.filter(
            function (so) {

                const status =
                    normalizeStatus(
                        so.status
                    );


                /*
                   Delivery only accepts
                   POSTED and PARTIAL.
                */

                if (
                    status !== "POSTED" &&
                    status !== "PARTIAL"
                ) {

                    return false;

                }


                /*
                   Hide fully delivered SO.
                */

                if (
                    getRemainingSOTotal(
                        so
                    ) <= 0
                ) {

                    return false;

                }


                /*
                   SO FILTER
                */

                if (
                    filter !== "ALL"
                ) {

                    if (
                        filter ===
                        "READY" &&
                        status !== "POSTED"
                    ) {

                        return false;

                    }


                    if (
                        filter ===
                        "PARTIAL" &&
                        status !== "PARTIAL"
                    ) {

                        return false;

                    }

                }


                /*
                   SEARCH
                */

                if (
                    searchText
                ) {

                    const searchable = [

                        so.soNumber,

                        so.number,

                        so.clientName,

                        so.client,

                        so.poNumber,

                        so.po,

                        so.project,

                        so.deliveryAddress

                    ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                    if (
                        !searchable.includes(
                            searchText
                        )
                    ) {

                        return false;

                    }

                }


                return true;

            }
        );


    /*
       If there are no localStorage SOs,
       preserve the original HTML rows.
    */

    if (
        salesOrders.length === 0
    ) {

        return;

    }


    if (
        filtered.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#64748b;
                    "
                >

                    No Posted Sales Order
                    available for delivery.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        filtered
            .map(
                createSORow
            )
            .join("");


    /*
       Reconnect PREPARE buttons
       after table rendering.
    */

    setupPrepareDRButtons();

}


/* =========================================================
   CREATE SO ROW
========================================================= */

function createSORow(
    so
) {

    const soNumber =
        so.soNumber ||
        so.number ||
        "-";


    const client =
        so.clientName ||
        so.client ||
        "-";


    const po =
        so.poNumber ||
        so.po ||
        "-";


    const project =
        so.project ||
        "-";


    const address =
        so.deliveryAddress ||
        so.address ||
        "-";


    const amount =
        Number(
            so.totalAmount ||
            so.amount ||
            0
        );


    const status =
        normalizeStatus(
            so.status
        );


    return `

        <tr>

            <td>

                <strong>
                    ${escapeHTML(
                        soNumber
                    )}
                </strong>

            </td>


            <td>
                ${escapeHTML(
                    client
                )}
            </td>


            <td>
                ${escapeHTML(
                    po
                )}
            </td>


            <td>
                ${escapeHTML(
                    project
                )}
            </td>


            <td>
                ${escapeHTML(
                    address
                )}
            </td>


            <td class="amount">

                ₱${formatMoney(
                    amount
                )}

            </td>


            <td>

                <span
                    class="status ${
                        getStatusClass(
                            status
                        )
                    }"
                >

                    ${escapeHTML(
                        status
                    )}

                </span>

            </td>


            <td>

                <button
                    type="button"
                    class="btn btn-primary btn-small"
                >

                    + PREPARE DR

                </button>

            </td>

        </tr>

    `;

}


/* =========================================================
   RENDER RECENT DR
========================================================= */

function renderRecentDR(
    search = "",
    filter = "ALL"
) {

    const table =
        document.querySelector(
            ".recent-dr-table"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector(
            "tbody"
        );


    if (!tbody) {
        return;
    }


    /*
       If no localStorage DR yet,
       keep sample HTML rows.
    */

    if (
        deliveryReceipts.length === 0
    ) {

        setupDRSelection();

        return;

    }


    const searchText =
        String(
            search || ""
        )
        .trim()
        .toLowerCase();


    const filtered =
        deliveryReceipts
            .filter(
                function (dr) {

                    const status =
                        normalizeStatus(
                            dr.status
                        );


                    /*
                       FILTER
                    */

                    if (
                        filter !== "ALL"
                    ) {

                        if (
                            normalizeFilterStatus(
                                filter
                            ) !== status
                        ) {

                            return false;

                        }

                    }


                    /*
                       SEARCH
                    */

                    if (
                        searchText
                    ) {

                        const searchable = [

                            dr.drNumber,

                            dr.soNumber,

                            dr.clientName,

                            dr.client,

                            dr.project

                        ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                        if (
                            !searchable.includes(
                                searchText
                            )
                        ) {

                            return false;

                        }

                    }


                    return true;

                }
            )
            .sort(
                function (a, b) {

                    return (
                        getTimestamp(b) -
                        getTimestamp(a)
                    );

                }
            );


    if (
        filtered.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    style="
                        text-align:center;
                        padding:40px;
                        color:#64748b;
                    "
                >

                    No Delivery Receipt found.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        filtered
            .map(
                createDRRow
            )
            .join("");


    setupDRSelection();

}


/* =========================================================
   CREATE DR ROW
========================================================= */

function createDRRow(
    dr
) {

    const drNumber =
        dr.drNumber ||
        "-";


    const drDate =
        getDRDate(
            dr
        );


    const soNumber =
        dr.soNumber ||
        "-";


    const client =
        dr.clientName ||
        dr.client ||
        "-";


    const project =
        dr.project ||
        "-";


    const amount =
        getDRAmount(
            dr
        );


    const status =
        normalizeStatus(
            dr.status ||
            "PREPARED"
        );


    return `

        <tr
            data-dr-number="${escapeHTML(
                drNumber
            )}"
            class="dr-row"
        >

            <td>

                <strong>
                    ${escapeHTML(
                        drNumber
                    )}
                </strong>

            </td>


            <td>

                ${formatDisplayDate(
                    drDate
                )}

            </td>


            <td>

                ${escapeHTML(
                    soNumber
                )}

            </td>


            <td>

                ${escapeHTML(
                    client
                )}

            </td>


            <td>

                ${escapeHTML(
                    project
                )}

            </td>


            <td class="amount">

                ₱${formatMoney(
                    amount
                )}

            </td>


            <td>

                <span
                    class="status ${
                        getStatusClass(
                            status
                        )
                    }"
                >

                    ${escapeHTML(
                        displayStatus(
                            status
                        )
                    )}

                </span>

            </td>

        </tr>

    `;

}


/* =========================================================
   DR ROW SELECTION
========================================================= */

function setupDRSelection() {

    const rows =
        document.querySelectorAll(
            ".dr-row"
        );


    rows.forEach(
        function (row) {

            /*
               Remove old listeners by
               cloning the row.
               Not needed here because
               table is recreated when
               data changes.
            */

            row.onclick =
                function () {

                    selectDR(
                        this
                    );

                };


            row.ondblclick =
                function () {

                    const drNumber =
                        this.dataset.drNumber;


                    const dr =
                        findDR(
                            drNumber
                        );


                    if (dr) {

                        openDRDetails(
                            dr
                        );

                    }

                };

        }
    );

}


/* =========================================================
   SELECT DR
========================================================= */

function selectDR(
    row
) {

    if (!row) {
        return;
    }


    const drNumber =
        row.dataset.drNumber;


    selectedDR =
        findDR(
            drNumber
        );


    /*
       If the row is sample HTML
       and not yet in localStorage,
       create temporary selection.
    */

    if (
        !selectedDR
    ) {

        selectedDR = {

            drNumber:
                drNumber,

            status:
                getStatusFromRow(
                    row
                ),

            soNumber:
                row.children[2]
                    ? row.children[2]
                        .textContent
                        .trim()
                    : "",

            clientName:
                row.children[3]
                    ? row.children[3]
                        .textContent
                        .trim()
                    : "",

            project:
                row.children[4]
                    ? row.children[4]
                        .textContent
                        .trim()
                    : ""

        };

    }


    /*
       Remove selection
       from all rows.
    */

    document
        .querySelectorAll(
            ".dr-row"
        )
        .forEach(
            function (item) {

                item.classList.remove(
                    "selected"
                );

            }
        );


    row.classList.add(
        "selected"
    );


    updateSelectionBar();

}


/* =========================================================
   UPDATE SELECTION BAR
========================================================= */

function updateSelectionBar() {

    const text =
        document.getElementById(
            "drSelectionText"
        );


    const previewButton =
        document.getElementById(
            "previewDRButton"
        );


    const updateButton =
        document.getElementById(
            "updateDRButton"
        );


    const cancelButton =
        document.getElementById(
            "cancelDRButton"
        );


    const postButton =
        document.getElementById(
            "postDRButton"
        );


    if (
        !selectedDR
    ) {

        if (text) {

            text.innerHTML = `

                <span class="selection-empty">

                    No Delivery Receipt selected

                </span>

            `;

        }


        setButtonDisabled(
            previewButton,
            true
        );


        setButtonDisabled(
            updateButton,
            true
        );


        setButtonDisabled(
            cancelButton,
            true
        );


        setButtonDisabled(
            postButton,
            true
        );


        return;

    }


    const status =
        normalizeStatus(
            selectedDR.status
        );


    if (text) {

        text.innerHTML = `

            <div>

                <strong>
                    ${escapeHTML(
                        selectedDR.drNumber ||
                        "-"
                    )}
                </strong>

                <span>
                    &nbsp; • &nbsp;
                    ${escapeHTML(
                        selectedDR.soNumber ||
                        "-"
                    )}
                </span>

                <span>
                    &nbsp; • &nbsp;
                    ${escapeHTML(
                        displayStatus(
                            status
                        )
                    )}
                </span>

            </div>

        `;

    }


    /*
       PREVIEW
       Available for any existing DR.
    */

    setButtonDisabled(
        previewButton,
        false
    );


    /*
       UPDATE
       Only PREPARED.
    */

    setButtonDisabled(
        updateButton,
        status !== "PREPARED"
    );


    /*
       CANCEL
       Cannot cancel COMPLETED
       or already CANCELLED.
    */

    setButtonDisabled(
        cancelButton,

        status === "CANCELLED" ||
        status === "COMPLETED"
    );


    /*
       POST
       Only PREPARED.
    */

    setButtonDisabled(
        postButton,
        status !== "PREPARED"
    );

}


/* =========================================================
   ACTION BUTTONS
========================================================= */

function setupActionButtons() {

    const previewButton =
        document.getElementById(
            "previewDRButton"
        );


    const updateButton =
        document.getElementById(
            "updateDRButton"
        );


    const cancelButton =
        document.getElementById(
            "cancelDRButton"
        );


    const postButton =
        document.getElementById(
            "postDRButton"
        );


    if (previewButton) {

        previewButton.onclick =
            function () {

                if (
                    selectedDR
                ) {

                    openDRPreview(
                        selectedDR
                    );

                }

            };

    }


    if (updateButton) {

        updateButton.onclick =
            function () {

                if (
                    selectedDR
                ) {

                    openDRUpdate(
                        selectedDR
                    );

                }

            };

    }


    if (cancelButton) {

        cancelButton.onclick =
            function () {

                if (
                    selectedDR
                ) {

                    cancelDR(
                        selectedDR
                    );

                }

            };

    }


    if (postButton) {

        postButton.onclick =
            function () {

                if (
                    selectedDR
                ) {

                    postDR(
                        selectedDR
                    );

                }

            };

    }

}


/* =========================================================
   OPEN DR DETAILS
========================================================= */

function openDRDetails(
    dr
) {

    if (!dr) {
        return;
    }


    selectedDR = dr;


    hideAllViews();


    const detailsView =
        document.getElementById(
            "drDetailsView"
        );


    if (!detailsView) {
        return;
    }


    detailsView.style.display =
        "block";


    populateDRDetails(
        dr
    );


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );


    updateDetailsActionButtons();

}


/* =========================================================
   POPULATE DR DETAILS
========================================================= */

function populateDRDetails(
    dr
) {

    /*
       Existing HTML has many
       hard-coded sample values.

       We replace them dynamically
       where possible.
    */

    const root =
        document.getElementById(
            "drDetailsView"
        );


    if (!root) {
        return;
    }


    /*
       Header DR number
    */

    const header =
        root.querySelector(
            ".delivery-details-header h1"
        );


    if (header) {

        header.textContent =
            dr.drNumber ||
            "-";

    }


    /*
       Status badge
    */

    const statusBadge =
        root.querySelector(
            ".details-header-status .status"
        );


    if (statusBadge) {

        const status =
            normalizeStatus(
                dr.status
            );


        statusBadge.textContent =
            displayStatus(
                status
            );


        statusBadge.className =
            "status " +
            getStatusClass(
                status
            );

    }


    /*
       Info cards
    */

    const infoCards =
        root.querySelectorAll(
            ".delivery-info-card"
        );


    if (
        infoCards.length >= 4
    ) {

        infoCards[0]
            .querySelector(
                "strong"
            )
            .textContent =
                dr.drNumber || "-";


        infoCards[1]
            .querySelector(
                "strong"
            )
            .textContent =
                dr.soNumber || "-";


        infoCards[2]
            .querySelector(
                "strong"
            )
            .textContent =
                dr.clientName ||
                dr.client ||
                "-";


        infoCards[3]
            .querySelector(
                "strong"
            )
            .textContent =
                "₱" +
                formatMoney(
                    getDRAmount(
                        dr
                    )
                );

    }


    /*
       Status panel
    */

    const panelStatus =
        root.querySelector(
            ".dr-status-panel .dr-status-meta strong"
        );


    if (panelStatus) {

        panelStatus.textContent =
            displayStatus(
                dr.status
            );

    }


    /*
       DR form fields
    */

    const inputs =
        root.querySelectorAll(
            ".form-group input, .form-group textarea"
        );


    /*
       We use labels to find
       the correct fields.
    */

    inputs.forEach(
        function (input) {

            const group =
                input.closest(
                    ".form-group"
                );


            if (!group) {
                return;
            }


            const label =
                group.querySelector(
                    "label"
                );


            if (!label) {
                return;
            }


            const labelText =
                label.textContent
                    .trim()
                    .toUpperCase();


            if (
                labelText.includes(
                    "DR NUMBER"
                )
            ) {

                input.value =
                    dr.drNumber || "";

            }


            else if (
                labelText.includes(
                    "DATE OF TRANSFER"
                )
            ) {

                input.value =
                    normalizeDate(
                        getDRDate(
                            dr
                        )
                    );

            }


            else if (
                labelText ===
                "SO NUMBER"
            ) {

                input.value =
                    dr.soNumber || "";

            }


            else if (
                labelText.includes(
                    "CLIENT NAME"
                )
            ) {

                input.value =
                    dr.clientName ||
                    dr.client ||
                    "";

            }


            else if (
                labelText.includes(
                    "PO NUMBER"
                )
            ) {

                input.value =
                    dr.poNumber ||
                    "";

            }


            else if (
                labelText ===
                "TERMS"
            ) {

                input.value =
                    dr.terms ||
                    "";

            }


            else if (
                labelText ===
                "PROJECT"
            ) {

                input.value =
                    dr.project ||
                    "";

            }


            else if (
                labelText ===
                "ATTENTION"
            ) {

                input.value =
                    dr.attention ||
                    "";

            }


            else if (
                labelText.includes(
                    "DELIVERY ADDRESS"
                )
            ) {

                input.value =
                    dr.deliveryAddress ||
                    "";

            }

        }
    );


    renderDetailsItems(
        root,
        dr
    );

}


/* =========================================================
   RENDER DR ITEMS IN DETAILS
========================================================= */

function renderDetailsItems(
    root,
    dr
) {

    const table =
        root.querySelector(
            ".items-table"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector(
            "tbody"
        );


    if (!tbody) {
        return;
    }


    const items =
        Array.isArray(
            dr.items
        )
            ? dr.items
            : [];


    if (
        items.length === 0
    ) {

        return;

    }


    /*
       Replace hard-coded rows
       with actual DR items.
    */

    tbody.innerHTML =
        items
            .map(
                function (
                    item,
                    index
                ) {

                    const qty =
                        Number(
                            item.quantity ||
                            item.drQty ||
                            item.qty ||
                            0
                        );


                    const unitAmount =
                        Number(
                            item.unitAmount ||
                            item.unitPrice ||
                            0
                        );


                    const amount =
                        qty *
                        unitAmount;


                    return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>
                                <strong>
                                    ${escapeHTML(
                                        item.itemName ||
                                        item.name ||
                                        item.description ||
                                        "-"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHTML(
                                    item.drDescription ||
                                    item.description ||
                                    "-"
                                )}
                            </td>

                            <td class="text-center">
                                ${formatNumber(
                                    qty
                                )}
                            </td>

                            <td>
                                ${escapeHTML(
                                    item.unit ||
                                    ""
                                )}
                            </td>

                            <td class="amount">
                                ₱${formatMoney(
                                    unitAmount
                                )}
                            </td>

                            <td class="amount">
                                ₱${formatMoney(
                                    amount
                                )}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");


    /*
       Update DR TOTAL
    */

    const total =
        getDRAmount(
            dr
        );


    root.querySelectorAll(
        ".dr-total strong"
    ).forEach(
        function (element) {

            element.textContent =
                "₱" +
                formatMoney(
                    total
                );

        }
    );

}


/* =========================================================
   DETAILS ACTION BUTTONS
========================================================= */

function updateDetailsActionButtons() {

    const view =
        document.getElementById(
            "drDetailsView"
        );


    if (!view) {
        return;
    }


    const buttons =
        view.querySelectorAll(
            ".details-action-bar .btn"
        );


    if (
        buttons.length < 5
    ) {

        return;

    }


    /*
       BACK
    */

    buttons[0].onclick =
        function () {

            showListView();

        };


    /*
       PREVIEW
    */

    buttons[1].onclick =
        function () {

            if (
                selectedDR
            ) {

                openDRPreview(
                    selectedDR
                );

            }

        };


    /*
       UPDATE
    */

    buttons[2].onclick =
        function () {

            if (
                selectedDR
            ) {

                openDRUpdate(
                    selectedDR
                );

            }

        };


    /*
       CANCEL
    */

    buttons[3].onclick =
        function () {

            if (
                selectedDR
            ) {

                cancelDR(
                    selectedDR
                );

            }

        };


    /*
       POST DR
    */

    buttons[4].onclick =
        function () {

            if (
                selectedDR
            ) {

                postDR(
                    selectedDR
                );

            }

        };

}


/* =========================================================
   OPEN PREVIEW
========================================================= */

function openDRPreview(
    dr
) {

    if (!dr) {
        return;
    }


    selectedDR = dr;


    hideAllViews();


    const preview =
        document.getElementById(
            "drPreviewView"
        );


    if (!preview) {
        return;
    }


    preview.style.display =
        "block";


    populatePreview(
        dr
    );


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );


    setupPreviewButtons();

}


/* =========================================================
   POPULATE PREVIEW
========================================================= */

function populatePreview(
    dr
) {

    const root =
        document.getElementById(
            "drPreviewView"
        );


    if (!root) {
        return;
    }


    const header =
        root.querySelector(
            ".preview-header h1"
        );


    if (header) {

        header.textContent =
            dr.drNumber || "-";

    }


    const previewNumber =
        root.querySelector(
            ".dr-preview-number strong"
        );


    if (previewNumber) {

        previewNumber.textContent =
            dr.drNumber || "-";

    }


    const previewDate =
        root.querySelector(
            ".dr-preview-number small"
        );


    if (previewDate) {

        previewDate.textContent =
            formatDisplayDate(
                getDRDate(
                    dr
                )
            );

    }


    const info =
        root.querySelectorAll(
            ".preview-info-grid > div"
        );


    info.forEach(
        function (block) {

            const label =
                block.querySelector(
                    "span"
                );


            const value =
                block.querySelector(
                    "strong"
                );


            if (
                !label ||
                !value
            ) {

                return;

            }


            const text =
                label.textContent
                    .trim()
                    .toUpperCase();


            if (
                text === "CLIENT"
            ) {

                value.textContent =
                    dr.clientName ||
                    dr.client ||
                    "-";

            }


            else if (
                text === "SO NUMBER"
            ) {

                value.textContent =
                    dr.soNumber ||
                    "-";

            }


            else if (
                text === "PO NUMBER"
            ) {

                value.textContent =
                    dr.poNumber ||
                    "-";

            }


            else if (
                text === "PROJECT"
            ) {

                value.textContent =
                    dr.project ||
                    "-";

            }


            else if (
                text ===
                "DELIVERY ADDRESS"
            ) {

                value.textContent =
                    dr.deliveryAddress ||
                    "-";

            }

        }
    );


    /*
       ITEMS
    */

    const table =
        root.querySelector(
            ".preview-items table"
        );


    if (!table) {
        return;
    }


    const tbody =
        table.querySelector(
            "tbody"
        );


    if (!tbody) {
        return;
    }


    const items =
        Array.isArray(
            dr.items
        )
            ? dr.items
            : [];


    if (
        items.length
    ) {

        tbody.innerHTML =
            items
                .map(
                    function (
                        item,
                        index
                    ) {

                        const qty =
                            Number(
                                item.quantity ||
                                item.drQty ||
                                item.qty ||
                                0
                            );


                        const unitAmount =
                            Number(
                                item.unitAmount ||
                                item.unitPrice ||
                                0
                            );


                        return `

                            <tr>

                                <td>
                                    ${index + 1}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        item.itemName ||
                                        item.name ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        item.drDescription ||
                                        item.description ||
                                        "-"
                                    )}
                                </td>

                                <td>
                                    ${formatNumber(
                                        qty
                                    )}
                                </td>

                                <td>
                                    ${escapeHTML(
                                        item.unit ||
                                        ""
                                    )}
                                </td>

                                <td>
                                    ₱${formatMoney(
                                        qty *
                                        unitAmount
                                    )}
                                </td>

                            </tr>

                        `;

                    }
                )
                .join("");

    }


    /*
       TOTAL
    */

    const total =
        root.querySelector(
            ".preview-total strong"
        );


    if (total) {

        total.textContent =
            "₱" +
            formatMoney(
                getDRAmount(
                    dr
                )
            );

    }

}


/* =========================================================
   PREVIEW BUTTONS
========================================================= */

function setupPreviewButtons() {

    const view =
        document.getElementById(
            "drPreviewView"
        );


    if (!view) {
        return;
    }


    const buttons =
        view.querySelectorAll(
            ".preview-actions .btn"
        );


    if (
        buttons.length >= 2
    ) {

        /*
           CLOSE
        */

        buttons[0].onclick =
            function () {

                if (
                    selectedDR
                ) {

                    openDRDetails(
                        selectedDR
                    );

                } else {

                    showListView();

                }

            };


        /*
           PRINT
        */

        buttons[1].onclick =
            function () {

                window.print();

            };

    }


    /*
       BACK ARROW
    */

    const back =
        view.querySelector(
            ".back-button"
        );


    if (back) {

        back.onclick =
            function () {

                if (
                    selectedDR
                ) {

                    openDRDetails(
                        selectedDR
                    );

                } else {

                    showListView();

                }

            };

    }

}


/* =========================================================
   UPDATE DR
========================================================= */

function openDRUpdate(
    dr
) {

    if (!dr) {
        return;
    }


    /*
       For now we use the
       Create DR page with edit
       parameter.

       Later we can build a
       dedicated edit mode.
    */

    let url =
        "create-delivery-receipt.html?edit=" +
        encodeURIComponent(
            dr.drNumber
        );


    window.location.href =
        url;

}


/* =========================================================
   CANCEL DR
========================================================= */

function cancelDR(
    dr
) {

    if (!dr) {
        return;
    }


    const status =
        normalizeStatus(
            dr.status
        );


    if (
        status === "CANCELLED"
    ) {

        showNotification(
            "This DR is already cancelled.",
            "warning"
        );

        return;

    }


    if (
        status === "COMPLETED"
    ) {

        showNotification(
            "Completed DR cannot be cancelled.",
            "error"
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


    const index =
        deliveryReceipts.findIndex(
            function (item) {

                return (
                    item.drNumber ===
                    dr.drNumber
                );

            }
        );


    if (
        index === -1
    ) {

        showNotification(
            "This DR is only sample data. " +
            "It is not yet saved in localStorage.",
            "warning"
        );

        return;

    }


    deliveryReceipts[index].status =
        "CANCELLED";


    deliveryReceipts[index].cancelledAt =
        new Date().toISOString();


    saveDeliveryReceipts();


    selectedDR = null;


    refreshDeliveryModule();


    showListView();


    showNotification(
        "Delivery Receipt cancelled.",
        "success"
    );

}


/* =========================================================
   POST DR
========================================================= */

function postDR(
    dr
) {

    if (!dr) {
        return;
    }


    const status =
        normalizeStatus(
            dr.status
        );


    if (
        status === "CANCELLED"
    ) {

        showNotification(
            "Cancelled DR cannot be posted.",
            "error"
        );

        return;

    }


    if (
        status !== "PREPARED"
    ) {

        showNotification(
            "Only PREPARED DR can be posted.",
            "warning"
        );

        return;

    }


    const confirmed =
        window.confirm(
            "Post " +
            (dr.drNumber || "this DR") +
            "?"
        );


    if (!confirmed) {
        return;
    }


    const index =
        deliveryReceipts.findIndex(
            function (item) {

                return (
                    item.drNumber ===
                    dr.drNumber
                );

            }
        );


    if (
        index === -1
    ) {

        showNotification(
            "This DR is sample data only.",
            "warning"
        );

        return;

    }


    deliveryReceipts[index].status =
        "ONGOING";


    deliveryReceipts[index].postedAt =
        new Date().toISOString();


    saveDeliveryReceipts();


    selectedDR =
        deliveryReceipts[index];


    refreshDeliveryModule();


    showListView();


    showNotification(
        "DR posted successfully. Status is now ONGOING DELIVERY.",
        "success"
    );

}


/* =========================================================
   VIEW MANAGEMENT
========================================================= */

function hideAllViews() {

    const views = [

        "deliveryListView",

        "prepareDRView",

        "drDetailsView",

        "drPreviewView"

    ];


    views.forEach(
        function (id) {

            const element =
                document.getElementById(
                    id
                );


            if (element) {

                element.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   SHOW LIST VIEW
========================================================= */

function showListView() {

    hideAllViews();


    const list =
        document.getElementById(
            "deliveryListView"
        );


    if (list) {

        list.style.display =
            "block";

    }


    selectedDR = null;


    clearDRSelection();


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

}


/* =========================================================
   SETUP VIEW BUTTONS
========================================================= */

function setupViewButtons() {

    /*
       Prepare DR back button
    */

    const prepareView =
        document.getElementById(
            "prepareDRView"
        );


    if (prepareView) {

        const back =
            prepareView.querySelector(
                ".back-button"
            );


        if (back) {

            back.onclick =
                function () {

                    showListView();

                };

        }

    }


    /*
       Preview back button
    */

    const previewView =
        document.getElementById(
            "drPreviewView"
        );


    if (previewView) {

        const back =
            previewView.querySelector(
                ".back-button"
            );


        if (back) {

            back.onclick =
                function () {

                    if (
                        selectedDR
                    ) {

                        openDRDetails(
                            selectedDR
                        );

                    } else {

                        showListView();

                    }

                };

        }

    }


    /*
       Prepare DR buttons
       inside hidden prepare view.
    */

    setupPrepareViewButtons();

}


/* =========================================================
   PREPARE VIEW BUTTONS
========================================================= */

function setupPrepareViewButtons() {

    const view =
        document.getElementById(
            "prepareDRView"
        );


    if (!view) {
        return;
    }


    const buttons =
        view.querySelectorAll(
            ".details-action-bar .btn"
        );


    if (
        buttons.length < 3
    ) {

        return;

    }


    /*
       CANCEL
    */

    buttons[0].onclick =
        function () {

            showListView();

        };


    /*
       PREVIEW
    */

    buttons[1].onclick =
        function () {

            if (
                selectedDR
            ) {

                openDRPreview(
                    selectedDR
                );

            } else {

                showNotification(
                    "No DR selected.",
                    "warning"
                );

            }

        };


    /*
       PREPARE DR
    */

    buttons[2].onclick =
        function () {

            prepareCurrentDR();

        };

}


/* =========================================================
   PREPARE CURRENT DR
========================================================= */

function prepareCurrentDR() {

    /*
       This function is reserved for
       the future flow when the
       Prepare DR form is populated
       dynamically.
    */

    if (
        !selectedDR
    ) {

        showNotification(
            "Please select a Sales Order first.",
            "warning"
        );

        return;

    }


    showNotification(
        "DR preparation is handled by create-delivery-receipt.html.",
        "info"
    );

}


/* =========================================================
   SEARCH / FILTER SETUP
========================================================= */

function setupSearchAndFilters() {

    /*
       MAIN SEARCH
    */

    const mainSearch =
        document.getElementById(
            "deliveryMainSearch"
        );


    const mainStatus =
        document.getElementById(
            "deliveryMainStatusFilter"
        );


    if (mainSearch) {

        mainSearch.addEventListener(
            "input",
            function () {

                filterMainDelivery();

            }
        );

    }


    if (mainStatus) {

        mainStatus.addEventListener(
            "change",
            function () {

                filterMainDelivery();

            }
        );

    }


    /*
       SO SEARCH
    */

    const soSearch =
        document.getElementById(
            "deliverySOSearch"
        );


    const soFilter =
        document.getElementById(
            "deliverySOFilter"
        );


    if (soSearch) {

        soSearch.addEventListener(
            "input",
            function () {

                renderPostedSalesOrders(
                    this.value,
                    soFilter
                        ? soFilter.value
                        : "ALL"
                );

            }
        );

    }


    if (soFilter) {

        soFilter.addEventListener(
            "change",
            function () {

                renderPostedSalesOrders(
                    soSearch
                        ? soSearch.value
                        : "",
                    this.value
                );

            }
        );

    }


    /*
       DR SEARCH
    */

    const drSearch =
        document.getElementById(
            "deliveryDRSearch"
        );


    const drFilter =
        document.getElementById(
            "deliveryDRFilter"
        );


    if (drSearch) {

        drSearch.addEventListener(
            "input",
            function () {

                renderRecentDR(
                    this.value,
                    drFilter
                        ? drFilter.value
                        : "ALL"
                );

            }
        );

    }


    if (drFilter) {

        drFilter.addEventListener(
            "change",
            function () {

                renderRecentDR(
                    drSearch
                        ? drSearch.value
                        : "",
                    this.value
                );

            }
        );

    }


    /*
       SEARCH BUTTONS
    */

    document
        .querySelectorAll(
            ".delivery-search-button, .search-button"
        )
        .forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        /*
                           Inputs already filter
                           live, so button simply
                           triggers the current
                           filter again.
                        */

                        filterMainDelivery();

                    }
                );

            }
        );


    /*
       REFRESH
    */

    const refreshButton =
        document.querySelector(
            ".delivery-refresh-button"
        );


    if (refreshButton) {

        refreshButton.onclick =
            function () {

                refreshDeliveryModule();

            };

    }

}


/* =========================================================
   MAIN DELIVERY FILTER
========================================================= */

function filterMainDelivery() {

    const searchInput =
        document.getElementById(
            "deliveryMainSearch"
        );


    const statusInput =
        document.getElementById(
            "deliveryMainStatusFilter"
        );


    const search =
        searchInput
            ? searchInput.value
            : "";


    const filter =
        statusInput
            ? statusInput.value
            : "ALL";


    /*
       Main filter applies primarily
       to DR list.
    */

    renderRecentDR(
        search,
        filter
    );

}


/* =========================================================
   REFRESH
========================================================= */

function refreshDeliveryModule() {

    loadData();

    updateSummaryCards();

    const soSearch =
        document.getElementById(
            "deliverySOSearch"
        );


    const soFilter =
        document.getElementById(
            "deliverySOFilter"
        );


    renderPostedSalesOrders(
        soSearch
            ? soSearch.value
            : "",
        soFilter
            ? soFilter.value
            : "ALL"
    );


    const drSearch =
        document.getElementById(
            "deliveryDRSearch"
        );


    const drFilter =
        document.getElementById(
            "deliveryDRFilter"
        );


    renderRecentDR(
        drSearch
            ? drSearch.value
            : "",
        drFilter
            ? drFilter.value
            : "ALL"
    );


    showNotification(
        "Delivery data refreshed.",
        "success"
    );

}


/* =========================================================
   QUANTITY INPUTS
========================================================= */

function setupQuantityInputs() {

    document
        .querySelectorAll(
            ".qty-input"
        )
        .forEach(
            function (input) {

                input.addEventListener(
                    "input",
                    function () {

                        validateQuantity(
                            this
                        );

                    }
                );

            }
        );

}


/* =========================================================
   VALIDATE QUANTITY
========================================================= */

function validateQuantity(
    input
) {

    const value =
        Number(
            input.value
        );


    if (
        value < 0
    ) {

        input.value = 0;

    }

}


/* =========================================================
   FIND DR
========================================================= */

function findDR(
    drNumber
) {

    return deliveryReceipts.find(
        function (dr) {

            return (
                String(
                    dr.drNumber
                ) ===
                String(
                    drNumber
                )
            );

        }
    ) || null;

}


/* =========================================================
   GET DR DATE
========================================================= */

function getDRDate(
    dr
) {

    return (
        dr.dateOfTransfer ||
        dr.transferDate ||
        dr.drDate ||
        dr.createdAt ||
        ""
    );

}


/* =========================================================
   GET DR AMOUNT
========================================================= */

function getDRAmount(
    dr
) {

    if (
        Number(
            dr.totalAmount
        ) > 0
    ) {

        return Number(
            dr.totalAmount
        );

    }


    if (
        Number(
            dr.amount
        ) > 0
    ) {

        return Number(
            dr.amount
        );

    }


    if (
        !Array.isArray(
            dr.items
        )
    ) {

        return 0;

    }


    return dr.items.reduce(
        function (
            total,
            item
        ) {

            const qty =
                Number(
                    item.quantity ||
                    item.drQty ||
                    item.qty ||
                    0
                );


            const unitAmount =
                Number(
                    item.unitAmount ||
                    item.unitPrice ||
                    0
                );


            return (
                total +
                (
                    qty *
                    unitAmount
                )
            );

        },
        0
    );

}


/* =========================================================
   GET SO REMAINING TOTAL
========================================================= */

function getRemainingSOTotal(
    so
) {

    if (
        !so ||
        !Array.isArray(
            so.items
        )
    ) {

        /*
           If the SO object does not
           yet have item details,
           allow it to display.
        */

        return 1;

    }


    return so.items.reduce(
        function (
            total,
            item
        ) {

            return (
                total +
                getRemainingItem(
                    so,
                    item
                )
            );

        },
        0
    );

}


/* =========================================================
   GET REMAINING ITEM
========================================================= */

function getRemainingItem(
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


    if (
        ordered <= 0
    ) {

        return 0;

    }


    const itemId =
        item.id ||
        item.itemId ||
        item.sourceItemId;


    const soNumber =
        so.soNumber ||
        so.number;


    const delivered =
        deliveryReceipts
            .filter(
                function (dr) {

                    const status =
                        normalizeStatus(
                            dr.status
                        );


                    if (
                        status ===
                        "CANCELLED"
                    ) {

                        return false;

                    }


                    return (
                        String(
                            dr.soNumber
                        ) ===
                        String(
                            soNumber
                        )
                    );

                }
            )
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


                    return (
                        total +
                        items
                            .filter(
                                function (
                                    picked
                                ) {

                                    return (
                                        String(
                                            picked.sourceItemId
                                        ) ===
                                        String(
                                            itemId
                                        )
                                    );

                                }
                            )
                            .reduce(
                                function (
                                    sum,
                                    picked
                                ) {

                                    return (
                                        sum +
                                        Number(
                                            picked.quantity ||
                                            picked.drQty ||
                                            picked.qty ||
                                            0
                                        )
                                    );

                                },
                                0
                            )
                    );

                },
                0
            );


    return Math.max(
        0,
        ordered -
        delivered
    );

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(
    status
) {

    return String(
        status ||
        ""
    )
    .trim()
    .toUpperCase()
    .replace(
        /_/g,
        " "
    );

}


/* =========================================================
   NORMALIZE FILTER STATUS
========================================================= */

function normalizeFilterStatus(
    status
) {

    return String(
        status ||
        ""
    )
    .trim()
    .toUpperCase()
    .replace(
        /_/g,
        " "
    );

}


/* =========================================================
   DISPLAY STATUS
========================================================= */

function displayStatus(
    status
) {

    const normalized =
        normalizeStatus(
            status
        );


    if (
        normalized ===
        "ONGOING"
    ) {

        return "ONGOING";

    }


    return normalized ||
        "PREPARED";

}


/* =========================================================
   STATUS CSS CLASS
========================================================= */

function getStatusClass(
    status
) {

    const normalized =
        normalizeStatus(
            status
        );


    switch (
        normalized
    ) {

        case "POSTED":
            return "posted";

        case "PREPARED":
            return "prepared";

        case "ONGOING":
            return "ongoing";

        case "COMPLETED":
            return "completed";

        case "CANCELLED":
            return "cancelled";

        case "FOR INVOICE":
            return "invoice";

        case "PARTIAL":
            return "partial";

        default:
            return "prepared";

    }

}


/* =========================================================
   GET STATUS FROM SAMPLE ROW
========================================================= */

function getStatusFromRow(
    row
) {

    const status =
        row.querySelector(
            ".status"
        );


    return status
        ? normalizeStatus(
            status.textContent
        )
        : "PREPARED";

}


/* =========================================================
   CLEAR DR SELECTION
========================================================= */

function clearDRSelection() {

    document
        .querySelectorAll(
            ".dr-row"
        )
        .forEach(
            function (row) {

                row.classList.remove(
                    "selected"
                );

            }
        );


    selectedDR = null;


    updateSelectionBar();

}


/* =========================================================
   BUTTON DISABLED
========================================================= */

function setButtonDisabled(
    button,
    disabled
) {

    if (!button) {
        return;
    }


    button.disabled =
        disabled;

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


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   DATE
========================================================= */

function getTodayString() {

    const date =
        new Date();


    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


function normalizeDate(
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
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        ).substring(
            0,
            10
        );

    }


    return [
        date.getFullYear(),

        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        ),

        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        )

    ].join("-");

}


/* =========================================================
   DISPLAY DATE
========================================================= */

function formatDisplayDate(
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


    return date.toLocaleDateString(
        "en-PH",
        {
            month:
                "long",

            day:
                "numeric",

            year:
                "numeric"
        }
    );

}


/* =========================================================
   TIMESTAMP
========================================================= */

function getTimestamp(
    item
) {

    const date =
        getDRDate(
            item
        );


    const timestamp =
        new Date(
            date
        ).getTime();


    return Number.isNaN(
        timestamp
    )
        ? 0
        : timestamp;

}


/* =========================================================
   MONEY
========================================================= */

function formatMoney(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
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
   NUMBER
========================================================= */

function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-PH"
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


    return String(
        value
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
   NOTIFICATION
========================================================= */

function showNotification(
    message,
    type = "info"
) {

    /*
       Remove existing notification
    */

    const old =
        document.querySelector(
            ".delivery-js-notification"
        );


    if (old) {

        old.remove();

    }


    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        "delivery-js-notification";


    notification.textContent =
        message;


    notification.style.cssText = `

        position:fixed;

        right:24px;

        bottom:24px;

        z-index:99999;

        max-width:420px;

        padding:15px 20px;

        border-radius:14px;

        background:#ffffff;

        color:#1e293b;

        border:1px solid #e2e8f0;

        box-shadow:
            0 15px 40px
            rgba(15,23,42,.16);

        font-size:14px;

        font-weight:600;

        opacity:0;

        transform:
            translateY(15px);

        transition:
            all .25s ease;

    `;


    if (
        type ===
        "success"
    ) {

        notification.style.borderLeft =
            "4px solid #16a34a";

    }


    else if (
        type ===
        "error"
    ) {

        notification.style.borderLeft =
            "4px solid #dc2626";

    }


    else if (
        type ===
        "warning"
    ) {

        notification.style.borderLeft =
            "4px solid #f59e0b";

    }


    else {

        notification.style.borderLeft =
            "4px solid #2563eb";

    }


    document.body.appendChild(
        notification
    );


    requestAnimationFrame(
        function () {

            notification.style.opacity =
                "1";

            notification.style.transform =
                "translateY(0)";

        }
    );


    setTimeout(
        function () {

            notification.style.opacity =
                "0";

            notification.style.transform =
                "translateY(15px)";


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
========================================================= */

window.openCreateDR =
    openCreateDR;

window.refreshDeliveryModule =
    refreshDeliveryModule;

window.showListView =
    showListView;

window.openDRDetails =
    openDRDetails;

window.openDRPreview =
    openDRPreview;

window.openDRUpdate =
    openDRUpdate;

window.cancelDR =
    cancelDR;

window.postDR =
    postDR;


/* =========================================================
   END DELIVERY.JS
========================================================= */
