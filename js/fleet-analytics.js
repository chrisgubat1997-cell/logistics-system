/* =========================================================
   LOGIS-TECH SYSTEM
   FLEET & DELIVERY ANALYTICS
   MAIN CONTROLLER
========================================================= */


/* =========================================================
   GLOBAL ANALYTICS STATE
========================================================= */

window.FleetAnalytics = {

    currentSection: "fleet",

    filters: {

        vehicle: "ALL",

        year: "2026",

        month: "10"

    }

};


/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    initializeFleetAnalytics();

});


/* =========================================================
   INITIALIZE
========================================================= */

function initializeFleetAnalytics() {

    setupAnalyticsTabs();

    setupFilters();

    activateSection("fleet");

    refreshCurrentAnalytics();

}


/* =========================================================
   TAB SETUP
========================================================= */

function setupAnalyticsTabs() {

    const tabs =
        document.querySelectorAll(".analytics-tab");


    tabs.forEach(function (tab) {

        tab.addEventListener("click", function () {

            const section =
                this.dataset.section;

            if (!section) {
                return;
            }

            switchAnalytics(section);

        });

    });

}


/* =========================================================
   SWITCH ANALYTICS
========================================================= */

function switchAnalytics(section) {

    const validSections = [
        "fleet",
        "delivery",
        "dr"
    ];


    if (!validSections.includes(section)) {

        console.warn(
            "Invalid analytics section:",
            section
        );

        return;

    }


    window.FleetAnalytics.currentSection =
        section;


    activateSection(section);

    refreshCurrentAnalytics();

}


/* =========================================================
   ACTIVATE SECTION
========================================================= */

function activateSection(section) {

    const sections = {

        fleet:
            document.getElementById(
                "fleetPerformanceSection"
            ),

        delivery:
            document.getElementById(
                "deliveryPerformanceSection"
            ),

        dr:
            document.getElementById(
                "drMonitoringSection"
            )

    };


    /* Hide all sections */

    Object.values(sections).forEach(
        function (element) {

            if (!element) {
                return;
            }

            element.classList.remove("active");

        }
    );


    /* Activate selected section */

    const selected =
        sections[section];


    if (selected) {

        selected.classList.add("active");

    }


    /* Update buttons */

    const tabs =
        document.querySelectorAll(
            ".analytics-tab"
        );


    tabs.forEach(function (tab) {

        const isActive =
            tab.dataset.section === section;


        tab.classList.toggle(
            "active",
            isActive
        );

    });

}


/* =========================================================
   FILTER SETUP
========================================================= */

function setupFilters() {

    const vehicleFilter =
        document.getElementById(
            "vehicleFilter"
        );

    const yearFilter =
        document.getElementById(
            "yearFilter"
        );

    const monthFilter =
        document.getElementById(
            "monthFilter"
        );


    if (vehicleFilter) {

        vehicleFilter.addEventListener(
            "change",
            function () {

                window.FleetAnalytics.filters.vehicle =
                    this.value;

                handleFilterChange();

            }
        );

    }


    if (yearFilter) {

        yearFilter.addEventListener(
            "change",
            function () {

                window.FleetAnalytics.filters.year =
                    this.value;

                handleFilterChange();

            }
        );

    }


    if (monthFilter) {

        monthFilter.addEventListener(
            "change",
            function () {

                window.FleetAnalytics.filters.month =
                    this.value;

                handleFilterChange();

            }
        );

    }


    /* Get initial values from HTML */

    if (vehicleFilter) {

        window.FleetAnalytics.filters.vehicle =
            vehicleFilter.value;

    }


    if (yearFilter) {

        window.FleetAnalytics.filters.year =
            yearFilter.value;

    }


    if (monthFilter) {

        window.FleetAnalytics.filters.month =
            monthFilter.value;

    }

}


/* =========================================================
   FILTER CHANGE
========================================================= */

function handleFilterChange() {

    const filters =
        window.FleetAnalytics.filters;


    console.log(
        "Analytics filters:",
        filters
    );


    refreshCurrentAnalytics();

}


/* =========================================================
   REFRESH CURRENT ANALYTICS
========================================================= */

function refreshCurrentAnalytics() {

    const section =
        window.FleetAnalytics.currentSection;


    /*
       We don't hard-code the analytics
       calculation here.

       Each module owns its own data:
       
       Fleet:
       fleet-performance.js

       Delivery:
       delivery-performance.js

       DR:
       dr-monitoring.js
    */


    switch (section) {

        case "fleet":

            if (
                typeof window.refreshFleetPerformance ===
                "function"
            ) {

                window.refreshFleetPerformance();

            }

            break;


        case "delivery":

            if (
                typeof window.refreshDeliveryPerformance ===
                "function"
            ) {

                window.refreshDeliveryPerformance();

            }

            break;


        case "dr":

            if (
                typeof window.refreshDRMonitoring ===
                "function"
            ) {

                window.refreshDRMonitoring();

            }

            break;

    }

}


/* =========================================================
   GET CURRENT FILTERS
========================================================= */

function getAnalyticsFilters() {

    return {

        vehicle:
            window.FleetAnalytics.filters.vehicle,

        year:
            window.FleetAnalytics.filters.year,

        month:
            window.FleetAnalytics.filters.month

    };

}


/* =========================================================
   GET ACTIVE SECTION
========================================================= */

function getCurrentAnalyticsSection() {

    return window.FleetAnalytics.currentSection;

}


/* =========================================================
   FORMAT NUMBER
========================================================= */

function formatNumber(
    value,
    decimals = 0
) {

    const number =
        Number(value);


    if (!Number.isFinite(number)) {

        return "0";

    }


    return number.toLocaleString(
        "en-US",
        {
            minimumFractionDigits:
                decimals,

            maximumFractionDigits:
                decimals
        }
    );

}


/* =========================================================
   FORMAT KM
========================================================= */

function formatKilometer(value) {

    return formatNumber(
        value,
        0
    );

}


/* =========================================================
   FORMAT LITERS
========================================================= */

function formatLiters(value) {

    return formatNumber(
        value,
        0
    );

}


/* =========================================================
   FORMAT KM/L
========================================================= */

function formatKmPerLiter(value) {

    return formatNumber(
        value,
        2
    );

}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(value) {

    const number =
        Number(value);


    if (!Number.isFinite(number)) {

        return "₱0.00";

    }


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


/* =========================================================
   FORMAT DAYS
========================================================= */

function formatDays(value) {

    return formatNumber(
        value,
        1
    );

}


/* =========================================================
   EMPTY STATE
========================================================= */

function showAnalyticsEmptyState(
    containerId,
    message = "No data available"
) {

    const container =
        document.getElementById(
            containerId
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="analytics-empty-state">

            <div class="empty-icon">
                📊
            </div>

            <strong>
                ${message}
            </strong>

            <span>
                Try changing the selected filters.
            </span>

        </div>

    `;

}


/* =========================================================
   SAFE ELEMENT UPDATE
========================================================= */

function setElementText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.textContent =
        value;

}


/* =========================================================
   ADD LOADING STATE
========================================================= */

function setAnalyticsLoading(
    elementId,
    loading = true
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.classList.toggle(
        "analytics-loading",
        loading
    );

}


/* =========================================================
   WINDOW EVENTS
========================================================= */

window.switchAnalytics =
    switchAnalytics;

window.getAnalyticsFilters =
    getAnalyticsFilters;

window.getCurrentAnalyticsSection =
    getCurrentAnalyticsSection;

window.formatNumber =
    formatNumber;

window.formatKilometer =
    formatKilometer;

window.formatLiters =
    formatLiters;

window.formatKmPerLiter =
    formatKmPerLiter;

window.formatCurrency =
    formatCurrency;

window.formatDays =
    formatDays;

window.setElementText =
    setElementText;

window.setAnalyticsLoading =
    setAnalyticsLoading;

window.showAnalyticsEmptyState =
    showAnalyticsEmptyState;
