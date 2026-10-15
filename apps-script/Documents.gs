/* =========================================================
   LOGIS-TECH SYSTEM
   DOCUMENTS
   Documents.gs
   ========================================================= */


/* =========================================================
   UPLOAD SALES ORDER FILE
========================================================= */

function uploadSOFile(payload) {

  const soNumber =
    payload.soNumber;

  if (!soNumber) {

    return {

      success: false,

      error:
        "SO number is required."

    };

  }


  if (!payload.fileName) {

    return {

      success: false,

      error:
        "File name is required."

    };

  }


  if (!payload.base64) {

    return {

      success: false,

      error:
        "File data is required."

    };

  }


  // -------------------------------------------------------
  // FIND SO
  // -------------------------------------------------------

  const so =
    findRecord(
      CONFIG.SHEETS.SALES_ORDERS,
      "SO_NUMBER",
      soNumber
    );


  if (!so) {

    return {

      success: false,

      error:
        "Sales Order not found: " +
        soNumber

    };

  }


  // -------------------------------------------------------
  // GET SO FOLDER
  // -------------------------------------------------------

  const year =
    getCurrentYear();

  const soFolder =
    createSalesOrderFolder(
      year,
      soNumber
    );


  // -------------------------------------------------------
  // DECODE FILE
  // -------------------------------------------------------

  const bytes =
    Utilities.base64Decode(
      payload.base64
    );


  const blob =
    Utilities.newBlob(
      bytes,
      payload.mimeType ||
        "application/octet-stream",
      payload.fileName
    );


  // -------------------------------------------------------
  // CREATE FILE
  // -------------------------------------------------------

  const file =
    soFolder.createFile(blob);


  // -------------------------------------------------------
  // DOCUMENT TYPE
  // -------------------------------------------------------

  const documentType =
    payload.documentType ||
    "OTHER";


  // -------------------------------------------------------
  // DOCUMENT INDEX
  // -------------------------------------------------------

  const documentId =
    generateId("DOC");


  const now =
    new Date();


  const row = [

    documentId,

    documentType,

    so.SO_ID || "",

    soNumber,

    file.getName(),

    file.getId(),

    soFolder.getId(),

    file.getMimeType(),

    file.getUrl(),

    payload.uploadedBy ||
      "SYSTEM",

    formatDateTime(now),

    "ACTIVE"

  ];


  appendRow(
    CONFIG.SHEETS.DOCUMENT_INDEX,
    row
  );


  // -------------------------------------------------------
  // LOG
  // -------------------------------------------------------

  logActivity({

    userId:
      payload.userId || "",

    username:
      payload.uploadedBy ||
      "SYSTEM",

    action: "UPLOAD",

    module: "Sales Order",

    recordId:
      so.SO_ID || "",

    recordNumber:
      soNumber,

    details:
      "Uploaded " +
      documentType +
      ": " +
      file.getName(),

    status: "SUCCESS"

  });

touchSyncVersion();

  return {

    success: true,

    message:
      "File uploaded successfully.",

    data: {

      documentId:
        documentId,

      fileId:
        file.getId(),

      fileName:
        file.getName(),

      fileUrl:
        file.getUrl(),

      folderId:
        soFolder.getId(),

      folderUrl:
        soFolder.getUrl()

    }

  };

}
