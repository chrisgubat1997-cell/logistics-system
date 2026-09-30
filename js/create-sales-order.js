/* =====================================================
   LOGIS-TECH SYSTEM
   CREATE SALES ORDER
===================================================== */

const VAT_RATE = 0.12;

let soItemCount = 0;
let soCreateFiles = [];


/* =====================================================
   PAGE LOAD
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("Create Sales Order Loaded");

    initializeCreateSO();

    setupFileUpload();

});


/* =====================================================
   INITIALIZE CREATE SO
===================================================== */

function initializeCreateSO() {

    const dateInput =
        document.getElementById("soDate");

    if (dateInput && !dateInput.value) {

        const today =
            new Date();

        const year =
            today.getFullYear();

        const month =
            String(
                today.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                today.getDate()
            ).padStart(2, "0");

        dateInput.value =
            `${year}-${month}-${day}`;

    }


    generateSONumber();


    const discount =
        document.getElementById("soDiscount");

    if (discount) {

        discount.addEventListener(
            "input",
            calculateSOTotals
        );

    }


    const vatable =
        document.getElementById("soVatable");

    if (vatable) {

        vatable.addEventListener(
            "change",
            calculateSOTotals
        );

    }


    calculateSOTotals();

}


/* =====================================================
   GENERATE SO NUMBER
===================================================== */

function generateSONumber() {

    const year =
        new Date().getFullYear();

    let salesOrders = [];

    try {

        salesOrders =
            JSON.parse(
                localStorage.getItem(
                    "salesOrders"
                )
            ) || [];

    } catch (error) {

        salesOrders = [];

    }


    let highest = 0;


    salesOrders.forEach(function (so) {

        const match =
            String(
                so.soNumber || ""
            ).match(
                new RegExp(
                    "^SO-" +
                    year +
                    "-(\\d+)$"
                )
            );


        if (match) {

            const number =
                Number(match[1]) || 0;

            if (number > highest) {

                highest = number;

            }

        }

    });


    const nextNumber =
        String(
            highest + 1
        ).padStart(
            5,
            "0"
        );


    const input =
        document.getElementById(
            "soNumber"
        );


    if (input) {

        input.value =
            `SO-${year}-${nextNumber}`;

    }

}


/* =====================================================
   ADD ITEM
===================================================== */

function addSOItem() {

    const body =
        document.getElementById(
            "soItemsBody"
        );


    if (!body) {

        console.error(
            "soItemsBody not found."
        );

        return;

    }


    soItemCount++;


    const row =
        document.createElement("tr");


    row.innerHTML = `

        <td class="item-number">
            ${soItemCount}
        </td>

        <td>
            <input
                type="text"
                class="item-name"
                placeholder="Item name">
        </td>

        <td>
            <input
                type="text"
                class="item-description"
                placeholder="Description">
        </td>

        <td>
            <input
                type="number"
                class="item-qty"
                min="0"
                step="0.01"
                value="1"
                oninput="calculateSOItemTotal(this)">
        </td>

        <td>

            <select
                class="item-unit"
                onchange="handleUnitChange(this)">

                <option value="pcs">
                    pcs
                </option>

                <option value="assy">
                    assy
                </option>

                <option value="set">
                    set
                </option>

                <option value="length">
                    length
                </option>

                <option value="meter">
                    meter
                </option>

                <option value="lot">
                    lot
                </option>

                <option value="box">
                    box
                </option>

                <option value="roll">
                    roll
                </option>

                <option value="amount">
                    amount
                </option>

                <option value="custom">
                    custom
                </option>

            </select>

            <input
                type="text"
                class="custom-unit-input"
                placeholder="Custom unit"
                style="display:none;">

        </td>

        <td>
            <input
                type="number"
                class="item-amount"
                min="0"
                step="0.01"
                value="0"
                oninput="calculateSOItemTotal(this)">
        </td>

        <td>
            <input
                type="text"
                class="item-total"
                value="₱0.00"
                readonly>
        </td>

        <td>

            <button
                type="button"
                class="delete-item"
                onclick="deleteSOItem(this)">

                DELETE

            </button>

        </td>

    `;


    body.appendChild(row);


    calculateSOTotals();

}


/* =====================================================
   CALCULATE ITEM
===================================================== */

function calculateSOItemTotal(input) {

    const row =
        input.closest("tr");


    if (!row) {

        return;

    }


    const qty =
        Number(
            row.querySelector(
                ".item-qty"
            )?.value
        ) || 0;


    const amount =
        Number(
            row.querySelector(
                ".item-amount"
            )?.value
        ) || 0;


    const total =
        qty * amount;


    const totalInput =
        row.querySelector(
            ".item-total"
        );


    if (totalInput) {

        totalInput.value =
            formatMoney(total);

    }


    calculateSOTotals();

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

        const qty =
            Number(
                row.querySelector(
                    ".item-qty"
                )?.value
            ) || 0;


        const amount =
            Number(
                row.querySelector(
                    ".item-amount"
                )?.value
            ) || 0;


        const total =
            qty * amount;


        subtotal += total;


        const totalInput =
            row.querySelector(
                ".item-total"
            );


        if (totalInput) {

            totalInput.value =
                formatMoney(total);

        }

    });


    const discount =
        Number(
            document.getElementById(
                "soDiscount"
            )?.value
        ) || 0;


    const vatable =
        Boolean(
            document.getElementById(
                "soVatable"
            )?.checked
        );


    const taxable =
        Math.max(
            0,
            subtotal - discount
        );


    const vat =
        vatable
            ? taxable * VAT_RATE
            : 0;


    const grandTotal =
        taxable + vat;


    setText(
        "soSubtotal",
        formatMoney(subtotal)
    );


    setText(
        "soVAT",
        formatMoney(vat)
    );


    setText(
        "soGrandTotal",
        formatMoney(grandTotal)
    );

}


/* =====================================================
   UNIT CHANGE
===================================================== */

function handleUnitChange(select) {

    const row =
        select.closest("tr");


    if (!row) {

        return;

    }


    const custom =
        row.querySelector(
            ".custom-unit-input"
        );


    if (!custom) {

        return;

    }


    if (
        select.value ===
        "custom"
    ) {

        custom.style.display =
            "block";

    } else {

        custom.style.display =
            "none";

        custom.value =
            "";

    }

}


/* =====================================================
   DELETE ITEM
===================================================== */

function deleteSOItem(button) {

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


    soItemCount =
        rows.length;


    rows.forEach(
        function (row, index) {

            const number =
                row.querySelector(
                    ".item-number"
                );


            if (number) {

                number.textContent =
                    index + 1;

            }

        }
    );

}


/* =====================================================
   FILE UPLOAD
===================================================== */

function setupFileUpload() {

    const input =
        document.getElementById(
            "soFileInput"
        );


    if (!input) {

        console.log(
            "SO File input not found."
        );

        return;

    }


    input.addEventListener(
        "change",
        function () {

            handleSOFileSelect(
                this.files
            );

            this.value = "";

        }
    );


    renderSOFiles();

}


/* =====================================================
   HANDLE FILE SELECT
===================================================== */

function handleSOFileSelect(files) {

    if (!files) {

        return;

    }


    Array.from(files).forEach(
        function (file) {

            const isPDF =
                file.type ===
                    "application/pdf" ||
                file.name
                    .toLowerCase()
                    .endsWith(".pdf");


            if (!isPDF) {

                alert(
                    file.name +
                    " is not a PDF file."
                );

                return;

            }


            const duplicate =
                soCreateFiles.some(
                    function (existing) {

                        return (
                            existing.name ===
                            file.name &&
                            existing.size ===
                            file.size
                        );

                    }
                );


            if (duplicate) {

                return;

            }


            soCreateFiles.push(file);

        }
    );


    renderSOFiles();

}


/* =====================================================
   RENDER FILES
===================================================== */

function renderSOFiles() {

    const list =
        document.getElementById(
            "soFileList"
        );


    if (!list) {

        return;

    }


    list.innerHTML = "";


    if (
        soCreateFiles.length === 0
    ) {

        list.innerHTML = `

            <div class="no-files">
                No files selected.
            </div>

        `;

        return;

    }


    soCreateFiles.forEach(
        function (file, index) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "so-file-row";


            row.innerHTML = `

                <div>

                    <div class="so-file-name">
                        📄 ${escapeHTML(
                            file.name
                        )}
                    </div>

                    <div class="so-file-size">
                        ${formatFileSize(
                            file.size
                        )}
                    </div>

                </div>


                <button
                    type="button"
                    class="remove-file-btn"
                    onclick="removeSOFile(${index})">

                    REMOVE

                </button>

            `;


            list.appendChild(row);

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
   SAVE SALES ORDER
===================================================== */

async function saveSO() {

    const soNumber =
        getValue("soNumber");


    const dateCreation =
        getValue("soDate");


    const clientName =
        getValue("clientName");


    const attention =
        getValue("attention");


    const billingAddress =
        getValue("billingAddress");


    const deliveryAddress =
        getValue("deliveryAddress");


    const project =
        getValue("project");


    const tin =
        getValue("tinNumber");


    const poNumber =
        getValue("poNumber");


    const terms =
        getValue("terms");


    const se =
        getValue("soSE");


    const jobOrder =
        getValue("jobOrder");


    const discount =
        Number(
            document.getElementById(
                "soDiscount"
            )?.value
        ) || 0;


    const vatable =
        Boolean(
            document.getElementById(
                "soVatable"
            )?.checked
        );


    /* VALIDATION */

    if (!soNumber) {

        alert(
            "SO Number is required."
        );

        return;

    }


    if (!clientName) {

        alert(
            "Client Name is required."
        );

        return;

    }


    if (!se) {

        alert(
            "Please select SE."
        );

        return;

    }


    const rows =
        document.querySelectorAll(
            "#soItemsBody tr"
        );


    if (!rows.length) {

        alert(
            "Please add at least one item."
        );

        return;

    }


    const items = [];


    rows.forEach(function (row) {

        let unit =
            row.querySelector(
                ".item-unit"
            )?.value || "";


        const custom =
            row.querySelector(
                ".custom-unit-input"
            );


        if (
            unit === "custom" &&
            custom
        ) {

            unit =
                custom.value.trim();

        }


        const qty =
            Number(
                row.querySelector(
                    ".item-qty"
                )?.value
            ) || 0;


        const amount =
            Number(
                row.querySelector(
                    ".item-amount"
                )?.value
            ) || 0;


        items.push({

            name:
                row.querySelector(
                    ".item-name"
                )?.value.trim() || "",

            description:
                row.querySelector(
                    ".item-description"
                )?.value.trim() || "",

            qty: qty,

            unit: unit,

            amount: amount,

            total:
                qty * amount

        });

    });


    const subtotal =
        items.reduce(
            function (sum, item) {

                return sum +
                    item.total;

            },
            0
        );


    const taxable =
        Math.max(
            0,
            subtotal - discount
        );


    const vatAmount =
        vatable
            ? taxable * VAT_RATE
            : 0;


    const grandTotal =
        taxable + vatAmount;


    /* CHECK DUPLICATE SO */

    let salesOrders = [];

    try {

        salesOrders =
            JSON.parse(
                localStorage.getItem(
                    "salesOrders"
                )
            ) || [];

    } catch (error) {

        salesOrders = [];

    }


    const duplicate =
        salesOrders.some(
            function (so) {

                return (
                    so.soNumber ===
                    soNumber
                );

            }
        );


    if (duplicate) {

        alert(
            "Sales Order Number already exists."
        );

        return;

    }


    /* CREATE SO */

    const newSO = {

        soNumber:
            soNumber,

        dateCreation:
            dateCreation,

        clientName:
            clientName,

        attention:
            attention,

        billingAddress:
            billingAddress,

        deliveryAddress:
            deliveryAddress,

        project:
            project,

        tin:
            tin,

        poNumber:
            poNumber,

        terms:
            terms,

        se:
            se,

        jobOrder:
            jobOrder,

        status:
            "ACTIVE",

        items:
            items,

        subtotal:
            subtotal,

        discount:
            discount,

        vatable:
            vatable,

        vatRate:
            VAT_RATE,

        vatAmount:
            vatAmount,

        grandTotal:
            grandTotal

    };


    salesOrders.push(newSO);


    localStorage.setItem(
        "salesOrders",
        JSON.stringify(
            salesOrders
        )
    );


    /* SAVE FILES */

    if (
        soCreateFiles.length > 0 &&
        typeof saveSOFileToDB ===
            "function"
    ) {

        for (
            const file of soCreateFiles
        ) {

            try {

                await saveSOFileToDB(
                    soNumber,
                    file
                );

            } catch (error) {

                console.error(
                    "File save error:",
                    error
                );

            }

        }

    }


    alert(
        "Sales Order saved successfully!\n\n" +
        "SO: " +
        soNumber +
        "\nGrand Total: " +
        formatMoney(
            grandTotal
        )
    );


    window.location.href =
        "../index.html";

}


/* =====================================================
   CANCEL / BACK
===================================================== */

function closeCreateSO() {

    const rows =
        document.querySelectorAll(
            "#soItemsBody tr"
        );


    const client =
        getValue(
            "clientName"
        );


    const hasData =
        client ||
        rows.length > 0 ||
        soCreateFiles.length > 0;


    if (hasData) {

        const confirmClose =
            confirm(
                "Discard unsaved Sales Order data?"
            );


        if (!confirmClose) {

            return;

        }

    }


    window.location.href =
        "../index.html";

}


/* =====================================================
   UTILITIES
===================================================== */

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {

        return "";

    }


    return String(
        element.value || ""
    ).trim();

}


function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


function formatMoney(value) {

    const number =
        Number(value) || 0;


    return "₱" +
        number.toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


function formatFileSize(bytes) {

    if (!bytes) {

        return "0 Bytes";

    }


    const units = [
        "Bytes",
        "KB",
        "MB",
        "GB"
    ];


    const index =
        Math.floor(
            Math.log(bytes) /
            Math.log(1024)
        );


    return (
        bytes /
        Math.pow(
            1024,
            index
        )
    ).toFixed(2) +
    " " +
    units[index];

}


function escapeHTML(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}
