/* =========================================================
   LOGIS-TECH SYSTEM
   FLEET PERFORMANCE
   FRONTEND / MOCK DATA VERSION
========================================================= */

let fleetKmChart = null;
let fleetFuelChart = null;
let fleetKmlChart = null;
let fleetMaintenanceChart = null;


/* =========================================================
   VEHICLE LIST
========================================================= */

const FLEET_VEHICLES = [
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
   BASE VEHICLE DATA
   Used to generate realistic frontend mock data.
========================================================= */

const FLEET_BASE_DATA = {
    TBO710: { km: 5000, fuel: 500, maintenance: 100000, idle: 8 },
    TBO711: { km: 4750, fuel: 475, maintenance: 85000, idle: 7 },
    TBO712: { km: 5200, fuel: 500, maintenance: 120000, idle: 10 },
    TBO713: { km: 4500, fuel: 455, maintenance: 95000, idle: 6 },
    TBO714: { km: 5600, fuel: 525, maintenance: 135000, idle: 12 },
    TBO715: { km: 4900, fuel: 480, maintenance: 90000, idle: 7 },
    TBO716: { km: 5300, fuel: 505, maintenance: 110000, idle: 9 },
    TBO717: { km: 4700, fuel: 460, maintenance: 78000, idle: 5 },
    TBO718: { km: 5100, fuel: 490, maintenance: 105000, idle: 8 },
    TBO719: { km: 4300, fuel: 440, maintenance: 72000, idle: 5 },
    TBO720: { km: 5500, fuel: 520, maintenance: 128000, idle: 11 },
    TBO721: { km: 4850, fuel: 470, maintenance: 88000, idle: 6 },
    TBO722: { km: 5150, fuel: 495, maintenance: 102000, idle: 8 },
    TBO723: { km: 4600, fuel: 450, maintenance: 81000, idle: 6 },
    TBO724: { km: 5400, fuel: 510, maintenance: 118000, idle: 9 }
};


/* =========================================================
   MOCK MAINTENANCE DEFECTS
========================================================= */

const MAINTENANCE_DEFECTS = [
    "Preventive Maintenance",
    "Engine / Mechanical",
    "Brake System",
    "Tire Replacement",
    "Electrical",
    "Suspension",
    "Air Conditioning",
    "Body Repair"
];


/* =========================================================
   GENERATE MONTHLY DATA
========================================================= */

function generateFleetRecord(vehicle, year, month) {

    const base = FLEET_BASE_DATA[vehicle];

    const vehicleIndex = FLEET_VEHICLES.indexOf(vehicle);

    const monthNumber = Number(month);

    /*
       Small variation by vehicle/year/month
       to make the mock data look realistic.
    */

    const yearFactor =
        year === 2026 ? 1 :
        year === 2025 ? 0.94 :
        0.88;

    const monthFactor =
        0.88 +
        ((monthNumber % 5) * 0.045);

    const vehicleFactor =
        0.96 +
        ((vehicleIndex % 6) * 0.018);

    const km =
        base.km *
        yearFactor *
        monthFactor *
        vehicleFactor /
        12;

    /*
       Fuel efficiency gradually improves for some vehicles.
       Example:
       10.0 → 10.1 → 10.5 km/L
    */

    let targetKmL =
        9.7 +
        ((vehicleIndex % 5) * 0.18);

    if (vehicle === "TBO710") {
        if (year === 2024) targetKmL = 9.8;
        if (year === 2025) targetKmL = 10.1;
        if (year === 2026) targetKmL = 10.5;
    }

    targetKmL +=
        year === 2026 ? 0.10 :
        year === 2025 ? 0.03 :
        0;

    targetKmL +=
        ((monthNumber % 4) * 0.04);

    const fuel = km / targetKmL;

    const maintenanceCost =
        base.maintenance *
        yearFactor *
        (
            0.65 +
            ((monthNumber % 6) * 0.08)
        );

    const idleDays =
        Math.max(
            0,
            Math.round(
                (base.idle / 12) +
                ((monthNumber + vehicleIndex) % 3)
            )
        );

    const defectCount =
        1 +
        ((vehicleIndex + monthNumber) % 4);

    return {
        vehicle,
        year,
        month: String(month).padStart(2, "0"),
        km: Math.round(km),
        fuel: Math.round(fuel),
        kmL: Number(targetKmL.toFixed(2)),
        maintenanceCost: Math.round(maintenanceCost),
        idleDays,
        defectCount
    };
}


/* =========================================================
   BUILD DATASET
========================================================= */

function buildFleetDataset() {

    const data = [];

    [2024, 2025, 2026].forEach(function (year) {

        FLEET_VEHICLES.forEach(function (vehicle) {

            for (let month = 1; month <= 12; month++) {

                data.push(
                    generateFleetRecord(
                        vehicle,
                        year,
                        month
                    )
                );

            }

        });

    });

    return data;
}


const FLEET_DATA = buildFleetDataset();


/* =========================================================
   FILTER DATA
========================================================= */

function getFilteredFleetData() {

    const filters = getAnalyticsFilters();

    let data = FLEET_DATA.filter(function (record) {

        const vehicleMatch =
            filters.vehicle === "ALL" ||
            record.vehicle === filters.vehicle;

        const yearMatch =
            Number(record.year) === Number(filters.year);

        const monthMatch =
            filters.month === "ALL" ||
            record.month === String(filters.month).padStart(2, "0");

        return vehicleMatch && yearMatch && monthMatch;
    });

    return data;
}


/* =========================================================
   AGGREGATE BY VEHICLE
========================================================= */

function aggregateFleetByVehicle(data) {

    const result = {};

    data.forEach(function (record) {

        if (!result[record.vehicle]) {

            result[record.vehicle] = {
                vehicle: record.vehicle,
                km: 0,
                fuel: 0,
                maintenanceCost: 0,
                idleDays: 0,
                defectCount: 0,
                records: []
            };

        }

        result[record.vehicle].km += record.km;
        result[record.vehicle].fuel += record.fuel;
        result[record.vehicle].maintenanceCost += record.maintenanceCost;
        result[record.vehicle].idleDays += record.idleDays;
        result[record.vehicle].defectCount += record.defectCount;

        result[record.vehicle].records.push(record);
    });


    return Object.values(result).map(function (item) {

        item.kmL =
            item.fuel > 0
                ? item.km / item.fuel
                : 0;

        return item;
    });
}


/* =========================================================
   MAIN REFRESH FUNCTION
========================================================= */

function refreshFleetPerformance() {

    const data = getFilteredFleetData();

    if (!data.length) {
        setElementText("totalVehicles", "0");
        setElementText("totalKm", "0");
        setElementText("totalFuel", "0");
        setElementText("averageKmL", "0.00");

        destroyFleetCharts();

        return;
    }

    const vehicleData =
        aggregateFleetByVehicle(data);


    /* =====================================================
       KPI
    ===================================================== */

    const totalVehicles =
        vehicleData.length;

    const totalKm =
        vehicleData.reduce(
            (sum, item) => sum + item.km,
            0
        );

    const totalFuel =
        vehicleData.reduce(
            (sum, item) => sum + item.fuel,
            0
        );

    const averageKmL =
        totalFuel > 0
            ? totalKm / totalFuel
            : 0;


    setElementText(
        "totalVehicles",
        formatNumber(totalVehicles)
    );

    setElementText(
        "totalKm",
        formatKilometer(totalKm)
    );

    setElementText(
        "totalFuel",
        formatLiters(totalFuel)
    );

    setElementText(
        "averageKmL",
        formatKmPerLiter(averageKmL)
    );


    /* =====================================================
       CHARTS
    ===================================================== */

    renderFleetKmChart(vehicleData);

    renderFleetFuelChart(vehicleData);

    renderFleetKmlChart(vehicleData);

    renderFleetMaintenanceChart(vehicleData);


    /* =====================================================
       DETAIL BUTTONS
    ===================================================== */

    setupFleetDetailButtons(vehicleData);
}


/* =========================================================
   KM CHART
========================================================= */

function renderFleetKmChart(data) {

    const canvas =
        document.getElementById("kmChart");

    if (!canvas) return;

    if (fleetKmChart) {
        fleetKmChart.destroy();
    }

    fleetKmChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    data.map(item => item.vehicle),

                datasets: [{
                    label: "Actual Kilometer",
                    data:
                        data.map(item => item.km),
                    borderWidth: 1
                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        callbacks: {

                            label: function (context) {

                                return (
                                    " " +
                                    formatNumber(context.raw) +
                                    " km"
                                );

                            }

                        }

                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            callback: function (value) {

                                return (
                                    Number(value)
                                        .toLocaleString() +
                                    " km"
                                );

                            }

                        }

                    }

                }

            }

        });
}


/* =========================================================
   FUEL CHART
========================================================= */

function renderFleetFuelChart(data) {

    const canvas =
        document.getElementById("fuelChart");

    if (!canvas) return;

    if (fleetFuelChart) {
        fleetFuelChart.destroy();
    }

    fleetFuelChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    data.map(item => item.vehicle),

                datasets: [{
                    label: "Fuel Consumption",
                    data:
                        data.map(item => item.fuel),
                    borderWidth: 1
                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        callbacks: {

                            label: function (context) {

                                return (
                                    " " +
                                    formatNumber(context.raw) +
                                    " L"
                                );

                            }

                        }

                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            callback: function (value) {

                                return (
                                    Number(value)
                                        .toLocaleString() +
                                    " L"
                                );

                            }

                        }

                    }

                }

            }

        });
}


/* =========================================================
   KM/L CHART
========================================================= */

function renderFleetKmlChart(data) {

    const canvas =
        document.getElementById("kmlChart");

    if (!canvas) return;

    if (fleetKmlChart) {
        fleetKmlChart.destroy();
    }

    fleetKmlChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    data.map(item => item.vehicle),

                datasets: [{
                    label: "KM / Liter",
                    data:
                        data.map(item => item.kmL),
                    borderWidth: 1
                }]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        callbacks: {

                            label: function (context) {

                                return (
                                    " " +
                                    Number(context.raw)
                                        .toFixed(2) +
                                    " km/L"
                                );

                            }

                        }

                    }

                },

                scales: {

                    y: {

                        beginAtZero: false,

                        suggestedMin: 8,

                        ticks: {

                            callback: function (value) {

                                return value + " km/L";

                            }

                        }

                    }

                }

            }

        });
}


/* =========================================================
   MAINTENANCE CHART
========================================================= */

function renderFleetMaintenanceChart(data) {

    const canvas =
        document.getElementById("maintenanceChart");

    if (!canvas) return;

    if (fleetMaintenanceChart) {
        fleetMaintenanceChart.destroy();
    }

    fleetMaintenanceChart =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels:
                    data.map(item => item.vehicle),

                datasets: [

                    {
                        label: "Repair / Maintenance Cost",
                        data:
                            data.map(
                                item =>
                                    item.maintenanceCost
                            ),
                        borderWidth: 1
                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {
                        display: false
                    },

                    tooltip: {

                        callbacks: {

                            label: function (context) {

                                return (
                                    " Cost: " +
                                    formatCurrency(
                                        context.raw
                                    )
                                );

                            },

                            afterLabel: function (context) {

                                const item =
                                    data[context.dataIndex];

                                return [
                                    "Idle Days: " +
                                    item.idleDays,

                                    "Defects: " +
                                    item.defectCount
                                ];

                            }

                        }

                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            callback: function (value) {

                                return "₱" +
                                    Number(value)
                                        .toLocaleString();

                            }

                        }

                    }

                }

            }

        });
}


/* =========================================================
   DESTROY CHARTS
========================================================= */

function destroyFleetCharts() {

    if (fleetKmChart) {
        fleetKmChart.destroy();
        fleetKmChart = null;
    }

    if (fleetFuelChart) {
        fleetFuelChart.destroy();
        fleetFuelChart = null;
    }

    if (fleetKmlChart) {
        fleetKmlChart.destroy();
        fleetKmlChart = null;
    }

    if (fleetMaintenanceChart) {
        fleetMaintenanceChart.destroy();
        fleetMaintenanceChart = null;
    }
}


/* =========================================================
   DETAIL BUTTONS
========================================================= */

function setupFleetDetailButtons(data) {

    const kmButton =
        document.getElementById("fleetKmDetails");

    const fuelButton =
        document.getElementById("fleetFuelDetails");

    const kmlButton =
        document.getElementById("fleetKmlDetails");

    const maintenanceButton =
        document.getElementById(
            "fleetMaintenanceDetails"
        );


    if (kmButton) {

        kmButton.onclick = function () {

            showFleetDetail(
                "Actual Kilometer Details",
                data,
                function (item) {

                    return (
                        item.vehicle +
                        " — " +
                        formatNumber(item.km) +
                        " km"
                    );

                }
            );

        };

    }


    if (fuelButton) {

        fuelButton.onclick = function () {

            showFleetDetail(
                "Fuel Consumption Details",
                data,
                function (item) {

                    return (
                        item.vehicle +
                        " — " +
                        formatNumber(item.fuel) +
                        " L"
                    );

                }
            );

        };

    }


    if (kmlButton) {

        kmlButton.onclick = function () {

            showFleetDetail(
                "Fuel Efficiency Details",
                data,
                function (item) {

                    return (
                        item.vehicle +
                        " — " +
                        formatKmPerLiter(item.kmL) +
                        " km/L"
                    );

                }
            );

        };

    }


    if (maintenanceButton) {

        maintenanceButton.onclick = function () {

            showFleetDetail(
                "Maintenance Details",
                data,
                function (item) {

                    return (
                        item.vehicle +
                        " — " +
                        formatCurrency(
                            item.maintenanceCost
                        ) +
                        " | Idle: " +
                        item.idleDays +
                        " days | Defects: " +
                        item.defectCount
                    );

                }
            );

        };

    }
}


/* =========================================================
   SIMPLE FRONTEND DETAIL VIEW
========================================================= */

function showFleetDetail(title, data, formatter) {

    let message = title + "\n";
    message += "────────────────────────────\n\n";

    data.forEach(function (item) {

        message +=
            "• " +
            formatter(item) +
            "\n";

    });

    message +=
        "\nFrontend mock data only.\n" +
        "Apps Script connection will be added later.";

    alert(message);
}


/* =========================================================
   EXPOSE FUNCTIONS
========================================================= */

window.refreshFleetPerformance =
    refreshFleetPerformance;

window.getFilteredFleetData =
    getFilteredFleetData;

window.aggregateFleetByVehicle =
    aggregateFleetByVehicle;

window.FLEET_DATA =
    FLEET_DATA;
