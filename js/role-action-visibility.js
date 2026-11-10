/* =========================================================
   LOGIS-TECH SYSTEM
   ROLE-BASED MENU AND ACTION PERMISSIONS
   VERSION: 20261110-role-matrix01

   UI convenience only. Apps Script must enforce the same permissions
   on every create/update/cancel/post operation.
========================================================= */
(function () {
    "use strict";

    const ROLE_ACCESS = {
        sales: ["ADMIN", "SALES"],
        jo: ["ADMIN", "PRODUCTION"],
        delivery: ["ADMIN", "LOGISTICS"],
        invoice: ["ADMIN", "FINANCE", "PAYMENT"],
        payment: ["ADMIN", "FINANCE", "PAYMENT"]
    };

    const ROOTS = [
        { selector: ".sales-order-module, #salesOrderPage", section: "sales" },
        { selector: "#joRegisterModule, .jo-register-module", section: "jo" },
        { selector: ".delivery-module", section: "delivery" },
        { selector: ".invoicing-container", section: "invoice" },
        { selector: ".payment-module", section: "payment" }
    ];

    const ACTION_WORDS = /(^|\\b)(edit|update|cancel|delete|remove|void|post|save|create|prepare|add|submit|approve|reject|issue|record|assign)(\\b|$)/i;
    const SAFE_WORDS = /(^|\\b)(view|details|refresh|search|filter|clear|back|close|print|download|preview|sort|export)(\\b|$)/i;

    function currentRole() {
        try {
            const saved = JSON.parse(localStorage.getItem("logitechUser") || "{}");
            const account = saved.account || saved.user || saved;
            return String(
                account.role || account.ROLE || account.accountType ||
                account.account_type || account.accounttype || account.type || ""
            ).trim().toUpperCase();
        } catch (error) {
            return "";
        }
    }

    function getActionText(element) {
        return [
            element.innerText,
            element.value,
            element.getAttribute("aria-label"),
            element.getAttribute("title"),
            element.id,
            typeof element.className === "string" ? element.className : "",
            element.getAttribute("onclick")
        ].filter(Boolean).join(" ").replace(/[_-]+/g, " ");
    }

    function isMutationControl(element) {
        if (element.closest("[data-role-visibility-ignore='true']")) return false;
        if (element.matches("input[type='search'], input[type='text'], select")) return false;
        const visibleLabel = String(element.innerText || element.value || "").trim();
        const fullLabel = getActionText(element);
        if (!ACTION_WORDS.test(fullLabel)) return false;
        if (SAFE_WORDS.test(visibleLabel) &&
            !/(edit|update|cancel|delete|remove|void|post|save|create|prepare|add|submit|approve|reject|issue|record|assign)/i.test(visibleLabel)) {
            return false;
        }
        return true;
    }

    function applyToRoot(root, section, role) {
        const allowed = (ROLE_ACCESS[section] || []).includes(role);
        const controls = root.querySelectorAll(
            "button, [role='button'], a.btn, input[type='button'], input[type='submit']"
        );

        controls.forEach(function (control) {
            if (!isMutationControl(control)) return;

            if (!allowed) {
                if (!control.hasAttribute("data-role-original-disabled")) {
                    control.setAttribute("data-role-original-disabled", control.disabled ? "true" : "false");
                }
                control.disabled = true;
                control.setAttribute("aria-disabled", "true");
                control.classList.add("role-action-disabled");
                control.title = control.title || "View only: your account role cannot perform this action.";
                if (control.tagName === "A") {
                    control.setAttribute("tabindex", "-1");
                    control.style.pointerEvents = "none";
                }
            } else if (control.hasAttribute("data-role-original-disabled")) {
                const wasDisabled = control.getAttribute("data-role-original-disabled") === "true";
                control.disabled = wasDisabled;
                if (!wasDisabled) {
                    control.removeAttribute("aria-disabled");
                    control.classList.remove("role-action-disabled");
                    if (control.getAttribute("title") === "View only: your account role cannot perform this action.") {
                        control.removeAttribute("title");
                    }
                }
                control.removeAttribute("data-role-original-disabled");
                if (control.tagName === "A") {
                    control.removeAttribute("tabindex");
                    control.style.pointerEvents = "";
                }
            }
        });
    }

    function setMenuVisibility(selector, visible) {
        document.querySelectorAll(selector).forEach(function (button) {
            if (!button.hasAttribute("data-role-menu-original-display")) {
                button.setAttribute("data-role-menu-original-display", button.style.display || "");
            }
            button.style.display = visible ? (button.getAttribute("data-role-menu-original-display") || "") : "none";
            button.setAttribute("aria-hidden", String(!visible));
        });
    }

    function applySidebarVisibility(role) {
        const canSeeFleet = ["ADMIN", "LOGISTICS"].includes(role);
        const canSeeFund = ["ADMIN", "LOGISTICS"].includes(role);

        document.querySelectorAll(".menu-btn").forEach(function (button) {
            const action = button.getAttribute("onclick") || "";
            if (action.includes("fleetAnalytics") || action.includes("fleetDataEntry")) {
                if (!button.hasAttribute("data-fleet-role-original-display")) {
                    button.setAttribute("data-fleet-role-original-display", button.style.display || "");
                }
                button.style.display = canSeeFleet ? (button.getAttribute("data-fleet-role-original-display") || "") : "none";
                button.setAttribute("aria-hidden", String(!canSeeFleet));
            }
        });

        setMenuVisibility('[data-role-module="revolving-fund"]', canSeeFund);
        // JO Register is visible to all five roles; only its action buttons are role-restricted.
        document.querySelectorAll("[data-jo-register-menu]").forEach(function (button) {
            button.style.display = "";
            button.removeAttribute("aria-hidden");
        });
        // Shared communication remains visible to every authenticated account.
        document.querySelectorAll("[data-messages-menu]").forEach(function (button) {
            button.style.setProperty("display", "flex", "important");
            button.style.setProperty("visibility", "visible", "important");
            button.style.setProperty("opacity", "1", "important");
            button.disabled = false;
            button.removeAttribute("aria-hidden");
        });
    }

    function applyRoleActionVisibility() {
        const role = currentRole();
        if (!role) return;

        applySidebarVisibility(role);
        ROOTS.forEach(function (entry) {
            document.querySelectorAll(entry.selector).forEach(function (root) {
                applyToRoot(root, entry.section, role);
            });
        });

        // JO Register renders its table rows dynamically. Apply the same rule
        // to its action buttons, while keeping search, refresh and filters active.
        const joRoot = document.getElementById("joRegisterModule");
        if (joRoot) applyToRoot(joRoot, "jo", role);
    }

    let queued = false;
    function scheduleApply() {
        if (queued) return;
        queued = true;
        window.setTimeout(function () {
            queued = false;
            applyRoleActionVisibility();
        }, 0);
    }

    document.addEventListener("DOMContentLoaded", scheduleApply);
    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("storage", scheduleApply);
    window.addEventListener("pageshow", scheduleApply);
    scheduleApply();
})();