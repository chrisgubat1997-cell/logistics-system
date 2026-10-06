/* =========================================================
   LOGIS-TECH SYSTEM
   DASHBOARD JAVASCRIPT
   VERSION: 20261006

   PURPOSE:
   - Dashboard summary
   - Sales Order overview
   - Delivery overview
   - Finance snapshot
   - Fleet status
   - Attention required
   - Recent activity

   CURRENT DATA SOURCE:
   LocalStorage / TEST MODE

   FUTURE:
   Google Apps Script / Google Sheets API
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       STORAGE KEYS
       ===================================================== */

    const STORAGE_KEYS = {

        salesOrders: [
            "logitechSalesOrders",
            "logisTechSalesOrders",
            "salesOrders",
            "salesOrderRecords"
        ],

        deliveries: [
            "logitechDeliveries",
            "logisTechDeliveries",
            "deliveries",
            "deliveryRecords"
        ],

        deliveryReceipts: [
            "logitechDeliveryReceipts",
            "logisTechDeliveryReceipts",
            "deliveryReceipts",
            "deliveryReceiptRecords",
            "drRecords"
        ],

        invoices: [
            "logitechInvoices",
            "logisTechInvoices",
            "invoices",
            "invoiceRecords"
        ],

        payments: [
            "logitechPayments",
            "logisTechPayments",
            "payments",
            "paymentRecords",
            "logitechPaymentRecords"
        ],

        fleet: [
            "logitechFleet",
            "logisTechFleet",
            "fleet",
            "fleetRecords",
            "vehicles",
            "vehicleRecords"
        ]
    };


    /* =====================================================
       INITIALIZATION
       ===================================================== */

    document.addEventListener("DOMContentLoaded", function () {
        initializeDashboard();
    });


    window.initializeDashboard = initializeDashboard;


    function initializeDashboard() {

        updateDashboardDate();
        bindDashboardEvents();
        refreshDashboard();

    }


    /* =====================================================
       EVENT BINDINGS
       ===================================================== */

    function bindDashboardEvents() {

        const refreshButton =
            document.getElementById("dashboardRefreshBtn");

        if (refreshButton) {
            refreshButton.addEventListener("click", function () {
                refreshDashboard(true);
            });
        }


        const periodSelect =
            document.getElementById("salesOrderPeriod");

        if (periodSelect) {
            periodSelect.addEventListener("change", function () {
                refreshSalesOrderChart();
            });
        }


        document
            .querySelectorAll(".quick-action-btn")
            .forEach(function (button) {

                button.addEventListener("click", function () {

                    const action =
                        button.dataset.action;

                    handleQuickAction(action);

                });

            });

    }


    /* =====================================================
       REFRESH DASHBOARD
       ===================================================== */

    function refreshDashboard(showLoading) {

        const refreshButton =
            document.getElementById("dashboardRefreshBtn");

        if (showLoading && refreshButton) {
            refreshButton.classList.add("is-loading");
            refreshButton.textContent = "Refreshing...";
        }


        requestAnimationFrame(function () {

            try {

                const data = collectDashboardData();

                updateSummaryCards(data);
                updateSalesOrderPerformance(data);
                updateDeliveryPerformance(data);
                updateFinanceSnapshot(data);
                updateFleetStatus(data);
                updateAttentionRequired(data);
                updateRecentActivity(data);

            } catch (error) {

                console.error(
                    "LOGIS-TECH Dashboard Error:",
                    error
                );

            }


            if (showLoading && refreshButton) {

                setTimeout(function () {

                    refreshButton.classList.remove(
                        "is-loading"
                    );

                    refreshButton.textContent =
                        "Refresh";

                }, 350);

            }

        });

    }


    /* =====================================================
       COLLECT DATA
       ===================================================== */

    function collectDashboardData() {

        const salesOrders =
            readStorageArray(
                STORAGE_KEYS.salesOrders
            );

        const deliveries =
            readStorageArray(
                STORAGE_KEYS.deliveries
            );

        const deliveryReceipts =
            readStorageArray(
                STORAGE_KEYS.deliveryReceipts
            );

        const invoices =
            readStorageArray(
                STORAGE_KEYS.invoices
            );

        const payments =
            readStorageArray(
                STORAGE_KEYS.payments
            );

        const fleet =
            readStorageArray(
                STORAGE_KEYS.fleet
            );


        return {

            salesOrders,
            deliveries,
            deliveryReceipts,
            invoices,
            payments,
            fleet

        };

    }


    /* =====================================================
       LOCAL STORAGE READER
       ===================================================== */

    function readStorageArray(keys) {

        for (let i = 0; i < keys.length; i++) {

            const key = keys[i];

            try {

                const raw =
                    localStorage.getItem(key);

                if (!raw) {
                    continue;
                }

                const parsed =
                    JSON.parse(raw);

                if (Array.isArray(parsed)) {
                    return parsed;
                }

                if (
                    parsed &&
                    Array.isArray(parsed.data)
                ) {
                    return parsed.data;
                }

                if (
                    parsed &&
                    Array.isArray(parsed.records)
                ) {
                    return parsed.records;
                }

            } catch (error) {

                console.warn(
                    "Dashboard storage read error:",
                    key,
                    error
                );

            }

        }

        return [];

    }


    /* =====================================================
       SUMMARY CARDS
       ===================================================== */

    function updateSummaryCards(data) {

        const salesOrders =
            data.salesOrders;

        const deliveries =
            data.deliveries;

        const invoices =
            data.invoices;

        const payments =
            data.payments;

        const fleet =
            data.fleet;


        const totalSO =
            salesOrders.length;

        const activeDelivery =
            deliveries.filter(
                isActiveDelivery
            ).length;

        const pendingInvoice =
            invoices.filter(
                isPendingInvoice
            ).length;

        const outstandingPayment =
            calculateOutstandingPayment(
                invoices,
                payments
            );

        const delayedOrders =
            salesOrders.filter(
                isDelayedOrder
            ).length;

        const activeFleet =
            fleet.filter(
                isActiveVehicle
            ).length;


        setText(
            "dashboardTotalSO",
            formatNumber(totalSO)
        );

        setText(
            "dashboardSOThisMonth",
            formatNumber(
                countCurrentMonth(
                    salesOrders,
                    getSalesOrderDate
                )
            ) + " this month"
        );


        setText(
            "dashboardActiveDelivery",
            formatNumber(activeDelivery)
        );

        setText(
            "dashboardDeliveredToday",
            formatNumber(
                countToday(
                    deliveries,
                    getDeliveryDate
                )
            ) + " delivered today"
        );


        setText(
            "dashboardPendingInvoice",
            formatNumber(pendingInvoice)
        );


        setText(
            "dashboardOutstandingPayment",
            formatCurrency(
                outstandingPayment
            )
        );


        setText(
            "dashboardPaymentCount",
            formatNumber(
                payments.length
            ) + " payment records"
        );


        setText(
            "dashboardDelayedOrders",
            formatNumber(delayedOrders)
        );


        setText(
            "dashboardFleetActive",
            formatNumber(activeFleet)
        );


        setText(
            "dashboardFleetMaintenance",
            formatNumber(
                fleet.filter(
                    isMaintenanceVehicle
                ).length
            ) + " maintenance"
        );

    }


    /* =====================================================
       SALES ORDER PERFORMANCE
       ===================================================== */

    function updateSalesOrderPerformance(data) {

        const salesOrders =
            data.salesOrders;


        const total =
            salesOrders.length;


        const open =
            salesOrders.filter(
                isOpenSalesOrder
            ).length;


        const completed =
            salesOrders.filter(
                isCompletedSalesOrder
            ).length;


        const cancelled =
            salesOrders.filter(
                isCancelledSalesOrder
            ).length;


        setText(
            "dashboardSOTotal",
            formatNumber(total)
        );

        setText(
            "dashboardSOOpen",
            formatNumber(open)
        );

        setText(
            "dashboardSOCompleted",
            formatNumber(completed)
        );

        setText(
            "dashboardSOCancelled",
            formatNumber(cancelled)
        );


        refreshSalesOrderChart();

    }


    function refreshSalesOrderChart() {

        const periodSelect =
            document.getElementById(
                "salesOrderPeriod"
            );

        const period =
            periodSelect
                ? periodSelect.value
                : "6months";


        const salesOrders =
            readStorageArray(
                STORAGE_KEYS.salesOrders
            );


        const chartData =
            buildSalesChartData(
                salesOrders,
                period
            );


        const fills =
            document.querySelectorAll(
                ".bar-fill[data-month]"
            );


        const values =
            document.querySelectorAll(
                "[data-bar-value]"
            );


        let maxValue = 1;


        chartData.forEach(function (item) {

            if (item.value > maxValue) {
                maxValue = item.value;
            }

        });


        fills.forEach(function (fill) {

            const month =
                fill.dataset.month;

            const item =
                chartData.find(
                    function (row) {
                        return row.month === month;
                    }
                );


            const value =
                item ? item.value : 0;


            const percentage =
                Math.max(
                    3,
                    Math.round(
                        (value / maxValue) * 100
                    )
                );


            fill.style.height =
                percentage + "%";

        });


        values.forEach(function (valueElement) {

            const month =
                valueElement.dataset.barValue;

            const item =
                chartData.find(
                    function (row) {
                        return row.month === month;
                    }
                );


            valueElement.textContent =
                item
                    ? formatNumber(item.value)
                    : "0";

        });

    }


    function buildSalesChartData(
        salesOrders,
        period
    ) {

        const now = new Date();

        const months = [];


        let count = 6;


        if (period === "3months") {
            count = 3;
        }

        if (period === "12months") {
            count = 12;
        }


        for (
            let i = count - 1;
            i >= 0;
            i--
        ) {

            const date =
                new Date(
                    now.getFullYear(),
                    now.getMonth() - i,
                    1
                );


            months.push({

                month:
                    date.toLocaleDateString(
                        "en-US",
                        {
                            month: "short"
                        }
                    ).toUpperCase(),

                year:
                    date.getFullYear(),

                monthIndex:
                    date.getMonth(),

                value: 0

            });

        }


        salesOrders.forEach(function (order) {

            const date =
                parseDate(
                    getSalesOrderDate(order)
                );


            if (!date) {
                return;
            }


            months.forEach(function (item) {

                if (
                    item.year ===
                        date.getFullYear() &&
                    item.monthIndex ===
                        date.getMonth()
                ) {

                    item.value++;

                }

            });

        });


        return months;

    }


    /* =====================================================
       DELIVERY PERFORMANCE
       ===================================================== */

    function updateDeliveryPerformance(data) {

        const deliveries =
            data.deliveries;

        const deliveryReceipts =
            data.deliveryReceipts;


        const records =
            deliveries.length
                ? deliveries
                : deliveryReceipts;


        const total =
            records.length;


        const onTime =
            records.filter(
                isOnTimeDelivery
            ).length;


        const delayed =
            records.filter(
                isDelayedDelivery
            ).length;


        const delivered =
            records.filter(
                isDeliveredRecord
            ).length;


        const rate =
            total > 0
                ? Math.round(
                    (onTime / total) * 100
                )
                : 0;


        const averageLeadTime =
            calculateAverageLeadTime(
                records
            );


        setText(
            "dashboardOnTimeRate",
            rate + "%"
        );


        setText(
            "dashboardOnTimeCount",
            formatNumber(onTime)
        );


        setText(
            "dashboardDelayedCount",
            formatNumber(delayed)
        );


        setText(
            "dashboardDeliveredCount",
            formatNumber(delivered)
        );


        setText(
            "dashboardLeadTime",
            averageLeadTime
                ? averageLeadTime + " days"
                : "—"
        );


        const circle =
            document.getElementById(
                "deliveryPerformanceCircle"
            );


        if (circle) {

            circle.style.background =
                "conic-gradient(" +
                "#334155 " +
                (rate * 3.6) +
                "deg, " +
                "#edf1f6 " +
                (rate * 3.6) +
                "deg)";

        }

    }


    /* =====================================================
       FINANCE
       ===================================================== */

    function updateFinanceSnapshot(data) {

        const invoices =
            data.invoices;

        const payments =
            data.payments;

        const salesOrders =
            data.salesOrders;


        const soValue =
            salesOrders.reduce(
                function (total, order) {

                    return (
                        total +
                        getRecordAmount(order)
                    );

                },
                0
            );


        const invoiced =
            invoices.reduce(
                function (total, invoice) {

                    return (
                        total +
                        getRecordAmount(invoice)
                    );

                },
                0
            );


        const paid =
            payments.reduce(
                function (total, payment) {

                    return (
                        total +
                        getRecordAmount(payment)
                    );

                },
                0
            );


        const outstanding =
            Math.max(
                0,
                invoiced - paid
            );


        setText(
            "dashboardSOValue",
            formatCurrency(soValue)
        );


        setText(
            "dashboardInvoiced",
            formatCurrency(invoiced)
        );


        setText(
            "dashboardPaid",
            formatCurrency(paid)
        );


        setText(
            "dashboardFinanceOutstanding",
            formatCurrency(outstanding)
        );


        updateFinanceProgress(
            "invoiced",
            soValue,
            invoiced
        );

    }


    function updateFinanceProgress(
        type,
        total,
        value
    ) {

        const fill =
            document.querySelector(
                '[data-finance-progress="' +
                type +
                '"]'
            );


        if (!fill) {
            return;
        }


        let percentage = 0;


        if (total > 0) {

            percentage =
                Math.min(
                    100,
                    Math.round(
                        (value / total) * 100
                    )
                );

        }


        fill.style.width =
            percentage + "%";

    }


    /* =====================================================
       FLEET
       ===================================================== */

    function updateFleetStatus(data) {

        const fleet =
            data.fleet;


        const available =
            fleet.filter(
                isAvailableVehicle
            ).length;


        const onDelivery =
            fleet.filter(
                isOnDeliveryVehicle
            ).length;


        const maintenance =
            fleet.filter(
                isMaintenanceVehicle
            ).length;


        const inactive =
            fleet.filter(
                isInactiveVehicle
            ).length;


        setText(
            "fleetAvailable",
            formatNumber(available)
        );


        setText(
            "fleetOnDelivery",
            formatNumber(onDelivery)
        );


        setText(
            "fleetMaintenance",
            formatNumber(maintenance)
        );


        setText(
            "fleetInactive",
            formatNumber(inactive)
        );

    }


    /* =====================================================
       ATTENTION REQUIRED
       ===================================================== */

    function updateAttentionRequired(data) {

        const container =
            document.getElementById(
                "dashboardAttentionList"
            );


        if (!container) {
            return;
        }


        const attention = [];


        const delayed =
            data.salesOrders.filter(
                isDelayedOrder
            );


        const pendingInvoice =
            data.invoices.filter(
                isPendingInvoice
            );


        const maintenance =
            data.fleet.filter(
                isMaintenanceVehicle
            );


        if (delayed.length > 0) {

            attention.push({

                title:
                    delayed.length +
                    " delayed Sales Order" +
                    (
                        delayed.length > 1
                            ? "s"
                            : ""
                    ),

                description:
                    "Review delayed orders and delivery commitments."

            });

        }


        if (pendingInvoice.length > 0) {

            attention.push({

                title:
                    pendingInvoice.length +
                    " pending invoice" +
                    (
                        pendingInvoice.length > 1
                            ? "s"
                            : ""
                    ),

                description:
                    "Check delivered orders that still require invoicing."

            });

        }


        if (maintenance.length > 0) {

            attention.push({

                title:
                    maintenance.length +
                    " vehicle" +
                    (
                        maintenance.length > 1
                            ? "s"
                            : ""
                    ) +
                    " under maintenance",

                description:
                    "Review fleet availability and maintenance schedule."

            });

        }


        if (
            attention.length === 0
        ) {

            container.innerHTML = `
                <div class="attention-empty">
                    No urgent attention required.
                </div>
            `;

            return;

        }


        container.innerHTML =
            attention
                .slice(0, 6)
                .map(function (item) {

                    return `
                        <div class="attention-item">
                            <div class="attention-dot"></div>

                            <div class="attention-content">
                                <div class="attention-title">
                                    ${escapeHtml(item.title)}
                                </div>

                                <div class="attention-description">
                                    ${escapeHtml(item.description)}
                                </div>
                            </div>
                        </div>
                    `;

                })
                .join("");

    }


    /* =====================================================
       RECENT ACTIVITY
       ===================================================== */

    function updateRecentActivity(data) {

        const container =
            document.getElementById(
                "dashboardActivityList"
            );


        const countElement =
            document.getElementById(
                "activityCount"
            );


        if (!container) {
            return;
        }


        const activities =
            buildRecentActivities(data);


        if (countElement) {

            countElement.textContent =
                activities.length + " recent";

        }


        if (activities.length === 0) {

            container.innerHTML = `
                <div class="activity-empty">
                    No recent activity available.
                </div>
            `;

            return;

        }


        container.innerHTML =
            activities
                .slice(0, 8)
                .map(function (item) {

                    return `
                        <div class="activity-item">

                            <div class="activity-icon">
                                ${escapeHtml(item.icon)}
                            </div>

                            <div class="activity-content">

                                <div class="activity-title">
                                    ${escapeHtml(item.title)}
                                </div>

                                <div class="activity-description">
                                    ${escapeHtml(item.description)}
                                </div>

                            </div>

                            <div class="activity-time">
                                ${escapeHtml(item.time)}
                            </div>

                        </div>
                    `;

                })
                .join("");

    }


    function buildRecentActivities(data) {

        const activities = [];


        data.salesOrders
            .slice()
            .sort(
                sortByNewest(
                    getSalesOrderDate
                )
            )
            .slice(0, 4)
            .forEach(function (order) {

                activities.push({

                    date:
                        parseDate(
                            getSalesOrderDate(order)
                        ),

                    icon: "SO",

                    title:
                        "Sales Order",

                    description:
                        getRecordReference(order) ||
                        "New sales order record",

                    time:
                        formatRelativeTime(
                            getSalesOrderDate(order)
                        )

                });

            });


        data.payments
            .slice()
            .sort(
                sortByNewest(
                    getPaymentDate
                )
            )
            .slice(0, 3)
            .forEach(function (payment) {

                activities.push({

                    date:
                        parseDate(
                            getPaymentDate(payment)
                        ),

                    icon: "₱",

                    title:
                        "Payment",

                    description:
                        getRecordReference(payment) ||
                        "Payment recorded",

                    time:
                        formatRelativeTime(
                            getPaymentDate(payment)
                        )

                });

            });


        data.deliveries
            .slice()
            .sort(
                sortByNewest(
                    getDeliveryDate
                )
            )
            .slice(0, 3)
            .forEach(function (delivery) {

                activities.push({

                    date:
                        parseDate(
                            getDeliveryDate(delivery)
                        ),

                    icon: "DR",

                    title:
                        "Delivery",

                    description:
                        getRecordReference(delivery) ||
                        "Delivery activity",

                    time:
                        formatRelativeTime(
                            getDeliveryDate(delivery)
                        )

                });

            });


        activities.sort(
            function (a, b) {

                return (
                    (b.date
                        ? b.date.getTime()
                        : 0) -
                    (a.date
                        ? a.date.getTime()
                        : 0)
                );

            }
        );


        return activities;

    }


    /* =====================================================
       STATUS HELPERS
       ===================================================== */

    function isActiveDelivery(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );

        return [
            "active",
            "in transit",
            "transit",
            "for delivery",
            "out for delivery",
            "pending delivery",
            "ongoing"
        ].includes(status);

    }


    function isPendingInvoice(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        if (
            [
                "pending",
                "for invoice",
                "pending invoice",
                "unbilled",
                "not invoiced"
            ].includes(status)
        ) {
            return true;
        }


        if (
            record &&
            (
                record.invoiceStatus ===
                    "Pending" ||
                record.invoiced === false
            )
        ) {
            return true;
        }


        return false;

    }


    function isDelayedOrder(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        if (
            [
                "delayed",
                "delay",
                "late",
                "overdue"
            ].includes(status)
        ) {
            return true;
        }


        const committed =
            parseDate(
                getAnyValue(
                    record,
                    [
                        "committedDate",
                        "commitmentDate",
                        "dateCommitted",
                        "deliveryCommitment"
                    ]
                )
            );


        if (
            committed &&
            !isCompletedSalesOrder(record)
        ) {

            return (
                startOfDay(committed) <
                startOfDay(new Date())
            );

        }


        return false;

    }


    function isOpenSalesOrder(record) {

        return !(
            isCompletedSalesOrder(record) ||
            isCancelledSalesOrder(record)
        );

    }


    function isCompletedSalesOrder(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        return [
            "completed",
            "complete",
            "closed",
            "delivered",
            "done"
        ].includes(status);

    }


    function isCancelledSalesOrder(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        return [
            "cancelled",
            "canceled",
            "void"
        ].includes(status);

    }


    function isOnTimeDelivery(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        if (
            status === "on time" ||
            status === "ontime" ||
            status === "on-time"
        ) {
            return true;
        }


        const committed =
            parseDate(
                getAnyValue(
                    record,
                    [
                        "committedDate",
                        "dateCommitted",
                        "committed",
                        "commitmentDate"
                    ]
                )
            );


        const actual =
            parseDate(
                getAnyValue(
                    record,
                    [
                        "actualDate",
                        "dateDelivered",
                        "deliveredDate",
                        "deliveryDate"
                    ]
                )
            );


        if (
            committed &&
            actual
        ) {

            return (
                startOfDay(actual) <=
                startOfDay(committed)
            );

        }


        return false;

    }


    function isDelayedDelivery(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        if (
            [
                "delayed",
                "delay",
                "late",
                "overdue"
            ].includes(status)
        ) {
            return true;
        }


        return false;

    }


    function isDeliveredRecord(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        return [
            "delivered",
            "completed",
            "complete",
            "closed",
            "done"
        ].includes(status) ||
        Boolean(
            getAnyValue(
                record,
                [
                    "dateDelivered",
                    "deliveredDate",
                    "actualDate"
                ]
            )
        );

    }


    /* =====================================================
       FLEET HELPERS
       ===================================================== */

    function isActiveVehicle(record) {

        return !isInactiveVehicle(record);

    }


    function isAvailableVehicle(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        return [
            "available",
            "ready",
            "idle"
        ].includes(status);

    }


    function isOnDeliveryVehicle(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        return [
            "on delivery",
            "delivery",
            "in transit",
            "transit",
            "dispatched"
        ].includes(status);

    }


    function isMaintenanceVehicle(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        return [
            "maintenance",
            "under maintenance",
            "repair",
            "under repair"
        ].includes(status);

    }


    function isInactiveVehicle(record) {

        const status =
            normalizeStatus(
                getStatus(record)
            );


        return [
            "inactive",
            "retired",
            "decommissioned"
        ].includes(status);

    }


    /* =====================================================
       FINANCE HELPERS
       ===================================================== */

    function calculateOutstandingPayment(
        invoices,
        payments
    ) {

        const invoiced =
            invoices.reduce(
                function (sum, invoice) {

                    return (
                        sum +
                        getRecordAmount(invoice)
                    );

                },
                0
            );


        const paid =
            payments.reduce(
                function (sum, payment) {

                    return (
                        sum +
                        getRecordAmount(payment)
                    );

                },
                0
            );


        return Math.max(
            0,
            invoiced - paid
        );

    }


    function getRecordAmount(record) {

        if (!record) {
            return 0;
        }


        const possibleFields = [

            "amount",

            "totalAmount",

            "grandTotal",

            "netAmount",

            "invoiceAmount",

            "paymentAmount",

            "total",

            "totalValue",

            "orderValue",

            "salesOrderValue"

        ];


        for (
            let i = 0;
            i < possibleFields.length;
            i++
        ) {

            const value =
                parseMoney(
                    record[
                        possibleFields[i]
                    ]
                );


            if (
                !isNaN(value) &&
                value !== 0
            ) {
                return value;
            }

        }


        return 0;

    }


    /* =====================================================
       DELIVERY LEAD TIME
       ===================================================== */

    function calculateAverageLeadTime(
        records
    ) {

        const leadTimes = [];


        records.forEach(function (record) {

            const transfer =
                parseDate(
                    getAnyValue(
                        record,
                        [
                            "dateTransfer",
                            "transferDate",
                            "dateTransferred"
                        ]
                    )
                );


            const delivered =
                parseDate(
                    getAnyValue(
                        record,
                        [
                            "dateDelivered",
                            "deliveredDate",
                            "actualDate"
                        ]
                    )
                );


            if (
                transfer &&
                delivered
            ) {

                const diff =
                    Math.round(
                        (
                            startOfDay(
                                delivered
                            ).getTime() -
                            startOfDay(
                                transfer
                            ).getTime()
                        ) /
                        86400000
                    );


                if (diff >= 0) {
                    leadTimes.push(diff);
                }

            }

        });


        if (
            leadTimes.length === 0
        ) {
            return 0;
        }


        const total =
            leadTimes.reduce(
                function (sum, value) {
                    return sum + value;
                },
                0
            );


        return Math.round(
            total / leadTimes.length
        );

    }


    /* =====================================================
       DATE HELPERS
       ===================================================== */

    function getSalesOrderDate(record) {

        return getAnyValue(
            record,
            [
                "date",
                "soDate",
                "salesOrderDate",
                "createdDate",
                "createdAt"
            ]
        );

    }


    function getDeliveryDate(record) {

        return getAnyValue(
            record,
            [
                "dateDelivered",
                "deliveredDate",
                "actualDate",
                "date",
                "deliveryDate",
                "createdDate"
            ]
        );

    }


    function getPaymentDate(record) {

        return getAnyValue(
            record,
            [
                "paymentDate",
                "date",
                "createdDate",
                "createdAt"
            ]
        );

    }


    function parseDate(value) {

        if (!value) {
            return null;
        }


        if (
            value instanceof Date
        ) {
            return isNaN(value.getTime())
                ? null
                : value;
        }


        const date =
            new Date(value);


        if (
            isNaN(date.getTime())
        ) {
            return null;
        }


        return date;

    }


    function startOfDay(date) {

        const result =
            new Date(date);


        result.setHours(
            0,
            0,
            0,
            0
        );


        return result;

    }


    function countToday(
        records,
        dateGetter
    ) {

        const today =
            startOfDay(
                new Date()
            );


        return records.filter(
            function (record) {

                const date =
                    parseDate(
                        dateGetter(record)
                    );


                return (
                    date &&
                    startOfDay(date).getTime() ===
                    today.getTime()
                );

            }
        ).length;

    }


    function countCurrentMonth(
        records,
        dateGetter
    ) {

        const now =
            new Date();


        return records.filter(
            function (record) {

                const date =
                    parseDate(
                        dateGetter(record)
                    );


                if (!date) {
                    return false;
                }


                return (
                    date.getFullYear() ===
                        now.getFullYear() &&
                    date.getMonth() ===
                        now.getMonth()
                );

            }
        ).length;

    }


    /* =====================================================
       GENERAL HELPERS
       ===================================================== */

    function getStatus(record) {

        return getAnyValue(
            record,
            [
                "status",
                "Status",
                "orderStatus",
                "deliveryStatus",
                "invoiceStatus",
                "paymentStatus",
                "vehicleStatus"
            ]
        );

    }


    function getRecordReference(record) {

        return getAnyValue(
            record,
            [
                "soNumber",
                "soNo",
                "salesOrderNumber",
                "SO",
                "invoiceNumber",
                "invoiceNo",
                "drNumber",
                "drNo",
                "reference",
                "referenceNo",
                "vehicleNumber",
                "plateNumber"
            ]
        ) || "";

    }


    function getAnyValue(
        record,
        fields
    ) {

        if (!record) {
            return "";
        }


        for (
            let i = 0;
            i < fields.length;
            i++
        ) {

            const field =
                fields[i];


            if (
                record[field] !==
                undefined &&
                record[field] !==
                null &&
                record[field] !== ""
            ) {

                return record[field];

            }

        }


        return "";

    }


    function normalizeStatus(value) {

        return String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

    }


    function parseMoney(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }


        if (
            typeof value === "number"
        ) {
            return isFinite(value)
                ? value
                : 0;
        }


        const cleaned =
            String(value)
                .replace(/₱/g, "")
                .replace(/,/g, "")
                .replace(/[^\d.-]/g, "");


        const number =
            parseFloat(cleaned);


        return isFinite(number)
            ? number
            : 0;

    }


    function formatCurrency(value) {

        const number =
            Number(value) || 0;


        return "₱" +
            number.toLocaleString(
                "en-PH",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

    }


    function formatNumber(value) {

        return (
            Number(value) || 0
        ).toLocaleString(
            "en-PH"
        );

    }


    function formatRelativeTime(value) {

        const date =
            parseDate(value);


        if (!date) {
            return "—";
        }


        const diff =
            Date.now() -
            date.getTime();


        const minutes =
            Math.floor(
                diff / 60000
            );


        if (minutes < 1) {
            return "Just now";
        }


        if (minutes < 60) {
            return minutes + "m ago";
        }


        const hours =
            Math.floor(
                minutes / 60
            );


        if (hours < 24) {
            return hours + "h ago";
        }


        const days =
            Math.floor(
                hours / 24
            );


        if (days < 7) {
            return days + "d ago";
        }


        return date.toLocaleDateString(
            "en-PH",
            {
                month: "short",
                day: "numeric"
            }
        );

    }


    function sortByNewest(
        getter
    ) {

        return function (a, b) {

            const dateA =
                parseDate(
                    getter(a)
                );

            const dateB =
                parseDate(
                    getter(b)
                );


            return (
                (dateB
                    ? dateB.getTime()
                    : 0) -
                (dateA
                    ? dateA.getTime()
                    : 0)
            );

        };

    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {
            element.textContent =
                value;
        }

    }


    function updateDashboardDate() {

        const element =
            document.getElementById(
                "dashboardDate"
            );


        if (!element) {
            return;
        }


        const now =
            new Date();


        element.textContent =
            now.toLocaleDateString(
                "en-PH",
                {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }
            );

    }


    function escapeHtml(value) {

        return String(
            value ?? ""
        )
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =====================================================
       QUICK ACTIONS
       ===================================================== */

    function handleQuickAction(
        action
    ) {

        switch (action) {

            case "sales":
                navigateToMainPage(
                    "sales"
                );
                break;


            case "delivery":
                navigateToMainPage(
                    "delivery"
                );
                break;


            case "invoice":
                navigateToMainPage(
                    "invoice"
                );
                break;


            case "payment":
                navigateToMainPage(
                    "payment"
                );
                break;

        }

    }


    function navigateToMainPage(
        page
    ) {

        try {

            if (
                window.parent &&
                window.parent !== window &&
                typeof window.parent.showPage ===
                    "function"
            ) {

                window.parent.showPage(
                    page,
                    null
                );

                return;

            }

        } catch (error) {

            console.warn(
                "Dashboard navigation error:",
                error
            );

        }

    }


})();
