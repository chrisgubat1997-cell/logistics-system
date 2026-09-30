/* =====================================================
   LOGIS-TECH SYSTEM
   SALES ORDER MODULE
===================================================== */

let selectedSO = null;
let soItemCount = 0;
let detailEditMode = false;

const VAT_RATE = 0.12;


/* =====================================================
   FILE MANAGEMENT
   IndexedDB
===================================================== */

const SO_FILE_DB_NAME = 'LOGISTECH_SO_FILES_DB';
const SO_FILE_STORE = 'soFiles';
const SO_FILE_DB_VERSION = 1;

let soCreateFiles = [];
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

                const store =
                    db.createObjectStore(
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

async function saveSOFileToDB(soNumber, file) {

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

            fileType: file.type,

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
   GET FILES BY SO NUMBER
===================================================== */

async function getSOFilesFromDB(soNumber) {

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
   DELETE FILE
===================================================== */

async function deleteSOFileFromDB(fileId) {

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

    return JSON.parse(
        localStorage.getItem('salesOrders')
    ) || [];

}


/* =====================================================
   FORMAT MONEY
===================================================== */

function formatMoney(value) {

    const number =
        Number(value) || 0;


    return '₱' + number.toLocaleString(
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


    items.forEach(function(item) {

        const qty =
            Number(item.qty) || 0;


        const amount =
            Number(item.amount) || 0;


        item.total =
            qty * amount;


        subtotal += item.total;

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
        taxableAmount + vatAmount;


    return {

        subtotal: subtotal,

        discount: discount,

        vatable: Boolean(vatable),

        vatRate: VAT_RATE,

        vatAmount: vatAmount,

        grandTotal: grandTotal

    };

}


/* =====================================================
   GET SO TOTAL
===================================================== */

function getSOTotal(so) {

    if (
        so &&
        so.grandTotal !== undefined
    ) {

        return Number(
            so.grandTotal
        ) || 0;

    }


    if (!so) {

        return 0;

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
   SELECT SO
   1 CLICK = PREVIEW ONLY
===================================================== */

function selectSO(row, soNumber) {

    document
        .querySelectorAll('.so-row')
        .forEach(function(item) {

            item.classList.remove(
                'selected'
            );

        });


    row.classList.add(
        'selected'
    );


    selectedSO =
        soNumber;


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(
            function(item) {

                return item.soNumber === soNumber;

            }
        );


    if (!so) {

        return;

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
            so.status === 'CANCELLED';

    }


    if (cancelButton) {

        cancelButton.disabled =
            so.status === 'CANCELLED';

    }


    const selectedInfo =
        document.getElementById(
            'selectedSOInfo'
        );


    if (selectedInfo) {

        selectedInfo.innerHTML = `

            <div class="detail-summary">

                <div>
                    <strong>SO Number:</strong>
                    ${escapeHTML(so.soNumber)}
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

}


/* =====================================================
   OPEN FULL SO DETAILS
   DOUBLE CLICK
===================================================== */

async function openSODetails(soNumber) {

    selectedSO =
        soNumber;


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(
            function(item) {

                return item.soNumber === soNumber;

            }
        );


    if (!so) {

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


    const discount =
        document.getElementById(
            'detailDiscount'
        );


    if (discount) {

        discount.value =
            so.discount || 0;

    }


    const vatable =
        document.getElementById(
            'detailVatable'
        );


    if (vatable) {

        vatable.checked =
            Boolean(so.vatable);

    }


    detailEditMode =
        false;


    setDetailsEditMode(
        false
    );


    updateDetailButtons(
        so.status
    );


    loadDetailItems(
        so
    );


    calculateDetailTotals();


    await loadSOFiles(
        so.soNumber
    );

}


/* =====================================================
   SET DETAIL VALUE
===================================================== */

function setDetailValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.value =
            value || '';

    }

}


/* =====================================================
   DETAIL BUTTON STATE
===================================================== */

function updateDetailButtons(
    status
) {

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


    const cancelled =
        status === 'CANCELLED';


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


    (
        so.items || []
    ).forEach(
        function(item, index) {

            createDetailItemRow(
                item,
                index
            );

        }
    );

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


    units.forEach(
        function(unit) {

            options += `

                <option
                    value="${unit}"
                    ${
                        item.unit === unit
                            ? 'selected'
                            : ''
                    }>

                    ${unit}

                </option>

            `;

        }
    );


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


    row.innerHTML = `

        <td class="item-number">
            ${index + 1}
        </td>

        <td>

            <input
                type="text"
                class="detail-item-name"
                value="${escapeHTML(
                    item.name || ''
                )}"
                disabled>

        </td>

        <td>

            <input
                type="text"
                class="detail-item-description"
                value="${escapeHTML(
                    item.description || ''
                )}"
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
                value="${escapeHTML(
                    isCustom
                        ? item.unit
                        : ''
                )}"
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


    selectedSO =
        null;


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

}


/* =====================================================
   OPEN CREATE SO
===================================================== */

function openCreateSO() {

    window.location.href =
        'pages/create-sales-order.html';

}


/* =====================================================
   GENERATE SO NUMBER
===================================================== */

function generateSONumber() {

    const year =
        new Date()
            .getFullYear();


    const salesOrders =
        getSalesOrders();


    let highest =
        0;


    salesOrders.forEach(
        function(so) {

            const match =
                String(
                    so.soNumber || ''
                ).match(
                    new RegExp(
                        '^SO-' +
                        year +
                        '-(\\d+)$'
                    )
                );


            if (match) {

                const number =
                    Number(
                        match[1]
                    ) || 0;


                if (
                    number >
                    highest
                ) {

                    highest =
                        number;

                }

            }

        }
    );


    const next =
        String(
            highest + 1
        ).padStart(
            5,
            '0'
        );


    const input =
        document.getElementById(
            'soNumber'
        );


    if (input) {

        input.value =
            'SO-' +
            year +
            '-' +
            next;

    }

}


/* =====================================================
   ADD SO ITEM
===================================================== */

function addSOItem() {

    const body =
        document.getElementById(
            'soItemsBody'
        );


    if (!body) {

        return;

    }


    soItemCount++;


    const row =
        document.createElement(
            'tr'
        );


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
                value="0"
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


    body.appendChild(
        row
    );


    calculateSOTotals();

}


/* =====================================================
   CALCULATE SO ITEM
===================================================== */

function calculateSOItemTotal(
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
                '.item-qty'
            )?.value
        ) || 0;


    const amount =
        Number(
            row.querySelector(
                '.item-amount'
            )?.value
        ) || 0;


    const total =
        qty * amount;


    const totalInput =
        row.querySelector(
            '.item-total'
        );


    if (totalInput) {

        totalInput.value =
            formatMoney(
                total
            );

    }


    calculateSOTotals();

}


/* =====================================================
   CALCULATE SO TOTALS
===================================================== */

function calculateSOTotals() {

    const rows =
        document.querySelectorAll(
            '#soItemsBody tr'
        );


    const items = [];


    rows.forEach(
        function(row) {

            items.push({

                qty:
                    Number(
                        row.querySelector(
                            '.item-qty'
                        )?.value
                    ) || 0,

                amount:
                    Number(
                        row.querySelector(
                            '.item-amount'
                        )?.value
                    ) || 0

            });

        }
    );


    const discount =
        Number(
            document.getElementById(
                'soDiscount'
            )?.value
        ) || 0;


    const vatable =
        Boolean(
            document.getElementById(
                'soVatable'
            )?.checked
        );


    const result =
        calculateSOData(
            items,
            discount,
            vatable
        );


    setText(
        'soSubtotal',
        formatMoney(
            result.subtotal
        )
    );


    setText(
        'soVAT',
        formatMoney(
            result.vatAmount
        )
    );


    setText(
        'soGrandTotal',
        formatMoney(
            result.grandTotal
        )
    );

}


/* =====================================================
   UNIT CHANGE
===================================================== */

function handleUnitChange(
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
   DELETE SO ITEM
===================================================== */

function deleteSOItem(
    button
) {

    const row =
        button.closest('tr');


    if (row) {

        row.remove();

    }


    renumberSOItems();

    calculateSOTotals();

}


/* =====================================================
   RENUMBER SO ITEMS
===================================================== */

function renumberSOItems() {

    const rows =
        document.querySelectorAll(
            '#soItemsBody tr'
        );


    soItemCount =
        rows.length;


    rows.forEach(
        function(row, index) {

            const number =
                row.querySelector(
                    '.item-number'
                );


            if (number) {

                number.textContent =
                    index + 1;

            }

        }
    );

}


/* =====================================================
   CLOSE CREATE SO
===================================================== */

function closeCreateSO() {

    const client =
        document.getElementById(
            'clientName'
        )?.value.trim();


    const se =
        document.getElementById(
            'soSE'
        )?.value;


    const rows =
        document.querySelectorAll(
            '#soItemsBody tr'
        );


    const hasData =
        client ||
        se ||
        rows.length > 0 ||
        soCreateFiles.length > 0;


    if (hasData) {

        if (
            !confirm(
                'Discard unsaved Sales Order data?'
            )
        ) {

            return;

        }

    }


    clearCreateSOForm();


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


    const title =
        document.getElementById(
            'pageTitle'
        );


    if (title) {

        title.innerText =
            'Sales Order';

    }

}


/* =====================================================
   SAVE SO
===================================================== */

async function saveSO() {

    const soNumber =
        getValue(
            'soNumber'
        );


    const dateCreation =
        getValue(
            'soDate'
        );


    const clientName =
        getValue(
            'clientName'
        );


    const se =
        getValue(
            'soSE'
        );


    const billingAddress =
        getValue(
            'billingAddress'
        );


    const attention =
        getValue(
            'attention'
        );


    const deliveryAddress =
        getValue(
            'deliveryAddress'
        );


    const project =
        getValue(
            'project'
        );


    const tin =
        getValue(
            'tinNumber'
        );


    const poNumber =
        getValue(
            'poNumber'
        );


    const terms =
        getValue(
            'terms'
        );


    const jobOrder =
        getValue(
            'jobOrder'
        );


    const discount =
        Number(
            getValue(
                'soDiscount'
            )
        ) || 0;


    const vatable =
        document.getElementById(
            'soVatable'
        )?.checked || false;


    if (!soNumber) {

        alert(
            'SO Number is required.'
        );

        return;

    }


    if (!clientName) {

        alert(
            'Client Name is required.'
        );

        return;

    }


    if (!se) {

        alert(
            'Please select SE.'
        );

        return;

    }


    const rows =
        document.querySelectorAll(
            '#soItemsBody tr'
        );


    if (!rows.length) {

        alert(
            'Please add at least one item.'
        );

        return;

    }


    const items = [];


    rows.forEach(
        function(row) {

            let unit =
                row.querySelector(
                    '.item-unit'
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
                        '.item-name'
                    )?.value.trim() || '',

                description:
                    row.querySelector(
                        '.item-description'
                    )?.value.trim() || '',

                qty:
                    Number(
                        row.querySelector(
                            '.item-qty'
                        )?.value
                    ) || 0,

                unit: unit,

                amount:
                    Number(
                        row.querySelector(
                            '.item-amount'
                        )?.value
                    ) || 0,

                total: 0

            });

        }
    );


    const totals =
        calculateSOData(
            items,
            discount,
            vatable
        );


    const salesOrders =
        getSalesOrders();


    if (
        salesOrders.some(
            function(so) {

                return so.soNumber ===
                    soNumber;

            }
        )
    ) {

        alert(
            'Sales Order Number already exists.'
        );

        return;

    }


    const newSO = {

        soNumber: soNumber,

        dateCreation: dateCreation,

        clientName: clientName,

        se: se,

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

        status:
            'ACTIVE',

        items:
            items,

        subtotal:
            totals.subtotal,

        discount:
            totals.discount,

        vatable:
            totals.vatable,

        vatRate:
            totals.vatRate,

        vatAmount:
            totals.vatAmount,

        grandTotal:
            totals.grandTotal

    };


    salesOrders.push(
        newSO
    );


    localStorage.setItem(
        'salesOrders',
        JSON.stringify(
            salesOrders
        )
    );


    /* SAVE ALL UPLOADED FILES */

    for (
        const file of soCreateFiles
    ) {

        await saveSOFileToDB(
            soNumber,
            file
        );

    }


    loadSOList();


    if (
        typeof loadDashboard ===
        'function'
    ) {

        loadDashboard();

    }


    clearCreateSOForm();


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


    const title =
        document.getElementById(
            'pageTitle'
        );


    if (title) {

        title.innerText =
            'Sales Order';

    }


    alert(

        'Sales Order saved successfully!\n\n' +

        'SO: ' +
        newSO.soNumber +

        '\nSE: ' +
        newSO.se +

        '\nGrand Total: ' +
        formatMoney(
            newSO.grandTotal
        ) +

        '\nFiles: ' +
        soCreateFiles.length

    );

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


    salesOrders.forEach(
        function(so) {

            const row =
                document.createElement(
                    'tr'
                );


            row.className =
                'so-row';


            row.onclick =
                function() {

                    selectSO(
                        row,
                        so.soNumber
                    );

                };


            row.ondblclick =
                function() {

                    openSODetails(
                        so.soNumber
                    );

                };


            const statusClass =
                so.status ===
                'CANCELLED'

                    ? 'status-cancelled'

                    : 'status-active';


            row.innerHTML = `

                <td>
                    <strong>
                        ${escapeHTML(
                            so.soNumber
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
                            so.status ||
                            'ACTIVE'
                        )}

                    </span>

                </td>

            `;


            body.appendChild(
                row
            );

        }
    );

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
        .forEach(
            function(row) {

                row.style.display =
                    row.innerText
                        .toLowerCase()
                        .includes(search)
                            ? ''
                            : 'none';

            }
        );

}


/* =====================================================
   CLEAR CREATE SO FORM
===================================================== */

function clearCreateSOForm() {

    const fields = [

        'soDate',
        'soNumber',
        'clientName',
        'attention',
        'billingAddress',
        'deliveryAddress',
        'project',
        'tinNumber',
        'poNumber',
        'jobOrder'

    ];


    fields.forEach(
        function(id) {

            const field =
                document.getElementById(
                    id
                );


            if (field) {

                field.value =
                    '';

            }

        }
    );


    setValue(
        'terms',
        ''
    );


    setValue(
        'soSE',
        ''
    );


    setValue(
        'soDiscount',
        0
    );


    const vatable =
        document.getElementById(
            'soVatable'
        );


    if (vatable) {

        vatable.checked =
            false;

    }


    const body =
        document.getElementById(
            'soItemsBody'
        );


    if (body) {

        body.innerHTML =
            '';

    }


    soItemCount =
        0;


    soCreateFiles =
        [];


    const subtotal =
        document.getElementById(
            'soSubtotal'
        );


    const vat =
        document.getElementById(
            'soVAT'
        );


    const grand =
        document.getElementById(
            'soGrandTotal'
        );


    if (subtotal) {

        subtotal.textContent =
            '₱0.00';

    }


    if (vat) {

        vat.textContent =
            '₱0.00';

    }


    if (grand) {

        grand.textContent =
            '₱0.00';

    }


    renderCreateSOFiles();

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


    if (
        !confirm(
            'Are you sure you want to cancel ' +
            selectedSO +
            '?'
        )
    ) {

        return;

    }


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(
            function(item) {

                return item.soNumber ===
                    selectedSO;

            }
        );


    if (!so) {

        return;

    }


    so.status =
        'CANCELLED';


    localStorage.setItem(
        'salesOrders',
        JSON.stringify(
            salesOrders
        )
    );


    loadSOList();


    if (
        typeof loadDashboard ===
        'function'
    ) {

        loadDashboard();

    }


    selectedSO =
        null;


    const update =
        document.getElementById(
            'updateSOButton'
        );


    const cancel =
        document.getElementById(
            'cancelSOButton'
        );


    if (update) {

        update.disabled =
            true;

    }


    if (cancel) {

        cancel.disabled =
            true;

    }


    const info =
        document.getElementById(
            'selectedSOInfo'
        );


    if (info) {

        info.innerHTML =
            'No Sales Order selected.';

    }


    alert(
        'Sales Order cancelled successfully.'
    );

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


    openSODetails(
        selectedSO
    );

}


/* =====================================================
   ENABLE UPDATE
===================================================== */

function enableSOUpdate() {

    detailEditMode =
        true;


    setDetailsEditMode(
        true
    );


    const edit =
        document.getElementById(
            'detailEditButton'
        );


    const save =
        document.getElementById(
            'detailSaveButton'
        );


    const add =
        document.getElementById(
            'detailAddItemButton'
        );


    if (edit) {

        edit.style.display =
            'none';

    }


    if (save) {

        save.style.display =
            '';

    }


    if (add) {

        add.style.display =
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
        .forEach(
            function(input) {

                if (
                    input.id ===
                    'detailSONumber'
                ) {

                    input.disabled =
                        true;

                } else {

                    input.disabled =
                        !enabled;

                }

            }
        );


    document
        .querySelectorAll(
            '#soDetailsItemsBody input, #soDetailsItemsBody select'
        )
        .forEach(
            function(input) {

                input.disabled =
                    !enabled;

            }
        );


    document
        .querySelectorAll(
            '#soDetailsItemsBody .delete-item'
        )
        .forEach(
            function(button) {

                button.style.display =
                    enabled
                        ? ''
                        : 'none';

            }
        );

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


    rows.forEach(
        function(row) {

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

        }
    );


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
        .forEach(
            function(row, index) {

                const number =
                    row.querySelector(
                        '.item-number'
                    );


                if (number) {

                    number.textContent =
                        index + 1;

                }

            }
        );

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


    if (
        !confirm(
            'Save changes to ' +
            selectedSO +
            '?'
        )
    ) {

        return;

    }


    const salesOrders =
        getSalesOrders();


    const so =
        salesOrders.find(
            function(item) {

                return item.soNumber ===
                    selectedSO;

            }
        );


    if (!so) {

        return;

    }


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
        document.getElementById(
            'detailVatable'
        )?.checked || false;


    const rows =
        document.querySelectorAll(
            '#soDetailsItemsBody tr'
        );


    const items = [];


    rows.forEach(
        function(row) {

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

                unit: unit,

                amount:
                    Number(
                        row.querySelector(
                            '.detail-item-amount'
                        )?.value
                    ) || 0,

                total: 0

            });

        }
    );


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


    localStorage.setItem(
        'salesOrders',
        JSON.stringify(
            salesOrders
        )
    );


    loadSOList();


    if (
        typeof loadDashboard ===
        'function'
    ) {

        loadDashboard();

    }


    detailEditMode =
        false;


    setDetailsEditMode(
        false
    );


    updateDetailButtons(
        so.status
    );


    await loadSOFiles(
        so.soNumber
    );


    calculateDetailTotals();


    alert(

        'Sales Order updated successfully!\n\n' +

        'SO: ' +
        so.soNumber +

        '\nSE: ' +
        so.se +

        '\nGrand Total: ' +

        formatMoney(
            so.grandTotal
        )

    );

}


/* =====================================================
   CREATE SO FILE SECTION
   Dynamically added
===================================================== */

function setupCreateSOFileSection() {

    const createPage =
        document.getElementById(
            'createSO'
        );


    if (!createPage) {

        return;

    }


    let section =
        document.getElementById(
            'createSOFilesSection'
        );


    if (!section) {

        section =
            document.createElement(
                'div'
            );


        section.id =
            'createSOFilesSection';


        section.className =
            'section';


        section.innerHTML = `

            <div class="table-header">

                <div>

                    <h2>
                        Sales Order Files
                    </h2>

                    <p class="subtitle">
                        Upload multiple PDF files.
                    </p>

                </div>

                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="selectCreateSOFiles()">

                    + UPLOAD FILE

                </button>

            </div>


            <input
                type="file"
                id="createSOFileInput"
                accept="application/pdf"
                multiple
                style="display:none;"
                onchange="handleCreateSOFiles(this.files)">


            <div
                id="createSOFilesList"
                class="so-file-list">

            </div>

        `;


        createPage.appendChild(
            section
        );

    }


    renderCreateSOFiles();

}


/* =====================================================
   SELECT CREATE FILES
===================================================== */

function selectCreateSOFiles() {

    const input =
        document.getElementById(
            'createSOFileInput'
        );


    if (input) {

        input.click();

    }

}


/* =====================================================
   HANDLE CREATE FILES
===================================================== */

function handleCreateSOFiles(
    files
) {

    if (!files) {

        return;

    }


    Array.from(files).forEach(
        function(file) {

            if (
                file.type !==
                'application/pdf'
            ) {

                alert(
                    file.name +
                    ' is not a PDF file.'
                );

                return;

            }


            const exists =
                soCreateFiles.some(
                    function(existing) {

                        return (
                            existing.name ===
                            file.name
                        ) &&
                        (
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


/* =====================================================
   RENDER CREATE FILES
===================================================== */

function renderCreateSOFiles() {

    const list =
        document.getElementById(
            'createSOFilesList'
        );


    if (!list) {

        return;

    }


    list.innerHTML =
        '';


    if (
        soCreateFiles.length === 0
    ) {

        list.innerHTML = `

            <div class="so-file-status">

                No files selected.

            </div>

        `;

        return;

    }


    soCreateFiles.forEach(
        function(file, index) {

            const row =
                document.createElement(
                    'div'
                );


            row.className =
                'so-file-row';


            row.innerHTML = `

                <div class="so-file-info">

                    <span class="file-icon">
                        📄
                    </span>

                    <div>

                        <strong>
                            ${escapeHTML(
                                file.name
                            )}
                        </strong>

                        <small>
                            ${formatFileSize(
                                file.size
                            )}
                        </small>

                    </div>

                </div>


                <div class="so-file-actions">

                    <button
                        type="button"
                        class="btn btn-danger"
                        onclick="removeCreateSOFile(${index})">

                        REMOVE

                    </button>

                </div>

            `;


            list.appendChild(
                row
            );

        }
    );

}


/* =====================================================
   REMOVE CREATE FILE
===================================================== */

function removeCreateSOFile(
    index
) {

    soCreateFiles.splice(
        index,
        1
    );


    renderCreateSOFiles();

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
   CREATE DETAILS FILE SECTION
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
                        Sales Order Files
                    </h2>

                    <p class="subtitle">
                        Uploaded files and revisions
                    </p>

                </div>

                <button
                    type="button"
                    class="btn btn-primary"
                    onclick="selectDetailSOFiles()">

                    + UPLOAD FILE

                </button>

            </div>


            <input
                type="file"
                id="detailSOFileInput"
                accept="application/pdf"
                multiple
                style="display:none;"
                onchange="handleDetailSOFiles(this.files)">


            <div
                id="detailSOFilesList"
                class="so-file-list">

            </div>

        `;


        const actionBar =
            detailsPage.querySelector(
                '.action-bar:last-child'
            );


        if (actionBar) {

            detailsPage.insertBefore(
                section,
                actionBar
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
   SELECT DETAIL FILES
===================================================== */

function selectDetailSOFiles() {

    if (!selectedSO) {

        alert(
            'Please select a Sales Order first.'
        );

        return;

    }


    const input =
        document.getElementById(
            'detailSOFileInput'
        );


    if (input) {

        input.click();

    }

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


        await saveSOFileToDB(
            selectedSO,
            file
        );

    }


    await loadSOFiles(
        selectedSO
    );

}


/* =====================================================
   RENDER EXISTING SO FILES
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
        files.length === 0
    ) {

        list.innerHTML = `

            <div class="so-file-status">

                No SO files uploaded yet.

            </div>

        `;

        return;

    }


    files.forEach(
        function(record) {

            const row =
                document.createElement(
                    'div'
                );


            row.className =
                'so-file-row';


            const date =
                new Date(
                    record.uploadedDate
                );


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
                            ${date.toLocaleString(
                                'en-PH'
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

        }
    );

}


/* =====================================================
   VIEW SO FILE
===================================================== */

async function viewSOFile(
    fileId
) {

    const db =
        await openSOFileDB();


    const record =
        await new Promise(
            function(resolve, reject) {

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

            }
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

}


/* =====================================================
   PRINT SO FILE
===================================================== */

async function printSOFile(
    fileId
) {

    const db =
        await openSOFileDB();


    const record =
        await new Promise(
            function(resolve, reject) {

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

            }
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


    setTimeout(
        function() {

            URL.revokeObjectURL(
                url
            );

        },
        60000
    );

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
            fileName;

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

    if (!bytes) {

        return '0 Bytes';

    }


    const units = [

        'Bytes',
        'KB',
        'MB',
        'GB'

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
    ).toFixed(
        2
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

    return (
        document.getElementById(
            id
        )?.value || ''
    ).trim();

}


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
            value;

    }

}


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
            value;

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

document.addEventListener(
    'DOMContentLoaded',
    function() {

        console.log(
            'LOGI-TECH Sales Order Module Loaded'
        );

    }
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

        }

    }
);
