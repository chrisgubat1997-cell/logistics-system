/* =========================================================
   LOGIS-TECH SYSTEM
   DELIVERY / DR MODULE
   delivery.js

   PURPOSE:
   - Open create-delivery.html
   - Handle Prepare DR buttons
   - Handle Refresh button
   - Handle DR row selection
   - Keep existing views compatible
========================================================= */

(function () {

    "use strict";


    /* =====================================================
       CONFIGURATION
    ====================================================== */

    const CREATE_DELIVERY_PAGE = "../pages/create-delivery.html";


    /* =====================================================
       INITIALIZATION
    ====================================================== */

    document.addEventListener("DOMContentLoaded", function () {

        initializeDeliveryModule();

    });


    function initializeDeliveryModule() {

        setupPrepareDRButton();

        setupPostedSOButtons();

        setupRefreshButton();

        setupDRRowSelection();

        setupBackButtons();

        setupActionButtons();

        console.log(
            "LOGIS-TECH DELIVERY MODULE initialized."
        );

    }


    /* =====================================================
       PREPARE DR MAIN BUTTON
       
       Header:
       + PREPARE DR
    ====================================================== */

    function setupPrepareDRButton() {

        const button =
            document.getElementById("prepareDRButton");

        if (!button) {
            return;
        }


        button.addEventListener("click", function () {

            openCreateDeliveryPage();

        });

    }


    /* =====================================================
       POSTED SALES ORDER
       
       Buttons:
       + PREPARE DR
    ====================================================== */

    function setupPostedSOButtons() {

        const buttons =
            document.querySelectorAll(
                ".posted-so-table .btn-primary"
            );


        if (!buttons.length) {
            return;
        }


        buttons.forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    const row =
                        button.closest("tr");

                    if (!row) {

                        openCreateDeliveryPage();

                        return;
                    }


                    /*
                     * Get SO information from table.
                     */

                    const soNumber =
                        getTableCellValue(row, 0);

                    const clientName =
                        getTableCellValue(row, 1);

                    const poNumber =
                        getTableCellValue(row, 2);

                    const project =
                        getTableCellValue(row, 3);


                    /*
                     * Save temporary selected SO.
                     *
                     * This is only frontend/localStorage
                     * for now.
                     */

                    const selectedSO = {

                        soNumber: soNumber,

                        clientName: clientName,

                        poNumber: poNumber,

                        project: project,

                        source: "delivery",

                        timestamp:
                            new Date().toISOString()

                    };


                    localStorage.setItem(
                        "logitechSelectedDeliverySO",
                        JSON.stringify(selectedSO)
                    );


                    /*
                     * Open create-delivery.html
                     */

                    openCreateDeliveryPage();

                }
            );

        });

    }


    /* =====================================================
       GET TABLE CELL VALUE
    ====================================================== */

    function getTableCellValue(row, index) {

        const cells = row.querySelectorAll("td");

        if (!cells[index]) {
            return "";
        }

        return cells[index]
            .textContent
            .trim();

    }


    /* =====================================================
       OPEN CREATE DELIVERY PAGE
    ====================================================== */

    function openCreateDeliveryPage() {

        /*
         * Use normal page navigation.
         *
         * This is important because
         * create-delivery.html is a separate page.
         */

        window.location.href =
            CREATE_DELIVERY_PAGE;

    }


    /* =====================================================
       REFRESH BUTTON
    ====================================================== */

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

                /*
                 * Visual refresh animation
                 */

                const icon =
                    button.querySelector(
                        ".refresh-icon"
                    );


                if (icon) {

                    icon.classList.remove(
                        "refreshing"
                    );


                    /*
                     * Force animation restart
                     */

                    void icon.offsetWidth;


                    icon.classList.add(
                        "refreshing"
                    );

                }


                /*
                 * For now, reload the current
                 * Delivery page.
                 *
                 * Later this can be replaced
                 * with API refresh.
                 */

                setTimeout(function () {

                    window.location.reload();

                }, 300);

            }
        );

    }


    /* =====================================================
       RECENT DR ROW SELECTION
       
       Single click:
       Select DR

       Double click:
       Open DR details
    ====================================================== */

    function setupDRRowSelection() {

        const rows =
            document.querySelectorAll(
                ".recent-dr-table .dr-row"
            );


        if (!rows.length) {
            return;
        }


        rows.forEach(function (row) {


            /* ---------------------------------------------
               SINGLE CLICK
            ---------------------------------------------- */

            row.addEventListener(
                "click",
                function () {

                    selectDRRow(row);

                }
            );


            /* ---------------------------------------------
               DOUBLE CLICK
            ---------------------------------------------- */

            row.addEventListener(
                "dblclick",
                function () {

                    openDRDetails(row);

                }
            );

        });

    }


    /* =====================================================
       SELECT DR
    ====================================================== */

    function selectDRRow(row) {

        const rows =
            document.querySelectorAll(
                ".recent-dr-table .dr-row"
            );


        rows.forEach(function (item) {

            item.classList.remove(
                "selected"
            );

        });


        row.classList.add(
            "selected"
        );


        const drNumber =
            row.dataset.drNumber ||
            getTableCellValue(row, 0);


        const selectionText =
            document.getElementById(
                "drSelectionText"
            );


        if (selectionText) {

            selectionText.innerHTML = `

                <div class="selected-dr-info">

                    <strong>
                        ${escapeHTML(drNumber)}
                    </strong>

                    <span>
                        Delivery Receipt selected
                    </span>

                </div>

            `;

        }


        /*
         * Enable action buttons
         */

        enableElement(
            "previewDRButton"
        );

        enableElement(
            "updateDRButton"
        );

        enableElement(
            "cancelDRButton"
        );

        enableElement(
            "postDRButton"
        );


        /*
         * Save selected DR locally.
         */

        localStorage.setItem(
            "logitechSelectedDR",
            JSON.stringify({

                drNumber: drNumber,

                timestamp:
                    new Date().toISOString()

            })
        );

    }


    /* =====================================================
       OPEN DR DETAILS
    ====================================================== */

    function openDRDetails(row) {

        const drNumber =
            row.dataset.drNumber ||
            getTableCellValue(row, 0);


        /*
         * Save selected DR
         */

        localStorage.setItem(
            "logitechSelectedDR",
            JSON.stringify({

                drNumber: drNumber,

                timestamp:
                    new Date().toISOString()

            })
        );


        /*
         * Hide list
         */

        const listView =
            document.getElementById(
                "deliveryListView"
            );


        const detailsView =
            document.getElementById(
                "drDetailsView"
            );


        if (
            listView &&
            detailsView
        ) {

            listView.style.display =
                "none";

            detailsView.style.display =
                "block";


            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });

        }

    }


    /* =====================================================
       BACK BUTTONS
    ====================================================== */

    function setupBackButtons() {

        const buttons =
            document.querySelectorAll(
                ".back-button"
            );


        buttons.forEach(function (button) {

            button.addEventListener(
                "click",
                function () {

                    showDeliveryList();

                }
            );

        });

    }


    /* =====================================================
       SHOW DELIVERY LIST
    ====================================================== */

    function showDeliveryList() {

        const listView =
            document.getElementById(
                "deliveryListView"
            );


        const prepareView =
            document.getElementById(
                "prepareDRView"
            );


        const detailsView =
            document.getElementById(
                "drDetailsView"
            );


        const previewView =
            document.getElementById(
                "drPreviewView"
            );


        if (listView) {

            listView.style.display =
                "block";

        }


        if (prepareView) {

            prepareView.style.display =
                "none";

        }


        if (detailsView) {

            detailsView.style.display =
                "none";

        }


        if (previewView) {

            previewView.style.display =
                "none";

        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    /* =====================================================
       ACTION BUTTONS
    ====================================================== */

    function setupActionButtons() {


        /* ---------------------------------------------
           PREVIEW
        ---------------------------------------------- */

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
           UPDATE
        ---------------------------------------------- */

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
           CANCEL
        ---------------------------------------------- */

        const cancelButton =
            document.getElementById(
                "cancelDRButton"
            );


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                function () {

                    const confirmed =
                        window.confirm(
                            "Are you sure you want to cancel this Delivery Receipt?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    alert(
                        "DR cancellation will be connected to the database next."
                    );

                }
            );

        }


        /* ---------------------------------------------
           POST DR
        ---------------------------------------------- */

        const postButton =
            document.getElementById(
                "postDRButton"
            );


        if (postButton) {

            postButton.addEventListener(
                "click",
                function () {

                    const confirmed =
                        window.confirm(
                            "Are you sure you want to POST this Delivery Receipt?"
                        );


                    if (!confirmed) {
                        return;
                    }


                    alert(
                        "DR posting will be connected to the database next."
                    );

                }
            );

        }

    }


    /* =====================================================
       PREPARE VIEW
    ====================================================== */

    function showDRPrepareView() {

        const listView =
            document.getElementById(
                "deliveryListView"
            );


        const prepareView =
            document.getElementById(
                "prepareDRView"
            );


        const detailsView =
            document.getElementById(
                "drDetailsView"
            );


        const previewView =
            document.getElementById(
                "drPreviewView"
            );


        if (listView) {

            listView.style.display =
                "none";

        }


        if (detailsView) {

            detailsView.style.display =
                "none";

        }


        if (previewView) {

            previewView.style.display =
                "none";

        }


        if (prepareView) {

            prepareView.style.display =
                "block";

        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    /* =====================================================
       PREVIEW VIEW
    ====================================================== */

    function showDRPreview() {

        const listView =
            document.getElementById(
                "deliveryListView"
            );


        const prepareView =
            document.getElementById(
                "prepareDRView"
            );


        const detailsView =
            document.getElementById(
                "drDetailsView"
            );


        const previewView =
            document.getElementById(
                "drPreviewView"
            );


        if (listView) {

            listView.style.display =
                "none";

        }


        if (prepareView) {

            prepareView.style.display =
                "none";

        }


        if (detailsView) {

            detailsView.style.display =
                "none";

        }


        if (previewView) {

            previewView.style.display =
                "block";

        }


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    /* =====================================================
       ENABLE ELEMENT
    ====================================================== */

    function enableElement(id) {

        const element =
            document.getElementById(id);


        if (!element) {
            return;
        }


        element.disabled = false;

    }


    /* =====================================================
       ESCAPE HTML
       
       Prevents selected table text from
       being inserted directly as HTML.
    ====================================================== */

    function escapeHTML(value) {

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


})();
