/* =========================================================
   LOGIS-TECH SYSTEM
   ROLE-BASED ACTION VISIBILITY
   VERSION: 20261015-role02

   UI convenience only. Server-side authorization is still
   required for every create/update/cancel/post operation.
========================================================= */
(function () {
    "use strict";

    const ROLE_ACCESS = {
        sales: ["ADMIN", "SALES"],
        delivery: ["ADMIN", "LOGISTICS"],
        invoice: ["ADMIN", "FINANCE", "PAYMENT"],
        payment: ["ADMIN", "FINANCE", "PAYMENT"]
    };

    const ROOTS = [
        { selector: ".sales-order-module, #salesOrderPage", section: "sales" },
        { selector: ".delivery-module", section: "delivery" },
        { selector: ".invoicing-container", section: "invoice" },
        { selector: ".payment-module", section: "payment" }
    ];

    const ACTION_WORDS = /(^|\\b)(edit|update|cancel|delete|remove|void|post|save|create|prepare|add|submit|approve|reject)(\\b|$)/i;
    const NON_MUTATING_WORDS = /(^|\\b)(view|details|refresh|search|filter|back|close|print|download|preview)(\\b|$)/i;

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
        ].filter(Boolean).join(" ");
    }

    function isActionControl(element) {
        if (element.closest("[data-role-visibility-ignore='true']")) return false;
        const label = getActionText(element).replace(/[_-]+/g, " ");
        if (!ACTION_WORDS.test(label)) return false;

        // Keep clearly non-mutating controls visible (e.g. View, Refresh, Search).
        const visibleLabel = String(element.innerText || element.value || "").trim();
        if (NON_MUTATING_WORDS.test(visibleLabel) && !/(edit|update|cancel|delete|remove|void|post|save|create|prepare|add|submit|approve|reject)/i.test(visibleLabel)) {
            return false;
        }
        return true;
    }

    function applyToRoot(root, section, role) {
        const allowed = ROLE_ACCESS[section] || [];
        const canMutate = allowed.includes(role);
        const controls = root.querySelectorAll(
            "button, [role='button'], a.btn, input[type='button'], input[type='submit']"
        );

        controls.forEach(function (control) {
            if (!isActionControl(control)) return;

            if (!canMutate) {
                if (!control.hasAttribute("data-role-original-display")) {
                    control.setAttribute("data-role-original-display", control.style.display || "");
                }
                control.style.display = "none";
                control.setAttribute("aria-hidden", "true");
                control.setAttribute("data-role-hidden", "true");
            } else if (control.getAttribute("data-role-hidden") === "true") {
                control.style.display = control.getAttribute("data-role-original-display") || "";
                control.removeAttribute("aria-hidden");
                control.removeAttribute("data-role-hidden");
                control.removeAttribute("data-role-original-display");
            }
        });
    }

    function applyRoleActionVisibility() {
        const role = currentRole();
        if (!role) return;

        ROOTS.forEach(function (entry) {
            document.querySelectorAll(entry.selector).forEach(function (root) {
                applyToRoot(root, entry.section, role);
            });
        });
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
