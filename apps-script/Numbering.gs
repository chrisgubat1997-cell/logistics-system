/* =========================================================
   LOGIS-TECH SYSTEM
   NUMBERING
   Numbering.gs
   ========================================================= */


/* =========================================================
   GENERATE NEXT NUMBER
========================================================= */

function generateDocumentNumber(
  prefix,
  sheetName,
  columnName
) {

  const year =
    getCurrentYear();

  const records =
    getAllRecords(sheetName);

  let highest = 0;

  records.forEach(function(record) {

    const value =
      String(record[columnName] || "");

    const regex =
      new RegExp(
        "^" +
        prefix +
        "-" +
        year +
        "-(\\d+)$"
      );

    const match =
      value.match(regex);

    if (match) {

      const number =
        Number(match[1]);

      if (number > highest) {

        highest = number;

      }

    }

  });

  const next =
    highest + 1;

  return (
    prefix +
    "-" +
    year +
    "-" +
    String(next).padStart(4, "0")
  );

}
