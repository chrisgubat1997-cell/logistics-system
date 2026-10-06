/* =========================================================
   LOGIS-TECH SYSTEM
   CREATE SALES ORDER
   GOOGLE APPS SCRIPT API
   VERSION: 20261006-04
========================================================= */


/* =========================================================
   API CONFIG
========================================================= */

const CREATE_SO_API_URL =
    "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

const VAT_RATE = 0.12;

let soItemCount = 0;

let soCreateFiles = [];

let isSavingSO = false;


/* =========================================================
   API REQUEST
========================================================= */

async function createSOAPI(action, data = {}) {

    try {

        console.log(
            "================================="
        );

        console.log(
            "CREATE SO API REQUEST"
        );

        console.log(
            "ACTION:",
            action
        );

        console.log(
            "DATA:",
            data
        );

        console.log(
            "================================="
        );


        const response =
            await fetch(
                CREATE_SO_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body: JSON.stringify({

                        action:
                            action,

                        data:
                            data

                    })
                }
            );


        const responseText =
            await response.text();


        console.log(
            "CREATE SO API STATUS:",
            response.status
        );

        console.log(
            "CREATE SO API RESPONSE:",
            responseText
        );


        if (!response.ok) {

            throw new Error(
                "API request failed: " +
                response.status
            );

        }


        let result;


        try {

            result =
                JSON.parse(
                    responseText
                );

        } catch (jsonError) {

            console.error(
                "INVALID JSON RESPONSE:",
                responseText
            );

            throw new Error(
                "Invalid response from LOGIS-TECH API."
            );

        }


        return result;


    } catch (error) {

        console.error(
            "CREATE SO API ERROR:",
            error
        );


        alert(
            "Hindi makakonekta sa LOGIS-TECH database.\n\n" +
            "Check ang Google Apps Script Web App URL."
        );


        return {

            success:
                false,

            message:
                error.message,

            error:
                error.message

        };

    }

}


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "================================="
        );

        console.log(
            "LOGIS-TECH CREATE SALES ORDER"
        );

        console.log(
            "VERSION: 20261006-04"
        );

        console.log(
            "================================="
        );


        initializeCreateSO();

    }
);


/* =========================================================
   INITIALIZE CREATE SO
========================================================= */

function initializeCreateSO() {

    setCreateSODate();

    generateSONumber();

    setupCreateSOFileSection();

    calculateSOTotals();

}


/* =========================================================
   SET DATE
========================================================= */

function setCreateSODate() {

    const input =
        document.getElementById(
            "soDate"
        );


    if (!input) {

        return;

    }


    if (!input.value) {

        const now =
            new Date();


        const year =
            now.getFullYear();


        const month =
            String(
                now.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                now.getDate()
            ).padStart(
                2,
                "0"
            );


        input.value =
            `${year}-${month}-${day}`;

    }

}


/* =========================================================
   GENERATE SO NUMBER
========================================================= */

function generateSONumber() {

    const input =
        document.getElementById(
            "soNumber"
        );


    if (!input) {

        return;

    }


    generateNextSONumber();

}


/* =========================================================
   GENERATE NEXT SO NUMBER
========================================================= */

async function generateNextSONumber() {

    const input =
        document.getElementById(
            "soNumber"
        );


    if (!input) {

        return;

    }


    input.value =
        "Generating...";


    const result =
        await createSOAPI(
            "getSalesOrders"
        );


    if (
        !result ||
        !result.success
    ) {

        console.warn(
            "Unable to load existing Sales Orders."
        );


        input.value =
            "";


        return;

    }


    const orders =
        Array.isArray(
            result.salesOrders
        )
            ? result.salesOrders
            : (
                Array.isArray(
                    result.data
                )
                    ? result.data
                    : []
            );


    const year =
        new Date()
            .getFullYear();


    let highestNumber =
        0;


    orders.forEach(
        function(so) {

            /*
             * Supports both:
             *
             * SO_NUMBER
             *
             * and
             *
             * soNumber
             */

            const number =
                String(

                    so.SO_NUMBER ||

                    so.soNumber ||

                    so.SALES_ORDER_NUMBER ||

                    so.salesOrderNumber ||

                    ""

                ).trim();


            const pattern =
                new RegExp(
                    "^SO-" +
                    year +
                    "-(\\d+)$"
                );


            const match =
                number.match(
                    pattern
                );


            if (!match) {

                return;

            }


            const value =
                Number(
                    match[1]
                );


            if (
                Number.isFinite(value) &&
                value > highestNumber
            ) {

                highestNumber =
                    value;

            }

        }
    );


    const nextNumber =
        highestNumber + 1;


    const generatedNumber =
        "SO-" +
        year +
        "-" +
        String(
            nextNumber
        ).padStart(
            4,
            "0"
        );


    input.value =
        generatedNumber;


    console.log(
        "NEXT SO NUMBER:",
        generatedNumber
    );

}


/* =========================================================
   ADD SO ITEM
========================================================= */

function addSOItem() {

    const tbody =
        document.getElementById(
            "soItemsBody"
        );


    if (!tbody) {

        return;

    }


    soItemCount++;


    const row =
        document.createElement(
            "tr"
        );


    row.dataset.itemNumber =
        soItemCount;


    row.innerHTML = `

        <td class="item-number">
            ${soItemCount}
        </td>

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
                oninput="calculateSOItemTotal(this)"
            >
        </td>

        <td>
            <input
                type="text"
                class="so-item-unit"
                placeholder="Unit"
            >
        </td>

        <td>
            <input
                type="number"
                class="so-item-amount"
                value="0"
                min="0"
                step="0.01"
                oninput="calculateSOItemTotal(this)"
            >
        </td>

        <td class="so-item-total">
            0.00
        </td>

        <td>
            <button
                type="button"
                onclick="deleteSOItem(this)"
            >
                DELETE
            </button>
        </td>

    `;


    tbody.appendChild(
        row
    );


    calculateSOTotals();

}


/* =========================================================
   CALCULATE ITEM TOTAL
========================================================= */

function calculateSOItemTotal(input) {

    const row =
        input.closest("tr");


    if (!row) {

        return;

    }


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
        Number(
            qtyInput
                ? qtyInput.value
                : 0
        );


    const amount =
        Number(
            amountInput
                ? amountInput.value
                : 0
        );


    const total =
        qty * amount;


    if (totalCell) {

        totalCell.textContent =
            formatMoney(
                total
            );

    }


    calculateSOTotals();

}


/* =========================================================
   HANDLE UNIT CHANGE
========================================================= */

function handleUnitChange() {

    calculateSOTotals();

}


/* =========================================================
   DELETE SO ITEM
========================================================= */

function deleteSOItem(button) {

    const row =
        button.closest("tr");


    if (row) {

        row.remove();

    }


    renumberSOItems();

    calculateSOTotals();

}


/* =========================================================
   RENUMBER SO ITEMS
========================================================= */

function renumberSOItems() {

    const tbody =
        document.getElementById(
            "soItemsBody"
        );


    if (!tbody) {

        return;

    }


    const rows =
        tbody.querySelectorAll(
            "tr"
        );


    rows.forEach(
        function(row, index) {

            const numberCell =
                row.querySelector(
                    ".item-number"
                );


            if (numberCell) {

                numberCell.textContent =
                    index + 1;

            }


            row.dataset.itemNumber =
                index + 1;

        }
    );


    soItemCount =
        rows.length;

}


/* =========================================================
   CALCULATE SO TOTALS
========================================================= */

function calculateSOTotals() {

    const tbody =
        document.getElementById(
            "soItemsBody"
        );


    let subtotal =
        0;


    if (tbody) {

        const rows =
            tbody.querySelectorAll(
                "tr"
            );


        rows.forEach(
            function(row) {

                const qtyInput =
                    row.querySelector(
                        ".so-item-qty"
                    );


                const amountInput =
                    row.querySelector(
                        ".so-item-amount"
                    );


                if (
                    !qtyInput ||
                    !amountInput
                ) {

                    return;

                }


                const qty =
                    Number(
                        qtyInput.value ||
                        0
                    );


                const amount =
                    Number(
                        amountInput.value ||
                        0
                    );


                subtotal +=
                    qty * amount;

            }
        );

    }


    const discountInput =
        document.getElementById(
            "soDiscount"
        );


    const discount =
        Number(
            discountInput
                ? discountInput.value
                : 0
        );


    const vatable =
        Math.max(
            0,
            subtotal - discount
        );


    const vatAmount =
        vatable * VAT_RATE;


    const grandTotal =
        vatable + vatAmount;


    setText(
        "soSubtotal",
        formatMoney(
            subtotal
        )
    );


    /*
     * Do not overwrite the input
     * value if soDiscount is an input.
     */

    const discountDisplay =
        document.getElementById(
            "soDiscountDisplay"
        );


    if (discountDisplay) {

        discountDisplay.textContent =
            formatMoney(
                discount
            );

    }


    setText(
        "soVatable",
        formatMoney(
            vatable
        )
    );


    setText(
        "soVAT",
        formatMoney(
            vatAmount
        )
    );


    setText(
        "soGrandTotal",
        formatMoney(
            grandTotal
        )
    );

}


/* =========================================================
   COLLECT ITEMS
========================================================= */

function collectSOItems() {

    const tbody =
        document.getElementById(
            "soItemsBody"
        );


    if (!tbody) {

        return [];

    }


    const rows =
        tbody.querySelectorAll(
            "tr"
        );


    const items =
        [];


    rows.forEach(
        function(row, index) {

            const itemNameInput =
                row.querySelector(
                    ".so-item-name"
                );


            const descriptionInput =
                row.querySelector(
                    ".so-item-description"
                );


            const qtyInput =
                row.querySelector(
                    ".so-item-qty"
                );


            const unitInput =
                row.querySelector(
                    ".so-item-unit"
                );


            const amountInput =
                row.querySelector(
                    ".so-item-amount"
                );


            const itemName =
                itemNameInput
                    ? itemNameInput.value.trim()
                    : "";


            const description =
                descriptionInput
                    ? descriptionInput.value.trim()
                    : "";


            const qty =
                Number(
                    qtyInput
                        ? qtyInput.value
                        : 0
                );


            const unit =
                unitInput
                    ? unitInput.value.trim()
                    : "";


            const amount =
                Number(
                    amountInput
                        ? amountInput.value
                        : 0
                );


            const total =
                qty * amount;


            items.push({

                itemNumber:
                    index + 1,

                itemName:
                    itemName,

                description:
                    description,

                qty:
                    qty,

                unit:
                    unit,

                amount:
                    amount,

                total:
                    total

            });

        }
    );


    return items;

}


/* =========================================================
   SAVE SALES ORDER
========================================================= */

async function saveSO() {

    console.log(
        "================================="
    );

    console.log(
        "SAVE SO FUNCTION VERSION:"
    );

    console.log(
        "20261006-04"
    );

    console.log(
        "================================="
    );


    if (isSavingSO) {

        console.warn(
            "SAVE SO already in progress."
        );

        return;

    }


    isSavingSO =
        true;


    /* ==========================================
       GET FORM VALUES
    ========================================== */

    const soNumber =
        getValue(
            "soNumber"
        );


    const dateCreation =
        getValue(
            "soDate"
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


    const tin =
        getValue(
            "tinNumber"
        );


    const poNumber =
        getValue(
            "poNumber"
        );


    const terms =
        getValue(
            "terms"
        );


    const se =
        getValue(
            "soSE"
        );


    const jobOrder =
        getValue(
            "jobOrder"
        );


    /* ==========================================
       SO NUMBER VALIDATION
    ========================================== */

    if (
        !soNumber ||
        soNumber === "Generating..."
    ) {

        alert(
            "SO Number is required.\n\n" +
            "Please wait for the SO Number to finish generating."
        );


        isSavingSO =
            false;


        focusElement(
            "soNumber"
        );


        return;

    }


    /* ==========================================
       CLIENT VALIDATION
    ========================================== */

    if (!clientName) {

        alert(
            "Please enter Client Name."
        );


        isSavingSO =
            false;


        focusElement(
            "clientName"
        );


        return;

    }


    /* ==========================================
       ITEMS
    ========================================== */

    const items =
        collectSOItems();


    if (
        items.length === 0
    ) {

        alert(
            "Please add at least one item."
        );


        isSavingSO =
            false;


        return;

    }


    for (
        let i = 0;
        i < items.length;
        i++
    ) {

        if (
            !items[i].itemName
        ) {

            alert(
                "Please enter Item Name on item #" +
                (i + 1)
            );


            isSavingSO =
                false;


            return;

        }


        if (
            Number(
                items[i].qty
            ) <= 0
        ) {

            alert(
                "Quantity must be greater than 0 on item #" +
                (i + 1)
            );


            isSavingSO =
                false;


            return;

        }


        if (
            Number(
                items[i].amount
            ) < 0
        ) {

            alert(
                "Amount cannot be negative on item #" +
                (i + 1)
            );


            isSavingSO =
                false;


            return;

        }

    }


    /* ==========================================
       TOTALS
    ========================================== */

    let subtotal =
        0;


    items.forEach(
        function(item) {

            subtotal +=
                Number(
                    item.total ||
                    0
                );

        }
    );


    const discount =
        Number(
            getInputValue(
                "soDiscount"
            )
        );


    if (
        discount < 0
    ) {

        alert(
            "Discount cannot be negative."
        );


        isSavingSO =
            false;


        return;

    }


    if (
        discount > subtotal
    ) {

        alert(
            "Discount cannot be greater than subtotal."
        );


        isSavingSO =
            false;


        return;

    }


    const vatable =
        subtotal -
        discount;


    const vatAmount =
        vatable *
        VAT_RATE;


    const grandTotal =
        vatable +
        vatAmount;


    /* ==========================================
       BUTTON STATE
    ========================================== */

    const saveButton =
        document.querySelector(
            '[onclick="saveSO()"]'
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "SAVING...";

    }


    /* ==========================================
       API DATA
    ========================================== */

    const data = {

        /*
         * IMPORTANT
         *
         * Current API requires SO Number.
         * Therefore we explicitly send it.
         */

        soNumber:
            soNumber,


        dateCreation:
            dateCreation,


        clientName:
            clientName,


        billingAddress:
            billingAddress,


        attention:
            attention,


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


        jobOrder:
            jobOrder,


        se:
            se,


        salesEngineer:
            se,


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


        createdBy:
            getCurrentUser(),


        items:
            items

    };


    console.log(
        "================================="
    );

    console.log(
        "CREATING SALES ORDER"
    );

    console.log(
        "SO NUMBER BEING SENT:",
        soNumber
    );

    console.log(
        "CLIENT:",
        clientName
    );

    console.log(
        "ITEM COUNT:",
        items.length
    );

    console.log(
        "GRAND TOTAL:",
        grandTotal
    );

    console.log(
        "FULL DATA:",
        data
    );

    console.log(
        "================================="
    );


    /* ==========================================
       CREATE SALES ORDER
    ========================================== */

    const result =
        await createSOAPI(
            "createSalesOrder",
            data
        );


    /* ==========================================
       RESTORE BUTTON
    ========================================== */

    if (saveButton) {

        saveButton.disabled =
            false;

        saveButton.textContent =
            "SAVE";

    }


    /* ==========================================
       API ERROR
    ========================================== */

    if (
        !result ||
        !result.success
    ) {

        console.error(
            "CREATE SALES ORDER FAILED:",
            result
        );


        alert(
            result &&
            (
                result.message ||
                result.error
            )
                ? (
                    result.message ||
                    result.error
                )
                : "Failed to save Sales Order."
        );


        isSavingSO =
            false;


        return;

    }


    /* ==========================================
       GET BACKEND RESPONSE
    ========================================== */

    const createdSO =
        result.data ||
        {};


    const finalSOId =
        result.soId ||
        createdSO.soId ||
        createdSO.SO_ID ||
        "";


    const finalSONumber =
        result.soNumber ||
        createdSO.soNumber ||
        createdSO.SO_NUMBER ||
        soNumber;


    const finalFolderId =
        result.folderId ||
        createdSO.folderId ||
        "";


    const finalFolderUrl =
        result.folderUrl ||
        createdSO.folderUrl ||
        "";


    console.log(
        "================================="
    );

    console.log(
        "SALES ORDER CREATED SUCCESSFULLY"
    );

    console.log(
        "SO NUMBER:",
        finalSONumber
    );

    console.log(
        "SO ID:",
        finalSOId
    );

    console.log(
        "FOLDER ID:",
        finalFolderId
    );

    console.log(
        "FOLDER URL:",
        finalFolderUrl
    );

    console.log(
        "================================="
    );


    /* ==========================================
       VALIDATE RESPONSE
    ========================================== */

    if (!finalSONumber) {

        alert(
            "Sales Order was created, but no SO Number was returned."
        );


        isSavingSO =
            false;


        return;

    }


    /* ==========================================
       UPLOAD SELECTED FILES
    ========================================== */

    let uploadErrors =
        [];


    if (
        soCreateFiles.length > 0
    ) {

        console.log(
            "FILES TO UPLOAD:",
            soCreateFiles
        );


        for (
            let i = 0;
            i < soCreateFiles.length;
            i++
        ) {

            const file =
                soCreateFiles[i];


            try {

                console.log(
                    "START UPLOAD:",
                    file.name
                );


                const base64Data =
                    await fileToBase64(
                        file
                    );


                const uploadData = {

                    soNumber:
                        finalSONumber,

                    soId:
                        finalSOId,

                    fileName:
                        file.name,

                    mimeType:
                        file.type ||
                        "application/pdf",

                    /*
                     * Keep both names for
                     * backend compatibility.
                     */

                    base64:
                        base64Data,

                    base64Data:
                        base64Data,

                    uploadedBy:
                        getCurrentUser(),

                    dateCreation:
                        dateCreation

                };


                console.log(
                    "UPLOAD DATA:",
                    {

                        soNumber:
                            uploadData.soNumber,

                        soId:
                            uploadData.soId,

                        fileName:
                            uploadData.fileName,

                        mimeType:
                            uploadData.mimeType

                    }
                );


                const uploadResult =
                    await createSOAPI(
                        "uploadSOFile",
                        uploadData
                    );


                console.log(
                    "UPLOAD RESULT:",
                    uploadResult
                );


                if (
                    !uploadResult ||
                    !uploadResult.success
                ) {

                    uploadErrors.push(

                        file.name +
                        ": " +
                        (
                            uploadResult &&
                            (
                                uploadResult.message ||
                                uploadResult.error
                            )
                                ? (
                                    uploadResult.message ||
                                    uploadResult.error
                                )
                                : "Upload failed."
                        )

                    );

                }

            } catch (error) {

                console.error(
                    "FILE UPLOAD ERROR:",
                    file.name,
                    error
                );


                uploadErrors.push(

                    file.name +
                    ": " +
                    error.message

                );

            }

        }

    }


    /* ==========================================
       FINAL SUCCESS MESSAGE
    ========================================== */

    if (
        uploadErrors.length > 0
    ) {

        alert(

            "Sales Order " +
            finalSONumber +
            " was saved successfully, but some files failed to upload.\n\n" +
            uploadErrors.join("\n")

        );

    }

    else if (
        soCreateFiles.length > 0
    ) {

        alert(

            "Sales Order " +
            finalSONumber +
            " and " +
            soCreateFiles.length +
            " PDF file(s) were saved successfully."

        );

    }

    else {

        alert(

            "Sales Order " +
            finalSONumber +
            " saved successfully."

        );

    }


    /* ==========================================
       CLEAR FORM
    ========================================== */

    clearCreateSOForm();


    /* ==========================================
       RESET SAVING STATE
    ========================================== */

    isSavingSO =
        false;


    /* ==========================================
       RETURN TO MAIN SYSTEM
    ========================================== */

    window.location.href =
        "../index.html";

}


/* =========================================================
   GET CURRENT USER
========================================================= */

function getCurrentUser() {

    const possibleKeys = [

        "currentUser",

        "loggedInUser",

        "userAccount",

        "account",

        "LOGISTECH_USER"

    ];


    for (
        let i = 0;
        i < possibleKeys.length;
        i++
    ) {

        const key =
            possibleKeys[i];


        const value =
            localStorage.getItem(
                key
            );


        if (!value) {

            continue;

        }


        try {

            const parsed =
                JSON.parse(
                    value
                );


            if (
                parsed &&
                typeof parsed === "object"
            ) {

                return (

                    parsed.username ||

                    parsed.fullName ||

                    parsed.name ||

                    ""

                );

            }

        } catch (error) {

            return value;

        }

    }


    return "";

}


/* =========================================================
   CLEAR CREATE SO FORM
========================================================= */

function clearCreateSOForm() {

    const form =
        document.querySelector(
            "form"
        );


    if (form) {

        form.reset();

    }


    const tbody =
        document.getElementById(
            "soItemsBody"
        );


    if (tbody) {

        tbody.innerHTML =
            "";

    }


    soItemCount =
        0;


    soCreateFiles =
        [];


    renderCreateSOFiles();


    calculateSOTotals();


    /*
     * Generate a new preview number
     * after reset.
     */

    generateSONumber();

}


/* =========================================================
   CLOSE CREATE SO
========================================================= */

function closeCreateSO() {

    const confirmed =
        confirm(
            "Are you sure you want to leave? Unsaved changes will be lost."
        );


    if (!confirmed) {

        return;

    }


    window.location.href =
        "../index.html";

}


/* =========================================================
   FILE TO BASE64
========================================================= */

function fileToBase64(file) {

    return new Promise(
        function(resolve, reject) {

            if (!file) {

                reject(
                    new Error(
                        "No file selected."
                    )
                );

                return;

            }


            const reader =
                new FileReader();


            reader.onload =
                function(event) {

                    try {

                        const result =
                            event.target.result;


                        if (!result) {

                            reject(
                                new Error(
                                    "Failed to read file."
                                )
                            );

                            return;

                        }


                        const parts =
                            String(
                                result
                            ).split(",");


                        const base64Data =
                            parts.length > 1
                                ? parts[1]
                                : "";


                        if (!base64Data) {

                            reject(
                                new Error(
                                    "Failed to convert " +
                                    file.name +
                                    " to Base64."
                                )
                            );

                            return;

                        }


                        console.log(
                            "FILE CONVERTED TO BASE64:",
                            file.name,
                            "SIZE:",
                            file.size,
                            "BASE64 LENGTH:",
                            base64Data.length
                        );


                        resolve(
                            base64Data
                        );


                    } catch (error) {

                        reject(
                            error
                        );

                    }

                };


            reader.onerror =
                function() {

                    reject(
                        new Error(
                            "Unable to read file: " +
                            file.name
                        )
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/* =========================================================
   FILE SECTION
========================================================= */

function setupCreateSOFileSection() {

    const input =
        document.getElementById(
            "soFileInput"
        );


    if (!input) {

        return;

    }


    input.addEventListener(
        "change",
        function(event) {

            handleCreateSOFiles(
                event.target.files
            );

        }
    );

}


/* =========================================================
   SELECT CREATE SO FILES
========================================================= */

function selectCreateSOFiles() {

    const input =
        document.getElementById(
            "soFileInput"
        );


    if (input) {

        input.click();

    }

}


/* =========================================================
   HANDLE CREATE SO FILES
========================================================= */

function handleCreateSOFiles(files) {

    if (!files) {

        return;

    }


    Array.from(files)
        .forEach(
            function(file) {

                if (
                    file.type !==
                    "application/pdf"
                ) {

                    alert(
                        file.name +
                        " is not a PDF file."
                    );

                    return;

                }


                const exists =
                    soCreateFiles.some(
                        function(existing) {

                            return (

                                existing.name ===
                                file.name &&

                                existing.size ===
                                file.size

                            );

                        }
                    );


                if (!exists) {

                    soCreateFiles.push(
                        file
                    );

                }

            }
        );


    renderCreateSOFiles();

}


/* =========================================================
   RENDER CREATE SO FILES
========================================================= */

function renderCreateSOFiles() {

    const container =
        document.getElementById(
            "soFileList"
        );


    if (!container) {

        return;

    }


    container.innerHTML =
        "";


    if (
        soCreateFiles.length === 0
    ) {

        container.innerHTML =
            `
            <div class="no-files">
                No files selected.
            </div>
            `;

        return;

    }


    soCreateFiles.forEach(
        function(file, index) {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "so-file-row";


            row.innerHTML = `

                <span>
                    ${escapeHTML(file.name)}
                </span>

                <button
                    type="button"
                    onclick="removeCreateSOFile(${index})"
                >
                    REMOVE
                </button>

            `;


            container.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   REMOVE CREATE SO FILE
========================================================= */

function removeCreateSOFile(index) {

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


    renderCreateSOFiles();

}


/* =========================================================
   SET TEXT
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return;

    }


    element.textContent =
        value == null
            ? ""
            : value;

}


/* =========================================================
   GET VALUE
========================================================= */

function getValue(id) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return "";

    }


    return String(
        element.value ||
        ""
    ).trim();

}


/* =========================================================
   GET INPUT VALUE
========================================================= */

function getInputValue(id) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {

        return 0;

    }


    return Number(
        element.value ||
        0
    );

}


/* =========================================================
   FOCUS ELEMENT
========================================================= */

function focusElement(id) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.focus();

    }

}


/* =========================================================
   MONEY FORMAT
========================================================= */

function formatMoney(value) {

    const number =
        Number(
            value || 0
        );


    return number.toLocaleString(
        "en-PH",
        {
            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHTML(value) {

    return String(
        value == null
            ? ""
            : value
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
