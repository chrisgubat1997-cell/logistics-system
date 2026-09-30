/* =====================================================
   LOGIS-TECH SYSTEM
   SALES ORDER MODULE
===================================================== */


/* =====================================================
   GLOBAL STATE
===================================================== */

let selectedSO = null;
let detailEditMode = false;

const VAT_RATE = 0.12;


/* =====================================================
   FILE MANAGEMENT
   INDEXEDDB
===================================================== */

const SO_FILE_DB_NAME = 'LOGISTECH_SO_FILES_DB';
const SO_FILE_STORE = 'soFiles';
const SO_FILE_DB_VERSION = 1;

let currentSOFiles = [];
let currentPDFUrl = null;


/* =====================================================
   OPEN FILE DATABASE
===================================================== */

function openSOFileDB() {

    return new Promise(function(resolve, reject) {

        const request = indexedDB.open(
            SO_FILE_DB_NAME,
            SO_FILE_DB_VERSION
        );


        request.onupgradeneeded = function(event) {

            const db = event.target.result;


            if (!db.objectStoreNames.contains(SO_FILE_STORE)) {

                const store = db.createObjectStore(
                    SO_FILE_STORE,
                    {
                        keyPath: 'id',
                        autoIncrement: true
                    }
                );


                store.createIndex(
                    'soNumber',
                    'soNumber',
                    {
                        unique: false
                    }
                );

            }

        };


        request.onsuccess = function() {

            resolve(request.result);

        };


        request.onerror = function() {

            reject(request.error);

        };

    });

}


/* =====================================================
   SAVE FILE TO INDEXEDDB
===================================================== */

async function saveSOFileToDB(
    soNumber,
    file
) {

    const db =
        await openSOFileDB();


    return new Promise(function(resolve, reject) {

        const transaction =
            db.transaction(
                SO_FILE_STORE,
                'readwrite'
            );


        const store =
            transaction.objectStore(
                SO_FILE_STORE
            );


        const record = {

            soNumber: soNumber,

            fileName: file.name,

            fileType:
                file.type ||
                'application/pdf',

            fileSize: file.size,

            uploadedDate:
                new Date().toISOString(),

            file: file

        };


        const request =
            store.add(record);


        request.onsuccess =
            function() {

                resolve(request.result);

            };


        request.onerror =
            function() {

                reject(request.error);

            };

    });

}


/* =====================================================
   GET SO FILES
===================================================== */

async function getSOFilesFromDB(
    soNumber
) {

    const db =
        await openSOFileDB();


    return new Promise(function(resolve, reject) {

        const transaction =
            db.transaction(
                SO_FILE_STORE,
                'readonly'
            );


        const store =
            transaction.objectStore(
                SO_FILE_STORE
            );


        const index =
            store.index('soNumber');


        const request =
            index.getAll(soNumber);


        request.onsuccess =
            function() {

                resolve(
                    request.result || []
                );

            };


        request.onerror =
            function() {

                reject(request.error);

            };

    });

}


/* =====================================================
   DELETE SO FILE
===================================================== */

async function deleteSOFileFromDB(
    fileId
) {

    const db =
        await openSOFileDB();


    return new Promise(function(resolve, reject) {

        const transaction =
            db.transaction(
                SO_FILE_STORE,
                'readwrite'
            );


        const store =
            transaction.objectStore(
                SO_FILE_STORE
            );


        const request =
            store.delete(fileId);


        request.onsuccess =
            function() {

                resolve();

            };


        request.onerror =
            function() {

                reject(request.error);

            };

    });

}


/* =====================================================
   GET SALES ORDERS
===================================================== */

function getSalesOrders() {

    try {

        const data =
            localStorage.getItem(
                'salesOrders'
            );


        if (!data) {

            return [];

        }


        const orders =
            JSON.parse(data);


        return Array.isArray(orders)
            ? orders
            : [];

    } catch (error) {

        console.error(
            'Unable to read Sales Orders:',
            error
        );


        return [];

    }

}


/* =====================================================
   SAVE SALES ORDERS
===================================================== */

function saveSalesOrders(
    salesOrders
) {

    localStorage.setItem(
        'salesOrders',
        JSON.stringify(
            salesOrders
        )
    );

}


/* =====================================================
   FORMAT MONEY
===================================================== */

function formatMoney(
    value
) {

    const number =
        Number(value) || 0;


    return '₱' +
        number.toLocaleString(
            'en-PH',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

}


/* =====================================================
   SALES ORDER CALCULATION
===================================================== */

function calculateSOData(
    items,
    discount,
    vatable
) {

    let subtotal = 0;


    (items || []).forEach(function(item) {

        const qty =
            Number(item.qty) || 0;


        const amount =
            Number(item.amount) || 0;


        item.total =
            qty * amount;


        subtotal +=
            item.total;

    });


    discount =
        Math.max(
            0,
            Number(discount) || 0
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


    return {

        subtotal:
            subtotal,

        discount:
            discount,

        vatable:
            Boolean(vatable),

        vatRate:
            VAT_RATE,

        vatAmount:
            vatAmount,

        grandTotal:
            grandTotal

    };

}


/* =====================================================
   GET SO TOTAL
===================================================== */

function getSOTotal(
    so
) {

    if (!so) {

        return 0;

    }


    if (
        so.grandTotal !== undefined &&
        so.grandTotal !== null
    ) {

        return Number(
            so.grandTotal
        ) || 0;

    }


    const result =
        calculateSOData(
            so.items || [],
            so.discount || 0,
            so.vatable || false
        );


    return result.grandTotal;

}


/* =====================================================
   OPEN CREATE SO
   STANDALONE PAGE
===================================================== */

function openCreateSO() {

    window.location.href =
        'pages/create-sales-order.html';

}


/* =====================================================
   LOAD SO LIST
===================================================== */

function loadSOList() {

    const body =
        document.getElementById(
            'soTableBody'
        );


    if (!body) {

        return;

    }


    body.innerHTML =
        '';


    const salesOrders =
        getSalesOrders();


    salesOrders.forEach(function(so) {

        const row =
            document.createElement(
                'tr'
            );


        row.className =
            'so-row';


        /*
         * 1 CLICK
         * Preview only
         */

        row.addEventListener(
            'click',
            function() {

                selectSO(
                    row,
                    so.soNumber
                );

            }
        );


        /*
         * DOUBLE CLICK
         * Full Details
         */

        row.addEventListener(
            'dblclick',
            function() {

                openSODetails(
                    so.soNumber
                );

            }
        );


        const status =
            so.status ||
            'ACTIVE';


        const statusClass =
            status === 'CANCELLED'
                ? 'status-cancelled'
                : 'status-active';


        row.innerHTML = `

            <td>

                <strong>
                    ${escapeHTML(
                        so.soNumber || ''
                    )}
                </strong>

            </td>


            <td>
                ${escapeHTML(
                    so.dateCreation || ''
                )}
            </td>


            <td>
                ${escapeHTML(
                    so.clientName || ''
                )}
            </td>


            <td>
                ${escapeHTML(
                    so.se || ''
                )}
            </td>


            <td>
                ${escapeHTML(
                    so.project || ''
                )}
            </td>


            <td>
                ${escapeHTML(
                    so.poNumber || ''
                )}
            </td>


            <td>
                ${escapeHTML(
                    so.terms || ''
                )}
            </td>


            <td>
                ${formatMoney(
                    getSOTotal(so)
                )}
            </td>


            <td>

                <span
                    class="status-badge ${statusClass}">

                    ${escapeHTML(
                        status
                    )}

                </span>

            </td>

        `;


        body.appendChild(
            row
        );

    });


    /*
     * Re-apply search if search box
     * already contains text.
     */

    searchSO();

}


/* =====================================================
   SEARCH SO
===================================================== */

function searchSO() {

    const input =
        document.getElementById(
            'soSearch'
        );


    if (!input) {

        return;

    }


    const search =
        input.value
            .toLowerCase()
            .trim();


    document
        .querySelectorAll(
            '#soTableBody .so-row'
        )
        .forEach(function(row) {

            const text =
                row.innerText
                    .toLowerCase();


            row.style.display =
                text.includes(search)
                    ? ''
                    : 'none';

        });

}


/* =====================================================
   SELECT SO
   ONE CLICK = PREVIEW
===================================================== */

function selectSO(
    row,
    soNumber
) {

    document
        .querySelectorAll(
            '#soTableBody .so-row'
        )
        .forEach(function(item) {

            item.classList.remove(
                'selected'
            );

        });


    if (row) {

        row.classList.add(
            'selected'
        );

    }


    selectedSO =
        soNumber;


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(function(item) {

            return (
                item.soNumber ===
                soNumber
            );

        });


    if (!so) {

        return;

    }


    const isCancelled =
        so.status ===
        'CANCELLED';


    const updateButton =
        document.getElementById(
            'updateSOButton'
        );


    const cancelButton =
        document.getElementById(
            'cancelSOButton'
        );


    if (updateButton) {

        updateButton.disabled =
            isCancelled;

    }


    if (cancelButton) {

        cancelButton.disabled =
            isCancelled;

    }


    const selectedInfo =
        document.getElementById(
            'selectedSOInfo'
        );


    if (!selectedInfo) {

        return;

    }


    selectedInfo.innerHTML = `

        <div class="detail-summary">

            <div>
                <strong>SO Number:</strong>
                ${escapeHTML(
                    so.soNumber || '-'
                )}
            </div>


            <div>
                <strong>Date:</strong>
                ${escapeHTML(
                    so.dateCreation || '-'
                )}
            </div>


            <div>
                <strong>Client:</strong>
                ${escapeHTML(
                    so.clientName || '-'
                )}
            </div>


            <div>
                <strong>SE:</strong>
                ${escapeHTML(
                    so.se || '-'
                )}
            </div>


            <div>
                <strong>Project:</strong>
                ${escapeHTML(
                    so.project || '-'
                )}
            </div>


            <div>
                <strong>PO Number:</strong>
                ${escapeHTML(
                    so.poNumber || '-'
                )}
            </div>


            <div>
                <strong>Terms:</strong>
                ${escapeHTML(
                    so.terms || '-'
                )}
            </div>


            <div>
                <strong>Grand Total:</strong>
                ${formatMoney(
                    getSOTotal(so)
                )}
            </div>


            <div>
                <strong>Status:</strong>
                ${escapeHTML(
                    so.status || 'ACTIVE'
                )}
            </div>

        </div>

    `;

}


/* =====================================================
   OPEN FULL SO DETAILS
   DOUBLE CLICK
===================================================== */

async function openSODetails(
    soNumber
) {

    selectedSO =
        soNumber;


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(function(item) {

            return (
                item.soNumber ===
                soNumber
            );

        });


    if (!so) {

        alert(
            'Sales Order not found.'
        );

        return;

    }


    document
        .querySelectorAll('.page')
        .forEach(function(page) {

            page.classList.remove(
                'active'
            );

        });


    const detailsPage =
        document.getElementById(
            'soDetails'
        );


    if (!detailsPage) {

        alert(
            'Sales Order Details page not found.'
        );

        return;

    }


    detailsPage.classList.add(
        'active'
    );


    const pageTitle =
        document.getElementById(
            'pageTitle'
        );


    if (pageTitle) {

        pageTitle.innerText =
            'Sales Order Details';

    }


    /*
     * LOAD INFORMATION
     */

    setDetailValue(
        'detailSODate',
        so.dateCreation
    );


    setDetailValue(
        'detailSONumber',
        so.soNumber
    );


    setDetailValue(
        'detailClientName',
        so.clientName
    );


    setDetailValue(
        'detailSE',
        so.se
    );


    setDetailValue(
        'detailAttention',
        so.attention
    );


    setDetailValue(
        'detailBillingAddress',
        so.billingAddress
    );


    setDetailValue(
        'detailDeliveryAddress',
        so.deliveryAddress
    );


    setDetailValue(
        'detailProject',
        so.project
    );


    setDetailValue(
        'detailTIN',
        so.tin
    );


    setDetailValue(
        'detailPONumber',
        so.poNumber
    );


    setDetailValue(
        'detailTerms',
        so.terms
    );


    setDetailValue(
        'detailJobOrder',
        so.jobOrder
    );


    /*
     * TOTALS
     */

    setValue(
        'detailDiscount',
        so.discount || 0
    );


    const vatable =
        document.getElementById(
            'detailVatable'
        );


    if (vatable) {

        vatable.checked =
            Boolean(
                so.vatable
            );

    }


    /*
     * RESET EDIT MODE
     */

    detailEditMode =
        false;


    setDetailsEditMode(
        false
    );


    updateDetailButtons(
        so.status
    );


    /*
     * LOAD ITEMS
     */

    loadDetailItems(
        so
    );


    calculateDetailTotals();


    /*
     * LOAD FILES
     */

    try {

        await loadSOFiles(
            so.soNumber
        );

    } catch (error) {

        console.error(
            'Unable to load SO files:',
            error
        );

    }

}


/* =====================================================
   SET DETAIL VALUE
===================================================== */

function setDetailValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? '';

    }

}


/* =====================================================
   UPDATE DETAIL BUTTONS
===================================================== */

function updateDetailButtons(
    status
) {

    const cancelled =
        status ===
        'CANCELLED';


    const editButton =
        document.getElementById(
            'detailEditButton'
        );


    const saveButton =
        document.getElementById(
            'detailSaveButton'
        );


    const addItemButton =
        document.getElementById(
            'detailAddItemButton'
        );


    const cancelButton =
        document.getElementById(
            'detailCancelButton'
        );


    if (cancelled) {

        if (editButton) {

            editButton.style.display =
                'none';

        }


        if (saveButton) {

            saveButton.style.display =
                'none';

        }


        if (addItemButton) {

            addItemButton.style.display =
                'none';

        }


        if (cancelButton) {

            cancelButton.style.display =
                'none';

        }

    } else {

        if (editButton) {

            editButton.style.display =
                '';

        }


        if (saveButton) {

            saveButton.style.display =
                'none';

        }


        if (addItemButton) {

            addItemButton.style.display =
                'none';

        }


        if (cancelButton) {

            cancelButton.style.display =
                '';

        }

    }

}


/* =====================================================
   LOAD DETAIL ITEMS
===================================================== */

function loadDetailItems(
    so
) {

    const body =
        document.getElementById(
            'soDetailsItemsBody'
        );


    if (!body) {

        return;

    }


    body.innerHTML =
        '';


    const items =
        Array.isArray(so.items)
            ? so.items
            : [];


    items.forEach(function(item, index) {

        createDetailItemRow(
            item,
            index
        );

    });

}


/* =====================================================
   CREATE DETAIL ITEM ROW
===================================================== */

function createDetailItemRow(
    item,
    index
) {

    const body =
        document.getElementById(
            'soDetailsItemsBody'
        );


    if (!body) {

        return;

    }


    const row =
        document.createElement(
            'tr'
        );


    const units = [

        'pcs',
        'assy',
        'set',
        'length',
        'meter',
        'lot',
        'box',
        'roll',
        'amount',
        'custom'

    ];


    let options =
        '';


    units.forEach(function(unit) {

        options += `

            <option
                value="${escapeHTML(unit)}"
                ${
                    item.unit === unit
                        ? 'selected'
                        : ''
                }>

                ${escapeHTML(unit)}

            </option>

        `;

    });


    const isCustom =
        item.unit &&
        !units.includes(
            item.unit
        );


    if (isCustom) {

        options += `

            <option
                value="custom"
                selected>

                custom

            </option>

        `;

    }


    const itemName =
        escapeHTML(
            item.name || ''
        );


    const description =
        escapeHTML(
            item.description || ''
        );


    const customUnit =
        escapeHTML(
            isCustom
                ? item.unit
                : ''
        );


    row.innerHTML = `

        <td class="item-number">
            ${index + 1}
        </td>


        <td>

            <input
                type="text"
                class="detail-item-name"
                value="${itemName}"
                disabled>

        </td>


        <td>

            <input
                type="text"
                class="detail-item-description"
                value="${description}"
                disabled>

        </td>


        <td>

            <input
                type="number"
                class="detail-item-qty"
                value="${Number(
                    item.qty
                ) || 0}"
                min="0"
                step="0.01"
                oninput="calculateDetailItemTotal(this)"
                disabled>

        </td>


        <td>

            <select
                class="detail-item-unit"
                onchange="handleDetailUnitChange(this)"
                disabled>

                ${options}

            </select>


            <input
                type="text"
                class="custom-unit-input"
                value="${customUnit}"
                placeholder="Custom unit"
                style="
                    display:${
                        isCustom
                            ? 'block'
                            : 'none'
                    };
                "
                disabled>

        </td>


        <td>

            <input
                type="number"
                class="detail-item-amount"
                value="${Number(
                    item.amount
                ) || 0}"
                min="0"
                step="0.01"
                oninput="calculateDetailItemTotal(this)"
                disabled>

        </td>


        <td>

            <input
                type="text"
                class="detail-item-total"
                value="${formatMoney(
                    item.total || 0
                )}"
                readonly>

        </td>


        <td>

            <button
                type="button"
                class="delete-item"
                onclick="deleteDetailItem(this)"
                style="display:none;">

                DELETE

            </button>

        </td>

    `;


    body.appendChild(
        row
    );

}


/* =====================================================
   CLOSE DETAILS
===================================================== */

function closeSODetails() {

    detailEditMode =
        false;


    document
        .querySelectorAll('.page')
        .forEach(function(page) {

            page.classList.remove(
                'active'
            );

        });


    const sales =
        document.getElementById(
            'sales'
        );


    if (sales) {

        sales.classList.add(
            'active'
        );

    }


    const pageTitle =
        document.getElementById(
            'pageTitle'
        );


    if (pageTitle) {

        pageTitle.innerText =
            'Sales Order';

    }


    const selectedInfo =
        document.getElementById(
            'selectedSOInfo'
        );


    if (selectedInfo) {

        selectedInfo.innerHTML =
            'No Sales Order selected.';

    }


    const updateButton =
        document.getElementById(
            'updateSOButton'
        );


    const cancelButton =
        document.getElementById(
            'cancelSOButton'
        );


    if (updateButton) {

        updateButton.disabled =
            true;

    }


    if (cancelButton) {

        cancelButton.disabled =
            true;

    }


    selectedSO =
        null;


    detailEditMode =
        false;


    loadSOList();

}


/* =====================================================
   UPDATE SELECTED SO
===================================================== */

function updateSelectedSO() {

    if (!selectedSO) {

        alert(
            'Please select a Sales Order.'
        );

        return;

    }


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(function(item) {

            return (
                item.soNumber ===
                selectedSO
            );

        });


    if (!so) {

        alert(
            'Sales Order not found.'
        );

        return;

    }


    if (
        so.status ===
        'CANCELLED'
    ) {

        alert(
            'Cancelled Sales Orders cannot be updated.'
        );

        return;

    }


    openSODetails(
        selectedSO
    );

}


/* =====================================================
   CANCEL SELECTED SO
===================================================== */

function cancelSelectedSO() {

    if (!selectedSO) {

        alert(
            'Please select a Sales Order.'
        );

        return;

    }


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(function(item) {

            return (
                item.soNumber ===
                selectedSO
            );

        });


    if (!so) {

        alert(
            'Sales Order not found.'
        );

        return;

    }


    if (
        so.status ===
        'CANCELLED'
    ) {

        alert(
            'This Sales Order is already cancelled.'
        );

        return;

    }


    const confirmed =
        confirm(
            'Are you sure you want to cancel ' +
            selectedSO +
            '?'
        );


    if (!confirmed) {

        return;

    }


    so.status =
        'CANCELLED';


    saveSalesOrders(
        salesOrders
    );


    selectedSO =
        null;


    loadSOList();


    const info =
        document.getElementById(
            'selectedSOInfo'
        );


    if (info) {

        info.innerHTML =
            'No Sales Order selected.';

    }


    const updateButton =
        document.getElementById(
            'updateSOButton'
        );


    const cancelButton =
        document.getElementById(
            'cancelSOButton'
        );


    if (updateButton) {

        updateButton.disabled =
            true;

    }


    if (cancelButton) {

        cancelButton.disabled =
            true;

    }


    alert(
        'Sales Order cancelled successfully.'
    );

}


/* =====================================================
   ENABLE UPDATE
===================================================== */

function enableSOUpdate() {

    if (!selectedSO) {

        return;

    }


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(function(item) {

            return (
                item.soNumber ===
                selectedSO
            );

        });


    if (
        !so ||
        so.status ===
        'CANCELLED'
    ) {

        return;

    }


    detailEditMode =
        true;


    setDetailsEditMode(
        true
    );


    const editButton =
        document.getElementById(
            'detailEditButton'
        );


    const saveButton =
        document.getElementById(
            'detailSaveButton'
        );


    const addButton =
        document.getElementById(
            'detailAddItemButton'
        );


    if (editButton) {

        editButton.style.display =
            'none';

    }


    if (saveButton) {

        saveButton.style.display =
            '';

    }


    if (addButton) {

        addButton.style.display =
            '';

    }

}


/* =====================================================
   SET DETAIL EDIT MODE
===================================================== */

function setDetailsEditMode(
    enabled
) {

    document
        .querySelectorAll(
            '#soDetails input, #soDetails select'
        )
        .forEach(function(input) {

            /*
             * SO NUMBER is always locked.
             */

            if (
                input.id ===
                'detailSONumber'
            ) {

                input.disabled =
                    true;

                return;

            }


            /*
             * File-related hidden inputs
             * are not affected.
             */

            if (
                input.type ===
                'file'
            ) {

                return;

            }


            input.disabled =
                !enabled;

        });


    document
        .querySelectorAll(
            '#soDetailsItemsBody .delete-item'
        )
        .forEach(function(button) {

            button.style.display =
                enabled
                    ? ''
                    : 'none';

        });

}


/* =====================================================
   DETAIL ITEM TOTAL
===================================================== */

function calculateDetailItemTotal(
    input
) {

    const row =
        input.closest('tr');


    if (!row) {

        return;

    }


    const qty =
        Number(
            row.querySelector(
                '.detail-item-qty'
            )?.value
        ) || 0;


    const amount =
        Number(
            row.querySelector(
                '.detail-item-amount'
            )?.value
        ) || 0;


    const total =
        qty * amount;


    const output =
        row.querySelector(
            '.detail-item-total'
        );


    if (output) {

        output.value =
            formatMoney(
                total
            );

    }


    calculateDetailTotals();

}


/* =====================================================
   DETAIL TOTALS
===================================================== */

function calculateDetailTotals() {

    const rows =
        document.querySelectorAll(
            '#soDetailsItemsBody tr'
        );


    const items = [];


    rows.forEach(function(row) {

        items.push({

            qty:
                Number(
                    row.querySelector(
                        '.detail-item-qty'
                    )?.value
                ) || 0,

            amount:
                Number(
                    row.querySelector(
                        '.detail-item-amount'
                    )?.value
                ) || 0

        });

    });


    const discount =
        Number(
            document.getElementById(
                'detailDiscount'
            )?.value
        ) || 0;


    const vatable =
        Boolean(
            document.getElementById(
                'detailVatable'
            )?.checked
        );


    const result =
        calculateSOData(
            items,
            discount,
            vatable
        );


    setText(
        'detailSubtotal',
        formatMoney(
            result.subtotal
        )
    );


    setText(
        'detailVAT',
        formatMoney(
            result.vatAmount
        )
    );


    setText(
        'detailGrandTotal',
        formatMoney(
            result.grandTotal
        )
    );

}


/* =====================================================
   ADD DETAIL ITEM
===================================================== */

function addDetailItem() {

    const body =
        document.getElementById(
            'soDetailsItemsBody'
        );


    if (!body) {

        return;

    }


    const index =
        body.querySelectorAll(
            'tr'
        ).length;


    createDetailItemRow(

        {

            name: '',

            description: '',

            qty: 0,

            unit: 'pcs',

            amount: 0,

            total: 0

        },

        index

    );


    renumberDetailItems();


    setDetailsEditMode(
        true
    );


    calculateDetailTotals();

}


/* =====================================================
   DETAIL UNIT CHANGE
===================================================== */

function handleDetailUnitChange(
    select
) {

    const row =
        select.closest('tr');


    if (!row) {

        return;

    }


    const custom =
        row.querySelector(
            '.custom-unit-input'
        );


    if (!custom) {

        return;

    }


    if (
        select.value ===
        'custom'
    ) {

        custom.style.display =
            'block';

    } else {

        custom.style.display =
            'none';

        custom.value =
            '';

    }

}


/* =====================================================
   DELETE DETAIL ITEM
===================================================== */

function deleteDetailItem(
    button
) {

    const row =
        button.closest('tr');


    if (row) {

        row.remove();

    }


    renumberDetailItems();

    calculateDetailTotals();

}


/* =====================================================
   RENUMBER DETAIL ITEMS
===================================================== */

function renumberDetailItems() {

    document
        .querySelectorAll(
            '#soDetailsItemsBody tr'
        )
        .forEach(function(row, index) {

            const number =
                row.querySelector(
                    '.item-number'
                );


            if (number) {

                number.textContent =
                    index + 1;

            }

        });

}


/* =====================================================
   SAVE SO UPDATE
===================================================== */

async function saveSOUpdate() {

    if (!selectedSO) {

        alert(
            'No Sales Order selected.'
        );

        return;

    }


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(function(item) {

            return (
                item.soNumber ===
                selectedSO
            );

        });


    if (!so) {

        alert(
            'Sales Order not found.'
        );

        return;

    }


    if (
        so.status ===
        'CANCELLED'
    ) {

        alert(
            'Cancelled Sales Orders cannot be updated.'
        );

        return;

    }


    const confirmed =
        confirm(
            'Save changes to ' +
            selectedSO +
            '?'
        );


    if (!confirmed) {

        return;

    }


    /*
     * READ BASIC INFORMATION
     */

    so.dateCreation =
        getValue(
            'detailSODate'
        );


    so.clientName =
        getValue(
            'detailClientName'
        );


    so.se =
        getValue(
            'detailSE'
        );


    so.attention =
        getValue(
            'detailAttention'
        );


    so.billingAddress =
        getValue(
            'detailBillingAddress'
        );


    so.deliveryAddress =
        getValue(
            'detailDeliveryAddress'
        );


    so.project =
        getValue(
            'detailProject'
        );


    so.tin =
        getValue(
            'detailTIN'
        );


    so.poNumber =
        getValue(
            'detailPONumber'
        );


    so.terms =
        getValue(
            'detailTerms'
        );


    so.jobOrder =
        getValue(
            'detailJobOrder'
        );


    so.discount =
        Number(
            getValue(
                'detailDiscount'
            )
        ) || 0;


    so.vatable =
        Boolean(
            document.getElementById(
                'detailVatable'
            )?.checked
        );


    /*
     * VALIDATION
     */

    if (!so.clientName) {

        alert(
            'Client Name is required.'
        );

        return;

    }


    if (!so.se) {

        alert(
            'Please select SE.'
        );

        return;

    }


    /*
     * READ ITEMS
     */

    const rows =
        document.querySelectorAll(
            '#soDetailsItemsBody tr'
        );


    if (!rows.length) {

        alert(
            'Please add at least one item.'
        );

        return;

    }


    const items = [];


    rows.forEach(function(row) {

        let unit =
            row.querySelector(
                '.detail-item-unit'
            )?.value || '';


        const custom =
            row.querySelector(
                '.custom-unit-input'
            );


        if (
            unit === 'custom' &&
            custom
        ) {

            unit =
                custom.value.trim();

        }


        items.push({

            name:
                row.querySelector(
                    '.detail-item-name'
                )?.value.trim() || '',

            description:
                row.querySelector(
                    '.detail-item-description'
                )?.value.trim() || '',

            qty:
                Number(
                    row.querySelector(
                        '.detail-item-qty'
                    )?.value
                ) || 0,

            unit:
                unit,

            amount:
                Number(
                    row.querySelector(
                        '.detail-item-amount'
                    )?.value
                ) || 0,

            total:
                0

        });

    });


    /*
     * CALCULATE
     */

    const totals =
        calculateSOData(
            items,
            so.discount,
            so.vatable
        );


    so.items =
        items;


    so.subtotal =
        totals.subtotal;


    so.discount =
        totals.discount;


    so.vatable =
        totals.vatable;


    so.vatRate =
        totals.vatRate;


    so.vatAmount =
        totals.vatAmount;


    so.grandTotal =
        totals.grandTotal;


    /*
     * SAVE
     */

    saveSalesOrders(
        salesOrders
    );


    /*
     * RESET EDIT MODE
     */

    detailEditMode =
        false;


    setDetailsEditMode(
        false
    );


    updateDetailButtons(
        so.status
    );


    calculateDetailTotals();


    /*
     * REFRESH LIST
     */

    loadSOList();


    /*
     * KEEP DETAILS OPEN
     */

    await loadSOFiles(
        so.soNumber
    );


    alert(

        'Sales Order updated successfully!\n\n' +

        'SO: ' +
        so.soNumber +

        '\nGrand Total: ' +
        formatMoney(
            so.grandTotal
        )

    );

}


/* =====================================================
   DETAIL SO FILE SECTION
===================================================== */

function ensureDetailSOFileSection() {

    const detailsPage =
        document.getElementById(
            'soDetails'
        );


    if (!detailsPage) {

        return null;

    }


    let section =
        document.getElementById(
            'detailSOFilesSection'
        );


    if (!section) {

        section =
            document.createElement(
                'div'
            );


        section.id =
            'detailSOFilesSection';


        section.className =
            'section';


        section.innerHTML = `

            <div class="table-header">

                <div>

                    <h2>
                        SO Files
                    </h2>

                    <p class="subtitle">
                        Uploaded Sales Order PDF files
                    </p>

                </div>


                <label
                    for="detailSOFileInput"
                    class="btn btn-primary"
                    style="cursor:pointer;">

                    📎 + UPLOAD FILE

                </label>


                <input
                    type="file"
                    id="detailSOFileInput"
                    accept=".pdf,application/pdf"
                    multiple
                    hidden
                    onchange="handleDetailSOFiles(this.files)">

            </div>


            <div
                id="detailSOFilesList"
                class="so-file-list">

                <div class="so-file-status">
                    No SO files uploaded yet.
                </div>

            </div>

        `;


        const actionBars =
            detailsPage.querySelectorAll(
                '.action-bar'
            );


        const lastActionBar =
            actionBars[
                actionBars.length - 1
            ];


        if (lastActionBar) {

            detailsPage.insertBefore(
                section,
                lastActionBar
            );

        } else {

            detailsPage.appendChild(
                section
            );

        }

    }


    return section;

}


/* =====================================================
   LOAD SO FILES
===================================================== */

async function loadSOFiles(
    soNumber
) {

    const section =
        ensureDetailSOFileSection();


    if (!section) {

        return;

    }


    const files =
        await getSOFilesFromDB(
            soNumber
        );


    currentSOFiles =
        files;


    renderSOFiles(
        files
    );

}


/* =====================================================
   HANDLE DETAIL FILES
===================================================== */

async function handleDetailSOFiles(
    files
) {

    if (
        !files ||
        !selectedSO
    ) {

        return;

    }


    const fileArray =
        Array.from(files);


    for (
        const file of fileArray
    ) {

        if (
            file.type !==
            'application/pdf'
        ) {

            alert(
                file.name +
                ' is not a PDF file.'
            );

            continue;

        }


        try {

            await saveSOFileToDB(
                selectedSO,
                file
            );

        } catch (error) {

            console.error(
                'File upload error:',
                error
            );


            alert(
                'Failed to upload ' +
                file.name
            );

        }

    }


    await loadSOFiles(
        selectedSO
    );


    const input =
        document.getElementById(
            'detailSOFileInput'
        );


    if (input) {

        input.value =
            '';

    }

}


/* =====================================================
   RENDER SO FILES
===================================================== */

function renderSOFiles(
    files
) {

    const list =
        document.getElementById(
            'detailSOFilesList'
        );


    if (!list) {

        return;

    }


    list.innerHTML =
        '';


    if (
        !files ||
        files.length === 0
    ) {

        list.innerHTML = `

            <div class="so-file-status">

                No SO files uploaded yet.

            </div>

        `;

        return;

    }


    files.forEach(function(record) {

        const row =
            document.createElement(
                'div'
            );


        row.className =
            'so-file-row';


        const date =
            record.uploadedDate
                ? new Date(
                    record.uploadedDate
                ).toLocaleString(
                    'en-PH'
                )
                : '-';


        row.innerHTML = `

            <div class="so-file-info">

                <span class="file-icon">
                    📄
                </span>


                <div>

                    <strong>
                        ${escapeHTML(
                            record.fileName
                        )}
                    </strong>


                    <small>

                        Uploaded:
                        ${escapeHTML(
                            date
                        )}

                        •
                        ${formatFileSize(
                            record.fileSize
                        )}

                    </small>

                </div>

            </div>


            <div class="so-file-actions">

                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="viewSOFile(${record.id})">

                    VIEW FILE

                </button>


                <button
                    type="button"
                    class="btn btn-secondary"
                    onclick="printSOFile(${record.id})">

                    PRINT

                </button>

            </div>

        `;


        list.appendChild(
            row
        );

    });

}


/* =====================================================
   GET SINGLE FILE
===================================================== */

async function getSOFileById(
    fileId
) {

    const db =
        await openSOFileDB();


    return new Promise(function(resolve, reject) {

        const transaction =
            db.transaction(
                SO_FILE_STORE,
                'readonly'
            );


        const store =
            transaction.objectStore(
                SO_FILE_STORE
            );


        const request =
            store.get(
                fileId
            );


        request.onsuccess =
            function() {

                resolve(
                    request.result
                );

            };


        request.onerror =
            function() {

                reject(
                    request.error
                );

            };

    });

}


/* =====================================================
   VIEW SO FILE
===================================================== */

async function viewSOFile(
    fileId
) {

    try {

        const record =
            await getSOFileById(
                fileId
            );


        if (
            !record ||
            !record.file
        ) {

            alert(
                'Unable to open file.'
            );

            return;

        }


        if (currentPDFUrl) {

            URL.revokeObjectURL(
                currentPDFUrl
            );

        }


        currentPDFUrl =
            URL.createObjectURL(
                record.file
            );


        openPDFViewer(
            currentPDFUrl,
            record.fileName
        );

    } catch (error) {

        console.error(
            'View file error:',
            error
        );


        alert(
            'Unable to open file.'
        );

    }

}


/* =====================================================
   PRINT SO FILE
===================================================== */

async function printSOFile(
    fileId
) {

    try {

        const record =
            await getSOFileById(
                fileId
            );


        if (
            !record ||
            !record.file
        ) {

            alert(
                'Unable to print file.'
            );

            return;

        }


        const url =
            URL.createObjectURL(
                record.file
            );


        const printWindow =
            window.open(
                url,
                '_blank'
            );


        if (!printWindow) {

            URL.revokeObjectURL(
                url
            );


            alert(
                'Please allow pop-ups to print the PDF.'
            );

            return;

        }


        printWindow.onload =
            function() {

                printWindow.focus();

                printWindow.print();

            };


        setTimeout(function() {

            URL.revokeObjectURL(
                url
            );

        }, 60000);

    } catch (error) {

        console.error(
            'Print file error:',
            error
        );


        alert(
            'Unable to print file.'
        );

    }

}


/* =====================================================
   PDF VIEWER
===================================================== */

function openPDFViewer(
    url,
    fileName
) {

    let modal =
        document.getElementById(
            'soPDFViewerModal'
        );


    if (!modal) {

        modal =
            document.createElement(
                'div'
            );


        modal.id =
            'soPDFViewerModal';


        modal.className =
            'pdf-modal';


        modal.innerHTML = `

            <div class="pdf-modal-content">

                <div class="pdf-modal-header">

                    <h2
                        id="soPDFViewerTitle">
                    </h2>


                    <button
                        type="button"
                        class="pdf-close-btn"
                        onclick="closeSOFileViewer()">

                        ×

                    </button>

                </div>


                <div class="pdf-viewer-container">

                    <iframe
                        id="soPDFViewer"
                        title="SO PDF Viewer">
                    </iframe>

                </div>

            </div>

        `;


        document.body.appendChild(
            modal
        );

    }


    const title =
        document.getElementById(
            'soPDFViewerTitle'
        );


    const viewer =
        document.getElementById(
            'soPDFViewer'
        );


    if (title) {

        title.textContent =
            fileName || 'PDF File';

    }


    if (viewer) {

        viewer.src =
            url;

    }


    modal.classList.add(
        'show'
    );


    modal.setAttribute(
        'aria-hidden',
        'false'
    );

}


/* =====================================================
   CLOSE PDF VIEWER
===================================================== */

function closeSOFileViewer() {

    const modal =
        document.getElementById(
            'soPDFViewerModal'
        );


    if (!modal) {

        return;

    }


    modal.classList.remove(
        'show'
    );


    modal.setAttribute(
        'aria-hidden',
        'true'
    );


    const viewer =
        document.getElementById(
            'soPDFViewer'
        );


    if (viewer) {

        viewer.src =
            'about:blank';

    }

}


/* =====================================================
   FILE SIZE
===================================================== */

function formatFileSize(
    bytes
) {

    if (
        !bytes ||
        bytes <= 0
    ) {

        return '0 Bytes';

    }


    const units = [

        'Bytes',
        'KB',
        'MB',
        'GB'

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

        bytes /
        Math.pow(
            1024,
            index
        )

    ).toFixed(
        index === 0
            ? 0
            : 2
    ) +
    ' ' +
    units[index];

}


/* =====================================================
   UTILITY
===================================================== */

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return (
        element?.value ||
        ''
    ).trim();

}


/* =====================================================
   SET VALUE
===================================================== */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.value =
            value ?? '';

    }

}


/* =====================================================
   SET TEXT
===================================================== */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value ?? '';

    }

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(
    value
) {

    return String(
        value ?? ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );

}


/* =====================================================
   MODULE READY
===================================================== */

console.log(
    'LOGIS-TECH Sales Order JS loaded.'
);


/* =====================================================
   CLEANUP
===================================================== */

window.addEventListener(
    'beforeunload',
    function() {

        if (currentPDFUrl) {

            URL.revokeObjectURL(
                currentPDFUrl
            );

            currentPDFUrl =
                null;

        }

    }
);
