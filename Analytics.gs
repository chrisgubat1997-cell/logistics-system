/* =========================================================
   LOGIS-TECH SYSTEM
   FLEET & DELIVERY ANALYTICS + DATA ENTRY API
   Reads and writes only the existing Google Sheets database.
========================================================= */

/**
 * GET API: return the five sheets used by Fleet & Delivery Analytics.
 */
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

/**
 * POST API: save a Fleet Data Entry record.
 * payload = { recordType: "tripTicket|fuel|maintenance|delivery|dr", record: {...} }
 */
function saveFleetRecord(payload) {
  if (!payload || !payload.recordType || !payload.record) {
    throw new Error("Missing recordType or record.");
  }

  const type = String(payload.recordType);
  const record = payload.record;
  const now = new Date();
  const createdAt = record.createdAt ? new Date(record.createdAt) : now;
  const updatedAt = now;
  const vehicleCode = String(record.vehicle || "").trim();
  const vehicleId = getFleetVehicleId_(vehicleCode);

  let sheetName;
  let idColumn;
  let values;

  if (type === "tripTicket") {
    sheetName = CONFIG.SHEETS.TRIP_TICKETS;
    idColumn = "TRIP_ID";
    values = {
      TRIP_ID: record.id || fleetMakeId_("TT"),
      TRIP_TICKET_NO: record.tripTicketNo || "",
      TRIP_DATE: fleetParseDate_(record.date),
      TRIP_SEQUENCE: record.tripSequence || "",
      VEHICLE_ID: vehicleId,
      VEHICLE_CODE: vehicleCode,
      DRIVER_ID: record.driverId || "",
      DRIVER_NAME: record.driver || "",
      START_KM: fleetNumberOrBlank_(record.startKm),
      END_KM: fleetNumberOrBlank_(record.endKm),
      TOTAL_KM: fleetNumberOrBlank_(record.totalKm),
      ORIGIN: record.origin || "",
      DESTINATION: record.destination || "",
      PURPOSE: record.purpose || "",
      ROUTE_DETAILS: JSON.stringify(Array.isArray(record.routeDetails) ? record.routeDetails : []),
      STATUS: record.status || "Completed",
      REMARKS: record.remarks || "",
      CREATED_BY: record.createdBy || "",
      CREATED_AT: createdAt,
      UPDATED_AT: updatedAt
    };
  } else if (type === "fuel") {
    sheetName = CONFIG.SHEETS.FUEL_TRANSACTIONS;
    idColumn = "FUEL_ID";
    values = {
      FUEL_ID: record.id || fleetMakeId_("FUEL"),
      FUEL_DATE: fleetParseDate_(record.date),
      VEHICLE_ID: vehicleId,
      VEHICLE_CODE: vehicleCode,
      TRIP_ID: record.tripId || "",
      TRIP_TICKET_NO: record.tripTicketNo || "",
      FUEL_STATION: record.station || "",
      LITERS: fleetNumberOrBlank_(record.liters),
      AMOUNT: fleetNumberOrBlank_(record.amount),
      ODOMETER: fleetNumberOrBlank_(record.odometer),
      FUEL_RECEIPT_NO: record.fuelReceiptNo || "",
      REMARKS: record.remarks || "",
      CREATED_BY: record.createdBy || "",
      CREATED_AT: createdAt,
      UPDATED_AT: updatedAt
    };
  } else if (type === "maintenance") {
    sheetName = CONFIG.SHEETS.MAINTENANCE;
    idColumn = "MAINTENANCE_ID";
    values = {
      MAINTENANCE_ID: record.id || fleetMakeId_("MAIN"),
      MAINTENANCE_DATE: fleetParseDate_(record.date),
      VEHICLE_ID: vehicleId,
      VEHICLE_CODE: vehicleCode,
      MAINTENANCE_TYPE: record.maintenanceType || "",
      DEFECT: record.defect || "",
      REPAIR_ACTION: record.repair || "",
      COST: fleetNumberOrBlank_(record.cost),
      IDLE_DAYS: fleetNumberOrBlank_(record.idleDays),
      STATUS: record.status || "Completed",
      REMARKS: record.remarks || "",
      CREATED_BY: record.createdBy || "",
      CREATED_AT: createdAt,
      UPDATED_AT: updatedAt
    };
  } else if (type === "delivery" || type === "dr") {
    sheetName = CONFIG.SHEETS.DR_MONITORING;
    idColumn = "DR_MONITORING_ID";
    values = {
      DR_MONITORING_ID: record.id || fleetMakeId_("DRM"),
      DR_ID: record.drId || "",
      DR_NUMBER: record.drNumber || record.deliveryNo || "",
      SO_ID: record.soId || "",
      SO_NUMBER: record.soNumber || "",
      CLIENT_NAME: record.client || "",
      PROJECT: record.project || "",
      VEHICLE_ID: vehicleId,
      VEHICLE_CODE: vehicleCode,
      TRIP_ID: record.tripId || "",
      DATE_TRANSFER: fleetParseDate_(record.dateTransfer),
      COMMITTED_DATE: fleetParseDate_(record.committedDate),
      DATE_DELIVERED: fleetParseDate_(record.dateDelivered || record.actualDate),
      STATUS: record.status || record.deliveryStatus || "Pending",
      DELAY_SOURCE: record.delaySource || "",
      DELAY_REASON: record.delayReason || "",
      REMARKS: record.remarks || "",
      CREATED_AT: createdAt,
      UPDATED_AT: updatedAt
    };
  } else {
    throw new Error("Unsupported Fleet record type: " + type);
  }

  if (type === "tripTicket") {
    fleetEnsureHeader_(sheetName, "ROUTE_DETAILS");
  }
  const saved = fleetUpsertSheetRecord_(sheetName, idColumn, values, type);
  return {
    success: true,
    message: "Fleet record saved to Google Sheets.",
    recordId: saved.id,
    updated: saved.updated
  };
}

/**
 * POST API: delete a Fleet Data Entry record by its sheet ID.
 */
function deleteFleetRecord(payload) {
  if (!payload || !payload.recordType || !payload.id) {
    throw new Error("Missing recordType or id.");
  }

  const type = String(payload.recordType);
  let sheetName;
  let idColumn;

  if (type === "tripTicket") {
    sheetName = CONFIG.SHEETS.TRIP_TICKETS;
    idColumn = "TRIP_ID";
  } else if (type === "fuel") {
    sheetName = CONFIG.SHEETS.FUEL_TRANSACTIONS;
    idColumn = "FUEL_ID";
  } else if (type === "maintenance") {
    sheetName = CONFIG.SHEETS.MAINTENANCE;
    idColumn = "MAINTENANCE_ID";
  } else if (type === "delivery" || type === "dr") {
    sheetName = CONFIG.SHEETS.DR_MONITORING;
    idColumn = "DR_MONITORING_ID";
  } else {
    throw new Error("Unsupported Fleet record type: " + type);
  }

  const sheet = fleetGetSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error("Record not found.");

  const headers = values[0].map(function(v) { return String(v).trim(); });
  const idIndex = headers.indexOf(idColumn);
  if (idIndex < 0) throw new Error("Missing ID column " + idColumn + " in " + sheetName + ".");

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][idIndex]) === String(payload.id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "Fleet record deleted." };
    }
  }

  throw new Error("Record not found: " + payload.id);
}

/* ----------------------- Helpers ----------------------- */

function fleetEnsureHeader_(sheetName, headerName) {
  const sheet = fleetGetSheet_(sheetName);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(function(v) { return String(v).trim(); });
  if (headers.indexOf(headerName) === -1) {
    sheet.getRange(1, lastColumn + 1).setValue(headerName);
  }
}

function fleetGetSheet_(sheetName) {
  const ss = SpreadsheetApp.openById(CONFIG.DATABASE_SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function fleetMakeId_(prefix) {
  return prefix + "-" + new Date().getTime() + "-" + Math.floor(Math.random() * 100000);
}

function fleetNumberOrBlank_(value) {
  if (value === "" || value === null || value === undefined) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function fleetParseDate_(value) {
  if (!value) return "";
  if (value instanceof Date) return value;
  const s = String(value);
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const d = new Date(value);
  return isNaN(d.getTime()) ? "" : d;
}

function getFleetVehicleId_(vehicleCode) {
  if (!vehicleCode) return "";
  const vehicles = getAllRecords(CONFIG.SHEETS.VEHICLES);
  const match = vehicles.find(function(v) {
    return String(v.VEHICLE_CODE || "").trim().toUpperCase() === vehicleCode.toUpperCase();
  });
  // VEHICLES master may still be unpopulated. Use the selected vehicle code
  // as a temporary stable identifier instead of saving VEHICLE_ID as blank.
  return match ? (match.VEHICLE_ID || match.VEHICLE_CODE || vehicleCode) : vehicleCode;
}

/**
 * Updates a matching record if an ID exists. For DR monitoring, it also
 * updates a matching DR number, or matching SO number + transfer date,
 * instead of creating duplicate monitoring rows.
 */
function fleetUpsertSheetRecord_(sheetName, idColumn, recordValues, type) {
  const sheet = fleetGetSheet_(sheetName);
  const range = sheet.getDataRange();
  const data = range.getValues();
  const headers = data.length ? data[0].map(function(v) { return String(v).trim(); }) : [];
  if (!headers.length || !headers[0]) throw new Error("Missing header row in " + sheetName + ".");

  const id = String(recordValues[idColumn] || "");
  let targetRow = -1;
  const idIndex = headers.indexOf(idColumn);
  const drIndex = headers.indexOf("DR_NUMBER");
  const soIndex = headers.indexOf("SO_NUMBER");
  const transferIndex = headers.indexOf("DATE_TRANSFER");
  const incomingDr = String(recordValues.DR_NUMBER || "").trim();
  const incomingSo = String(recordValues.SO_NUMBER || "").trim();
  const incomingTransfer = fleetDateKey_(recordValues.DATE_TRANSFER);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (idIndex >= 0 && id && String(row[idIndex]) === id) {
      targetRow = i + 1;
      break;
    }
    if (sheetName === CONFIG.SHEETS.DR_MONITORING) {
      const existingDr = drIndex >= 0 ? String(row[drIndex] || "").trim() : "";
      const existingSo = soIndex >= 0 ? String(row[soIndex] || "").trim() : "";
      const existingTransfer = transferIndex >= 0 ? fleetDateKey_(row[transferIndex]) : "";
      if (incomingDr && existingDr && incomingDr === existingDr) {
        targetRow = i + 1;
        break;
      }
      if (!incomingDr && incomingSo && existingSo === incomingSo && incomingTransfer && existingTransfer === incomingTransfer) {
        targetRow = i + 1;
        break;
      }
    }
  }

  const output = targetRow > 0 ? sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0] : new Array(headers.length).fill("");
  const createdIndex = headers.indexOf("CREATED_AT");
  const updatedIndex = headers.indexOf("UPDATED_AT");
  if (targetRow > 0 && createdIndex >= 0 && output[createdIndex]) recordValues.CREATED_AT = output[createdIndex];
  recordValues.UPDATED_AT = new Date();

  headers.forEach(function(header, i) {
    if (Object.prototype.hasOwnProperty.call(recordValues, header)) {
      output[i] = recordValues[header];
    }
  });

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, headers.length).setValues([output]);
  } else {
    sheet.appendRow(output);
  }

  return {
    id: targetRow > 0 ? (id || String(output[idIndex] || "")) : id,
    updated: targetRow > 0
  };
}

function fleetDateKey_(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/*
   REQUIRED: add these cases inside routeRequest(action, payload) in Code.gs:

   case "getFleetAnalyticsData":
     return getFleetAnalyticsData(payload);

   case "saveFleetRecord":
     return saveFleetRecord(payload);

   case "deleteFleetRecord":
     return deleteFleetRecord(payload);

   After updating Code.gs and Analytics.gs in Apps Script, Save and deploy
   a new version of the web app. Keep the deployment URL unchanged if editing
   the existing deployment.
*/
