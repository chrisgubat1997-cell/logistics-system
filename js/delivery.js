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
        "create-delivery-receipt.html";

    const SELECTED_SO_STORAGE_KEY =
        "logitechSelectedDeliverySO";

    const SELECTED_DR_STORAGE_KEY =
        "logitechSelectedDR";


    /* =====================================================
       NAVIGATION
       ===================================================== */

    function openCreateDeliveryReceipt(selectedSO = null) {

        console.log(
            "Opening Create Delivery Receipt..."
        );


        /* ---------------------------------------------
           SAVE SELECTED SALES ORDER
           --------------------------------------------- */

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


        /* ---------------------------------------------
           NAVIGATE
           delivery.html and
           create-delivery-receipt.html
           are inside the SAME /pages/ folder.
           --------------------------------------------- */

        console.log(
            "Navigating to:",
            CREATE_DELIVERY_RECEIPT_PAGE
        );


        try {

            window.location.href =
                CREATE_DELIVERY_RECEIPT_PAGE;

        } catch (error) {

            console.error(
                "Navigation error:",
                error
            );

        }

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
                "prepareDRButton not found."
            );

            return;
        }


        console.log(
            "prepareDRButton found."
        );


        button.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                console.log(
                    "================================="
                );

                console.log(
                    "MAIN PREPARE DR CLICKED"
                );

                console.log(
                    "================================="
                );


                openCreateDeliveryReceipt();

            }
        );

    }


    /* =====================================================
       POSTED SALES ORDER
       PREPARE DR BUTTONS
       ===================================================== */

    function setupPostedSOButtons() {

        const buttons =
            document.querySelectorAll(
                ".posted-so-table .btn-primary"
            );


        console.log(
            "Posted SO Prepare buttons found:",
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
                                "Posted SO row not found."
                            );

                            return;
                        }


                        const cells =
                            row.querySelectorAll("td");


                        /* ---------------------------------
                           READ TABLE DATA
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
                            "================================="
                        );

                        console.log(
                            "PREPARE DR FROM POSTED SO"
                        );

                        console.log(
                            "SO:",
                            soNumber
                        );

                        console.log(
                            "CLIENT:",
                            clientName
                        );

                        console.log(
                            "PO:",
                            poNumber
                        );

                        console.log(
                            "PROJECT:",
                            project
                        );

                        console.log(
                            "================================="
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
       REFRESH BUTTON
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
       RECENT DR ROW SELECTION
       ===================================================== */

    function setupDRRowSelection() {

        const rows =
            document.querySelectorAll(
                ".recent-dr-table .dr-row"
            );


        console.log(
            "Recent DR rows found:",
            rows.length
        );


        rows.forEach(
            function (row) {


                /* -----------------------------------------
                   SINGLE CLICK
                   ----------------------------------------- */

                row.addEventListener(
                    "click",
                    function () {

                        selectDRRow(row);

                    }
                );


                /* -----------------------------------------
                   DOUBLE CLICK
                   ----------------------------------------- */

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
       SELECT DR ROW
       ===================================================== */

    function selectDRRow(row) {

        /* ---------------------------------------------
           REMOVE PREVIOUS SELECTION
           --------------------------------------------- */

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


        /* ---------------------------------------------
           SELECT CURRENT ROW
           --------------------------------------------- */

        row.classList.add(
            "selected"
        );


        /* ---------------------------------------------
           GET DR NUMBER
           --------------------------------------------- */

        const drNumber =
            row.dataset.drNumber || "";


        /* ---------------------------------------------
           UPDATE SELECTION TEXT
           --------------------------------------------- */

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


        /* ---------------------------------------------
           SAVE SELECTED DR
           --------------------------------------------- */

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


        console.log(
            "Selected DR:",
            selectedDR
        );


        /* ---------------------------------------------
           ENABLE ACTION BUTTONS
           --------------------------------------------- */

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
       OPEN DR DETAILS
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

            console.warn(
                "drDetailsView not found."
            );

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


        console.log(
            "Opened DR details:",
            drNumber
        );

    }


    /* =====================================================
       BACK BUTTONS
       ===================================================== */

    function setupBackButtons() {

        const buttons =
            document.querySelectorAll(
                ".back-button"
            );


        buttons.forEach(
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


        /* ---------------------------------------------
           PREVIEW DR
           --------------------------------------------- */

        const previewButton =
            document.getElementById(
                "previewDRButton"
            );


        if (previewButton) {

            previewButton.addEventListener(
                "click",
                function () {

                    showDRPreview();

                }
            );

        }


        /* ---------------------------------------------
           UPDATE DR
           --------------------------------------------- */

        const updateButton =
            document.getElementById(
                "updateDRButton"
            );


        if (updateButton) {

            updateButton.addEventListener(
                "click",
                function () {

                    showDRPrepareView();

                }
            );

        }


        /* ---------------------------------------------
           CANCEL DR
           --------------------------------------------- */

        const cancelButton =
            document.getElementById(
                "cancelDRButton"
            );


        if (cancelButton) {

            cancelButton.addEventListener(
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


                    const confirmCancel =
                        confirm(
                            "Are you sure you want to cancel this DR?"
                        );


                    if (confirmCancel) {

                        alert(
                            "Cancel DR function is ready for backend connection."
                        );

                    }

                }
            );

        }


        /* ---------------------------------------------
           POST DR
           --------------------------------------------- */

        const postButton =
            document.getElementById(
                "postDRButton"
            );


        if (postButton) {

            postButton.addEventListener(
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


                    const confirmPost =
                        confirm(
                            "Post this Delivery Receipt?"
                        );


                    if (confirmPost) {

                        alert(
                            "Post DR function is ready for backend connection."
                        );

                    }

                }
            );

        }

    }


    /* =====================================================
       SHOW DR PREVIEW
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

            console.warn(
                "drPreviewView not found."
            );

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
       SHOW PREPARE VIEW
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

            console.warn(
                "prepareDRView not found."
            );

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
       ENABLE / DISABLE ELEMENT
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
       OPTIONAL:
       MAIN SEARCH
       ===================================================== */

    function setupMainSearch() {

        const search =
            document.getElementById(
                "deliveryMainSearch"
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


                const rows =
                    document.querySelectorAll(
                        ".posted-so-table tbody tr"
                    );


                rows.forEach(
                    function (row) {

                        const text =
                            row.textContent
                                .toLowerCase();


                        row.style.display =
                            text.includes(keyword)
                                ? ""
                                : "none";

                    }
                );

            }
        );

    }


    /* =====================================================
       DR SEARCH
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


                const rows =
                    document.querySelectorAll(
                        ".recent-dr-table tbody tr"
                    );


                rows.forEach(
                    function (row) {

                        const text =
                            row.textContent
                                .toLowerCase();


                        row.style.display =
                            text.includes(keyword)
                                ? ""
                                : "none";

                    }
                );

            }
        );

    }


    /* =====================================================
       SO SEARCH
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


                const rows =
                    document.querySelectorAll(
                        ".posted-so-table tbody tr"
                    );


                rows.forEach(
                    function (row) {

                        const text =
                            row.textContent
                                .toLowerCase();


                        row.style.display =
                            text.includes(keyword)
                                ? ""
                                : "none";

                    }
                );

            }
        );

    }


    /* =====================================================
       STATUS FILTER
       ===================================================== */

    function setupFilters() {


        /* ---------------------------------------------
           MAIN STATUS FILTER
           --------------------------------------------- */

        const mainFilter =
            document.getElementById(
                "deliveryMainStatusFilter"
            );


        if (mainFilter) {

            mainFilter.addEventListener(
                "change",
                function () {

                    filterRows(
                        ".posted-so-table tbody tr",
                        mainFilter.value
                    );

                }
            );

        }


        /* ---------------------------------------------
           DR FILTER
           --------------------------------------------- */

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


        /* ---------------------------------------------
           SO FILTER
           --------------------------------------------- */

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


                const statusElement =
                    row.querySelector(
                        ".status-badge"
                    );


                if (!statusElement) {

                    row.style.display =
                        "";

                    return;
                }


                const status =
                    statusElement
                        .textContent
                        .trim()
                        .toUpperCase();


                row.style.display =
                    status ===
                    filterValue.toUpperCase()
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

        setupMainSearch();

        setupDRSearch();

        setupSOSearch();

        setupFilters();


        console.log(
            "Delivery Module READY."
        );

        console.log(
            "Create DR page:",
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
