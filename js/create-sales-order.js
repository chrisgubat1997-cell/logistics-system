/* =====================================================
   LOGI-TECH CREATE SALES ORDER
===================================================== */

let soCreateFiles = [];

document.addEventListener("DOMContentLoaded", function () {

    console.log("Create Sales Order Loaded");

    const fileInput =
        document.getElementById("soFileInput");

    if (fileInput) {

        fileInput.addEventListener(
            "change",
            handleSOFileSelect
        );

    }

});


/* =====================================================
   FILE UPLOAD
===================================================== */

function handleSOFileSelect(event) {

    const files =
        Array.from(event.target.files);

    files.forEach(function (file) {

        if (
            file.type !== "application/pdf" &&
            !file.name.toLowerCase().endsWith(".pdf")
        ) {

            alert(
                "Only PDF files are allowed:\n\n" +
                file.name
            );

            return;

        }

        const alreadyAdded =
            soCreateFiles.some(function (existingFile) {

                return (
                    existingFile.name === file.name &&
                    existingFile.size === file.size
                );

            });

        if (!alreadyAdded) {

            soCreateFiles.push(file);

        }

    });

    renderSOFiles();

    event.target.value = "";

}


/* =====================================================
   DISPLAY SELECTED FILES
===================================================== */

function renderSOFiles() {

    const fileList =
        document.getElementById("soFileList");

    if (!fileList) {
        return;
    }

    fileList.innerHTML = "";

    if (soCreateFiles.length === 0) {

        fileList.innerHTML = `
            <div class="no-files">
                No files selected.
            </div>
        `;

        return;

    }


    soCreateFiles.forEach(function (file, index) {

        const row =
            document.createElement("div");

        row.className = "so-file-row";

        row.innerHTML = `

            <div>

                <div class="so-file-name">
                    📄 ${escapeSOFileName(file.name)}
                </div>

                <div class="so-file-size">
                    ${formatSOFileSize(file.size)}
                </div>

            </div>

            <button
                type="button"
                class="remove-file-btn"
                onclick="removeSOFile(${index})"
            >
                REMOVE
            </button>

        `;

        fileList.appendChild(row);

    });

}


/* =====================================================
   REMOVE FILE
===================================================== */

function removeSOFile(index) {

    if (
        index < 0 ||
        index >= soCreateFiles.length
    ) {

        return;

    }

    soCreateFiles.splice(index, 1);

    renderSOFiles();

}


/* =====================================================
   FILE SIZE
===================================================== */

function formatSOFileSize(bytes) {

    if (bytes === 0) {
        return "0 Bytes";
    }

    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];

    const i =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );

    return (
        parseFloat(
            (bytes / Math.pow(1024, i))
            .toFixed(2)
        ) +
        " " +
        units[i]
    );

}


/* =====================================================
   FILE NAME SAFETY
===================================================== */

function escapeSOFileName(name) {

    return name
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* =====================================================
   ADD ITEM
===================================================== */

function addSOItem() {

    console.log("Add Sales Order Item");

}


/* =====================================================
   CALCULATE TOTALS
===================================================== */

function calculateSOTotals() {

    console.log("Calculate Sales Order Totals");

}


/* =====================================================
   SAVE SALES ORDER
===================================================== */

function saveSO() {

    console.log(
        "Save Sales Order"
    );

    console.log(
        "Files selected:",
        soCreateFiles
    );

}


/* =====================================================
   CLOSE CREATE SO
===================================================== */

function closeCreateSO() {

    console.log(
        "Close Create Sales Order"
    );

}
