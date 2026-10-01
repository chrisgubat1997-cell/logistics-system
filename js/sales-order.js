/* =========================================================
   LOGIS-TECH SYSTEM
   SALES ORDER MODULE
   GOOGLE APPS SCRIPT API
========================================================= */


/* =========================================================
   API CONFIG
========================================================= */

const SALES_ORDER_API_URL =
    "https://script.google.com/macros/s/AKfycbwFZHUWgNSfSYiwEYkDncF1qja5A6RmNFyyZ4-Bm17gt_WuCYbtTYICEerGVhp9SYPedg/exec";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let salesOrders = [];

let selectedSO = null;

let currentSO = null;

let soDetailsEditMode = false;


/* =========================================================
   CACHE
========================================================= */

/*
 * TRUE kapag successfully na-load na ang SO List.
 *
 * Kapag naglipat:
 *
 * Dashboard
 *   ↓
 * DR
 *   ↓
 * Dashboard
 *   ↓
 * Sales Order
 *
 * Hindi na ulit kukuha sa Google Sheets.
 */

let salesOrdersLoaded = false;


/*
 * Cache ng individual SO details.
 *
 * Key:
 * SO Number
 *
 * Example:
 *
 * soDetailsCache["SO-00001"]
 */

const soDetailsCache = {};


/* =========================================================
   API RETRY SETTINGS
========================================================= */

const API_MAX_RETRIES = 3;

const API_RETRY_DELAY = 800;


/* =========================================================
   DELAY HELPER
========================================================= */

function wait(ms) {

    return new Promise(
        function(resolve) {

            setTimeout(
                resolve,
                ms
            );

        }
    );

}


/* =========================================================
   API REQUEST
========================================================= */

async function salesOrderAPI(
    action,
    data = {},
    retryCount = 0
) {

    try {

        console.log(
            "LOGIS-TECH API REQUEST:",
            action,
            data,
            "Attempt:",
            retryCount + 1
        );


        const response =
            await fetch(
                SALES_ORDER_API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body:
                        JSON.stringify({
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
            "LOGIS-TECH API STATUS:",
            response.status
        );


        console.log(
            "LOGIS-TECH API RESPONSE:",
            responseText
        );


        /*
         * ================================================
         * RETRY
         *
         * Kapag 404 / 408 / 429 / 500 / 502 / 503 / 504
         * susubukan ulit.
         * ================================================
         */

        if (
            !response.ok
        ) {

            const retryable =
                [
                    404,
                    408,
                    429,
                    500,
                    502,
                    503,
                    504
                ].includes(
                    response.status
                );


            if (
                retryable &&
                retryCount <
                    API_MAX_RETRIES - 1
            ) {

                console.warn(
                    "API failed. Retrying...",
                    response.status
                );


                await wait(
                    API_RETRY_DELAY *
                    (retryCount + 1)
                );


                return await salesOrderAPI(
                    action,
                    data,
                    retryCount + 1
                );

            }


            throw new Error(
                "API request failed: " +
                response.status
            );

        }


        /*
         * ================================================
         * PARSE JSON
         * ================================================
         */

        let result;


        try {

            result =
                JSON.parse(
                    responseText
                );

        } catch (jsonError) {

            console.error(
                "Invalid JSON response:",
                responseText
            );


            /*
             * Retry kapag bad response
             */

            if (
                retryCount <
                API_MAX_RETRIES - 1
            ) {

                console.warn(
                    "Invalid API response. Retrying..."
                );


                await wait(
                    API_RETRY_DELAY *
                    (retryCount + 1)
                );


                return await salesOrderAPI(
                    action,
                    data,
                    retryCount + 1
                );

            }


            throw new Error(
                "Invalid response from LOGIS-TECH API."
            );

        }


        return result;


    } catch (error) {

        console.error(
            "Sales Order API Error:",
            error
        );


        /*
         * Retry kapag network/fetch error
         */

        if (
            retryCount <
            API_MAX_RETRIES - 1
        ) {

            console.warn(
                "Network/API error. Retrying..."
            );


            await wait(
                API_RETRY_DELAY *
                (retryCount + 1)
            );


            return await salesOrderAPI(
                action,
                data,
                retryCount + 1
            );

        }


        return {

            success:
                false,

            message:
                error.message

        };

    }

}


/* =========================================================
   LOAD SALES ORDERS
========================================================= */

async function loadSOList(
    forceRefresh = false
) {

    const tbody =
        document.getElementById(
            "soTableBody"
        );


    /*
     * =====================================================
     * USE CACHE
     *
     * Kung na-load na dati at walang force refresh,
     * render lang agad.
     * WALANG API REQUEST.
     * =====================================================
     */

    if (
        salesOrdersLoaded &&
        !forceRefresh
    ) {

        console.log(
            "Using cached Sales Orders."
        );


        renderSOList(
            salesOrders
        );


        return;

    }


    /*
     * Loading display
     */

    if (tbody) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="100%"
                    style="text-align:center;"
                >

                    Loading Sales Orders...

                </td>

            </tr>

        `;

    }


    /*
     * API request
     */

    const result =
        await salesOrderAPI(
            "getSalesOrders",
            {}
        );


    console.log(
        "GET SALES ORDERS RESULT:",
        result
    );


    /*
     * API failed
     */

    if (
        !result ||
        !result.success
    ) {

        if (tbody) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="100%"
                        style="
                            text-align:center;
                            color:red;
                        "
                    >

                        Failed to load Sales Orders.

                        <br>

                        <small>

                            ${
                                escapeHTML(
                                    result?.message ||
                                    "Unknown API error."
                                )
                            }

                        </small>

                    </td>

                </tr>

            `;

        }


        console.error(
            "Failed to load Sales Orders:",
            result?.message
        );


        return;

    }


    /*
     * Save list to memory
     */

    salesOrders =
        Array.isArray(
            result.salesOrders
        )
            ? result.salesOrders
            : [];


    /*
     * Mark as loaded
     */

    salesOrdersLoaded =
        true;


    /*
     * Save each SO to details cache
     *
     * Kung may complete data na kasama,
     * usable na agad.
     */

    salesOrders.forEach(
        function(so) {

            if (
                so &&
                so.soNumber
            ) {

                soDetailsCache[
                    String(
                        so.soNumber
                    )
                ] = so;

            }

        }
    );


    /*
     * Render
     */

    renderSOList(
        salesOrders
    );

}


/* =========================================================
   RENDER SALES ORDER LIST
========================================================= */

function renderSOList(
    list
) {

    const tbody =
        document.getElementById(
            "soTableBody"
        );


    if (!tbody) {

        console.error(
            "soTableBody element not found."
        );

        return;

    }


    tbody.innerHTML = "";


    if (
        !Array.isArray(list) ||
        list.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="100%"
                    style="text-align:center;"
                >

                    No Sales Order found.

                </td>

            </tr>

        `;

        return;

    }


    list.forEach(
        function(so) {

            const row =
                document.createElement(
                    "tr"
                );


            row.dataset.soNumber =
                so.soNumber;


            row.innerHTML = `

    <td>
        ${escapeHTML(
            so.soNumber || ""
        )}
    </td>

    <td>
        ${escapeHTML(
            so.dateCreation || ""
        )}
    </td>

    <td>
        ${escapeHTML(
            so.clientName || ""
        )}
    </td>

    <td>
        ${escapeHTML(
            so.se || ""
        )}
    </td>

    <td>
        ${escapeHTML(
            so.project || ""
        )}
    </td>

    <td>
        ${escapeHTML(
            so.poNumber || ""
        )}
    </td>

    <td>
        ${escapeHTML(
            so.terms || ""
        )}
    </td>

    <td style="text-align:right;">
        ${formatMoney(
            so.grandTotal
        )}
    </td>

    <td>
        ${escapeHTML(
            so.status || ""
        )}
    </td>

`;

            /*
             * =================================================
             * SINGLE CLICK
             * =================================================
             */

            row.addEventListener(
                "click",
                function() {

                    selectSO(
                        so.soNumber
                    );

                }
            );


            /*
             * =================================================
             * DOUBLE CLICK
             * =================================================
             */

            row.addEventListener(
                "dblclick",
                function() {

                    openSODetails(
                        so.soNumber
                    );

                }
            );


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   SELECT SALES ORDER
========================================================= */

function selectSO(
    soNumber
) {

    selectedSO =
        salesOrders.find(
            function(so) {

                return (
                    String(
                        so.soNumber
                    ) ===
                    String(
                        soNumber
                    )
                );

            }
        );


    if (!selectedSO) {

        /*
         * Try details cache
         */

        selectedSO =
            soDetailsCache[
                String(
                    soNumber
                )
            ];

    }


    if (!selectedSO) {
        return;
    }


    /*
     * Remove previous selection
     */

    document
        .querySelectorAll(
            "#soTableBody tr"
        )
        .forEach(
            function(row) {

                row.classList.remove(
                    "selected"
                );

            }
        );


    /*
     * Highlight selected row
     */

    const selectedRow =
        document.querySelector(
            `#soTableBody tr[data-so-number="${cssEscape(
                soNumber
            )}"]`
        );


    if (selectedRow) {

        selectedRow.classList.add(
            "selected"
        );

    }


    /*
     * Compact preview
     */

    const preview =
        document.getElementById(
            "selectedSOInfo"
        );


    if (!preview) {
        return;
    }


    preview.innerHTML = `

        <div class="so-preview">

            <strong>
                ${escapeHTML(
                    selectedSO.soNumber
                )}
            </strong>

            <br>

            Client:
            ${escapeHTML(
                selectedSO.clientName || "-"
            )}

            <br>

            Project:
            ${escapeHTML(
                selectedSO.project || "-"
            )}

            <br>

            Status:
            ${escapeHTML(
                selectedSO.status || "-"
            )}

            <br>

            Grand Total:

            <strong>

                ${formatMoney(
                    selectedSO.grandTotal
                )}

            </strong>

        </div>

    `;

}


/* =========================================================
   SEARCH SALES ORDER
========================================================= */

function searchSO() {

    const input =
        document.getElementById(
            "soSearch"
        );


    const keyword =
        String(
            input
                ? input.value
                : ""
        )
        .trim()
        .toLowerCase();


    if (!keyword) {

        renderSOList(
            salesOrders
        );

        return;

    }


    const filtered =
        salesOrders.filter(
            function(so) {

                return [

                    so.soNumber,
                    so.clientName,
                    so.project,
                    so.poNumber,
                    so.jobOrder,
                    so.se,
                    so.status

                ]
                .join(" ")
                .toLowerCase()
                .includes(
                    keyword
                );

            }
        );


    renderSOList(
        filtered
    );

}


/* =========================================================
   OPEN CREATE SO
========================================================= */

function openCreateSO() {

    window.location.href =
        "pages/create-sales-order.html";

}


/* =========================================================
   OPEN SO DETAILS
========================================================= */

async function openSODetails(
    soNumber
) {

    const cacheKey =
        String(
            soNumber
        );


    /*
     * =====================================================
     * CHECK DETAILS CACHE FIRST
     *
     * Ito ang malaking speed improvement.
     * =====================================================
     */

    if (
        soDetailsCache[
            cacheKey
        ]
    ) {

        console.log(
            "Opening SO from cache:",
            soNumber
        );


        currentSO =
            soDetailsCache[
                cacheKey
            ];


        selectedSO =
            currentSO;


        showSODetailsPage(
            currentSO
        );


        return;

    }


    /*
     * =====================================================
     * TRY DATA FROM SO LIST
     * =====================================================
     */

    const listSO =
        salesOrders.find(
            function(so) {

                return (
                    String(
                        so.soNumber
                    ) ===
                    cacheKey
                );

            }
        );


    /*
     * Kung complete ang data sa list,
     * gamitin na agad.
     */

    if (
        listSO &&
        Array.isArray(
            listSO.items
        )
    ) {

        soDetailsCache[
            cacheKey
        ] =
            listSO;


        currentSO =
            listSO;


        selectedSO =
            listSO;


        showSODetailsPage(
            listSO
        );


        return;

    }


    /*
     * =====================================================
     * ONLY NOW CALL API
     * =====================================================
     */

    showSODetailsLoading();


    const result =
        await salesOrderAPI(
            "getSalesOrder",
            {
                soNumber:
                    soNumber
            }
        );


    console.log(
        "GET SO DETAILS RESULT:",
        result
    );


    if (
        !result ||
        !result.success
    ) {

        alert(
            result?.message ||
            "Hindi ma-load ang Sales Order."
        );


        return;

    }


    currentSO =
        result.so;


    selectedSO =
        currentSO;


    /*
     * Save details to cache
     */

    soDetailsCache[
        cacheKey
    ] =
        currentSO;


    /*
     * Show details
     */

    showSODetailsPage(
        currentSO
    );

}


/* =========================================================
   SHOW SO DETAILS LOADING
========================================================= */

/* =========================================================
   SHOW SO DETAILS LOADING
========================================================= */

function showSODetailsLoading() {

    const listView =
        document.getElementById(
            "salesOrderListView"
        );

    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    /*
     * IMPORTANT:
     * HUWAG itago ang #sales.
     *
     * Ang #soDetails ay nasa loob ng #sales.
     */

    if (listView) {

        listView.style.display =
            "none";

    }


    if (detailsPage) {

        detailsPage.style.display =
            "block";


        /*
         * HUWAG gamitin ang innerHTML dito.
         * Para hindi mabura ang buong SO Details form.
         */

        const itemsBody =
            document.getElementById(
                "soDetailsItemsBody"
            );


        if (itemsBody) {

            itemsBody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        style="
                            text-align:center;
                            padding:30px;
                        "
                    >

                        Loading Sales Order...

                    </td>

                </tr>

            `;

        }

    }

}


/* =========================================================
   SHOW SO DETAILS PAGE
========================================================= */

function showSODetailsPage(
    so
) {

    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    /*
     * IMPORTANT:
     *
     * Hindi natin itatago ang #sales.
     * Child views lang ang magpapalitan.
     */

    if (listView) {

        listView.style.display =
            "none";

    }


    if (detailsPage) {

        detailsPage.style.display =
            "block";

    }


    /*
     * Render complete SO details
     */

    renderSODetails(
        so
    );


    /*
     * Default = VIEW MODE
     */

    setDetailsEditMode(
        false
    );

}


/* =========================================================
   RENDER SO DETAILS
========================================================= */

function renderSODetails(
    so
) {

    if (!so) {
        return;
    }


    setValue(
        "detailSODate",
        so.dateCreation
    );


    setValue(
        "detailSONumber",
        so.soNumber
    );


    setValue(
        "detailClientName",
        so.clientName
    );


    setValue(
        "detailSE",
        so.se
    );


    setValue(
        "detailAttention",
        so.attention
    );


    setValue(
        "detailBillingAddress",
        so.billingAddress
    );


    setValue(
        "detailDeliveryAddress",
        so.deliveryAddress
    );


    setValue(
        "detailProject",
        so.project
    );


    setValue(
        "detailTIN",
        so.tin
    );


    setValue(
        "detailPONumber",
        so.poNumber
    );


    setValue(
        "detailTerms",
        so.terms
    );


    setValue(
        "detailJobOrder",
        so.jobOrder
    );


    renderSODetailItems(
        so.items || []
    );


    setText(
        "detailSubtotal",
        formatMoney(
            so.subtotal
        )
    );


    setText(
        "detailDiscount",
        formatMoney(
            so.discount
        )
    );


    setText(
        "detailVatable",
        formatMoney(
            so.vatable
        )
    );


    setText(
        "detailVAT",
        formatMoney(
            so.vatAmount
        )
    );


    setText(
        "detailGrandTotal",
        formatMoney(
            so.grandTotal
        )
    );

}


/* =========================================================
   RENDER DETAIL ITEMS
========================================================= */

function renderSODetailItems(
    items
) {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return;
    }


    tbody.innerHTML = "";


    if (
        !Array.isArray(items) ||
        items.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="100%"
                    style="text-align:center;"
                >

                    No items.

                </td>

            </tr>

        `;

        return;

    }


    items.forEach(
        function(item, index) {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>

                    <input
                        type="text"
                        class="so-detail-item-name"
                        value="${escapeAttribute(
                            item.itemName || ""
                        )}"
                        disabled
                    >

                </td>

                <td>

                    <input
                        type="text"
                        class="so-detail-description"
                        value="${escapeAttribute(
                            item.description || ""
                        )}"
                        disabled
                    >

                </td>

                <td>

                    <input
                        type="number"
                        class="so-detail-qty"
                        value="${Number(
                            item.qty || 0
                        )}"
                        disabled
                        oninput="
                            calculateDetailTotals()
                        "
                    >

                </td>

                <td>

                    <input
                        type="text"
                        class="so-detail-unit"
                        value="${escapeAttribute(
                            item.unit || ""
                        )}"
                        disabled
                    >

                </td>

                <td>

                    <input
                        type="number"
                        class="so-detail-amount"
                        value="${Number(
                            item.amount || 0
                        )}"
                        disabled
                        oninput="
                            calculateDetailTotals()
                        "
                    >

                </td>

                <td class="so-detail-total">

                    ${formatMoney(
                        item.total
                    )}

                </td>

                <td>

                    <button
                        type="button"
                        class="detail-delete-item"
                        onclick="
                            deleteDetailItem(this)
                        "
                        style="display:none;"
                    >

                        DELETE

                    </button>

                </td>

            `;


            tbody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   DETAIL EDIT MODE
========================================================= */

function enableSOUpdate() {

    setDetailsEditMode(
        true
    );

}


/* =========================================================
   SET DETAIL EDIT MODE
========================================================= */

function setDetailsEditMode(
    enabled
) {

    soDetailsEditMode =
        Boolean(
            enabled
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    if (!detailsPage) {
        return;
    }


    const inputs =
        detailsPage.querySelectorAll(
            "input, textarea, select"
        );


    inputs.forEach(
        function(input) {

            if (
                input.id ===
                "detailSONumber"
            ) {

                input.disabled =
                    true;

                return;

            }


            input.disabled =
                !enabled;

        }
    );


    document
        .querySelectorAll(
            ".detail-delete-item"
        )
        .forEach(
            function(button) {

                button.style.display =
                    enabled
                        ? "inline-block"
                        : "none";

            }
        );


    const addButton =
        document.getElementById(
            "detailAddItemButton"
        );


    if (addButton) {

        addButton.style.display =
            enabled
                ? "inline-block"
                : "none";

    }


    const saveButton =
        document.querySelector(
            '[onclick="saveSOUpdate()"]'
        );


    if (saveButton) {

        saveButton.style.display =
            enabled
                ? "inline-block"
                : "none";

    }

}


/* =========================================================
   ADD DETAIL ITEM
========================================================= */

function addDetailItem() {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return;
    }


    const row =
        document.createElement(
            "tr"
        );


    const index =
        tbody.querySelectorAll(
            "tr"
        ).length + 1;


    row.innerHTML = `

        <td>
            ${index}
        </td>

        <td>

            <input
                type="text"
                class="so-detail-item-name"
                value=""
            >

        </td>

        <td>

            <input
                type="text"
                class="so-detail-description"
                value=""
            >

        </td>

        <td>

            <input
                type="number"
                class="so-detail-qty"
                value="1"
                min="0"
                oninput="
                    calculateDetailTotals()
                "
            >

        </td>

        <td>

            <input
                type="text"
                class="so-detail-unit"
                value=""
            >

        </td>

        <td>

            <input
                type="number"
                class="so-detail-amount"
                value="0"
                min="0"
                step="0.01"
                oninput="
                    calculateDetailTotals()
                "
            >

        </td>

        <td class="so-detail-total">

            ${formatMoney(0)}

        </td>

        <td>

            <button
                type="button"
                class="detail-delete-item"
                onclick="
                    deleteDetailItem(this)
                "
            >

                DELETE

            </button>

        </td>

    `;


    tbody.appendChild(
        row
    );


    renumberDetailItems();


    calculateDetailTotals();

}


/* =========================================================
   DELETE DETAIL ITEM
========================================================= */

function deleteDetailItem(
    button
) {

    if (!soDetailsEditMode) {
        return;
    }


    const row =
        button.closest(
            "tr"
        );


    if (row) {

        row.remove();

    }


    renumberDetailItems();


    calculateDetailTotals();

}


/* =========================================================
   RENUMBER DETAIL ITEMS
========================================================= */

function renumberDetailItems() {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
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

            if (
                row.children[0]
            ) {

                row.children[0]
                    .textContent =
                    index + 1;

            }

        }
    );

}


/* =========================================================
   CALCULATE DETAIL TOTALS
========================================================= */

function calculateDetailTotals() {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return;
    }


    let subtotal = 0;


    const rows =
        tbody.querySelectorAll(
            "tr"
        );


    rows.forEach(
        function(row) {

            const qtyInput =
                row.querySelector(
                    ".so-detail-qty"
                );


            const amountInput =
                row.querySelector(
                    ".so-detail-amount"
                );


            const totalCell =
                row.querySelector(
                    ".so-detail-total"
                );


            if (
                !qtyInput ||
                !amountInput
            ) {

                return;

            }


            const qty =
                Number(
                    qtyInput.value || 0
                );


            const amount =
                Number(
                    amountInput.value || 0
                );


            const total =
                qty *
                amount;


            subtotal +=
                total;


            if (totalCell) {

                totalCell.textContent =
                    formatMoney(
                        total
                    );

            }

        }
    );


    const discount =
        Number(
            currentSO?.discount || 0
        );


    const vatable =
        subtotal -
        discount;


    const vatRate =
        0.12;


    const vatAmount =
        vatable *
        vatRate;


    const grandTotal =
        vatable +
        vatAmount;


    setText(
        "detailSubtotal",
        formatMoney(
            subtotal
        )
    );


    setText(
        "detailDiscount",
        formatMoney(
            discount
        )
    );


    setText(
        "detailVatable",
        formatMoney(
            vatable
        )
    );


    setText(
        "detailVAT",
        formatMoney(
            vatAmount
        )
    );


    setText(
        "detailGrandTotal",
        formatMoney(
            grandTotal
        )
    );

}


/* =========================================================
   SAVE SO UPDATE
========================================================= */

async function saveSOUpdate() {

    if (!currentSO) {

        alert(
            "Walang selected Sales Order."
        );

        return;

    }


    const items =
        collectDetailItems();


    let subtotal = 0;


    items.forEach(
        function(item) {

            subtotal +=
                Number(
                    item.total || 0
                );

        }
    );


    const discount =
        Number(
            currentSO.discount || 0
        );


    const vatable =
        subtotal -
        discount;


    const vatRate =
        0.12;


    const vatAmount =
        vatable *
        vatRate;


    const grandTotal =
        vatable +
        vatAmount;


    const data = {

        soNumber:
            currentSO.soNumber,

        dateCreation:
            getValue(
                "detailSODate"
            ),

        clientName:
            getValue(
                "detailClientName"
            ),

        se:
            getValue(
                "detailSE"
            ),

        attention:
            getValue(
                "detailAttention"
            ),

        billingAddress:
            getValue(
                "detailBillingAddress"
            ),

        deliveryAddress:
            getValue(
                "detailDeliveryAddress"
            ),

        project:
            getValue(
                "detailProject"
            ),

        tin:
            getValue(
                "detailTIN"
            ),

        poNumber:
            getValue(
                "detailPONumber"
            ),

        terms:
            getValue(
                "detailTerms"
            ),

        jobOrder:
            getValue(
                "detailJobOrder"
            ),

        status:
            currentSO.status ||
            "ACTIVE",

        subtotal:
            subtotal,

        discount:
            discount,

        vatable:
            vatable,

        vatRate:
            vatRate,

        vatAmount:
            vatAmount,

        grandTotal:
            grandTotal,

        createdBy:
            currentSO.createdBy ||
            "",

        createdDate:
            currentSO.createdDate ||
            "",

        items:
            items

    };


    const saveButton =
        document.querySelector(
            '[onclick="saveSOUpdate()"]'
        );


    if (saveButton) {

        saveButton.disabled =
            true;

        saveButton.textContent =
            "SAVING...";

    }


    const result =
        await salesOrderAPI(
            "updateSalesOrder",
            data
        );


    if (saveButton) {

        saveButton.disabled =
            false;

        saveButton.textContent =
            "SAVE";

    }


    if (
        !result ||
        !result.success
    ) {

        alert(
            result?.message ||
            "Failed to update Sales Order."
        );

        return;

    }


    alert(
        "Sales Order updated successfully."
    );


    soDetailsEditMode =
        false;


    /*
     * Remove old cached details
     */

    delete soDetailsCache[
        String(
            currentSO.soNumber
        )
    ];


    /*
     * Force refresh list
     */

    salesOrdersLoaded =
        false;


    await loadSOList(
        true
    );


    /*
     * Reload updated SO details
     */

    await openSODetails(
        currentSO.soNumber
    );

}


/* =========================================================
   COLLECT DETAIL ITEMS
========================================================= */

function collectDetailItems() {

    const tbody =
        document.getElementById(
            "soDetailsItemsBody"
        );


    if (!tbody) {
        return [];
    }


    const rows =
        tbody.querySelectorAll(
            "tr"
        );


    const items = [];


    rows.forEach(
        function(row, index) {

            const itemNameInput =
                row.querySelector(
                    ".so-detail-item-name"
                );


            const descriptionInput =
                row.querySelector(
                    ".so-detail-description"
                );


            const qtyInput =
                row.querySelector(
                    ".so-detail-qty"
                );


            const unitInput =
                row.querySelector(
                    ".so-detail-unit"
                );


            const amountInput =
                row.querySelector(
                    ".so-detail-amount"
                );


            if (!itemNameInput) {
                return;
            }


            const itemName =
                itemNameInput.value.trim();


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
                qty *
                amount;


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
   CANCEL SELECTED SO
========================================================= */

async function cancelSelectedSO() {

    const so =
        selectedSO ||
        currentSO;


    if (!so) {

        alert(
            "Pumili muna ng Sales Order."
        );

        return;

    }


    if (
        String(
            so.status
        )
        .toUpperCase() ===
        "CANCELLED"
    ) {

        alert(
            "Cancelled na ang Sales Order na ito."
        );

        return;

    }


    const confirmed =
        confirm(
            "Are you sure you want to cancel SO " +
            so.soNumber +
            "?"
        );


    if (!confirmed) {
        return;
    }


    const result =
        await salesOrderAPI(
            "cancelSalesOrder",
            {
                soNumber:
                    so.soNumber
            }
        );


    if (
        !result ||
        !result.success
    ) {

        alert(
            result?.message ||
            "Failed to cancel Sales Order."
        );

        return;

    }


    alert(
        "Sales Order cancelled successfully."
    );


    /*
     * Update local cache immediately
     */

    const cacheKey =
        String(
            so.soNumber
        );


    if (
        soDetailsCache[
            cacheKey
        ]
    ) {

        soDetailsCache[
            cacheKey
        ].status =
            "CANCELLED";

    }


    const listSO =
        salesOrders.find(
            function(item) {

                return (
                    String(
                        item.soNumber
                    ) ===
                    cacheKey
                );

            }
        );


    if (listSO) {

        listSO.status =
            "CANCELLED";

    }


    selectedSO =
        null;


    currentSO =
        null;


    /*
     * Force refresh from Google Sheets
     */

    salesOrdersLoaded =
        false;


    await loadSOList(
        true
    );


    closeSODetails();

}


/* =========================================================
   UPDATE SELECTED SO
========================================================= */

function updateSelectedSO() {

    const so =
        selectedSO ||
        currentSO;


    if (!so) {

        alert(
            "Pumili muna ng Sales Order."
        );

        return;

    }


    openSODetails(
        so.soNumber
    );

}


/* =========================================================
   CLOSE SO DETAILS
========================================================= */

/* =========================================================
   CLOSE SO DETAILS
========================================================= */

function closeSODetails() {

    const listView =
        document.getElementById(
            "salesOrderListView"
        );


    const detailsPage =
        document.getElementById(
            "soDetails"
        );


    /*
     * Hide details
     */

    if (detailsPage) {

        detailsPage.style.display =
            "none";

    }


    /*
     * Show SO list
     */

    if (listView) {

        listView.style.display =
            "block";

    }


    /*
     * Reset edit mode
     */

    soDetailsEditMode =
        false;


    /*
     * Huwag burahin ang selectedSO.
     * Para available pa rin ang selected row.
     */

    currentSO =
        null;


    /*
     * Restore buttons
     */

    const updateButton =
        document.getElementById(
            "updateSOButton"
        );


    const cancelButton =
        document.getElementById(
            "cancelSOButton"
        );


    if (updateButton) {

        updateButton.disabled =
            !selectedSO;

    }


    if (cancelButton) {

        cancelButton.disabled =
            !selectedSO;

    }

}


/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

function setValue(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return;
    }


    element.value =
        value == null
            ? ""
            : value;

}


function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    if (!element) {
        return "";
    }


    return String(
        element.value || ""
    ).trim();

}


function setText(
    id,
    value
) {

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
   MONEY FORMAT
========================================================= */

function formatMoney(
    value
) {

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

function escapeHTML(
    value
) {

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


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}


function cssEscape(
    value
) {

    if (
        window.CSS &&
        typeof window.CSS.escape ===
            "function"
    ) {

        return window.CSS.escape(
            String(value)
        );

    }


    return String(value)
        .replace(
            /([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g,
            "\\$1"
        );

}


/* =========================================================
   INITIALIZE SALES ORDER MODULE
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "LOGIS-TECH Sales Order module loaded."
        );

    }
);
