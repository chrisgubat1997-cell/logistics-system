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

    populateAnalyticsVehicleFilter();

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
   LOAD VEHICLES FROM DATABASE
========================================================= */


function bindSearchableVehicleSelect(select, searchInput, allLabel) {
    if (!select || !searchInput) return;
    select._allVehicleOptions = Array.from(select.options).map(function(option) { return option.cloneNode(true); });
    if (!searchInput.dataset.vehicleSearchBound) {
        searchInput.addEventListener("input", function() {
            const query = searchInput.value.trim().toLowerCase();
            const selected = select.value;
            const allOptions = select._allVehicleOptions || [];
            select.innerHTML = "";
            allOptions.filter(function(option, index) {
                return index === 0 || !query || option.textContent.toLowerCase().includes(query) || option.value.toLowerCase().includes(query);
            }).forEach(function(option) { select.appendChild(option.cloneNode(true)); });
            if (Array.from(select.options).some(function(option) { return option.value === selected; })) select.value = selected;
        });
        select.addEventListener("change", function() {
            const chosenValue = select.value;
            searchInput.value = "";
            select.innerHTML = "";
            (select._allVehicleOptions || []).forEach(function(option) { select.appendChild(option.cloneNode(true)); });
            if (Array.from(select.options).some(function(option) { return option.value === chosenValue; })) select.value = chosenValue;
            select.dataset.selectedVehicle = select.value;
        });
        searchInput.dataset.vehicleSearchBound = "true";
    }
    select.dataset.selectedVehicle = select.value;
}

async function populateAnalyticsVehicleFilter() {
    const select = document.getElementById("vehicleFilter");
    if (!select) return;
    const previousValue = select.value || window.FleetAnalytics.filters.vehicle || "ALL";
    const apiUrl = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

    try {
        const response = await fetch(apiUrl + "?action=getFleetAnalyticsData&_=" + Date.now(), { method: "GET", cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const result = await response.json();
        if (!result || result.success === false) throw new Error((result && (result.message || result.error)) || "Vehicle data could not be loaded.");
        const vehicles = Array.isArray(result.vehicles) ? result.vehicles : [];
        select.innerHTML = '<option value="ALL">All Vehicle</option>';
        vehicles.filter(function(vehicle) {
            const code = String(vehicle.VEHICLE_CODE || vehicle.vehicleCode || vehicle.code || "").trim();
            const status = String(vehicle.STATUS || vehicle.status || "").trim().toUpperCase();
            return code && (!status || status === "ACTIVE");
        }).sort(function(a, b) {
            return String(a.PLATE_NUMBER || a.PLATE_NO || "").localeCompare(String(b.PLATE_NUMBER || b.PLATE_NO || ""));
        }).forEach(function(vehicle) {
            const code = String(vehicle.VEHICLE_CODE || vehicle.vehicleCode || vehicle.code || "").trim();
            const plate = String(vehicle.PLATE_NUMBER || vehicle.PLATE_NO || vehicle.LICENSE_PLATE || vehicle.PLATE || vehicle.plateNumber || vehicle.plateNo || "").trim();
            const option = document.createElement("option");
            option.value = code;
            const description = String(vehicle.MODEL || vehicle.VEHICLE_TYPE || vehicle.BRAND || vehicle.model || vehicle.vehicleType || vehicle.brand || "").trim();
            const knownDescriptions = {
                "AHA3536": "Mirage",
                "DBH4666": "Vios Green",
                "DBH4932": "Vios Red",
                "NAD2535": "Toyota Innova",
                "NBD8038": "Nissan Navarra",
                "NES4915": "Hilux White",
                "NET9068": "Isuzu Dropside",
                "NET9077": "Isuzu MUV",
                "NEX4060": "MUV (L300)",
                "TBO710": "Isuzu Dropside",
                "NLC2072": "Isuzu QLR"
            };
            const displayDescription = description || knownDescriptions[plate.toUpperCase()] || code;
            option.textContent = plate ? plate + " - " + displayDescription : displayDescription;
            select.appendChild(option);
        });
        select.value = Array.from(select.options).some(function(option) { return option.value === previousValue; }) ? previousValue : "ALL";
        bindSearchableVehicleSelect(select, document.getElementById("vehicleFilterSearch"));
        window.FleetAnalytics.filters.vehicle = select.value;
        if (typeof handleFilterChange === "function") handleFilterChange();
    } catch (error) {
        console.error("Could not load Vehicle filter from VEHICLES sheet:", error);
    }
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
