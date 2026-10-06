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

const FLEET_DELIVERY_STORAGE_KEY =
    "logisTechFleetDeliveryData";


const FLEET_DELIVERY_DATA_VERSION = 1;


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

function initializeFleetDataEntry() {

    console.log(
        "========================================"
    );

    console.log(
        "Initializing Fleet & Delivery Data Entry..."
    );


    loadFleetDeliveryData();

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

function loadFleetDeliveryData() {

    try {

        const saved =
            localStorage.getItem(
                FLEET_DELIVERY_STORAGE_KEY
            );


        if (!saved) {

            fdeData = createEmptyFleetData();

            saveFleetDeliveryData();

            return;

        }


        const parsed =
            JSON.parse(saved);


        fdeData = normalizeFleetData(
            parsed
        );


    } catch (error) {

        console.error(
            "Failed to load Fleet & Delivery data:",
            error
        );


        fdeData =
            createEmptyFleetData();

    }

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
   SAVE DATA
========================================================= */

function saveFleetDeliveryData() {

    try {

        localStorage.setItem(
            FLEET_DELIVERY_STORAGE_KEY,
            JSON.stringify(fdeData)
        );


        updateStorageStatus();


        return true;


    } catch (error) {

        console.error(
            "Failed to save Fleet & Delivery data:",
            error
        );


        return false;

    }

}


/* =========================================================
   STORAGE STATUS
========================================================= */

function updateStorageStatus() {

    const status =
        document.querySelector(
            ".fde-storage-status"
        );


    if (!status) {
        return;
    }


    status.innerHTML = `

        <span class="fde-status-dot"></span>

        <span>
            Local Data Saved
        </span>

    `;

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

    const startKm =
        document.getElementById(
            "fde-startKm"
        );


    const endKm =
        document.getElementById(
            "fde-endKm"
        );


    const totalKm =
        document.getElementById(
            "fde-totalKm"
        );


    if (
        startKm &&
        endKm &&
        totalKm
    ) {

        const calculateKM =
            function() {

                const start =
                    parseFloat(
                        startKm.value
                    ) || 0;


                const end =
                    parseFloat(
                        endKm.value
                    ) || 0;


                if (
                    end >= start &&
                    end > 0
                ) {

                    totalKm.value =
                        (
                            end -
                            start
                        ).toFixed(2);

                } else {

                    totalKm.value = "";

                }

            };


        startKm.addEventListener(
            "input",
            calculateKM
        );


        endKm.addEventListener(
            "input",
            calculateKM
        );

    }


    /* =====================================================
       DELIVERY LEAD TIME
    ====================================================== */

    const dateTransfer =
        document.getElementById(
            "fde-dateTransfer"
        );


    const actualDate =
        document.getElementById(
            "fde-actualDate"
        );


    const leadTime =
        document.getElementById(
            "fde-leadTime"
        );


    if (
        dateTransfer &&
        actualDate &&
        leadTime
    ) {

        const calculateLeadTime =
            function() {

                if (
                    !dateTransfer.value ||
                    !actualDate.value
                ) {

                    leadTime.value = "";

                    return;

                }


                const start =
                    new Date(
                        dateTransfer.value
                    );


                const end =
                    new Date(
                        actualDate.value
                    );


                const difference =
                    end.getTime() -
                    start.getTime();


                const days =
                    Math.round(
                        difference /
                        (1000 * 60 * 60 * 24)
                    );


                leadTime.value =
                    days >= 0
                        ? days
                        : "";

            };


        dateTransfer.addEventListener(
            "change",
            calculateLeadTime
        );


        actualDate.addEventListener(
            "change",
            calculateLeadTime
        );

    }

}


/* =========================================================
   BUTTONS
========================================================= */

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

        clearTrip.addEventListener(
            "click",
            clearTripTicketForm
        );

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

function saveTripTicket() {

    const tripTicketNo =
        getValue(
            "fde-tripTicketNo"
        );


    const date =
        getValue(
            "fde-tripDate"
        );


    const vehicle =
        getValue(
            "fde-tripVehicle"
        );


    const driver =
        getValue(
            "fde-tripDriver"
        );


    const startKm =
        numberValue(
            "fde-startKm"
        );


    const endKm =
        numberValue(
            "fde-endKm"
        );


    const totalKm =
        endKm - startKm;


    const status =
        getValue(
            "fde-tripStatus"
        );


    const origin =
        getValue(
            "fde-origin"
        );


    const destination =
        getValue(
            "fde-destination"
        );


    const purpose =
        getValue(
            "fde-purpose"
        );


    const remarks =
        getValue(
            "fde-tripRemarks"
        );


    if (!date) {

        alert(
            "Please enter the trip ticket date."
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
        isNaN(startKm) ||
        isNaN(endKm)
    ) {

        alert(
            "Please enter Start KM and End KM."
        );

        return;

    }


    if (endKm < startKm) {

        alert(
            "End KM cannot be lower than Start KM."
        );

        return;

    }


    const record = {

        id:
            generateRecordId(
                "TT"
            ),

        type:
            "tripTicket",

        tripTicketNo:
            tripTicketNo,

        date:
            date,

        vehicle:
            vehicle,

        driver:
            driver,

        startKm:
            startKm,

        endKm:
            endKm,

        totalKm:
            totalKm,

        origin:
            origin,

        destination:
            destination,

        purpose:
            purpose,

        remarks:
            remarks,

        status:
            status,

        createdAt:
            new Date().toISOString(),

        updatedAt:
            new Date().toISOString()

    };


    fdeData.tripTickets.push(
        record
    );


    saveFleetDeliveryData();

    renderFleetDeliveryRecords();

    clearTripTicketForm();


    alert(
        "Trip Ticket saved successfully."
    );

}


/* =========================================================
   SAVE FUEL
========================================================= */

function saveFuelRecord() {

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


    fdeData.fuel.push(
        record
    );


    saveFleetDeliveryData();

    renderFleetDeliveryRecords();

    clearFuelForm();


    alert(
        "Fuel record saved successfully."
    );

}


/* =========================================================
   SAVE MAINTENANCE
========================================================= */

function saveMaintenanceRecord() {

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


    fdeData.maintenance.push(
        record
    );


    saveFleetDeliveryData();

    renderFleetDeliveryRecords();

    clearMaintenanceForm();


    alert(
        "Maintenance record saved successfully."
    );

}


/* =========================================================
   SAVE DELIVERY
========================================================= */

function saveDeliveryRecord() {

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


    fdeData.deliveries.push(
        record
    );


    saveFleetDeliveryData();

    renderFleetDeliveryRecords();

    clearDeliveryForm();


    alert(
        "Delivery record saved successfully."
    );

}


/* =========================================================
   SAVE DR
========================================================= */

function saveDRRecord() {

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


    fdeData.dr.push(
        record
    );


    saveFleetDeliveryData();

    renderFleetDeliveryRecords();

    clearDRForm();


    alert(
        "DR record saved successfully."
    );

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

function deleteFleetRecord(
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


    let targetArray;


    if (type === "tripTicket") {

        targetArray =
            fdeData.tripTickets;

    } else if (type === "fuel") {

        targetArray =
            fdeData.fuel;

    } else if (type === "maintenance") {

        targetArray =
            fdeData.maintenance;

    } else if (type === "delivery") {

        targetArray =
            fdeData.deliveries;

    } else if (type === "dr") {

        targetArray =
            fdeData.dr;

    } else {

        return;

    }


    const index =
        targetArray.findIndex(
            function(record) {

                return record.id === id;

            }
        );


    if (index === -1) {

        alert(
            "Record not found."
        );

        return;

    }


    targetArray.splice(
        index,
        1
    );


    saveFleetDeliveryData();

    renderFleetDeliveryRecords();


    alert(
        "Record deleted successfully."
    );

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

    setValue(
        "fde-destination",
        ""
    );

    setValue(
        "fde-purpose",
        ""
    );

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
