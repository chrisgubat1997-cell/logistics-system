/* =========================================================
   GEMLIGHT ONE — COMPANY SWITCH + THEME CONTEXT
   Server-side session validation controls company access.
========================================================= */
(function () {
  "use strict";
  var API_URL = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
  var originalFetch = window.fetch.bind(window);

  function getAccount() {
    try { return JSON.parse(localStorage.getItem("logitechUser") || "{}"); }
    catch (error) { return {}; }
  }
  function getAllowedCompanies(account) {
    var raw = String(account.companyAccess || account.COMPANY_ACCESS || "").trim().toUpperCase();
    if (raw === "BOTH") return ["GREENMETAL", "GREENLIGHT"];
    return raw.split(/[,;|]/).map(function (value) { return value.trim(); })
      .filter(function (value, index, all) {
        return ["GREENMETAL", "GREENLIGHT"].indexOf(value) >= 0 && all.indexOf(value) === index;
      });
  }
  function getActiveCompany(account) {
    var company = String(account.activeCompany || account.defaultCompany || "GREENMETAL").trim().toUpperCase();
    return ["GREENMETAL", "GREENLIGHT"].indexOf(company) >= 0 ? company : "GREENMETAL";
  }
  function applyCompanyTheme(company) {
    var normalized = company === "GREENLIGHT" ? "GREENLIGHT" : "GREENMETAL";
    document.documentElement.setAttribute("data-company", normalized);
    var label = document.getElementById("activeCompanyLabel");
    if (label) label.textContent = normalized;
  }

  /* Attach the server-issued token to the existing modules' JSON API calls. */
  window.fetch = function (input, init) {
    try {
      if (init && typeof init.body === "string") {
        var requestBody = JSON.parse(init.body);
        if (requestBody && requestBody.action &&
            ["login", "createAccount", "ping"].indexOf(String(requestBody.action)) < 0) {
          var account = getAccount();
          var token = account.sessionToken || account.session_token || account.token || "";
          if (token) {
            var data = requestBody.data && typeof requestBody.data === "object" ? requestBody.data : requestBody;
            data.sessionToken = token;
            if (requestBody.data && typeof requestBody.data === "object") requestBody.data = data;
            else requestBody = data;
            init = Object.assign({}, init, { body: JSON.stringify(requestBody) });
          }
        }
      }
    } catch (ignored) {}
    return originalFetch(input, init);
  };

  async function switchCompany(button) {
    var account = getAccount();
    var allowed = getAllowedCompanies(account);
    var current = getActiveCompany(account);
    var target = current === "GREENMETAL" ? "GREENLIGHT" : "GREENMETAL";
    if (allowed.indexOf(target) < 0) {
      window.alert("Your account is not authorized to access " + target + ".");
      return;
    }

    var oldText = button.textContent;
    button.disabled = true;
    button.textContent = "SWITCHING...";
    try {
      var response = await originalFetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "switchCompany",
          data: {
            company: target,
            sessionToken: account.sessionToken || account.session_token || account.token || ""
          }
        })
      });
      var result = await response.json();
      if (!response.ok || !result || result.success !== true) {
        throw new Error((result && (result.message || result.error)) || "Unable to switch company.");
      }
      account.activeCompany = result.activeCompany || target;
      account.companyAccess = result.companyAccess || account.companyAccess;
      account.allowedCompanies = result.allowedCompanies || allowed;
      localStorage.setItem("logitechUser", JSON.stringify(account));

      // Remove legacy shared caches so data from the previous company
      // cannot briefly appear while the new company's modules initialize.
      ["logitechSalesOrders", "logitechDeliveryReceipts", "logitechInvoices", "logitechCustomers"].forEach(function (key) {
        localStorage.removeItem(key);
      });

      applyCompanyTheme(account.activeCompany);
      button.textContent = "LOADING " + account.activeCompany + "...";
      window.location.reload();
    } catch (error) {
      window.alert(error.message || "Unable to switch company. Please try again.");
      button.disabled = false;
      button.textContent = oldText;
    }
  }

  applyCompanyTheme(getActiveCompany(getAccount()));
  document.addEventListener("DOMContentLoaded", function () {
    var account = getAccount();
    var allowed = getAllowedCompanies(account);
    var button = document.getElementById("companySwitchButton");
    applyCompanyTheme(getActiveCompany(account));
    if (!button) return;
    if (allowed.length < 2) {
      button.hidden = true;
      return;
    }
    button.hidden = false;
    function updateButton() {
      var active = getActiveCompany(getAccount());
      button.textContent = active === "GREENMETAL" ? "SWITCH TO GREENLIGHT" : "SWITCH TO GREENMETAL";
      button.setAttribute("aria-label", button.textContent);
    }
    updateButton();
    button.addEventListener("click", function () {
      if (!button.disabled) switchCompany(button);
    });
  });
})();
