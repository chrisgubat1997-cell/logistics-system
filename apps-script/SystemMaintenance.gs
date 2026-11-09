/* =========================================================
   LOGIS-TECH SYSTEM — SYSTEM MAINTENANCE CONTROL
   Stores the global maintenance switch in Apps Script
   Script Properties. No Google Sheet changes required.
========================================================= */

function isSystemMaintenanceEnabled_() {
  return PropertiesService.getScriptProperties()
    .getProperty("SYSTEM_MAINTENANCE_ENABLED") === "true";
}

function getSystemMaintenanceStatus_(payload) {
  const account = authorizeRole_(payload, [
    "ADMIN", "SALES", "LOGISTICS", "FINANCE", "PAYMENT", "PRODUCTION"
  ]);
  const props = PropertiesService.getScriptProperties();
  return {
    success: true,
    enabled: props.getProperty("SYSTEM_MAINTENANCE_ENABLED") === "true",
    message: props.getProperty("SYSTEM_MAINTENANCE_MESSAGE") ||
      "The system is temporarily unavailable while we perform maintenance.",
    updatedAt: props.getProperty("SYSTEM_MAINTENANCE_UPDATED_AT") || "",
    updatedBy: props.getProperty("SYSTEM_MAINTENANCE_UPDATED_BY") || "",
    isAdmin: account.role === "ADMIN"
  };
}

function setSystemMaintenanceMode_(payload) {
  const account = authorizeRole_(payload, ["ADMIN"]);
  const enabled = payload.enabled === true ||
    String(payload.enabled).toLowerCase() === "true";
  const message = String(payload.message ||
    "The system is temporarily unavailable while we perform maintenance.")
    .trim().slice(0, 300);
  PropertiesService.getScriptProperties().setProperties({
    SYSTEM_MAINTENANCE_ENABLED: enabled ? "true" : "false",
    SYSTEM_MAINTENANCE_MESSAGE: message,
    SYSTEM_MAINTENANCE_UPDATED_AT: new Date().toISOString(),
    SYSTEM_MAINTENANCE_UPDATED_BY: account.username
  }, false);
  return {
    success: true,
    enabled: enabled,
    message: enabled
      ? "Maintenance Mode enabled. Non-admin access is now blocked."
      : "System is back online for all users."
  };
}
