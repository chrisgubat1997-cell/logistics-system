/* =========================================================
   LOGIS-TECH SYSTEM
   DELIVERY MODULE
   delivery.js
   ========================================================= */

(function () {

    "use strict";

    console.log("=================================");
    console.log("LOGIS-TECH DELIVERY.JS LOADED");
    console.log("=================================");


    /* =====================================================
       CONFIGURATION
       ===================================================== */

    const CREATE_DELIVERY_RECEIPT_PAGE =
        "pages/create-delivery-receipt.html";

    const SELECTED_SO_STORAGE_KEY =
        "logitechSelectedDeliverySO";

    const SELECTED_DR_STORAGE_KEY =
        "logitechSelectedDR";


    /* =====================================================
       OPEN CREATE DELIVERY RECEIPT
       ===================================================== */

    function openCreateDeliveryReceipt(selectedSO = null) {

        console.log(
            "Opening Create Delivery Receipt..."
        );


        /* -------------------------------------------------
           SAVE SELECTED SO
           ------------------------------------------------- */

        if (selectedSO) {

            const deliverySO = {

                soNumber:
                    selectedSO.soNumber || "",

                clientName:
                    selectedSO.clientName || "",

                poNumber:
                    selectedSO.poNumber || "",

                project:
                    selectedSO.project || "",

                source:
                    "delivery",

                timestamp:
                    new Date().toISOString()

            };


            localStorage.setItem(
                SELECTED_SO_STORAGE_KEY,
                JSON.stringify(deliverySO)
            );


            console.log(
                "Selected SO saved:",
                deliverySO
            );

        }


        /* -------------------------------------------------
           OPEN NEW TAB
           IMPORTANT:
           index.html is the base document.
           create-delivery-receipt.html is inside /pages/
           ------------------------------------------------- */

        const target =
            CREATE_DELIVERY_RECEIPT_PAGE;


        console.log(
            "Opening:",
            target
        );


        const newWindow =
            window.open(
                target,
                "_blank"
            );


        /* -------------------------------------------------
           POPUP BLOCKED
           ------------------------------------------------- */

        if (!newWindow) {

            console.warn(
                "Browser blocked the new tab."
            );


            alert(
                "Hindi ma-open ang Create Delivery Receipt.\n\n" +
                "Please allow pop-ups for LOGIS-TECH SYSTEM."
            );


            return;

        }


        console.log(
            "Create Delivery Receipt opened successfully."
        );

    }


    /* =====================================================
       MAIN PREPARE DR BUTTON
       ===================================================== */

    function setupMainPrepareDR() {

        const button =
            document.getElementById(
                "prepareDRButton"
            );


        if (!button) {

            console.warn(
                "prepareDRButton NOT FOUND"
            );

            return;

        }


        console.log(
            "prepareDRButton FOUND"
        );


        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                console.log(
                    "PREPARE DR BUTTON CLICKED"
                );


                openCreateDeliveryReceipt();

            }
        );

    }


    /* =====================================================
       POSTED SO - PREPARE DR BUTTONS
       ===================================================== */

    function setupPostedSOButtons() {

        const buttons =
            document.querySelectorAll(
                ".posted-so-table .btn-primary"
            );


        console.log(
            "Posted SO Prepare buttons:",
            buttons.length
        );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();


                        const row =
                            button.closest("tr");


                        if (!row) {

                            console.error(
                                "SO row not found."
                            );

                            return;

                        }


                        const cells =
                            row.querySelectorAll("td");


                        /* ---------------------------------
                           READ SO DATA
                           --------------------------------- */

                        const soNumber =
                            cells[0]
                                ? cells[0]
                                    .textContent
                                    .trim()
                                : "";


                        const clientName =
                            cells[1]
                                ? cells[1]
                                    .textContent
                                    .trim()
                                : "";


                        const poNumber =
                            cells[2]
                                ? cells[2]
                                    .textContent
                                    .trim()
                                : "";


                        const project =
                            cells[3]
                                ? cells[3]
                                    .textContent
                                    .trim()
                                : "";


                        console.log(
                            "Preparing DR for:",
                            soNumber
                        );


                        /* ---------------------------------
                           OPEN CREATE DR
                           --------------------------------- */

                        openCreateDeliveryReceipt({

                            soNumber:
                                soNumber,

                            clientName:
                                clientName,

                            poNumber:
                                poNumber,

                            project:
                                project

                        });

                    }
                );

            }
        );

    }


    /* =====================================================
       REFRESH
       ===================================================== */

    function setupRefreshButton() {

        const button =
            document.getElementById(
                "deliveryRefreshButton"
            );


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            function () {

                const icon =
                    button.querySelector(
                        ".refresh-icon"
                    );


                if (icon) {

                    icon.classList.add(
                        "refreshing"
                    );

                }


                setTimeout(
                    function () {

                        window.location.reload();

                    },
                    350
                );

            }
        );

    }


    /* =====================================================
       DR ROW SELECTION
       ===================================================== */

    function setupDRRowSelection() {

        const rows =
            document.querySelectorAll(
                ".recent-dr-table .dr-row"
            );


        rows.forEach(
            function (row) {


                row.addEventListener(
                    "click",
                    function () {

                        selectDRRow(row);

                    }
                );


                row.addEventListener(
                    "dblclick",
                    function () {

                        openDRDetails(row);

                    }
                );

            }
        );

    }


    /* =====================================================
       SELECT DR
       ===================================================== */

    function selectDRRow(row) {

        document
            .querySelectorAll(
                ".recent-dr-table .dr-row"
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


        const drNumber =
            row.dataset.drNumber || "";


        const selectionText =
            document.getElementById(
                "drSelectionText"
            );


        if (selectionText) {

            selectionText.textContent =
                drNumber
                    ? drNumber + " selected"
                    : "1 DR selected";

        }


        const selectedDR = {

            drNumber:
                drNumber,

            selectedAt:
                new Date().toISOString()

        };


        localStorage.setItem(
            SELECTED_DR_STORAGE_KEY,
            JSON.stringify(selectedDR)
        );


        enableElement(
            "previewDRButton",
            true
        );


        enableElement(
            "updateDRButton",
            true
        );


        enableElement(
            "cancelDRButton",
            true
        );


        enableElement(
            "postDRButton",
            true
        );

    }


    /* =====================================================
       DR DETAILS
       ===================================================== */

    function openDRDetails(row) {

        const listView =
            document.getElementById(
                "deliveryListView"
            );


        const detailsView =
            document.getElementById(
                "drDetailsView"
            );


        if (!detailsView) {
            return;
        }


        if (listView) {

            listView.style.display =
                "none";

        }


        detailsView.style.display =
            "block";


        const drNumber =
            row.dataset.drNumber || "";


        const title =
            detailsView.querySelector(
                "[data-dr-title]"
            );


        if (title) {

            title.textContent =
                drNumber;

        }

    }


    /* =====================================================
       BACK BUTTONS
       ===================================================== */

    function setupBackButtons() {

        document
            .querySelectorAll(
                ".back-button"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            showDeliveryList();

                        }
                    );

                }
            );

    }


    /* =====================================================
       SHOW DELIVERY LIST
       ===================================================== */

    function showDeliveryList() {

        const views = [

            "prepareDRView",
            "drDetailsView",
            "drPreviewView"

        ];


        views.forEach(
            function (id) {

                const element =
                    document.getElementById(id);


                if (element) {

                    element.style.display =
                        "none";

                }

            }
        );


        const listView =
            document.getElementById(
                "deliveryListView"
            );


        if (listView) {

            listView.style.display =
                "block";

        }

    }


    /* =====================================================
       ACTION BUTTONS
       ===================================================== */

    function setupActionButtons() {


        /* PREVIEW */

        const preview =
            document.getElementById(
                "previewDRButton"
            );


        if (preview) {

            preview.addEventListener(
                "click",
                function () {

                    showDRPreview();

                }
            );

        }


        /* UPDATE */

        const update =
            document.getElementById(
                "updateDRButton"
            );


        if (update) {

            update.addEventListener(
                "click",
                function () {

                    showDRPrepareView();

                }
            );

        }


        /* CANCEL */

        const cancel =
            document.getElementById(
                "cancelDRButton"
            );


        if (cancel) {

            cancel.addEventListener(
                "click",
                function () {

                    const selected =
                        localStorage.getItem(
                            SELECTED_DR_STORAGE_KEY
                        );


                    if (!selected) {

                        alert(
                            "Please select a DR first."
                        );

                        return;

                    }


                    if (
                        confirm(
                            "Are you sure you want to cancel this DR?"
                        )
                    ) {

                        alert(
                            "Cancel DR function is ready for backend connection."
                        );

                    }

                }
            );

        }


        /* POST */

        const post =
            document.getElementById(
                "postDRButton"
            );


        if (post) {

            post.addEventListener(
                "click",
                function () {

                    const selected =
                        localStorage.getItem(
                            SELECTED_DR_STORAGE_KEY
                        );


                    if (!selected) {

                        alert(
                            "Please select a DR first."
                        );

                        return;

                    }


                    if (
                        confirm(
                            "Post this Delivery Receipt?"
                        )
                    ) {

                        alert(
                            "Post DR function is ready for backend connection."
                        );

                    }

                }
            );

        }

    }


    /* =====================================================
       PREVIEW
       ===================================================== */

    function showDRPreview() {

        const listView =
            document.getElementById(
                "deliveryListView"
            );


        const previewView =
            document.getElementById(
                "drPreviewView"
            );


        if (!previewView) {
            return;
        }


        if (listView) {

            listView.style.display =
                "none";

        }


        previewView.style.display =
            "block";

    }


    /* =====================================================
       PREPARE VIEW
       ===================================================== */

    function showDRPrepareView() {

        const listView =
            document.getElementById(
                "deliveryListView"
            );


        const prepareView =
            document.getElementById(
                "prepareDRView"
            );


        if (!prepareView) {
            return;
        }


        if (listView) {

            listView.style.display =
                "none";

        }


        prepareView.style.display =
            "block";

    }


    /* =====================================================
       ENABLE / DISABLE
       ===================================================== */

    function enableElement(
        id,
        enabled
    ) {

        const element =
            document.getElementById(id);


        if (!element) {
            return;
        }


        element.disabled =
            !enabled;


        if (enabled) {

            element.classList.remove(
                "disabled"
            );

        } else {

            element.classList.add(
                "disabled"
            );

        }

    }


    /* =====================================================
       SEARCH - POSTED SO
       ===================================================== */

    function setupSOSearch() {

        const search =
            document.getElementById(
                "deliverySOSearch"
            );


        if (!search) {
            return;
        }


        search.addEventListener(
            "input",
            function () {

                const keyword =
                    search.value
                        .toLowerCase()
                        .trim();


                document
                    .querySelectorAll(
                        ".posted-so-table tbody tr"
                    )
                    .forEach(
                        function (row) {

                            const text =
                                row.textContent
                                    .toLowerCase();


                            row.style.display =
                                text.includes(
                                    keyword
                                )
                                    ? ""
                                    : "none";

                        }
                    );

            }
        );

    }


    /* =====================================================
       SEARCH - RECENT DR
       ===================================================== */

    function setupDRSearch() {

        const search =
            document.getElementById(
                "deliveryDRSearch"
            );


        if (!search) {
            return;
        }


        search.addEventListener(
            "input",
            function () {

                const keyword =
                    search.value
                        .toLowerCase()
                        .trim();


                document
                    .querySelectorAll(
                        ".recent-dr-table tbody tr"
                    )
                    .forEach(
                        function (row) {

                            const text =
                                row.textContent
                                    .toLowerCase();


                            row.style.display =
                                text.includes(
                                    keyword
                                )
                                    ? ""
                                    : "none";

                        }
                    );

            }
        );

    }


    /* =====================================================
       FILTERS
       ===================================================== */

    function setupFilters() {

        const drFilter =
            document.getElementById(
                "deliveryDRFilter"
            );


        if (drFilter) {

            drFilter.addEventListener(
                "change",
                function () {

                    filterRows(
                        ".recent-dr-table tbody tr",
                        drFilter.value
                    );

                }
            );

        }


        const soFilter =
            document.getElementById(
                "deliverySOFilter"
            );


        if (soFilter) {

            soFilter.addEventListener(
                "change",
                function () {

                    filterRows(
                        ".posted-so-table tbody tr",
                        soFilter.value
                    );

                }
            );

        }

    }


    /* =====================================================
       FILTER ROWS
       ===================================================== */

    function filterRows(
        selector,
        filterValue
    ) {

        const rows =
            document.querySelectorAll(
                selector
            );


        rows.forEach(
            function (row) {

                if (
                    !filterValue ||
                    filterValue === "ALL"
                ) {

                    row.style.display =
                        "";

                    return;

                }


                const status =
                    row.querySelector(
                        ".status-badge"
                    );


                if (!status) {

                    row.style.display =
                        "";

                    return;

                }


                const currentStatus =
                    status.textContent
                        .trim()
                        .toUpperCase();


                row.style.display =
                    currentStatus ===
                    filterValue
                        .toUpperCase()
                        ? ""
                        : "none";

            }
        );

    }


    /* =====================================================
       INITIALIZE
       ===================================================== */

    function initDelivery() {

        console.log(
            "Initializing Delivery Module..."
        );


        setupMainPrepareDR();

        setupPostedSOButtons();

        setupRefreshButton();

        setupDRRowSelection();

        setupBackButtons();

        setupActionButtons();

        setupSOSearch();

        setupDRSearch();

        setupFilters();


        console.log(
            "Delivery Module READY."
        );


        console.log(
            "Create DR target:",
            CREATE_DELIVERY_RECEIPT_PAGE
        );

    }


    /* =====================================================
       START
       ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initDelivery
        );

    } else {

        initDelivery();

    }

})();
