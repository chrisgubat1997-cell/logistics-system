/* =====================================================
   LOGIS-TECH CREATE SALES ORDER
===================================================== */

let soCreateFiles = [];
let soItemCount = 0;


/* =====================================================
   PAGE LOAD
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("Create Sales Order Loaded");

    // File upload
    const fileInput =
        document.getElementById("soFileInput");

    if (fileInput) {

        fileInput.addEventListener(
            "change",
            handleSOFileSelect
        );

    }

    // Generate SO number if empty
    const soNumber =
        document.getElementById("soNumber");

    if (soNumber && !soNumber.value) {

        const now = new Date();

        const year =
            now.getFullYear();

        const random =
            Math.floor(
                1000 + Math.random() * 9000
            );

        soNumber.value =
            `SO-${year}-${random}`;

    }

});


/* =====================================================
   ADD ITEM
===================================================== */

function addSOItem() {

    const tbody =
        document.getElementById("soItemsBody");

    if (!tbody) {

        console.error(
            "soItemsBody not found."
        );

        return;
    }

    soItemCount++;

    const row =
        document.createElement("tr");

    row.innerHTML = `
        <td>${soItemCount}</td>

        <td>
            <input
                type="text"
                class="so-item-name"
                placeholder="Item name"
            >
        </td>

        <td>
            <input
                type="text"
                class="so-item-description"
                placeholder="Description"
            >
        </td>

        <td>
            <input
                type="number"
                class="so-item-qty"
                value="1"
                min="0"
                step="1"
                onchange="calculateSOTotals()"
            >
        </td>

        <td>
            <input
                type="text"
                class="so-item-unit"
                placeholder="pcs"
            >
        </td>

        <td>
            <input
                type="number"
                class="so-item-amount"
                value="0"
                min="0"
                step="0.01"
                onchange="calculateSOTotals()"
            >
        </td>

        <td class="so-item-total">
            ₱0.00
        </td>

        <td>
            <button
                type="button"
                class="remove-item-btn"
                onclick="removeSOItem(this)"
            >
                REMOVE
            </button>
        </td>
    `;

    tbody.appendChild(row);

    calculateSOTotals();

}


/* =====================================================
   REMOVE ITEM
===================================================== */

function removeSOItem(button) {

    const row =
        button.closest("tr");

    if (row) {

        row.remove();

    }

    renumberSOItems();

    calculateSOTotals();

}


/* =====================================================
   RENUMBER ITEMS
===================================================== */

function renumberSOItems() {

    const rows =
        document.querySelectorAll(
            "#soItemsBody tr"
        );

    rows.forEach(function (row, index) {

        const numberCell =
            row.querySelector("td:first-child");

        if (numberCell) {

            numberCell.textContent =
                index + 1;

        }

    });

    soItemCount = rows.length;

}


/* =====================================================
   CALCULATE TOTALS
===================================================== */

function calculateSOTotals() {

    const rows =
        document.querySelectorAll(
            "#soItemsBody tr"
        );

    let subtotal = 0;

    rows.forEach(function (row) {

        const qtyInput =
            row.querySelector(
                ".so-item-qty"
            );

        const amountInput =
            row.querySelector(
                ".so-item-amount"
            );

        const totalCell =
            row.querySelector(
                ".so-item-total"
            );

        const qty =
            parseFloat(
                qtyInput?.value
            ) || 0;

        const amount =
            parseFloat(
                amountInput?.value
            ) || 0;

        const total =
            qty * amount;

        subtotal += total;

        if (totalCell) {

            totalCell.textContent =
                formatCurrency(total);

        }

    });


    /* DISCOUNT */

    const discountInput =
        document.getElementById(
            "soDiscount"
        );

    const discount =
        parseFloat(
            discountInput?.value
        ) || 0;


    /* VATABLE */

    const vatable =
        subtotal - discount;


    /* VAT */

    const vatRateInput =
        document.getElementById(
            "soVATRate"
        );

    const vatRate =
        parseFloat(
            vatRateInput?.value
        ) || 12;


    const vat =
        vatable * (vatRate / 100);


    /* GRAND TOTAL */

    const grandTotal =
        vatable + vat;


    /* DISPLAY */

    const subtotalDisplay =
        document.getElementById(
            "soSubtotal"
        );

    const vatableDisplay =
        document.getElementById(
            "soVatable"
        );

    const vatDisplay =
        document.getElementById(
            "soVAT"
        );

    const grandTotalDisplay =
        document.getElementById(
            "soGrandTotal"
        );


    if (subtotalDisplay) {

        subtotalDisplay.textContent =
            formatCurrency(subtotal);

    }

    if (vatableDisplay) {

        vatableDisplay.textContent =
            formatCurrency(vatable);

    }

    if (vatDisplay) {

        vatDisplay.textContent =
            formatCurrency(vat);

    }

    if (grandTotalDisplay) {

        grandTotalDisplay.textContent =
            formatCurrency(grandTotal);

    }

}


/* =====================================================
   CURRENCY
===================================================== */

function formatCurrency(amount) {

    return "₱" +
        Number(amount || 0)
            .toLocaleString(
                "en-PH",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

}


/* =====================================================
   FILE UPLOAD
===================================================== */

function handleSOFileSelect(event) {

    const files =
        Array.from(
            event.target.files || []
        );

    files.forEach(function (file) {

        /* PDF ONLY */

        const isPDF =
            file.type === "application/pdf" ||
            file.name
                .toLowerCase()
                .endsWith(".pdf");

        if (!isPDF) {

            alert(
                `"${file.name}" is not a PDF file.`
            );

            return;
        }


        /* DUPLICATE CHECK */

        const duplicate =
            soCreateFiles.some(
                function (existingFile) {

                    return (
                        existingFile.name ===
                            file.name &&
                        existingFile.size ===
                            file.size
                    );

                }
            );


        if (duplicate) {

            alert(
                `"${file.name}" is already selected.`
            );

            return;
        }


        soCreateFiles.push(file);

    });


    renderSOFiles();

    event.target.value = "";

}


/* =====================================================
   RENDER FILES
===================================================== */

function renderSOFiles() {

    const container =
        document.getElementById(
            "soFileList"
        );

    if (!container) {

        return;

    }


    if (soCreateFiles.length === 0) {

        container.innerHTML = `
            <div class="no-files">
                No files selected.
            </div>
        `;

        return;

    }


    container.innerHTML = "";


    soCreateFiles.forEach(
        function (file, index) {

            const row =
                document.createElement("div");

            row.className =
                "so-file-row";

            row.innerHTML = `

                <div>

                    <div class="so-file-name">
                        ${escapeSOFileName(file.name)}
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

            container.appendChild(row);

        }
    );

}


/* =====================================================
   REMOVE FILE
===================================================== */

function removeSOFile(index) {

    soCreateFiles.splice(
        index,
        1
    );

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
            (
                bytes /
                Math.pow(1024, i)
            ).toFixed(2)
        ) +
        " " +
        units[i]
    );

}


/* =====================================================
   ESCAPE FILE NAME
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
   SAVE SO
===================================================== */

function saveSO() {

    calculateSOTotals();

    console.log(
        "Sales Order saved."
    );

    alert(
        "Sales Order saved successfully."
    );

}


/* =====================================================
   CLOSE / CANCEL
===================================================== */

function closeCreateSO() {

    window.location.href =
        "../index.html";

}
