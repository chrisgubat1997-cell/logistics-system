/* LOGIS-TECH SYSTEM — ADMIN SYSTEM MONITOR
   Browser-side diagnostics only. Google Sheets business records are never
   deleted or modified by this monitor.
*/
(function () {
  "use strict";

  const API_URL = "https://script.google.com/macros/s/AKfycbwbIW5tP7VrPEMDpU1-uiAjJ0FNA3HRr94jnDL4Edqyl_7mOkKGNDOAEzfULQyZykNF/exec";
  const POLL_MS = 15000;
  const SAFE_CACHE_KEYS = [
    "logitechSOListCache",
    "logitechSODetailsCache",
    "logitechDeliveryCache",
    "logitechFleetCache",
    "logitechTempData",
    "logitechAppCache"
  ];

  let timer = null;
  let boundPanel = null;
  let lastMetrics = {};
  const recentErrors = [];

  function getAccount() {
    try {
      const raw = JSON.parse(localStorage.getItem("logitechUser") || "{}");
      return raw.account || raw.user || raw;
    } catch (error) {
      return {};
    }
  }

  function isAdmin() {
    const account = getAccount();
    return String(account.role || account.ROLE || account.accountType || account.account_type || account.type || "").trim().toUpperCase() === "ADMIN";
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = String(value);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "Unavailable";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }

  function approximateLocalStorageBytes() {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      const value = localStorage.getItem(key) || "";
      bytes += (key.length + value.length) * 2;
    }
    return bytes;
  }

  function resourceStats() {
    const entries = performance.getEntriesByType ? performance.getEntriesByType("resource") : [];
    let bytes = 0;
    let measured = 0;
    entries.forEach(function (entry) {
      const size = Number(entry.transferSize || entry.encodedBodySize || 0);
      if (size > 0) {
        bytes += size;
        measured++;
      }
    });
    return { count: entries.length, bytes: bytes, measured: measured };
  }

  function recordError(message, source) {
    recentErrors.unshift({
      time: new Date().toISOString(),
      message: String(message || "Unknown browser error").slice(0, 500),
      source: String(source || "Application").slice(0, 180)
    });
    if (recentErrors.length > 30) recentErrors.length = 30;
    renderErrors();
  }

  function attachErrorListeners(targetWindow, label) {
    try {
      if (!targetWindow || targetWindow.__logisMonitorAttached) return;
      targetWindow.__logisMonitorAttached = true;
      targetWindow.addEventListener("error", function (event) {
        recordError(event.message || "Script/resource error", label + (event.filename ? " · " + event.filename : ""));
      });
      targetWindow.addEventListener("unhandledrejection", function (event) {
        const reason = event.reason;
        recordError(reason && reason.message ? reason.message : String(reason || "Unhandled promise rejection"), label + " · Promise");
      });
    } catch (error) {
      recordError(error.message, "Monitor listener");
    }
  }

  function renderErrors() {
    setText("monitorErrorCount", recentErrors.length);
    setText("monitorMemoryUsage", memory ? formatBytes(memory.used) + " / " + formatBytes(memory.limit) : "Not exposed");
    const list = byId("monitorErrorList");
    if (!list) return;
    if (!recentErrors.length) {
      list.innerHTML = '<div class="monitor-empty">No browser errors captured during this session.</div>';
      return;
    }
    list.innerHTML = recentErrors.slice(0, 5).map(function (item) {
      const time = new Date(item.time).toLocaleTimeString();
      const message = item.message.replace(/[&<>"']/g, function (char) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
      });
      const source = item.source.replace(/[&<>"']/g, function (char) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char];
      });
      return '<div class="monitor-error-item"><strong>' + message + '</strong><small>' + source + ' · ' + time + '</small></div>';
    }).join("");
  }

  async function checkApi() {
    const started = performance.now();
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = window.setTimeout(function () {
      if (controller) controller.abort();
    }, 9000);
    try {
      const response = await fetch(API_URL + "?action=ping&monitor=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        signal: controller ? controller.signal : undefined
      });
      const result = await response.json();
      if (!response.ok || !result || result.success !== true) throw new Error("API returned an unsuccessful response.");
      return { online: true, latency: Math.round(performance.now() - started), system: result.system || "Apps Script API", timestamp: result.timestamp || "" };
    } catch (error) {
      return { online: false, latency: null, system: "Apps Script API", error: error.name === "AbortError" ? "Request timed out" : error.message };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function refreshMonitor() {
    if (!isAdmin()) {
      const panel = byId("systemMonitorPanel");
      if (panel) panel.style.display = "none";
      return;
    }
    const refresh = byId("systemMonitorRefresh");
    if (refresh) {
      refresh.disabled = true;
      refresh.textContent = "Checking…";
    }

    const localBytes = approximateLocalStorageBytes();
    const assets = resourceStats();
    const online = navigator.onLine !== false;
    const api = await checkApi();
    let storage = null;
    try {
      if (navigator.storage && navigator.storage.estimate) storage = await navigator.storage.estimate();
    } catch (error) {
      recordError(error.message, "Storage estimate");
    }

    const used = storage && Number.isFinite(storage.usage) ? storage.usage : null;
    const quota = storage && Number.isFinite(storage.quota) ? storage.quota : null;
    const usagePercent = used !== null && quota ? Math.min(100, Math.round(used / quota * 100)) : null;
    const memory = performance.memory && Number.isFinite(performance.memory.usedJSHeapSize)
      ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize, limit: performance.memory.jsHeapSizeLimit }
      : null;
    const loadTime = performance.timing && performance.timing.loadEventEnd && performance.timing.navigationStart
      ? Math.max(0, performance.timing.loadEventEnd - performance.timing.navigationStart)
      : null;

    lastMetrics = {
      checkedAt: new Date().toISOString(),
      networkOnline: online,
      api: api,
      localStorageBytes: localBytes,
      browserStorageBytes: used,
      browserStorageQuotaBytes: quota,
      browserStoragePercent: usagePercent,
      loadedResourceCount: assets.count,
      measuredAssetBytes: assets.bytes,
      measuredAssetCount: assets.measured,
      pageLoadMs: loadTime,
      errors: recentErrors.slice(0, 30)
    };

    setStatus("monitorNetworkStatus", online ? "Online" : "Offline", online ? "good" : "bad");
    setStatus("monitorApiStatus", api.online ? "Connected" : "Unreachable", api.online ? "good" : "bad");
    setText("monitorApiLatency", api.online ? api.latency + " ms response" : api.error || "No response");
    setStatus("monitorBrowserStatus", document.visibilityState === "visible" ? "Active tab" : "Background tab", "neutral");
    setText("monitorStorageUsage", used !== null ? formatBytes(used) + (quota ? " / " + formatBytes(quota) : "") : formatBytes(localBytes) + " localStorage estimate");
    setText("monitorStoragePercent", usagePercent !== null ? usagePercent + "% browser storage quota" : "LocalStorage estimate: " + formatBytes(localBytes));
    setText("monitorLocalStorage", formatBytes(localBytes));
    setText("monitorAssetSize", assets.measured ? formatBytes(assets.bytes) + " measured transfer" : "Size not exposed by browser cache");
    setText("monitorAssetCount", assets.count + " resources loaded");
    setText("monitorLoadTime", loadTime !== null ? (loadTime / 1000).toFixed(2) + " sec" : "Not available");
    setText("monitorLastChecked", new Date().toLocaleString());
    setText("monitorSystemName", api.system || "LOGIS-TECH SYSTEM");
    renderErrors();

    const health = !online || !api.online ? "Attention required" : recentErrors.length ? "Operational · browser errors detected" : "Operational";
    setStatus("monitorOverallStatus", health, !online || !api.online ? "bad" : recentErrors.length ? "warn" : "good");

    if (refresh) {
      refresh.disabled = false;
      refresh.textContent = "↻ Check Now";
    }
  }

  function setStatus(id, label, state) {
    const element = byId(id);
    if (!element) return;
    element.textContent = label;
    element.className = "monitor-status-value " + state;
  }

  async function clearTemporaryCache() {
    if (!isAdmin()) return;
    const confirmed = window.confirm(
      "Clear only temporary browser/app cache entries?\n\nThis will NOT delete Google Sheets records, Sales Orders, Delivery Receipts, Invoices, Payments, users, login sessions, settings, or IndexedDB business-data cache."
    );
    if (!confirmed) return;

    let removed = 0;
    SAFE_CACHE_KEYS.forEach(function (key) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        removed++;
      }
    });

    let cacheCount = 0;
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        const results = await Promise.all(names.map(function (name) { return caches.delete(name); }));
        cacheCount = results.filter(Boolean).length;
      }
    } catch (error) {
      recordError(error.message, "Cache cleanup");
    }

    setText("monitorCleanupResult", removed + " temporary local cache entries and " + cacheCount + " browser cache buckets cleared. Business records were not touched.");
    await refreshMonitor();
  }

  function downloadReport() {
    if (!isAdmin()) return;
    const report = {
      application: "LOGIS-TECH SYSTEM",
      generatedAt: new Date().toISOString(),
      currentPage: location.href,
      browser: navigator.userAgent,
      metrics: lastMetrics,
      note: "Browser-side diagnostic report only. It does not include Google Sheets file sizes or server-side Apps Script execution logs."
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "LOGIS-TECH-System-Diagnostics-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function bindPanel() {
    const panel = byId("systemMonitorPanel");
    if (!panel || boundPanel === panel) return;
    boundPanel = panel;
    if (!isAdmin()) {
      panel.style.display = "none";
      return;
    }
    panel.style.display = "";
    const refresh = byId("systemMonitorRefresh");
    const cleanup = byId("systemMonitorCleanup");
    const report = byId("systemMonitorReport");
    if (refresh) refresh.addEventListener("click", refreshMonitor);
    if (cleanup) cleanup.addEventListener("click", clearTemporaryCache);
    if (report) report.addEventListener("click", downloadReport);
    attachErrorListeners(window, "Main application");
    const dashboard = document.querySelector(".dashboard-frame");
    if (dashboard) {
      dashboard.addEventListener("load", function () {
        try { attachErrorListeners(dashboard.contentWindow, "Dashboard iframe"); } catch (error) {}
      });
      try { attachErrorListeners(dashboard.contentWindow, "Dashboard iframe"); } catch (error) {}
    }
    refreshMonitor();
    if (!timer) timer = window.setInterval(refreshMonitor, POLL_MS);
  }

  function start() {
    if (!isAdmin()) return;
    const observer = new MutationObserver(bindPanel);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    bindPanel();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
  window.LOGISTECH_SYSTEM_MONITOR = { refresh: refreshMonitor, getLastMetrics: function () { return Object.assign({}, lastMetrics); } };
})();