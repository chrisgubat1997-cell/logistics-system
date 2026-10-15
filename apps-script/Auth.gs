/* =========================================================
   LOGIS-TECH SYSTEM
   AUTHENTICATION
   Auth.gs
   VERSION: 20261007-01
========================================================= */


/* =========================================================
   CONFIGURATION
========================================================= */

const AUTH_SPREADSHEET_ID =
  "1Txaem4xthFohNU_ITQ20AJzPeNpPLIxgbLfcVojYbnQ";

const USERS_SHEET_NAME =
  "USERS";


/* =========================================================
   CREATE ACCOUNT
========================================================= */

function createAccount(payload) {

  payload =
    payload ||
    {};


  /* =======================================================
     GET VALUES
  ======================================================= */

  const fullName =
    String(
      payload.fullName ||
      ""
    ).trim();


  const username =
    String(
      payload.username ||
      ""
    ).trim();


  const email =
    String(
      payload.email ||
      ""
    ).trim();


  const password =
    String(
      payload.password ||
      ""
    );


  const accountType =
    String(
      payload.accountType ||
      ""
    ).trim()
    .toUpperCase();


  /* =======================================================
     VALIDATION
  ======================================================= */

  if (!fullName) {

    return {

      success: false,

      message:
        "Full name is required."

    };

  }


  if (!username) {

    return {

      success: false,

      message:
        "Username is required."

    };

  }


  if (!email) {

    return {

      success: false,

      message:
        "Email is required."

    };

  }


  if (!password) {

    return {

      success: false,

      message:
        "Password is required."

    };

  }


  if (password.length < 6) {

    return {

      success: false,

      message:
        "Password must be at least 6 characters."

    };

  }


  const allowedRoles = [

    "SALES",
    "LOGISTICS",
    "FINANCE",
    "PAYMENT"

  ];


  if (
    allowedRoles.indexOf(
      accountType
    ) === -1
  ) {

    return {

      success: false,

      message:
        "Invalid account type."

    };

  }


  /* =======================================================
     GET USERS SHEET
  ======================================================= */

  const spreadsheet =
    SpreadsheetApp.openById(
      AUTH_SPREADSHEET_ID
    );


  const sheet =
    spreadsheet.getSheetByName(
      USERS_SHEET_NAME
    );


  if (!sheet) {

    throw new Error(
      'USERS sheet not found.'
    );

  }


  /* =======================================================
     CHECK HEADERS
  ======================================================= */

  const headers =
    sheet
      .getRange(
        1,
        1,
        1,
        10
      )
      .getValues()[0];


  const requiredHeaders = [

    "USER_ID",
    "USERNAME",
    "FULL_NAME",
    "EMAIL",
    "ROLE",
    "STATUS",
    "CREATED_AT",
    "UPDATED_AT",
    "LAST_LOGIN",
    "PASSWORD_HASH"

  ];


  for (
    let i = 0;
    i < requiredHeaders.length;
    i++
  ) {

    if (
      String(
        headers[i] ||
        ""
      ).trim()
      !==
      requiredHeaders[i]
    ) {

      throw new Error(
        "USERS sheet headers are incorrect. " +
        "Expected column " +
        (i + 1) +
        ": " +
        requiredHeaders[i]
      );

    }

  }


  /* =======================================================
     READ EXISTING USERS
  ======================================================= */

  const lastRow =
    sheet.getLastRow();


  let records = [];


  if (lastRow >= 2) {

    records =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          10
        )
        .getValues();

  }


  /* =======================================================
     CHECK DUPLICATE USERNAME / EMAIL
  ======================================================= */

  const normalizedUsername =
    username.toLowerCase();


  const normalizedEmail =
    email.toLowerCase();


  for (
    let i = 0;
    i < records.length;
    i++
  ) {

    const existingUsername =
      String(
        records[i][1] ||
        ""
      )
      .trim()
      .toLowerCase();


    const existingEmail =
      String(
        records[i][3] ||
        ""
      )
      .trim()
      .toLowerCase();


    if (
      existingUsername ===
      normalizedUsername
    ) {

      return {

        success: false,

        message:
          "Username already exists."

      };

    }


    if (
      existingEmail ===
      normalizedEmail
    ) {

      return {

        success: false,

        message:
          "Email already exists."

      };

    }

  }


  /* =======================================================
     GENERATE USER ID
  ======================================================= */

  const userId =
    generateUserId();


  /* =======================================================
     HASH PASSWORD
  ======================================================= */

  const passwordHash =
    hashPassword(
      password
    );


  /* =======================================================
     TIMESTAMP
  ======================================================= */

  const now =
    new Date();


  /* =======================================================
     SAVE USER
  ======================================================= */

  sheet.appendRow([

    userId,

    username,

    fullName,

    email,

    accountType,

    "ACTIVE",

    now,

    now,

    "",

    passwordHash

  ]);


  /* =======================================================
     RESPONSE
  ======================================================= */

  return {

    success: true,

    message:
      "Account created successfully.",

    account: {

      userId:
        userId,

      username:
        username,

      fullName:
        fullName,

      email:
        email,

      role:
        accountType,

      status:
        "ACTIVE"

    }

  };

}


/* =========================================================
   GENERATE USER ID
========================================================= */

function generateUserId() {

  const now =
    new Date();


  const year =
    Utilities.formatDate(
      now,
      Session.getScriptTimeZone(),
      "yyyy"
    );


  const randomPart =
    Utilities.getUuid()
      .replace(
        /-/g,
        ""
      )
      .substring(
        0,
        8
      )
      .toUpperCase();


  return (
    "USR-" +
    year +
    "-" +
    randomPart
  );

}


/* =========================================================
   HASH PASSWORD
========================================================= */

function hashPassword(password) {

  const digest =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      password,
      Utilities.Charset.UTF_8
    );


  return digest
    .map(function (byte) {

      const value =
        byte < 0
          ? byte + 256
          : byte;

      return (
        value
          .toString(16)
          .padStart(2, "0")
      );

    })
    .join("");

}

/* =========================================================
   LOGIN USER
========================================================= */

function loginUser(payload) {

  payload =
    payload ||
    {};


  /* =======================================================
     GET VALUES
  ======================================================= */

  const username =
    String(
      payload.username ||
      ""
    ).trim();


  const password =
    String(
      payload.password ||
      "");


  /* =======================================================
     VALIDATION
  ======================================================= */

  if (!username) {

    return {

      success: false,

      message:
        "Username is required."

    };

  }


  if (!password) {

    return {

      success: false,

      message:
        "Password is required."

    };

  }


  /* =======================================================
     OPEN DATABASE
  ======================================================= */

  const spreadsheet =
    SpreadsheetApp.openById(
      AUTH_SPREADSHEET_ID
    );


  const sheet =
    spreadsheet.getSheetByName(
      USERS_SHEET_NAME
    );


  if (!sheet) {

    throw new Error(
      "USERS sheet not found."
    );

  }


  /* =======================================================
     GET USERS
  ======================================================= */

  const lastRow =
    sheet.getLastRow();


  if (lastRow < 2) {

    return {

      success: false,

      message:
        "No user accounts found."

    };

  }


  const records =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        10
      )
      .getValues();


  /* =======================================================
     FIND USER
  ======================================================= */

  const normalizedUsername =
    username.toLowerCase();


  let userRecord = null;


  for (
    let i = 0;
    i < records.length;
    i++
  ) {

    const existingUsername =
      String(
        records[i][1] ||
        ""
      )
      .trim()
      .toLowerCase();


    if (
      existingUsername ===
      normalizedUsername
    ) {

      userRecord =
        records[i];

      break;

    }

  }


  /* =======================================================
     USER NOT FOUND
  ======================================================= */

  if (!userRecord) {

    return {

      success: false,

      message:
        "Invalid username or password."

    };

  }


  /* =======================================================
     READ USER DATA
  ======================================================= */

  const userId =
    String(
      userRecord[0] ||
      ""
    );


  const savedUsername =
    String(
      userRecord[1] ||
      ""
    );


  const fullName =
    String(
      userRecord[2] ||
      ""
    );


  const email =
    String(
      userRecord[3] ||
      ""
    );


  const role =
    String(
      userRecord[4] ||
      ""
    );


  const status =
    String(
      userRecord[5] ||
      ""
    )
    .trim()
    .toUpperCase();


  const savedPasswordHash =
    String(
      userRecord[9] ||
      ""
    );


  /* =======================================================
     CHECK ACCOUNT STATUS
  ======================================================= */

  if (
    status !==
    "ACTIVE"
  ) {

    return {

      success: false,

      message:
        "Your account is not active. Please contact the administrator."

    };

  }


  /* =======================================================
     HASH ENTERED PASSWORD
  ======================================================= */

  const enteredPasswordHash =
    hashPassword(
      password
    );


  /* =======================================================
     CHECK PASSWORD
  ======================================================= */

  if (
    enteredPasswordHash !==
    savedPasswordHash
  ) {

    return {

      success: false,

      message:
        "Invalid username or password."

    };

  }


  /* =======================================================
     UPDATE LAST LOGIN
  ======================================================= */

  const now =
    new Date();


  /*
     Column I = LAST_LOGIN
     User row = records index + 2
  */

  const userRow =
    records.indexOf(
      userRecord
    ) + 2;


  sheet
    .getRange(
      userRow,
      9
    )
    .setValue(
      now
    );


  /* =======================================================
     LOGIN SUCCESS
  ======================================================= */

  return {

    success: true,

    message:
      "Login successful.",

    account: {

      userId:
        userId,

      username:
        savedUsername,

      fullName:
        fullName,

      email:
        email,

      role:
        role,

      status:
        status

    }

  };

}
