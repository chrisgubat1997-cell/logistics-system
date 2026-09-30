/* =====================================================
LOGI-TECH SALES ORDER
===================================================== */

let selectedSOPDF = null;
let selectedSOPDFUrl = null;

document.addEventListener("DOMContentLoaded", function () {

```
console.log("LOGI-TECH Sales Order Loaded");
```

});

/* =====================================================
CREATE SALES ORDER
===================================================== */

function openCreateSO() {

```
console.log("Open Create Sales Order");
```

}

/* =====================================================
UPDATE SALES ORDER
===================================================== */

function updateSelectedSO() {

```
console.log("Update Selected Sales Order");
```

}

/* =====================================================
CANCEL SALES ORDER
===================================================== */

function cancelSelectedSO() {

```
console.log("Cancel Selected Sales Order");
```

}

/* =====================================================
SEARCH SALES ORDER
===================================================== */

function searchSO() {

```
console.log("Search Sales Order");
```

}

/* =====================================================
UPLOAD SO PDF
===================================================== */

function handleSOPDFUpload(event) {

```
const file = event.target.files[0];

if (!file) {
    return;
}


/* Check file type */

if (file.type !== "application/pdf") {

    alert("Please select a PDF file.");

    event.target.value = "";

    return;
}


/* Save selected PDF */

selectedSOPDF = file;


/* Create temporary browser URL */

if (selectedSOPDFUrl) {

    URL.revokeObjectURL(selectedSOPDFUrl);

}

selectedSOPDFUrl =
    URL.createObjectURL(file);


/* Update filename */

const fileName =
    document.getElementById("pdfFileName");

if (fileName) {

    fileName.textContent =
        file.name;

}


/* Update status */

const status =
    document.getElementById("soFileStatus");

if (status) {

    status.textContent =
        "PDF uploaded: " + file.name;

    status.style.color =
        "#16a34a";

}


/* Enable buttons */

const viewButton =
    document.getElementById("viewSOButton");

const printButton =
    document.getElementById("printSOButton");


if (viewButton) {

    viewButton.disabled = false;

}


if (printButton) {

    printButton.disabled = false;

}


console.log(
    "SO PDF selected:",
    file.name
);
```

}

/* =====================================================
VIEW SO PDF
===================================================== */

function viewSOPDF() {

```
if (!selectedSOPDFUrl) {

    alert("No SO PDF uploaded.");

    return;
}


const viewer =
    document.getElementById("soPdfViewer");

const modal =
    document.getElementById("soPdfModal");


if (!viewer || !modal) {

    return;

}


viewer.src =
    selectedSOPDFUrl;


modal.classList.add("show");

modal.setAttribute(
    "aria-hidden",
    "false"
);
```

}

/* =====================================================
CLOSE SO PDF
===================================================== */

function closeSOPDF() {

```
const modal =
    document.getElementById("soPdfModal");


if (!modal) {

    return;

}


modal.classList.remove("show");

modal.setAttribute(
    "aria-hidden",
    "true"
);
```

}

/* =====================================================
PRINT SO PDF
===================================================== */

function printSOPDF() {

```
if (!selectedSOPDFUrl) {

    alert("No SO PDF uploaded.");

    return;
}


const printWindow =
    window.open(
        selectedSOPDFUrl,
        "_blank"
    );


if (!printWindow) {

    alert(
        "Please allow pop-ups to print the Sales Order PDF."
    );

    return;

}


printWindow.addEventListener(
    "load",
    function () {

        printWindow.focus();

        printWindow.print();

    }
);
```

}

/* =====================================================
CLEANUP PDF OBJECT URL
===================================================== */

window.addEventListener(
"beforeunload",
function () {

```
    if (selectedSOPDFUrl) {

        URL.revokeObjectURL(
            selectedSOPDFUrl
        );

    }

}
```

);
