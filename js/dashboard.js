/* =====================================================
   SALES ORDER POPUP
===================================================== */

function openSalesOrderPopup(type) {

    const popup =
        document.getElementById("salesOrderPopup");

    const title =
        document.getElementById("salesOrderPopupTitle");

    const list =
        document.getElementById("salesOrderPopupList");


    if (!popup || !title || !list) {
        console.error("Sales Order Popup elements not found.");
        return;
    }


    /* =================================================
       GET SALES ORDERS DIRECTLY FROM LOCALSTORAGE
       PARA SIGURADONG MAY DATA ANG POPUP
    ================================================= */

    let salesOrders = [];

    const savedOrders =
        localStorage.getItem("salesOrders");

    if (savedOrders) {

        try {

            salesOrders =
                JSON.parse(savedOrders);

            if (!Array.isArray(salesOrders)) {
                salesOrders = [];
            }

        } catch (error) {

            console.error(
                "Error loading Sales Orders for popup:",
                error
            );

            salesOrders = [];
        }
    }


    /* =================================================
       PERIOD FILTER
       KAPAREHO NG DASHBOARD CARD
    ================================================= */

    const periodElement =
        document.getElementById("salesOrderPeriod");

    const selectedPeriod =
        periodElement
            ? periodElement.value
            : "overall";


    if (selectedPeriod !== "overall") {

        salesOrders =
            salesOrders.filter(function (so) {

                if (!so.dateCreation) {
                    return false;
                }

                const month =
                    String(
                        new Date(so.dateCreation).getMonth() + 1
                    ).padStart(2, "0");

                return month === selectedPeriod;

            });

    }


    /* =================================================
       FILTER BY CARD TYPE
    ================================================= */

    let orders = [];


    if (type === "all") {

        orders = salesOrders;

    }

    else if (type === "active") {

        orders =
            salesOrders.filter(function (so) {

                return String(so.status || "")
                    .toUpperCase() !== "CANCELLED";

            });

    }

    else if (type === "cancelled") {

        orders =
            salesOrders.filter(function (so) {

                return String(so.status || "")
                    .toUpperCase() === "CANCELLED";

            });

    }

    else if (type === "delivered") {

        /* DR MODULE NOT YET CONNECTED */

        orders = [];

    }

    else if (type === "partial") {

        /* DR MODULE NOT YET CONNECTED */

        orders = [];

    }


    /* =================================================
       POPUP TITLE
    ================================================= */

    const titles = {

        all: "TOTAL SALES ORDERS",

        active: "ACTIVE SALES ORDERS",

        cancelled: "CANCELLED SALES ORDERS",

        delivered: "DELIVERED SALES ORDERS",

        partial: "PARTIALLY DELIVERED SALES ORDERS"

    };


    title.textContent =
        titles[type] || "SALES ORDERS";


    /* =================================================
       CLEAR OLD LIST
    ================================================= */

    list.innerHTML = "";


    /* =================================================
       NO DATA
    ================================================= */

    if (orders.length === 0) {

        list.innerHTML = `
            <div class="sales-order-popup-empty">
                No Sales Orders found.
            </div>
        `;

        popup.style.display = "flex";

        return;
    }


    /* =================================================
       CREATE SO LIST
    ================================================= */

    orders.forEach(function (so) {

        const row =
            document.createElement("div");


        row.className =
            "sales-order-popup-row";


        row.innerHTML = `
            <span class="popup-so-number">
                ${escapeHTML(so.soNumber || "NO SO NUMBER")}
            </span>

            <span class="popup-client">
                Client:
                ${escapeHTML(so.clientName || "No Client")}
            </span>
        `;


        list.appendChild(row);

    });


    /* =================================================
       SHOW POPUP
    ================================================= */

    popup.style.display = "flex";


    /* FORCE ANIMATION RESTART */

    void popup.offsetWidth;

    popup.classList.add("popup-open");

}
