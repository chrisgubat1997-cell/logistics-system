/* =========================================================
   LOGIS-TECH SYSTEM
   CREATE DELIVERY RECEIPT
   create-delivery-receipt.js
   ========================================================= */

(function () {

    "use strict";

    console.log("======================================");
    console.log("LOGIS-TECH CREATE DR JS LOADED");
    console.log("======================================");


    /* =====================================================
       STORAGE
       ===================================================== */

    const SELECTED_SO_KEY =
        "logitechSelectedDeliverySO";

    const DR_STORAGE_KEY =
        "logitechDeliveryReceipts";


    /* =====================================================
       SAMPLE SALES ORDERS
       TEMPORARY TEST DATA
       ===================================================== */

    const SAMPLE_SALES_ORDERS = [

        {
            id: "SO-2026-0001",

            soNumber: "SO-2026-0001",

            soDate: "2026-10-01",

            client: "ABC CONSTRUCTION CORPORATION",

            attention: "Mr. Juan Dela Cruz",

            poNumber: "PO-ABC-2026-102",

            project: "Warehouse Expansion Project",

            tin: "123-456-789-000",

            terms: "30 Days",

            salesEngineer: "Cris Gubat",

            status: "ACTIVE",

            deliveryAddress:
                "Brgy. San Jose, City of San Jose del Monte, Bulacan",

            items: [

                {
                    id: "ITEM-001",
                    description: "Cable Tray 100mm x 50mm",
                    quantity: 50,
                    unit: "pcs"
                },

                {
                    id: "ITEM-002",
                    description: "Cable Tray 150mm x 50mm",
                    quantity: 35,
                    unit: "pcs"
                },

                {
                    id: "ITEM-003",
                    description: "Cable Tray 300mm x 100mm",
                    quantity: 20,
                    unit: "pcs"
                },

                {
                    id: "ITEM-004",
                    description: "Cable Tray Coupler",
                    quantity: 100,
                    unit: "pcs"
                },

                {
                    id: "ITEM-005",
                    description: "Cable Tray Support Bracket",
                    quantity: 75,
                    unit: "pcs"
                }

            ]

        },


        {
            id: "SO-2026-0002",

            soNumber: "SO-2026-0002",

            soDate: "2026-10-02",

            client: "METRO PACIFIC INDUSTRIAL SERVICES",

            attention: "Ms. Maria Santos",

            poNumber: "MPIS-PO-2026-778",

            project: "Industrial Plant Electrical Works",

            tin: "456-789-123-000",

            terms: "15 Days",

            salesEngineer: "John Martinez",

            status: "ACTIVE",

            deliveryAddress:
                "Brgy. Ugong, Valenzuela City, Metro Manila",

            items: [

                {
                    id: "ITEM-101",
                    description: "Electrical Cable Tray 200mm",
                    quantity: 80,
                    unit: "pcs"
                },

                {
                    id: "ITEM-102",
                    description: "Cable Tray Cover 200mm",
                    quantity: 80,
                    unit: "pcs"
                },

                {
                    id: "ITEM-103",
                    description: "Cable Tray Elbow 90 Degrees",
                    quantity: 25,
                    unit: "pcs"
                },

                {
                    id: "ITEM-104",
                    description: "Cable Tray Tee",
                    quantity: 15,
                    unit: "pcs"
                }

            ]

        },


        {
            id: "SO-2026-0003",

            soNumber: "SO-2026-0003",

            soDate: "2026-10-03",

            client: "PAMBATO ELECTRICAL CONTRACTOR",

            attention: "Engr. Roberto Cruz",

            poNumber: "PEC-2026-445",

            project: "Retiro Commercial Building",

            tin: "789-123-456-000",

            terms: "COD",

            salesEngineer: "Michael Santos",

            status: "ACTIVE",

            deliveryAddress:
                "Retiro Street, Quezon City, Metro Manila",

            items: [

                {
                    id: "ITEM-201",
                    description: "Cable Tray 100mm x 50mm",
                    quantity: 60,
                    unit: "pcs"
                },

                {
                    id: "ITEM-202",
                    description: "Cable Tray 200mm x 50mm",
                    quantity: 40,
                    unit: "pcs"
                },

                {
                    id: "ITEM-203",
                    description: "Cable Tray Support",
                    quantity: 120,
                    unit: "pcs"
                },

                {
                    id: "ITEM-204",
                    description: "Cable Tray Coupler",
                    quantity: 80,
                    unit: "pcs"
                },

                {
                    id: "ITEM-205",
                    description: "Cable Tray End Cap",
                    quantity: 30,
                    unit: "pcs"
                }

            ]

        }

    ];


    /* =====================================================
       STATE
       ===================================================== */

    let selectedSO = null;

    let pickedItems = {};


    /* =====================================================
       DOM READY
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        init
    );


    /* =====================================================
       INIT
       ===================================================== */

    function init() {

        console.log(
            "Initializing Create Delivery Receipt..."
        );


        setupButtons();

        setupSOSelector();

        setupSelectedSO();

        setDefaultDate();

        generateDRNumber();

        console.log(
            "Create Delivery Receipt READY."
        );

    }


    /* =====================================================
       SETUP BUTTONS
       ===================================================== */

    function setupButtons() {

        const backButton =
            document.getElementById(
                "backButton"
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "delivery.html";

                }
            );

        }


        const cancelButton =
            document.getElementById(
                "cancelButton"
            );


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                function () {

                    window.location.href =
                        "delivery.html";

                }
            );

        }


        const prepareButton =
            document.getElementById(
                "prepareButton"
            );


        if (prepareButton) {

            prepareButton.addEventListener(
                "click",
                prepareDR
            );

        }


        const postButton =
            document.getElementById(
                "postButton"
            );


        if (postButton) {

            postButton.addEventListener(
                "click",
                postDR
            );

        }


        const printButton =
            document.getElementById(
                "printButton"
            );


        if (printButton) {

            printButton.addEventListener(
                "click",
                function () {

                    window.print();

                }
            );

        }


        const closeWarning =
            document.getElementById(
                "closeWarningButton"
            );


        if (closeWarning) {

            closeWarning.addEventListener(
                "click",
                closeWarningModal
            );

        }


        const closePreview =
            document.getElementById(
                "closePreviewButton"
            );


        if (closePreview) {

            closePreview.addEventListener(
                "click",
                closePreviewModal
            );

        }


        const closePreview2 =
            document.getElementById(
                "closePreviewButton2"
            );


        if (closePreview2) {

            closePreview2.addEventListener(
                "click",
                closePreviewModal
            );

        }

    }


    /* =====================================================
       SALES ORDER SELECTOR
       ===================================================== */

    function setupSOSelector() {

        const select =
            document.getElementById(
                "salesOrderSelect"
            );


        if (!select) {

            console.warn(
                "salesOrderSelect not found."
            );

            return;

        }


        select.innerHTML =
            '<option value="">Select Sales Order...</option>';


        SAMPLE_SALES_ORDERS.forEach(
            function (so) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    so.soNumber;


                option.textContent =
                    so.soNumber +
                    " — " +
                    so.client;


                select.appendChild(
                    option
                );

            }
        );


        select.addEventListener(
            "change",
            function () {

                const soNumber =
                    select.value;


                if (!soNumber) {

                    clearSOInformation();

                    return;

                }


                const so =
                    SAMPLE_SALES_ORDERS.find(
                        function (item) {

                            return item.soNumber ===
                                soNumber;

                        }
                    );


                if (so) {

                    selectSalesOrder(so);

                }

            }
        );

    }


    /* =====================================================
       AUTO SELECT SAVED SO
       ===================================================== */

    function setupSelectedSO() {

        const saved =
            localStorage.getItem(
                SELECTED_SO_KEY
            );


        if (!saved) {

            return;

        }


        try {

            const savedSO =
                JSON.parse(saved);


            if (
                savedSO &&
                savedSO.soNumber
            ) {

                const matchingSO =
                    SAMPLE_SALES_ORDERS.find(
                        function (so) {

                            return so.soNumber ===
                                savedSO.soNumber;

                        }
                    );


                if (matchingSO) {

                    const select =
                        document.getElementById(
                            "salesOrderSelect"
                        );


                    if (select) {

                        select.value =
                            matchingSO.soNumber;

                    }


                    selectSalesOrder(
                        matchingSO
                    );

                }

            }

        } catch (error) {

            console.error(
                "Invalid saved SO:",
                error
            );

        }

    }


    /* =====================================================
       SELECT SALES ORDER
       ===================================================== */

    function selectSalesOrder(so) {

        selectedSO = so;

        pickedItems = {};


        console.log(
            "Selected SO:",
            so
        );


        fillSOInformation(so);

        fillDeliveryInformation(so);

        renderItems(so);

        updateSummary();

        showSections();


        const select =
            document.getElementById(
                "salesOrderSelect"
            );


        if (select) {

            select.classList.add(
                "auto-selected"
            );

        }

    }


    /* =====================================================
       FILL SO INFORMATION
       ===================================================== */

    function fillSOInformation(so) {

        setText(
            "soNumberDisplay",
            so.soNumber
        );


        setText(
            "soDateDisplay",
            formatDate(so.soDate)
        );


        setText(
            "clientNameDisplay",
            so.client
        );


        setText(
            "attentionDisplay",
            so.attention
        );


        setText(
            "poNumberDisplay",
            so.poNumber
        );


        setText(
            "projectDisplay",
            so.project
        );


        setText(
            "tinDisplay",
            so.tin
        );


        setText(
            "termsDisplay",
            so.terms
        );


        setText(
            "salesEngineerDisplay",
            so.salesEngineer
        );


        const status =
            document.getElementById(
                "soStatusDisplay"
            );


        if (status) {

            status.textContent =
                so.status;


            status.className =
                "status-badge status-" +
                so.status.toLowerCase();

        }

    }


    /* =====================================================
       DELIVERY INFORMATION
       ===================================================== */

    function fillDeliveryInformation(so) {

        const address =
            document.getElementById(
                "deliveryAddress"
            );


        if (address) {

            address.value =
                so.deliveryAddress;

        }

    }


    /* =====================================================
       RENDER ITEMS
       ===================================================== */

    function renderItems(so) {

        const tbody =
            document.getElementById(
                "itemsTableBody"
            );


        if (!tbody) {

            return;

        }


        tbody.innerHTML = "";


        so.items.forEach(
            function (item, index) {

                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML = `

                    <td class="pick-cell">

                        <input
                            type="checkbox"
                            class="item-check"
                            data-index="${index}"
                        >

                    </td>

                    <td>
                        <strong>
                            ${escapeHTML(item.description)}
                        </strong>
                    </td>

                    <td class="text-center">
                        ${item.quantity}
                    </td>

                    <td class="text-center">
                        ${escapeHTML(item.unit)}
                    </td>

                    <td>

                        <input
                            type="number"
                            class="qty-input"
                            data-index="${index}"
                            min="0"
                            max="${item.quantity}"
                            value="0"
                            disabled
                        >

                    </td>

                    <td class="text-center remaining-qty">
                        ${item.quantity}
                    </td>

                `;


                tbody.appendChild(
                    row
                );


                const checkbox =
                    row.querySelector(
                        ".item-check"
                    );


                const qtyInput =
                    row.querySelector(
                        ".qty-input"
                    );


                checkbox.addEventListener(
                    "change",
                    function () {

                        if (
                            checkbox.checked
                        ) {

                            qtyInput.disabled =
                                false;


                            qtyInput.value =
                                item.quantity;


                            pickedItems[index] =
                                item.quantity;

                        } else {

                            qtyInput.disabled =
                                true;


                            qtyInput.value =
                                0;


                            delete pickedItems[index];

                        }


                        updateRemaining(
                            row,
                            item
                        );


                        updateSummary();

                    }
                );


                qtyInput.addEventListener(
                    "input",
                    function () {

                        let qty =
                            Number(
                                qtyInput.value
                            );


                        if (
                            qty < 0
                        ) {

                            qty = 0;

                        }


                        if (
                            qty >
                            item.quantity
                        ) {

                            qty =
                                item.quantity;

                        }


                        qtyInput.value =
                            qty;


                        if (qty > 0) {

                            checkbox.checked =
                                true;


                            qtyInput.disabled =
                                false;


                            pickedItems[index] =
                                qty;

                        } else {

                            checkbox.checked =
                                false;


                            delete pickedItems[index];

                        }


                        updateRemaining(
                            row,
                            item
                        );


                        updateSummary();

                    }
                );

            }
        );


        updateAvailableCount();

    }


    /* =====================================================
       UPDATE REMAINING
       ===================================================== */

    function updateRemaining(
        row,
        item
    ) {

        const qtyInput =
            row.querySelector(
                ".qty-input"
            );


        const remaining =
            row.querySelector(
                ".remaining-qty"
            );


        const picked =
            Number(
                qtyInput.value
            ) || 0;


        const balance =
            item.quantity -
            picked;


        if (remaining) {

            remaining.textContent =
                balance;

        }


        if (balance === 0) {

            remaining.classList.add(
                "zero-remaining"
            );

        } else {

            remaining.classList.remove(
                "zero-remaining"
            );

        }

    }


    /* =====================================================
       UPDATE SUMMARY
       ===================================================== */

    function updateSummary() {

        let selectedCount = 0;

        let totalPicked = 0;


        Object.keys(
            pickedItems
        ).forEach(
            function (key) {

                const qty =
                    Number(
                        pickedItems[key]
                    ) || 0;


                if (qty > 0) {

                    selectedCount++;

                    totalPicked +=
                        qty;

                }

            }
        );


        setText(
            "selectedItemCount",
            selectedCount
        );


        setText(
            "totalPickedQty",
            totalPicked
        );


        setText(
            "summaryItemsList",
            selectedCount +
            " item(s) / " +
            totalPicked +
            " total quantity"
        );


        updateAvailableCount();

    }


    /* =====================================================
       AVAILABLE ITEM COUNT
       ===================================================== */

    function updateAvailableCount() {

        if (!selectedSO) {

            setText(
                "availableItemCount",
                0
            );

            return;

        }


        setText(
            "availableItemCount",
            selectedSO.items.length
        );

    }


    /* =====================================================
       SHOW SECTIONS
       ===================================================== */

    function showSections() {

        showElement(
            "soInformationSection"
        );


        showElement(
            "deliveryInformationSection"
        );


        showElement(
            "itemPickingSection"
        );


        showElement(
            "drSummarySection"
        );


        showElement(
            "drActionsSection"
        );


        updateWorkflow(
            2
        );

    }


    /* =====================================================
       CLEAR SO INFORMATION
       ===================================================== */

    function clearSOInformation() {

        selectedSO = null;

        pickedItems = {};


        [
            "soInformationSection",
            "deliveryInformationSection",
            "itemPickingSection",
            "drSummarySection",
            "drActionsSection"
        ].forEach(
            function (id) {

                hideElement(id);

            }
        );


        const tbody =
            document.getElementById(
                "itemsTableBody"
            );


        if (tbody) {

            tbody.innerHTML = "";

        }


        updateWorkflow(
            1
        );

    }


    /* =====================================================
       PREPARE DR
       ===================================================== */

    function prepareDR() {

        if (!selectedSO) {

            showWarning(
                "Sales Order Required",
                "Please select a Sales Order before preparing the Delivery Receipt."
            );

            return;

        }


        const transferDate =
            document.getElementById(
                "dateOfTransfer"
            );


        if (
            !transferDate ||
            !transferDate.value
        ) {

            showWarning(
                "Date of Transfer Required",
                "Please enter the Date of Transfer before preparing the Delivery Receipt."
            );

            if (transferDate) {

                transferDate.focus();

            }

            return;

        }


        const driver =
            document.getElementById(
                "driverName"
            );


        const vehicle =
            document.getElementById(
                "vehicleNumber"
            );


        if (
            !driver ||
            !driver.value.trim()
        ) {

            showWarning(
                "Driver Required",
                "Please enter the Driver Name."
            );

            return;

        }


        if (
            !vehicle ||
            !vehicle.value.trim()
        ) {

            showWarning(
                "Vehicle Required",
                "Please enter the Vehicle Number."
            );

            return;

        }


        if (
            Object.keys(
                pickedItems
            ).length === 0
        ) {

            showWarning(
                "No Items Selected",
                "Please select at least one item for delivery."
            );

            return;

        }


        updateDRSummary();

        updateWorkflow(
            3
        );


        const prepareButton =
            document.getElementById(
                "prepareButton"
            );


        if (prepareButton) {

            prepareButton.style.display =
                "none";

        }


        const postButton =
            document.getElementById(
                "postButton"
            );


        if (postButton) {

            postButton.style.display =
                "inline-flex";

        }


        console.log(
            "DR prepared."
        );

    }


    /* =====================================================
       UPDATE DR SUMMARY
       ===================================================== */

    function updateDRSummary() {

        const drNumber =
            document.getElementById(
                "drNumber"
            );


        const summaryDR =
            document.getElementById(
                "summaryDrNumber"
            );


        if (summaryDR) {

            summaryDR.textContent =
                drNumber
                    ? drNumber.value
                    : "DR-2026-0001";

        }


        setText(
            "summarySoNumber",
            selectedSO.soNumber
        );


        setText(
            "summaryClient",
            selectedSO.client
        );


        const transferDate =
            document.getElementById(
                "dateOfTransfer"
            );


        setText(
            "summaryTransferDate",
            transferDate
                ? formatDate(
                    transferDate.value
                )
                : ""
        );


        setText(
            "summaryAddress",
            selectedSO.deliveryAddress
        );

    }


    /* =====================================================
       POST DR
       ===================================================== */

    function postDR() {

        if (!selectedSO) {

            return;

        }


        const drNumber =
            getDRNumber();


        const transferDate =
            document.getElementById(
                "dateOfTransfer"
            );


        const driver =
            document.getElementById(
                "driverName"
            );


        const vehicle =
            document.getElementById(
                "vehicleNumber"
            );


        const picked =
            [];


        Object.keys(
            pickedItems
        ).forEach(
            function (index) {

                const item =
                    selectedSO.items[
                        Number(index)
                    ];


                if (!item) {

                    return;

                }


                picked.push({

                    id:
                        item.id,

                    description:
                        item.description,

                    orderedQty:
                        item.quantity,

                    pickedQty:
                        Number(
                            pickedItems[index]
                        ),

                    unit:
                        item.unit

                });

            }
        );


        const deliveryReceipt = {

            id:
                Date.now(),

            drNumber:
                drNumber,

            soNumber:
                selectedSO.soNumber,

            soDate:
                selectedSO.soDate,

            client:
                selectedSO.client,

            attention:
                selectedSO.attention,

            poNumber:
                selectedSO.poNumber,

            project:
                selectedSO.project,

            deliveryAddress:
                selectedSO.deliveryAddress,

            dateOfTransfer:
                transferDate.value,

            driverName:
                driver.value.trim(),

            vehicleNumber:
                vehicle.value.trim(),

            items:
                picked,

            status:
                "PREPARED",

            createdAt:
                new Date().toISOString()

        };


        const existing =
            JSON.parse(
                localStorage.getItem(
                    DR_STORAGE_KEY
                ) || "[]"
            );


        existing.unshift(
            deliveryReceipt
        );


        localStorage.setItem(
            DR_STORAGE_KEY,
            JSON.stringify(existing)
        );


        console.log(
            "DR saved:",
            deliveryReceipt
        );


        showPreview(
            deliveryReceipt
        );

    }


    /* =====================================================
       SHOW PREVIEW
       ===================================================== */

    function showPreview(dr) {

        setText(
            "previewDrNumber",
            dr.drNumber
        );


        setText(
            "previewNumber",
            dr.drNumber
        );


        setText(
            "previewDate",
            formatDate(
                dr.dateOfTransfer
            )
        );


        setText(
            "previewSO",
            dr.soNumber
        );


        setText(
            "previewPO",
            dr.poNumber
        );


        setText(
            "previewClient",
            dr.client
        );


        setText(
            "previewProject",
            dr.project
        );


        setText(
            "previewAddress",
            dr.deliveryAddress
        );


        const tbody =
            document.getElementById(
                "previewItemsBody"
            );


        if (tbody) {

            tbody.innerHTML = "";


            dr.items.forEach(
                function (item) {

                    const row =
                        document.createElement(
                            "tr"
                        );


                    row.innerHTML = `

                        <td>
                            ${escapeHTML(
                                item.description
                            )}
                        </td>

                        <td class="text-center">
                            ${item.orderedQty}
                        </td>

                        <td class="text-center">
                            ${item.pickedQty}
                        </td>

                        <td class="text-center">
                            ${escapeHTML(
                                item.unit
                            )}
                        </td>

                    `;


                    tbody.appendChild(
                        row
                    );

                }
            );

        }


        const previewModal =
            document.getElementById(
                "previewModal"
            );


        if (previewModal) {

            previewModal.classList.add(
                "show"
            );

        }

    }


    /* =====================================================
       WARNING MODAL
       ===================================================== */

    function showWarning(
        title,
        message
    ) {

        setText(
            "warningTitle",
            title
        );


        setText(
            "warningMessage",
            message
        );


        const modal =
            document.getElementById(
                "warningModal"
            );


        if (modal) {

            modal.classList.add(
                "show"
            );

        }

    }


    function closeWarningModal() {

        const modal =
            document.getElementById(
                "warningModal"
            );


        if (modal) {

            modal.classList.remove(
                "show"
            );

        }

    }


    /* =====================================================
       CLOSE PREVIEW
       ===================================================== */

    function closePreviewModal() {

        const modal =
            document.getElementById(
                "previewModal"
            );


        if (modal) {

            modal.classList.remove(
                "show"
            );

        }

    }


    /* =====================================================
       DR NUMBER
       ===================================================== */

    function generateDRNumber() {

        const year =
            new Date()
                .getFullYear();


        const existing =
            JSON.parse(
                localStorage.getItem(
                    DR_STORAGE_KEY
                ) || "[]"
            );


        const number =
            existing.length + 1;


        const drNumber =
            "DR-" +
            year +
            "-" +
            String(number)
                .padStart(
                    4,
                    "0"
                );


        const input =
            document.getElementById(
                "drNumber"
            );


        if (input) {

            input.value =
                drNumber;

        }


        setText(
            "summaryDrNumber",
            drNumber
        );


        setText(
            "previewDrNumber",
            drNumber
        );

    }


    function getDRNumber() {

        const input =
            document.getElementById(
                "drNumber"
            );


        return input
            ? input.value
            : "DR-" +
                new Date().getFullYear() +
                "-0001";

    }


    /* =====================================================
       DEFAULT DATE
       ===================================================== */

    function setDefaultDate() {

        const input =
            document.getElementById(
                "dateOfTransfer"
            );


        if (!input) {

            return;

        }


        if (!input.value) {

            const today =
                new Date();


            const year =
                today.getFullYear();


            const month =
                String(
                    today.getMonth() + 1
                ).padStart(
                    2,
                    "0"
                );


            const day =
                String(
                    today.getDate()
                ).padStart(
                    2,
                    "0"
                );


            input.value =
                year +
                "-" +
                month +
                "-" +
                day;

        }

    }


    /* =====================================================
       WORKFLOW
       ===================================================== */

    function updateWorkflow(
        activeStep
    ) {

        document
            .querySelectorAll(
                ".workflow-step"
            )
            .forEach(
                function (step) {

                    const stepNumber =
                        Number(
                            step.dataset.step
                        );


                    step.classList.toggle(
                        "active",
                        stepNumber <=
                        activeStep
                    );

                }
            );

    }


    /* =====================================================
       HELPERS
       ===================================================== */

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


    function showElement(id) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.classList.remove(
                "hidden"
            );

        }

    }


    function hideElement(id) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.classList.add(
                "hidden"
            );

        }

    }


    function formatDate(
        dateString
    ) {

        if (!dateString) {

            return "";

        }


        const date =
            new Date(
                dateString +
                "T00:00:00"
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return dateString;

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


})();
