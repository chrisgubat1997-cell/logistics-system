/* =========================================================
   LOGIS-TECH SYSTEM
   ACTIVITY LOG
   ActivityLog.gs
   ========================================================= */


function logActivity(data) {

  const now =
    new Date();

  const row = [

    generateId("LOG"),

    formatDateTime(now),

    data.userId || "",

    data.username || "SYSTEM",

    data.action || "",

    data.module || "",

    data.recordId || "",

    data.recordNumber || "",

    data.details || "",

    data.status || "SUCCESS"

  ];


  appendRow(
    CONFIG.SHEETS.ACTIVITY_LOG,
    row
  );

}
