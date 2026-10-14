/* =========================================================
   LOGIS-TECH SYSTEM
   ANALYTICS API
   Add this file to the Apps Script project.
   Reads only existing Google Sheets; it does not write records.
========================================================= */

function getFleetAnalyticsData() {
  const vehicles = getAllRecords(CONFIG.SHEETS.VEHICLES);
  const tripTickets = getAllRecords(CONFIG.SHEETS.TRIP_TICKETS);
  const fuelTransactions = getAllRecords(CONFIG.SHEETS.FUEL_TRANSACTIONS);
  const maintenance = getAllRecords(CONFIG.SHEETS.MAINTENANCE);
  const drMonitoring = getAllRecords(CONFIG.SHEETS.DR_MONITORING);

  return {
    success: true,
    vehicles: vehicles,
    tripTickets: tripTickets,
    fuelTransactions: fuelTransactions,
    maintenance: maintenance,
    drMonitoring: drMonitoring,
    count: {
      vehicles: vehicles.length,
      tripTickets: tripTickets.length,
      fuelTransactions: fuelTransactions.length,
      maintenance: maintenance.length,
      drMonitoring: drMonitoring.length
    }
  };
}

/*
   Add this case inside routeRequest(action, payload) in Code.gs:

   case "getFleetAnalyticsData":
     return getFleetAnalyticsData(payload);

   Then save and deploy a new version of the Apps Script web app.
*/
