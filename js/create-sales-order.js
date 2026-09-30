/* =====================================================
   LOGIS-TECH SYSTEM
   CREATE SALES ORDER
===================================================== */


/* =====================================================
   CONSTANTS
===================================================== */

const VAT_RATE = 0.12;

const SO_FILE_DB_NAME = "LOGISTECH_SO_FILES_DB";
const SO_FILE_STORE = "soFiles";
const SO_FILE_DB_VERSION = 1;


/* =====================================================
   PAGE STATE
===================================================== */

let soItemCount = 0;

let soCreateFiles = [];


/* =====================================================
   PAGE LOAD
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("LOGIS-TECH Create Sales Order Loaded");

    initializeCreateSO();

    setupFileUpload();

});


/* =====================================================
   INITIALIZE CREATE SO
===================================================== */

function initializeCreateSO() {

    setDefaultDate();

    generateSONumber();

    calculateSOTotals();

}


/* =====================================================
   DEFAULT DATE
===================================================== */

function setDefaultDate() {

    const dateInput =
        document.getElementById("soDate");


    if (!dateInput) {

        return;

    }


    if (dateInput.value) {

        return;

    }


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    dateInput.value =
        `${year}-${month}-${day}`;

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

        console.error(
            "Unable to read Sales Orders:",
            error
        );

        salesOrders = [];

    }


    let highestNumber = 0;


    salesOrders.forEach(function (so) {

        const soNumber =
            String(
                so?.soNumber || ""
            );


        const pattern =
            new RegExp(
                "^SO-" +
                year +
                "-(\\d+)$"
            );


        const match =
            soNumber.match(pattern);


        if (!match) {

            return;

        }


        const number =
            Number(match[1]) || 0;


        if (
            number >
            highestNumber
        ) {

            highestNumber =
                number;

        }

    });


    const nextNumber =
        String(
            highestNumber + 1
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
                placeholder="Item name"
            >

        </td>


        <td>

            <input
                type="text"
                class="item-description"
                placeholder="Description"
            >

        </td>


        <td>

            <input
                type="number"
                class="item-qty"
                min="0"
                step="0.01"
                value="1"
                oninput="calculateSOItemTotal(this)"
            >

        </td>


        <td>

            <select
                class="item-unit"
                onchange="handleUnitChange(this)"
            >

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
                style="display:none;"
            >

        </td>


        <td>

            <input
                type="number"
                class="item-amount"
                min="0"
                step="0.01"
                value="0"
                oninput="calculateSOItemTotal(this)"
            >

        </td>


        <td>

            <input
                type="text"
                class="item-total"
                value="₱0.00"
                readonly
            >

        </td>


        <td>

            <button
                type="button"
                class="delete-item"
                onclick="deleteSOItem(this)"
            >
                DELETE
            </button>

        </td>

    `;


    body.appendChild(row);


    calculateSOItemTotal(
        row.querySelector(
            ".item-qty"
        )
    );

}


/* =====================================================
   CALCULATE ITEM TOTAL
===================================================== */

function calculateSOItemTotal(input) {

    const row =
        input?.closest("tr");


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
        Math.max(
            0,
            Number(
                document.getElementById(
                    "soDiscount"
                )?.value
            ) || 0
        );


    const vatable =
        Boolean(
            document.getElementById(
                "soVatable"
            )?.checked
        );


    const taxableAmount =
        Math.max(
            0,
            subtotal - discount
        );


    const vatAmount =
        vatable
            ? taxableAmount * VAT_RATE
            : 0;


    const grandTotal =
        taxableAmount +
        vatAmount;


    setText(
        "soSubtotal",
        formatMoney(subtotal)
    );


    setText(
        "soVAT",
        formatMoney(vatAmount)
    );


    setText(
        "soGrandTotal",
        formatMoney(grandTotal)
    );


    return {

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

}


/* =====================================================
   UNIT CHANGE
===================================================== */

function handleUnitChange(select) {

    const row =
        select?.closest("tr");


    if (!row) {

        return;

    }


    const customInput =
        row.querySelector(
            ".custom-unit-input"
        );


    if (!customInput) {

        return;

    }


    if (
        select.value ===
        "custom"
    ) {

        customInput.style.display =
            "block";

        customInput.focus();

    } else {

        customInput.style.display =
            "none";

        customInput.value =
            "";

    }

}


/* =====================================================
   DELETE ITEM
===================================================== */

function deleteSOItem(button) {

    const row =
        button?.closest("tr");


    if (!row) {

        return;

    }


    row.remove();


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

            const numberCell =
                row.querySelector(
                    ".item-number"
                );


            if (numberCell) {

                numberCell.textContent =
                    index + 1;

            }

        }
    );

}


/* =====================================================
   FILE UPLOAD SETUP
===================================================== */

function setupFileUpload() {

    const input =
        document.getElementById(
            "soFileInput"
        );


    if (!input) {

        console.warn(
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


            /*
                Reset input so the same
                PDF can be selected again
                after removing it.
            */

            this.value = "";

        }
    );


    renderSOFiles();

}


/* =====================================================
   HANDLE FILE SELECTION
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
                    `"${file.name}" is not a PDF file.`
                );

                return;

            }


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

                return;

            }


            soCreateFiles.push(file);

        }
    );


    renderSOFiles();

}


/* =====================================================
   RENDER SELECTED FILES
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
        soCreateFiles.length ===
        0
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
                    onclick="removeSOFile(${index})"
                >
                    REMOVE
                </button>

            `;


            list.appendChild(row);

        }
    );

}


/* =====================================================
   REMOVE SELECTED FILE
===================================================== */

function removeSOFile(index) {

    if (
        index < 0 ||
        index >= soCreateFiles.length
    ) {

        return;

    }


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

    const saveButton =
        document.querySelector(
            '.action-bar .btn-primary'
        );


    /*
        Prevent accidental double-click
        while saving.
    */

    if (saveButton) {

        saveButton.disabled = true;

    }


    try {

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
            Math.max(
                0,
                Number(
                    document.getElementById(
                        "soDiscount"
                    )?.value
                ) || 0
            );


        const vatable =
            Boolean(
                document.getElementById(
                    "soVatable"
                )?.checked
            );


        /* =================================================
           VALIDATION
        ================================================= */


        if (!soNumber) {

            alert(
                "SO Number is required."
            );

            return;

        }


        if (!dateCreation) {

            alert(
                "Date Creation is required."
            );

            return;

        }


        if (!clientName) {

            alert(
                "Client Name is required."
            );

            document
                .getElementById(
                    "clientName"
                )
                ?.focus();

            return;

        }


        if (!se) {

            alert(
                "Please select SE."
            );

            document
                .getElementById(
                    "soSE"
                )
                ?.focus();

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


        /* =================================================
           COLLECT ITEMS
        ================================================= */


        const items = [];


        for (
            let index = 0;
            index < rows.length;
            index++
        ) {

            const row =
                rows[index];


            const name =
                row.querySelector(
                    ".item-name"
                )?.value.trim() || "";


            const description =
                row.querySelector(
                    ".item-description"
                )?.value.trim() || "";


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


            const unitSelect =
                row.querySelector(
                    ".item-unit"
                );


            const customUnit =
                row.querySelector(
                    ".custom-unit-input"
                );


            let unit =
                unitSelect?.value || "";


            if (
                unit === "custom"
            ) {

                unit =
                    customUnit
                        ?.value
                        .trim() || "";

            }


            /* ITEM VALIDATION */


            if (!name) {

                alert(
                    `Please enter Item Name for item #${index + 1}.`
                );

                row.querySelector(
                    ".item-name"
                )?.focus();

                return;

            }


            if (
                !unit
            ) {

                alert(
                    `Please enter/select Unit for item #${index + 1}.`
                );

                return;

            }


            if (
                qty <= 0
            ) {

                alert(
                    `Quantity must be greater than 0 for item #${index + 1}.`
                );

                row.querySelector(
                    ".item-qty"
                )?.focus();

                return;

            }


            if (
                amount < 0
            ) {

                alert(
                    `Amount cannot be negative for item #${index + 1}.`
                );

                row.querySelector(
                    ".item-amount"
                )?.focus();

                return;

            }


            items.push({

                itemNumber:
                    index + 1,

                name:
                    name,

                description:
                    description,

                qty:
                    qty,

                unit:
                    unit,

                amount:
                    amount,

                total:
                    qty * amount

            });

        }


        /* =================================================
           CALCULATE FINAL TOTALS
        ================================================= */


        const subtotal =
            items.reduce(
                function (sum, item) {

                    return (
                        sum +
                        item.total
                    );

                },
                0
            );


        const taxableAmount =
            Math.max(
                0,
                subtotal - discount
            );


        const vatAmount =
            vatable
                ? taxableAmount * VAT_RATE
                : 0;


        const grandTotal =
            taxableAmount +
            vatAmount;


        /* =================================================
           GET EXISTING SALES ORDERS
        ================================================= */


        let salesOrders = [];


        try {

            salesOrders =
                JSON.parse(
                    localStorage.getItem(
                        "salesOrders"
                    )
                ) || [];


            if (
                !Array.isArray(
                    salesOrders
                )
            ) {

                salesOrders = [];

            }

        } catch (error) {

            console.error(
                "Unable to read Sales Orders:",
                error
            );

            salesOrders = [];

        }


        /* =================================================
           DUPLICATE SO CHECK
        ================================================= */


        const duplicate =
            salesOrders.some(
                function (so) {

                    return (
                        String(
                            so?.soNumber || ""
                        ) ===
                        soNumber
                    );

                }
            );


        if (duplicate) {

            alert(
                "Sales Order Number already exists."
            );

            generateSONumber();

            return;

        }


        /* =================================================
           CREATE SALES ORDER OBJECT
        ================================================= */


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
                grandTotal,

            createdAt:
                new Date().toISOString()

        };


        /* =================================================
           SAVE SO TO LOCAL STORAGE
        ================================================= */


        salesOrders.push(
            newSO
        );


        localStorage.setItem(
            "salesOrders",
            JSON.stringify(
                salesOrders
            )
        );


        /* =================================================
           SAVE PDF FILES TO INDEXED DB
        ================================================= */


        let fileSaveError =
            false;


        for (
            const file of soCreateFiles
        ) {

            try {

                await saveSOFileToDB(
                    soNumber,
                    file
                );

            } catch (error) {

                fileSaveError =
                    true;

                console.error(
                    "SO file save error:",
                    error
                );

            }

        }


        /* =================================================
           SUCCESS MESSAGE
        ================================================= */


        let message =
            "Sales Order saved successfully!\n\n" +
            "SO: " +
            soNumber +
            "\n" +
            "Grand Total: " +
            formatMoney(
                grandTotal
            );


        if (
            soCreateFiles.length > 0
        ) {

            if (fileSaveError) {

                message +=
                    "\n\nSome PDF files could not be saved.";

            } else {

                message +=
                    "\n" +
                    "PDF Files: " +
                    soCreateFiles.length;

            }

        }


        alert(message);


        /* =================================================
           RETURN TO MAIN SYSTEM
        ================================================= */


        window.location.href =
            "../index.html";


    } catch (error) {

        console.error(
            "Save Sales Order Error:",
            error
        );


        alert(
            "An error occurred while saving the Sales Order.\n\n" +
            "Please check the browser console."
        );

    } finally {

        if (saveButton) {

            saveButton.disabled =
                false;

        }

    }

}


/* =====================================================
   CANCEL / BACK
===================================================== */

function closeCreateSO() {

    const rows =
        document.querySelectorAll(
            "#soItemsBody tr"
        );


    const clientName =
        getValue(
            "clientName"
        );


    const attention =
        getValue(
            "attention"
        );


    const billingAddress =
        getValue(
            "billingAddress"
        );


    const deliveryAddress =
        getValue(
            "deliveryAddress"
        );


    const project =
        getValue(
            "project"
        );


    const poNumber =
        getValue(
            "poNumber"
        );


    const jobOrder =
        getValue(
            "jobOrder"
        );


    const hasData =
        Boolean(
            clientName ||
            attention ||
            billingAddress ||
            deliveryAddress ||
            project ||
            poNumber ||
            jobOrder ||
            rows.length > 0 ||
            soCreateFiles.length > 0
        );


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
   INDEXED DB
   ===================================================== */

function openSOFileDB() {

    return new Promise(
        function (resolve, reject) {

            const request =
                indexedDB.open(
                    SO_FILE_DB_NAME,
                    SO_FILE_DB_VERSION
                );


            request.onupgradeneeded =
                function (event) {

                    const db =
                        event.target.result;


                    if (
                        !db.objectStoreNames.contains(
                            SO_FILE_STORE
                        )
                    ) {

                        const store =
                            db.createObjectStore(
                                SO_FILE_STORE,
                                {
                                    keyPath:
                                        "id",
                                    autoIncrement:
                                        true
                                }
                            );


                        store.createIndex(
                            "soNumber",
                            "soNumber",
                            {
                                unique:
                                    false
                            }
                        );

                    }

                };


            request.onsuccess =
                function () {

                    resolve(
                        request.result
                    );

                };


            request.onerror =
                function () {

                    reject(
                        request.error
                    );

                };

        }
    );

}


/* =====================================================
   SAVE PDF TO INDEXED DB
===================================================== */

function saveSOFileToDB(
    soNumber,
    file
) {

    return new Promise(
        async function (resolve, reject) {

            try {

                const db =
                    await openSOFileDB();


                const transaction =
                    db.transaction(
                        SO_FILE_STORE,
                        "readwrite"
                    );


                const store =
                    transaction.objectStore(
                        SO_FILE_STORE
                    );


                const fileRecord = {

                    soNumber:
                        soNumber,

                    fileName:
                        file.name,

                    fileType:
                        file.type ||
                        "application/pdf",

                    fileSize:
                        file.size,

                    file:
                        file,

                    uploadedAt:
                        new Date().toISOString()

                };


                const request =
                    store.add(
                        fileRecord
                    );


                request.onsuccess =
                    function () {

                        resolve(
                            request.result
                        );

                    };


                request.onerror =
                    function () {

                        reject(
                            request.error
                        );

                    };


                transaction.onerror =
                    function () {

                        reject(
                            transaction.error
                        );

                    };

            } catch (error) {

                reject(error);

            }

        }
    );

}


/* =====================================================
   UTILITY - GET VALUE
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


/* =====================================================
   UTILITY - SET TEXT
===================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* =====================================================
   UTILITY - FORMAT MONEY
===================================================== */

function formatMoney(value) {

    const number =
        Number(value) || 0;


    return (
        "₱" +
        number.toLocaleString(
            "en-PH",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        )
    );

}


/* =====================================================
   UTILITY - FORMAT FILE SIZE
===================================================== */

function formatFileSize(bytes) {

    if (
        !bytes ||
        bytes <= 0
    ) {

        return "0 Bytes";

    }


    const units = [

        "Bytes",
        "KB",
        "MB",
        "GB"

    ];


    const index =
        Math.min(
            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            ),
            units.length - 1
        );


    return (
        (
            bytes /
            Math.pow(
                1024,
                index
            )
        ).toFixed(2) +
        " " +
        units[index]
    );

}


/* =====================================================
   UTILITY - ESCAPE HTML
===================================================== */

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
