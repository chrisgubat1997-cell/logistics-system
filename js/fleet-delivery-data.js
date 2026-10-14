/* =========================================================
   LOGIS-TECH SYSTEM
   FLEET & DELIVERY DATA ENTRY
   JAVASCRIPT
   VERSION: 20261006-01

   PURPOSE:
   - Fleet / Trip Ticket
   - Fuel
   - Maintenance
   - Delivery
   - DR
   - LocalStorage central data
   - Search / Filter
   - Delete
   - Data preparation for Fleet Analytics
========================================================= */


/* =========================================================
   STORAGE
========================================================= */

const FLEET_DELIVERY_API_URL =
    "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

const FLEET_DELIVERY_DATA_VERSION = 2;


/* =========================================================
   VEHICLES
========================================================= */

const FDE_VEHICLES = [
    "TBO710",
    "TBO711",
    "TBO712",
    "TBO713",
    "TBO714",
    "TBO715",
    "TBO716",
    "TBO717",
    "TBO718",
    "TBO719",
    "TBO720",
    "TBO721",
    "TBO722",
    "TBO723",
    "TBO724"
];


/* =========================================================
   CURRENT STATE
========================================================= */

let fdeInitialized = false;

let fdeData = {
    version: FLEET_DELIVERY_DATA_VERSION,
    tripTickets: [],
    fuel: [],
    maintenance: [],
    deliveries: [],
    dr: []
};


/* =========================================================
   INITIALIZE
========================================================= */

async function initializeFleetDataEntry() {

    console.log(
        "========================================"
    );

    console.log(
        "Initializing Fleet & Delivery Data Entry..."
    );


    try {
        await loadFleetDeliveryData();
    } catch (error) {
        console.error("Fleet Data Entry API load failed:", error);
        updateStorageStatus(false, "API connection failed");
        alert("Hindi ma-load ang Fleet Data Entry mula sa Google Sheets. Pakisuri ang Apps Script API at deployment.");
    }

    initializeFleetTabs();

    initializeFleetCalculations();

    initializeFleetButtons();

    initializeFleetRecords();

    renderFleetDeliveryRecords();


    fdeInitialized = true;


    console.log(
        "Fleet & Delivery Data Entry initialized."
    );

    console.log(
        "Storage:",
        FLEET_DELIVERY_STORAGE_KEY
    );

}


/* =========================================================
   LOAD DATA
========================================================= */

async function loadFleetDeliveryData() {
    const result = await fleetDeliveryAPI("getFleetAnalyticsData");
    const vehicles = Array.isArray(result.vehicles) ? result.vehicles : [];
    const trips = Array.isArray(result.tripTickets) ? result.tripTickets : [];
    const fuel = Array.isArray(result.fuelTransactions) ? result.fuelTransactions : [];
    const maintenance = Array.isArray(result.maintenance) ? result.maintenance : [];
    const monitoring = Array.isArray(result.drMonitoring) ? result.drMonitoring : [];

    fdeData = {
        version: FLEET_DELIVERY_DATA_VERSION,
        vehicles: vehicles,
        tripTickets: trips.map(function(r) {
            return {
                id: r.TRIP_ID || "",
                type: "tripTicket",
                tripTicketNo: r.TRIP_TICKET_NO || "",
                tripSequence: r.TRIP_SEQUENCE || "",
                createdBy: r.CREATED_BY || "",
                date: fdeDateForInput(r.TRIP_DATE),
                vehicle: r.VEHICLE_CODE || "",
                driver: r.DRIVER_NAME || "",
                startKm: Number(r.START_KM || 0),
                endKm: Number(r.END_KM || 0),
                totalKm: Number(r.TOTAL_KM || 0),
                origin: r.ORIGIN || "",
                destination: r.DESTINATION || "",
                purpose: r.PURPOSE || "",
                routeDetails: parseFleetRouteDetails(r.ROUTE_DETAILS),
                remarks: r.REMARKS || "",
                status: r.STATUS || "",
                createdAt: r.CREATED_AT || "",
                updatedAt: r.UPDATED_AT || ""
            };
        }),
        fuel: fuel.map(function(r) {
            return {
                id: r.FUEL_ID || "",
                type: "fuel",
                date: fdeDateForInput(r.FUEL_DATE),
                vehicle: r.VEHICLE_CODE || "",
                tripTicketNo: r.TRIP_TICKET_NO || "",
                station: r.FUEL_STATION || "",
                liters: Number(r.LITERS || 0),
                amount: Number(r.AMOUNT || 0),
                odometer: Number(r.ODOMETER || 0),
                fuelReceiptNo: r.FUEL_RECEIPT_NO || "",
                remarks: r.REMARKS || "",
                createdAt: r.CREATED_AT || "",
                updatedAt: r.UPDATED_AT || ""
            };
        }),
        maintenance: maintenance.map(function(r) {
            return {
                id: r.MAINTENANCE_ID || "",
                type: "maintenance",
                date: fdeDateForInput(r.MAINTENANCE_DATE),
                vehicle: r.VEHICLE_CODE || "",
                maintenanceType: r.MAINTENANCE_TYPE || "",
                defect: r.DEFECT || "",
                repair: r.REPAIR_ACTION || "",
                cost: Number(r.COST || 0),
                idleDays: Number(r.IDLE_DAYS || 0),
                status: r.STATUS || "",
                remarks: r.REMARKS || "",
                createdAt: r.CREATED_AT || "",
                updatedAt: r.UPDATED_AT || ""
            };
        }),
        deliveries: [],
        dr: monitoring.map(function(r) {
            return {
                id: r.DR_MONITORING_ID || "",
                type: "dr",
                drNumber: r.DR_NUMBER || "",
                deliveryNo: r.DR_NUMBER || "",
                soNumber: r.SO_NUMBER || "",
                client: r.CLIENT_NAME || "",
                project: r.PROJECT || "",
                vehicle: r.VEHICLE_CODE || "",
                dateTransfer: fdeDateForInput(r.DATE_TRANSFER),
                committedDate: fdeDateForInput(r.COMMITTED_DATE),
                dateDelivered: fdeDateForInput(r.DATE_DELIVERED),
                status: r.STATUS || "",
                delaySource: r.DELAY_SOURCE || "",
                delayReason: r.DELAY_REASON || "",
                remarks: r.REMARKS || "",
                createdAt: r.CREATED_AT || "",
                updatedAt: r.UPDATED_AT || ""
            };
        })
    };

    updateStorageStatus(true, "Google Sheets connected");
}

function fdeDateForInput(value) {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value).slice(0, 10);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
}

async function fleetDeliveryAPI(action, data) {
    const options = {
        method: "GET",
        cache: "no-store",
        redirect: "follow"
    };
    let url = FLEET_DELIVERY_API_URL + "?action=" + encodeURIComponent(action) + "&_=" + Date.now();
    if (data !== undefined) {
        options.method = "POST";
        options.headers = { "Content-Type": "text/plain;charset=utf-8" };
        options.body = JSON.stringify({ action: action, data: data });
        url = FLEET_DELIVERY_API_URL;
    }
    const response = await fetch(url, options);
    if (!response.ok) throw new Error("HTTP " + response.status);
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); }
    catch (e) { throw new Error("Invalid API response: " + raw.slice(0, 250)); }
    if (!result || result.success === false) {
        throw new Error((result && (result.message || result.error)) || "API request failed.");
    }
    return result;
}


/* =========================================================
   CREATE EMPTY DATA
========================================================= */

function createEmptyFleetData() {

    return {

        version:
            FLEET_DELIVERY_DATA_VERSION,

        tripTickets: [],

        fuel: [],

        maintenance: [],

        deliveries: [],

        dr: []

    };

}


/* =========================================================
   NORMALIZE DATA
========================================================= */

function normalizeFleetData(data) {

    const source =
        data || {};


    return {

        version:
            source.version ||
            FLEET_DELIVERY_DATA_VERSION,

        tripTickets:
            Array.isArray(source.tripTickets)
                ? source.tripTickets
                : [],

        fuel:
            Array.isArray(source.fuel)
                ? source.fuel
                : [],

        maintenance:
            Array.isArray(source.maintenance)
                ? source.maintenance
                : [],

        deliveries:
            Array.isArray(source.deliveries)
                ? source.deliveries
                : [],

        dr:
            Array.isArray(source.dr)
                ? source.dr
                : []

    };

}


/* =========================================================
   CURRENT LOGGED-IN USER
========================================================= */

function getFleetCurrentUser() {
    try {
        const raw = localStorage.getItem("logitechUser");
        if (!raw) return "System User";
        const user = JSON.parse(raw);
        if (typeof user === "string") return user;
        return String(
            user.name ||
            user.fullname ||
            user.fullName ||
            user.username ||
            user.email ||
            user.user ||
            "System User"
        );
    } catch (error) {
        return "System User";
    }
}


/* =========================================================
   SAVE DATA
========================================================= */

function saveFleetDeliveryData() {
    console.warn("Fleet data is stored in Google Sheets; use persistFleetRecord() to save records.");
    return false;
}

async function persistFleetRecord(recordType, record) {
    const result = await fleetDeliveryAPI("saveFleetRecord", {
        recordType: recordType,
        record: record
    });
    await loadFleetDeliveryData();
    renderFleetDeliveryRecords();
    return result;
}


/* =========================================================
   STORAGE STATUS
========================================================= */

function updateStorageStatus(connected, message) {
    const status = document.querySelector(".fde-storage-status");
    if (!status) return;
    const label = message || (connected ? "Google Sheets connected" : "Google Sheets not connected");
    status.innerHTML = '<span class="fde-status-dot"></span><span>' + escapeHTML(label) + '</span>';
    status.classList.toggle("fde-storage-error", connected === false);
}


/* =========================================================
   TABS
========================================================= */

function initializeFleetTabs() {

    const tabs =
        document.querySelectorAll(
            ".fde-tab"
        );


    if (!tabs.length) {
        return;
    }


    tabs.forEach(function(tab) {

        tab.addEventListener(
            "click",
            function() {

                const section =
                    tab.dataset.section;


                activateFleetSection(
                    section
                );

            }
        );

    });

}


/* =========================================================
   ACTIVATE TAB
========================================================= */

function activateFleetSection(
    sectionName
) {

    const tabs =
        document.querySelectorAll(
            ".fde-tab"
        );


    const sections =
        document.querySelectorAll(
            ".fde-section"
        );


    tabs.forEach(function(tab) {

        tab.classList.toggle(
            "active",
            tab.dataset.section ===
            sectionName
        );

    });


    sections.forEach(function(section) {

        section.classList.toggle(
            "active",
            section.id ===
            "fde-" +
            sectionName +
            "-section"
        );

    });

}


/* =========================================================
   CALCULATIONS
========================================================= */

function initializeFleetCalculations() {
    ["fde-startKm", "fde-endKm"].forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", calculateFleetTripKM);
    });
    const origin = document.getElementById("fde-origin");
    const ret = document.getElementById("fde-returnOrigin");
    if (origin && ret) {
        ret.value = origin.value;
        origin.addEventListener("input", function() { ret.value = origin.value; });
    }
    const dateTransfer = document.getElementById("fde-dateTransfer");
    const actualDate = document.getElementById("fde-actualDate");
    const leadTime = document.getElementById("fde-leadTime");
    if (dateTransfer && actualDate && leadTime) {
        const calcLead = function() {
            if (!dateTransfer.value || !actualDate.value) { leadTime.value = ""; return; }
            leadTime.value = Math.max(0, Math.round((new Date(actualDate.value) - new Date(dateTransfer.value)) / 86400000));
        };
        dateTransfer.addEventListener("change", calcLead);
        actualDate.addEventListener("change", calcLead);
    }
    calculateFleetTripKM();
}

function addFleetTripStop(details) {
    const body = document.getElementById("fde-routeRows");
    const returnRow = body && body.querySelector(".fde-route-return");
    if (!body || !returnRow) return;
    const row = document.createElement("tr");
    row.className = "fde-route-row fde-route-stop";
    row.innerHTML = '<td><span class="fde-route-badge">STOP</span><input type="text" class="fde-stop-destination" placeholder="Destination"></td>' +
        '<td><input type="number" class="fde-stop-km" min="0" step="0.01" placeholder="KM upon arrival"></td>' +
        '<td><input type="text" class="fde-stop-purpose" placeholder="Purpose of this trip"></td>' +
        '<td><button type="button" class="fde-remove-stop" title="Remove destination">×</button></td>';
    if (details) {
        row.querySelector(".fde-stop-destination").value = details.destination || "";
        row.querySelector(".fde-stop-km").value = details.km == null ? "" : details.km;
        row.querySelector(".fde-stop-purpose").value = details.purpose || "";
    }
    body.insertBefore(row, returnRow);
    renumberFleetTripStops();
    calculateFleetTripKM();
}

function renumberFleetTripStops() {
    const rows = Array.from(document.querySelectorAll("#fde-routeRows .fde-route-stop"));
    rows.forEach(function(row, index) {
        row.dataset.stopIndex = String(index);
        const badge = row.querySelector(".fde-route-badge");
        const remove = row.querySelector(".fde-remove-stop");
        if (badge) badge.textContent = "STOP " + (index + 1);
        if (remove) remove.disabled = rows.length <= 1;
    });
}

function getFleetTripRouteDetails() {
    return Array.from(document.querySelectorAll("#fde-routeRows .fde-route-stop")).map(function(row) {
        const kmValue = row.querySelector(".fde-stop-km").value;
        return {
            destination: (row.querySelector(".fde-stop-destination").value || "").trim(),
            km: kmValue === "" ? "" : Number(kmValue),
            purpose: (row.querySelector(".fde-stop-purpose").value || "").trim()
        };
    }).filter(function(stop) { return stop.destination || stop.km !== "" || stop.purpose; });
}

function calculateFleetTripKM() {
    const startEl = document.getElementById("fde-startKm");
    const endEl = document.getElementById("fde-endKm");
    const total = document.getElementById("fde-totalKm");
    if (!startEl || !endEl || !total) return;
    const start = Number(startEl.value || 0);
    const end = Number(endEl.value || 0);
    total.value = end >= start && end > 0 ? (end - start).toFixed(2) : "";
    let previous = start;
    document.querySelectorAll("#fde-routeRows .fde-stop-km").forEach(function(input) {
        const value = input.value === "" ? null : Number(input.value);
        input.setCustomValidity(value !== null && value < previous ? "KM must not be lower than the previous odometer reading." : "");
        if (value !== null) previous = value;
    });
}

function parseFleetRouteDetails(value) {
    if (!value) return [];
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) { return []; }
}

function initializeFleetButtons() {

    /* =====================================================
       TRIP TICKET
    ====================================================== */

    const saveTrip =
        document.getElementById(
            "fde-saveTripBtn"
        );


    const clearTrip =
        document.getElementById(
            "fde-clearTripBtn"
        );


    if (saveTrip) {

        saveTrip.addEventListener(
            "click",
            saveTripTicket
        );

    }


    if (clearTrip) {
        clearTrip.addEventListener("click", clearTripTicketForm);
    }
    const ticketDate = document.getElementById("fde-tripDate");
    const ticketVehicle = document.getElementById("fde-tripVehicle");
    const refreshTicketNumber = function() {
        const date = getValue("fde-tripDate");
        if (date) setValue("fde-tripTicketNo", generateFleetTripTicketNo(date));
        else setValue("fde-tripTicketNo", "");
    };
    if (ticketDate) ticketDate.addEventListener("change", refreshTicketNumber);
    if (ticketVehicle) ticketVehicle.addEventListener("change", refreshTicketNumber);
    const addTripStop = document.getElementById("fde-addTripStopBtn");
    if (addTripStop) addTripStop.addEventListener("click", function() { addFleetTripStop(); });
    const routeRows = document.getElementById("fde-routeRows");
    if (routeRows) {
        routeRows.addEventListener("click", function(event) {
            const removeButton = event.target.closest(".fde-remove-stop");
            if (removeButton) {
                const row = removeButton.closest(".fde-route-stop");
                if (row) row.remove();
                renumberFleetTripStops();
                calculateFleetTripKM();
            }
        });
        routeRows.addEventListener("input", function(event) {
            if (event.target.matches("#fde-origin")) {
                const ret = document.getElementById("fde-returnOrigin");
                if (ret) ret.value = event.target.value;
            }
            if (event.target.matches("#fde-startKm, #fde-endKm, .fde-stop-km")) calculateFleetTripKM();
        });
    }

    /* =====================================================
       FUEL
    ====================================================== */

    const saveFuel =
        document.getElementById(
            "fde-saveFuelBtn"
        );


    const clearFuel =
        document.getElementById(
            "fde-clearFuelBtn"
        );


    if (saveFuel) {

        saveFuel.addEventListener(
            "click",
            saveFuelRecord
        );

    }


    if (clearFuel) {

        clearFuel.addEventListener(
            "click",
            clearFuelForm
        );

    }


    /* =====================================================
       MAINTENANCE
    ====================================================== */

    const saveMaintenance =
        document.getElementById(
            "fde-saveMaintenanceBtn"
        );


    const clearMaintenance =
        document.getElementById(
            "fde-clearMaintenanceBtn"
        );


    if (saveMaintenance) {

        saveMaintenance.addEventListener(
            "click",
            saveMaintenanceRecord
        );

    }


    if (clearMaintenance) {

        clearMaintenance.addEventListener(
            "click",
            clearMaintenanceForm
        );

    }


    /* =====================================================
       DELIVERY
    ====================================================== */

    const saveDelivery =
        document.getElementById(
            "fde-saveDeliveryBtn"
        );


    const clearDelivery =
        document.getElementById(
            "fde-clearDeliveryBtn"
        );


    if (saveDelivery) {

        saveDelivery.addEventListener(
            "click",
            saveDeliveryRecord
        );

    }


    if (clearDelivery) {

        clearDelivery.addEventListener(
            "click",
            clearDeliveryForm
        );

    }


    /* =====================================================
       DR
    ====================================================== */

    const saveDR =
        document.getElementById(
            "fde-saveDRBtn"
        );


    const clearDR =
        document.getElementById(
            "fde-clearDRBtn"
        );


    if (saveDR) {

        saveDR.addEventListener(
            "click",
            saveDRRecord
        );

    }


    if (clearDR) {

        clearDR.addEventListener(
            "click",
            clearDRForm
        );

    }

}


/* =========================================================
   SAVE TRIP TICKET
========================================================= */

async function saveTripTicket() {
    const date = getValue("fde-tripDate");
    const vehicle = getValue("fde-tripVehicle");
    const driver = getValue("fde-tripDriver");
    const startKm = numberValue("fde-startKm");
    const endKm = numberValue("fde-endKm");
    const status = getValue("fde-tripStatus");
    const origin = getValue("fde-origin");
    const returnOrigin = getValue("fde-returnOrigin");
    const routeDetails = getFleetTripRouteDetails();
    const remarks = getValue("fde-tripRemarks");

    if (!date) { alert("Please enter the trip ticket date."); return; }
    if (!vehicle) { alert("Please select a vehicle."); return; }
    if (!driver.trim()) { alert("Please enter the driver name."); return; }
    if (!Number.isFinite(startKm) || !Number.isFinite(endKm)) {
        alert("Please enter Start KM and End KM."); return;
    }
    if (endKm < startKm) { alert("End KM cannot be lower than Start KM."); return; }
    if (!origin) { alert("Please enter the starting Origin."); return; }
    if (!returnOrigin || returnOrigin.trim().toLowerCase() !== origin.trim().toLowerCase()) {
        alert("The return location must match the starting Origin."); return;
    }
    if (!routeDetails.length || routeDetails.some(function(stop) {
        return !stop.destination || stop.km === "" || !stop.purpose;
    })) {
        alert("Please complete each destination, its KM reading, and its purpose."); return;
    }

    let previousKm = startKm;
    for (const stop of routeDetails) {
        if (Number(stop.km) < previousKm) {
            alert("Each destination KM must be equal to or greater than the previous odometer reading."); return;
        }
        previousKm = Number(stop.km);
    }
    if (endKm < previousKm) { alert("End KM must be equal to or greater than the last destination KM."); return; }

    const tripTicketNo = generateFleetTripTicketNo(date);
    setValue("fde-tripTicketNo", tripTicketNo);

    // Save each leg as its own row. The same Trip Ticket No. and vehicle details
    // are reused; only trip sequence, route, purpose, odometer and total KM change.
    const legs = [];
    let legOrigin = origin;
    let legStartKm = startKm;

    routeDetails.forEach(function(stop) {
        const legEndKm = Number(stop.km);
        legs.push({
            origin: legOrigin,
            destination: stop.destination,
            purpose: stop.purpose,
            startKm: legStartKm,
            endKm: legEndKm,
            totalKm: legEndKm - legStartKm
        });
        legOrigin = stop.destination;
        legStartKm = legEndKm;
    });

    // Store the return-to-origin leg too, so the individual trip KM totals
    // account for the complete route rather than losing the return distance.
    legs.push({
        origin: legOrigin,
        destination: returnOrigin,
        purpose: "Return to Origin",
        startKm: legStartKm,
        endKm: endKm,
        totalKm: endKm - legStartKm
    });

    const saveButton = document.getElementById("fde-saveTripBtn");
    const originalButtonText = saveButton ? saveButton.textContent : "";
    if (saveButton) {
        if (saveButton.dataset.saving === "true") return;
        saveButton.dataset.saving = "true";
        saveButton.disabled = true;
        saveButton.textContent = "Saving " + legs.length + " Trips...";
        saveButton.setAttribute("aria-busy", "true");
    }

    const currentUser = getFleetCurrentUser();
    let savedCount = 0;
    try {
        updateStorageStatus(true, "Saving trips to Google Sheets...");
        for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];
            const now = new Date().toISOString();
            const record = {
                id: generateRecordId("TT"),
                type: "tripTicket",
                tripTicketNo: tripTicketNo,
                tripSequence: i + 1,
                createdBy: currentUser,
                date: date,
                vehicle: vehicle,
                driver: driver,
                startKm: leg.startKm,
                endKm: leg.endKm,
                totalKm: leg.totalKm,
                origin: leg.origin,
                destination: leg.destination,
                purpose: leg.purpose,
                routeDetails: [{
                    destination: leg.destination,
                    km: leg.endKm,
                    purpose: leg.purpose
                }],
                remarks: remarks,
                status: status,
                createdAt: now,
                updatedAt: now
            };
            await persistFleetRecord("tripTicket", record);
            savedCount++;
            if (saveButton) saveButton.textContent = "Saving Trip " + savedCount + " of " + legs.length + "...";
        }

        clearTripTicketForm();
        updateStorageStatus(true, "Google Sheets connected • Trip Ticket saved");
        alert("Trip Ticket saved successfully!\nTrip Ticket No.: " + tripTicketNo +
            "\nSaved individual trips: " + savedCount +
            "\nTotal KM: " + (endKm - startKm).toFixed(2));
    } catch (error) {
        console.error("Trip Ticket save failed:", error);
        updateStorageStatus(false, "Trip Ticket save failed");
        alert("Naka-save ang " + savedCount + " sa " + legs.length + " trips bago nagkaroon ng error. " +
            "Trip Ticket No.: " + tripTicketNo + ". Error: " +
            (error && error.message ? error.message : "Pakisuri ang internet at Apps Script deployment."));
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = originalButtonText || "Save Trip Ticket";
            saveButton.removeAttribute("aria-busy");
            delete saveButton.dataset.saving;
        }
    }
}

/**
 * Generates one shared ticket number for all legs entered on the same form.
 * Format: TT-YYYYMMDD-001. Uses existing saved numbers for that date.
 */
function generateFleetTripTicketNo(date) {
    const datePart = String(date || "").replace(/-/g, "");
    if (!/^\d{8}$/.test(datePart)) return "";
    const prefix = "TT-" + datePart + "-";
    const existing = (fdeData.tripTickets || []).map(function(item) {
        return String(item.tripTicketNo || "").trim();
    }).filter(function(number) {
        return number.indexOf(prefix) === 0;
    });
    const highest = existing.reduce(function(max, number) {
        const suffix = Number(number.slice(prefix.length));
        return Number.isFinite(suffix) ? Math.max(max, suffix) : max;
    }, 0);
    return prefix + String(highest + 1).padStart(3, "0");
}


/* =========================================================
   SAVE FUEL
========================================================= */

async function saveFuelRecord() {

    const date =
        getValue(
            "fde-fuelDate"
        );


    const vehicle =
        getValue(
            "fde-fuelVehicle"
        );


    const tripTicketNo =
        getValue(
            "fde-fuelTripTicket"
        );


    const station =
        getValue(
            "fde-fuelStation"
        );


    const liters =
        numberValue(
            "fde-fuelLiters"
        );


    const amount =
        numberValue(
            "fde-fuelAmount"
        );


    const odometer =
        numberValue(
            "fde-fuelOdometer"
        );


    const fuelReceiptNo =
        getValue(
            "fde-fuelReceiptNo"
        );


    const remarks =
        getValue(
            "fde-fuelRemarks"
        );


    if (!date) {

        alert(
            "Please enter the fuel date."
        );

        return;

    }


    if (!vehicle) {

        alert(
            "Please select a vehicle."
        );

        return;

    }


    if (
        isNaN(liters) ||
        liters <= 0
    ) {

        alert(
            "Please enter the fuel liters."
        );

        return;

    }


    const record = {

        id:
            generateRecordId(
                "FUEL"
            ),

        type:
            "fuel",

        date:
            date,

        vehicle:
            vehicle,

        tripTicketNo:
            tripTicketNo,

        station:
            station,

        liters:
            liters,

        amount:
            isNaN(amount)
                ? 0
                : amount,

        odometer:
            isNaN(odometer)
                ? 0
                : odometer,

        fuelReceiptNo:
            fuelReceiptNo,

        remarks:
            remarks,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()

    };


        try {
        await persistFleetRecord("fuel", record);
        clearFuelForm();
        alert("Fuel record saved successfully to Google Sheets.");
    } catch (error) {
        console.error("Fuel save failed:", error);
        alert("Hindi na-save ang Fuel record. " + error.message);
    }

}


/* =========================================================
   SAVE MAINTENANCE
========================================================= */

async function saveMaintenanceRecord() {

    const date =
        getValue(
            "fde-maintenanceDate"
        );


    const vehicle =
        getValue(
            "fde-maintenanceVehicle"
        );


    const maintenanceType =
        getValue(
            "fde-maintenanceType"
        );


    const cost =
        numberValue(
            "fde-maintenanceCost"
        );


    const idleDays =
        numberValue(
            "fde-idleDays"
        );


    const status =
        getValue(
            "fde-maintenanceStatus"
        );


    const defect =
        getValue(
            "fde-defect"
        );


    const repair =
        getValue(
            "fde-repair"
        );


    const remarks =
        getValue(
            "fde-maintenanceRemarks"
        );


    if (!date) {

        alert(
            "Please enter the maintenance date."
        );

        return;

    }


    if (!vehicle) {

        alert(
            "Please select a vehicle."
        );

        return;

    }


    const record = {

        id:
            generateRecordId(
                "MAIN"
            ),

        type:
            "maintenance",

        date:
            date,

        vehicle:
            vehicle,

        maintenanceType:
            maintenanceType,

        defect:
            defect,

        repair:
            repair,

        cost:
            isNaN(cost)
                ? 0
                : cost,

        idleDays:
            isNaN(idleDays)
                ? 0
                : idleDays,

        status:
            status,

        remarks:
            remarks,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()

    };


        try {
        await persistFleetRecord("maintenance", record);
        clearMaintenanceForm();
        alert("Maintenance record saved successfully to Google Sheets.");
    } catch (error) {
        console.error("Maintenance save failed:", error);
        alert("Hindi na-save ang Maintenance record. " + error.message);
    }

}


/* =========================================================
   SAVE DELIVERY
========================================================= */

async function saveDeliveryRecord() {

    const deliveryNo =
        getValue(
            "fde-deliveryNo"
        );


    const soNumber =
        getValue(
            "fde-deliverySO"
        );


    const client =
        getValue(
            "fde-deliveryClient"
        );


    const project =
        getValue(
            "fde-deliveryProject"
        );


    const vehicle =
        getValue(
            "fde-deliveryVehicle"
        );


    const dateTransfer =
        getValue(
            "fde-dateTransfer"
        );


    const committedDate =
        getValue(
            "fde-committedDate"
        );


    const actualDate =
        getValue(
            "fde-actualDate"
        );


    const leadTime =
        calculateDateDifference(
            dateTransfer,
            actualDate
        );


    const deliveryStatus =
        getValue(
            "fde-deliveryStatus"
        );


    const delaySource =
        getValue(
            "fde-delaySource"
        );


    const delayReason =
        getValue(
            "fde-delayReason"
        );


    const remarks =
        getValue(
            "fde-deliveryRemarks"
        );


    if (!dateTransfer) {

        alert(
            "Please enter the Date Transfer."
        );

        return;

    }


    if (!client) {

        alert(
            "Please enter the client."
        );

        return;

    }


    if (!vehicle) {

        alert(
            "Please select a vehicle."
        );

        return;

    }


    const record = {

        id:
            generateRecordId(
                "DEL"
            ),

        type:
            "delivery",

        deliveryNo:
            deliveryNo,

        soNumber:
            soNumber,

        client:
            client,

        project:
            project,

        vehicle:
            vehicle,

        dateTransfer:
            dateTransfer,

        committedDate:
            committedDate,

        actualDate:
            actualDate,

        leadTime:
            leadTime,

        deliveryStatus:
            deliveryStatus,

        delaySource:
            delaySource,

        delayReason:
            delayReason,

        remarks:
            remarks,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()

    };


        try {
        await persistFleetRecord("delivery", record);
        clearDeliveryForm();
        alert("Delivery monitoring record saved successfully to Google Sheets.");
    } catch (error) {
        console.error("Delivery save failed:", error);
        alert("Hindi na-save ang Delivery record. " + error.message);
    }

}


/* =========================================================
   SAVE DR
========================================================= */

async function saveDRRecord() {

    const drNumber =
        getValue(
            "fde-drNumber"
        );


    const soNumber =
        getValue(
            "fde-drSO"
        );


    const client =
        getValue(
            "fde-drClient"
        );


    const project =
        getValue(
            "fde-drProject"
        );


    const vehicle =
        getValue(
            "fde-drVehicle"
        );


    const dateTransfer =
        getValue(
            "fde-drDateTransfer"
        );


    const committedDate =
        getValue(
            "fde-drCommittedDate"
        );


    const dateDelivered =
        getValue(
            "fde-drDateDelivered"
        );


    const status =
        getValue(
            "fde-drStatus"
        );


    const delaySource =
        getValue(
            "fde-drDelaySource"
        );


    const delayReason =
        getValue(
            "fde-drDelayReason"
        );


    const remarks =
        getValue(
            "fde-drRemarks"
        );


    if (!drNumber) {

        alert(
            "Please enter the DR Number."
        );

        return;

    }


    if (!dateTransfer) {

        alert(
            "Please enter the Date Transfer."
        );

        return;

    }


    const record = {

        id:
            generateRecordId(
                "DR"
            ),

        type:
            "dr",

        drNumber:
            drNumber,

        soNumber:
            soNumber,

        client:
            client,

        project:
            project,

        vehicle:
            vehicle,

        dateTransfer:
            dateTransfer,

        committedDate:
            committedDate,

        dateDelivered:
            dateDelivered,

        status:
            status,

        delaySource:
            delaySource,

        delayReason:
            delayReason,

        remarks:
            remarks,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()

    };


        try {
        await persistFleetRecord("dr", record);
        clearDRForm();
        alert("DR Monitoring record saved successfully to Google Sheets.");
    } catch (error) {
        console.error("DR save failed:", error);
        alert("Hindi na-save ang DR record. " + error.message);
    }

}


/* =========================================================
   RECORDS
========================================================= */

function initializeFleetRecords() {

    const filter =
        document.getElementById(
            "fde-recordTypeFilter"
        );


    const search =
        document.getElementById(
            "fde-recordSearch"
        );


    if (filter) {

        filter.addEventListener(
            "change",
            renderFleetDeliveryRecords
        );

    }


    if (search) {

        search.addEventListener(
            "input",
            renderFleetDeliveryRecords
        );

    }

}


/* =========================================================
   GET ALL RECORDS
========================================================= */

function getAllFleetRecords() {

    const records = [];


    fdeData.tripTickets.forEach(
        function(record) {

            records.push({
                ...record,
                recordType:
                    "tripTicket"
            });

        }
    );


    fdeData.fuel.forEach(
        function(record) {

            records.push({
                ...record,
                recordType:
                    "fuel"
            });

        }
    );


    fdeData.maintenance.forEach(
        function(record) {

            records.push({
                ...record,
                recordType:
                    "maintenance"
            });

        }
    );


    fdeData.deliveries.forEach(
        function(record) {

            records.push({
                ...record,
                recordType:
                    "delivery"
            });

        }
    );


    fdeData.dr.forEach(
        function(record) {

            records.push({
                ...record,
                recordType:
                    "dr"
            });

        }
    );


    return records;

}


/* =========================================================
   RENDER RECORDS
========================================================= */

function renderFleetDeliveryRecords() {

    const tbody =
        document.getElementById(
            "fde-recordTableBody"
        );


    const count =
        document.getElementById(
            "fde-recordCount"
        );


    if (!tbody) {
        return;
    }


    let records =
        getAllFleetRecords();


    const filterElement =
        document.getElementById(
            "fde-recordTypeFilter"
        );


    const searchElement =
        document.getElementById(
            "fde-recordSearch"
        );


    const filter =
        filterElement
            ? filterElement.value
            : "all";


    const search =
        searchElement
            ? searchElement.value
                .trim()
                .toLowerCase()
            : "";


    /* =====================================================
       TYPE FILTER
    ====================================================== */

    if (
        filter &&
        filter !== "all"
    ) {

        records =
            records.filter(
                function(record) {

                    return (
                        record.recordType ===
                        filter
                    );

                }
            );

    }


    /* =====================================================
       SEARCH
    ====================================================== */

    if (search) {

        records =
            records.filter(
                function(record) {

                    const searchable =
                        JSON.stringify(
                            record
                        ).toLowerCase();


                    return searchable.includes(
                        search
                    );

                }
            );

    }


    /* =====================================================
       SORT NEWEST FIRST
    ====================================================== */

    records.sort(
        function(a, b) {

            const dateA =
                new Date(
                    a.updatedAt ||
                    a.createdAt ||
                    0
                );


            const dateB =
                new Date(
                    b.updatedAt ||
                    b.createdAt ||
                    0
                );


            return (
                dateB - dateA
            );

        }
    );


    if (count) {

        count.textContent =
            records.length;

    }


    if (!records.length) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="fde-empty">

                    No records found.

                </td>

            </tr>

        `;

        return;

    }


    tbody.innerHTML =
        records.map(
            createRecordTableRow
        ).join("");

}


/* =========================================================
   CREATE TABLE ROW
========================================================= */

function createRecordTableRow(
    record
) {

    const date =
        escapeHTML(
            getRecordDate(
                record
            )
        );


    const type =
        escapeHTML(
            getRecordTypeLabel(
                record.recordType
            )
        );


    const reference =
        escapeHTML(
            getRecordReference(
                record
            )
        );


    const vehicle =
        escapeHTML(
            record.vehicle ||
            "-"
        );


    const description =
        escapeHTML(
            getRecordDescription(
                record
            )
        );


    const status =
        escapeHTML(
            getRecordStatus(
                record
            )
        );


    return `

        <tr>

            <td>
                ${date}
            </td>

            <td>

                <span class="fde-type-badge">
                    ${type}
                </span>

            </td>

            <td>
                ${reference}
            </td>

            <td>
                ${vehicle}
            </td>

            <td>
                ${description}
            </td>

            <td>

                <span class="fde-status-badge">
                    ${status}
                </span>

            </td>

            <td>

                <button
                    type="button"
                    class="fde-delete-btn"
                    onclick="deleteFleetRecord(
                        '${record.recordType}',
                        '${record.id}'
                    )">

                    Delete

                </button>

            </td>

        </tr>

    `;

}


/* =========================================================
   RECORD DATE
========================================================= */

function getRecordDate(
    record
) {

    return (
        record.date ||
        record.dateTransfer ||
        record.createdAt
            ? formatDate(
                record.date ||
                record.dateTransfer ||
                record.createdAt
            )
            : "-"
    );

}


/* =========================================================
   RECORD TYPE
========================================================= */

function getRecordTypeLabel(
    type
) {

    const labels = {

        tripTicket:
            "Trip Ticket",

        fuel:
            "Fuel",

        maintenance:
            "Maintenance",

        delivery:
            "Delivery",

        dr:
            "DR"

    };


    return (
        labels[type] ||
        type ||
        "-"
    );

}


/* =========================================================
   RECORD REFERENCE
========================================================= */

function getRecordReference(
    record
) {

    if (
        record.recordType ===
        "tripTicket"
    ) {

        return (
            record.tripTicketNo ||
            "-"
        );

    }


    if (
        record.recordType ===
        "fuel"
    ) {

        return (
            record.fuelReceiptNo ||
            record.tripTicketNo ||
            "-"
        );

    }


    if (
        record.recordType ===
        "maintenance"
    ) {

        return (
            record.maintenanceType ||
            "-"
        );

    }


    if (
        record.recordType ===
        "delivery"
    ) {

        return (
            record.deliveryNo ||
            record.soNumber ||
            "-"
        );

    }


    if (
        record.recordType ===
        "dr"
    ) {

        return (
            record.drNumber ||
            record.soNumber ||
            "-"
        );

    }


    return "-";

}


/* =========================================================
   RECORD DESCRIPTION
========================================================= */

function getRecordDescription(
    record
) {

    if (
        record.recordType ===
        "tripTicket"
    ) {

        return (
            (
                record.origin ||
                "-"
            ) +
            " → " +
            (
                record.destination ||
                "-"
            )
        );

    }


    if (
        record.recordType ===
        "fuel"
    ) {

        return (
            Number(
                record.liters || 0
            ).toFixed(2) +
            " L"
        );

    }


    if (
        record.recordType ===
        "maintenance"
    ) {

        return (
            record.defect ||
            record.repair ||
            "-"
        );

    }


    if (
        record.recordType ===
        "delivery"
    ) {

        return (
            record.client ||
            record.project ||
            "-"
        );

    }


    if (
        record.recordType ===
        "dr"
    ) {

        return (
            record.client ||
            record.project ||
            "-"
        );

    }


    return "-";

}


/* =========================================================
   RECORD STATUS
========================================================= */

function getRecordStatus(
    record
) {

    if (
        record.recordType ===
        "tripTicket"
    ) {

        return (
            record.status ||
            "-"
        );

    }


    if (
        record.recordType ===
        "maintenance"
    ) {

        return (
            record.status ||
            "-"
        );

    }


    if (
        record.recordType ===
        "delivery"
    ) {

        return (
            record.deliveryStatus ||
            "-"
        );

    }


    if (
        record.recordType ===
        "dr"
    ) {

        return (
            record.status ||
            "-"
        );

    }


    if (
        record.recordType ===
        "fuel"
    ) {

        return "Recorded";

    }


    return "-";

}


/* =========================================================
   DELETE RECORD
========================================================= */

async function deleteFleetRecord(
    type,
    id
) {

    if (!type || !id) {
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to delete this record?"
        );


    if (!confirmed) {
        return;
    }


    try {
        await fleetDeliveryAPI("deleteFleetRecord", {
            recordType: type,
            id: id
        });
        await loadFleetDeliveryData();
        renderFleetDeliveryRecords();
        alert("Record deleted successfully from Google Sheets.");
    } catch (error) {
        console.error("Fleet record delete failed:", error);
        alert("Hindi na-delete ang record. " + error.message);
    }


}


/* =========================================================
   CLEAR TRIP FORM
========================================================= */

function clearTripTicketForm() {

    setValue(
        "fde-tripTicketNo",
        ""
    );

    setValue(
        "fde-tripDate",
        ""
    );

    setValue(
        "fde-tripVehicle",
        ""
    );

    setValue(
        "fde-tripDriver",
        ""
    );

    setValue(
        "fde-startKm",
        ""
    );

    setValue(
        "fde-endKm",
        ""
    );

    setValue(
        "fde-totalKm",
        ""
    );

    setValue(
        "fde-tripStatus",
        "Completed"
    );

    setValue(
        "fde-origin",
        ""
    );

    setValue("fde-returnOrigin", "");
    const routeRows = document.getElementById("fde-routeRows");
    if (routeRows) {
        routeRows.querySelectorAll(".fde-route-stop").forEach(function(row, index) {
            if (index > 0) row.remove();
        });
        const firstStop = routeRows.querySelector(".fde-route-stop");
        if (firstStop) {
            firstStop.querySelector(".fde-stop-destination").value = "";
            firstStop.querySelector(".fde-stop-km").value = "";
            firstStop.querySelector(".fde-stop-purpose").value = "";
        }
    }
    renumberFleetTripStops();
    calculateFleetTripKM();

    setValue(
        "fde-tripRemarks",
        ""
    );

}


/* =========================================================
   CLEAR FUEL
========================================================= */

function clearFuelForm() {

    setValue(
        "fde-fuelDate",
        ""
    );

    setValue(
        "fde-fuelVehicle",
        ""
    );

    setValue(
        "fde-fuelTripTicket",
        ""
    );

    setValue(
        "fde-fuelStation",
        ""
    );

    setValue(
        "fde-fuelLiters",
        ""
    );

    setValue(
        "fde-fuelAmount",
        ""
    );

    setValue(
        "fde-fuelOdometer",
        ""
    );

    setValue(
        "fde-fuelReceiptNo",
        ""
    );

    setValue(
        "fde-fuelRemarks",
        ""
    );

}


/* =========================================================
   CLEAR MAINTENANCE
========================================================= */

function clearMaintenanceForm() {

    setValue(
        "fde-maintenanceDate",
        ""
    );

    setValue(
        "fde-maintenanceVehicle",
        ""
    );

    setValue(
        "fde-maintenanceType",
        ""
    );

    setValue(
        "fde-maintenanceCost",
        ""
    );

    setValue(
        "fde-idleDays",
        ""
    );

    setValue(
        "fde-maintenanceStatus",
        "Completed"
    );

    setValue(
        "fde-defect",
        ""
    );

    setValue(
        "fde-repair",
        ""
    );

    setValue(
        "fde-maintenanceRemarks",
        ""
    );

}


/* =========================================================
   CLEAR DELIVERY
========================================================= */

function clearDeliveryForm() {

    setValue(
        "fde-deliveryNo",
        ""
    );

    setValue(
        "fde-deliverySO",
        ""
    );

    setValue(
        "fde-deliveryClient",
        ""
    );

    setValue(
        "fde-deliveryProject",
        ""
    );

    setValue(
        "fde-deliveryVehicle",
        ""
    );

    setValue(
        "fde-dateTransfer",
        ""
    );

    setValue(
        "fde-committedDate",
        ""
    );

    setValue(
        "fde-actualDate",
        ""
    );

    setValue(
        "fde-leadTime",
        ""
    );

    setValue(
        "fde-deliveryStatus",
        "Pending"
    );

    setValue(
        "fde-delaySource",
        ""
    );

    setValue(
        "fde-delayReason",
        ""
    );

    setValue(
        "fde-deliveryRemarks",
        ""
    );

}


/* =========================================================
   CLEAR DR
========================================================= */

function clearDRForm() {

    setValue(
        "fde-drNumber",
        ""
    );

    setValue(
        "fde-drSO",
        ""
    );

    setValue(
        "fde-drClient",
        ""
    );

    setValue(
        "fde-drProject",
        ""
    );

    setValue(
        "fde-drVehicle",
        ""
    );

    setValue(
        "fde-drDateTransfer",
        ""
    );

    setValue(
        "fde-drCommittedDate",
        ""
    );

    setValue(
        "fde-drDateDelivered",
        ""
    );

    setValue(
        "fde-drStatus",
        "Prepared"
    );

    setValue(
        "fde-drDelaySource",
        ""
    );

    setValue(
        "fde-drDelayReason",
        ""
    );

    setValue(
        "fde-drRemarks",
        ""
    );

}


/* =========================================================
   UTILITIES
========================================================= */

function getValue(id) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return "";
    }


    return element.value.trim();

}


/* =========================================================
   SET VALUE
========================================================= */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.value =
        value;

}


/* =========================================================
   NUMBER VALUE
========================================================= */

function numberValue(id) {

    const value =
        getValue(id);


    if (value === "") {

        return NaN;

    }


    return parseFloat(
        value
    );

}


/* =========================================================
   DATE DIFFERENCE
========================================================= */

function calculateDateDifference(
    startDate,
    endDate
) {

    if (
        !startDate ||
        !endDate
    ) {

        return 0;

    }


    const start =
        new Date(
            startDate
        );


    const end =
        new Date(
            endDate
        );


    if (
        isNaN(
            start.getTime()
        ) ||
        isNaN(
            end.getTime()
        )
    ) {

        return 0;

    }


    const difference =
        end.getTime() -
        start.getTime();


    const days =
        Math.round(
            difference /
            (1000 * 60 * 60 * 24)
        );


    return days >= 0
        ? days
        : 0;

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    value
) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(
            value
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return value;

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


/* =========================================================
   GENERATE ID
========================================================= */

function generateRecordId(
    prefix
) {

    const timestamp =
        Date.now();


    const random =
        Math.floor(
            Math.random() *
            100000
        );


    return (
        prefix +
        "-" +
        timestamp +
        "-" +
        random
    );

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
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


/* =========================================================
   GLOBAL ACCESS
========================================================= */

window.initializeFleetDataEntry =
    initializeFleetDataEntry;


window.getFleetDeliveryData =
    function() {

        return fdeData;

    };


window.getAllFleetRecords =
    getAllFleetRecords;


window.refreshFleetDeliveryRecords =
    renderFleetDeliveryRecords;


window.deleteFleetRecord =
    deleteFleetRecord;


/* =========================================================
   END
========================================================= */

console.log(
    "LOGIS-TECH Fleet & Delivery Data Entry JS loaded."
);
