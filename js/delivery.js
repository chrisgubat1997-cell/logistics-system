
/* =========================================================
   LOGIS-TECH SYSTEM
   DELIVERY MODULE
   delivery.js
   VERSION: 20261009-01
   ========================================================= */

(function () {
    "use strict";

    console.log("LOGIS-TECH DELIVERY MODULE LOADED");

    /* =====================================================
       CONFIGURATION
    ===================================================== */

    const DELIVERY_API_URL =
        "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

    const CREATE_DELIVERY_RECEIPT_PAGE =
        "pages/create-delivery-receipt.html";

    const SELECTED_SO_STORAGE_KEY =
        "logitechSelectedDeliverySO";

    const SELECTED_DR_STORAGE_KEY =
        "logitechSelectedDR";

    let deliveryReceiptsCache = [];
    let salesOrdersCache = [];
    let selectedDRRecord = null;
    let isLoadingDeliveryData = false;

    /* =====================================================
       API
    ===================================================== */

    async function callDeliveryAPI(action) {
        if (
            !DELIVERY_API_URL.startsWith(
                "https://script.google.com/macros/s/"
            ) ||
            !DELIVERY_API_URL.endsWith("/exec")
        ) {
            throw new Error("Invalid Google Apps Script API URL.");
        }

        const url =
            DELIVERY_API_URL +
            "?action=" +
            encodeURIComponent(action) +
            "&_=" +
            Date.now();

        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
            redirect: "follow"
        });

        if (!response.ok) {
            throw new Error(
                action + " failed. HTTP " + response.status
            );
        }

        const result = await response.json();

        if (
            result &&
            result.success === false
        ) {
            throw new Error(
                result.message ||
                result.error ||
                action + " returned an error."
            );
        }

        return result;
    }

    function extractRecords(result, possibleKeys) {
        if (Array.isArray(result)) {
            return result;
        }

        if (!result || typeof result !== "object") {
            return [];
        }

        for (const key of possibleKeys) {
            if (Array.isArray(result[key])) {
                return result[key];
            }
        }

        if (result.data && Array.isArray(result.data.records)) {
            return result.data.records;
        }

        return [];
    }

    /* =====================================================
       GENERAL HELPERS
    ===================================================== */

    function getValue(record, keys, fallback = "") {
        if (!record) return fallback;

        for (const key of keys) {
            const value = record[key];

            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                return value;
            }
        }

        return fallback;
    }

    function normalizeText(value) {
        return String(value ?? "")
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_");
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            function (character) {
                const replacements = {
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;"
                };

                return replacements[character];
            }
        );
    }

    function toNumber(value) {
        if (typeof value === "number") {
            return Number.isFinite(value) ? value : 0;
        }

        const cleaned = String(value ?? "")
            .replace(/[₱,\s]/g, "");

        const number = Number(cleaned);

        return Number.isFinite(number) ? number : 0;
    }

    function formatMoney(value) {
        return "₱" + toNumber(value).toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }

    function formatDate(value) {
        if (!value) return "—";

        let date;

        /*
         * A date-only value is parsed as local calendar date.
         * Timestamp values are converted to local time.
         */

        const raw = String(value).trim();
        const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (dateOnly) {
            date = new Date(
                Number(dateOnly[1]),
                Number(dateOnly[2]) - 1,
                Number(dateOnly[3])
            );
        } else {
            date = new Date(raw);
        }

        if (Number.isNaN(date.getTime())) {
            return escapeHTML(raw);
        }

        return date.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    function getLocalDateKey(value) {
        if (!value) return "";

        const raw = String(value).trim();
        const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

        if (dateOnly) {
            return raw;
        }

        const date = new Date(raw);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return year + "-" + month + "-" + day;
    }

    function getTodayKey() {
        const now = new Date();

        return (
            now.getFullYear() +
            "-" +
            String(now.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(now.getDate()).padStart(2, "0")
        );
    }

    function getDRNumber(dr) {
        return String(getValue(dr, [
            "DR_NUMBER",
            "drNumber",
            "deliveryReceiptNumber"
        ])).trim();
    }

    function getSONumber(record) {
        return String(getValue(record, [
            "SO_NUMBER",
            "soNumber",
            "salesOrderNumber"
        ])).trim();
    }

    function getClientName(record) {
        return getValue(record, [
            "CLIENT_NAME",
            "clientName",
            "CUSTOMER_NAME",
            "customerName"
        ], "—");
    }

    function getProject(record) {
        return getValue(record, [
            "PROJECT",
            "project",
            "PROJECT_NAME",
            "projectName"
        ], "—");
    }

    function getPONumber(record) {
        return getValue(record, [
            "PO_NUMBER",
            "poNumber"
        ], "—");
    }

    function getDRDate(dr) {
        return getValue(dr, [
            "DATE_OF_TRANSFER",
            "dateOfTransfer",
            "DR_DATE",
            "drDate",
            "CREATED_AT",
            "CREATED_DATE",
            "DATE_CREATED",
            "createdAt"
        ], "");
    }

    function getDRCreatedDate(dr) {
        return getValue(dr, [
            "CREATED_AT",
            "CREATED_DATE",
            "DATE_CREATED",
            "createdAt",
            "DATE_OF_TRANSFER",
            "dateOfTransfer"
        ], "");
    }

    function getDRItems(dr) {
        if (Array.isArray(dr?.items)) {
            return dr.items;
        }

        if (Array.isArray(dr?.ITEMS)) {
            return dr.ITEMS;
        }

        return [];
    }

    function getSOItems(so) {
        if (Array.isArray(so?.items)) {
            return so.items;
        }

        if (Array.isArray(so?.ITEMS)) {
            return so.ITEMS;
        }

        if (Array.isArray(so?.SO_ITEMS)) {
            return so.SO_ITEMS;
        }

        return [];
    }

    /* =====================================================
       STATUS HELPERS
    ===================================================== */

    function getDRStatus(dr) {
        const raw = normalizeText(
            getValue(dr, ["STATUS", "status"], "SAVED")
        );

        if ([
            "CANCELLED",
            "CANCELED",
            "VOID",
            "VOIDED"
        ].includes(raw)) {
            return "CANCELLED";
        }

        if ([
            "COMPLETED",
            "DELIVERED",
            "FULLY_DELIVERED"
        ].includes(raw)) {
            return "COMPLETED";
        }

        if ([
            "ONGOING",
            "ONGOING_DELIVERY",
            "IN_TRANSIT",
            "IN_DELIVERY"
        ].includes(raw)) {
            return "ONGOING";
        }

        if ([
            "FOR_INVOICE",
            "FOR_BILLING"
        ].includes(raw)) {
            return "FOR_INVOICE";
        }

        /*
         * SAVED and DRAFT are displayed as PREPARED.
         * This does not change the stored database status.
         */

        if ([
            "SAVED",
            "DRAFT",
            "PREPARING",
            "PREPARED"
        ].includes(raw)) {
            return "PREPARED";
        }

        return raw || "PREPARED";
    }

    function getSOStatus(so) {
        return normalizeText(
            getValue(so, ["STATUS", "status"], "")
        );
    }

    function getDRStatusClass(status) {
        const classes = {
            PREPARED: "prepared",
            ONGOING: "ongoing",
            COMPLETED: "posted",
            CANCELLED: "cancelled",
            FOR_INVOICE: "invoice",
            POSTED: "posted"
        };

        return classes[status] || "prepared";
    }

    function getSOStatusLabel(status) {
        if (status === "PARTIAL") {
            return "PARTIAL";
        }

        if (status === "POSTED") {
            return "POSTED";
        }

        return status || "—";
    }

    function getSOStatusClass(status) {
        if (status === "PARTIAL") {
            return "ongoing";
        }

        return "posted";
    }

    function isCancelledDR(dr) {
        return getDRStatus(dr) === "CANCELLED";
    }

    function isEligibleSO(so) {
        const status = getSOStatus(so);

        return [
            "POSTED",
            "PARTIAL"
        ].includes(status);
    }

    /* =====================================================
       DR AMOUNT
       =====================================================
       Use an amount saved on the DR item when available.
       Otherwise calculate Pick Qty x unit amount from SO items.
       If no reliable amount exists, display a dash.
    ===================================================== */

    function getSOItemUnitAmount(item) {
        const value = getValue(item, [
            "UNIT_AMOUNT",
            "UNIT_PRICE",
            "unitAmount",
            "unitPrice",
            "AMOUNT",
            "amount"
        ], null);

        return value === null ? null : toNumber(value);
    }

    function getDRAmount(dr) {
        const directAmount = getValue(dr, [
            "DR_TOTAL",
            "DR_AMOUNT",
            "TOTAL_AMOUNT",
            "GRAND_TOTAL",
            "drTotal",
            "drAmount",
            "totalAmount"
        ], null);

        if (directAmount !== null) {
            return toNumber(directAmount);
        }

        const soNumber = getSONumber(dr);

        const matchingSO = salesOrdersCache.find(function (so) {
            return getSONumber(so) === soNumber;
        });

        const soItems = matchingSO ? getSOItems(matchingSO) : [];
        const drItems = getDRItems(dr);

        if (!drItems.length) return null;

        let total = 0;
        let hasReliableAmount = false;

        drItems.forEach(function (drItem) {
            const itemAmount = getValue(drItem, [
                "DR_AMOUNT",
                "LINE_TOTAL",
                "TOTAL_AMOUNT",
                "drAmount",
                "lineTotal"
            ], null);

            if (itemAmount !== null) {
                total += toNumber(itemAmount);
                hasReliableAmount = true;
                return;
            }

            const itemId = String(getValue(drItem, [
                "SO_ITEM_ID",
                "soItemId",
                "ITEM_ID",
                "itemId"
            ])).trim();

            const soItem = soItems.find(function (item) {
                const soItemId = String(getValue(item, [
                    "SO_ITEM_ID",
                    "soItemId",
                    "ITEM_ID",
                    "itemId"
                ])).trim();

                return itemId && itemId === soItemId;
            });

            if (!soItem) return;

            const unitAmount = getSOItemUnitAmount(soItem);

            if (unitAmount === null) return;

            const qty = toNumber(getValue(drItem, [
                "PICK_QTY",
                "pickQty",
                "DELIVERED_QTY",
                "deliveredQty"
            ], 0));

            total += qty * unitAmount;
            hasReliableAmount = true;
        });

        return hasReliableAmount ? total : null;
    }

    function displayDRAmount(dr) {
        const amount = getDRAmount(dr);

        return amount === null ? "—" : formatMoney(amount);
    }

    /* =====================================================
       OPEN CREATE DELIVERY RECEIPT
    ===================================================== */

    function openCreateDeliveryReceipt(selectedSO = null) {
        console.log("Opening Create Delivery Receipt", selectedSO);

        if (selectedSO) {
            const deliverySO = {
                soNumber: getSONumber(selectedSO),
                clientName: getClientName(selectedSO),
                poNumber: getPONumber(selectedSO),
                project: getProject(selectedSO),
                source: "delivery",
                timestamp: new Date().toISOString()
            };

            localStorage.setItem(
                SELECTED_SO_STORAGE_KEY,
                JSON.stringify(deliverySO)
            );
        }

        window.location.href = CREATE_DELIVERY_RECEIPT_PAGE;
    }

    /* =====================================================
       SUMMARY CARDS
    ===================================================== */

    function updateSummaryCards() {
        const validDRs = deliveryReceiptsCache.filter(function (dr) {
            const status = getDRStatus(dr);

            return ![
                "DELETED",
                "VOID"
            ].includes(status);
        });

        const todayKey = getTodayKey();

        const todayDRs = validDRs.filter(function (dr) {
            return getLocalDateKey(getDRCreatedDate(dr)) === todayKey;
        });

        const ongoingDRs = validDRs.filter(function (dr) {
            return getDRStatus(dr) === "ONGOING";
        });

        const cancelledDRs = validDRs.filter(function (dr) {
            return isCancelledDR(dr);
        });

        setText("totalDRCount", validDRs.length);
        setText("todayDRCount", todayDRs.length);
        setText("ongoingDRCount", ongoingDRs.length);
        setText("cancelledDRCount", cancelledDRs.length);

        const todaySmall = document.querySelector(
            "#todayDRCard .summary-card-content small"
        );

        if (todaySmall) {
            todaySmall.textContent =
                new Date().toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });
        }
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = String(value);
        }
    }

    /* =====================================================
       RENDER RECENT DR
    ===================================================== */

    function renderRecentDR() {
        const tbody = document.querySelector(
            ".recent-dr-table tbody"
        );

        if (!tbody) return;

        const sortedDRs = [...deliveryReceiptsCache].sort(
            function (a, b) {
                const dateA = new Date(
                    getDRCreatedDate(a) || 0
                ).getTime();

                const dateB = new Date(
                    getDRCreatedDate(b) || 0
                ).getTime();

                return dateB - dateA;
            }
        );

        if (!sortedDRs.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-state">
                        No Delivery Receipts found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = sortedDRs.map(function (dr) {
            const drNumber = getDRNumber(dr);
            const status = getDRStatus(dr);
            const statusClass = getDRStatusClass(status);

            return `
                <tr
                    class="dr-row ${status === "CANCELLED" ? "cancelled-row" : ""}"
                    data-dr-number="${escapeHTML(drNumber)}"
                    data-status="${escapeHTML(status)}"
                    tabindex="0">

                    <td>
                        <strong>${escapeHTML(drNumber || "—")}</strong>
                    </td>

                    <td>${formatDate(getDRDate(dr))}</td>

                    <td>${escapeHTML(getSONumber(dr) || "—")}</td>

                    <td>${escapeHTML(getClientName(dr))}</td>

                    <td>${escapeHTML(getProject(dr))}</td>

                    <td class="amount">
                        ${displayDRAmount(dr)}
                    </td>

                    <td>
                        <span class="status ${statusClass}">
                            ${escapeHTML(status.replace(/_/g, " "))}
                        </span>
                    </td>

                </tr>
            `;
        }).join("");
    }

    /* =====================================================
       RENDER RECENT POSTED / PARTIAL SALES ORDERS
    ===================================================== */

    function getSODate(so) {
        return getValue(so, [
            "DATE_CREATION",
            "DATE_CREATED",
            "CREATED_AT",
            "CREATED_DATE",
            "SO_DATE",
            "DATE",
            "createdAt"
        ], "");
    }

    function getSOAmount(so) {
        const value = getValue(so, [
            "GRAND_TOTAL",
            "grandTotal",
            "TOTAL_AMOUNT",
            "totalAmount",
            "TOTAL",
            "total"
        ], null);

        return value === null ? "—" : formatMoney(value);
    }

    function renderPostedSO() {
        const tbody = document.querySelector(
            ".posted-so-table tbody"
        );

        if (!tbody) return;

        const eligibleSOs = salesOrdersCache
            .filter(isEligibleSO)
            .sort(function (a, b) {
                return (
                    new Date(getSODate(b) || 0).getTime() -
                    new Date(getSODate(a) || 0).getTime()
                );
            });

        if (!eligibleSOs.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        No posted or partially delivered Sales Orders found.
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML = eligibleSOs.map(function (so) {
            const soNumber = getSONumber(so);
            const clientName = getClientName(so);
            const poNumber = getPONumber(so);
            const project = getProject(so);
            const status = getSOStatus(so);
            const statusLabel = getSOStatusLabel(status);
            const statusClass = getSOStatusClass(status);

            const deliveryAddress = getValue(so, [
                "DELIVERY_ADDRESS",
                "deliveryAddress"
            ], "—");

            return `
                <tr
                    class="so-row"
                    data-so-number="${escapeHTML(soNumber)}"
                    data-status="${escapeHTML(status)}">

                    <td>
                        <strong>${escapeHTML(soNumber || "—")}</strong>
                    </td>

                    <td>${escapeHTML(clientName)}</td>

                    <td>${escapeHTML(poNumber)}</td>

                    <td>${escapeHTML(project)}</td>

                    <td>${escapeHTML(deliveryAddress)}</td>

                    <td class="amount">${getSOAmount(so)}</td>

                    <td>
                        <span class="status ${statusClass}">
                            ${escapeHTML(statusLabel)}
                        </span>
                    </td>

                    <td>
                        <button
                            type="button"
                            class="btn btn-primary btn-small prepare-so-button">
                            ＋ PREPARE DR
                        </button>
                    </td>

                </tr>
            `;
        }).join("");
    }

    /* =====================================================
       SEARCH AND FILTERS
    ===================================================== */

    function applyFilters() {
        const mainSearch = (
            document.getElementById("deliveryMainSearch")?.value || ""
        ).trim().toLowerCase();

        const drSearch = (
            document.getElementById("deliveryDRSearch")?.value || ""
        ).trim().toLowerCase();

        const soSearch = (
            document.getElementById("deliverySOSearch")?.value || ""
        ).trim().toLowerCase();

        const mainStatus = normalizeText(
            document.getElementById("deliveryMainStatusFilter")?.value || "ALL"
        );

        const drStatus = normalizeText(
            document.getElementById("deliveryDRFilter")?.value || "ALL"
        );

        const soStatus = normalizeText(
            document.getElementById("deliverySOFilter")?.value || "ALL"
        );

        document.querySelectorAll(
            ".recent-dr-table tbody .dr-row"
        ).forEach(function (row) {
            const rowText = row.textContent.toLowerCase();
            const status = normalizeText(row.dataset.status || "");

            const searchMatch =
                (!mainSearch || rowText.includes(mainSearch)) &&
                (!drSearch || rowText.includes(drSearch));

            const mainMatch =
                mainStatus === "ALL" ||
                status === mainStatus;

            const drMatch =
                drStatus === "ALL" ||
                status === drStatus;

            row.style.display =
                searchMatch && mainMatch && drMatch ? "" : "none";
        });

        document.querySelectorAll(
            ".posted-so-table tbody .so-row"
        ).forEach(function (row) {
            const rowText = row.textContent.toLowerCase();
            const status = normalizeText(row.dataset.status || "");

            const searchMatch =
                !mainSearch ||
                rowText.includes(mainSearch);

            const soSearchMatch =
                !soSearch ||
                rowText.includes(soSearch);

            const statusMatch =
                soStatus === "ALL" ||
                (soStatus === "READY" && status === "POSTED") ||
                (soStatus === "PARTIAL" && status === "PARTIAL");

            row.style.display =
                searchMatch && soSearchMatch && statusMatch
                    ? ""
                    : "none";
        });
    }

    function setupSearchAndFilters() {
        [
            "deliveryMainSearch",
            "deliveryDRSearch",
            "deliverySOSearch"
        ].forEach(function (id) {
            const input = document.getElementById(id);

            if (input) {
                input.addEventListener("input", applyFilters);
            }
        });

        [
            "deliveryMainStatusFilter",
            "deliveryDRFilter",
            "deliverySOFilter"
        ].forEach(function (id) {
            const select = document.getElementById(id);

            if (select) {
                select.addEventListener("change", applyFilters);
            }
        });

        document.querySelectorAll(
            ".delivery-search-button, .search-button"
        ).forEach(function (button) {
            button.addEventListener("click", applyFilters);
        });
    }

    /* =====================================================
       DR ROW SELECTION
    ===================================================== */

    function setupDRRowSelection() {
        const tbody = document.querySelector(
            ".recent-dr-table tbody"
        );

        if (!tbody) return;

        tbody.addEventListener("click", function (event) {
            const row = event.target.closest(".dr-row");

            if (row) {
                selectDRRow(row);
            }
        });

        tbody.addEventListener("dblclick", function (event) {
            const row = event.target.closest(".dr-row");

            if (row) {
                openDRDetails(row);
            }
        });

        tbody.addEventListener("keydown", function (event) {
            if (event.key !== "Enter") return;

            const row = event.target.closest(".dr-row");

            if (row) {
                selectDRRow(row);
            }
        });
    }

    function selectDRRow(row) {
        document.querySelectorAll(
            ".recent-dr-table .dr-row"
        ).forEach(function (item) {
            item.classList.remove("selected");
        });

        row.classList.add("selected");

        const drNumber = row.dataset.drNumber || "";

        selectedDRRecord = deliveryReceiptsCache.find(
            function (dr) {
                return getDRNumber(dr) === drNumber;
            }
        ) || null;

        const selectionText = document.getElementById(
            "drSelectionText"
        );

        if (selectionText) {
            selectionText.textContent = drNumber
                ? drNumber + " selected"
                : "No Delivery Receipt selected";
        }

        localStorage.setItem(
            SELECTED_DR_STORAGE_KEY,
            JSON.stringify({
                drNumber: drNumber,
                selectedAt: new Date().toISOString()
            })
        );

        [
            "previewDRButton",
            "updateDRButton",
            "cancelDRButton",
            "postDRButton"
        ].forEach(function (id) {
            enableElement(id, true);
        });
    }

    function openDRDetails(row) {
        const listView = document.getElementById("deliveryListView");
        const detailsView = document.getElementById("drDetailsView");

        if (!detailsView) return;

        if (listView) {
            listView.style.display = "none";
        }

        detailsView.style.display = "block";

        const drNumber = row.dataset.drNumber || "";

        const title = detailsView.querySelector(
            "[data-dr-title]"
        ) || detailsView.querySelector(
            ".delivery-details-header h1"
        );

        if (title) {
            title.textContent = drNumber;
        }

        /*
         * The existing details/preview layouts are retained.
         * Their individual fields are not rebuilt by this list update.
         */
    }

    /* =====================================================
       VIEW NAVIGATION
    ===================================================== */

    function showDeliveryList() {
        [
            "prepareDRView",
            "drDetailsView",
            "drPreviewView"
        ].forEach(function (id) {
            const element = document.getElementById(id);

            if (element) {
                element.style.display = "none";
            }
        });

        const listView = document.getElementById("deliveryListView");

        if (listView) {
            listView.style.display = "block";
        }
    }

    function showDRPreview() {
        const listView = document.getElementById("deliveryListView");
        const previewView = document.getElementById("drPreviewView");

        if (!previewView) return;

        if (listView) {
            listView.style.display = "none";
        }

        previewView.style.display = "block";
    }

    function showDRPrepareView() {
        const listView = document.getElementById("deliveryListView");
        const prepareView = document.getElementById("prepareDRView");

        if (!prepareView) return;

        if (listView) {
            listView.style.display = "none";
        }

        prepareView.style.display = "block";
    }

    function setupBackButtons() {
        document.querySelectorAll(".back-button").forEach(
            function (button) {
                button.addEventListener("click", showDeliveryList);
            }
        );
    }

    function enableElement(id, enabled) {
        const element = document.getElementById(id);

        if (!element) return;

        element.disabled = !enabled;
        element.classList.toggle("disabled", !enabled);
    }

    /* =====================================================
       BUTTONS
    ===================================================== */

    function setupMainPrepareDR() {
        const button = document.getElementById("prepareDRButton");

        if (!button) return;

        button.addEventListener("click", function (event) {
            event.preventDefault();
            openCreateDeliveryReceipt();
        });
    }

    function setupPostedSOButtons() {
        const tbody = document.querySelector(
            ".posted-so-table tbody"
        );

        if (!tbody) return;

        tbody.addEventListener("click", function (event) {
            const button = event.target.closest(".prepare-so-button");

            if (!button) return;

            event.preventDefault();

            const row = button.closest(".so-row");

            if (!row) return;

            const soNumber = row.dataset.soNumber || "";

            const selectedSO = salesOrdersCache.find(
                function (so) {
                    return getSONumber(so) === soNumber;
                }
            );

            if (!selectedSO) {
                alert(
                    "Unable to find this Sales Order in the loaded records. Please refresh."
                );
                return;
            }

            openCreateDeliveryReceipt(selectedSO);
        });
    }

    function setupActionButtons() {
        const preview = document.getElementById("previewDRButton");
        const update = document.getElementById("updateDRButton");
        const cancel = document.getElementById("cancelDRButton");
        const post = document.getElementById("postDRButton");

        if (preview) {
            preview.addEventListener("click", showDRPreview);
        }

        if (update) {
            update.addEventListener("click", showDRPrepareView);
        }

        if (cancel) {
            cancel.addEventListener("click", function () {
                if (!selectedDRRecord) {
                    alert("Please select a DR first.");
                    return;
                }

                alert(
                    "Cancel DR still requires a connected backend action. No database record was changed."
                );
            });
        }

        if (post) {
            post.addEventListener("click", function () {
                if (!selectedDRRecord) {
                    alert("Please select a DR first.");
                    return;
                }

                alert(
                    "Post DR still requires a connected backend action. No database record was changed."
                );
            });
        }
    }

    /* =====================================================
       REFRESH
    ===================================================== */

    function setupRefreshButton() {
        const button = document.getElementById(
            "deliveryRefreshButton"
        );

        if (!button) return;

        button.addEventListener("click", async function () {
            if (isLoadingDeliveryData) return;

            const icon = button.querySelector(".refresh-icon");

            if (icon) {
                icon.classList.add("refreshing");
            }

            button.disabled = true;

            try {
                await loadDeliveryData();
            } finally {
                button.disabled = false;

                if (icon) {
                    icon.classList.remove("refreshing");
                }
            }
        });
    }

    /* =====================================================
       LOAD DATA
    ===================================================== */

    async function loadDeliveryData() {
        if (isLoadingDeliveryData) return;

        isLoadingDeliveryData = true;

        setText("totalDRCount", "…");
        setText("todayDRCount", "…");
        setText("ongoingDRCount", "…");
        setText("cancelledDRCount", "…");

        try {
            const results = await Promise.all([
                callDeliveryAPI("getDeliveryReceipts"),
                callDeliveryAPI("getSalesOrders")
            ]);

            deliveryReceiptsCache = extractRecords(
                results[0],
                [
                    "deliveryReceipts",
                    "records",
                    "data"
                ]
            );

            salesOrdersCache = extractRecords(
                results[1],
                [
                    "salesOrders",
                    "records",
                    "data"
                ]
            );

            console.log(
                "Delivery Receipts loaded:",
                deliveryReceiptsCache.length
            );

            console.log(
                "Sales Orders loaded:",
                salesOrdersCache.length
            );

            updateSummaryCards();
            renderRecentDR();
            renderPostedSO();
            applyFilters();

        } catch (error) {
            console.error("Delivery data loading failed:", error);

            setText("totalDRCount", "—");
            setText("todayDRCount", "—");
            setText("ongoingDRCount", "—");
            setText("cancelledDRCount", "—");

            showTableError(
                ".recent-dr-table tbody",
                "Unable to load Delivery Receipts. Click REFRESH to try again."
            );

            showTableError(
                ".posted-so-table tbody",
                "Unable to load Sales Orders. Click REFRESH to try again."
            );

        } finally {
            isLoadingDeliveryData = false;
        }
    }

    function showTableError(selector, message) {
        const tbody = document.querySelector(selector);

        if (!tbody) return;

        const columnCount = selector.includes("recent-dr")
            ? 7
            : 8;

        tbody.innerHTML = `
            <tr>
                <td colspan="${columnCount}" class="empty-state">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }

    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initDelivery() {
        console.log("Initializing Delivery Module...");

        setupMainPrepareDR();
        setupPostedSOButtons();
        setupRefreshButton();
        setupDRRowSelection();
        setupBackButtons();
        setupActionButtons();
        setupSearchAndFilters();

        await loadDeliveryData();

        console.log("Delivery Module READY.");
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initDelivery,
            { once: true }
        );
    } else {
        initDelivery();
    }

})();
