// Purchasing module: records supplier bills, item lines, payment stamps,
// paid/unpaid status, and inventory updates from purchase orders.
const els = {
  form: document.querySelector("#purchasingForm"),
  purchaseList: document.querySelector("#purchaseList"),
  addPurchaseBill: document.querySelector("#addPurchaseBill"),
  reloadPurchasing: document.querySelector("#reloadPurchasing"),
  billStatusList: document.querySelector("#billStatusList"),
  saveStatus: document.querySelector("#saveStatus"),
  adminAuthDialog: document.querySelector("#adminAuthDialog"),
  adminAuthPassword: document.querySelector("#adminAuthPassword"),
  adminAuthError: document.querySelector("#adminAuthError"),
  cancelAdminAuth: document.querySelector("#cancelAdminAuth"),
  confirmAdminAuth: document.querySelector("#confirmAdminAuth")
};

const startupParams = new URLSearchParams(window.location.search);
const shouldCreateBillOnOpen = startupParams.get("addBill") === "1";
const purchaseIdToLoad = String(startupParams.get("purchaseId") || "").trim();

let currentSettings = {
  categories: [],
  products: [],
  purchases: []
};
let createdStartupBill = false;
let activePurchase = createBlankPurchase();

function normalizeThemeGradient(themeGradient) {
  return ["lotus", "emerald", "rose", "blue", "gold", "neutral"].includes(themeGradient) ? themeGradient : "lotus";
}

function applyTheme(themeGradient) {
  document.body.dataset.theme = normalizeThemeGradient(themeGradient);
}

async function loadPurchasing() {
  currentSettings = await window.simplePOS.getSettings();
  applyTheme(currentSettings.themeGradient);
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.products = Array.isArray(currentSettings.products) ? currentSettings.products : [];
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  if (purchaseIdToLoad && !createdStartupBill) {
    createdStartupBill = true;
    const targetPurchase = currentSettings.purchases.find((purchase) => purchase.id === purchaseIdToLoad);
    if (targetPurchase) {
      activePurchase = {
        ...targetPurchase,
        payments: normalizePurchasePayments(targetPurchase.payments),
        items: normalizePurchaseItems(targetPurchase.items)
      };
    }
  } else if (shouldCreateBillOnOpen && !createdStartupBill) {
    createdStartupBill = true;
    activePurchase = createBlankPurchase();
  }
  renderPurchases();
  renderBillStatusList();
}

function normalizeCategories(categories) {
  const source = Array.isArray(categories) ? categories : [];
  return [...new Set(source.map((category) => String(category || "").trim()).filter(Boolean))];
}

function normalizePurchases(purchases) {
  return Array.isArray(purchases)
    ? purchases.map((purchase, index) => {
        const payments = normalizePurchasePayments(purchase.payments);
        const amount = Number(purchase.amount) || 0;
        const createdAt = getPurchaseCreatedAt(purchase, index);
        return {
          id: String(purchase.id || `PO-${Date.now()}-${index}`).trim(),
          company: String(purchase.company || "").trim(),
          billNumber: String(purchase.billNumber || "").trim(),
          date: String(purchase.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
          createdAt,
          notes: String(purchase.notes || "").trim(),
          amount,
          payments,
          paid: getPurchaseBalance(amount, payments) <= 0,
          addedToInventory: purchase.addedToInventory === true,
          appliedInventoryItems: normalizeAppliedInventoryItems(purchase.appliedInventoryItems),
          items: normalizePurchaseItems(purchase.items)
        };
      })
    : [];
}

function normalizePurchasePayments(payments) {
  return Array.isArray(payments)
    ? payments
        .map((payment) => ({
          date: String(payment.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
          amount: Math.max(0, Number(payment.amount) || 0),
          createdAt: String(payment.createdAt || payment.date || new Date().toISOString())
        }))
        .filter((payment) => payment.amount > 0)
    : [];
}

function getPurchasePaymentTotal(payments) {
  return normalizePurchasePayments(payments).reduce((total, payment) => total + Number(payment.amount || 0), 0);
}

function getPurchaseBalance(amount, payments) {
  return Math.max(0, (Number(amount) || 0) - getPurchasePaymentTotal(payments));
}

function formatMoney(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function formatPaymentStamp(value) {
  const timestamp = Date.parse(value || "");
  if (Number.isNaN(timestamp)) return new Date().toLocaleString();
  return new Date(timestamp).toLocaleString();
}

function getPurchaseCreatedAt(purchase, index = 0) {
  const directTimestamp = Date.parse(purchase?.createdAt || "");
  if (!Number.isNaN(directTimestamp)) return new Date(directTimestamp).toISOString();
  const idTimestamp = Number(String(purchase?.id || "").match(/PO-(\d+)/)?.[1]);
  if (Number.isFinite(idTimestamp)) return new Date(idTimestamp).toISOString();
  const dateTimestamp = Date.parse(purchase?.date || "");
  if (!Number.isNaN(dateTimestamp)) return new Date(dateTimestamp).toISOString();
  return new Date(Date.now() + index).toISOString();
}

function formatBillStamp(value) {
  const timestamp = Date.parse(value || "");
  if (Number.isNaN(timestamp)) return "No bill time saved";
  return new Date(timestamp).toLocaleString();
}

function getLatestPaymentStamp(payments) {
  const latestTimestamp = normalizePurchasePayments(payments)
    .map((payment) => Date.parse(payment.createdAt || payment.date || ""))
    .filter((timestamp) => !Number.isNaN(timestamp))
    .sort((left, right) => right - left)[0];
  return latestTimestamp ? new Date(latestTimestamp).toLocaleString() : "";
}

function getPurchaseSortValue(purchase) {
  const createdTimestamp = Date.parse(purchase?.createdAt || "");
  if (!Number.isNaN(createdTimestamp)) return createdTimestamp;
  const dateTimestamp = Date.parse(purchase?.date || "");
  if (!Number.isNaN(dateTimestamp)) return dateTimestamp;
  return 0;
}

function normalizePurchaseItems(items) {
  return Array.isArray(items)
    ? items.map((item) => ({
        code: String(item.code || "").trim(),
        name: String(item.name || "").trim(),
        category: String(item.category || currentSettings.categories[0] || "General").trim(),
        quantity: Number(item.quantity) || 0,
        cost: Number(item.cost) || 0,
        price: Number(item.price) || 0,
        taxable: item.taxable !== false
      }))
    : [];
}

function normalizeAppliedInventoryItems(items) {
  return Array.isArray(items)
    ? items
        .map((item) => ({
          productId: String(item.productId || "").trim(),
          productName: String(item.productName || "").trim(),
          quantity: Number(item.quantity) || 0,
          priceBefore: Number(item.priceBefore) || 0,
          priceAfter: Number(item.priceAfter) || 0,
          priceChanged: item.priceChanged === true,
          createdProduct: item.createdProduct === true
        }))
        .filter((item) => item.productId || item.productName || item.quantity)
    : [];
}

function renderPurchases() {
  const categoryOptions = currentSettings.categories
    .map((category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`)
    .join("");
  const purchasesToRender = [activePurchase || createBlankPurchase()];

  els.purchaseList.innerHTML = purchasesToRender.length
    ? purchasesToRender
        .map(
          (purchase, index) => {
            const balance = getPurchaseBalance(purchase.amount, purchase.payments);
            return `
            <div class="purchase-row" data-index="${index}">
              <div class="purchase-header">
                <label>
                  Company
                  <input data-field="company" value="${escapeAttribute(purchase.company)}" placeholder="Supplier name" required>
                </label>
                <label>
                  Invoice #
                  <input data-field="billNumber" value="${escapeAttribute(purchase.billNumber)}" placeholder="Invoice or bill number">
                </label>
                <label>
                  Date
                  <input data-field="date" type="date" value="${escapeAttribute(purchase.date)}">
                </label>
                <label>
                  Bill Total
                  <input data-field="amount" type="number" min="0" step="0.01" value="${Number(purchase.amount).toFixed(2)}">
                </label>
                <label class="purchase-payment-entry-field">
                  Payment amount
                  <input data-field="paymentEntryAmount" type="number" min="0" step="0.01" placeholder="0.00">
                  <button class="secondary-button purchase-payment-button" type="button" data-add-purchase-payment="${index}">Add Payment</button>
                </label>
                <button class="icon-button danger-button" type="button" data-remove-purchase="${index}" aria-label="Remove purchase bill">
                  <span aria-hidden="true">x</span>
                </button>
              </div>
              <div class="purchase-payment-summary">
                <span>Payments: <strong>${formatMoney(getPurchasePaymentTotal(purchase.payments))}</strong></span>
                <span>Balance Due: <strong>${formatMoney(balance)}</strong></span>
              </div>
              <label class="purchase-notes-row">
                Notes
                <input data-field="notes" value="${escapeAttribute(purchase.notes)}" placeholder="Optional notes: when, where, and how the payment was made">
              </label>
              <div class="purchase-payment-list">
                ${renderPurchasePayments(purchase.payments)}
              </div>
              <div class="purchase-item-list">
                ${renderPurchaseItems(purchase.items, categoryOptions)}
              </div>
              <div class="purchase-actions">
                <button class="secondary-button" type="button" data-add-purchase-item="${index}">Add Item</button>
                <button class="secondary-button" type="button" data-apply-purchase="${index}">${purchase.addedToInventory ? "Add Again to Inventory" : "Add Items to Inventory"}</button>
              </div>
            </div>
          `;
          }
        )
        .join("")
    : `<div class="empty-cart compact-empty">No company bills entered yet.</div>`;

  [...els.purchaseList.querySelectorAll(".purchase-row")].forEach((row, purchaseIndex) => {
    row.querySelectorAll(".purchase-item-row").forEach((itemRow, itemIndex) => {
      itemRow.querySelector('[data-field="category"]').value =
        purchasesToRender[purchaseIndex].items[itemIndex]?.category || currentSettings.categories[0] || "General";
    });
  });
}

function renderPurchasePayments(payments) {
  const normalizedPayments = normalizePurchasePayments(payments);
  if (!normalizedPayments.length) {
    return `<div class="empty-cart compact-empty">No payments recorded yet.</div>`;
  }
  return normalizedPayments
    .map(
      (payment, index) => `
        <div class="purchase-payment-row" data-payment-index="${index}">
          <label>
            Payment stamp
            <input data-field="paymentStamp" value="${escapeAttribute(formatPaymentStamp(payment.createdAt))}" readonly data-created-at="${escapeAttribute(payment.createdAt)}">
          </label>
          <label>
            Payment amount
            <input data-field="paymentAmount" type="number" min="0" step="0.01" value="${Number(payment.amount || 0).toFixed(2)}">
          </label>
          <button class="icon-button danger-button" type="button" data-remove-purchase-payment="${index}" aria-label="Remove payment">
            <span aria-hidden="true">x</span>
          </button>
        </div>
      `
    )
    .join("");
}

function renderPurchaseItems(items, categoryOptions) {
  const normalizedItems = normalizePurchaseItems(items);
  if (!normalizedItems.length) return `<div class="empty-cart compact-empty">No bill items entered yet.</div>`;

  return normalizedItems
    .map(
      (item, index) => `
        <div class="purchase-item-row" data-item-index="${index}">
          <label>
            Code
            <input data-field="code" value="${escapeAttribute(item.code)}" placeholder="Optional">
          </label>
          <label>
            Item
            <input data-field="name" value="${escapeAttribute(item.name)}" placeholder="Item name" required>
          </label>
          <label>
            Category
            <select data-field="category">${categoryOptions}</select>
          </label>
          <label>
            Qty
            <input data-field="quantity" type="number" min="0" step="1" value="${Number(item.quantity || 0)}">
          </label>
          <label>
            Cost
            <input data-field="cost" type="number" min="0" step="0.01" value="${Number(item.cost || 0).toFixed(2)}">
          </label>
          <label>
            Sell Price
            <input data-field="price" type="number" min="0" step="0.01" value="${Number(item.price || 0).toFixed(2)}">
          </label>
          <label class="tax-toggle">
            Tax
            <input data-field="taxable" type="checkbox" ${item.taxable === false ? "" : "checked"}>
          </label>
          <button class="icon-button danger-button" type="button" data-remove-purchase-item="${index}" aria-label="Remove bill item">
            <span aria-hidden="true">x</span>
          </button>
        </div>
      `
    )
    .join("");
}

function renderBillStatusList() {
  const purchases = getBillStatusPurchases().sort(
    (left, right) => getPurchaseSortValue(right) - getPurchaseSortValue(left)
  );
  if (!purchases.length) {
    els.billStatusList.innerHTML = `<div class="empty-cart compact-empty">No bills to list yet.</div>`;
    return;
  }

  els.billStatusList.innerHTML = `
    <h3>Bill Status</h3>
    <div class="purchase-status-grid">
      ${purchases
        .map((purchase) => {
          const balance = getPurchaseBalance(purchase.amount, purchase.payments);
          const isPaid = balance <= 0;
          const label = purchase.company || purchase.billNumber || purchase.id || "Company bill";
          const invoice = purchase.billNumber ? `Invoice ${escapeHtml(purchase.billNumber)}` : "No invoice number";
          const latestPaymentStamp = getLatestPaymentStamp(purchase.payments);
          return `
            <button class="purchase-status-card" type="button" data-load-purchase="${escapeAttribute(purchase.id)}">
              <div>
                <strong>${escapeHtml(label)}</strong>
                <span>Internal ${escapeHtml(purchase.id)}</span>
                <span>${invoice}</span>
                <span>${escapeHtml(formatBillStamp(purchase.createdAt || purchase.date))}</span>
                ${latestPaymentStamp ? `<span>${isPaid ? "Paid" : "Last payment"}: ${escapeHtml(latestPaymentStamp)}</span>` : ""}
              </div>
              <div class="purchase-status-meta">
                <span class="purchase-status-pill ${isPaid ? "status-complete" : "status-hold"}">${isPaid ? "Paid" : "Unpaid"}</span>
                <strong>${formatMoney(balance)}</strong>
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function getBillStatusPurchases() {
  const savedPurchases = normalizePurchases(currentSettings.purchases);
  const draftPurchase = normalizePurchases([activePurchase || createBlankPurchase()])[0];
  if (!draftPurchase || !isPurchaseMeaningful(draftPurchase)) return savedPurchases;
  const savedIndex = savedPurchases.findIndex((purchase) => purchase.id === draftPurchase.id);
  if (savedIndex >= 0) {
    const mergedPurchases = [...savedPurchases];
    mergedPurchases[savedIndex] = draftPurchase;
    return mergedPurchases;
  }
  return [draftPurchase, ...savedPurchases];
}

function collectPurchases() {
  return [...els.purchaseList.querySelectorAll(".purchase-row")].map((row, index) => {
    const payments = [...row.querySelectorAll(".purchase-payment-row")].map((paymentRow) => ({
      date: String(paymentRow.querySelector('[data-field="paymentStamp"]')?.dataset.createdAt || new Date().toISOString()).slice(0, 10),
      amount: Number(paymentRow.querySelector('[data-field="paymentAmount"]').value || 0),
      createdAt: paymentRow.querySelector('[data-field="paymentStamp"]')?.dataset.createdAt || new Date().toISOString()
    })).filter((payment) => payment.amount > 0);
    const items = [...row.querySelectorAll(".purchase-item-row")].map((itemRow) => ({
      code: itemRow.querySelector('[data-field="code"]').value.trim(),
      name: itemRow.querySelector('[data-field="name"]').value.trim(),
      category: itemRow.querySelector('[data-field="category"]').value.trim() || "General",
      quantity: Number(itemRow.querySelector('[data-field="quantity"]').value || 0),
      cost: Number(itemRow.querySelector('[data-field="cost"]').value || 0),
      price: Number(itemRow.querySelector('[data-field="price"]').value || 0),
      taxable: itemRow.querySelector('[data-field="taxable"]').checked
    })).filter((item) => item.name || item.code || item.quantity > 0);

    const amount = Number(row.querySelector('[data-field="amount"]').value || 0);
    const balance = getPurchaseBalance(amount, payments);
    const existingPurchase = activePurchase?.id
      ? currentSettings.purchases.find((purchase) => purchase.id === activePurchase.id)
      : currentSettings.purchases[index];
    return {
      id: activePurchase?.id || `PO-${Date.now()}-${index}`,
      company: row.querySelector('[data-field="company"]').value.trim(),
      billNumber: row.querySelector('[data-field="billNumber"]').value.trim(),
      date: row.querySelector('[data-field="date"]').value || new Date().toISOString().slice(0, 10),
      createdAt: activePurchase?.createdAt || existingPurchase?.createdAt || new Date().toISOString(),
      amount,
      notes: row.querySelector('[data-field="notes"]').value.trim(),
      payments,
      paid: balance <= 0,
      addedToInventory: existingPurchase?.addedToInventory === true,
      appliedInventoryItems: normalizeAppliedInventoryItems(existingPurchase?.appliedInventoryItems),
      items
    };
  }).filter((purchase) => purchase.company || purchase.billNumber || purchase.notes || purchase.amount > 0 || purchase.payments.length || purchase.items.length);
}

function addPurchaseBill(focusCompany = true) {
  activePurchase = createBlankPurchase();
  renderPurchases();
  resetTopPurchaseDraft();
  renderBillStatusList();
  if (focusCompany) els.purchaseList.querySelector('[data-field="company"]')?.focus();
}

function createBlankPurchase() {
  return {
    id: `PO-${Date.now()}`,
    company: "",
    billNumber: "",
    date: "",
    createdAt: new Date().toISOString(),
    amount: 0,
    notes: "",
    payments: [],
    paid: false,
    addedToInventory: false,
    appliedInventoryItems: [],
    items: []
  };
}

function resetTopPurchaseDraft() {
  const row = els.purchaseList.querySelector(".purchase-row");
  if (!row) return;
  row.querySelector('[data-field="company"]').value = "";
  row.querySelector('[data-field="billNumber"]').value = "";
  row.querySelector('[data-field="date"]').value = "";
  row.querySelector('[data-field="amount"]').value = "0.00";
  row.querySelector('[data-field="notes"]').value = "";
  row.querySelector('[data-field="paymentEntryAmount"]').value = "";
}

function addPurchaseItem(purchaseIndex) {
  activePurchase = collectPurchases()[0] || createBlankPurchase();
  const purchase = activePurchase;
  if (!purchase) return;
  purchase.items.push({
    code: "",
    name: "",
    category: currentSettings.categories[0] || "General",
    quantity: 1,
    cost: 0,
    price: 0,
    taxable: true
  });
  renderPurchases();
  renderBillStatusList();
}

function removePurchaseItem(purchaseIndex, itemIndex) {
  activePurchase = collectPurchases()[0] || createBlankPurchase();
  const purchase = activePurchase;
  if (!purchase) return;
  purchase.items = purchase.items.filter((_, index) => index !== itemIndex);
  renderPurchases();
  renderBillStatusList();
}

async function removePurchaseBill(index) {
  const draftPurchase = collectPurchases()[0] || activePurchase || createBlankPurchase();
  const savedPurchase = currentSettings.purchases.find((purchase) => purchase.id === draftPurchase.id);
  if (savedPurchase) {
    const authorized = await requestAdminOwnerAuthorization();
    if (!authorized) {
      return;
    }
    const reversal = reversePurchaseInventory(savedPurchase);
    currentSettings.purchases = currentSettings.purchases.filter((purchase) => purchase.id !== savedPurchase.id);
    currentSettings = await window.simplePOS.saveSettings({
      ...currentSettings,
      __auditActor: getAuditActor(),
      __auditAction: "Deleted purchasing bill",
      __auditDetails: `Deleted bill ${savedPurchase.id}${savedPurchase.billNumber ? ` / invoice ${savedPurchase.billNumber}` : ""} from ${savedPurchase.company || "supplier"}. Reversed ${reversal.quantityAdjusted} inventory item(s) and ${reversal.priceAdjusted} price change(s).`,
      products: currentSettings.products,
      purchases: currentSettings.purchases
    });
    currentSettings.purchases = normalizePurchases(currentSettings.purchases);
    currentSettings.products = Array.isArray(currentSettings.products) ? currentSettings.products : [];
    els.saveStatus.textContent = `Purchasing bill deleted. Reversed ${reversal.quantityAdjusted} inventory item(s).`;
    setTimeout(() => {
      els.saveStatus.textContent = "";
    }, 2400);
  }
  activePurchase = createBlankPurchase();
  renderPurchases();
  renderBillStatusList();
}

function reversePurchaseInventory(purchase) {
  const appliedItems = normalizeAppliedInventoryItems(purchase.appliedInventoryItems);
  if (!purchase.addedToInventory && !appliedItems.length) {
    return { quantityAdjusted: 0, priceAdjusted: 0 };
  }
  const fallbackItems = appliedItems.length
    ? []
    : normalizePurchaseItems(purchase.items).map((item) => ({
        productId: item.code,
        productName: item.name,
        quantity: item.quantity,
        priceBefore: 0,
        priceAfter: item.price,
        priceChanged: false,
        createdProduct: false
      }));
  const itemsToReverse = appliedItems.length ? appliedItems : fallbackItems;
  const result = { quantityAdjusted: 0, priceAdjusted: 0 };

  itemsToReverse.forEach((item) => {
    const product = findProductForAppliedItem(item);
    if (!product) return;
    const quantity = Math.max(0, Number(item.quantity) || 0);
    if (quantity > 0) {
      product.stock = Math.max(0, Number(product.stock || 0) - quantity);
      result.quantityAdjusted += 1;
    }
    if (item.createdProduct) {
      product.status = "inactive";
      product.note = appendItemNote(product.note, `Set inactive because purchasing bill ${purchase.billNumber || purchase.id} was deleted.`);
    }
    if (item.priceChanged && Number(product.price) === Number(item.priceAfter)) {
      product.price = Number(item.priceBefore) || 0;
      result.priceAdjusted += 1;
    }
  });

  return result;
}

function appendItemNote(existingNote, note) {
  const currentNote = String(existingNote || "").trim();
  return currentNote ? `${currentNote} ${note}` : note;
}

function findProductForAppliedItem(item) {
  const productId = String(item.productId || "").toLowerCase();
  const productName = String(item.productName || "").trim().toLowerCase();
  return currentSettings.products.find((product) =>
    (productId && String(product.id || "").toLowerCase() === productId) ||
    (productName && String(product.name || "").trim().toLowerCase() === productName)
  );
}

async function addPurchasePayment(purchaseIndex) {
  activePurchase = collectPurchases()[0] || createBlankPurchase();
  const purchase = activePurchase;
  if (!purchase) return;
  const row = els.purchaseList.querySelector(`[data-index="${purchaseIndex}"]`) || els.purchaseList.querySelector(".purchase-row");
  const paymentInput = row?.querySelector('[data-field="paymentEntryAmount"]');
  const paymentAmount = Number(paymentInput?.value || 0);
  const balance = getPurchaseBalance(purchase.amount, purchase.payments);
  if (!paymentAmount || paymentAmount <= 0) {
    window.alert("Enter a payment amount before adding payment.");
    paymentInput?.focus();
    return;
  }
  if (balance > 0 && paymentAmount > balance) {
    window.alert(`Payment cannot be more than the balance due of ${formatMoney(balance)}.`);
    paymentInput?.focus();
    return;
  }
  const createdAt = new Date().toISOString();
  purchase.payments.push({
    date: createdAt.slice(0, 10),
    amount: paymentAmount,
    createdAt
  });
  purchase.paid = getPurchaseBalance(purchase.amount, purchase.payments) <= 0;
  currentSettings.purchases = mergePurchaseIntoSaved(currentSettings.purchases, purchase);
  currentSettings = await window.simplePOS.saveSettings({
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Recorded purchasing payment",
    __auditDetails: `Recorded ${formatMoney(paymentAmount)} payment on bill ${purchase.id}${purchase.billNumber ? ` / invoice ${purchase.billNumber}` : ""}.`,
    __auditTargetType: "purchase",
    __auditTargetId: purchase.id,
    __auditTargetLabel: purchase.billNumber || purchase.company || purchase.id,
    purchases: currentSettings.purchases
  });
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  activePurchase = createBlankPurchase();
  renderPurchases();
  renderBillStatusList();
  resetTopPurchaseDraft();
  els.purchaseList.querySelector('[data-field="company"]')?.focus();
  els.saveStatus.textContent = "Payment added and bill saved.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

function removePurchasePayment(purchaseIndex, paymentIndex) {
  activePurchase = collectPurchases()[0] || createBlankPurchase();
  const purchase = activePurchase;
  if (!purchase) return;
  purchase.payments = purchase.payments.filter((_, index) => index !== paymentIndex);
  renderPurchases();
  renderBillStatusList();
}

async function applyPurchaseToInventory(purchaseIndex) {
  activePurchase = collectPurchases()[0] || createBlankPurchase();
  const purchase = activePurchase;
  if (!purchase) return;

  const appliedInventoryItems = [];
  purchase.items.forEach((item) => {
    if (!item.name && !item.code) return;
    const existingProduct = currentSettings.products.find((product) =>
      (item.code && String(product.id || "").toLowerCase() === item.code.toLowerCase()) ||
      String(product.name || "").trim().toLowerCase() === item.name.trim().toLowerCase()
    );

    if (existingProduct) {
      const quantity = Number(item.quantity || 0);
      const priceBefore = Number(existingProduct.price) || 0;
      const nextPrice = Number(item.price) || 0;
      let priceChanged = false;
      existingProduct.stock = Number(existingProduct.stock || 0) + Number(item.quantity || 0);
      if (nextPrice > 0 && nextPrice !== priceBefore) {
        const shouldUpdatePrice = window.confirm(`${existingProduct.name} already exists at ${formatMoney(priceBefore)}. Update sell price to ${formatMoney(nextPrice)} from this purchase bill?`);
        if (shouldUpdatePrice) {
          existingProduct.price = nextPrice;
          priceChanged = true;
        }
      }
      existingProduct.taxable = item.taxable !== false;
      appliedInventoryItems.push({
        productId: String(existingProduct.id || item.code || ""),
        productName: String(existingProduct.name || item.name || ""),
        quantity,
        priceBefore,
        priceAfter: Number(existingProduct.price) || 0,
        priceChanged,
        createdProduct: false
      });
    } else {
      const category = currentSettings.categories.includes(item.category)
        ? item.category
        : currentSettings.categories[0] || "General";
      const newProduct = {
        id: item.code || generateItemCode(category, currentSettings.products),
        name: item.name || "Purchased Item",
        category,
        price: item.price || item.cost || 0,
        stock: Number(item.quantity || 0),
        taxable: item.taxable !== false,
        status: "active",
        note: ""
      };
      currentSettings.products.push(newProduct);
      appliedInventoryItems.push({
        productId: String(newProduct.id || ""),
        productName: String(newProduct.name || ""),
        quantity: Number(item.quantity || 0),
        priceBefore: 0,
        priceAfter: Number(newProduct.price) || 0,
        priceChanged: false,
        createdProduct: true
      });
    }
  });

  purchase.addedToInventory = true;
  purchase.appliedInventoryItems = [
    ...normalizeAppliedInventoryItems(purchase.appliedInventoryItems),
    ...appliedInventoryItems
  ];
  currentSettings.purchases = mergePurchaseIntoSaved(currentSettings.purchases, purchase);
  currentSettings = await window.simplePOS.saveSettings({
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Applied purchase to inventory",
    __auditDetails: `Purchase ${purchase.billNumber || purchase.id} from ${purchase.company || "supplier"} was added to inventory.`,
    __auditTargetType: "purchase",
    __auditTargetId: purchase.id,
    __auditTargetLabel: purchase.billNumber || purchase.company || purchase.id,
    categories: normalizeCategories(currentSettings.categories),
    products: currentSettings.products,
    purchases: currentSettings.purchases
  });
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  renderPurchases();
  renderBillStatusList();
  els.saveStatus.textContent = "Purchase items added to inventory.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

async function savePurchasing(event) {
  event.preventDefault();
  activePurchase = collectPurchases()[0] || createBlankPurchase();
  const savedPurchase = isPurchaseMeaningful(activePurchase) ? normalizePurchases([activePurchase])[0] : null;
  const nextPurchases = isPurchaseMeaningful(activePurchase)
    ? mergePurchaseIntoSaved(currentSettings.purchases, activePurchase)
    : normalizePurchases(currentSettings.purchases);
  currentSettings = await window.simplePOS.saveSettings({
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Saved purchasing",
    __auditDetails: savedPurchase
      ? `Saved purchasing bill ${savedPurchase.id}${savedPurchase.billNumber ? ` / invoice ${savedPurchase.billNumber}` : ""} from ${savedPurchase.company || "supplier"}.`
      : "Purchasing and company bill records were updated.",
    __auditTargetType: savedPurchase ? "purchase" : "",
    __auditTargetId: savedPurchase?.id || "",
    __auditTargetLabel: savedPurchase?.billNumber || savedPurchase?.company || savedPurchase?.id || "",
    purchases: nextPurchases
  });
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  activePurchase = createBlankPurchase();
  renderPurchases();
  resetTopPurchaseDraft();
  renderBillStatusList();
  els.saveStatus.textContent = "Purchasing saved.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

function isPurchaseMeaningful(purchase) {
  return Boolean(
    purchase?.company ||
    purchase?.billNumber ||
    purchase?.notes ||
    Number(purchase?.amount || 0) > 0 ||
    normalizePurchasePayments(purchase?.payments).length ||
    normalizePurchaseItems(purchase?.items).length
  );
}

function mergePurchaseIntoSaved(savedPurchases, purchase) {
  const normalizedPurchase = normalizePurchases([purchase])[0];
  const existing = normalizePurchases(savedPurchases);
  if (!normalizedPurchase || !isPurchaseMeaningful(normalizedPurchase)) return existing;
  const existingIndex = existing.findIndex((item) => item.id === normalizedPurchase.id);
  if (existingIndex >= 0) {
    existing[existingIndex] = normalizedPurchase;
    return existing;
  }
  return [normalizedPurchase, ...existing];
}

function loadPurchaseIntoForm(purchaseId) {
  const purchase = currentSettings.purchases.find((item) => item.id === purchaseId);
  if (!purchase) return;
  activePurchase = {
    ...purchase,
    payments: normalizePurchasePayments(purchase.payments),
    items: normalizePurchaseItems(purchase.items)
  };
  renderPurchases();
  els.purchaseList.querySelector('[data-field="company"]')?.focus();
}

function generateItemCode(category, products) {
  const prefixMap = {
    hair: "HA",
    nails: "NA",
    perfume: "PF",
    makeup: "MU",
    skincare: "SK"
  };
  const normalizedCategory = category.trim().toLowerCase();
  const prefix =
    prefixMap[normalizedCategory] ||
    category
      .replace(/[^a-z0-9]/gi, "")
      .slice(0, 2)
      .toUpperCase()
      .padEnd(2, "I");
  const usedNumbers = products
    .map((product) => String(product.id || ""))
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number(id.split("-")[1]))
    .filter(Number.isFinite);
  const nextNumber = usedNumbers.length ? Math.max(...usedNumbers) + 1 : 1;
  return `${prefix}-${String(nextNumber).padStart(3, "0")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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

function requestAdminOwnerAuthorization() {
  return new Promise((resolve) => {
    if (!els.adminAuthDialog || !els.adminAuthPassword || !els.confirmAdminAuth || !els.cancelAdminAuth) {
      resolve(isAdminOwnerPassword(window.prompt("Admin / Owner password required.")));
      return;
    }

    const cleanup = () => {
      els.confirmAdminAuth.removeEventListener("click", handleConfirm);
      els.cancelAdminAuth.removeEventListener("click", handleCancel);
      els.adminAuthDialog.removeEventListener("cancel", handleCancel);
      els.adminAuthDialog.removeEventListener("close", handleDialogClose);
    };
    const finish = (authorized) => {
      cleanup();
      els.adminAuthPassword.value = "";
      if (els.adminAuthDialog.open) els.adminAuthDialog.close();
      resolve(authorized);
    };
    const handleConfirm = () => {
      if (!isAdminOwnerPassword(els.adminAuthPassword.value)) {
        els.adminAuthError.textContent = "Admin / Owner password was not accepted.";
        els.adminAuthPassword.select();
        return;
      }
      finish(true);
    };
    const handleCancel = (event) => {
      event?.preventDefault();
      finish(false);
    };
    const handleDialogClose = () => {
      cleanup();
      resolve(false);
    };

    els.adminAuthError.textContent = "";
    els.adminAuthPassword.value = "";
    els.confirmAdminAuth.addEventListener("click", handleConfirm);
    els.cancelAdminAuth.addEventListener("click", handleCancel);
    els.adminAuthDialog.addEventListener("cancel", handleCancel);
    els.adminAuthDialog.addEventListener("close", handleDialogClose);
    els.adminAuthDialog.showModal();
    setTimeout(() => els.adminAuthPassword.focus(), 0);
  });
}

function isAdminOwnerPassword(password) {
  if (!password) return false;
  const users = Array.isArray(currentSettings.users) ? currentSettings.users : [];
  return users.some((user) => {
    const values = [user.role, user.username, user.name].map((value) => String(value || "").trim().toLowerCase());
    return user.password === password && values.some((value) => ["admin", "administrator", "owner"].includes(value));
  });
}

els.form.addEventListener("submit", savePurchasing);
els.addPurchaseBill.addEventListener("click", () => addPurchaseBill());
els.reloadPurchasing.addEventListener("click", loadPurchasing);
els.purchaseList.addEventListener("input", () => {
  activePurchase = collectPurchases()[0] || activePurchase || createBlankPurchase();
  renderBillStatusList();
});
els.purchaseList.addEventListener("change", (event) => {
  if (event.target.closest('[data-field="amount"], [data-field="paymentAmount"]')) {
    activePurchase = collectPurchases()[0] || createBlankPurchase();
    renderPurchases();
    renderBillStatusList();
    return;
  }
  renderBillStatusList();
});
els.billStatusList.addEventListener("click", (event) => {
  const statusCard = event.target.closest("[data-load-purchase]");
  if (!statusCard) return;
  loadPurchaseIntoForm(statusCard.dataset.loadPurchase);
});
els.purchaseList.addEventListener("click", (event) => {
  const removePurchaseButton = event.target.closest("[data-remove-purchase]");
  const addItemButton = event.target.closest("[data-add-purchase-item]");
  const removeItemButton = event.target.closest("[data-remove-purchase-item]");
  const addPaymentButton = event.target.closest("[data-add-purchase-payment]");
  const removePaymentButton = event.target.closest("[data-remove-purchase-payment]");
  const applyButton = event.target.closest("[data-apply-purchase]");

  if (removePurchaseButton) {
    removePurchaseBill(Number(removePurchaseButton.dataset.removePurchase)).catch((error) => {
      els.saveStatus.textContent = error?.message || "Delete was cancelled.";
    });
  }
  if (addItemButton) addPurchaseItem(Number(addItemButton.dataset.addPurchaseItem));
  if (addPaymentButton) {
    addPaymentButton.disabled = true;
    addPaymentButton.textContent = "Saving...";
    addPurchasePayment(Number(addPaymentButton.dataset.addPurchasePayment))
      .catch(() => {
        els.saveStatus.textContent = "Unable to save payment.";
      })
      .finally(() => {
        if (document.body.contains(addPaymentButton)) {
          addPaymentButton.disabled = false;
          addPaymentButton.textContent = "Add Payment";
        }
      });
  }
  if (removePaymentButton) {
    const purchaseIndex = Number(removePaymentButton.closest(".purchase-row")?.dataset.index);
    removePurchasePayment(purchaseIndex, Number(removePaymentButton.dataset.removePurchasePayment));
  }
  if (removeItemButton) {
    const purchaseIndex = Number(removeItemButton.closest(".purchase-row")?.dataset.index);
    removePurchaseItem(purchaseIndex, Number(removeItemButton.dataset.removePurchaseItem));
  }
  if (applyButton) {
    applyPurchaseToInventory(Number(applyButton.dataset.applyPurchase)).catch(() => {
      els.saveStatus.textContent = "Unable to add purchase items to inventory.";
    });
  }
});

if (window.simplePOS) {
  window.simplePOS.onSettingsUpdated((settings) => {
    currentSettings = {
      ...currentSettings,
      ...settings,
      categories: normalizeCategories(settings.categories),
      products: Array.isArray(settings.products) ? settings.products : [],
      purchases: normalizePurchases(settings.purchases)
    };
    applyTheme(settings.themeGradient);
    activePurchase = createBlankPurchase();
    renderPurchases();
    renderBillStatusList();
  });
}

loadPurchasing();
