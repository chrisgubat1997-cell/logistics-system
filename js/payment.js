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
   - Recent Sales Order
   - Payment Search
   - Sales Order Search
   - Month / Year Filter
   - Dynamic Card Adjustment
   - Refresh
   - Prepare Payment
   - LocalStorage Data Source

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
    const response = await fetch(PAYMENT_DASHBOARD_API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: action, data: {} })
    });
    const raw = await response.text();
    let result;
    try { result = JSON.parse(raw); } catch (error) { throw new Error("Invalid response from LOGIS-TECH database."); }
    if (!response.ok || !result || result.success === false) {
        throw new Error(result && (result.message || result.error) || (action + " failed."));
    }
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

    populatePaymentYears();

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
        const results = await Promise.all([
            paymentDashboardAPI('getPayments'),
            paymentDashboardAPI('getSalesOrders')
        ]);
        paymentRecords = paymentDashboardRows(results[0], ['payments']).map(function (row) {
            return Object.assign({}, row, {
                paymentNo: row.PAYMENT_NO || row.PAYMENT_ID || row.paymentNo || row.paymentNumber || '',
                invoiceNo: row.INVOICE_NO || row.invoiceNo || '',
                siNo: row.SI_NO || row.siNo || '',
                soNo: row.SO_NUMBER || row.soNo || row.salesOrderNo || '',
                client: row.CLIENT_NAME || row.client || row.clientName || '',
                project: row.PROJECT || row.project || '',
                date: row.PAYMENT_DATE || row.paymentDate || row.date || row.CREATED_AT || '',
                amount: row.CURRENT_PAYMENT ?? row.currentPayment ?? row.AMOUNT ?? row.amount ?? 0,
                status: row.PAYMENT_STATUS || row.status || 'RECEIVED'
            });
        });
        paymentSalesOrders = paymentDashboardRows(results[1], ['salesOrders']).map(function (row) {
            return Object.assign({}, row, {
                soNo: row.SO_NUMBER || row.soNo || row.salesOrderNo || '',
                client: row.CLIENT_NAME || row.client || row.clientName || '',
                project: row.PROJECT || row.project || '',
                date: row.DATE_CREATION || row.SO_DATE || row.date || row.createdAt || '',
                total: row.GRAND_TOTAL ?? row.SO_TOTAL ?? row.TOTAL_AMOUNT ?? row.total ?? row.grandTotal ?? 0,
                status: row.STATUS || row.status || ''
            });
        });
        // Credit-ledger display remains compatible with existing saved credit records.
        customerCreditRecords = getStoredArray(CUSTOMER_CREDIT_STORAGE_KEYS);
        customerCreditTransactions = getStoredArray(CUSTOMER_CREDIT_TRANSACTION_STORAGE_KEYS);
        populatePaymentYears();
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
