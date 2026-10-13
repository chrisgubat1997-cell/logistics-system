
/* =====================================================
   OPEN DELIVERY RECEIPT DETAILS
   Use the exact record loaded from the API.
===================================================== */

function openDRDetails(row) {
    if (!row) return;

    const drNumber = String(row.dataset.drNumber || "").trim();

    if (!drNumber) {
        alert("Missing Delivery Receipt number.");
        return;
    }

    // Find the exact DR from the latest API response.
    const matches = deliveryReceiptsCache.filter(function (dr) {
        return getDRNumber(dr) === drNumber;
    });

    if (matches.length === 0) {
        alert(
            "Delivery Receipt " + drNumber +
            " was not found in the loaded database records. Please refresh."
        );
        return;
    }

    if (matches.length > 1) {
        console.error(
            "Duplicate DR number detected:",
            drNumber,
            matches
        );

        alert(
            "Duplicate DR number detected: " + drNumber +
            ". Please check the Google Sheets database."
        );
        return;
    }

    const activeDR = matches[0];

    selectedDRRecord = activeDR;

    // Save only the selected DR reference, not a copied record.
    try {
        localStorage.setItem(
            SELECTED_DR_STORAGE_KEY,
            JSON.stringify({
                drNumber: drNumber,
                selectedAt: new Date().toISOString()
            })
        );
    } catch (error) {
        console.warn("Unable to save selected DR reference:", error);
    }

    const listView = document.getElementById("deliveryListView");
    const detailsView = document.getElementById("drDetailsView");

    if (!detailsView) {
        console.error(
            "Missing #drDetailsView in the Delivery HTML."
        );

        alert(
            "The Delivery Receipt details section could not be found. " +
            "Please check the HTML element ID: drDetailsView."
        );

        return;
    }

    if (listView) {
        listView.style.display = "none";
    }

    detailsView.style.display = "block";

    // Find the corresponding Sales Order for reference only.
    const soNumber = getSONumber(activeDR);

    const matchingSO = salesOrdersCache.find(function (so) {
        return getSONumber(so) === soNumber;
    }) || null;

    // Render fields from the selected DR.
    renderDRDetails(activeDR, getDRItems(activeDR), matchingSO);

    console.log("Selected DR number:", drNumber);
    console.log("Selected DR record from API:", activeDR);
    console.log("Selected DR items from API:", getDRItems(activeDR));
}


/* =====================================================
   RENDER DELIVERY RECEIPT DETAILS
   Never reuse hardcoded sample values.
===================================================== */

function renderDRDetails(dr, items, matchingSO) {
    const detailsView = document.getElementById("drDetailsView");

    if (!detailsView || !dr) return;

    items = Array.isArray(items) ? items : getDRItems(dr);
    matchingSO = matchingSO || null;

    const drNumber = getDRNumber(dr);
    const soNumber = getSONumber(dr);
    const status = getDRStatus(dr);

    /*
     * Important:
     * Prefer values saved in the DR.
     * Use the linked SO only for fields that are not saved in the DR.
     */

    function field(record, keys, fallback) {
        return getValue(record, keys, fallback ?? "—");
    }

    function drField(drKeys, soKeys, fallback = "—") {
        const drValue = getValue(dr, drKeys, null);

        if (drValue !== null) {
            return drValue;
        }

        if (matchingSO && soKeys) {
            const soValue = getValue(matchingSO, soKeys, null);

            if (soValue !== null) {
                return soValue;
            }
        }

        return fallback;
    }

    function setField(selector, value) {
        const element = detailsView.querySelector(selector);

        if (element) {
            element.textContent =
                value === undefined ||
                value === null ||
                String(value).trim() === ""
                    ? "—"
                    : String(value);
        }
    }

    function setFirstExisting(selectors, value) {
        for (const selector of selectors) {
            const element = detailsView.querySelector(selector);

            if (element) {
                element.textContent =
                    value === undefined ||
                    value === null ||
                    String(value).trim() === ""
                        ? "—"
                        : String(value);

                return;
            }
        }
    }

    // DR number and status.
    setFirstExisting(
        [
            "[data-dr-title]",
            "#activeDRNumber",
            "#detailsDRNumber",
            ".delivery-details-header h1"
        ],
        drNumber || "—"
    );

    setFirstExisting(
        [
            "[data-dr-status]",
            "#activeDRStatus",
            "#detailsDRStatus"
        ],
        status
    );

    // Fields below use the DR value first.
    // Linked SO values are only used where the DR has no saved value.
    const details = {
        soNumber: drField(
            ["SO_NUMBER", "soNumber", "SALES_ORDER_NUMBER", "salesOrderNumber"],
            ["SO_NUMBER", "soNumber", "SALES_ORDER_NUMBER", "salesOrderNumber"]
        ),

        transferDate: formatDate(drField(
            ["DATE_OF_TRANSFER", "dateOfTransfer", "TRANSFER_DATE", "transferDate", "DR_DATE", "drDate"],
            null
        )),

        deliveredDate: formatDate(drField(
            ["DATE_DELIVERED", "dateDelivered", "ACTUAL_DELIVERY_DATE", "actualDeliveryDate"],
            null
        )),

        customer: drField(
            ["CLIENT_NAME", "clientName", "CUSTOMER_NAME", "customerName"],
            ["CLIENT_NAME", "clientName", "CUSTOMER_NAME", "customerName"]
        ),

        project: drField(
            ["PROJECT", "project", "PROJECT_NAME", "projectName"],
            ["PROJECT", "project", "PROJECT_NAME", "projectName"]
        ),

        attention: drField(
            ["ATTENTION", "attention", "CONTACT_PERSON", "contactPerson"],
            ["ATTENTION", "attention", "CONTACT_PERSON", "contactPerson"]
        ),

        deliveryAddress: drField(
            ["DELIVERY_ADDRESS", "deliveryAddress", "ADDRESS", "address"],
            ["DELIVERY_ADDRESS", "deliveryAddress", "ADDRESS", "address"]
        ),

        preparedBy: drField(
            ["PREPARED_BY", "preparedBy", "CREATED_BY", "createdBy"],
            null
        ),

        vehicle: drField(
            ["VEHICLE", "vehicle", "VEHICLE_NUMBER", "vehicleNumber", "PLATE_NUMBER", "plateNumber"],
            null
        ),

        driver: drField(
            ["DRIVER", "driver", "DRIVER_NAME", "driverName"],
            null
        ),

        remarks: drField(
            ["REMARKS", "remarks", "NOTES", "notes"],
            null
        )
    };

    // Populate modern data attributes if present.
    Object.keys(details).forEach(function (key) {
        setField('[data-dr-field="' + key + '"]', details[key]);
    });

    // Support common IDs used by older versions of the page.
    setFirstExisting(["#activeDRSONumber", "#detailsSONumber"], details.soNumber);
    setFirstExisting(["#activeDRDate", "#detailsTransferDate"], details.transferDate);
    setFirstExisting(["#activeDRDeliveredDate", "#detailsDeliveredDate"], details.deliveredDate);
    setFirstExisting(["#activeDRCustomer", "#detailsCustomer"], details.customer);
    setFirstExisting(["#activeDRProject", "#detailsProject"], details.project);
    setFirstExisting(["#activeDRAddress", "#detailsDeliveryAddress"], details.deliveryAddress);
    setFirstExisting(["#activeDRAttention", "#detailsAttention"], details.attention);
    setFirstExisting(["#activeDRPreparedBy", "#detailsPreparedBy"], details.preparedBy);
    setFirstExisting(["#activeDRVehicle", "#detailsVehicle"], details.vehicle);
    setFirstExisting(["#activeDRDriver", "#detailsDriver"], details.driver);
    setFirstExisting(["#activeDRRemarks", "#detailsRemarks"], details.remarks);

    // Update the item table.
    const tbody = detailsView.querySelector("#activeDRItemsBody");
    const totalElement = detailsView.querySelector("#activeDRTotal");

    if (!tbody) {
        console.error(
            "Missing #activeDRItemsBody in the Delivery details HTML."
        );
        return;
    }

    if (items.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    No item records were returned for this Delivery Receipt.
                    Check whether getDeliveryReceipts() includes DR items
                    or whether a separate DR-items API is required.
                </td>
            </tr>
        `;

        if (totalElement) {
            totalElement.textContent = "—";
        }

        console.warn(
            "No saved items were returned for DR:",
            drNumber,
            dr
        );

        return;
    }

    const soItems = matchingSO ? getSOItems(matchingSO) : [];
    let total = 0;
    let hasUnknownAmount = false;

    tbody.innerHTML = items.map(function (item, index) {
        const itemNumber = getValue(item, [
            "ITEM_NUMBER",
            "itemNumber",
            "ITEM_NO",
            "itemNo",
            "LINE_NUMBER",
            "lineNumber"
        ], index + 1);

        const itemName = getValue(item, [
            "ITEM_NAME",
            "itemName",
            "PRODUCT_NAME",
            "productName",
            "NAME",
            "name"
        ], "—");

        const description = getValue(item, [
            "ITEM_DESCRIPTION",
            "DESCRIPTION",
            "description"
        ], "—");

        const qty = toNumber(getValue(item, [
            "PICK_QTY",
            "pickQty",
            "DELIVERED_QTY",
            "deliveredQty",
            "QTY",
            "qty",
            "QUANTITY",
            "quantity"
        ], 0));

        const unit = getValue(item, [
            "UNIT",
            "unit",
            "UOM",
            "uom"
        ], "—");

        const itemId = String(getValue(item, [
            "SO_ITEM_ID",
            "soItemId",
            "ITEM_ID",
            "itemId"
        ], "")).trim();

        const matchingSOItem = soItems.find(function (soItem) {
            const soItemId = String(getValue(soItem, [
                "SO_ITEM_ID",
                "soItemId",
                "ITEM_ID",
                "itemId"
            ], "")).trim();

            return itemId && soItemId === itemId;
        });

        const savedUnitPrice = getValue(item, [
            "UNIT_PRICE",
            "unitPrice",
            "UNIT_AMOUNT",
            "unitAmount",
            "PRICE",
            "price"
        ], null);

        const unitPrice = savedUnitPrice !== null
            ? toNumber(savedUnitPrice)
            : matchingSOItem
                ? getSOItemUnitAmount(matchingSOItem)
                : null;

        const savedLineAmount = getValue(item, [
            "DR_AMOUNT",
            "LINE_TOTAL",
            "TOTAL_AMOUNT",
            "drAmount",
            "lineTotal",
            "AMOUNT",
            "amount"
        ], null);

        const lineAmount = savedLineAmount !== null
            ? toNumber(savedLineAmount)
            : unitPrice !== null
                ? qty * unitPrice
                : null;

        if (lineAmount === null) {
            hasUnknownAmount = true;
        } else {
            total += lineAmount;
        }

        return `
            <tr>
                <td>${escapeHTML(itemNumber)}</td>
                <td><strong>${escapeHTML(itemName)}</strong></td>
                <td>${escapeHTML(description)}</td>
                <td class="text-center">${qty}</td>
                <td>${escapeHTML(unit)}</td>
                <td class="amount">
                    ${unitPrice === null ? "—" : formatMoney(unitPrice)}
                </td>
                <td class="amount">
                    ${lineAmount === null ? "—" : formatMoney(lineAmount)}
                </td>
            </tr>
        `;
    }).join("");

    // Do not display a misleading total when some line amounts are unknown.
    if (totalElement) {
        totalElement.textContent = hasUnknownAmount
            ? "Incomplete amount data"
            : formatMoney(total);
    }
}
