
/* =====================================================
   LOGI-TECH DASHBOARD
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("LOGI-TECH Dashboard Loaded");

    showDashboardSection("summary");

    /* SALES ORDER PERIOD */
    const salesOrderPeriod =
        document.getElementById("salesOrderPeriod");

    if (salesOrderPeriod) {

        salesOrderPeriod.addEventListener("change", function () {

            loadSalesOrderDashboard();

        });

    }

});


/* =====================================================
   DASHBOARD SECTION NAVIGATION
===================================================== */

function showDashboardSection(section, button) {

    const sections = [
        "summarySection",
        "salesOrderSection",
        "logisticsSection",
        "financeSection"
    ];


    /* HIDE ALL */

    sections.forEach(function (sectionId) {

        const element =
            document.getElementById(sectionId);

        if (element) {
            element.style.display = "none";
        }

    });


    /* SHOW SELECTED */

    let selectedSection = null;

    switch (section) {

        case "summary":
            selectedSection =
                document.getElementById("summarySection");
            break;

        case "sales-order":
            selectedSection =
                document.getElementById("salesOrderSection");
            break;

        case "logistics":
            selectedSection =
                document.getElementById("logisticsSection");
            break;

        case "finance":
            selectedSection =
                document.getElementById("financeSection");
            break;

    }


    if (selectedSection) {
        selectedSection.style.display = "block";
    }


    /* ACTIVE TAB */

    document
        .querySelectorAll(".dashboard-tab")
        .forEach(function (tab) {

            tab.classList.remove("active");

        });


    if (button) {
        button.classList.add("active");
    }


    /* LOAD DATA */

    if (section === "summary") {

        loadSummary();

    }


    if (section === "sales-order") {

        loadSalesOrderDashboard();

    }


    if (section === "logistics") {

        loadLogisticsDashboard();

    }


    if (section === "finance") {

        loadFinanceDashboard();

    }

}


/* =====================================================
   SUMMARY
===================================================== */

function loadSummary() {

    console.log("Summary section opened.");

    /*
       Existing Summary formula will be connected here.
       We are not changing the Summary layout.
    */

}


/* =====================================================
   SALES ORDER DASHBOARD
===================================================== */

function loadSalesOrderDashboard() {

    const savedOrders =
        localStorage.getItem("salesOrders");


    let salesOrders = [];


    if (savedOrders) {

        try {

            salesOrders =
                JSON.parse(savedOrders);

        } catch (error) {

            console.error(
                "Error reading Sales Orders:",
                error
            );

            salesOrders = [];

        }

    }


    /* PERIOD FILTER */

    const periodElement =
        document.getElementById("salesOrderPeriod");


    const selectedPeriod =
        periodElement
            ? periodElement.value
            : "overall";


    if (selectedPeriod !== "overall") {

        salesOrders =
            salesOrders.filter(function (so) {

                if (!so.dateCreation) {
                    return false;
                }


                const month =
                    String(
                        new Date(so.dateCreation)
                            .getMonth() + 1
                    ).padStart(2, "0");


                return month === selectedPeriod;

            });

    }


    /* =================================================
       TOTAL
    ================================================= */

    const totalSO =
        salesOrders.length;


    const totalSOAmount =
        salesOrders.reduce(function (total, so) {

            return total +
                Number(so.grandTotal || 0);

        }, 0);


    /* =================================================
       ACTIVE
    ================================================= */

    const activeOrders =
        salesOrders.filter(function (so) {

            return String(so.status || "")
                .toUpperCase() !== "CANCELLED";

        });


    const activeAmount =
        activeOrders.reduce(function (total, so) {

            return total +
                Number(so.grandTotal || 0);

        }, 0);


    /* =================================================
       CANCELLED
    ================================================= */

    const cancelledOrders =
        salesOrders.filter(function (so) {

            return String(so.status || "")
                .toUpperCase() === "CANCELLED";

        });


    const cancelledAmount =
        cancelledOrders.reduce(function (total, so) {

            return total +
                Number(so.grandTotal || 0);

        }, 0);


    /* =================================================
       DELIVERED
       NO DR MODULE YET
    ================================================= */

    const deliveredOrders = [];

    const deliveredAmount = 0;


    /* =================================================
       PARTIAL
       NO DR MODULE YET
    ================================================= */

    const partialOrders = [];

    const partialAmount = 0;


    /* =================================================
       UPDATE CARDS
    ================================================= */

    setText(
        "salesDashboardTotal",
        totalSO
    );


    setText(
        "salesDashboardTotalAmount",
        formatPeso(totalSOAmount)
    );


    setText(
        "salesDashboardActive",
        activeOrders.length
    );


    setText(
        "salesDashboardActiveAmount",
        formatPeso(activeAmount)
    );


    setText(
        "salesDashboardCancelled",
        cancelledOrders.length
    );


    setText(
        "salesDashboardCancelledAmount",
        formatPeso(cancelledAmount)
    );


    setText(
        "salesDashboardDelivered",
        deliveredOrders.length
    );


    setText(
        "salesDashboardDeliveredAmount",
        formatPeso(deliveredAmount)
    );


    setText(
        "salesDashboardPartial",
        partialOrders.length
    );


    setText(
        "salesDashboardPartialAmount",
        formatPeso(partialAmount)
    );


    /* =================================================
       SAVE CURRENT DASHBOARD DATA
       FOR POPUP USE
    ================================================= */

    window.salesOrderDashboardData = {

        all: salesOrders,

        active: activeOrders,

        cancelled: cancelledOrders,

        delivered: deliveredOrders,

        partial: partialOrders

    };


    console.log(
        "Sales Order Dashboard:",
        window.salesOrderDashboardData
    );

}


/* =====================================================
   SALES ORDER POPUP
===================================================== */

function openSalesOrderPopup(type) {

    const popup =
        document.getElementById("salesOrderPopup");

    const title =
        document.getElementById("salesOrderPopupTitle");

    const list =
        document.getElementById("salesOrderPopupList");


    if (!popup || !title || !list) {
        return;
    }


    const data =
        window.salesOrderDashboardData || {

            all: [],
            active: [],
            cancelled: [],
            delivered: [],
            partial: []

        };


    const orders =
        data[type] || [];


    /* POPUP TITLE */

    const titles = {

        all: "TOTAL SALES ORDERS",

        active: "ACTIVE SALES ORDERS",

        cancelled: "CANCELLED SALES ORDERS",

        delivered: "DELIVERED SALES ORDERS",

        partial: "PARTIALLY DELIVERED SALES ORDERS"

    };


    title.textContent =
        titles[type] || "SALES ORDERS";


    /* CLEAR LIST */

    list.innerHTML = "";


    /* NO DATA */

    if (orders.length === 0) {

        list.innerHTML = `
            <div class="sales-order-popup-empty">
                No Sales Orders found.
            </div>
        `;

        popup.style.display = "flex";

        return;

    }


    /* CREATE SO LIST */

    orders.forEach(function (so) {

        const row =
            document.createElement("div");


        row.className =
            "sales-order-popup-row";


        row.innerHTML = `
            <span class="popup-so-number">
                ${escapeHTML(so.soNumber || "NO SO NUMBER")}
            </span>

            <span class="popup-client">
                Client:
                ${escapeHTML(so.clientName || "No Client")}
            </span>
        `;


        list.appendChild(row);

    });


    popup.style.display = "flex";

}


/* =====================================================
   CLOSE POPUP
===================================================== */

function closeSalesOrderPopup() {

    const popup =
        document.getElementById("salesOrderPopup");


    if (popup) {
        popup.style.display = "none";
    }

}


/* =====================================================
   LOGISTICS
===================================================== */

function loadLogisticsDashboard() {

    console.log(
        "Logistics Dashboard opened."
    );

}


/* =====================================================
   FINANCE
===================================================== */

function loadFinanceDashboard() {

    console.log(
        "Finance Dashboard opened."
    );

}


/* =====================================================
   HELPER - TEXT
===================================================== */

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* =====================================================
   HELPER - PESO
===================================================== */

function formatPeso(amount) {

    return "₱" +
        Number(amount || 0)
            .toLocaleString("en-PH", {

                minimumFractionDigits: 2,

                maximumFractionDigits: 2

            });

}


/* =====================================================
   HELPER - SECURITY
===================================================== */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}

