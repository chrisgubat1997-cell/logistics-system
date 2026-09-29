/* =====================================================
   LOGI-TECH DASHBOARD
===================================================== */

document.addEventListener("DOMContentLoaded", function () {

    console.log("LOGI-TECH Dashboard Loaded");

    loadDashboard();

});


/* =====================================================
   LOAD DASHBOARD
===================================================== */

function loadDashboard() {

    const savedOrders = localStorage.getItem("salesOrders");

    console.log("Dashboard Sales Orders:", savedOrders);

    let salesOrders = [];

    if (savedOrders) {

        try {

            salesOrders = JSON.parse(savedOrders);

        } catch (error) {

            console.error(
                "Error reading Sales Orders:",
                error
            );

            salesOrders = [];

        }

    }


    /* =================================================
       TOTAL SALES ORDERS
    ================================================= */

    const activeOrders = salesOrders.filter(function (so) {

        return so.status !== "CANCELLED";

    });


    const soCount =
        document.getElementById("dashboardSOCount");

    if (soCount) {

        soCount.textContent = activeOrders.length;

    }


    /* =================================================
       RECENT SALES ORDERS
    ================================================= */

    const recentBody =
        document.getElementById("recentSOBody");

    if (!recentBody) {

        console.error(
            "recentSOBody not found!"
        );

        return;

    }


    recentBody.innerHTML = "";


    if (salesOrders.length === 0) {

        recentBody.innerHTML = `
            <tr>
                <td colspan="4">
                    No Sales Orders found.
                </td>
            </tr>
        `;

        return;

    }


    salesOrders
        .slice()
        .reverse()
        .slice(0, 5)
        .forEach(function (so) {

            const row =
                document.createElement("tr");


            const statusClass =
                so.status === "CANCELLED"
                    ? "status status-cancelled"
                    : "status";


            row.innerHTML = `

                <td>
                    ${escapeHTML(
                        so.soNumber || ""
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        so.clientName || ""
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        so.project || ""
                    )}
                </td>

                <td>

                    <span class="${statusClass}">
                        ${escapeHTML(
                            so.status || ""
                        )}
                    </span>

                </td>

            `;


            recentBody.appendChild(row);

        });

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}
