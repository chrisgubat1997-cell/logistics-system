/* =========================================================
   FILTER SALES ORDERS
========================================================= */

function filterSOList() {

    const searchInput =
        document.getElementById(
            "soSearch"
        );


    const statusFilter =
        document.getElementById(
            "soStatusFilter"
        );


    const keyword =
        String(
            searchInput
                ? searchInput.value
                : ""
        )
        .trim()
        .toLowerCase();


    const selectedStatus =
        String(
            statusFilter
                ? statusFilter.value
                : "ALL"
        )
        .trim()
        .toUpperCase();


    let filtered =
        salesOrders;


    /* =====================================================
       SEARCH
    ===================================================== */

    if (keyword) {

        filtered =
            filtered.filter(
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

    }


    /* =====================================================
       STATUS
    ===================================================== */

    if (
        selectedStatus &&
        selectedStatus !== "ALL"
    ) {

        filtered =
            filtered.filter(
                function(so) {

                    const status =
                        getSOStatus(so);


                    if (
                        selectedStatus ===
                        "ACTIVE"
                    ) {

                        return isActiveSO(so);

                    }


                    if (
                        selectedStatus ===
                        "PARTIAL"
                    ) {

                        return isPartialSO(so);

                    }


                    if (
                        selectedStatus ===
                        "COMPLETED"
                    ) {

                        return isCompletedSO(so);

                    }


                    if (
                        selectedStatus ===
                        "CANCELLED"
                    ) {

                        return isCancelledSO(so);

                    }


                    return (
                        status ===
                        selectedStatus
                    );

                }
            );

    }


    renderSOList(
        filtered
    );

}
