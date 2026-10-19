/* LOGIS-TECH SYSTEM — universal Excel export for currently visible table rows. */
(function () {
  "use strict";
  let tableCounter = 0;
  function cleanText(value) { return String(value == null ? "" : value).replace(/\s+/g, " ").trim(); }
  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    let node = element;
    while (node && node.nodeType === 1) {
      if (node.hidden || node.getAttribute("aria-hidden") === "true") return false;
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") return false;
      node = node.parentElement;
    }
    return element.getClientRects().length > 0;
  }
  function visibleCells(row) {
    return Array.from(row.cells || []).filter(function (cell) {
      const style = window.getComputedStyle(cell);
      return !cell.hidden && style.display !== "none" && style.visibility !== "hidden";
    });
  }
  function getTableTitle(table) {
    const section = table.closest("section, article, .card, .panel, .table-card, .report-section, .payment-section, .section-card");
    const heading = (section || table.parentElement || document).querySelector("h1, h2, h3, h4, .section-title, .payment-section-title, .customer-table-title");
    const title = cleanText(heading && heading.textContent);
    if (title) return title;
    const caption = table.querySelector("caption");
    return cleanText(caption && caption.textContent) || table.getAttribute("aria-label") || "Table_Export";
  }
  function safeFileName(value) {
    return cleanText(value).replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_").replace(/_+/g, "_").slice(0, 70) || "Table_Export";
  }
  function collectTableData(table) {
    const headRows = Array.from(table.tHead ? table.tHead.rows : []);
    let header = [];
    if (headRows.length) header = visibleCells(headRows[headRows.length - 1]).map(function (cell) {
      return cleanText(cell.innerText || cell.textContent);
    });
    const bodyRows = Array.from(table.tBodies || []).reduce(function (all, body) {
      return all.concat(Array.from(body.rows));
    }, []);
    const rows = bodyRows.filter(function (row) {
      if (!isVisible(row)) return false;
      const cells = visibleCells(row);
      if (!cells.length) return false;
      const text = cleanText(row.innerText || row.textContent).toLowerCase();
      if (/^(no records found|no .* found|loading .*|please wait|no data available)[.!…]*$/.test(text)) return false;
      return true;
    }).map(function (row) {
      return visibleCells(row).map(function (cell) {
        const control = cell.querySelector("input, select, textarea");
        if (control) {
          if (control.tagName === "SELECT") {
            const selected = control.options[control.selectedIndex];
            return cleanText(selected ? selected.textContent : control.value);
          }
          return cleanText(control.value);
        }
        return cleanText(cell.innerText || cell.textContent);
      });
    });
    if (!header.length) {
      const firstRow = bodyRows.find(isVisible);
      if (firstRow) header = visibleCells(firstRow).map(function (_, index) { return "Column " + (index + 1); });
    }
    return { header: header, rows: rows };
  }
  function exportTable(table) {
    if (!window.XLSX || !window.XLSX.utils || !window.XLSX.writeFile) {
      window.alert("Hindi pa available ang Excel export. Pakisubukan ulit pagkatapos mag-load ang page.");
      return;
    }
    const data = collectTableData(table);
    if (!data.header.length && !data.rows.length) {
      window.alert("Walang visible table data na puwedeng i-export.");
      return;
    }
    const worksheetData = [];
    if (data.header.length) worksheetData.push(data.header);
    data.rows.forEach(function (row) { worksheetData.push(row); });
    const worksheet = window.XLSX.utils.aoa_to_sheet(worksheetData);
    worksheet["!cols"] = (data.header.length ? data.header : worksheetData[0] || []).map(function (heading, index) {
      const maxLength = worksheetData.reduce(function (max, row) {
        return Math.max(max, String(row[index] == null ? "" : row[index]).length);
      }, String(heading || "").length);
      return { wch: Math.min(Math.max(maxLength + 2, 10), 42) };
    });
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Table Data");
    window.XLSX.writeFile(workbook, safeFileName(getTableTitle(table)) + "_" + new Date().toISOString().slice(0, 10) + ".xlsx");
  }
  function createExportButton(table) {
    // Keep the Sales Order Form preview clean; this universal exporter is for data tables only.
    if (table && table.closest("#soFormPreviewOverlay, .sof-overlay")) return;
    if (!table || table.dataset.excelExportReady === "true" || !table.tHead || !table.tBodies || !table.tBodies.length || !table.querySelector("thead th")) return;
    table.dataset.excelExportReady = "true";
    if (!table.id) table.id = "table-excel-export-" + (++tableCounter);
    const toolbar = document.createElement("div");
    toolbar.className = "table-excel-export-toolbar";
    toolbar.setAttribute("data-for-table", table.id);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-excel-export-button";
    button.title = "Export the currently visible table rows to Excel";
    button.setAttribute("aria-label", "Export visible table rows to Excel");
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path class="excel-sheet" d="M5 3.5h9l5 5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path class="excel-fold" d="M14 3.5v5h5"/><path class="excel-grid" d="M13 11h4M13 14h4M13 17h4"/><path class="excel-x" d="m6.4 11 4.2 6m0-6-4.2 6"/></svg>';
    button.addEventListener("click", function (event) {
      event.preventDefault(); event.stopPropagation(); exportTable(table);
    });
    toolbar.appendChild(button);
    table.parentNode.insertBefore(toolbar, table);
  }
  function scan(root) {
    if (!root) return;
    if (root.matches && root.matches("table")) createExportButton(root);
    if (root.querySelectorAll) root.querySelectorAll("table").forEach(createExportButton);
  }
  function init() {
    scan(document);
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) { if (node.nodeType === 1) scan(node); });
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();