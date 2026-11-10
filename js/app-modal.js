/* =========================================================
   GEMLIGHT / LOGIS-TECH — GLOBAL CENTER MODAL
   Replaces browser-native alert() notifications throughout
   the application with one consistent, accessible modal.
========================================================= */
(function () {
    "use strict";

    if (window.__logisTechModalInstalled) return;
    window.__logisTechModalInstalled = true;

    var queue = [];
    var active = false;
    var modal = null;
    var titleNode = null;
    var messageNode = null;
    var iconNode = null;
    var closeButton = null;
    var cancelButton = null;
    var currentResolve = null;

    function ensureModal() {
        if (modal || !document.body) return;

        modal = document.createElement("div");
        modal.className = "app-modal-backdrop";
        modal.id = "appGlobalModal";
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML =
            '<section class="app-modal" role="alertdialog" aria-modal="true" aria-labelledby="appModalTitle" aria-describedby="appModalMessage">' +
                '<div class="app-modal-accent"></div>' +
                '<div class="app-modal-icon" id="appModalIcon" aria-hidden="true">' +
                    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 8v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
                '</div>' +
                '<h2 class="app-modal-title" id="appModalTitle">Notification</h2>' +
                '<div class="app-modal-message" id="appModalMessage"></div>' +
                '<div class="app-modal-actions"><button type="button" class="app-modal-button app-modal-cancel" id="appModalCancel">Cancel</button><button type="button" class="app-modal-button" id="appModalClose">Okay</button></div>' +
            '</section>';

        document.body.appendChild(modal);
        titleNode = modal.querySelector("#appModalTitle");
        messageNode = modal.querySelector("#appModalMessage");
        iconNode = modal.querySelector("#appModalIcon");
        closeButton = modal.querySelector("#appModalClose");
        cancelButton = modal.querySelector("#appModalCancel");

        closeButton.addEventListener("click", function () { closeCurrent(true); });
        cancelButton.addEventListener("click", function () { closeCurrent(false); });
        modal.addEventListener("click", function (event) {
            if (event.target === modal) closeCurrent(false);
        });
        document.addEventListener("keydown", function (event) {
            if (!active) return;
            if (event.key === "Escape") {
                event.preventDefault();
                closeCurrent(false);
            }
        });
    }

    function classify(message) {
        var value = String(message || "").toLowerCase();
        if (/successfully|saved successfully|updated successfully|created successfully|sent successfully|completed successfully/.test(value)) {
            return { type: "success", title: "Successful", icon: "✓" };
        }
        if (/access denied|not authorized|unable|failed|error|could not|cannot|missing|invalid|please enter|required|not found/.test(value)) {
            return { type: "error", title: "Action Required", icon: "!" };
        }
        if (/already|warning|cannot be|no additional|not allowed|are you sure/.test(value)) {
            return { type: "warning", title: "Notice", icon: "!" };
        }
        return { type: "info", title: "Notification", icon: "i" };
    }

    function showNext() {
        if (active || !queue.length) return;
        ensureModal();
        if (!modal) {
            document.addEventListener("DOMContentLoaded", showNext, { once: true });
            return;
        }

        var item = queue.shift();
        var style = item.type ? { type: item.type, title: item.title || "Confirmation", icon: "?" } : classify(item.message);
        active = true;
        currentResolve = item.resolve || null;

        modal.className = "app-modal-backdrop is-visible " + style.type + (item.confirm ? " is-confirm" : "");
        modal.setAttribute("aria-hidden", "false");
        titleNode.textContent = style.title;
        messageNode.textContent = item.message;
        iconNode.textContent = style.icon;
        closeButton.textContent = item.confirm ? (item.confirmLabel || "Yes, Leave") : "Okay";
        cancelButton.style.display = item.confirm ? "inline-flex" : "none";
        closeButton.focus();
        document.body.classList.add("app-modal-open");
    }

    function closeCurrent(result) {
        if (!active || !modal) return;
        active = false;
        modal.classList.remove("is-visible", "is-confirm");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("app-modal-open");
        var resolve = currentResolve;
        currentResolve = null;
        if (resolve) resolve(result === true);
        window.setTimeout(showNext, 160);
    }

    window.alert = function (message) {
        queue.push({ message: message == null ? "" : String(message) });
        showNext();
    };

    // Expose a small API for future modules that need a titled modal.
    window.LogisTechModal = {
        show: function (message, type, title) {
            queue.push({ message: message == null ? "" : String(message), type: type, title: title });
            showNext();
        },
        confirm: function (message, title, confirmLabel) {
            return new Promise(function (resolve) {
                queue.push({
                    message: message == null ? "" : String(message),
                    type: "warning",
                    title: title || "Confirm Action",
                    confirm: true,
                    confirmLabel: confirmLabel || "Yes, Leave",
                    resolve: resolve
                });
                showNext();
            });
        },
        close: closeCurrent
    };
})();
