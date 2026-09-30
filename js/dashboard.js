
/* =====================================================
   LOGI-TECH DASHBOARD
   TAB NAVIGATION
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("LOGI-TECH Dashboard Loaded");

    showDashboardSection("summary");

});


/* =====================================================
   DASHBOARD SECTION NAVIGATION
===================================================== */

function showDashboardSection(section, button) {

    /* -------------------------------------------------
       GET ALL SECTIONS
    ------------------------------------------------- */

    const sections = [
        "summarySection",
        "salesOrderSection",
        "logisticsSection",
        "financeSection"
    ];

    /* -------------------------------------------------
       HIDE ALL SECTIONS
    ------------------------------------------------- */

    sections.forEach(function (sectionId) {

        const element = document.getElementById(sectionId);

        if (element) {
            element.style.display = "none";
        }

    });


    /* -------------------------------------------------
       SHOW SELECTED SECTION
    ------------------------------------------------- */

    let selectedSection = null;

    switch (section) {

        case "summary":
            selectedSection = document.getElementById("summarySection");
            break;

        case "sales-order":
            selectedSection = document.getElementById("salesOrderSection");
            break;

        case "logistics":
            selectedSection = document.getElementById("logisticsSection");
            break;

        case "finance":
            selectedSection = document.getElementById("financeSection");
            break;

    }

    if (selectedSection) {
        selectedSection.style.display = "block";
    }


    /* -------------------------------------------------
       ACTIVE BUTTON
    ------------------------------------------------- */

    document
        .querySelectorAll(".dashboard-tab")
        .forEach(function (tab) {

            tab.classList.remove("active");

        });


    if (button) {
        button.classList.add("active");
    }


    /* -------------------------------------------------
       LOAD SECTION DATA
    ------------------------------------------------- */

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

    console.log("Loading Summary...");

    /*
       Summary formula will be added here.
       We will connect this to the actual
       Sales Order + Delivery data.
    */

}


/* =====================================================
   SALES ORDER DASHBOARD
===================================================== */

function loadSalesOrderDashboard() {

    console.log("Loading Sales Order Dashboard...");

}


/* =====================================================
   LOGISTICS DASHBOARD
===================================================== */

function loadLogisticsDashboard() {

    console.log("Loading Logistics Dashboard...");

}


/* =====================================================
   FINANCE DASHBOARD
===================================================== */

function loadFinanceDashboard() {

    console.log("Loading Finance Dashboard...");

}
