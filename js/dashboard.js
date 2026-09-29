/* =====================================================
   LOGI-TECH DASHBOARD
===================================================== */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "LOGI-TECH Dashboard Loaded"
        );

        loadDashboard();

    }
);


/* =====================================================
   LOAD DASHBOARD
===================================================== */

function loadDashboard() {

    const savedOrders =
        localStorage.getItem(
            "salesOrders"
        );

    let salesOrders = [];

    try {

        salesOrders =
            savedOrders
            ? JSON.parse(savedOrders)
            : [];

    } catch (error) {

        console.error(
            "Sales Order data error:",
            error
        );

        salesOrders = [];

    }


    const activeOrders =
        salesOrders.filter(function (so) {

            return so.status !==
                "CANCELLED";

        });


    const soCount =
        document.getElementById(
            "dashboardSOCount"
        );

    if (soCount) {

        soCount.innerText =
            activeOrders.length;

    }


    const recentBody =
        document.getElementById(
            "recentSOBody"
        );

    if (!recentBody) {
        return;
    }

    recentBody.innerHTML = "";


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


function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}
