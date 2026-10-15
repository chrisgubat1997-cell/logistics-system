/* =========================================================
   LOGIS-TECH SYSTEM
   REPORT MODULE
   File: js/report.js
   Version: 20261015-02

   DATA POLICY:
   - All report data is loaded from the Google Apps Script API.
   - No LocalStorage fallback: failed sources remain empty and
     are reported clearly so stale browser data is never shown.
   ========================================================= */


/* =========================================================
   STATE
========================================================= */

let reportInitialized = false;

let reportData = {
    salesOrders: [],
    payments: [],
    invoices: [],
    deliveries: [],
    deliveryReceipts: [],
    fleet: []
};

let filteredReportData = {
    salesOrders: [],
    payments: [],
    invoices: [],
    deliveries: [],
    deliveryReceipts: [],
    fleet: []
};

let currentReport = "executive";
let reportDataSourceErrors = [];


/* =========================================================
   INITIALIZE
========================================================= */

function initializeReport() {

    if (reportInitialized) {
        return;
    }

    reportInitialized = true;

    setDefaultReportDates();

    populateClientFilter();

    populateStatusFilter();

    bindReportEvents();

    loadAllReportData().then(function() {
        populateClientFilter(false); populateStatusFilter(false); applyReportFilters(); showReport("executive"); setGeneratedDate();
    }).catch(function(error) { console.error("Reports initialization failed:",error); applyReportFilters(); showReport("executive"); });

}


/* =========================================================
   LOAD ALL DATA
========================================================= */

const REPORT_API_URL = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
async function reportApi(action) {
    const response = await fetch(REPORT_API_URL, {method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:action,data:{}})});
    if (!response.ok) throw new Error(action + " failed: HTTP " + response.status);
    const result = await response.json();
    if (result && result.success === false) throw new Error(result.message || action + " failed");
    return result && result.data ? result.data : result;
}
function reportArray(result, keys) {
    if (Array.isArray(result)) return result;
    if (!result || typeof result !== "object") return [];
    for (const key of keys) {
        if (Array.isArray(result[key])) return result[key];
    }
    // Some Apps Script actions wrap records one level deeper.
    if (result.data && result.data !== result) return reportArray(result.data, keys);
    return [];
}
function hasReportArrayPayload(result, keys) {
    if (Array.isArray(result)) return true;
    if (!result || typeof result !== "object") return false;
    if (keys.some(key => Array.isArray(result[key]))) return true;
    return !!(result.data && result.data !== result && hasReportArrayPayload(result.data, keys));
}
function normalizeReportRecord(record, type) {
    const r = Object.assign({}, record || {});
    const alias = (to, keys) => { if (r[to] !== undefined && r[to] !== null && r[to] !== "") return; for (const k of keys) if (r[k] !== undefined && r[k] !== null && r[k] !== "") { r[to] = r[k]; return; } };
    alias("date", ["DATE_CREATION","SO_DATE","PAYMENT_DATE","INVOICE_DATE","DATE_TRANSFER","TRIP_DATE","FUEL_DATE","MAINTENANCE_DATE","REQUEST_DATE","DATE","CREATED_AT"]);
    alias("createdAt", ["CREATED_AT","UPDATED_AT"]); alias("status", ["STATUS","PAYMENT_STATUS","INVOICE_STATUS","SO_STATUS","DELIVERY_STATUS"]);
    alias("client", ["CLIENT_NAME","CUSTOMER_NAME","CLIENT","CUSTOMER"]); alias("clientName", ["CLIENT_NAME","CUSTOMER_NAME","CLIENT","CUSTOMER"]);
    alias("project", ["PROJECT","PROJECT_NAME"]); alias("projectName", ["PROJECT","PROJECT_NAME"]);
    alias("soNo", ["SO_NUMBER","SO_NO","SALES_ORDER_NO"]); alias("salesOrderNo", ["SO_NUMBER","SO_NO","SALES_ORDER_NO"]); alias("salesOrderNumber", ["SO_NUMBER","SO_NO","SALES_ORDER_NO"]);
    alias("drNo", ["DR_NUMBER","DR_NO","DELIVERY_RECEIPT_NO"]); alias("deliveryNo", ["DR_NUMBER","DR_NO","DELIVERY_RECEIPT_NO"]);
    alias("dateTransfer", ["DATE_TRANSFER","TRANSFER_DATE"]); alias("transferDate", ["DATE_TRANSFER","TRANSFER_DATE"]); alias("committedDate", ["COMMITTED_DATE","DATE_COMMITTED"]); alias("dateDelivered", ["DATE_DELIVERED","DELIVERED_DATE"]);
    alias("total", ["SO_TOTAL","GRAND_TOTAL","TOTAL_AMOUNT","TOTAL","AMOUNT_DUE","FINAL_AMOUNT_DUE","TOTAL_SALES"]); alias("soTotal", ["SO_TOTAL","GRAND_TOTAL","TOTAL_AMOUNT","TOTAL"]); alias("grandTotal", ["GRAND_TOTAL","TOTAL_AMOUNT","SO_TOTAL"]);
    alias("amountDue", ["FINAL_AMOUNT_DUE","AMOUNT_DUE","TOTAL_AMOUNT","TOTAL_SALES"]); alias("invoiceAmount", ["FINAL_AMOUNT_DUE","AMOUNT_DUE","TOTAL_AMOUNT","TOTAL_SALES"]); alias("netPayable", ["NET_PAYABLE","FINAL_AMOUNT_DUE","AMOUNT_DUE"]); alias("ewtAmount", ["EWT_AMOUNT","EWT"]);
    alias("paymentNo", ["PAYMENT_NO"]); alias("paymentDate", ["PAYMENT_DATE","DATE"]); alias("paymentAmount", ["CURRENT_PAYMENT","AMOUNT","PAYMENT_AMOUNT"]); alias("currentPayment", ["CURRENT_PAYMENT","AMOUNT","PAYMENT_AMOUNT"]); alias("paymentStatus", ["PAYMENT_STATUS","STATUS"]); alias("paymentMethod", ["PAYMENT_METHOD"]); alias("receiptNo", ["RECEIPT_NO"]);
    alias("invoiceNo", ["INVOICE_NO"]); alias("invoiceDate", ["INVOICE_DATE","DATE"]); alias("invoiceStatus", ["INVOICE_STATUS","STATUS"]); alias("terms", ["TERMS","PAYMENT_TERMS"]); alias("soStatus", ["STATUS","SO_STATUS"]);
    alias("vehicle", ["VEHICLE_CODE","VEHICLE","PLATE_NUMBER","PLATE_NO"]); alias("totalKM", ["TOTAL_KM","ACTUAL_KM","KM"]); alias("fuelUsed", ["LITERS","FUEL_LITERS"]); alias("maintenanceCost", ["FINAL_COST","COST","ESTIMATED_COST"]); alias("idleDays", ["IDLE_DAYS"]);
    if (type === "fleet") r.date = r.TRIP_DATE || r.FUEL_DATE || r.MAINTENANCE_DATE || r.REQUEST_DATE || r.CREATED_AT || r.date;
    return r;
}
function buildFleetReportRows(data) {
    const rows = [];
    reportArray(data, ["tripTickets"]).forEach(r0 => { const r=normalizeReportRecord(r0,"fleet"),a=Number(r.START_KM||0),b=Number(r.END_KM||0);r.totalKM=Number(r.TOTAL_KM||(b>a?b-a:0))||0;r.fuelUsed=0;r.trips=1;r.maintenanceCost=0;r.idleDays=0;rows.push(r); });
    reportArray(data, ["fuelTransactions"]).forEach(r0 => { const r=normalizeReportRecord(r0,"fleet");r.totalKM=0;r.fuelUsed=Number(r.LITERS||0)||0;r.trips=0;r.maintenanceCost=0;r.idleDays=0;rows.push(r); });
    reportArray(data, ["maintenance"]).forEach(r0 => { const r=normalizeReportRecord(r0,"fleet");r.totalKM=0;r.fuelUsed=0;r.trips=0;r.maintenanceCost=Number(r.FINAL_COST||r.COST||r.ESTIMATED_COST||0)||0;r.idleDays=Number(r.IDLE_DAYS||0)||0;rows.push(r); });
    return rows;
}
async function loadAllReportData() {
    const badge = document.getElementById("reportDataSourceStatus");
    if (badge) {
        badge.textContent = "Connecting to Google Sheets…";
        badge.className = "report-data-source is-loading";
        badge.removeAttribute("title");
    }

    reportDataSourceErrors = [];
    const requests = [
        { name: "Sales Orders", key: "salesOrders", action: "getSalesOrders", aliases: ["salesOrders", "records", "orders"] },
        { name: "Payments", key: "payments", action: "getPayments", aliases: ["payments", "records"] },
        { name: "Invoices", key: "invoices", action: "getInvoices", aliases: ["invoices", "records"] },
        { name: "Delivery Receipts", key: "deliveryReceipts", action: "getDeliveryReceipts", aliases: ["deliveryReceipts", "deliveries", "records", "drs"] },
        { name: "Fleet", key: "fleet", action: "getFleetAnalyticsData", aliases: ["fleet", "records"] }
    ];

    const results = await Promise.allSettled(
        requests.map(source => reportApi(source.action))
    );

    // Clear all collections first so old records cannot remain after a failed refresh.
    reportData = {
        salesOrders: [],
        payments: [],
        invoices: [],
        deliveries: [],
        deliveryReceipts: [],
        fleet: []
    };

    let live = 0;
    results.forEach((result, index) => {
        const source = requests[index];
        if (result.status !== "fulfilled") {
            reportDataSourceErrors.push(source.name + ": " + (result.reason?.message || "Database request failed"));
            console.error("Reports database source unavailable:", source.name, result.reason);
            return;
        }

        const payload = result.value;
        if (source.key === "fleet") {
            const fleetKeys = ["tripTickets", "fuelTransactions", "maintenance", "fleet", "records"];
            if (!hasReportArrayPayload(payload, fleetKeys)) {
                reportDataSourceErrors.push(source.name + ": API response did not contain expected fleet data.");
                console.error("Reports API returned an unexpected fleet payload:", payload);
                return;
            }
            live++;
            reportData.fleet = buildFleetReportRows(payload);
            return;
        }

        if (!hasReportArrayPayload(payload, source.aliases)) {
            reportDataSourceErrors.push(source.name + ": API response did not contain the expected record list.");
            console.error("Reports API returned an unexpected payload:", source.name, payload);
            return;
        }
        live++;
        const rows = reportArray(payload, source.aliases)
            .map(row => normalizeReportRecord(row, source.key));

        if (source.key === "salesOrders") reportData.salesOrders = rows;
        if (source.key === "payments") reportData.payments = rows;
        if (source.key === "invoices") reportData.invoices = rows;
        if (source.key === "deliveryReceipts") {
            reportData.deliveryReceipts = rows;
            reportData.deliveries = rows.slice();
        }
    });

    filteredReportData = cloneReportData(reportData);

    if (badge) {
        if (live === requests.length) {
            badge.textContent = "LIVE DATABASE DATA · " + live + "/" + requests.length + " SOURCES";
            badge.className = "report-data-source is-live";
        } else if (live > 0) {
            badge.textContent = "DATABASE PARTIAL · " + live + "/" + requests.length + " SOURCES";
            badge.className = "report-data-source is-partial";
        } else {
            badge.textContent = "DATABASE UNAVAILABLE · 0/" + requests.length + " SOURCES";
            badge.className = "report-data-source is-error";
        }
        if (reportDataSourceErrors.length) {
            badge.title = reportDataSourceErrors.join("\n");
        } else {
            badge.title = "All report sources loaded directly from Google Apps Script.";
        }
    }

    console.info("LOGIS-TECH Reports: database sources loaded", {
        connectedSources: live,
        totalSources: requests.length,
        recordCounts: {
            salesOrders: reportData.salesOrders.length,
            deliveryReceipts: reportData.deliveryReceipts.length,
            invoices: reportData.invoices.length,
            payments: reportData.payments.length,
            fleet: reportData.fleet.length
        },
        errors: reportDataSourceErrors
    });

    return { connectedSources: live, totalSources: requests.length, errors: reportDataSourceErrors.slice() };
}


/* =========================================================
   CLONE DATA
========================================================= */

function cloneReportData(data) {

    return {

        salesOrders: [...(data.salesOrders || [])],

        payments: [...(data.payments || [])],

        invoices: [...(data.invoices || [])],

        deliveries: [...(data.deliveries || [])],

        deliveryReceipts:
            [...(data.deliveryReceipts || [])],

        fleet: [...(data.fleet || [])]

    };

}


/* =========================================================
   DEFAULT DATES
========================================================= */

function setDefaultReportDates() {

    const fromInput =
        document.getElementById("reportDateFrom");

    const toInput =
        document.getElementById("reportDateTo");

    if (!fromInput || !toInput) {
        return;
    }

    const today = new Date();

    const firstDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
    );

    fromInput.value =
        formatDateForInput(firstDay);

    toInput.value =
        formatDateForInput(today);

}


/* =========================================================
   EVENT BINDING
========================================================= */

function bindReportEvents() {

    document
        .querySelectorAll(".report-nav-item")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const reportName =
                        button.dataset.report;

                    if (reportName) {
                        showReport(reportName);
                    }

                }
            );

        });


    const applyButton =
        document.getElementById(
            "applyReportFilterBtn"
        );

    if (applyButton) {

        applyButton.addEventListener(
            "click",
            () => {

                loadAllReportData().then(function() { populateClientFilter(false); populateStatusFilter(false); applyReportFilters(); });

            }
        );

    }


    const clearButton =
        document.getElementById(
            "clearReportFilterBtn"
        );

    if (clearButton) {

        clearButton.addEventListener(
            "click",
            clearReportFilters
        );

    }


    const searchInput =
        document.getElementById(
            "reportSearch"
        );

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            debounce(
                applyReportFilters,
                250
            )
        );

    }


    const printButton =
        document.getElementById(
            "printReportBtn"
        );

    if (printButton) {

        printButton.addEventListener(
            "click",
            () => {

                window.print();

            }
        );

    }


    const exportButton =
        document.getElementById(
            "exportReportBtn"
        );

    if (exportButton) {

        exportButton.addEventListener(
            "click",
            exportCurrentReport
        );

    }


    const backButton =
        document.getElementById(
            "backToDashboardBtn"
        );

    if (backButton) {

        backButton.addEventListener(
            "click",
            () => {

                window.location.href =
                    "../index.html";

            }
        );

    }


    const chartPeriod =
        document.getElementById(
            "summaryChartPeriod"
        );

    if (chartPeriod) {

        chartPeriod.addEventListener(
            "change",
            renderExecutiveReport
        );

    }

}


/* =========================================================
   SHOW REPORT
========================================================= */

function showReport(reportName) {

    currentReport = reportName;

    document
        .querySelectorAll(".report-view")
        .forEach(view => {

            view.classList.remove("active");

        });


    const selectedView =
        document.getElementById(
            `report-${reportName}`
        );

    if (selectedView) {
        selectedView.classList.add("active");
    }


    document
        .querySelectorAll(".report-nav-item")
        .forEach(button => {

            button.classList.toggle(
                "active",
                button.dataset.report === reportName
            );

        });


    const title =
        getReportTitle(reportName);

    const titleElement =
        document.getElementById(
            "activeReportTitle"
        );

    if (titleElement) {
        titleElement.textContent = title;
    }


    renderCurrentReport();

}


/* =========================================================
   REPORT TITLE
========================================================= */

function getReportTitle(reportName) {

    const titles = {

        executive:
            "Executive Summary",

        "sales-order":
            "Sales Order Report",

        delivery:
            "Delivery Report",

        dr:
            "DR Monitoring",

        invoice:
            "Invoice Report",

        payment:
            "Payment Report",

        receivable:
            "Accounts Receivable",

        fleet:
            "Fleet Report",

        management:
            "Management Report"

    };

    return titles[reportName] ||
        "Reports";

}


/* =========================================================
   RENDER CURRENT REPORT
========================================================= */

function renderCurrentReport() {

    switch (currentReport) {

        case "executive":
            renderExecutiveReport();
            break;

        case "sales-order":
            renderSalesOrderReport();
            break;

        case "delivery":
            renderDeliveryReport();
            break;

        case "dr":
            renderDRReport();
            break;

        case "invoice":
            renderInvoiceReport();
            break;

        case "payment":
            renderPaymentReport();
            break;

        case "receivable":
            renderReceivableReport();
            break;

        case "fleet":
            renderFleetReport();
            break;

        case "management":
            renderManagementReport();
            break;

    }
    renderAdditionalReportCharts(currentReport);

}


/* =========================================================
   FILTERS
========================================================= */

function applyReportFilters() {

    const from =
        document.getElementById(
            "reportDateFrom"
        )?.value || "";

    const to =
        document.getElementById(
            "reportDateTo"
        )?.value || "";

    const client =
        document.getElementById(
            "reportClientFilter"
        )?.value || "";

    const status =
        document.getElementById(
            "reportStatusFilter"
        )?.value || "";

    const search =
        (
            document.getElementById(
                "reportSearch"
            )?.value || ""
        )
        .trim()
        .toLowerCase();


    filteredReportData = {

        salesOrders:
            filterRecords(
                reportData.salesOrders,
                {
                    from,
                    to,
                    client,
                    status,
                    search,
                    dateFields: [
                        "date",
                        "orderDate",
                        "salesOrderDate",
                        "createdAt"
                    ],
                    clientFields: [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ],
                    statusFields: [
                        "status",
                        "soStatus",
                        "salesOrderStatus"
                    ]
                }
            ),


        payments:
            filterRecords(
                reportData.payments,
                {
                    from,
                    to,
                    client,
                    status,
                    search,
                    dateFields: [
                        "date",
                        "paymentDate",
                        "createdAt"
                    ],
                    clientFields: [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ],
                    statusFields: [
                        "status",
                        "paymentStatus"
                    ]
                }
            ),


        invoices:
            filterRecords(
                reportData.invoices,
                {
                    from,
                    to,
                    client,
                    status,
                    search,
                    dateFields: [
                        "date",
                        "invoiceDate",
                        "createdAt"
                    ],
                    clientFields: [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ],
                    statusFields: [
                        "status",
                        "invoiceStatus"
                    ]
                }
            ),


        deliveries:
            filterRecords(
                reportData.deliveries,
                {
                    from,
                    to,
                    client,
                    status,
                    search,
                    dateFields: [
                        "dateTransfer",
                        "transferDate",
                        "date",
                        "createdAt"
                    ],
                    clientFields: [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ],
                    statusFields: [
                        "status",
                        "deliveryStatus"
                    ]
                }
            ),


        deliveryReceipts:
            filterRecords(
                reportData.deliveryReceipts,
                {
                    from,
                    to,
                    client,
                    status,
                    search,
                    dateFields: [
                        "dateTransfer",
                        "transferDate",
                        "date",
                        "createdAt"
                    ],
                    clientFields: [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ],
                    statusFields: [
                        "status",
                        "drStatus",
                        "deliveryStatus"
                    ]
                }
            ),


        fleet:
            filterRecords(
                reportData.fleet,
                {
                    from,
                    to,
                    client: "",
                    status,
                    search,
                    dateFields: [
                        "date",
                        "transactionDate",
                        "createdAt"
                    ],
                    clientFields: [],
                    statusFields: [
                        "status"
                    ]
                }
            )

    };


    updateReportPeriod();

    renderCurrentReport();

}


/* =========================================================
   GENERIC FILTER
========================================================= */

function filterRecords(records, options) {

    if (!Array.isArray(records)) {
        return [];
    }

    return records.filter(record => {

        if (!record || typeof record !== "object") {
            return false;
        }


        /* DATE */

        if (
            options.from ||
            options.to
        ) {

            const rawDate =
                getFirstValue(
                    record,
                    options.dateFields
                );

            const normalizedDate =
                normalizeDateValue(rawDate);

            if (normalizedDate) {

                if (
                    options.from &&
                    normalizedDate < options.from
                ) {
                    return false;
                }

                if (
                    options.to &&
                    normalizedDate > options.to
                ) {
                    return false;
                }

            }

        }


        /* CLIENT */

        if (options.client) {

            const recordClient =
                getFirstValue(
                    record,
                    options.clientFields
                );

            if (
                String(recordClient)
                    .trim()
                    .toLowerCase()
                !==
                String(options.client)
                    .trim()
                    .toLowerCase()
            ) {

                return false;

            }

        }


        /* STATUS */

        if (options.status) {

            const recordStatus =
                getFirstValue(
                    record,
                    options.statusFields
                );

            if (
                String(recordStatus)
                    .trim()
                    .toLowerCase()
                !==
                String(options.status)
                    .trim()
                    .toLowerCase()
            ) {

                return false;

            }

        }


        /* SEARCH */

        if (options.search) {

            const searchableText =
                JSON.stringify(record)
                    .toLowerCase();

            if (
                !searchableText.includes(
                    options.search
                )
            ) {

                return false;

            }

        }


        return true;

    });

}


/* =========================================================
   CLIENT FILTER
========================================================= */

function populateClientFilter(
    preserveValue = true
) {

    const select =
        document.getElementById(
            "reportClientFilter"
        );

    if (!select) {
        return;
    }

    const currentValue =
        preserveValue
            ? select.value
            : "";


    const clients = new Set();


    reportData.salesOrders.forEach(record => {

        const client =
            getFirstValue(
                record,
                [
                    "client",
                    "clientName",
                    "customer",
                    "customerName"
                ]
            );

        if (client) {
            clients.add(String(client).trim());
        }

    });


    reportData.payments.forEach(record => {

        const client =
            getFirstValue(
                record,
                [
                    "client",
                    "clientName",
                    "customer",
                    "customerName"
                ]
            );

        if (client) {
            clients.add(String(client).trim());
        }

    });


    reportData.invoices.forEach(record => {

        const client =
            getFirstValue(
                record,
                [
                    "client",
                    "clientName",
                    "customer",
                    "customerName"
                ]
            );

        if (client) {
            clients.add(String(client).trim());
        }

    });


    const sortedClients =
        [...clients].sort(
            (a, b) =>
                a.localeCompare(b)
        );


    select.innerHTML =
        `<option value="">All Clients</option>`;


    sortedClients.forEach(client => {

        const option =
            document.createElement("option");

        option.value = client;

        option.textContent = client;

        select.appendChild(option);

    });


    if (
        currentValue &&
        sortedClients.includes(currentValue)
    ) {

        select.value = currentValue;

    }

}


/* =========================================================
   STATUS FILTER
========================================================= */

function populateStatusFilter(
    preserveValue = true
) {

    const select =
        document.getElementById(
            "reportStatusFilter"
        );

    if (!select) {
        return;
    }

    const currentValue =
        preserveValue
            ? select.value
            : "";


    const statuses = new Set();


    [
        ...reportData.salesOrders,
        ...reportData.payments,
        ...reportData.invoices,
        ...reportData.deliveries,
        ...reportData.deliveryReceipts
    ]
    .forEach(record => {

        const status =
            getFirstValue(
                record,
                [
                    "status",
                    "soStatus",
                    "salesOrderStatus",
                    "paymentStatus",
                    "invoiceStatus",
                    "deliveryStatus",
                    "drStatus"
                ]
            );

        if (status) {
            statuses.add(
                String(status).trim()
            );
        }

    });


    select.innerHTML =
        `<option value="">All Status</option>`;


    [...statuses]
        .sort()
        .forEach(status => {

            const option =
                document.createElement("option");

            option.value = status;

            option.textContent = status;

            select.appendChild(option);

        });


    if (
        currentValue &&
        statuses.has(currentValue)
    ) {

        select.value = currentValue;

    }

}


/* =========================================================
   CLEAR FILTERS
========================================================= */

function clearReportFilters() {

    const from =
        document.getElementById(
            "reportDateFrom"
        );

    const to =
        document.getElementById(
            "reportDateTo"
        );

    const client =
        document.getElementById(
            "reportClientFilter"
        );

    const status =
        document.getElementById(
            "reportStatusFilter"
        );

    const search =
        document.getElementById(
            "reportSearch"
        );


    if (from) {
        from.value = "";
    }

    if (to) {
        to.value = "";
    }

    if (client) {
        client.value = "";
    }

    if (status) {
        status.value = "";
    }

    if (search) {
        search.value = "";
    }


    filteredReportData =
        cloneReportData(reportData);


    updateReportPeriod();

    renderCurrentReport();

}


/* =========================================================
   EXECUTIVE REPORT
========================================================= */

function renderExecutiveReport() {

    const salesOrders =
        filteredReportData.salesOrders;

    const payments =
        filteredReportData.payments;

    const invoices =
        filteredReportData.invoices;

    const deliveries =
        filteredReportData.deliveries;


    setText(
        "summaryTotalSO",
        formatNumber(
            salesOrders.length
        )
    );


    setText(
        "summarySOAmount",
        formatCurrency(
            sumRecords(
                salesOrders,
                [
                    "total",
                    "soTotal",
                    "salesOrderTotal",
                    "amount",
                    "grandTotal",
                    "totalAmount"
                ]
            )
        )
    );


    const deliverySource = deliveries.length ? deliveries : filteredReportData.deliveryReceipts;
    const deliveredCount = deliverySource.filter(isDeliveredRecord).length;


    setText(
        "summaryDelivered",
        formatNumber(
            deliveredCount
        )
    );


    setText(
        "summaryInvoiced",
        formatCurrency(
            sumRecords(
                invoices,
                [
                    "amountDue",
                    "invoiceAmount",
                    "total",
                    "totalAmount",
                    "netPayable"
                ]
            )
        )
    );


    const collected =
        sumRecords(
            payments,
            [
                "amount",
                "paymentAmount",
                "amountPaid",
                "paidAmount",
                "currentPayment"
            ]
        );


    setText(
        "summaryCollected",
        formatCurrency(collected)
    );


    const soAmount =
        sumRecords(
            salesOrders,
            [
                "total",
                "soTotal",
                "salesOrderTotal",
                "amount",
                "grandTotal",
                "totalAmount"
            ]
        );


    const outstanding =
        Math.max(
            0,
            soAmount - collected
        );


    setText(
        "summaryOutstanding",
        formatCurrency(outstanding)
    );


    const deliveryStats =
        calculateDeliveryStats(
            deliveries,
            filteredReportData.deliveryReceipts
        );


    setText(
        "summaryOnTime",
        formatPercent(
            deliveryStats.accuracy
        )
    );


    const pendingPayments =
        payments
            .filter(record => {

                const status =
                    String(
                        getFirstValue(
                            record,
                            [
                                "status",
                                "paymentStatus"
                            ]
                        )
                    )
                    .toLowerCase();

                return (
                    status === "pending" ||
                    status === "partial"
                );

            })
            .reduce(
                (total, record) =>
                    total +
                    getNumber(
                        record,
                        [
                            "remainingBalance",
                            "balance"
                        ]
                    ),
                0
            );


    setText(
        "summaryPendingPayment",
        formatCurrency(
            pendingPayments
        )
    );


    setText(
        "deliveryChartPercent",
        formatPercent(
            deliveryStats.accuracy
        )
    );


    setText(
        "deliveryChartOnTime",
        formatNumber(
            deliveryStats.onTime
        )
    );


    setText(
        "deliveryChartDelayed",
        formatNumber(
            deliveryStats.delayed
        )
    );


    setText(
        "deliveryChartPending",
        formatNumber(
            deliveryStats.pending
        )
    );


    renderExecutiveMonthlyTable();
    renderExecutiveCharts();

}


/* =========================================================
   SALES ORDER REPORT
========================================================= */

function renderSalesOrderReport() {

    const records =
        filteredReportData.salesOrders;


    setText(
        "salesReportCount",
        formatNumber(records.length)
    );


    setText(
        "salesReportAmount",
        formatCurrency(
            sumRecords(
                records,
                [
                    "total",
                    "soTotal",
                    "salesOrderTotal",
                    "amount",
                    "grandTotal",
                    "totalAmount"
                ]
            )
        )
    );


    setText(
        "salesReportActive",
        formatNumber(
            records.filter(
                record =>
                    normalizeStatus(record)
                    === "active"
            ).length
        )
    );


    setText(
        "salesReportCompleted",
        formatNumber(
            records.filter(
                record =>
                    normalizeStatus(record)
                    === "completed"
            ).length
        )
    );


    setText(
        "salesReportCancelled",
        formatNumber(
            records.filter(
                record =>
                    normalizeStatus(record)
                    === "cancelled"
            ).length
        )
    );


    const tbody =
        document.getElementById(
            "salesOrderReportTable"
        );

    if (!tbody) {
        return;
    }


    if (!records.length) {

        renderEmptyRow(
            tbody,
            7,
            "No Sales Order data available."
        );

        return;

    }


    tbody.innerHTML =
        records.map(record => {

            const soNo =
                getFirstValue(
                    record,
                    [
                        "soNo",
                        "salesOrderNo",
                        "salesOrderNumber",
                        "soNumber",
                        "orderNo",
                        "number"
                    ]
                ) || "—";


            const date =
                getFirstValue(
                    record,
                    [
                        "date",
                        "orderDate",
                        "salesOrderDate",
                        "createdAt"
                    ]
                );


            const client =
                getFirstValue(
                    record,
                    [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ]
                ) || "—";


            const project =
                getFirstValue(
                    record,
                    [
                        "project",
                        "projectName"
                    ]
                ) || "—";


            const amount =
                getNumber(
                    record,
                    [
                        "total",
                        "soTotal",
                        "salesOrderTotal",
                        "amount",
                        "grandTotal",
                        "totalAmount"
                    ]
                );


            const terms =
                getFirstValue(
                    record,
                    [
                        "terms",
                        "paymentTerms"
                    ]
                ) || "—";


            const status =
                getFirstValue(
                    record,
                    [
                        "status",
                        "soStatus",
                        "salesOrderStatus"
                    ]
                ) || "—";


            return `
                <tr>
                    <td>${escapeHtml(soNo)}</td>
                    <td>${escapeHtml(formatDisplayDate(date))}</td>
                    <td>${escapeHtml(client)}</td>
                    <td>${escapeHtml(project)}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${escapeHtml(terms)}</td>
                    <td>${escapeHtml(status)}</td>
                </tr>
            `;

        }).join("");

}


/* =========================================================
   DELIVERY REPORT
========================================================= */

function renderDeliveryReport() {

    const records =
        filteredReportData.deliveries;


    const drRecords =
        filteredReportData.deliveryReceipts;


    const stats =
        calculateDeliveryStats(
            records,
            drRecords
        );


    setText(
        "deliveryReportTotal",
        formatNumber(stats.total)
    );


    setText(
        "deliveryReportOnTime",
        formatNumber(stats.onTime)
    );


    setText(
        "deliveryReportDelayed",
        formatNumber(stats.delayed)
    );


    setText(
        "deliveryReportPending",
        formatNumber(stats.pending)
    );


    setText(
        "deliveryReportAccuracy",
        formatPercent(stats.accuracy)
    );


    const tbody =
        document.getElementById(
            "deliveryReportTable"
        );

    if (!tbody) {
        return;
    }


    if (!records.length) {

        renderEmptyRow(
            tbody,
            8,
            "No delivery data available."
        );

        return;

    }


    tbody.innerHTML =
        records.map(record => {

            const drNo =
                getFirstValue(
                    record,
                    [
                        "drNo",
                        "deliveryReceiptNo",
                        "deliveryNo",
                        "number"
                    ]
                ) || "—";


            const soNo =
                getFirstValue(
                    record,
                    [
                        "soNo",
                        "salesOrderNo",
                        "salesOrderNumber"
                    ]
                ) || "—";


            const client =
                getFirstValue(
                    record,
                    [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ]
                ) || "—";


            const transferDate =
                getFirstValue(
                    record,
                    [
                        "dateTransfer",
                        "transferDate",
                        "date"
                    ]
                );


            const committed =
                getFirstValue(
                    record,
                    [
                        "committedDate",
                        "dateCommitted",
                        "committed"
                    ]
                );


            const delivered =
                getFirstValue(
                    record,
                    [
                        "dateDelivered",
                        "deliveredDate",
                        "actualDate",
                        "actualDelivered"
                    ]
                );


            const leadTime =
                calculateLeadTime(
                    transferDate,
                    delivered
                );


            const status =
                getFirstValue(
                    record,
                    [
                        "status",
                        "deliveryStatus"
                    ]
                ) ||
                calculateDeliveryStatus(
                    committed,
                    delivered
                );


            return `
                <tr>
                    <td>${escapeHtml(drNo)}</td>
                    <td>${escapeHtml(soNo)}</td>
                    <td>${escapeHtml(client)}</td>
                    <td>${escapeHtml(formatDisplayDate(transferDate))}</td>
                    <td>${escapeHtml(formatDisplayDate(committed))}</td>
                    <td>${escapeHtml(formatDisplayDate(delivered))}</td>
                    <td>${escapeHtml(leadTime)}</td>
                    <td>${escapeHtml(status || "—")}</td>
                </tr>
            `;

        }).join("");

}


/* =========================================================
   DR REPORT
========================================================= */

function renderDRReport() {

    const records =
        filteredReportData.deliveryReceipts;


    setText(
        "drPrepared",
        countStatus(records, "prepared")
    );

    setText(
        "drPrinted",
        countStatus(records, "printed")
    );

    setText(
        "drTransit",
        countStatus(records, "in transit")
    );

    setText(
        "drDelivered",
        countStatus(records, "delivered")
    );

    setText(
        "drCancelled",
        countStatus(records, "cancelled")
    );


    const aging =
        calculateDRAging(records);


    setText(
        "drAging03",
        formatNumber(aging.days03)
    );

    setText(
        "drAging47",
        formatNumber(aging.days47)
    );

    setText(
        "drAging815",
        formatNumber(aging.days815)
    );

    setText(
        "drAging15",
        formatNumber(aging.days15)
    );

}


/* =========================================================
   INVOICE REPORT
========================================================= */

function renderInvoiceReport() {

    const records =
        filteredReportData.invoices;


    setText(
        "invoiceReportCount",
        formatNumber(records.length)
    );


    setText(
        "invoiceReportAmount",
        formatCurrency(
            sumRecords(
                records,
                [
                    "amountDue",
                    "invoiceAmount",
                    "total",
                    "totalAmount"
                ]
            )
        )
    );


    setText(
        "invoiceReportEWT",
        formatCurrency(
            sumRecords(
                records,
                [
                    "ewt",
                    "ewtAmount",
                    "withholdingTax"
                ]
            )
        )
    );


    setText(
        "invoiceReportNet",
        formatCurrency(
            sumRecords(
                records,
                [
                    "netPayable",
                    "netAmount",
                    "amountPayable"
                ]
            )
        )
    );


    setText(
        "invoiceReportUnpaid",
        formatNumber(
            records.filter(
                record => {

                    const status =
                        normalizeStatus(record);

                    return (
                        status === "unpaid" ||
                        status === "pending"
                    );

                }
            ).length
        )
    );


    const tbody =
        document.getElementById(
            "invoiceReportTable"
        );

    if (!tbody) {
        return;
    }


    if (!records.length) {

        renderEmptyRow(
            tbody,
            8,
            "No invoice data available."
        );

        return;

    }


    tbody.innerHTML =
        records.map(record => {

            const invoiceNo =
                getFirstValue(
                    record,
                    [
                        "invoiceNo",
                        "invoiceNumber",
                        "number"
                    ]
                ) || "—";


            const soNo =
                getFirstValue(
                    record,
                    [
                        "soNo",
                        "salesOrderNo",
                        "salesOrderNumber"
                    ]
                ) || "—";


            const client =
                getFirstValue(
                    record,
                    [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ]
                ) || "—";


            const date =
                getFirstValue(
                    record,
                    [
                        "date",
                        "invoiceDate",
                        "createdAt"
                    ]
                );


            const amountDue =
                getNumber(
                    record,
                    [
                        "amountDue",
                        "invoiceAmount",
                        "total",
                        "totalAmount"
                    ]
                );


            const ewt =
                getNumber(
                    record,
                    [
                        "ewt",
                        "ewtAmount",
                        "withholdingTax"
                    ]
                );


            const net =
                getNumber(
                    record,
                    [
                        "netPayable",
                        "netAmount",
                        "amountPayable"
                    ]
                );


            const status =
                getFirstValue(
                    record,
                    [
                        "status",
                        "invoiceStatus"
                    ]
                ) || "—";


            return `
                <tr>
                    <td>${escapeHtml(invoiceNo)}</td>
                    <td>${escapeHtml(soNo)}</td>
                    <td>${escapeHtml(client)}</td>
                    <td>${escapeHtml(formatDisplayDate(date))}</td>
                    <td>${formatCurrency(amountDue)}</td>
                    <td>${formatCurrency(ewt)}</td>
                    <td>${formatCurrency(net)}</td>
                    <td>${escapeHtml(status)}</td>
                </tr>
            `;

        }).join("");

}


/* =========================================================
   PAYMENT REPORT
========================================================= */

function renderPaymentReport() {

    const records =
        filteredReportData.payments;


    setText(
        "paymentReportCount",
        formatNumber(records.length)
    );


    setText(
        "paymentReportAmount",
        formatCurrency(
            sumRecords(
                records,
                [
                    "amount",
                    "paymentAmount",
                    "amountPaid",
                    "paidAmount",
                    "currentPayment"
                ]
            )
        )
    );


    setText(
        "paymentReportPaid",
        countStatus(records, "paid")
    );


    setText(
        "paymentReportPartial",
        countStatus(records, "partial")
    );


    setText(
        "paymentReportPending",
        countStatus(records, "pending")
    );


    const tbody =
        document.getElementById(
            "paymentReportTable"
        );

    if (!tbody) {
        return;
    }


    if (!records.length) {

        renderEmptyRow(
            tbody,
            8,
            "No payment data available."
        );

        return;

    }


    tbody.innerHTML =
        records.map(record => {

            const paymentNo =
                getFirstValue(
                    record,
                    [
                        "paymentNo",
                        "paymentNumber",
                        "number"
                    ]
                ) || "—";


            const date =
                getFirstValue(
                    record,
                    [
                        "date",
                        "paymentDate",
                        "createdAt"
                    ]
                );


            const soNo =
                getFirstValue(
                    record,
                    [
                        "soNo",
                        "salesOrderNo",
                        "salesOrderNumber"
                    ]
                ) || "—";


            const client =
                getFirstValue(
                    record,
                    [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ]
                ) || "—";


            const method =
                getFirstValue(
                    record,
                    [
                        "paymentMethod",
                        "method"
                    ]
                ) || "—";


            const receipt =
                getFirstValue(
                    record,
                    [
                        "receiptNo",
                        "collectionReceiptNo",
                        "acknowledgmentReceiptNo"
                    ]
                ) || "—";


            const amount =
                getNumber(
                    record,
                    [
                        "amount",
                        "paymentAmount",
                        "amountPaid",
                        "paidAmount",
                        "currentPayment"
                    ]
                );


            const status =
                getFirstValue(
                    record,
                    [
                        "status",
                        "paymentStatus"
                    ]
                ) || "—";


            return `
                <tr>
                    <td>${escapeHtml(paymentNo)}</td>
                    <td>${escapeHtml(formatDisplayDate(date))}</td>
                    <td>${escapeHtml(soNo)}</td>
                    <td>${escapeHtml(client)}</td>
                    <td>${escapeHtml(method)}</td>
                    <td>${escapeHtml(receipt)}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${escapeHtml(status)}</td>
                </tr>
            `;

        }).join("");

}


/* =========================================================
   RECEIVABLE REPORT
========================================================= */

function renderReceivableReport() {

    const salesOrders =
        filteredReportData.salesOrders;

    const payments =
        filteredReportData.payments;


    const clients = {};


    salesOrders.forEach(record => {

        const client =
            getFirstValue(
                record,
                [
                    "client",
                    "clientName",
                    "customer",
                    "customerName"
                ]
            ) || "Unknown Client";


        if (!clients[client]) {

            clients[client] = {

                soTotal: 0,

                invoiced: 0,

                paid: 0

            };

        }


        clients[client].soTotal +=
            getNumber(
                record,
                [
                    "total",
                    "soTotal",
                    "salesOrderTotal",
                    "amount",
                    "grandTotal",
                    "totalAmount"
                ]
            );

    });


    payments.forEach(record => {

        const client =
            getFirstValue(
                record,
                [
                    "client",
                    "clientName",
                    "customer",
                    "customerName"
                ]
            ) || "Unknown Client";


        if (!clients[client]) {

            clients[client] = {

                soTotal: 0,

                invoiced: 0,

                paid: 0

            };

        }


        clients[client].paid +=
            getNumber(
                record,
                [
                    "amount",
                    "paymentAmount",
                    "amountPaid",
                    "paidAmount",
                    "currentPayment"
                ]
            );

    });


    filteredReportData.invoices
        .forEach(record => {

            const client =
                getFirstValue(
                    record,
                    [
                        "client",
                        "clientName",
                        "customer",
                        "customerName"
                    ]
                ) || "Unknown Client";


            if (!clients[client]) {

                clients[client] = {

                    soTotal: 0,

                    invoiced: 0,

                    paid: 0

                };

            }


            clients[client].invoiced +=
                getNumber(
                    record,
                    [
                        "amountDue",
                        "invoiceAmount",
                        "total",
                        "totalAmount",
                        "netPayable"
                    ]
                );

        });


    const rows =
        Object.entries(clients);


    const totalReceivable =
        rows.reduce(
            (total, [, data]) =>
                total +
                Math.max(
                    0,
                    data.soTotal -
                    data.paid
                ),
            0
        );


    setText(
        "receivableTotal",
        formatCurrency(
            totalReceivable
        )
    );


    setText(
        "receivableCurrent",
        formatCurrency(
            totalReceivable
        )
    );


    setText(
        "receivable30",
        "₱0.00"
    );

    setText(
        "receivable60",
        "₱0.00"
    );

    setText(
        "receivable90",
        "₱0.00"
    );


    const tbody =
        document.getElementById(
            "receivableReportTable"
        );

    if (!tbody) {
        return;
    }


    if (!rows.length) {

        renderEmptyRow(
            tbody,
            6,
            "No receivable data available."
        );

        return;

    }


    tbody.innerHTML =
        rows.map(
            ([client, data]) => {

                const outstanding =
                    Math.max(
                        0,
                        data.soTotal -
                        data.paid
                    );


                const collectionRate =
                    data.soTotal > 0
                        ? (
                            data.paid /
                            data.soTotal
                        ) * 100
                        : 0;


                return `
                    <tr>

                        <td>
                            ${escapeHtml(client)}
                        </td>

                        <td>
                            ${formatCurrency(data.soTotal)}
                        </td>

                        <td>
                            ${formatCurrency(data.invoiced)}
                        </td>

                        <td>
                            ${formatCurrency(data.paid)}
                        </td>

                        <td>
                            ${formatCurrency(outstanding)}
                        </td>

                        <td>
                            ${formatPercent(collectionRate)}
                        </td>

                    </tr>
                `;

            }
        ).join("");

}


/* =========================================================
   FLEET REPORT
========================================================= */

function renderFleetReport() {

    const records =
        filteredReportData.fleet;


    const totalKM =
        sumRecords(
            records,
            [
                "totalKM",
                "kilometers",
                "km",
                "actualKM"
            ]
        );


    const fuel =
        sumRecords(
            records,
            [
                "fuelUsed",
                "fuel",
                "liters",
                "fuelLiters"
            ]
        );


    const trips =
        sumRecords(
            records,
            [
                "trips",
                "deliveryTrips",
                "totalTrips"
            ]
        );


    const maintenance =
        sumRecords(
            records,
            [
                "maintenanceCost",
                "maintenance",
                "repairCost"
            ]
        );


    const averageKM =
        fuel > 0
            ? totalKM / fuel
            : 0;


    setText(
        "fleetTotalKM",
        `${formatNumber(totalKM)} km`
    );


    setText(
        "fleetFuelUsed",
        `${formatNumber(fuel)} L`
    );


    setText(
        "fleetAverageKM",
        averageKM.toFixed(2)
    );


    setText(
        "fleetTrips",
        formatNumber(trips)
    );


    setText(
        "fleetMaintenanceCost",
        formatCurrency(maintenance)
    );


    const tbody =
        document.getElementById(
            "fleetReportTable"
        );

    if (!tbody) {
        return;
    }


    if (!records.length) {

        renderEmptyRow(
            tbody,
            7,
            "No fleet data available."
        );

        return;

    }


    tbody.innerHTML =
        records.map(record => {

            const vehicle =
                getFirstValue(
                    record,
                    [
                        "vehicle",
                        "vehicleNo",
                        "plateNo",
                        "plateNumber",
                        "truck",
                        "truckNo"
                    ]
                ) || "—";


            const km =
                getNumber(
                    record,
                    [
                        "totalKM",
                        "kilometers",
                        "km",
                        "actualKM"
                    ]
                );


            const fuelUsed =
                getNumber(
                    record,
                    [
                        "fuelUsed",
                        "fuel",
                        "liters",
                        "fuelLiters"
                    ]
                );


            const kmPerLiter =
                fuelUsed > 0
                    ? km / fuelUsed
                    : getNumber(
                        record,
                        [
                            "kmPerLiter",
                            "kmL",
                            "fuelEfficiency"
                        ]
                    );


            const tripCount =
                getNumber(
                    record,
                    [
                        "trips",
                        "deliveryTrips",
                        "totalTrips"
                    ]
                );


            const maintenance =
                getNumber(
                    record,
                    [
                        "maintenanceCost",
                        "maintenance",
                        "repairCost"
                    ]
                );


            const idleDays =
                getNumber(
                    record,
                    [
                        "idleDays",
                        "idle",
                        "downtimeDays"
                    ]
                );


            return `
                <tr>

                    <td>
                        ${escapeHtml(vehicle)}
                    </td>

                    <td>
                        ${formatNumber(km)}
                    </td>

                    <td>
                        ${formatNumber(fuelUsed)} L
                    </td>

                    <td>
                        ${kmPerLiter.toFixed(2)}
                    </td>

                    <td>
                        ${formatNumber(tripCount)}
                    </td>

                    <td>
                        ${formatCurrency(maintenance)}
                    </td>

                    <td>
                        ${formatNumber(idleDays)}
                    </td>

                </tr>
            `;

        }).join("");

}


/* =========================================================
   MANAGEMENT REPORT
========================================================= */

function renderManagementReport() {

    const sales =
        sumRecords(
            filteredReportData.salesOrders,
            [
                "total",
                "soTotal",
                "salesOrderTotal",
                "amount",
                "grandTotal",
                "totalAmount"
            ]
        );


    const deliveries =
        filteredReportData.deliveries.length;


    const billing =
        sumRecords(
            filteredReportData.invoices,
            [
                "amountDue",
                "invoiceAmount",
                "total",
                "totalAmount",
                "netPayable"
            ]
        );


    const collection =
        sumRecords(
            filteredReportData.payments,
            [
                "amount",
                "paymentAmount",
                "amountPaid",
                "paidAmount",
                "currentPayment"
            ]
        );


    const receivable =
        Math.max(
            0,
            sales - collection
        );


    const totalKM =
        sumRecords(
            filteredReportData.fleet,
            [
                "totalKM",
                "kilometers",
                "km",
                "actualKM"
            ]
        );


    setText(
        "managementSales",
        formatCurrency(sales)
    );


    setText(
        "managementDeliveries",
        formatNumber(deliveries)
    );


    setText(
        "managementBilling",
        formatCurrency(billing)
    );


    setText(
        "managementCollection",
        formatCurrency(collection)
    );


    setText(
        "managementReceivable",
        formatCurrency(receivable)
    );


    setText(
        "managementFleetKM",
        `${formatNumber(totalKM)} km`
    );


    const salesConversion =
        sales > 0
            ? Math.min(
                100,
                (billing / sales) * 100
            )
            : 0;


    const deliveryStats =
        calculateDeliveryStats(
            filteredReportData.deliveries,
            filteredReportData.deliveryReceipts
        );


    const collectionRate =
        sales > 0
            ? Math.min(
                100,
                (collection / sales) * 100
            )
            : 0;


    const fuel =
        sumRecords(
            filteredReportData.fleet,
            [
                "fuelUsed",
                "fuel",
                "liters",
                "fuelLiters"
            ]
        );


    const fleetEfficiency =
        fuel > 0
            ? totalKM / fuel
            : 0;


    setText(
        "kpiSalesConversion",
        formatPercent(
            salesConversion
        )
    );


    setText(
        "kpiDeliveryAccuracy",
        formatPercent(
            deliveryStats.accuracy
        )
    );


    setText(
        "kpiCollectionRate",
        formatPercent(
            collectionRate
        )
    );


    setText(
        "kpiFleetEfficiency",
        `${fleetEfficiency.toFixed(2)} KM/L`
    );

}


/* =========================================================
   EXECUTIVE MONTHLY TABLE
========================================================= */

function renderExecutiveMonthlyTable() {

    const tbody =
        document.getElementById(
            "executiveReportTable"
        );

    if (!tbody) {
        return;
    }


    const months = {};


    filteredReportData.salesOrders
        .forEach(record => {

            const date =
                normalizeDateValue(
                    getFirstValue(
                        record,
                        [
                            "date",
                            "orderDate",
                            "salesOrderDate",
                            "createdAt"
                        ]
                    )
                );


            if (!date) {
                return;
            }


            const month =
                date.substring(0, 7);


            if (!months[month]) {
                months[month] =
                    createMonthlyBucket();
            }


            months[month].soCount++;

            months[month].soAmount +=
                getNumber(
                    record,
                    [
                        "total",
                        "soTotal",
                        "salesOrderTotal",
                        "amount",
                        "grandTotal",
                        "totalAmount"
                    ]
                );

        });


    filteredReportData.deliveries
        .forEach(record => {

            const date =
                normalizeDateValue(
                    getFirstValue(
                        record,
                        [
                            "dateTransfer",
                            "transferDate",
                            "date",
                            "createdAt"
                        ]
                    )
                );


            if (!date) {
                return;
            }


            const month =
                date.substring(0, 7);


            if (!months[month]) {
                months[month] =
                    createMonthlyBucket();
            }


            if (isDeliveredRecord(record)) {
                months[month].delivered++;
            }

        });


    filteredReportData.invoices
        .forEach(record => {

            const date =
                normalizeDateValue(
                    getFirstValue(
                        record,
                        [
                            "date",
                            "invoiceDate",
                            "createdAt"
                        ]
                    )
                );


            if (!date) {
                return;
            }


            const month =
                date.substring(0, 7);


            if (!months[month]) {
                months[month] =
                    createMonthlyBucket();
            }


            months[month].invoiced +=
                getNumber(
                    record,
                    [
                        "amountDue",
                        "invoiceAmount",
                        "total",
                        "totalAmount",
                        "netPayable"
                    ]
                );

        });


    filteredReportData.payments
        .forEach(record => {

            const date =
                normalizeDateValue(
                    getFirstValue(
                        record,
                        [
                            "date",
                            "paymentDate",
                            "createdAt"
                        ]
                    )
                );


            if (!date) {
                return;
            }


            const month =
                date.substring(0, 7);


            if (!months[month]) {
                months[month] =
                    createMonthlyBucket();
            }


            months[month].collected +=
                getNumber(
                    record,
                    [
                        "amount",
                        "paymentAmount",
                        "amountPaid",
                        "paidAmount",
                        "currentPayment"
                    ]
                );

        });


    const sortedMonths =
        Object.keys(months)
            .sort()
            .reverse();


    if (!sortedMonths.length) {

        renderEmptyRow(
            tbody,
            7,
            "No report data available."
        );

        return;

    }


    tbody.innerHTML =
        sortedMonths.map(month => {

            const data =
                months[month];


            const outstanding =
                Math.max(
                    0,
                    data.soAmount -
                    data.collected
                );


            return `
                <tr>

                    <td>
                        ${escapeHtml(
                            formatMonth(month)
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            data.soCount
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            data.soAmount
                        )}
                    </td>

                    <td>
                        ${formatNumber(
                            data.delivered
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            data.invoiced
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            data.collected
                        )}
                    </td>

                    <td>
                        ${formatCurrency(
                            outstanding
                        )}
                    </td>

                </tr>
            `;

        }).join("");

}


/* =========================================================
   DELIVERY STATISTICS
========================================================= */

function calculateDeliveryStats(
    deliveries,
    deliveryReceipts
) {

    const source =
        deliveries.length
            ? deliveries
            : deliveryReceipts;


    const total =
        source.length;


    let onTime = 0;

    let delayed = 0;

    let pending = 0;


    source.forEach(record => {

        const status =
            normalizeStatus(record);


        if (
            status.includes("delay")
        ) {

            delayed++;

            return;

        }


        if (
            status.includes("pending") ||
            status.includes("prepared") ||
            status.includes("transit")
        ) {

            pending++;

            return;

        }


        const committed =
            normalizeDateValue(
                getFirstValue(
                    record,
                    [
                        "committedDate",
                        "dateCommitted",
                        "committed"
                    ]
                )
            );


        const delivered =
            normalizeDateValue(
                getFirstValue(
                    record,
                    [
                        "dateDelivered",
                        "deliveredDate",
                        "actualDate",
                        "actualDelivered"
                    ]
                )
            );


        if (
            committed &&
            delivered
        ) {

            if (
                delivered <= committed
            ) {

                onTime++;

            } else {

                delayed++;

            }

        } else if (
            status.includes("delivered") ||
            status === "completed"
        ) {

            onTime++;

        } else {

            pending++;

        }

    });


    const completed =
        onTime + delayed;


    const accuracy =
        completed > 0
            ? (onTime / completed) * 100
            : 0;


    return {

        total,

        onTime,

        delayed,

        pending,

        accuracy

    };

}


/* =========================================================
   DR AGING
========================================================= */

function calculateDRAging(records) {

    const result = {

        days03: 0,

        days47: 0,

        days815: 0,

        days15: 0

    };


    const today =
        new Date();


    records.forEach(record => {

        const status =
            normalizeStatus(record);


        if (
            status === "delivered" ||
            status === "completed" ||
            status === "cancelled"
        ) {

            return;

        }


        const date =
            getFirstValue(
                record,
                [
                    "dateTransfer",
                    "transferDate",
                    "date",
                    "createdAt"
                ]
            );


        const normalized =
            normalizeDateValue(date);


        if (!normalized) {
            return;
        }


        const transfer =
            new Date(
                `${normalized}T00:00:00`
            );


        const difference =
            Math.floor(
                (
                    today -
                    transfer
                ) /
                86400000
            );


        if (difference <= 3) {

            result.days03++;

        } else if (difference <= 7) {

            result.days47++;

        } else if (difference <= 15) {

            result.days815++;

        } else {

            result.days15++;

        }

    });


    return result;

}


/* =========================================================
   STATUS HELPERS
========================================================= */

function countStatus(
    records,
    target
) {

    const normalizedTarget =
        String(target)
            .trim()
            .toLowerCase();


    return records.filter(
        record =>
            normalizeStatus(record)
                === normalizedTarget
    ).length;

}


function normalizeStatus(record) {

    return String(
        getFirstValue(
            record,
            [
                "status",
                "soStatus",
                "salesOrderStatus",
                "paymentStatus",
                "invoiceStatus",
                "deliveryStatus",
                "drStatus"
            ]
        ) || ""
    )
    .trim()
    .toLowerCase();

}


function isDeliveredRecord(record) {

    const status =
        normalizeStatus(record);


    if (
        status === "delivered" ||
        status === "completed"
    ) {

        return true;

    }


    return Boolean(
        getFirstValue(
            record,
            [
                "dateDelivered",
                "deliveredDate",
                "actualDate",
                "actualDelivered"
            ]
        )
    );

}


/* =========================================================
   DELIVERY STATUS
========================================================= */

function calculateDeliveryStatus(
    committed,
    delivered
) {

    const committedDate =
        normalizeDateValue(
            committed
        );

    const deliveredDate =
        normalizeDateValue(
            delivered
        );


    if (!deliveredDate) {
        return "PENDING";
    }


    if (
        committedDate &&
        deliveredDate > committedDate
    ) {

        return "DELAYED";

    }


    return "ON-TIME";

}


/* =========================================================
   LEAD TIME
========================================================= */

function calculateLeadTime(
    transfer,
    delivered
) {

    const transferDate =
        normalizeDateValue(
            transfer
        );

    const deliveredDate =
        normalizeDateValue(
            delivered
        );


    if (
        !transferDate ||
        !deliveredDate
    ) {

        return "—";

    }


    const start =
        new Date(
            `${transferDate}T00:00:00`
        );

    const end =
        new Date(
            `${deliveredDate}T00:00:00`
        );


    const days =
        Math.round(
            (
                end -
                start
            ) /
            86400000
        );


    return `${Math.max(0, days)} day(s)`;

}


/* =========================================================
   MONTHLY BUCKET
========================================================= */

function createMonthlyBucket() {

    return {

        soCount: 0,

        soAmount: 0,

        delivered: 0,

        invoiced: 0,

        collected: 0

    };

}


/* =========================================================
   UPDATE PERIOD
========================================================= */

function updateReportPeriod() {

    const from =
        document.getElementById(
            "reportDateFrom"
        )?.value || "";


    const to =
        document.getElementById(
            "reportDateTo"
        )?.value || "";


    let text = "All Time";


    if (from && to) {

        text =
            `${formatDisplayDate(from)} - ${formatDisplayDate(to)}`;

    } else if (from) {

        text =
            `From ${formatDisplayDate(from)}`;

    } else if (to) {

        text =
            `Until ${formatDisplayDate(to)}`;

    }


    setText(
        "executiveReportPeriod",
        text
    );


    setText(
        "managementReportPeriod",
        text
    );

}


/* =========================================================
   GENERATED DATE
========================================================= */

function setGeneratedDate() {

    setText(
        "managementGeneratedDate",
        new Date().toLocaleString(
            "en-PH",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        )
    );

}


/* =========================================================
   EXPORT CURRENT REPORT
========================================================= */

function exportCurrentReport() {

    const view =
        document.querySelector(
            ".report-view.active"
        );

    if (!view) {
        return;
    }


    const table =
        view.querySelector(
            "table"
        );


    if (!table) {

        alert(
            "Walang table data para ma-export sa report na ito."
        );

        return;

    }


    const rows =
        [...table.querySelectorAll("tr")];


    const csv =
        rows.map(row => {

            const cells =
                [...row.querySelectorAll(
                    "th, td"
                )];


            return cells
                .map(cell =>
                    `"${String(
                        cell.innerText
                    )
                    .replace(/"/g, '""')}"`
                )
                .join(",");

        }).join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const link =
        document.createElement("a");


    link.href = url;

    link.download =
        `LOGIS-TECH-${currentReport}-report.csv`;


    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function getFirstValue(
    object,
    fields
) {

    if (
        !object ||
        !Array.isArray(fields)
    ) {

        return "";

    }


    for (const field of fields) {

        if (
            object[field] !== undefined &&
            object[field] !== null &&
            object[field] !== ""
        ) {

            return object[field];

        }

    }


    return "";

}


function getNumber(
    object,
    fields
) {

    const value =
        getFirstValue(
            object,
            fields
        );


    if (
        typeof value === "number" &&
        Number.isFinite(value)
    ) {

        return value;

    }


    if (
        typeof value === "string"
    ) {

        const cleaned =
            value
                .replace(/₱/g, "")
                .replace(/,/g, "")
                .replace(/\s/g, "")
                .trim();


        const number =
            Number(cleaned);


        return Number.isFinite(number)
            ? number
            : 0;

    }


    return 0;

}


function sumRecords(
    records,
    fields
) {

    return records.reduce(
        (total, record) =>
            total +
            getNumber(
                record,
                fields
            ),
        0
    );

}


function normalizeDateValue(value) {

    if (!value) {
        return "";
    }


    if (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}/.test(value)
    ) {

        return value.substring(0, 10);

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return formatDateForInput(date);

}


function formatDateForInput(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


function formatDisplayDate(value) {

    const normalized =
        normalizeDateValue(value);


    if (!normalized) {
        return "—";
    }


    const date =
        new Date(
            `${normalized}T00:00:00`
        );


    return date.toLocaleDateString(
        "en-PH",
        {
            month: "short",
            day: "2-digit",
            year: "numeric"
        }
    );

}


function formatMonth(value) {

    if (!value) {
        return "—";
    }


    const date =
        new Date(
            `${value}-01T00:00:00`
        );


    return date.toLocaleDateString(
        "en-PH",
        {
            month: "long",
            year: "numeric"
        }
    );

}


function formatCurrency(value) {

    const number =
        Number(value) || 0;


    return number.toLocaleString(
        "en-PH",
        {
            style: "currency",
            currency: "PHP",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


function formatNumber(value) {

    const number =
        Number(value) || 0;


    return number.toLocaleString(
        "en-PH",
        {
            maximumFractionDigits: 2
        }
    );

}


function formatPercent(value) {

    const number =
        Number(value) || 0;


    return `${number.toFixed(1)}%`;

}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {
        element.textContent = value;
    }

}


function renderEmptyRow(
    tbody,
    colspan,
    message
) {

    tbody.innerHTML = `
        <tr>
            <td colspan="${colspan}">
                ${escapeHtml(message)}
            </td>
        </tr>
    `;

}


function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function debounce(
    callback,
    delay
) {

    let timeout;

    return function (...args) {

        clearTimeout(timeout);

        timeout =
            setTimeout(
                () => callback.apply(
                    this,
                    args
                ),
                delay
            );

    };

}


/* =========================================================
   DATA-DRIVEN SVG CHARTS
========================================================= */
function reportEscChart(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function reportMonthKey(v){const d=normalizeDateValue(v);return d?d.slice(0,7):"";}
function reportCompactMoney(v){v=Number(v)||0;return Math.abs(v)>=1000000?"₱"+(v/1000000).toFixed(1)+"M":Math.abs(v)>=1000?"₱"+(v/1000).toFixed(0)+"k":"₱"+Math.round(v);}
function reportMonthlySeries(){
    const sales={},collections={};
    const add=(rows,dates,amounts,target)=>rows.forEach(r=>{const m=reportMonthKey(getFirstValue(r,dates));if(m)target[m]=(target[m]||0)+getNumber(r,amounts);});
    add(filteredReportData.salesOrders,["date","orderDate","createdAt"],["total","soTotal","grandTotal","totalAmount"],sales);
    add(filteredReportData.payments,["date","paymentDate","createdAt"],["currentPayment","paymentAmount","amount"],collections);
    const months=Array.from(new Set([...Object.keys(sales),...Object.keys(collections)])).sort();
    return months.slice(-Math.max(1,Number(document.getElementById("summaryChartPeriod")?.value||12))).map(m=>({month:m,label:formatMonth(m),sales:sales[m]||0,collections:collections[m]||0}));
}
function renderExecutiveCharts(){
    const host=document.getElementById("salesCollectionChart"), rows=reportMonthlySeries();
    if(host){
        if(!rows.length){host.innerHTML='<div class="report-chart-empty">No monthly sales or collection data in this period.</div>';}
        else{
            const w=720,h=260,l=62,r=18,t=18,b=46,max=Math.max(1,...rows.flatMap(x=>[x.sales,x.collections]));
            const X=i=>l+(rows.length===1?(w-l-r)/2:i*(w-l-r)/(rows.length-1)),Y=v=>h-b-(v/max)*(h-t-b);
            const grid=[0,.25,.5,.75,1].map(p=>{const y=h-b-p*(h-t-b);return '<line x1="'+l+'" y1="'+y+'" x2="'+(w-r)+'" y2="'+y+'" stroke="#e7edf5"/><text x="'+(l-8)+'" y="'+(y+4)+'" text-anchor="end" fill="#78859a" font-size="10">'+reportEscChart(reportCompactMoney(max*p))+'</text>';}).join("");
            const path=k=>rows.map((m,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(m[k]).toFixed(1)).join(" ");
            const dots=k=>rows.map((m,i)=>'<circle cx="'+X(i)+'" cy="'+Y(m[k])+'" r="3.5" fill="'+(k==="sales"?"#2457d6":"#12a594")+'"><title>'+reportEscChart(m.label+": "+formatCurrency(m[k]))+'</title></circle>').join("");
            const labels=rows.map((m,i)=>'<text x="'+X(i)+'" y="'+(h-17)+'" text-anchor="middle" fill="#68758a" font-size="10">'+reportEscChart(m.label)+'</text>').join("");
            host.innerHTML='<svg class="report-svg-chart" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Monthly sales and collection">'+grid+'<path d="'+path("sales")+'" fill="none" stroke="#2457d6" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="'+path("collections")+'" fill="none" stroke="#12a594" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+dots("sales")+dots("collections")+labels+'</svg><div class="report-chart-legend"><span><i class="sales-dot"></i>SO Amount</span><span><i class="collection-dot"></i>Collected</span></div>';
        }
    }
    const donut=document.querySelector("#deliveryPerformanceChart .donut-placeholder");
    if(donut){
        const s=calculateDeliveryStats(filteredReportData.deliveries,filteredReportData.deliveryReceipts), total=Math.max(0,s.onTime+s.delayed+s.pending), pct=total?s.onTime/total*100:0, c=2*Math.PI*43, a=c*pct/100, d=total?c*s.delayed/total:0, p=Math.max(0,c-a-d);
        donut.innerHTML='<svg viewBox="0 0 120 120" role="img" aria-label="Delivery performance"><circle cx="60" cy="60" r="43" fill="none" stroke="#edf1f7" stroke-width="12"/><circle cx="60" cy="60" r="43" fill="none" stroke="#12a594" stroke-width="12" stroke-dasharray="'+a+' '+c+'" transform="rotate(-90 60 60)"/><circle cx="60" cy="60" r="43" fill="none" stroke="#e59b35" stroke-width="12" stroke-dasharray="'+d+' '+c+'" stroke-dashoffset="'+(-a)+'" transform="rotate(-90 60 60)"/><circle cx="60" cy="60" r="43" fill="none" stroke="#8c9bb0" stroke-width="12" stroke-dasharray="'+p+' '+c+'" stroke-dashoffset="'+(-(a+d))+'" transform="rotate(-90 60 60)"/></svg><strong id="deliveryChartPercent">'+formatPercent(s.accuracy)+'</strong><span>On-Time</span>';
    }
}
function ensureReportCharts(name){
    const view=document.getElementById("report-"+name);if(!view)return null;
    let grid=view.querySelector(".report-extra-chart-grid");if(grid)return grid;
    grid=document.createElement("div");grid.className="report-extra-chart-grid";
    grid.innerHTML='<section class="report-panel report-extra-chart-panel"><div class="report-panel-header"><div><span>VISUAL ANALYTICS</span><h3 id="'+name+'GraphTitleA">Status Breakdown</h3></div></div><div id="'+name+'StatusGraph" class="report-bar-chart"></div></section><section class="report-panel report-extra-chart-panel"><div class="report-panel-header"><div><span>PERFORMANCE TREND</span><h3 id="'+name+'GraphTitleB">Monthly Trend</h3></div></div><div id="'+name+'MonthlyGraph" class="report-bar-chart"></div></section>';
    const stats=view.querySelector(".report-mini-stat-grid,.report-stat-grid"), heading=view.querySelector(".report-section-heading");
    if(stats)stats.insertAdjacentElement("afterend",grid);else if(heading)heading.insertAdjacentElement("afterend",grid);else view.prepend(grid);
    return grid;
}
function renderReportBars(id,items,format){
    const host=document.getElementById(id);if(!host)return;
    const rows=(items||[]).filter(x=>x&&Number.isFinite(Number(x.value))).slice(-8);
    if(!rows.length){host.innerHTML='<div class="report-chart-empty">No data available for this chart.</div>';return;}
    const max=Math.max(1,...rows.map(x=>Number(x.value)||0));
    host.innerHTML=rows.map(x=>'<div class="report-bar-row"><span class="report-bar-label" title="'+reportEscChart(x.label)+'">'+reportEscChart(x.label)+'</span><span class="report-bar-track"><i style="width:'+Math.max(0,(Number(x.value)||0)/max*100)+'%"></i></span><strong>'+reportEscChart(format?format(Number(x.value)||0):formatNumber(x.value))+'</strong></div>').join("");
}
function reportStatusBreakdown(rows){
    const counts={};(rows||[]).forEach(r=>{const s=String(normalizeStatus(r)||"Unknown").replace(/\b\w/g,c=>c.toUpperCase());counts[s]=(counts[s]||0)+1;});
    return Object.keys(counts).sort((a,b)=>counts[b]-counts[a]).map(k=>({label:k,value:counts[k]}));
}
function reportMonthlyBars(rows,dateFields,valueFields,countOnly){
    const sums={};(rows||[]).forEach(r=>{const m=reportMonthKey(getFirstValue(r,dateFields));if(!m)return;sums[m]=(sums[m]||0)+(countOnly?1:getNumber(r,valueFields));});
    return Object.keys(sums).sort().slice(-8).map(m=>({label:formatMonth(m),value:sums[m]}));
}
function renderAdditionalReportCharts(name){
    if(!name||name==="executive")return;
    const panel=ensureReportCharts(name);if(!panel)return;
    let rows=[],titleA="Status Breakdown",titleB="Monthly Trend",dateFields=["date","createdAt"],amountFields=["total","totalAmount"],countOnly=false;
    if(name==="sales-order"){rows=filteredReportData.salesOrders;titleB="Monthly Sales Order Value";dateFields=["date","createdAt"];amountFields=["total","soTotal","grandTotal","totalAmount"];}
    else if(name==="delivery"){rows=filteredReportData.deliveries.length?filteredReportData.deliveries:filteredReportData.deliveryReceipts;titleB="Monthly Deliveries";dateFields=["dateTransfer","transferDate","date","createdAt"];countOnly=true;}
    else if(name==="dr"){rows=filteredReportData.deliveryReceipts;titleA="DR Status";titleB="Monthly DR Volume";dateFields=["dateTransfer","transferDate","date","createdAt"];countOnly=true;}
    else if(name==="invoice"){rows=filteredReportData.invoices;titleB="Monthly Invoiced Value";dateFields=["date","invoiceDate","createdAt"];amountFields=["amountDue","invoiceAmount","totalAmount"];}
    else if(name==="payment"){rows=filteredReportData.payments;titleA="Collection Status";titleB="Monthly Collections";dateFields=["date","paymentDate","createdAt"];amountFields=["currentPayment","paymentAmount","amount"];}
    else if(name==="receivable"){rows=filteredReportData.invoices;titleA="Invoice Status";titleB="Monthly Receivable Value";dateFields=["date","invoiceDate","createdAt"];amountFields=["amountDue","invoiceAmount","totalAmount"];}
    else if(name==="management"){rows=filteredReportData.salesOrders;titleB="Monthly SO Value";dateFields=["date","createdAt"];amountFields=["total","soTotal","grandTotal","totalAmount"];}
    else if(name==="fleet"){
        rows=filteredReportData.fleet;titleA="Kilometers by Vehicle";titleB="Maintenance Cost by Vehicle";
        const vehicles={};rows.forEach(r=>{const v=String(getFirstValue(r,["vehicle","VEHICLE_CODE","plateNumber","PLATE_NUMBER"])||"Unknown");if(!vehicles[v])vehicles[v]={km:0,cost:0};vehicles[v].km+=getNumber(r,["totalKM","TOTAL_KM","km"]);vehicles[v].cost+=getNumber(r,["maintenanceCost","FINAL_COST","COST","ESTIMATED_COST"]);});
        setText(name+"GraphTitleA",titleA);setText(name+"GraphTitleB",titleB);
        renderReportBars(name+"StatusGraph",Object.keys(vehicles).map(v=>({label:v,value:vehicles[v].km})),v=>formatNumber(v)+" km");
        renderReportBars(name+"MonthlyGraph",Object.keys(vehicles).map(v=>({label:v,value:vehicles[v].cost})),formatCurrency);return;
    }
    setText(name+"GraphTitleA",titleA);setText(name+"GraphTitleB",titleB);
    renderReportBars(name+"StatusGraph",reportStatusBreakdown(rows),formatNumber);
    renderReportBars(name+"MonthlyGraph",reportMonthlyBars(rows,dateFields,amountFields,countOnly),countOnly?formatNumber:reportCompactMoney);
}
/* =========================================================
   GLOBAL EXPORTS
========================================================= */

window.initializeReport =
    initializeReport;

window.showReport =
    showReport;

window.loadAllReportData =
    loadAllReportData;

window.applyReportFilters =
    applyReportFilters;

window.clearReportFilters =
    clearReportFilters;

window.renderCurrentReport =
    renderCurrentReport;


/* =========================================================
   AUTO INITIALIZE
========================================================= */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeReport
    );

} else {

    initializeReport();

}
