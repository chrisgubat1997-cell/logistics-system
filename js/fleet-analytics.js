/* =====================================================
   FLEET & DELIVERY ANALYTICS
===================================================== */


/* =====================================================
   SAMPLE DATA
===================================================== */

const fleetAnalyticsData = {

    vehicles: [
        "TBO710",
        "TBO711",
        "TBO712",
        "TBO713",
        "TBO714"
    ],

    actualKM: [
        5000,
        4800,
        5500,
        5100,
        4900
    ],

    fuelLiters: [
        500,
        490,
        500,
        500,
        495
    ],

    kmPerLiter: [
        10.0,
        9.8,
        11.0,
        10.2,
        9.9
    ],

    leadTime: [
        1.2,
        1.5,
        1.1,
        1.8,
        1.3
    ],

    accuracy: [
        92,
        89,
        96,
        91,
        94
    ],

    drPerDay: [
        5,
        8,
        6,
        11,
        9,
        7,
        12,
        10,
        8,
        11,
        13,
        9,
        7,
        10,
        12
    ],

    drPerMonth: [
        125,
        108,
        143,
        97,
        156,
        132,
        149,
        138,
        114,
        186,
        0,
        0
    ]

};


/* =====================================================
   CHART VARIABLES
===================================================== */

let kmChart = null;

let fuelChart = null;

let kmLChart = null;

let leadTimeChart = null;

let accuracyChart = null;

let drDayChart = null;

let drMonthChart = null;


/* =====================================================
   INITIALIZE
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializeFleetAnalytics();

    }
);


/* =====================================================
   INITIALIZE ANALYTICS
===================================================== */

function initializeFleetAnalytics() {

    createKMChart();

    createFuelChart();

    createKmLChart();

    createLeadTimeChart();

    createAccuracyChart();

    createDRDayChart();

    createDRMonthChart();

    setupFleetFilters();

}


/* =====================================================
   ACTUAL KM / TRUCK
===================================================== */

function createKMChart() {

    const canvas =
        document.getElementById(
            "kmChart"
        );

    if (!canvas) return;


    kmChart = new Chart(
        canvas,
        {

            type: "bar",

            data: {

                labels:
                    fleetAnalyticsData.vehicles,

                datasets: [

                    {

                        label: "Actual KM",

                        data:
                            fleetAnalyticsData.actualKM,

                        borderRadius: 6

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    }

                },

                scales: {

                    y: {

                        beginAtZero: true

                    }

                }

            }

        }
    );

}


/* =====================================================
   FUEL CONSUMPTION
===================================================== */

function createFuelChart() {

    const canvas =
        document.getElementById(
            "fuelChart"
        );

    if (!canvas) return;


    fuelChart = new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels:
                    fleetAnalyticsData.vehicles,

                datasets: [

                    {

                        label: "Liters",

                        data:
                            fleetAnalyticsData.fuelLiters,

                        tension: 0.35,

                        fill: false

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    }

                }

            }

        }
    );

}


/* =====================================================
   KM / L
===================================================== */

function createKmLChart() {

    const canvas =
        document.getElementById(
            "kmlChart"
        );

    if (!canvas) return;


    kmLChart = new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels:
                    fleetAnalyticsData.vehicles,

                datasets: [

                    {

                        label: "KM/L",

                        data:
                            fleetAnalyticsData.kmPerLiter,

                        tension: 0.35,

                        fill: false

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    }

                }

            }

        }
    );

}


/* =====================================================
   DELIVERY LEAD TIME
===================================================== */

function createLeadTimeChart() {

    const canvas =
        document.getElementById(
            "leadTimeChart"
        );

    if (!canvas) return;


    leadTimeChart = new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels: [
                    "Week 1",
                    "Week 2",
                    "Week 3",
                    "Week 4"
                ],

                datasets: [

                    {

                        label:
                            "Average Lead Time",

                        data: [
                            1.5,
                            1.3,
                            1.7,
                            1.2
                        ],

                        tension: 0.35,

                        fill: false

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    }

                },

                scales: {

                    y: {

                        beginAtZero: true

                    }

                }

            }

        }
    );

}


/* =====================================================
   DELIVERY ACCURACY
===================================================== */

function createAccuracyChart() {

    const canvas =
        document.getElementById(
            "accuracyChart"
        );

    if (!canvas) return;


    accuracyChart = new Chart(
        canvas,
        {

            type: "line",

            data: {

                labels: [
                    "Week 1",
                    "Week 2",
                    "Week 3",
                    "Week 4"
                ],

                datasets: [

                    {

                        label:
                            "Accuracy %",

                        data: [
                            91,
                            94,
                            89,
                            96
                        ],

                        tension: 0.35,

                        fill: false

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    }

                },

                scales: {

                    y: {

                        min: 0,

                        max: 100

                    }

                }

            }

        }
    );

}


/* =====================================================
   DR PER DAY
===================================================== */

function createDRDayChart() {

    const canvas =
        document.getElementById(
            "drDayChart"
        );

    if (!canvas) return;


    drDayChart = new Chart(
        canvas,
        {

            type: "bar",

            data: {

                labels: [
                    "Oct 1",
                    "Oct 2",
                    "Oct 3",
                    "Oct 4",
                    "Oct 5",
                    "Oct 6",
                    "Oct 7",
                    "Oct 8",
                    "Oct 9",
                    "Oct 10",
                    "Oct 11",
                    "Oct 12",
                    "Oct 13",
                    "Oct 14",
                    "Oct 15"
                ],

                datasets: [

                    {

                        label: "DR",

                        data:
                            fleetAnalyticsData.drPerDay,

                        borderRadius: 5

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            precision: 0

                        }

                    }

                }

            }

        }
    );

}


/* =====================================================
   DR PER MONTH
===================================================== */

function createDRMonthChart() {

    const canvas =
        document.getElementById(
            "drMonthChart"
        );

    if (!canvas) return;


    drMonthChart = new Chart(
        canvas,
        {

            type: "bar",

            data: {

                labels: [
                    "Jan",
                    "Feb",
                    "Mar",
                    "Apr",
                    "May",
                    "Jun",
                    "Jul",
                    "Aug",
                    "Sep",
                    "Oct",
                    "Nov",
                    "Dec"
                ],

                datasets: [

                    {

                        label: "DR",

                        data:
                            fleetAnalyticsData.drPerMonth,

                        borderRadius: 5

                    }

                ]

            },

            options: {

                responsive: true,

                maintainAspectRatio: false,

                plugins: {

                    legend: {

                        display: false

                    }

                },

                scales: {

                    y: {

                        beginAtZero: true,

                        ticks: {

                            precision: 0

                        }

                    }

                }

            }

        }
    );

}


/* =====================================================
   FILTERS
===================================================== */

function setupFleetFilters() {

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
            applyFleetFilters
        );

    }


    if (yearFilter) {

        yearFilter.addEventListener(
            "change",
            applyFleetFilters
        );

    }


    if (monthFilter) {

        monthFilter.addEventListener(
            "change",
            applyFleetFilters
        );

    }

}


/* =====================================================
   APPLY FILTERS
===================================================== */

function applyFleetFilters() {

    const vehicle =
        document.getElementById(
            "vehicleFilter"
        ).value;


    const year =
        document.getElementById(
            "yearFilter"
        ).value;


    const month =
        document.getElementById(
            "monthFilter"
        ).value;


    console.log(
        "Fleet Analytics Filter:",
        {
            vehicle,
            year,
            month
        }
    );


    /*
     * DATABASE FILTER WILL BE CONNECTED LATER.
     */

}


/* =====================================================
   DETAILS
===================================================== */

function openDetails(type) {

    console.log(
        "Open analytics details:",
        type
    );

}
