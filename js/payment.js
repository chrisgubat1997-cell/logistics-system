/* =========================================================
   LOGIS-TECH SYSTEM
   PAYMENT MODULE
   =========================================================

   FILE:
   js/payment.js

   VERSION:
   20261006-01

   FEATURES:
   - Payment Summary Cards
   - Recent Payment
   - Customer Credit
   - Payment Search
   - Sales Order Search
   - Month / Year Filter
   - Dynamic Card Adjustment
   - Refresh
   - Prepare Payment
   - Google Sheets Database Data Source

   CARD FILTER LOGIC:

   NO FILTER:
   - Total Payment       = All payments
   - Today's Payment     = Today's payments
   - Paid This Month     = Current month payments
   - Pending Payment     = All pending payments

   MONTH / YEAR FILTER:
   - Total Payment       = Selected month/year
   - Today's Payment     = ₱0.00
   - Paid This Month     = ₱0.00
   - Pending Payment     = Selected month/year pending

========================================================= */


/* =========================================================
   MODULE STATE
========================================================= */

let paymentInitialized = false;

let paymentRecords = [];
let paymentSalesOrders = [];
let customerCreditRecords = [];
let customerCreditTransactions = [];
let paymentDeliveryReceipts = [];

let filteredPaymentRecords = [];
let filteredPaymentSalesOrders = [];


/* =========================================================
   STORAGE KEYS
========================================================= */

const PAYMENT_STORAGE_KEYS = [
    'logitechPayments',
    'logisTechPayments',
    'payments',
    'paymentRecords',
    'logitechPaymentRecords'
];

const SALES_ORDER_STORAGE_KEYS = [
    'logitechSalesOrders',
    'logisTechSalesOrders',
    'salesOrders',
    'salesOrderRecords'
];

const CUSTOMER_CREDIT_STORAGE_KEYS = [
    'logitechCustomerCredits',
    'logisTechCustomerCredits',
    'customerCredits',
    'CUSTOMER_CREDITS'
];

const CUSTOMER_CREDIT_TRANSACTION_STORAGE_KEYS = [
    'logitechCustomerCreditTransactions',
    'logisTechCustomerCreditTransactions',
    'customerCreditTransactions',
    'CUSTOMER_CREDIT_TRANSACTIONS'
];


const PAYMENT_DASHBOARD_API_URL = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";

async function paymentDashboardAPI(action) {
    const response = await fetch(PAYMENT_DASHBOARD_API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: action, data: {} }) });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch (error) { throw new Error("Invalid response from LOGIS-TECH database."); }
    if (!response.ok || !result || result.success === false) throw new Error(result && (result.message || result.error) || (action + " failed."));
    return result;
}

function paymentDashboardRows(result, keys) {
    for (const key of keys) if (result && Array.isArray(result[key])) return result[key];
    if (result && Array.isArray(result.records)) return result.records;
    if (result && Array.isArray(result.data)) return result.data;
    return [];
}

/* =========================================================
   INITIALIZE PAYMENT MODULE
========================================================= */

function initializePayment() {

    if (paymentInitialized) {
        console.log('Payment module already initialized.');
        return;
    }

    paymentInitialized = true;

    console.log(
        'LOGIS-TECH Payment Module initialized.'
    );

    if (typeof window.populatePaymentYears === 'function') {
        window.populatePaymentYears();
    }

    bindPaymentEvents();

    loadPaymentData();

}


/* =========================================================
   BIND EVENTS
========================================================= */

function bindPaymentEvents() {

    /* -----------------------------------------------------
       PREPARE PAYMENT
    ----------------------------------------------------- */

    const prepareBtn =
        document.getElementById(
            'preparePaymentBtn'
        );

    if (prepareBtn) {

        prepareBtn.addEventListener(
            'click',
            openCreatePaymentPage
        );

    }


    /* -----------------------------------------------------
       PAYMENT SEARCH TOGGLE
    ----------------------------------------------------- */

    const paymentSearchToggle =
        document.getElementById(
            'paymentSearchToggleBtn'
        );

    if (paymentSearchToggle) {

        paymentSearchToggle.addEventListener(
            'click',
            function () {

                const box =
                    document.getElementById(
                        'paymentSearchBox'
                    );

                if (!box) return;

                box.classList.toggle(
                    'active'
                );

                if (
                    box.classList.contains(
                        'active'
                    )
                ) {

                    const input =
                        document.getElementById(
                            'paymentSearchInput'
                        );

                    if (input) {
                        input.focus();
                    }

                }

            }
        );

    }


    /* -----------------------------------------------------
       PAYMENT SEARCH
    ----------------------------------------------------- */

    const paymentSearchInput =
        document.getElementById(
            'paymentSearchInput'
        );

    if (paymentSearchInput) {

        paymentSearchInput.addEventListener(
            'input',
            renderPaymentTable
        );

    }


    /* -----------------------------------------------------
       CLEAR PAYMENT SEARCH
    ----------------------------------------------------- */

    const paymentSearchClear =
        document.getElementById(
            'paymentSearchClearBtn'
        );

    if (paymentSearchClear) {

        paymentSearchClear.addEventListener(
            'click',
            function () {

                const input =
                    document.getElementById(
                        'paymentSearchInput'
                    );

                if (input) {
                    input.value = '';
                    renderPaymentTable();
                    input.focus();
                }

            }
        );

    }


    /* -----------------------------------------------------
       CUSTOMER CREDIT SEARCH
    ----------------------------------------------------- */
    const creditSearchToggle = document.getElementById('customerCreditSearchToggleBtn');
    if (creditSearchToggle) {
        creditSearchToggle.addEventListener('click', function () {
            const box = document.getElementById('customerCreditSearchBox');
            if (!box) return;
            box.classList.toggle('active');
            if (box.classList.contains('active')) {
                const input = document.getElementById('customerCreditSearchInput');
                if (input) input.focus();
            }
        });
    }

    const creditSearchInput = document.getElementById('customerCreditSearchInput');
    if (creditSearchInput) creditSearchInput.addEventListener('input', renderCustomerCreditTable);

    const creditSearchClear = document.getElementById('customerCreditSearchClearBtn');
    if (creditSearchClear) {
        creditSearchClear.addEventListener('click', function () {
            const input = document.getElementById('customerCreditSearchInput');
            if (input) {
                input.value = '';
                renderCustomerCreditTable();
                input.focus();
            }
        });
    }

    const closeCreditModalBtn = document.getElementById('closeCustomerCreditModalBtn');
    if (closeCreditModalBtn) closeCreditModalBtn.addEventListener('click', closeCustomerCreditModal);

    const closePaymentModalBtn = document.getElementById('closePaymentDetailModalBtn');
    if (closePaymentModalBtn) closePaymentModalBtn.addEventListener('click', closePaymentDetailModal);
    const paymentModal = document.getElementById('paymentDetailModal');
    if (paymentModal) paymentModal.addEventListener('click', function (event) { if (event.target && event.target.dataset.closePaymentModal === 'true') closePaymentDetailModal(); });
    const closeOutstandingModalBtn = document.getElementById('closeOutstandingSOModalBtn');
    if (closeOutstandingModalBtn) closeOutstandingModalBtn.addEventListener('click', closeOutstandingSOModal);
    const outstandingModal = document.getElementById('outstandingSOModal');
    if (outstandingModal) outstandingModal.addEventListener('click', function (event) { if (event.target && event.target.dataset.closeOutstandingModal === 'true') closeOutstandingSOModal(); });
    const outstandingSearch = document.getElementById('outstandingSOSearchInput');
    if (outstandingSearch) outstandingSearch.addEventListener('input', renderOutstandingSOTable);
    const outstandingRefresh = document.getElementById('refreshOutstandingSOBtn');
    if (outstandingRefresh) outstandingRefresh.addEventListener('click', loadPaymentData);
    const creditModal = document.getElementById('customerCreditModal');
    if (creditModal) {
        creditModal.addEventListener('click', function (event) {
            if (event.target && event.target.dataset.closeCreditModal === 'true') {
                closeCustomerCreditModal();
            }
        });
    }

    /* -----------------------------------------------------
       MONTH FILTER
    ----------------------------------------------------- */

    const monthFilter =
        document.getElementById(
            'paymentFilterMonth'
        );

    if (monthFilter) {

        monthFilter.addEventListener(
            'change',
            applyPaymentFilters
        );

    }


    /* -----------------------------------------------------
       YEAR FILTER
    ----------------------------------------------------- */

    const yearFilter =
        document.getElementById(
            'paymentFilterYear'
        );

    if (yearFilter) {

        yearFilter.addEventListener(
            'change',
            applyPaymentFilters
        );

    }


    /* -----------------------------------------------------
       CLEAR FILTER
    ----------------------------------------------------- */

    const clearFilterBtn =
        document.getElementById(
            'clearPaymentFilterBtn'
        );

    if (clearFilterBtn) {

        clearFilterBtn.addEventListener(
            'click',
            clearPaymentFilters
        );

    }


    /* -----------------------------------------------------
       REFRESH PAYMENT
    ----------------------------------------------------- */

    const refreshPaymentBtn =
        document.getElementById(
            'refreshPaymentBtn'
        );

    if (refreshPaymentBtn) {

        refreshPaymentBtn.addEventListener(
            'click',
            function () {

                loadPaymentData();

            }
        );

    }


    /* -----------------------------------------------------
       REFRESH SALES ORDER
    ----------------------------------------------------- */

    const refreshSOBtn =
        document.getElementById(
            'refreshCustomerCreditBtn'
        );

    if (refreshSOBtn) {

        refreshSOBtn.addEventListener(
            'click',
            function () {

                loadPaymentData();

            }
        );

    }

}


/* =========================================================
   LOAD PAYMENT DATA
========================================================= */

async function loadPaymentData() {
    const refreshButton = document.getElementById('refreshPaymentBtn');
    if (refreshButton) refreshButton.disabled = true;
    try {
        const results = await Promise.all([paymentDashboardAPI('getPayments'), paymentDashboardAPI('getSalesOrders')]);
        try { const drResult = await paymentDashboardAPI('getDeliveryReceipts'); paymentDeliveryReceipts = paymentDashboardRows(drResult, ['deliveryReceipts','deliveries','receipts']); } catch (drError) { console.warn('Delivery receipts unavailable for delivery status.', drError); paymentDeliveryReceipts = []; }
        paymentRecords = paymentDashboardRows(results[0], ['payments']).map(function (row) {
            return Object.assign({}, row, {
                paymentNo: row.PAYMENT_NO || row.PAYMENT_ID || row.paymentNo || row.paymentNumber || '',
                invoiceNo: row.INVOICE_NO || row.invoiceNo || '', siNo: row.SI_NO || row.siNo || '',
                soNo: row.SO_NUMBER || row.soNo || row.salesOrderNo || '', client: row.CLIENT_NAME || row.client || row.clientName || '',
                project: row.PROJECT || row.project || '', date: row.PAYMENT_DATE || row.paymentDate || row.date || row.CREATED_AT || '',
                amount: row.CURRENT_PAYMENT ?? row.currentPayment ?? row.AMOUNT ?? row.amount ?? 0,
                status: row.PAYMENT_STATUS || row.status || 'RECEIVED'
            });
        });
        paymentSalesOrders = paymentDashboardRows(results[1], ['salesOrders']).map(function (row) {
            return Object.assign({}, row, {
                soNo: row.SO_NUMBER || row.soNo || row.salesOrderNo || '', client: row.CLIENT_NAME || row.client || row.clientName || '',
                project: row.PROJECT || row.project || '', date: row.DATE_CREATION || row.SO_DATE || row.date || row.createdAt || '',
                total: row.GRAND_TOTAL ?? row.SO_TOTAL ?? row.TOTAL_AMOUNT ?? row.TOTAL ?? row.AMOUNT ?? row.total ?? row.grandTotal ?? 0,
                status: row.STATUS || row.status || ''
            });
        });
        try {
            const creditResults = await Promise.all([
                paymentDashboardAPI('getCustomerCredits'),
                paymentDashboardAPI('getCustomerCreditTransactions')
            ]);
            customerCreditRecords = paymentDashboardRows(creditResults[0], ['customerCredits', 'credits']);
            customerCreditTransactions = paymentDashboardRows(creditResults[1], ['customerCreditTransactions', 'transactions']);
        } catch (creditError) {
            console.warn('Customer credit ledger API is not available; credit records are not loaded from database.', creditError);
            customerCreditRecords = [];
            customerCreditTransactions = [];
        }
        if (typeof window.populatePaymentYears === 'function') {
            window.populatePaymentYears();
        }
        applyPaymentFilters();
        console.log('Payment data loaded from Google Sheets:', paymentRecords.length, 'payments;', paymentSalesOrders.length, 'sales orders.');
    } catch (error) {
        console.error('Payment database load failed:', error);
        ['totalPaymentValue', 'todaysPaymentValue', 'paidThisMonthValue', 'pendingPaymentValue'].forEach(function (id) {
            const element = document.getElementById(id);
            if (element) element.textContent = '—';
        });
        const recentBody = document.getElementById('recentPaymentBody');
        if (recentBody) recentBody.innerHTML = '<tr><td colspan="10" class="payment-empty-state">Unable to load payment records from the database. Click REFRESH to try again.</td></tr>';
        const creditBody = document.getElementById('customerCreditBody');
        if (creditBody) creditBody.innerHTML = '<tr><td colspan="5" class="payment-empty-state">Database connection failed. Refresh to try again.</td></tr>';
    } finally {
        if (refreshButton) refreshButton.disabled = false;
    }
}


/* =========================================================
   GET LOCAL STORAGE ARRAY
========================================================= */

function getStoredArray(keys) {

    for (
        let i = 0;
        i < keys.length;
        i++
    ) {

        const key = keys[i];

        try {

            const raw =
                localStorage.getItem(key);

            if (!raw) {
                continue;
            }

            const parsed =
                JSON.parse(raw);

            if (Array.isArray(parsed)) {
                return parsed;
            }

            /*
               Some systems store:
               {
                   data: [...]
               }
            */

            if (
                parsed &&
                Array.isArray(
                    parsed.data
                )
            ) {

                return parsed.data;

            }

            if (
                parsed &&
                Array.isArray(
                    parsed.records
                )
            ) {

                return parsed.records;

            }

        } catch (error) {

            console.warn(
                'Unable to read storage:',
                key,
                error
            );

        }

    }

    return [];

}


/* =========================================================
   POPULATE YEARS
========================================================= */

function populatePaymentYears() {

    const yearSelect =
        document.getElementById(
            'paymentFilterYear'
        );

    if (!yearSelect) {
        return;
    }

    /*
       Preserve All Years
    */

    yearSelect.innerHTML =
        '<option value="all">All Years</option>';

    const years = new Set();

    paymentRecords.forEach(
        function (payment) {

            const date =
                getPaymentDate(payment);

            if (!date) {
                return;
            }

            years.add(
                date.getFullYear()
            );

        }
    );

    /*
       Also get years from SO records
    */

    paymentSalesOrders.forEach(
        function (so) {

            const date =
                getSalesOrderDate(so);

            if (!date) {
                return;
            }

            years.add(
                date.getFullYear()
            );

        }
    );


    /*
       Current year always available
    */

    years.add(
        new Date().getFullYear()
    );


    const sortedYears =
        Array.from(years)
            .sort(
                function (a, b) {
                    return b - a;
                }
            );


    sortedYears.forEach(
        function (year) {

            const option =
                document.createElement(
                    'option'
                );

            option.value =
                String(year);

            option.textContent =
                String(year);

            yearSelect.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   APPLY PAYMENT FILTERS
========================================================= */

function applyPaymentFilters() {

    const month =
        getSelectedValue(
            'paymentFilterMonth'
        );

    const year =
        getSelectedValue(
            'paymentFilterYear'
        );


    const isFiltered =
        month !== 'all' ||
        year !== 'all';


    /*
       FILTER PAYMENT RECORDS
    */

    filteredPaymentRecords =
        paymentRecords.filter(
            function (payment) {

                return matchesMonthYear(
                    getPaymentDate(payment),
                    month,
                    year
                );

            }
        );


    /*
       FILTER SALES ORDERS
    */

    filteredPaymentSalesOrders =
        paymentSalesOrders.filter(
            function (so) {

                return matchesMonthYear(
                    getSalesOrderDate(so),
                    month,
                    year
                );

            }
        );


    /*
       UPDATE CARDS
    */

    updatePaymentCards(
        filteredPaymentRecords,
        isFiltered
    );


    /*
       RENDER TABLES
    */

    renderPaymentTable();
    renderOutstandingSOTable();
    renderCustomerCreditTable();

}


/* =========================================================
   MONTH / YEAR MATCH
========================================================= */

function matchesMonthYear(
    date,
    month,
    year
) {

    /*
       If no date exists,
       don't include when a filter
       is active.
    */

    if (!date) {

        return (
            month === 'all' &&
            year === 'all'
        );

    }


    if (
        year !== 'all' &&
        String(
            date.getFullYear()
        ) !== String(year)
    ) {

        return false;

    }


    if (
        month !== 'all' &&
        String(
            date.getMonth() + 1
        ).padStart(2, '0') !==
        String(month).padStart(2, '0')
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   UPDATE PAYMENT CARDS
========================================================= */

function updatePaymentCards(
    records,
    isFiltered
) {

    /*
       -----------------------------------------
       FILTERED MODE
       -----------------------------------------
    */

    if (isFiltered) {

        const totalPayment =
            records.reduce(
                function (
                    total,
                    payment
                ) {

                    return (
                        total +
                        getPaymentAmount(
                            payment
                        )
                    );

                },
                0
            );


        const pendingPayment =
            records
                .filter(
                    function (payment) {

                        return isPendingPayment(
                            payment
                        );

                    }
                )
                .reduce(
                    function (
                        total,
                        payment
                    ) {

                        return (
                            total +
                            getPaymentAmount(
                                payment
                            )
                        );

                    },
                    0
                );


        /*
           FILTERED MODE:
           Today's Payment = 0
           Paid This Month = 0
        */

        setPaymentCard(
            'totalPaymentValue',
            totalPayment
        );

        setPaymentCard(
            'todaysPaymentValue',
            0
        );

        setPaymentCard(
            'paidThisMonthValue',
            0
        );

        setPaymentCard(
            'pendingPaymentValue',
            pendingPayment
        );

        return;

    }


    /*
       -----------------------------------------
       NORMAL MODE
       -----------------------------------------
    */

    const totalPayment =
        records.reduce(
            function (
                total,
                payment
            ) {

                return (
                    total +
                    getPaymentAmount(
                        payment
                    )
                );

            },
            0
        );


    const today =
        new Date();


    const todaysPayment =
        records
            .filter(
                function (payment) {

                    return isSameDate(
                        getPaymentDate(
                            payment
                        ),
                        today
                    );

                }
            )
            .reduce(
                function (
                    total,
                    payment
                ) {

                    return (
                        total +
                        getPaymentAmount(
                            payment
                        )
                    );

                },
                0
            );


    const paidThisMonth =
        records
            .filter(
                function (payment) {

                    return isSameMonth(
                        getPaymentDate(
                            payment
                        ),
                        today
                    );

                }
            )
            .reduce(
                function (
                    total,
                    payment
                ) {

                    return (
                        total +
                        getPaymentAmount(
                            payment
                        )
                    );

                },
                0
            );


    const pendingPayment =
        records
            .filter(
                function (payment) {

                    return isPendingPayment(
                        payment
                    );

                }
            )
            .reduce(
                function (
                    total,
                    payment
                ) {

                    return (
                        total +
                        getPaymentAmount(
                            payment
                        )
                    );

                },
                0
            );


    setPaymentCard(
        'totalPaymentValue',
        totalPayment
    );

    setPaymentCard(
        'todaysPaymentValue',
        todaysPayment
    );

    setPaymentCard(
        'paidThisMonthValue',
        paidThisMonth
    );

    setPaymentCard(
        'pendingPaymentValue',
        pendingPayment
    );

}


/* =========================================================
   SET CARD VALUE
========================================================= */

function setPaymentCard(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );

    if (!element) {
        return;
    }

    element.textContent =
        formatCurrency(value);

}


/* =========================================================
   RENDER PAYMENT TABLE
========================================================= */

function renderPaymentTable() {

    const tbody =
        document.getElementById(
            'recentPaymentBody'
        );

    if (!tbody) {
        return;
    }


    const searchInput =
        document.getElementById(
            'paymentSearchInput'
        );


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : '';


    let records =
        filteredPaymentRecords;


    /*
       SEARCH
    */

    if (search) {

        records =
            records.filter(
                function (payment) {

                    const searchable =
                        [

                            getPaymentNo(
                                payment
                            ),

                            getInvoiceNo(
                                payment
                            ),

                            getSINo(
                                payment
                            ),

                            getSONo(
                                payment
                            ),

                            getClientName(
                                payment
                            ),

                            getProjectName(
                                payment
                            ),

                            getPaymentStatus(
                                payment
                            )

                        ]
                        .join(' ')
                        .toLowerCase();


                    return searchable.includes(
                        search
                    );

                }
            );

    }


    /*
       EMPTY
    */

    if (!records.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="payment-empty-state"
                >
                    No payment records found.
                </td>
            </tr>
        `;

        return;

    }


    /*
       SORT:
       Newest first
    */

    records =
        [...records].sort(
            function (a, b) {

                const dateA =
                    getPaymentDate(a);

                const dateB =
                    getPaymentDate(b);

                return (
                    getDateTime(dateB) -
                    getDateTime(dateA)
                );

            }
        );


    tbody.innerHTML = records.map(function (payment) { return createPaymentRow(payment); }).join('');
    tbody.querySelectorAll('.recent-payment-row').forEach(function(row){row.addEventListener('dblclick',function(event){if(event.target&&event.target.closest('button'))return;viewPaymentRecord(row.getAttribute('data-payment-no')||'');});});
}


/* =========================================================
   CREATE PAYMENT ROW
========================================================= */

function createPaymentRow(
    payment
) {

    const paymentNo =
        getPaymentNo(payment);

    const invoiceNo =
        getInvoiceNo(payment);

    const siNo =
        getSINo(payment);

    const soNo =
        getSONo(payment);

    const client =
        getClientName(payment);

    const project =
        getProjectName(payment);

    const date =
        formatDate(
            getPaymentDate(payment)
        );

    const amount =
        formatCurrency(
            getPaymentAmount(payment)
        );

    const status =
        getPaymentStatus(payment);


    const statusClass =
        getPaymentStatusClass(
            status
        );


    return `
        <tr class="recent-payment-row" data-payment-no="${escapeAttribute(paymentNo)}" title="Double-click to view payment details">

            <td>
                ${escapeHTML(paymentNo)}
            </td>

            <td>
                ${escapeHTML(invoiceNo)}
            </td>

            <td>
                ${escapeHTML(siNo)}
            </td>

            <td>
                ${escapeHTML(soNo)}
            </td>

            <td>
                ${escapeHTML(client)}
            </td>

            <td>
                ${escapeHTML(project)}
            </td>

            <td>
                ${escapeHTML(date)}
            </td>

            <td class="payment-amount-cell">
                ${escapeHTML(amount)}
            </td>

            <td>
                <span
                    class="payment-status ${statusClass}"
                >
                    ${escapeHTML(status)}
                </span>
            </td>

            <td>

                <button
                    type="button"
                    class="payment-action-btn"
                    onclick="viewPaymentRecord('${escapeAttribute(paymentNo)}')"
                >
                    VIEW
                </button>

            </td>

        </tr>
    `;

}


/* =========================================================
   CUSTOMER CREDIT TABLE + DETAILS
========================================================= */

function creditField(record, fields) {
    for (const field of fields) {
        const value = record && record[field];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
}

function getCreditCustomerId(record) {
    return String(creditField(record, ['CUSTOMER_ID', 'customerId', 'customerID', 'customer_id', 'id']) || '');
}

function getCreditCustomerName(record) {
    return String(creditField(record, ['CLIENT_NAME', 'clientName', 'client', 'CUSTOMER_NAME', 'customerName', 'customer', 'name']) || 'Unknown Customer');
}

function getCreditAmount(record) {
    return toNumber(creditField(record, ['AVAILABLE_CREDIT', 'availableCredit', 'available_credit', 'CREDIT_BALANCE', 'creditBalance', 'BALANCE', 'balance', 'AVAILABLE_BALANCE', 'availableBalance']));
}

function getCreditDate(record) {
    return creditField(record, ['TXN_DATE', 'CREDIT_DATE', 'UPDATED_AT', 'updatedAt', 'CREATED_AT', 'createdAt', 'PAYMENT_DATE', 'paymentDate', 'DATE', 'date']);
}

function getCreditCustomerKey(record) {
    return getCreditCustomerId(record).trim().toLowerCase() || getCreditCustomerName(record).trim().toLowerCase();
}

function buildCustomerCreditRows() {
    const map = new Map();

    // Prefer the customer credit balance records when available.
    customerCreditRecords.forEach(function (record) {
        const key = getCreditCustomerKey(record);
        if (!key) return;
        const balance = getCreditAmount(record);
        const existing = map.get(key) || {
            customerId: getCreditCustomerId(record),
            customerName: getCreditCustomerName(record),
            availableCredit: 0,
            lastCreditDate: getCreditDate(record),
            source: record
        };
        existing.customerId = existing.customerId || getCreditCustomerId(record);
        existing.customerName = getCreditCustomerName(record) || existing.customerName;
        existing.availableCredit = balance;
        existing.lastCreditDate = getCreditDate(record) || existing.lastCreditDate;
        existing.source = record;
        map.set(key, existing);
    });

    // If no balance cache is present, derive balances from saved payment records.
    // This uses the credit columns, never the full cash payment amount.
    if (!map.size) {
        paymentRecords.forEach(function (payment) {
            const customerId = String(creditField(payment, ['CUSTOMER_ID', 'customerId', 'customerID', 'customer_id']) || '');
            const customerName = getCreditCustomerName(payment);
            const key = customerId.trim().toLowerCase() || customerName.trim().toLowerCase();
            if (!key || key === 'unknown customer') return;

            const addedRaw = creditField(payment, ['CREDIT_ADDED', 'creditAdded', 'credit_added']);
            const appliedRaw = creditField(payment, ['CREDIT_APPLIED', 'creditApplied', 'credit_applied']);
            const added = toNumber(addedRaw);
            const applied = toNumber(appliedRaw);
            if (added <= 0 && applied <= 0) return;

            const row = map.get(key) || {
                customerId: customerId,
                customerName: customerName,
                availableCredit: 0,
                lastCreditDate: getPaymentDate(payment),
                source: payment
            };
            row.customerId = row.customerId || customerId;
            row.customerName = customerName || row.customerName;
            row.availableCredit += added - applied;
            const paymentDate = getPaymentDate(payment);
            if (paymentDate && (!row.lastCreditDate || getDateTime(paymentDate) > getDateTime(row.lastCreditDate))) {
                row.lastCreditDate = paymentDate;
            }
            map.set(key, row);
        });
    }

    return Array.from(map.values())
        .map(function (row) {
            row.availableCredit = Math.max(0, Math.round((row.availableCredit + Number.EPSILON) * 100) / 100);
            return row;
        })
        .filter(function (row) { return row.availableCredit > 0; })
        .sort(function (a, b) { return a.customerName.localeCompare(b.customerName); });
}

function renderCustomerCreditTable() {
    const tbody = document.getElementById('customerCreditBody');
    if (!tbody) return;

    const input = document.getElementById('customerCreditSearchInput');
    const search = input ? input.value.trim().toLowerCase() : '';
    let records = buildCustomerCreditRows();

    if (search) {
        records = records.filter(function (row) {
            return (row.customerId + ' ' + row.customerName).toLowerCase().includes(search);
        });
    }

    if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="payment-empty-state">No customers with available credit found.</td></tr>';
        return;
    }

    tbody.innerHTML = records.map(function (row) {
        const key = row.customerId || row.customerName;
        const date = row.lastCreditDate instanceof Date
            ? formatDate(row.lastCreditDate)
            : (row.lastCreditDate ? formatDate(parseDateValue(row.lastCreditDate)) : '—');
        return `
            <tr class="customer-credit-row" data-credit-customer="${escapeAttribute(key)}" title="Double-click to view customer credit details">
                <td>${escapeHTML(row.customerId || '—')}</td>
                <td>${escapeHTML(row.customerName)}</td>
                <td class="payment-amount-cell customer-credit-amount">${escapeHTML(formatCurrency(row.availableCredit))}</td>
                <td>${escapeHTML(date || '—')}</td>
                <td><button type="button" class="payment-action-btn" onclick="viewCustomerCredit('${escapeAttribute(key)}')">VIEW</button></td>
            </tr>
        `;
    }).join('');

    tbody.querySelectorAll('.customer-credit-row').forEach(function (rowElement) {
        rowElement.addEventListener('dblclick', function () {
            viewCustomerCredit(rowElement.getAttribute('data-credit-customer') || '');
        });
    });
}

function parseDateValue(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function viewCustomerCredit(customerKey) {
    const row = buildCustomerCreditRows().find(function (item) {
        return (item.customerId || item.customerName) === customerKey;
    });
    if (!row) {
        alert('Customer credit record not found.');
        return;
    }

    const modal = document.getElementById('customerCreditModal');
    if (!modal) return;

    const setText = function (id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    setText('customerCreditModalTitle', 'Customer Credit Details');
    setText('customerCreditModalSubtitle', 'Available credit and recorded credit transactions');
    setText('customerCreditDetailName', row.customerName || '—');
    setText('customerCreditDetailId', row.customerId || '—');
    setText('customerCreditDetailBalance', formatCurrency(row.availableCredit));

    const matchingTransactions = customerCreditTransactions.filter(function (txn) {
        const txnKey = getCreditCustomerKey(txn);
        return txnKey && txnKey === getCreditCustomerKey({
            CUSTOMER_ID: row.customerId,
            CLIENT_NAME: row.customerName
        });
    });

    let transactions = matchingTransactions.map(function (txn) {
        return {
            date: creditField(txn, ['TXN_DATE', 'DATE', 'date', 'CREATED_AT', 'createdAt']),
            type: creditField(txn, ['TXN_TYPE', 'transactionType', 'type']) || 'CREDIT',
            reference: creditField(txn, ['REFERENCE_NO', 'PAYMENT_NO', 'paymentNo', 'referenceNo']) || '—',
            so: creditField(txn, ['SO_NUMBER', 'soNumber', 'soNo']) || '—',
            amount: toNumber(creditField(txn, ['AMOUNT', 'amount', 'CREDIT_AMOUNT', 'creditAmount'])),
            remarks: creditField(txn, ['REMARKS', 'remarks', 'NOTES', 'notes']) || '—'
        };
    });

    if (!transactions.length) {
        transactions = paymentRecords.filter(function (payment) {
            const paymentKey = getCreditCustomerKey(payment);
            const rowKey = getCreditCustomerKey({ CUSTOMER_ID: row.customerId, CLIENT_NAME: row.customerName });
            const added = toNumber(creditField(payment, ['CREDIT_ADDED', 'creditAdded', 'credit_added']));
            const applied = toNumber(creditField(payment, ['CREDIT_APPLIED', 'creditApplied', 'credit_applied']));
            return paymentKey === rowKey && (added > 0 || applied > 0);
        }).map(function (payment) {
            const added = toNumber(creditField(payment, ['CREDIT_ADDED', 'creditAdded', 'credit_added']));
            const applied = toNumber(creditField(payment, ['CREDIT_APPLIED', 'creditApplied', 'credit_applied']));
            return {
                date: getPaymentDate(payment),
                type: added > 0 ? 'CREDIT ADDED' : 'CREDIT APPLIED',
                reference: getPaymentNo(payment),
                so: getSONo(payment),
                amount: added > 0 ? added : applied,
                remarks: creditField(payment, ['REMARKS', 'remarks']) || (added > 0 ? 'Overpayment credit' : 'Credit applied to SO')
            };
        });
    }

    const txnBody = document.getElementById('customerCreditTransactionsBody');
    if (txnBody) {
        if (!transactions.length) {
            txnBody.innerHTML = '<tr><td colspan="6" class="payment-empty-state">No credit transaction details are available in the loaded records.</td></tr>';
        } else {
            transactions.sort(function (a, b) {
                return getDateTime(parseDateValue(b.date)) - getDateTime(parseDateValue(a.date));
            });
            txnBody.innerHTML = transactions.map(function (txn) {
                const parsedDate = parseDateValue(txn.date);
                const date = parsedDate ? formatDate(parsedDate) : (txn.date || '—');
                return `<tr>
                    <td>${escapeHTML(date)}</td>
                    <td>${escapeHTML(txn.type)}</td>
                    <td>${escapeHTML(txn.reference)}</td>
                    <td>${escapeHTML(txn.so)}</td>
                    <td class="payment-amount-cell">${escapeHTML(formatCurrency(txn.amount))}</td>
                    <td>${escapeHTML(txn.remarks)}</td>
                </tr>`;
            }).join('');
        }
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
}

function closeCustomerCreditModal() {
    const modal = document.getElementById('customerCreditModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
}

window.viewCustomerCredit = viewCustomerCredit;

/* =========================================================
   RENDER SALES ORDER TABLE
========================================================= */

function renderSalesOrderTable() {

    const tbody =
        document.getElementById(
            'recentPaymentSalesOrderBody'
        );

    if (!tbody) {
        return;
    }


    const searchInput =
        document.getElementById(
            'salesOrderPaymentSearchInput'
        );


    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : '';


    let records =
        filteredPaymentSalesOrders;


    if (search) {

        records =
            records.filter(
                function (so) {

                    const searchable =
                        [

                            getSONo(so),

                            getClientName(so),

                            getProjectName(so),

                            getSODateText(so),

                            getInvoiceNo(so),

                            getPO(so)

                        ]
                        .join(' ')
                        .toLowerCase();


                    return searchable.includes(
                        search
                    );

                }
            );

    }


    if (!records.length) {

        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="payment-empty-state"
                >
                    No sales order records found.
                </td>
            </tr>
        `;

        return;

    }


    records =
        [...records].sort(
            function (a, b) {

                const dateA =
                    getSalesOrderDate(a);

                const dateB =
                    getSalesOrderDate(b);

                return (
                    getDateTime(dateB) -
                    getDateTime(dateA)
                );

            }
        );


    tbody.innerHTML =
        records.map(
            function (so) {

                return createSalesOrderRow(
                    so
                );

            }
        ).join('');

}


/* =========================================================
   CREATE SALES ORDER ROW
========================================================= */

function createSalesOrderRow(
    so
) {

    const soNo =
        getSONo(so);

    const client =
        getClientName(so);

    const project =
        getProjectName(so);

    const date =
        formatDate(
            getSalesOrderDate(so)
        );

    const invoiceNo =
        getInvoiceNo(so);

    const total =
        getSalesOrderTotal(so);

    const paid =
        getSalesOrderPaid(so);

    const balance =
        Math.max(
            0,
            total - paid
        );


    const status =
        getSalesOrderPaymentStatus(
            so,
            balance
        );


    return `
        <tr>

            <td>
                ${escapeHTML(soNo)}
            </td>

            <td>
                ${escapeHTML(client)}
            </td>

            <td>
                ${escapeHTML(project)}
            </td>

            <td>
                ${escapeHTML(date)}
            </td>

            <td>
                ${escapeHTML(invoiceNo)}
            </td>

            <td class="payment-amount-cell">
                ${escapeHTML(
                    formatCurrency(total)
                )}
            </td>

            <td class="payment-amount-cell">
                ${escapeHTML(
                    formatCurrency(paid)
                )}
            </td>

            <td class="payment-amount-cell">
                ${escapeHTML(
                    formatCurrency(balance)
                )}
            </td>

            <td>
                <span
                    class="payment-status ${getPaymentStatusClass(status)}"
                >
                    ${escapeHTML(status)}
                </span>
            </td>

            <td>

                <button
                    type="button"
                    class="payment-action-btn"
                    onclick="viewSalesOrderPayment('${escapeAttribute(soNo)}')"
                >
                    VIEW
                </button>

            </td>

        </tr>
    `;

}


/* =========================================================
   VIEW PAYMENT
========================================================= */

function viewPaymentRecord(paymentNo) {
    const payment = paymentRecords.find(function (record) { return getPaymentNo(record) === paymentNo; });
    if (!payment) { console.warn('Payment record not found:', paymentNo); return; }
    const setText = function (id, value) { const el = document.getElementById(id); if (el) el.textContent = value || '—'; };
    setText('paymentDetailModalTitle', 'Payment Details');
    setText('paymentDetailModalSubtitle', 'Saved payment transaction from the LOGIS-TECH database');
    setText('paymentDetailNo', getPaymentNo(payment));
    setText('paymentDetailDate', getPaymentDate(payment) ? formatDate(getPaymentDate(payment)) : '—');
    setText('paymentDetailClient', getClientName(payment)); setText('paymentDetailSO', getSONo(payment));
    setText('paymentDetailInvoice', getInvoiceNo(payment)); setText('paymentDetailSI', getSINo(payment));
    setText('paymentDetailProject', getProjectName(payment));
    setText('paymentDetailMethod', creditField(payment, ['PAYMENT_METHOD','paymentMethod','method']) || '—');
    setText('paymentDetailReceipt', creditField(payment, ['RECEIPT_NO','receiptNo','receiptNumber']) || '—');
    setText('paymentDetailReference', creditField(payment, ['REFERENCE_NO','referenceNo','referenceNumber']) || '—');
    setText('paymentDetailAmount', formatCurrency(getPaymentAmount(payment)));
    setText('paymentDetailStatus', getPaymentStatus(payment));
    setText('paymentDetailRemarks', creditField(payment, ['REMARKS','remarks','NOTES','notes']) || '—');
    const modal = document.getElementById('paymentDetailModal');
    if (modal) { modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); }
}
function closePaymentDetailModal() {
    const modal = document.getElementById('paymentDetailModal'); if (!modal) return;
    modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true');
}
window.viewPaymentRecord = viewPaymentRecord;
function normalizePaymentSOKey(value) { return String(value || '').trim().toUpperCase().replace(/[\s-]+/g,''); }
function getOutstandingSOPaid(soNo) {
    const key = normalizePaymentSOKey(soNo);
    return paymentRecords.reduce(function (sum,p) {
        if (normalizePaymentSOKey(getSONo(p)) !== key) return sum;
        const st = String(getPaymentStatus(p)||'').trim().toUpperCase();
        if (['CANCELLED','CANCELED','VOID','VOIDED','REJECTED'].includes(st)) return sum;
        const applied = creditField(p,['SO_APPLIED_AMOUNT','soAppliedAmount','SO_AMOUNT_APPLIED','soAmountApplied']);
        return sum + toNumber(applied !== '' ? applied : getPaymentAmount(p));
    },0);
}
function getOutstandingSODeliveryStatus(so) {
    const explicit = String(creditField(so,['DELIVERY_STATUS','DELIVERY_PROGRESS','deliveryStatus','deliveryProgress'])||'').trim().toUpperCase().replace(/[ _-]+/g,' ');
    if (explicit.includes('FULLY DELIVERED') || explicit === 'COMPLETED DELIVERY') return 'FULLY DELIVERED';
    if (explicit.includes('PARTIALLY DELIVERED') || explicit === 'PARTIAL DELIVERY') return 'PARTIALLY DELIVERED';
    const soKey = normalizePaymentSOKey(getSONo(so));
    const drs = paymentDeliveryReceipts.filter(function(dr) {
        const ref = creditField(dr,['SO_NUMBER','SO_NO','SALES_ORDER_NO','soNumber','soNo','salesOrderNo','salesOrderNumber']);
        const st = String(creditField(dr,['STATUS','DR_STATUS','status','drStatus'])||'').trim().toUpperCase().replace(/[ _-]+/g,'_');
        return normalizePaymentSOKey(ref) === soKey && !['CANCELLED','CANCELED','VOID','VOIDED'].includes(st);
    });
    if (!drs.length) return 'UNDELIVERED';
    const delivered = drs.filter(function(dr) {
        const st = String(creditField(dr,['STATUS','DR_STATUS','status','drStatus'])||'').trim().toUpperCase().replace(/[ _-]+/g,'_');
        return !!creditField(dr,['DATE_DELIVERED','DELIVERED_DATE','DATE_DELIVERY','dateDelivered','deliveredDate']) || ['COMPLETED','DELIVERED','FULLY_DELIVERED','FOR_INVOICE','FOR_BILLING'].includes(st);
    });
    if (!delivered.length) return 'UNDELIVERED';
    const soItems = Array.isArray(so.items) ? so.items : (Array.isArray(so.ITEMS) ? so.ITEMS : (Array.isArray(so.SO_ITEMS) ? so.SO_ITEMS : []));
    const itemsOf = function(dr) { return Array.isArray(dr.items) ? dr.items : (Array.isArray(dr.ITEMS) ? dr.ITEMS : (Array.isArray(dr.DR_ITEMS) ? dr.DR_ITEMS : [])); };
    const ordered = soItems.reduce(function(sum,it){return sum+toNumber(creditField(it,['QTY','QUANTITY','ORDER_QTY','ORDERED_QTY','qty','quantity']));},0);
    if (ordered > 0) {
        const qty = delivered.reduce(function(sum,dr){return sum+itemsOf(dr).reduce(function(a,it){return a+toNumber(creditField(it,['DELIVERED_QTY','QTY_DELIVERED','QUANTITY_DELIVERED','QTY','QUANTITY','qty','quantity']));},0);},0);
        return qty >= ordered - 0.0001 ? 'FULLY DELIVERED' : (qty > 0 ? 'PARTIALLY DELIVERED' : 'UNDELIVERED');
    }
    return delivered.length === drs.length ? 'FULLY DELIVERED' : 'PARTIALLY DELIVERED';
}
function getOutstandingSORows(search) {
    const q = String(search||'').trim().toLowerCase();
    return paymentSalesOrders.map(function(so) {
        const no=getSONo(so), total=getSalesOrderTotal(so), paid=getOutstandingSOPaid(no);
        return {so:so,soNo:no,total:total,paid:paid,balance:Math.max(0,total-paid),delivery:getOutstandingSODeliveryStatus(so)};
    }).filter(function(r) {
        const st=String(creditField(r.so,['STATUS','status'])||'').trim().toUpperCase();
        const hay=[r.soNo,getClientName(r.so),getProjectName(r.so),r.delivery].join(' ').toLowerCase();
        return r.soNo && r.balance>0.005 && !['CANCELLED','CANCELED','VOID','VOIDED'].includes(st) && (!q||hay.includes(q));
    }).sort(function(a,b){return b.balance-a.balance;});
}
function renderOutstandingSOTable() {
    const body=document.getElementById('outstandingSOTableBody'); if(!body)return;
    const input=document.getElementById('outstandingSOSearchInput');
    const rows=getOutstandingSORows(input?input.value:'');
    if(!rows.length){body.innerHTML='<tr><td colspan="8" class="payment-empty-state">No unpaid Sales Orders or outstanding balances found.</td></tr>';return;}
    body.innerHTML=rows.map(function(r,i){
        const cl=r.delivery==='FULLY DELIVERED'?'outstanding-delivery-full':r.delivery==='PARTIALLY DELIVERED'?'outstanding-delivery-partial':'outstanding-delivery-none';
        return '<tr class="outstanding-so-row" data-outstanding-index="'+i+'" title="Double-click to view Sales Order balance details"><td>'+escapeHTML(r.soNo)+'</td><td>'+escapeHTML(getClientName(r.so))+'</td><td>'+escapeHTML(getProjectName(r.so))+'</td><td class="payment-amount-cell">'+escapeHTML(formatCurrency(r.total))+'</td><td class="payment-amount-cell">'+escapeHTML(formatCurrency(r.paid))+'</td><td class="payment-amount-cell outstanding-balance-value">'+escapeHTML(formatCurrency(r.balance))+'</td><td><span class="outstanding-delivery-status '+cl+'">'+escapeHTML(r.delivery)+'</span></td><td><button type="button" class="payment-action-btn" onclick="viewOutstandingSO('+i+')">VIEW</button></td></tr>';
    }).join('');
    body.querySelectorAll('.outstanding-so-row').forEach(function(tr){tr.addEventListener('dblclick',function(ev){if(ev.target&&ev.target.closest('button'))return;viewOutstandingSO(Number(tr.getAttribute('data-outstanding-index')));});});
}
function viewOutstandingSO(index) {
    const input=document.getElementById('outstandingSOSearchInput');
    const r=getOutstandingSORows(input?input.value:'')[index]; if(!r)return;
    const set=function(id,val){const el=document.getElementById(id);if(el)el.textContent=val||'—';};
    set('outstandingSOModalTitle',r.soNo+' — Outstanding Balance');set('outstandingSODetailClient',getClientName(r.so));
    set('outstandingSODetailProject',getProjectName(r.so));set('outstandingSODetailTotal',formatCurrency(r.total));
    set('outstandingSODetailPaid',formatCurrency(r.paid));set('outstandingSODetailBalance',formatCurrency(r.balance));set('outstandingSODetailDelivery',r.delivery);
    const modal=document.getElementById('outstandingSOModal');if(modal){modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');}
}
function closeOutstandingSOModal(){const modal=document.getElementById('outstandingSOModal');if(!modal)return;modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');}
window.viewOutstandingSO=viewOutstandingSO;

/* =========================================================
   VIEW SALES ORDER PAYMENT
========================================================= */

function viewSalesOrderPayment(
    soNo
) {

    const so =
        paymentSalesOrders.find(
            function (record) {

                return (
                    getSONo(record) ===
                    soNo
                );

            }
        );


    if (!so) {

        alert(
            'Sales Order not found.'
        );

        return;

    }


    alert(
        'Sales Order: ' +
        soNo +
        '\n\n' +
        'Client: ' +
        getClientName(so) +
        '\n' +
        'Project: ' +
        getProjectName(so) +
        '\n' +
        'Total: ' +
        formatCurrency(
            getSalesOrderTotal(so)
        ) +
        '\n' +
        'Paid: ' +
        formatCurrency(
            getSalesOrderPaid(so)
        ) +
        '\n' +
        'Balance: ' +
        formatCurrency(
            Math.max(
                0,
                getSalesOrderTotal(so) -
                getSalesOrderPaid(so)
            )
        )
    );

}


/* =========================================================
   CLEAR FILTER
========================================================= */

function clearPaymentFilters() {

    const month =
        document.getElementById(
            'paymentFilterMonth'
        );

    const year =
        document.getElementById(
            'paymentFilterYear'
        );


    if (month) {
        month.value = 'all';
    }

    if (year) {
        year.value = 'all';
    }


    applyPaymentFilters();

}


/* =========================================================
   PREPARE PAYMENT
========================================================= */

function openCreatePaymentPage() {

    /*
       Same workflow as Invoice.
    */

    window.location.href =
        'pages/create-payment.html';

}


/* =========================================================
   GET PAYMENT DATE
========================================================= */

function getPaymentDate(
    payment
) {

    if (!payment) {
        return null;
    }


    const value =
        payment.date ??
        payment.paymentDate ??
        payment.datePaid ??
        payment.paidDate ??
        payment.transactionDate ??
        payment.createdAt;


    return parseDateValue(
        value
    );

}


/* =========================================================
   GET SALES ORDER DATE
========================================================= */

function getSalesOrderDate(
    so
) {

    if (!so) {
        return null;
    }


    const value =
        so.date ??
        so.soDate ??
        so.salesOrderDate ??
        so.orderDate ??
        so.createdAt;


    return parseDateValue(
        value
    );

}


/* =========================================================
   PARSE DATE
========================================================= */

function parseDateValue(
    value
) {

    if (!value) {
        return null;
    }


    if (
        value instanceof Date
    ) {

        return isNaN(
            value.getTime()
        )
            ? null
            : value;

    }


    /*
       Timestamp number
    */

    if (
        typeof value === 'number'
    ) {

        const date =
            new Date(value);

        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    const text =
        String(value).trim();


    /*
       YYYY-MM-DD
       Use local date parts to avoid
       timezone shifting.
    */

    const match =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (match) {

        const year =
            Number(match[1]);

        const month =
            Number(match[2]) - 1;

        const day =
            Number(match[3]);


        const date =
            new Date(
                year,
                month,
                day
            );


        return isNaN(
            date.getTime()
        )
            ? null
            : date;

    }


    const parsed =
        new Date(text);


    return isNaN(
        parsed.getTime()
    )
        ? null
        : parsed;

}


/* =========================================================
   PAYMENT AMOUNT
========================================================= */

function getPaymentAmount(
    payment
) {

    if (!payment) {
        return 0;
    }


    const value =
        payment.amount ??
        payment.paymentAmount ??
        payment.amountPaid ??
        payment.paidAmount ??
        payment.totalPaid ??
        payment.totalAmount ??
        0;


    return toNumber(value);

}


/* =========================================================
   SALES ORDER TOTAL
========================================================= */

function getSalesOrderTotal(
    so
) {

    if (!so) {
        return 0;
    }


    const value =
        so.total ??
        so.totalAmount ??
        so.totalSales ??
        so.grandTotal ??
        so.amount ??
        so.orderTotal ??
        0;


    return toNumber(value);

}


/* =========================================================
   SALES ORDER PAID
========================================================= */

function getSalesOrderPaid(
    so
) {

    if (!so) {
        return 0;
    }


    const value =
        so.paid ??
        so.amountPaid ??
        so.totalPaid ??
        so.paymentReceived ??
        so.paidAmount ??
        0;


    return toNumber(value);

}


/* =========================================================
   PAYMENT NUMBER
========================================================= */

function getPaymentNo(
    payment
) {

    return String(
        payment?.paymentNo ??
        payment?.paymentNumber ??
        payment?.paymentID ??
        payment?.id ??
        '-'
    );

}


/* =========================================================
   INVOICE NUMBER
========================================================= */

function getInvoiceNo(
    record
) {

    return String(
        record?.invoiceNo ??
        record?.invoiceNumber ??
        record?.invoice ??
        record?.siNo ??
        '-'
    );

}


/* =========================================================
   SI NUMBER
========================================================= */

function getSINo(
    record
) {

    return String(
        record?.siNo ??
        record?.salesInvoiceNo ??
        record?.salesInvoice ??
        '-'
    );

}


/* =========================================================
   SO NUMBER
========================================================= */

function getSONo(
    record
) {

    return String(
        record?.soNo ??
        record?.salesOrderNo ??
        record?.salesOrderNumber ??
        record?.SO ??
        record?.so ??
        '-'
    );

}


/* =========================================================
   CLIENT
========================================================= */

function getClientName(
    record
) {

    return String(
        record?.client ??
        record?.clientName ??
        record?.customer ??
        record?.customerName ??
        record?.company ??
        '-'
    );

}


/* =========================================================
   PROJECT
========================================================= */

function getProjectName(
    record
) {

    return String(
        record?.project ??
        record?.projectName ??
        '-'
    );

}


/* =========================================================
   PO NUMBER
========================================================= */

function getPO(
    record
) {

    return String(
        record?.po ??
        record?.poNo ??
        record?.poNumber ??
        record?.PONumber ??
        '-'
    );

}


/* =========================================================
   PAYMENT STATUS
========================================================= */

function getPaymentStatus(
    payment
) {

    const status =
        payment?.status ??
        payment?.paymentStatus ??
        payment?.state ??
        'Pending';


    return String(
        status
    );

}


/* =========================================================
   CHECK PENDING
========================================================= */

function isPendingPayment(
    payment
) {

    const status =
        getPaymentStatus(
            payment
        )
        .trim()
        .toLowerCase();


    return (
        status === 'pending' ||
        status === 'unpaid' ||
        status === 'outstanding' ||
        status === 'for payment' ||
        status === 'partial' ||
        status === 'pending payment'
    );

}


/* =========================================================
   SALES ORDER PAYMENT STATUS
========================================================= */

function getSalesOrderPaymentStatus(
    so,
    balance
) {

    if (balance <= 0) {
        return 'PAID';
    }


    const explicitStatus =
        String(
            so?.paymentStatus ??
            so?.status ??
            ''
        )
        .trim();


    if (explicitStatus) {

        return explicitStatus;

    }


    const paid =
        getSalesOrderPaid(
            so
        );


    if (paid > 0) {
        return 'PARTIAL';
    }


    return 'PENDING';

}


/* =========================================================
   STATUS CLASS
========================================================= */

function getPaymentStatusClass(
    status
) {

    const value =
        String(status)
            .toLowerCase()
            .trim();


    if (
        value.includes('paid') ||
        value === 'complete' ||
        value === 'completed'
    ) {

        return 'payment-status-paid';

    }


    if (
        value.includes('cancel')
    ) {

        return 'payment-status-cancelled';

    }


    if (
        value.includes('partial') ||
        value.includes('ongoing')
    ) {

        return 'payment-status-ongoing';

    }


    return 'payment-status-pending';

}


/* =========================================================
   SAME DATE
========================================================= */

function isSameDate(
    dateA,
    dateB
) {

    if (!dateA || !dateB) {
        return false;
    }


    return (
        dateA.getFullYear() ===
            dateB.getFullYear() &&

        dateA.getMonth() ===
            dateB.getMonth() &&

        dateA.getDate() ===
            dateB.getDate()
    );

}


/* =========================================================
   SAME MONTH
========================================================= */

function isSameMonth(
    dateA,
    dateB
) {

    if (!dateA || !dateB) {
        return false;
    }


    return (
        dateA.getFullYear() ===
            dateB.getFullYear() &&

        dateA.getMonth() ===
            dateB.getMonth()
    );

}


/* =========================================================
   GET SELECTED VALUE
========================================================= */

function getSelectedValue(
    elementId
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return 'all';
    }


    return element.value ||
        'all';

}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(
    value
) {

    const number =
        Number(value) || 0;


    return number.toLocaleString(
        'en-PH',
        {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(
    date
) {

    if (!date) {
        return '-';
    }


    return date.toLocaleDateString(
        'en-PH',
        {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        }
    );

}


/* =========================================================
   GET SO DATE TEXT
========================================================= */

function getSODateText(
    so
) {

    return formatDate(
        getSalesOrderDate(so)
    );

}


/* =========================================================
   NUMBER CONVERSION
========================================================= */

function toNumber(
    value
) {

    if (
        typeof value ===
        'number'
    ) {

        return isFinite(value)
            ? value
            : 0;

    }


    if (value === null ||
        value === undefined) {

        return 0;

    }


    let text =
        String(value)
            .trim();


    if (!text) {
        return 0;
    }


    /*
       Remove:
       ₱
       PHP
       commas
       spaces
    */

    text =
        text
            .replace(
                /₱/g,
                ''
            )
            .replace(
                /PHP/gi,
                ''
            )
            .replace(
                /,/g,
                ''
            )
            .replace(
                /\s/g,
                ''
            );


    const number =
        Number(text);


    return isFinite(number)
        ? number
        : 0;

}


/* =========================================================
   GET DATETIME
========================================================= */

function getDateTime(
    date
) {

    if (!date) {
        return 0;
    }


    const time =
        date.getTime();


    return isNaN(time)
        ? 0
        : time;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(
    value
) {

    return String(value ?? '')
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


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(
    value
) {

    return String(value ?? '')
        .replace(
            /\\/g,
            '\\\\'
        )
        .replace(
            /'/g,
            "\\'"
        );

}


/* =========================================================
   AUTO INITIALIZATION
========================================================= */

if (
    document.readyState ===
    'loading'
) {

    document.addEventListener(
        'DOMContentLoaded',
        function () {

            /*
               Only initialize if the
               Payment module already
               exists in the DOM.
            */

            if (
                document.getElementById(
                    'paymentModule'
                ) ||
                document.getElementById(
                    'preparePaymentBtn'
                )
            ) {

                initializePayment();

            }

        }
    );

} else {

    if (
        document.getElementById(
            'paymentModule'
        ) ||
        document.getElementById(
            'preparePaymentBtn'
        )
    ) {

        initializePayment();

    }

}


/* =========================================================
   GLOBAL EXPORTS
   For index.html / dynamic module
========================================================= */

window.populatePaymentYears =
    populatePaymentYears;

window.initializePayment =
    initializePayment;

window.loadPaymentData =
    loadPaymentData;

window.applyPaymentFilters =
    applyPaymentFilters;

window.clearPaymentFilters =
    clearPaymentFilters;

window.openCreatePaymentPage =
    openCreatePaymentPage;

window.viewPaymentRecord =
    viewPaymentRecord;

window.viewSalesOrderPayment =
    viewSalesOrderPayment;
