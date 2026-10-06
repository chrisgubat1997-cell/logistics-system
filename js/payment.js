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
       SALES ORDER SEARCH TOGGLE
    ----------------------------------------------------- */

    const soSearchToggle =
        document.getElementById(
            'salesOrderPaymentSearchToggleBtn'
        );

    if (soSearchToggle) {

        soSearchToggle.addEventListener(
            'click',
            function () {

                const box =
                    document.getElementById(
                        'salesOrderPaymentSearchBox'
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
                            'salesOrderPaymentSearchInput'
                        );

                    if (input) {
                        input.focus();
                    }

                }

            }
        );

    }


    /* -----------------------------------------------------
       SALES ORDER SEARCH
    ----------------------------------------------------- */

    const soSearchInput =
        document.getElementById(
            'salesOrderPaymentSearchInput'
        );

    if (soSearchInput) {

        soSearchInput.addEventListener(
            'input',
            renderSalesOrderTable
        );

    }


    /* -----------------------------------------------------
       CLEAR SALES ORDER SEARCH
    ----------------------------------------------------- */

    const soSearchClear =
        document.getElementById(
            'salesOrderPaymentSearchClearBtn'
        );

    if (soSearchClear) {

        soSearchClear.addEventListener(
            'click',
            function () {

                const input =
                    document.getElementById(
                        'salesOrderPaymentSearchInput'
                    );

                if (input) {

                    input.value = '';

                    renderSalesOrderTable();

                    input.focus();

                }

            }
        );

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
            'refreshPaymentSOBtn'
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

function loadPaymentData() {

    paymentRecords =
        getStoredArray(
            PAYMENT_STORAGE_KEYS
        );

    paymentSalesOrders =
        getStoredArray(
            SALES_ORDER_STORAGE_KEYS
        );

    console.log(
        'Payment records:',
        paymentRecords
    );

    console.log(
        'Sales Orders:',
        paymentSalesOrders
    );

    applyPaymentFilters();

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

    renderSalesOrderTable();

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


    tbody.innerHTML =
        records.map(
            function (payment) {

                return createPaymentRow(
                    payment
                );

            }
        ).join('');

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
        <tr>

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

function viewPaymentRecord(
    paymentNo
) {

    const payment =
        paymentRecords.find(
            function (record) {

                return (
                    getPaymentNo(record) ===
                    paymentNo
                );

            }
        );


    if (!payment) {

        alert(
            'Payment record not found.'
        );

        return;

    }


    /*
       Temporary view behavior.
       We can replace this later with
       a proper Payment Details modal.
    */

    const amount =
        formatCurrency(
            getPaymentAmount(payment)
        );


    alert(
        'Payment No.: ' +
        paymentNo +
        '\n\n' +
        'Invoice No.: ' +
        getInvoiceNo(payment) +
        '\n' +
        'SO No.: ' +
        getSONo(payment) +
        '\n' +
        'Client: ' +
        getClientName(payment) +
        '\n' +
        'Amount: ' +
        amount +
        '\n' +
        'Status: ' +
        getPaymentStatus(payment)
    );

}


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
