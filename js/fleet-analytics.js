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
========================================================= */

function initializeFleetAnalytics() {

    console.log(
        "Initializing Fleet & Delivery Analytics..."
    );


    /*
       We allow the initialization function to run
       again safely, but we DO NOT create duplicate
       click listeners because event delegation below
       uses only one listener.
    */

    setupAnalyticsTabs();

    setupFilters();

    activateSection(
        window.FleetAnalytics.currentSection
    );

    refreshCurrentAnalytics();


    window.FleetAnalytics.initialized = true;


    console.log(
        "Fleet & Delivery Analytics initialized."
    );

}


/* =========================================================
   TAB SETUP
   EVENT DELEGATION
========================================================= */

function setupAnalyticsTabs() {

    /*
       IMPORTANT:

       Fleet Analytics HTML is dynamically loaded
       into index.html.

       Therefore we use document-level event
       delegation instead of attaching listeners
       directly to the buttons.
    */


    if (
        window.FleetAnalytics.tabsListenerAttached
    ) {

        return;

    }


    document.addEventListener(
        "click",
        function (event) {

            const tab =
                event.target.closest(
                    ".analytics-tab"
                );


            /*
               Click was not on an analytics tab.
            */

            if (!tab) {

                return;

            }


            const section =
                tab.dataset.section;


            if (!section) {

                console.warn(
                    "Analytics tab has no data-section:",
                    tab
                );

                return;

            }


            console.log(
                "Analytics tab clicked:",
                section
            );


            switchAnalytics(section);

        }
    );


    window.FleetAnalytics.tabsListenerAttached =
        true;


    console.log(
        "Analytics tab event delegation attached."
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


    console.log(
        "Switching analytics to:",
        section
    );


    /*
       Save current section
    */

    window.FleetAnalytics.currentSection =
        section;


    /*
       Change visible section
    */

    activateSection(section);


    /*
       Refresh the selected analytics
    */

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


    console.log(
        "Activating section:",
        section
    );


    /*
       =====================================================
       HIDE ALL
       =====================================================
    */

    Object.keys(sections).forEach(
        function (key) {

            const element =
                sections[key];


            if (!element) {

                console.warn(
                    "Section not found:",
                    key
                );

                return;

            }


            element.classList.remove(
                "active"
            );

        }
    );


    /*
       =====================================================
       SHOW SELECTED
       =====================================================
    */

    const selected =
        sections[section];


    if (!selected) {

        console.error(
            "Selected analytics section not found:",
            section
        );

        return;

    }


    selected.classList.add(
        "active"
    );


    /*
       =====================================================
       UPDATE BUTTON ACTIVE STATE
       =====================================================
    */

    const tabs =
        document.querySelectorAll(
            ".analytics-tab"
        );


    tabs.forEach(
        function (tab) {

            const isActive =
                tab.dataset.section ===
                section;


            tab.classList.toggle(
                "active",
                isActive
            );

        }
    );


    console.log(
        "Active section:",
        selected.id
    );

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


    /*
       VEHICLE
    */

    if (vehicleFilter) {

        if (
            !vehicleFilter.dataset.analyticsListener
        ) {

            vehicleFilter.addEventListener(
                "change",
                function () {

                    window.FleetAnalytics.filters.vehicle =
                        this.value;


                    handleFilterChange();

                }
            );


            vehicleFilter.dataset.analyticsListener =
                "true";

        }


        window.FleetAnalytics.filters.vehicle =
            vehicleFilter.value || "ALL";

    }


    /*
       YEAR
    */

    if (yearFilter) {

        if (
            !yearFilter.dataset.analyticsListener
        ) {

            yearFilter.addEventListener(
                "change",
                function () {

                    window.FleetAnalytics.filters.year =
                        this.value;


                    handleFilterChange();

                }
            );


            yearFilter.dataset.analyticsListener =
                "true";

        }


        window.FleetAnalytics.filters.year =
            yearFilter.value || "2026";

    }


    /*
       MONTH
    */

    if (monthFilter) {

        if (
            !monthFilter.dataset.analyticsListener
        ) {

            monthFilter.addEventListener(
                "change",
                function () {

                    window.FleetAnalytics.filters.month =
                        this.value;


                    handleFilterChange();

                }
            );


            monthFilter.dataset.analyticsListener =
                "true";

        }


        window.FleetAnalytics.filters.month =
            monthFilter.value || "ALL";

    }

}


/* =========================================================
   FILTER CHANGE
========================================================= */

function handleFilterChange() {

    console.log(
        "Analytics filters changed:",
        window.FleetAnalytics.filters
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
                    "refreshFleetPerformance() not available."
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
                    "refreshDeliveryPerformance() not available."
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
                    "refreshDRMonitoring() not available."
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
   LOADING STATE
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
