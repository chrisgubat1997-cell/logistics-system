/* =========================================================
   LOGIS-TECH — GROUPED SIDEBAR NAVIGATION
   Version: 20261124-02
   Frontend only. No API or database writes.
========================================================= */
(function () {
    "use strict";

    const MENU_SELECTOR = ".sidebar .menu";
    const OPEN_GROUP_KEY = "logitechSidebarOpenGroup";

    const GROUPS = [
        {
            key: "sales",
            label: "Sales",
            icon: "chart",
            pages: ["sales"]
        },
        {
            key: "production",
            label: "Production",
            icon: "production",
            pages: ["joRegister", "plantMonitoring"]
        },
        {
            key: "logistics",
            label: "Logistics",
            icon: "truck",
            pages: ["delivery", "fleetAnalytics", "fleetDataEntry", "revolvingFund"]
        },
        {
            key: "finance",
            label: "Finance",
            icon: "finance",
            pages: ["invoice", "payment"]
        }
        ,{
            key: "request-center",
            label: "Request Center",
            icon: "requestCenter",
            pages: ["requestCenter", "paymentRequest", "cashAdvanceRequest", "revolvingFundRequest"]
        }
    ];

    const ICONS = {
        dashboard: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
        messages: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
        sales: '<path d="M4 19V5"/><path d="M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/><path d="M16 6h4v4"/>',
        joRegister: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
        plantMonitoring: '<path d="M3 20h18M5 17V9h4v8M10 17V4h4v13M15 17v-6h4v6"/>',
        production: '<path d="M3 21V8l6 3V8l6 3V4h6v17z"/><path d="M7 15h2M12 15h2M17 15h2"/>',
        delivery: '<path d="M3 7h11v11H3z"/><path d="M14 11h4l3 3v4h-7z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/>',
        fleetAnalytics: '<path d="M4 19V5M4 19h17"/><rect x="7" y="11" width="3" height="5" rx=".5"/><rect x="13" y="7" width="3" height="9" rx=".5"/><rect x="19" y="4" width="2" height="12" rx=".5"/>',
        fleetDataEntry: '<path d="M4 20h4l11-11a2.1 2.1 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
        invoice: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 12h7M9 16h7"/>',
        payment: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M7 15h4"/>',
        revolvingFund: '<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2"/>',
        paymentRequest: '<path d="M5 3h10l4 4v14H5z"/><path d="M14 3v5h5M8 12h8M8 16h5"/><path d="M12 9v6"/>',
        cashAdvanceRequest: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 8v8M9 11h6M3 10h18"/>',
        revolvingFundRequest: '<path d="M4 7h16v13H4z"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M8 13h8M12 10v6"/>',
        reports: '<path d="M4 19V5M4 19h17"/><path d="m7 15 3-4 3 2 5-7"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.8z"/>',
        productivityCup: '<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 6H5v2a4 4 0 0 0 4 4M16 6h3v2a4 4 0 0 1-4 4M12 12v5M8 21h8M10 17h4"/>',
        about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
        requestCenter: '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/><path d="m15 16 2 2 4-4"/>',
        chart: '<path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/>',
        truck: '<path d="M3 7h11v11H3z"/><path d="M14 11h4l3 3v4h-7z"/><circle cx="7.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/>',
        finance: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>'
    };

    const LABELS = {
        dashboard: "Dashboard",
        messages: "Messages",
        sales: "Sales Order",
        joRegister: "Job Register",
        plantMonitoring: "Plant Monitoring",
        delivery: "Delivery",
        fleetAnalytics: "Fleet & Delivery Analytics",
        fleetDataEntry: "Fleet & Delivery Data Entry",
        invoice: "Invoice",
        payment: "Payment",
        requestCenter: "Overview",
        paymentRequest: "Payment Request (RFP)",
        cashAdvanceRequest: "Cash Advance",
        revolvingFundRequest: "Revolving Fund Request",
        revolvingFund: "Revolving Fund",
        reports: "Reports",
        settings: "Settings",
        productivityCup: "Productivity Cup",
        about: "About LOGIS-TECH"
    };

    function svgIcon(name) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            (ICONS[name] || '<circle cx="12" cy="12" r="8"/>') + '</svg>';
    }

    function pageForButton(button) {
        const action = button.getAttribute("onclick") || "";
        const match = action.match(/showPage\s*\(\s*['"]([^'"]+)['"]/i);
        return match ? match[1] : "";
    }

    function createMenuButton(page, label, icon, extraAttributes) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "menu-btn";
        button.setAttribute("onclick", "showPage('" + page + "', this)");
        button.setAttribute("title", label);
        button.setAttribute("aria-label", label);
        button.dataset.navPage = page;
        if (extraAttributes) {
            Object.keys(extraAttributes).forEach(function (key) {
                button.setAttribute(key, extraAttributes[key]);
            });
        }
        const iconSpan = document.createElement("span");
        iconSpan.className = "sidebar-item-icon";
        iconSpan.innerHTML = svgIcon(icon);
        const labelSpan = document.createElement("span");
        labelSpan.className = "sidebar-item-label";
        labelSpan.textContent = label;
        button.append(iconSpan, labelSpan);
        return button;
    }

    function normalizeExistingIcons(menu) {
        menu.querySelectorAll(".menu-btn").forEach(function (button) {
            const page = pageForButton(button);
            const iconSpan = button.querySelector(".sidebar-item-icon");
            if (!iconSpan) return;
            iconSpan.innerHTML = svgIcon(page === "sales" ? "sales" : page);
            button.dataset.navPage = page;
            if (LABELS[page]) {
                const label = button.querySelector(".sidebar-item-label");
                if (label) label.textContent = LABELS[page];
                button.setAttribute("aria-label", LABELS[page]);
                button.title = LABELS[page];
            }
        });
    }

    function makeGroup(definition, pageButtons) {
        const group = document.createElement("section");
        group.className = "nav-group";
        group.dataset.navGroup = definition.key;

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "nav-group-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", "nav-items-" + definition.key);
        toggle.setAttribute("aria-label", definition.label);
        toggle.title = definition.label;
        toggle.innerHTML =
            '<span class="nav-group-icon">' + svgIcon(definition.icon) + '</span>' +
            '<span class="nav-group-label">' + definition.label + '</span>' +
            '<span class="nav-group-chevron" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg></span>';

        const items = document.createElement("div");
        items.className = "nav-group-items";
        items.id = "nav-items-" + definition.key;
        items.hidden = true;

        pageButtons.forEach(function (button) {
            button.classList.add("nav-group-item");
            items.appendChild(button);
        });

        toggle.addEventListener("click", function () {
            setGroupOpen(group, !group.classList.contains("is-open"), true);
        });

        group.append(toggle, items);
        return group;
    }

    function setGroupOpen(group, open, persist) {
        if (!group) return;
        const menu = group.closest(MENU_SELECTOR);
        if (open && menu) {
            menu.querySelectorAll(".nav-group").forEach(function (other) {
                if (other !== group) {
                    other.classList.remove("is-open");
                    const otherItems = other.querySelector(".nav-group-items");
                    const otherToggle = other.querySelector(".nav-group-toggle");
                    if (otherItems) otherItems.hidden = true;
                    if (otherToggle) otherToggle.setAttribute("aria-expanded", "false");
                }
            });
        }
        group.classList.toggle("is-open", open);
        const items = group.querySelector(".nav-group-items");
        const toggle = group.querySelector(".nav-group-toggle");
        if (items) items.hidden = !open;
        if (toggle) toggle.setAttribute("aria-expanded", String(open));
        if (persist) {
            try {
                if (open) localStorage.setItem(OPEN_GROUP_KEY, group.dataset.navGroup);
                else if (localStorage.getItem(OPEN_GROUP_KEY) === group.dataset.navGroup) {
                    localStorage.removeItem(OPEN_GROUP_KEY);
                }
            } catch (error) {}
        }
    }

    function syncGroupVisibility(menu) {
        menu.querySelectorAll(".nav-group").forEach(function (group) {
            const children = Array.from(group.querySelectorAll(".nav-group-item"));
            const hasVisibleChild = children.some(function (button) {
                return button.dataset.roleMenuHidden !== "true" &&
                    button.getAttribute("aria-hidden") !== "true" &&
                    getComputedStyle(button).display !== "none";
            });
            group.hidden = !hasVisibleChild;
            if (!hasVisibleChild) setGroupOpen(group, false, false);
        });
    }

    function initialize() {
        const menu = document.querySelector(MENU_SELECTOR);
        if (!menu || menu.dataset.groupedNavigationReady === "true") return;
        menu.dataset.groupedNavigationReady = "true";

        normalizeExistingIcons(menu);

        const originalButtons = Array.from(menu.querySelectorAll(":scope > .menu-btn"));
        const byPage = {};
        originalButtons.forEach(function (button) {
            const page = pageForButton(button);
            if (page) byPage[page] = button;
        });

        const fragment = document.createDocumentFragment();
        ["dashboard", "messages"].forEach(function (page) {
            if (byPage[page]) fragment.appendChild(byPage[page]);
        });

        GROUPS.forEach(function (definition) {
            const children = definition.pages.map(function (page) {
                return byPage[page];
            }).filter(Boolean);

            if (definition.key === "production" && !byPage.plantMonitoring) {
                byPage.plantMonitoring = createMenuButton("plantMonitoring", LABELS.plantMonitoring, "plantMonitoring");
            }

            if (definition.key === "request-center") {
                ["requestCenter", "paymentRequest", "cashAdvanceRequest", "revolvingFundRequest"].forEach(function (page) {
                    if (!byPage[page]) {
                        byPage[page] = createMenuButton(page, LABELS[page], page);
                        byPage[page].dataset.requestPage = page;
                    }
                    children.push(byPage[page]);
                });
            }

            if (children.length) fragment.appendChild(makeGroup(definition, children));
        });

        ["reports", "settings", "productivityCup", "about"].forEach(function (page) {
            if (byPage[page]) fragment.appendChild(byPage[page]);
        });

        // Preserve any future menu entries that are not part of this navigation map.
        originalButtons.forEach(function (button) {
            if (button.parentNode === menu) fragment.appendChild(button);
        });

        menu.replaceChildren(fragment);

        let savedGroup = "";
        try { savedGroup = localStorage.getItem(OPEN_GROUP_KEY) || ""; } catch (error) {}
        const activeGroup = menu.querySelector(".nav-group-item.active")?.closest(".nav-group");
        const groupToOpen = activeGroup ||
            menu.querySelector('.nav-group[data-nav-group="' + savedGroup + '"]');
        if (groupToOpen) setGroupOpen(groupToOpen, true, false);

        syncGroupVisibility(menu);

        const observer = new MutationObserver(function (records) {
            const activeChanged = records.some(function (record) {
                return record.type === "attributes" &&
                    record.attributeName === "class" &&
                    record.target.classList.contains("nav-group-item");
            });
            if (activeChanged) {
                const activeButton = menu.querySelector(".nav-group-item.active");
                if (activeButton) {
                    const parentGroup = activeButton.closest(".nav-group");
                    if (parentGroup) setGroupOpen(parentGroup, true, false);
                }
            }
            syncGroupVisibility(menu);
        });
        observer.observe(menu, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ["class", "style", "aria-hidden", "data-role-menu-hidden"]
        });

        const requestPage = document.getElementById("requestCenter");
        if (requestPage) requestPage.addEventListener("click", function (event) {
            const cardButton = event.target.closest("[data-request-open]");
            if (!cardButton) return;
            const targetPage = cardButton.dataset.requestOpen;
            const targetButton = menu.querySelector('[data-request-page="' + targetPage + '"]');
            if (targetButton) targetButton.click();
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();