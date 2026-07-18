const els = {
  invoiceList: document.querySelector("#invoiceList"),
  invoiceDetail: document.querySelector("#invoiceDetail"),
  reportSummary: document.querySelector("#reportSummary"),
  reportingEyebrow: document.querySelector("#reportingEyebrow"),
  reportingTitle: document.querySelector("#reportingTitle"),
  reportingSectionTitle: document.querySelector("#reportingSectionTitle"),
  endOfDayButton: document.querySelector("#endOfDayButton"),
  refreshReports: document.querySelector("#refreshReports"),
  endOfDaySummaryDialog: document.querySelector("#endOfDaySummaryDialog"),
  endOfDaySummaryBody: document.querySelector("#endOfDaySummaryBody"),
  endOfDaySavedLocation: document.querySelector("#endOfDaySavedLocation"),
  confirmSendEndOfDayWhatsapp: document.querySelector("#confirmSendEndOfDayWhatsapp")
};

const modeParam = new URLSearchParams(window.location.search).get("mode");
const reportMode = modeParam === "holds" || modeParam === "eod" ? modeParam : "all";
const CASH_DENOMINATIONS = [1, 10, 20, 50, 100, 500, 1000, 5000, 10000];
const MAX_COUNT_INPUT = 999999999;
const MAX_COUNT_INPUT_LENGTH = 9;
const REPORT_AUTO_REFRESH_MS = 10000;
let invoices = [];
let voids = [];
let selectedOrderNumber = null;
let settingsCache = {};
let endOfDayMode = false;
let restoreInProgress = false;
let lastEndOfDaySummary = null;
let endOfDayGeneratedAt = "";

function applyReportMode() {
  applyReportingActionVisibility();
  if (reportMode === "holds") {
    document.body.classList.add("held-report-mode");
    els.reportingEyebrow.textContent = "Staff";
    els.reportingTitle.textContent = "Held Receipts";
    els.reportingSectionTitle.textContent = "Held Receipts";
    els.reportSummary.classList.add("is-hidden");
    els.endOfDayButton.classList.add("is-hidden");
    document.title = "Held Receipts";
    return;
  }
  if (reportMode === "eod") {
    document.body.classList.add("staff-eod-report-mode");
    els.reportingEyebrow.textContent = "Staff";
    els.reportingTitle.textContent = "Report";
    els.reportingSectionTitle.textContent = "End-of-Day Report";
    els.reportSummary.classList.add("is-hidden");
    els.refreshReports.classList.add("is-hidden");
    document.title = "End-of-Day Report";
  }
}

function applyReportingActionVisibility() {
  if (!isAdminOwnerUser()) return;
  els.endOfDayButton.classList.add("is-hidden");
  els.refreshReports.classList.add("is-hidden");
}

function normalizeThemeGradient(themeGradient) {
  return ["lotus", "emerald", "rose", "blue", "gold", "neutral"].includes(themeGradient) ? themeGradient : "lotus";
}

function applyTheme(themeGradient) {
  document.body.dataset.theme = normalizeThemeGradient(themeGradient);
}

async function loadReports() {
  const settings = await window.simplePOS.getSettings();
  settingsCache = settings;
  applyTheme(settings.themeGradient);
  invoices = Array.isArray(settings.invoices) ? settings.invoices : [];
  voids = Array.isArray(settings.voids) ? settings.voids : [];
  renderSummary();
  renderInvoices();
  if (reportMode === "eod" && !endOfDayMode) generateEndOfDayReport();
}

function parseMoney(value) {
  return Number(String(value || "0").replace(/[^0-9.-]+/g, "")) || 0;
}

function renderSummary() {
  if (reportMode === "holds" || reportMode === "eod") return;
  const completedToday = invoices.filter(
    (invoice) => getStatus(invoice) === "complete" && isToday(invoice.completedAt || invoice.savedAt || invoice.date)
  );
  const totalsByCashier = new Map();
  const totalsByPayment = new Map();

  completedToday.forEach((invoice) => {
    const cashier = getCashierLabel(invoice);
    const payment = invoice.paymentMethod || "Unknown";
    const total = parseMoney(invoice.total);
    totalsByCashier.set(cashier, (totalsByCashier.get(cashier) || 0) + total);
    totalsByPayment.set(payment, (totalsByPayment.get(payment) || 0) + total);
  });

  const cashierRows = [...totalsByCashier.entries()]
    .map(([cashier, total]) => `<span>${escapeHtml(cashier)}: ${formatMoney(total)}</span>`)
    .join("");
  const paymentRows = [...totalsByPayment.entries()]
    .map(([payment, total]) => `<span>${escapeHtml(payment)}: ${formatMoney(total)}</span>`)
    .join("");

  els.reportSummary.innerHTML = `
    <div>
      <strong>End of Day</strong>
      <span>${completedToday.length} completed receipt(s)</span>
    </div>
    <div>
      <strong>By Cashier</strong>
      ${cashierRows || "<span>No completed sales today.</span>"}
    </div>
    <div>
      <strong>By Payment</strong>
      ${paymentRows || "<span>No completed sales today.</span>"}
    </div>
  `;
}

function getCashierLabel(invoice) {
  const username = String(invoice.cashierUsername || "").trim();
  const cashier = String(invoice.cashier || "").trim();
  if (username && username.toLowerCase() !== "unknown") return username;
  if (cashier && cashier.toLowerCase() !== "unknown") return cashier;
  return "Unknown cashier";
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function renderInvoices() {
  const visibleInvoices = getVisibleInvoices();

  els.invoiceList.innerHTML = visibleInvoices.length
    ? visibleInvoices
        .map((invoice, index) => {
          const status = getStatus(invoice);
          return `
            <button class="invoice-list-item" type="button" data-invoice-index="${index}">
              <span class="invoice-list-topline">
                <strong>#${escapeHtml(invoice.orderNumber)}</strong>
                <span class="status-pill ${getStatusClass(status)}">${getStatusLabel(status)}</span>
              </span>
              <span>${escapeHtml(invoice.date)}</span>
              <span>${escapeHtml(invoice.total)}</span>
            </button>
          `;
        })
        .join("")
    : `<div class="empty-cart">${getEmptyInvoiceMessage()}</div>`;

  const selectedInvoice =
    visibleInvoices.find((invoice) => String(invoice.orderNumber) === String(selectedOrderNumber)) || visibleInvoices[0];
  selectedOrderNumber = selectedInvoice?.orderNumber || null;
  renderInvoiceDetail(selectedInvoice);
}

function getVisibleInvoices() {
  if (reportMode === "eod") return [];
  if (reportMode === "holds") {
    return invoices
      .filter((invoice) => getStatus(invoice) === "hold")
      .sort((a, b) => {
        const timestampDifference = getInvoiceTimestamp(b) - getInvoiceTimestamp(a);
        if (timestampDifference !== 0) return timestampDifference;
        return Number(b.orderNumber) - Number(a.orderNumber);
      });
  }
  const visibleInvoices = endOfDayMode
    ? invoices.filter(
        (invoice) => getStatus(invoice) === "complete" && isToday(invoice.completedAt || invoice.savedAt || invoice.date)
      )
    : invoices;
  return [...visibleInvoices].sort((a, b) => {
    const timestampDifference = getInvoiceTimestamp(b) - getInvoiceTimestamp(a);
    if (timestampDifference !== 0) return timestampDifference;
    return Number(b.orderNumber) - Number(a.orderNumber);
  });
}

function getEmptyInvoiceMessage() {
  if (reportMode === "holds") return "No held receipts found.";
  if (reportMode === "eod") return "";
  return endOfDayMode ? "No completed receipts for today." : "No receipts have been completed yet.";
}

function getInvoiceTimestamp(invoice) {
  const timestamp = Date.parse(invoice.voidedAt || invoice.completedAt || invoice.savedAt || invoice.date || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function renderInvoiceDetail(invoice) {
  if (!invoice) {
    els.invoiceDetail.innerHTML = reportMode === "holds"
      ? `<div class="empty-cart compact-empty">Select a held receipt to review it.</div>`
      : "";
    return;
  }

  const status = getStatus(invoice);
  const rows = invoice.items
    .map(
      (item) => `
        <div class="receipt-row">
          <span>${escapeHtml(item.quantity)} x ${escapeHtml(item.name)}</span>
          <strong>${escapeHtml(item.lineTotal)}</strong>
        </div>
      `
    )
    .join("");
  const holdActions =
    status === "hold"
      ? `
        <div class="report-actions">
          <button class="secondary-button" type="button" data-restore-order="${escapeHtml(invoice.orderNumber)}">Restore Bill</button>
          ${reportMode === "holds" ? "" : `<button class="secondary-button danger-action" type="button" data-delete-order="${escapeHtml(invoice.orderNumber)}">Delete Hold</button>`}
        </div>
      `
      : "";

  els.invoiceDetail.innerHTML = `
    <div class="receipt-row"><span>Status</span><strong class="status-pill ${getStatusClass(status)}">${getStatusLabel(status)}</strong></div>
    <div class="receipt-row"><span>Business</span><strong>${escapeHtml(invoice.businessName)}</strong></div>
    ${invoice.businessAddress ? `<div class="receipt-row"><span>Address</span><strong>${escapeHtml(invoice.businessAddress)}</strong></div>` : ""}
    ${invoice.whatsappNumber ? `<div class="receipt-row"><span>WhatsApp</span><strong>${escapeHtml(invoice.whatsappNumber)}</strong></div>` : ""}
    <div class="receipt-row"><span>Order</span><strong>#${escapeHtml(invoice.orderNumber)}</strong></div>
    <div class="receipt-row"><span>Date</span><strong>${escapeHtml(invoice.date)}</strong></div>
    <div class="receipt-row"><span>Cashier</span><strong>${escapeHtml(invoice.cashier)}</strong></div>
    <div class="receipt-row"><span>Payment</span><strong>${escapeHtml(invoice.paymentMethod)}</strong></div>
    ${rows}
    <div class="receipt-row"><span>Subtotal</span><strong>${escapeHtml(invoice.subtotal)}</strong></div>
    <div class="receipt-row"><span>Tax</span><strong>${escapeHtml(invoice.tax)}</strong></div>
    ${parseMoney(invoice.discount) > 0 ? `<div class="receipt-row"><span>Discount ${invoice.discountPercent ? `(${escapeHtml(invoice.discountPercent)})` : ""}</span><strong>-${escapeHtml(invoice.discount)}</strong></div>` : ""}
    <div class="receipt-row"><span>Total</span><strong>${escapeHtml(invoice.total)}</strong></div>
    <div class="receipt-row"><span>Tendered</span><strong>${escapeHtml(invoice.tendered)}</strong></div>
    <div class="receipt-row"><span>Change</span><strong>${escapeHtml(invoice.change)}</strong></div>
    ${holdActions}
  `;
}

function getStatus(invoice) {
  if (invoice.status === "hold") return "hold";
  if (invoice.status === "void") return "void";
  return "complete";
}

function getStatusClass(status) {
  if (status === "hold") return "status-hold";
  if (status === "void") return "status-void";
  return "status-complete";
}

function getStatusLabel(status) {
  if (status === "hold") return "Hold";
  if (status === "void") return "Void";
  return "Complete";
}

function isToday(value) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toLocaleDateString() === new Date().toLocaleDateString();
}

function getCurrentPcDateTime() {
  return new Date().toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAuditActor() {
  try {
    const user = JSON.parse(localStorage.getItem("beauty-pos-session") || "null");
    return user && typeof user === "object"
      ? { name: user.name, username: user.username, role: user.role }
      : null;
  } catch {
    return null;
  }
}

els.invoiceList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-invoice-index]");
  if (!button) return;
  const invoice = getVisibleInvoices()[Number(button.dataset.invoiceIndex)];
  selectedOrderNumber = invoice?.orderNumber || null;
  renderInvoiceDetail(invoice);
});
els.invoiceDetail.addEventListener("click", async (event) => {
  const restoreButton = event.target.closest("[data-restore-order]");
  const deleteButton = event.target.closest("[data-delete-order]");
  const confirmButton = event.target.closest("#confirmDrawerStatus");
  const whatsappButton = event.target.closest("#sendEndOfDayWhatsapp");

  if (confirmButton) {
    confirmEndOfDayDrawer();
    return;
  }

  if (whatsappButton) {
    openEndOfDaySummaryPreview();
    return;
  }

  if (restoreButton) {
    if (restoreInProgress) return;
    if (!canRestoreHold()) {
      const password = window.prompt("Administrator authorization required. Enter an administrator password to restore this held bill.");
      if (!isAdminPassword(password)) return;
    }
    restoreInProgress = true;
    restoreButton.disabled = true;
    restoreButton.textContent = "Restoring...";
    selectedOrderNumber = null;
    const result = await window.simplePOS.restoreInvoice(restoreButton.dataset.restoreOrder, getAuditActor());
    if (result && result.ok === false) {
      window.alert(result.message || "Unable to restore this held bill.");
      restoreInProgress = false;
      await loadReports();
    }
  }

  if (deleteButton) {
    selectedOrderNumber = null;
    await window.simplePOS.deleteInvoice(deleteButton.dataset.deleteOrder, getAuditActor());
    await loadReports();
  }
});
els.invoiceDetail.addEventListener("input", (event) => {
  if (event.target.closest("[data-cash-denomination], #cardCountedTotal")) updateCashDrawerCount();
});
els.invoiceDetail.addEventListener("keydown", (event) => {
  const input = event.target.closest("[data-cash-denomination], #cardCountedTotal");
  if (!input) return;
  if (event.key === "Enter") {
    const result = getDrawerConfirmation();
    if (result?.hasCount) {
      event.preventDefault();
      confirmEndOfDayDrawer();
    }
    return;
  }
  if (event.code !== "NumpadDecimal") return;
  if (input.dataset.decimalInput !== "true") return;
  event.preventDefault();
  insertDecimalAtCursor(input);
  updateCashDrawerCount();
});
els.invoiceDetail.addEventListener("change", (event) => {
  if (event.target.closest("#drawerPaymentMethod")) updatePaymentConfirmationMode(true);
});
els.endOfDayButton.addEventListener("click", () => {
  generateEndOfDayReport();
});
els.refreshReports.addEventListener("click", loadReports);
els.confirmSendEndOfDayWhatsapp.addEventListener("click", async () => {
  if (!lastEndOfDaySummary) return;
  const actor = getAuditActor();
  const result = await window.simplePOS.shareEndOfDayWhatsApp({
    ...lastEndOfDaySummary,
    actorName: actor?.name,
    actorUsername: actor?.username,
    actorRole: actor?.role,
    businessName: settingsCache.businessName,
    businessAddress: settingsCache.businessAddress
  });
  els.endOfDaySummaryDialog.close();
  if (result?.reportPath) {
    els.endOfDaySavedLocation.textContent = `Saved Location: ${result.reportPath}`;
    els.endOfDaySavedLocation.dataset.path = result.reportPath;
    els.endOfDaySavedLocation.classList.remove("is-hidden");
    await window.simplePOS.closeReporting();
  }
});
els.endOfDaySavedLocation.addEventListener("click", () => {
  const targetPath = els.endOfDaySavedLocation.dataset.path;
  if (targetPath) window.simplePOS.openPath(targetPath);
});

if (window.simplePOS) {
  window.simplePOS.onSettingsUpdated((settings) => {
    settingsCache = settings;
    applyTheme(settings.themeGradient);
    invoices = Array.isArray(settings.invoices) ? settings.invoices : [];
    voids = Array.isArray(settings.voids) ? settings.voids : [];
    renderSummary();
    renderInvoices();
  });
}

applyReportMode();
loadReports();
const reportAutoRefresh = window.setInterval(() => {
  if (endOfDayMode || els.endOfDaySummaryDialog.open) return;
  loadReports();
}, REPORT_AUTO_REFRESH_MS);
window.addEventListener("beforeunload", () => window.clearInterval(reportAutoRefresh));

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("beauty-pos-session") || "null");
  } catch {
    return null;
  }
}

function isAdminOwnerUser() {
  const currentUser = getCurrentUser();
  const values = [
    currentUser?.role,
    currentUser?.name,
    currentUser?.username
  ].map((value) => String(value || "").trim().toLowerCase());
  return values.some((value) => ["admin", "administrator", "owner"].includes(value));
}

function canRestoreHold() {
  const currentUser = getCurrentUser();
  if (currentUser?.role === "admin") return true;
  return Boolean(settingsCache.permissions?.staffCanRestoreHolds);
}

function generateEndOfDayReport() {
  if (reportMode === "holds") return;
  endOfDayMode = true;
  endOfDayGeneratedAt = getCurrentPcDateTime();
  els.endOfDayButton.textContent = "Generate End-of-Day Report";
  selectedOrderNumber = null;
  if (reportMode !== "eod") renderInvoices();
  renderEndOfDayReport();
}

function isAdminPassword(password) {
  if (!password) return false;
  const users = Array.isArray(settingsCache.users) ? settingsCache.users : [];
  return users.some((user) => user.role === "admin" && user.password === password);
}

function renderEndOfDayReport() {
  const completedToday = invoices.filter(
    (invoice) => getStatus(invoice) === "complete" && isToday(invoice.completedAt || invoice.savedAt || invoice.date)
  );
  const holdToday = invoices.filter(
    (invoice) => getStatus(invoice) === "hold" && isToday(invoice.savedAt || invoice.date)
  );
  const voidInvoicesToday = invoices.filter(
    (invoice) => getStatus(invoice) === "void" && isToday(invoice.voidedAt || invoice.completedAt || invoice.savedAt || invoice.date)
  );
  const voidsToday = [
    ...voidInvoicesToday,
    ...voids.filter((voidSale) => isToday(voidSale.voidedAt || voidSale.date))
  ];
  const totalSales = completedToday.reduce((sum, invoice) => sum + parseMoney(invoice.total), 0);
  const paymentTotals = getPaymentTotals(completedToday);
  const paymentRows = [...completedToday.reduce((map, invoice) => {
    const payment = invoice.paymentMethod || "Unknown";
    map.set(payment, (map.get(payment) || 0) + parseMoney(invoice.total));
    return map;
  }, new Map()).entries()]
    .map(([payment, total]) => `<span>${escapeHtml(payment)}: ${formatMoney(total)}</span>`)
    .join("");
  const orderNumbers = completedToday.map((invoice) => Number(invoice.orderNumber)).filter(Number.isFinite).sort((a, b) => a - b);
  const orderRange = orderNumbers.length ? `#${orderNumbers[0]} through #${orderNumbers[orderNumbers.length - 1]}` : "No completed receipt numbers today.";

  els.invoiceDetail.innerHTML = `
    <h3>End-of-Day POS Report</h3>
    <div class="end-of-day-grid">
      <div class="end-of-day-left">
        <div class="receipt-row"><span>Report Date</span><strong>${escapeHtml(endOfDayGeneratedAt || getCurrentPcDateTime())}</strong></div>
        <div class="receipt-row"><span>Total Sales</span><strong>${formatMoney(totalSales)}</strong></div>
        <label class="cash-confirmation-field">
          Payment Method to Confirm
          <select id="drawerPaymentMethod">
            <option value="cash">Cash</option>
            <option value="credit">Credit Card</option>
            <option value="debit">Debit Card</option>
          </select>
        </label>
        <div class="receipt-row"><span id="expectedCashDrawerLabel">POS Cash Drawer Expected</span><strong id="expectedCashDrawer" data-cash-total="${paymentTotals.cash.toFixed(2)}" data-credit-total="${paymentTotals.credit.toFixed(2)}" data-debit-total="${paymentTotals.debit.toFixed(2)}" data-expected-cash="${paymentTotals.cash.toFixed(2)}">${formatMoney(paymentTotals.cash)}</strong></div>
        <div class="cash-confirmation-field">
          <span id="countedPaymentLabel">Cashier Counted Cash</span>
          <div class="cash-denomination-grid" id="cashDenominationGrid">
            ${renderCashDenominationInputs()}
          </div>
          <input class="card-count-input is-hidden" id="cardCountedTotal" type="text" inputmode="decimal" data-decimal-input="true" placeholder="0.00">
        </div>
        <div class="receipt-row"><span id="countedCashDrawerLabel">Cashier Counted Total</span><strong id="countedCashDrawer">$0.00</strong></div>
        <div class="cash-confirmation-result" id="cashDrawerResult">
          Enter counts, then click Confirm.
        </div>
        <div class="report-actions">
          <button class="checkout-button" id="confirmDrawerStatus" type="button">Confirm</button>
          <button class="secondary-button ${settingsCache.printerName ? "is-hidden" : ""}" id="sendEndOfDayWhatsapp" type="button">Send to WhatsApp</button>
        </div>
      </div>
      <div class="end-of-day-right">
        <div class="receipt-row"><span>Completed Receipts</span><strong>${completedToday.length}</strong></div>
        <div class="receipt-row"><span>Receipt Range</span><strong>${escapeHtml(orderRange)}</strong></div>
        <div class="receipt-row"><span>Payment Methods</span><strong class="vertical-report-list">${paymentRows || "<span>No completed payments today.</span>"}</strong></div>
        <div class="receipt-row"><span>Refunds</span><strong>No refunds recorded.</strong></div>
        <div class="receipt-row"><span>Voids</span><strong>${voidsToday.length ? `${voidsToday.length} void(s), ${formatMoney(voidsToday.reduce((sum, item) => sum + parseMoney(item.total), 0))}` : "No voids recorded."}</strong></div>
        <div class="receipt-row"><span>Cash Differences</span><strong id="cashDifferenceSummary">Awaiting cashier count.</strong></div>
        <div class="receipt-row"><span>Alert</span><strong>${holdToday.length ? `${holdToday.length} bill(s) still on hold.` : "No alerts recorded."}</strong></div>
        <div class="receipt-row"><span>Next Shift Actions</span><strong>${holdToday.length ? "Review and restore or delete held bills before closing." : "No action needed."}</strong></div>
      </div>
    </div>
  `;
}

function getPaymentTotals(receipts) {
  return receipts.reduce(
    (totals, invoice) => {
      const method = String(invoice.paymentMethod || "").toLowerCase();
      const total = parseMoney(invoice.total);
      if (method === "cash") totals.cash += total;
      if (method === "credit card") totals.credit += total;
      if (method === "debit card") totals.debit += total;
      return totals;
    },
    { cash: 0, credit: 0, debit: 0 }
  );
}

function renderCashDenominationInputs() {
  return CASH_DENOMINATIONS
    .map(
      (amount) => `
        <label>
          ${formatMoney(amount)}
          <input data-cash-denomination="${amount}" data-allow-decimals="${amount === 1 ? "true" : "false"}" type="text" inputmode="${amount === 1 ? "decimal" : "numeric"}" maxlength="${MAX_COUNT_INPUT_LENGTH}" ${amount === 1 ? `data-decimal-input="true"` : ""} placeholder="0">
        </label>
      `
    )
    .join("");
}

function updateCashDrawerCount() {
  const result = getDrawerConfirmation();
  if (!result) return;
  renderDrawerStatus(result, `Enter ${result.paymentLabel.toLowerCase()} count to confirm status.`);
}

function confirmEndOfDayDrawer(autoAdvance = true) {
  const result = getDrawerConfirmation();
  if (!result) return;
  renderDrawerStatus(result, `Enter ${result.paymentLabel.toLowerCase()} count before confirming.`);
  if (!result.hasCount) return;
  markPaymentMethodConfirmed(result);
  if (!autoAdvance) return;
  const nextMethod = getNextUnconfirmedPayment(result.method);
  if (nextMethod) {
    switchToPaymentMethod(nextMethod);
    return;
  }
  openEndOfDaySummaryPreview();
}

function renderDrawerStatus(result, emptyMessage) {
  result.countedEl.textContent = formatMoney(result.counted);
  if (!result.hasCount) {
    result.resultEl.className = "cash-confirmation-result";
    result.resultEl.textContent = emptyMessage;
    result.summaryEl.textContent = "Awaiting cashier count.";
    return;
  }

  if (result.difference < 0) {
    result.resultEl.className = "cash-confirmation-result status-short";
    result.resultEl.textContent = `Short - Bad: ${result.paymentLabel} is missing ${result.absoluteDifference}.`;
    result.summaryEl.textContent = `Short by ${result.absoluteDifference}`;
    return;
  }

  if (result.difference > 0) {
    result.resultEl.className = "cash-confirmation-result status-over";
    result.resultEl.textContent = `Over - Good: ${result.paymentLabel} has ${result.absoluteDifference} extra.`;
    result.summaryEl.textContent = `Over by ${result.absoluteDifference}`;
    return;
  }

  result.resultEl.className = "cash-confirmation-result status-balanced";
  result.resultEl.textContent = `Balanced: ${result.paymentLabel} count matches POS total.`;
  result.summaryEl.textContent = "Balanced";
}

function getDrawerConfirmation() {
  updatePaymentConfirmationMode();
  const method = document.querySelector("#drawerPaymentMethod")?.value || "cash";
  const inputs = [...document.querySelectorAll("[data-cash-denomination]")];
  const cardInput = document.querySelector("#cardCountedTotal");
  const countedEl = document.querySelector("#countedCashDrawer");
  const expectedEl = document.querySelector("#expectedCashDrawer");
  const resultEl = document.querySelector("#cashDrawerResult");
  const summaryEl = document.querySelector("#cashDifferenceSummary");
  if (!inputs.length || !countedEl || !expectedEl || !resultEl || !summaryEl) return null;

  const hasCount = method === "cash"
    ? inputs.some((input) => input.value)
    : Boolean(cardInput?.value);
  const counted = method === "cash"
    ? inputs.reduce((sum, input) => {
        const denomination = Number(input.dataset.cashDenomination || 0);
        const quantity = clampCountInput(input, input.dataset.allowDecimals === "true");
        return sum + denomination * quantity;
      }, 0)
    : clampCountInput(cardInput, true);
  const paymentLabel = getSelectedPaymentLabel();
  const expected = Number(expectedEl.dataset.expectedCash || 0);
  const difference = counted - expected;
  const absoluteDifference = formatMoney(Math.abs(difference));
  const status = difference < 0 ? "Short" : difference > 0 ? "Over" : "Balanced";
  return { counted, countedEl, difference, expected, hasCount, method, paymentLabel, resultEl, status, summaryEl, absoluteDifference };
}

function markPaymentMethodConfirmed(result) {
  const expectedEl = document.querySelector("#expectedCashDrawer");
  if (!expectedEl) return;
  const method = result.method;
  expectedEl.dataset[`${method}Confirmed`] = "true";
  expectedEl.dataset[`${method}Counted`] = result.counted.toFixed(2);
  expectedEl.dataset[`${method}Status`] = result.status;
  expectedEl.dataset[`${method}Difference`] = result.difference.toFixed(2);
}

function switchToNextUnconfirmedPayment(currentMethod) {
  const nextMethod = getNextUnconfirmedPayment(currentMethod);
  if (nextMethod) switchToPaymentMethod(nextMethod);
}

function switchToPaymentMethod(nextMethod) {
  const select = document.querySelector("#drawerPaymentMethod");
  if (!select) return;
  select.value = nextMethod;
  updatePaymentConfirmationMode(true);
  focusCurrentPaymentInput();
}

function getNextUnconfirmedPayment(currentMethod) {
  const expectedEl = document.querySelector("#expectedCashDrawer");
  if (!expectedEl) return "";
  const methodOrder = ["cash", "credit", "debit"];
  const currentIndex = methodOrder.indexOf(currentMethod);
  const orderedMethods = [
    ...methodOrder.slice(currentIndex + 1),
    ...methodOrder.slice(0, Math.max(currentIndex, 0))
  ];
  const nextMethod = orderedMethods.find((method) => {
    const expected = Number(expectedEl.dataset[`${method}Total`] || 0);
    return expected > 0 && expectedEl.dataset[`${method}Confirmed`] !== "true";
  });
  return nextMethod || "";
}

function clampCountInput(input, allowDecimals = false) {
  if (!input) return 0;
  if (input.value.length > MAX_COUNT_INPUT_LENGTH) input.value = input.value.slice(0, MAX_COUNT_INPUT_LENGTH);
  const value = Number(input.value || 0);
  const normalizedValue = allowDecimals ? Math.round(value * 100) / 100 : Math.floor(value);
  const clamped = Math.min(MAX_COUNT_INPUT, Math.max(0, normalizedValue));
  if (value > MAX_COUNT_INPUT) input.value = String(MAX_COUNT_INPUT);
  if (value < 0) input.value = "0";
  return clamped;
}

function insertDecimalAtCursor(input) {
  if (input.value.includes(".")) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}.${input.value.slice(end)}`;
  const nextPosition = start + 1;
  input.setSelectionRange(nextPosition, nextPosition);
}

function updatePaymentConfirmationMode(resetStatus = false) {
  const select = document.querySelector("#drawerPaymentMethod");
  const expectedEl = document.querySelector("#expectedCashDrawer");
  const expectedLabel = document.querySelector("#expectedCashDrawerLabel");
  const countedLabel = document.querySelector("#countedPaymentLabel");
  const countedRowLabel = document.querySelector("#countedCashDrawerLabel");
  const cashGrid = document.querySelector("#cashDenominationGrid");
  const cardInput = document.querySelector("#cardCountedTotal");
  if (!select || !expectedEl || !expectedLabel || !countedLabel || !countedRowLabel || !cashGrid || !cardInput) return;

  const method = select.value;
  const paymentLabel = getSelectedPaymentLabel();
  const expected = Number(expectedEl.dataset[`${method}Total`] || 0);
  if (method !== "cash") {
    expectedEl.dataset[`${method}Counted`] = resetStatus ? (expectedEl.dataset[`${method}Counted`] || "") : cardInput.value;
    cardInput.value = expectedEl.dataset[`${method}Counted`] || "";
  }
  expectedEl.dataset.expectedCash = expected.toFixed(2);
  expectedEl.textContent = formatMoney(expected);
  expectedLabel.textContent = `POS ${paymentLabel} Expected`;
  countedLabel.textContent = method === "cash" ? "Cashier Counted Cash" : `${paymentLabel} Settlement Total`;
  countedRowLabel.textContent = method === "cash" ? "Cashier Counted Total" : `${paymentLabel} Counted Total`;
  cashGrid.classList.toggle("is-hidden", method !== "cash");
  cardInput.classList.toggle("is-hidden", method === "cash");

  if (resetStatus) {
    document.querySelector("#countedCashDrawer").textContent = "$0.00";
    document.querySelector("#cashDrawerResult").className = "cash-confirmation-result";
    document.querySelector("#cashDrawerResult").textContent = `Enter ${paymentLabel.toLowerCase()} count, then click Confirm.`;
    document.querySelector("#cashDifferenceSummary").textContent = "Awaiting confirmation.";
  }
}

function getSelectedPaymentLabel() {
  const method = document.querySelector("#drawerPaymentMethod")?.value || "cash";
  if (method === "credit") return "Credit Card";
  if (method === "debit") return "Debit Card";
  return "Cash";
}

function focusCurrentPaymentInput() {
  const method = document.querySelector("#drawerPaymentMethod")?.value || "cash";
  const input = method === "cash"
    ? document.querySelector("[data-cash-denomination]")
    : document.querySelector("#cardCountedTotal");
  if (!input) return;
  input.focus();
  input.select?.();
}

function openEndOfDaySummaryPreview() {
  const result = getDrawerConfirmation();
  if (!result) return;
  if (!result.hasCount) {
    window.alert("Enter counts and click Confirm before sending the report.");
    return;
  }
  confirmEndOfDayDrawer(false);
  const nextMethod = getNextUnconfirmedPayment(result.method);
  if (nextMethod) {
    switchToPaymentMethod(nextMethod);
    window.alert(`Confirm ${getSelectedPaymentLabel()} before sending the report.`);
    return;
  }
  const summary = buildEndOfDaySummary();
  lastEndOfDaySummary = summary;
  els.endOfDaySummaryBody.innerHTML = renderEndOfDaySummary(summary);
  els.endOfDaySavedLocation.textContent = "";
  els.endOfDaySavedLocation.dataset.path = "";
  els.endOfDaySavedLocation.classList.add("is-hidden");
  els.confirmSendEndOfDayWhatsapp.classList.remove("is-hidden");
  els.endOfDaySummaryDialog.showModal();
}

function buildEndOfDaySummary() {
  const rows = [...document.querySelectorAll("#invoiceDetail .receipt-row")];
  const readRow = (label) => {
    const row = rows.find((item) => item.querySelector("span")?.textContent === label);
    return row?.querySelector("strong")?.textContent || "";
  };
  const methodRows = getConfirmedPaymentRows();
  const overallStatus = methodRows.every((row) => row.status === "Balanced") ? "Balanced" : "Review Needed";
  const lines = [
    `Report Date: ${readRow("Report Date")}`,
    `Total Sales: ${readRow("Total Sales")}`,
    `Completed Receipts: ${readRow("Completed Receipts")}`,
    `Receipt Range: ${readRow("Receipt Range")}`,
    ...methodRows.map((row) => `${row.label}: System ${formatMoney(row.expected)} / Cashier ${formatMoney(row.counted)} / ${row.status} / Difference ${formatMoney(row.difference)}`),
    `Overall Status: ${overallStatus}`,
    `Voids: ${readRow("Voids")}`,
    `Alert: ${readRow("Alert")}`,
    `Next Shift Actions: ${readRow("Next Shift Actions")}`
  ];
  return { lines, methodRows, overallStatus };
}

function getConfirmedPaymentRows() {
  const expectedEl = document.querySelector("#expectedCashDrawer");
  if (!expectedEl) return [];
  return [
    { method: "cash", label: "Cash" },
    { method: "credit", label: "Credit Card" },
    { method: "debit", label: "Debit Card" }
  ]
    .map((item) => ({
      ...item,
      expected: Number(expectedEl.dataset[`${item.method}Total`] || 0),
      counted: Number(expectedEl.dataset[`${item.method}Counted`] || 0),
      difference: Number(expectedEl.dataset[`${item.method}Difference`] || 0),
      status: expectedEl.dataset[`${item.method}Status`] || "Not Confirmed",
      confirmed: expectedEl.dataset[`${item.method}Confirmed`] === "true"
    }))
    .filter((item) => item.expected > 0 || item.confirmed);
}

function renderEndOfDaySummary(summary) {
  const methodRows = summary.methodRows
    .map(
      (row) => `
        <div class="receipt-row">
          <span>${escapeHtml(row.label)}</span>
          <strong>System ${formatMoney(row.expected)} / Cashier ${formatMoney(row.counted)}</strong>
        </div>
        <div class="receipt-row">
          <span>${escapeHtml(row.label)} Status</span>
          <strong>${escapeHtml(row.status)} (${formatMoney(row.difference)})</strong>
        </div>
      `
    )
    .join("");
  return `
    ${summary.lines.slice(0, 4).map((line) => {
      const [label, ...rest] = line.split(":");
      return `<div class="receipt-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(rest.join(":").trim())}</strong></div>`;
    }).join("")}
    ${methodRows}
    <div class="cash-confirmation-result ${summary.overallStatus === "Balanced" ? "status-balanced" : "status-over"}">
      ${summary.overallStatus === "Balanced" ? "Balanced" : "Review Needed: one or more payment methods are Over or Short."}
    </div>
    ${summary.lines.slice(-3).map((line) => {
      const [label, ...rest] = line.split(":");
      return `<div class="receipt-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(rest.join(":").trim())}</strong></div>`;
    }).join("")}
  `;
}
