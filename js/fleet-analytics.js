```javascript
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
    },

    initialized: false

};


/* =========================================================
   INITIALIZE
   IMPORTANT:
   This function is called by index.html AFTER the
   Fleet Analytics module and required JS files are loaded.
========================================================= */

function initializeFleetAnalytics() {

    /* Prevent duplicate initialization */

    if (window.FleetAnalytics.initialized) {

        console.log(
            "Fleet Analytics already initialized."
        );

        return;

    }


    console.log(
        "Initializing Fleet & Delivery Analytics..."
    );


    /* Mark initialized */

    window.FleetAnalytics.initialized = true;


    /* Setup */

    setupAnalyticsTabs();

    setupFilters();

    activateSection(
        window.FleetAnalytics.currentSection
    );

    refreshCurrentAnalytics();


    console.log(
        "Fleet & Delivery Analytics initialized successfully."
    );

}


/* =========================================================
   TAB SETUP
========================================================= */

function setupAnalyticsTabs() {

    const tabs =
        document.querySelectorAll(
            ".analytics-tab"
        );


    if (!tabs.length) {

        console.warn(
            "No analytics tabs found."
        );

        return;

    }


    tabs.forEach(function (tab) {

        /* Prevent duplicate event listeners */

        if (
            tab.dataset.analyticsListener === "true"
        ) {

            return;

        }


        tab.dataset.analyticsListener = "true";


        tab.addEventListener(
            "click",
            function () {

                const section =
                    this.dataset.section;


                if (!section) {

                    return;

                }


                switchAnalytics(section);

            }
        );

    });


    console.log(
        "Analytics tabs initialized:",
        tabs.length
    );

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


    if (
        !validSections.includes(section)
    ) {

        console.warn(
            "Invalid analytics section:",
            section
        );

        return;

    }


    /* Save current section */

    window.FleetAnalytics.currentSection =
        section;


    /* Change visible section */

    activateSection(section);


    /* Refresh data */

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


    /* =====================================================
       HIDE ALL ANALYTICS SECTIONS
    ===================================================== */

    Object.values(sections).forEach(
        function (element) {

            if (!element) {

                return;

            }


            element.classList.remove(
                "active"
            );

        }
    );


    /* =====================================================
       SHOW SELECTED SECTION
    ===================================================== */

    const selected =
        sections[section];


    if (selected) {

        selected.classList.add(
            "active"
        );

    }


    /* =====================================================
       UPDATE ANALYTICS BUTTONS
    ===================================================== */

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


    /* =====================================================
       VEHICLE FILTER
    ===================================================== */

    if (vehicleFilter) {

        if (
            vehicleFilter.dataset.analyticsListener
            !== "true"
        ) {

            vehicleFilter.dataset.analyticsListener =
                "true";


            vehicleFilter.addEventListener(
                "change",
                function () {

                    window.FleetAnalytics.filters.vehicle =
                        this.value;


                    handleFilterChange();

                }
            );

        }


        window.FleetAnalytics.filters.vehicle =
            vehicleFilter.value || "ALL";

    }


    /* =====================================================
       YEAR FILTER
    ===================================================== */

    if (yearFilter) {

        if (
            yearFilter.dataset.analyticsListener
            !== "true"
        ) {

            yearFilter.dataset.analyticsListener =
                "true";


            yearFilter.addEventListener(
                "change",
                function () {

                    window.FleetAnalytics.filters.year =
                        this.value;


                    handleFilterChange();

                }
            );

        }


        window.FleetAnalytics.filters.year =
            yearFilter.value || "2026";

    }


    /* =====================================================
       MONTH FILTER
    ===================================================== */

    if (monthFilter) {

        if (
            monthFilter.dataset.analyticsListener
            !== "true"
        ) {

            monthFilter.dataset.analyticsListener =
                "true";


            monthFilter.addEventListener(
                "change",
                function () {

                    window.FleetAnalytics.filters.month =
                        this.value;


                    handleFilterChange();

                }
            );

        }


        window.FleetAnalytics.filters.month =
            monthFilter.value || "ALL";

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


    console.log(
        "Refreshing analytics:",
        section
    );


    switch (section) {


        /* =================================================
           FLEET PERFORMANCE
        ================================================= */

        case "fleet":

            if (
                typeof window.refreshFleetPerformance ===
                "function"
            ) {

                window.refreshFleetPerformance();

            }

            else {

                console.warn(
                    "refreshFleetPerformance() is not available."
                );

            }

            break;


        /* =================================================
           DELIVERY PERFORMANCE
        ================================================= */

        case "delivery":

            if (
                typeof window.refreshDeliveryPerformance ===
                "function"
            ) {

                window.refreshDeliveryPerformance();

            }

            else {

                console.warn(
                    "refreshDeliveryPerformance() is not available."
                );

            }

            break;


        /* =================================================
           DR MONITORING
        ================================================= */

        case "dr":

            if (
                typeof window.refreshDRMonitoring ===
                "function"
            ) {

                window.refreshDRMonitoring();

            }

            else {

                console.warn(
                    "refreshDRMonitoring() is not available."
                );

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

    return (
        window.FleetAnalytics.currentSection
    );

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


    if (
        !Number.isFinite(number)
    ) {

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


    if (
        !Number.isFinite(number)
    ) {

        return "₱0.00";

    }


    return number.toLocaleString(
        "en-PH",
        {

            style: "currency",

            currency: "PHP",

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2

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
   ADD / REMOVE LOADING STATE
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
   GLOBAL FUNCTIONS
========================================================= */

window.initializeFleetAnalytics =
    initializeFleetAnalytics;


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
```
