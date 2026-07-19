// Inventory module: manages category catalogs, item status catalogs, item rows,
// supplier purchase entry points, and Inventory save/import workflows.
const els = {
  form: document.querySelector("#managementForm"),
  categoryList: document.querySelector("#categoryList"),
  newCategoryName: document.querySelector("#newCategoryName"),
  addCategory: document.querySelector("#addCategory"),
  toggleCategoriesSection: document.querySelector("#toggleCategoriesSection"),
  categoriesSectionBody: document.querySelector("#categoriesSectionBody"),
  statusList: document.querySelector("#statusList"),
  newStatusName: document.querySelector("#newStatusName"),
  addStatus: document.querySelector("#addStatus"),
  toggleStatusesSection: document.querySelector("#toggleStatusesSection"),
  statusesSectionBody: document.querySelector("#statusesSectionBody"),
  inventoryList: document.querySelector("#inventoryList"),
  addInventoryItem: document.querySelector("#addInventoryItem"),
  openPurchaseBill: document.querySelector("#openPurchaseBill"),
  inventoryImportExport: document.querySelector("#inventoryImportExport"),
  importExportDialog: document.querySelector("#importExportDialog"),
  inventoryTemplate: document.querySelector("#inventoryTemplate"),
  inventoryImport: document.querySelector("#inventoryImport"),
  closeImportExport: document.querySelector("#closeImportExport"),
  importExportStatus: document.querySelector("#importExportStatus"),
  purchaseList: document.querySelector("#purchaseList"),
  addPurchaseBill: document.querySelector("#addPurchaseBill"),
  reloadInventory: document.querySelector("#reloadInventory"),
  saveStatus: document.querySelector("#saveStatus")
};

let currentSettings = {
  categories: [],
  productStatuses: [],
  products: [],
  purchases: [],
  inventoryFieldVisibility: {
    sku: true,
    barcode: true,
    reorderAt: false,
    note: true,
    adjustmentReason: true
  }
};

const defaultProductStatuses = ["active", "inactive", "promotion"];
let categoriesSectionCollapsed = true;
let statusesSectionCollapsed = true;

function normalizeThemeGradient(themeGradient) {
  return ["lotus", "emerald", "rose", "blue", "gold", "neutral"].includes(themeGradient) ? themeGradient : "lotus";
}

function applyTheme(themeGradient) {
  document.body.dataset.theme = normalizeThemeGradient(themeGradient);
}

async function loadManagement() {
  currentSettings = await window.simplePOS.getSettings();
  applyTheme(currentSettings.themeGradient);
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.productStatuses = normalizeProductStatuses(currentSettings.productStatuses);
  currentSettings.products = Array.isArray(currentSettings.products)
    ? currentSettings.products.map(normalizeProduct)
    : [];
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  renderCategories();
  renderStatuses();
  renderInventory();
  renderPurchases();
}

function isNewStatusActive(product) {
  if (product?.minorStatus !== "new") return false;
  if (currentSettings.newItemBadgeTimerEnabled === false) return true;
  const timestamp = Date.parse(product.minorStatusAt || "");
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp <= getNewItemBadgeHours() * 60 * 60 * 1000;
}

function getNewItemBadgeHours() {
  const hours = Number(currentSettings.newItemBadgeHours || 24);
  return Number.isFinite(hours) && hours >= 1 ? Math.floor(hours) : 24;
}

function normalizeCategories(categories) {
  const source = Array.isArray(categories) ? categories : [];
  return [...new Set(source.map((category) => String(category || "").trim()).filter(Boolean))];
}

// Status values are stored as stable lowercase keys for saving and dropdown matching.
function normalizeStatusValue(status) {
  return String(status || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function normalizeProductStatuses(statuses) {
  const source = Array.isArray(statuses) ? statuses : [];
  const values = [...defaultProductStatuses, ...source.map(normalizeStatusValue)]
    .filter(Boolean)
    .filter((status, index, list) => list.indexOf(status) === index);
  return values.length ? values : [...defaultProductStatuses];
}

function normalizeProduct(product, index = 0) {
  const status = normalizeProductStatus(product?.status);
  return {
    id: String(product?.id || `ITEM-${index + 1}`).trim(),
    name: String(product?.name || "Unnamed Item").trim(),
    category: String(product?.category || currentSettings.categories[0] || "General").trim(),
    sku: String(product?.sku || "").trim(),
    barcode: String(product?.barcode || "").trim(),
    price: Number(product?.price) || 0,
    stock: Number(product?.stock) || 0,
    reorderLevel: Math.max(0, Number(product?.reorderLevel) || 0),
    taxable: product?.taxable !== false,
    status,
    note: String(product?.note || "").trim(),
    adjustmentReason: String(product?.adjustmentReason || "").trim(),
    minorStatus: product?.minorStatus === "new" ? "new" : "",
    minorStatusAt: String(product?.minorStatusAt || ""),
    isNew: product?.isNew === true
  };
}

function normalizeProductStatus(status) {
  const value = normalizeStatusValue(status || "active");
  return normalizeProductStatuses(currentSettings.productStatuses).includes(value) ? value : "active";
}

function getInventoryFieldVisibility() {
  const visibility = currentSettings.inventoryFieldVisibility && typeof currentSettings.inventoryFieldVisibility === "object"
    ? currentSettings.inventoryFieldVisibility
    : {};
  return {
    sku: visibility.sku !== false,
    barcode: visibility.barcode !== false,
    reorderAt: visibility.reorderAt === true,
    note: visibility.note !== false,
    adjustmentReason: visibility.adjustmentReason !== false
  };
}

function renderProductStatusOptions(selectedStatus) {
  return normalizeProductStatuses(currentSettings.productStatuses)
    .map((status) => `<option value="${status}" ${normalizeProductStatus(selectedStatus) === status ? "selected" : ""}>${escapeHtml(toTitleCase(status))}</option>`)
    .join("");
}

function toTitleCase(value) {
  return String(value || "").replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizePurchases(purchases) {
  return Array.isArray(purchases)
    ? purchases.map((purchase, index) => {
        const payments = normalizePurchasePayments(purchase.payments);
        const amount = Number(purchase.amount) || 0;
        const balance = Math.max(0, amount - payments.reduce((sum, payment) => sum + payment.amount, 0));
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
          paid: balance <= 0,
          addedToInventory: purchase.addedToInventory === true,
          appliedInventoryItems: normalizeAppliedInventoryItems(purchase.appliedInventoryItems),
          items: normalizePurchaseItems(purchase.items)
        };
      })
    : [];
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

function renderCategories() {
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  els.categoryList.innerHTML = currentSettings.categories
    .map(
      (category, index) => `
        <div class="managed-category">
          <span>${escapeHtml(category)}</span>
          <button class="icon-button danger-button" type="button" data-remove-category="${index}" aria-label="Remove ${escapeAttribute(category)}">
            <span aria-hidden="true">x</span>
          </button>
        </div>
      `
    )
    .join("");
}

// Status Catalog protects built-in statuses and only shows delete for custom statuses.
function renderStatuses() {
  currentSettings.productStatuses = normalizeProductStatuses(currentSettings.productStatuses);
  const defaultStatusSet = new Set(defaultProductStatuses);
  els.statusList.innerHTML = currentSettings.productStatuses
    .map((status, index) => {
      const isDefault = defaultStatusSet.has(status);
      return `
        <div class="managed-category">
          <span>${escapeHtml(toTitleCase(status))}</span>
          ${isDefault ? "" : `
            <button class="icon-button danger-button" type="button" data-remove-status="${index}" aria-label="Remove ${escapeAttribute(toTitleCase(status))}">
              <span aria-hidden="true">x</span>
            </button>
          `}
        </div>
      `;
    })
    .join("");
}

// Collapse controllers keep setup catalogs tucked away until an admin needs them.
function setCategoriesSectionCollapsed(collapsed) {
  categoriesSectionCollapsed = collapsed;
  els.categoriesSectionBody.classList.toggle("is-hidden", categoriesSectionCollapsed);
  els.toggleCategoriesSection.textContent = categoriesSectionCollapsed ? "Expand" : "Collapse";
  els.toggleCategoriesSection.setAttribute("aria-expanded", String(!categoriesSectionCollapsed));
}

function setStatusesSectionCollapsed(collapsed) {
  statusesSectionCollapsed = collapsed;
  els.statusesSectionBody.classList.toggle("is-hidden", statusesSectionCollapsed);
  els.toggleStatusesSection.textContent = statusesSectionCollapsed ? "Expand" : "Collapse";
  els.toggleStatusesSection.setAttribute("aria-expanded", String(!statusesSectionCollapsed));
}

// Main Inventory renderer: builds editable item rows from saved settings and field toggles.
function renderInventory() {
  const fieldVisibility = getInventoryFieldVisibility();
  const categoryOptions = currentSettings.categories
    .map((category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`)
    .join("");

  els.inventoryList.innerHTML = currentSettings.products
    .map(
      (product, index) => {
        const normalizedProduct = normalizeProduct(product, index);
        const isNew = normalizedProduct.isNew === true;
        const isInactive = normalizedProduct.status === "inactive";
        const isLocked = isInactive && !isNew;
        const fieldLock = isLocked ? "disabled" : "";
        return `
        <div class="inventory-row management-row ${isInactive ? "is-inactive" : ""} ${normalizedProduct.status === "promotion" ? "is-promotion" : ""}" data-index="${index}">
          <label>
            Code
            <input data-field="id" value="${escapeAttribute(normalizedProduct.id)}" placeholder="${isNew ? "Generated after category" : ""}" readonly>
          </label>
          <label>
            Name
            <input data-field="name" value="${escapeAttribute(normalizedProduct.name)}" required ${fieldLock}>
          </label>
          <label>
            Category
            <select data-field="category" required ${fieldLock}>
              ${isNew ? `<option value="">Select category</option>` : ""}
              ${categoryOptions}
            </select>
          </label>
          ${fieldVisibility.sku ? `
            <label>
              SKU
              <input data-field="sku" value="${escapeAttribute(normalizedProduct.sku)}" placeholder="Optional SKU" ${fieldLock}>
            </label>
          ` : ""}
          ${fieldVisibility.barcode ? `
            <label>
              Barcode
              <input data-field="barcode" value="${escapeAttribute(normalizedProduct.barcode)}" placeholder="Scan or type barcode" ${fieldLock}>
            </label>
          ` : ""}
          <label>
            Price
            <input data-field="price" type="number" min="0" step="0.01" value="${Number(normalizedProduct.price).toFixed(2)}" required ${fieldLock}>
          </label>
          <label>
            Stock
            <input data-field="stock" type="number" min="0" step="1" value="${Number(normalizedProduct.stock || 0)}" ${fieldLock}>
          </label>
          ${fieldVisibility.reorderAt ? `
            <label>
              Reorder At
              <input data-field="reorderLevel" type="number" min="0" step="1" value="${Number(normalizedProduct.reorderLevel || 0)}" ${fieldLock}>
            </label>
          ` : ""}
          <label>
            Status
            <select data-field="status">
              ${renderProductStatusOptions(normalizedProduct.status)}
            </select>
          </label>
          ${fieldVisibility.note ? `
            <label class="inventory-note-field">
              Note
              <input data-field="note" value="${escapeAttribute(normalizedProduct.note)}" placeholder="Optional item note" ${fieldLock}>
            </label>
          ` : ""}
          ${fieldVisibility.adjustmentReason ? `
            <label class="inventory-note-field">
              Stock Adjustment Reason
              <input data-field="adjustmentReason" value="${escapeAttribute(normalizedProduct.adjustmentReason)}" placeholder="Reason for stock change" ${fieldLock}>
            </label>
          ` : ""}
          <div class="inventory-tax-actions">
            <label class="tax-toggle">
              Tax
              <input data-field="taxable" type="checkbox" ${normalizedProduct.taxable === false ? "" : "checked"} ${fieldLock}>
            </label>
            <button class="icon-button danger-button" type="button" data-remove-index="${index}" aria-label="Remove ${escapeAttribute(normalizedProduct.name)}" ${isLocked ? "disabled" : ""}>
              <span aria-hidden="true">x</span>
            </button>
          </div>
          ${isNewStatusActive(normalizedProduct) ? `<span class="minor-status-badge">NEW!</span>` : ""}
          ${normalizedProduct.status === "promotion" ? `<span class="product-promotion-badge">PROMO</span>` : ""}
          ${isNew ? `<button class="secondary-button inventory-save-button" type="button" data-save-new-index="${index}">Save</button>` : ""}
        </div>
      `;
      }
    )
    .join("");

  [...els.inventoryList.querySelectorAll(".inventory-row")].forEach((row, index) => {
    const product = currentSettings.products[index];
    row.querySelector('[data-field="category"]').value = product.isNew === true
      ? ""
      : product.category || currentSettings.categories[0] || "General";
    row.querySelector('[data-field="status"]').value = normalizeProductStatus(product.status);
  });
}

function renderPurchases() {
  if (!els.purchaseList) return;
  const categoryOptions = currentSettings.categories
    .map((category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`)
    .join("");

  els.purchaseList.innerHTML = currentSettings.purchases.length
    ? currentSettings.purchases
        .map(
          (purchase, index) => `
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
                <label>
                  Notes
                  <input data-field="notes" value="${escapeAttribute(purchase.notes)}" placeholder="Optional notes">
                </label>
                <label class="checkbox-row">
                  <input data-field="paid" type="checkbox" ${purchase.paid ? "checked" : ""}>
                  Paid
                </label>
                <button class="icon-button danger-button" type="button" data-remove-purchase="${index}" aria-label="Remove purchase bill">
                  <span aria-hidden="true">x</span>
                </button>
              </div>
              <div class="purchase-item-list">
                ${renderPurchaseItems(purchase.items, categoryOptions)}
              </div>
              <div class="purchase-actions">
                <button class="secondary-button" type="button" data-add-purchase-item="${index}">Add Item</button>
                <button class="secondary-button" type="button" data-apply-purchase="${index}">${purchase.addedToInventory ? "Add Again to Inventory" : "Add Items to Inventory"}</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-cart compact-empty">No company bills entered yet.</div>`;

  [...els.purchaseList.querySelectorAll(".purchase-row")].forEach((row, purchaseIndex) => {
    row.querySelectorAll(".purchase-item-row").forEach((itemRow, itemIndex) => {
      itemRow.querySelector('[data-field="category"]').value =
        currentSettings.purchases[purchaseIndex].items[itemIndex]?.category || currentSettings.categories[0] || "General";
    });
  });
}

function renderPurchaseItems(items, categoryOptions) {
  const normalizedItems = normalizePurchaseItems(items);
  if (!normalizedItems.length) {
    return `<div class="empty-cart compact-empty">No bill items entered yet.</div>`;
  }

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

function collectInventory() {
  return [...els.inventoryList.querySelectorAll(".inventory-row")].map((row) => {
    const index = Number(row.dataset.index);
    const existingProduct = normalizeProduct(currentSettings.products[index] || {}, index);
    const nameInput = row.querySelector('[data-field="name"]');
    const categoryInput = row.querySelector('[data-field="category"]');
    const skuInput = row.querySelector('[data-field="sku"]');
    const barcodeInput = row.querySelector('[data-field="barcode"]');
    const priceInput = row.querySelector('[data-field="price"]');
    const stockInput = row.querySelector('[data-field="stock"]');
    const reorderInput = row.querySelector('[data-field="reorderLevel"]');
    const taxableInput = row.querySelector('[data-field="taxable"]');
    const noteInput = row.querySelector('[data-field="note"]');
    const adjustmentReasonInput = row.querySelector('[data-field="adjustmentReason"]');
    const id = row.querySelector('[data-field="id"]').value.trim();
    const name = (nameInput.disabled ? existingProduct.name : nameInput.value).trim() || "Unnamed Item";
    const category = (categoryInput.disabled ? existingProduct.category : categoryInput.value).trim() || "General";
    const sku = (skuInput ? (skuInput.disabled ? existingProduct.sku : skuInput.value) : existingProduct.sku).trim();
    const barcode = (barcodeInput ? (barcodeInput.disabled ? existingProduct.barcode : barcodeInput.value) : existingProduct.barcode).trim();
    const price = Number(priceInput.disabled ? existingProduct.price : priceInput.value || 0);
    const stock = Number(stockInput.disabled ? existingProduct.stock : stockInput.value || 0);
    const reorderLevel = Math.max(0, Number(reorderInput ? (reorderInput.disabled ? existingProduct.reorderLevel : reorderInput.value || 0) : existingProduct.reorderLevel));
    const taxable = taxableInput.disabled ? existingProduct.taxable !== false : taxableInput.checked;
    const status = normalizeProductStatus(row.querySelector('[data-field="status"]').value);
    const note = (noteInput ? (noteInput.disabled ? existingProduct.note : noteInput.value) : existingProduct.note).trim();
    const adjustmentReason = (adjustmentReasonInput
      ? (adjustmentReasonInput.disabled ? existingProduct.adjustmentReason : adjustmentReasonInput.value)
      : existingProduct.adjustmentReason).trim();

    return {
      id,
      name,
      category,
      sku,
      barcode,
      price,
      stock,
      reorderLevel,
      taxable,
      status,
      note,
      adjustmentReason,
      minorStatus: currentSettings.products[index]?.minorStatus === "new" ? "new" : "",
      minorStatusAt: currentSettings.products[index]?.minorStatusAt || "",
      isNew: currentSettings.products[index]?.isNew === true
    };
  });
}

function collectPurchases() {
  if (!els.purchaseList) return normalizePurchases(currentSettings.purchases);
  return [...els.purchaseList.querySelectorAll(".purchase-row")].map((row, index) => {
    const items = [...row.querySelectorAll(".purchase-item-row")].map((itemRow) => ({
      code: itemRow.querySelector('[data-field="code"]').value.trim(),
      name: itemRow.querySelector('[data-field="name"]').value.trim(),
      category: itemRow.querySelector('[data-field="category"]').value.trim() || "General",
      quantity: Number(itemRow.querySelector('[data-field="quantity"]').value || 0),
      cost: Number(itemRow.querySelector('[data-field="cost"]').value || 0),
      price: Number(itemRow.querySelector('[data-field="price"]').value || 0),
      taxable: itemRow.querySelector('[data-field="taxable"]').checked
    })).filter((item) => item.name || item.code || item.quantity > 0);

    return {
      id: currentSettings.purchases[index]?.id || `PO-${Date.now()}-${index}`,
      company: row.querySelector('[data-field="company"]').value.trim(),
      billNumber: row.querySelector('[data-field="billNumber"]').value.trim(),
      date: row.querySelector('[data-field="date"]').value || new Date().toISOString().slice(0, 10),
      createdAt: currentSettings.purchases[index]?.createdAt || new Date().toISOString(),
      amount: Number(row.querySelector('[data-field="amount"]').value || 0),
      notes: row.querySelector('[data-field="notes"]').value.trim(),
      paid: row.querySelector('[data-field="paid"]').checked,
      addedToInventory: currentSettings.purchases[index]?.addedToInventory === true,
      appliedInventoryItems: normalizeAppliedInventoryItems(currentSettings.purchases[index]?.appliedInventoryItems),
      items
    };
  }).filter((purchase) => purchase.company || purchase.billNumber || purchase.notes || purchase.amount > 0 || purchase.items.length);
}

function addCategory() {
  const category = els.newCategoryName.value.trim();
  if (!category) return;

  currentSettings.categories = normalizeCategories([...currentSettings.categories, category]);
  els.newCategoryName.value = "";
  renderCategories();
  renderInventory();
}

// Status Catalog workflow: create custom item statuses for the Inventory status dropdown.
function addStatus() {
  const status = normalizeStatusValue(els.newStatusName.value);
  if (!status) return;

  currentSettings.productStatuses = normalizeProductStatuses([...currentSettings.productStatuses, status]);
  els.newStatusName.value = "";
  renderStatuses();
  renderInventory();
}

function removeCategory(index) {
  currentSettings.categories = currentSettings.categories.filter((_, itemIndex) => itemIndex !== index);
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  const fallbackCategory = currentSettings.categories[0] || "General";
  currentSettings.products = collectInventory().map((product) => ({
    ...product,
    category: currentSettings.categories.includes(product.category) ? product.category : fallbackCategory
  }));
  renderCategories();
  renderInventory();
}

// Removing a custom status safely moves any assigned items back to Active.
function removeStatus(index) {
  currentSettings.productStatuses = normalizeProductStatuses(currentSettings.productStatuses);
  const status = currentSettings.productStatuses[index];
  if (defaultProductStatuses.includes(status)) return;

  currentSettings.productStatuses = currentSettings.productStatuses.filter((_, itemIndex) => itemIndex !== index);
  currentSettings.products = collectInventory().map((product) => ({
    ...product,
    status: product.status === status ? "active" : product.status
  }));
  renderStatuses();
  renderInventory();
}

// Add Item inserts a draft row at the top; Save on that row generates the item code.
function addInventoryItem() {
  currentSettings.products = collectInventory();
  currentSettings.products.unshift({
    id: "",
    name: "New Cosmetic Item",
    category: "",
    sku: "",
    barcode: "",
    price: 0,
    stock: 0,
    reorderLevel: 0,
    taxable: true,
    status: "active",
    note: "",
    adjustmentReason: "",
    minorStatus: "new",
    minorStatusAt: new Date().toISOString(),
    isNew: true
  });
  renderInventory();
  els.inventoryList.scrollTop = 0;
}

// New item save workflow validates category/name and persists without requiring Save Inventory.
async function saveNewInventoryItem(index) {
  currentSettings.products = collectInventory();
  const product = currentSettings.products[index];
  if (!product) return;

  if (!product.category || product.category === "General") {
    window.alert("Select a category before saving this item.");
    return;
  }
  if (!product.name || product.name === "Unnamed Item") {
    window.alert("Enter an item name before saving this item.");
    return;
  }

  product.id = generateItemCode(product.category, currentSettings.products.filter((_, itemIndex) => itemIndex !== index));
  product.isNew = false;
  product.minorStatus = "new";
  product.minorStatusAt = new Date().toISOString();
  product.status = normalizeProductStatus(product.status);
  product.note = product.note || "";
  currentSettings = await window.simplePOS.saveSettings({
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Added inventory item",
    __auditDetails: `Item ${product.id} (${product.name}) was added to inventory.`,
    categories: normalizeCategories(currentSettings.categories),
    productStatuses: normalizeProductStatuses(currentSettings.productStatuses),
    products: currentSettings.products.filter((item) => item.id && item.isNew !== true),
    purchases: collectPurchases()
  });
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.productStatuses = normalizeProductStatuses(currentSettings.productStatuses);
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  renderStatuses();
  renderInventory();
  renderPurchases();
  els.saveStatus.textContent = `Item ${product.id} saved.`;
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

// Purchase Order entry points support adding supplier bill items into inventory stock.
function addPurchaseBill() {
  if (!els.purchaseList) return;
  currentSettings.purchases = collectPurchases();
  currentSettings.purchases.push({
    id: `PO-${Date.now()}`,
    company: "",
    billNumber: "",
    date: new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    amount: 0,
    notes: "",
    paid: false,
    addedToInventory: false,
    appliedInventoryItems: [],
    items: []
  });
  renderPurchases();
}

function addPurchaseItem(purchaseIndex) {
  if (!els.purchaseList) return;
  currentSettings.purchases = collectPurchases();
  const purchase = currentSettings.purchases[purchaseIndex];
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
}

function removePurchaseItem(purchaseIndex, itemIndex) {
  if (!els.purchaseList) return;
  currentSettings.purchases = collectPurchases();
  const purchase = currentSettings.purchases[purchaseIndex];
  if (!purchase) return;
  purchase.items = purchase.items.filter((_, index) => index !== itemIndex);
  renderPurchases();
}

async function applyPurchaseToInventory(purchaseIndex) {
  if (!els.purchaseList) return;
  currentSettings.products = collectInventory();
  currentSettings.purchases = collectPurchases();
  const purchase = currentSettings.purchases[purchaseIndex];
  if (!purchase) return;

  purchase.items.forEach((item) => {
    if (!item.name && !item.code) return;
    const existingProduct = currentSettings.products.find((product) =>
      (item.code && product.id.toLowerCase() === item.code.toLowerCase()) ||
      product.name.trim().toLowerCase() === item.name.trim().toLowerCase()
    );

    if (existingProduct) {
      existingProduct.stock = Number(existingProduct.stock || 0) + Number(item.quantity || 0);
      if (item.price > 0) existingProduct.price = item.price;
      existingProduct.taxable = item.taxable !== false;
    } else {
      const category = currentSettings.categories.includes(item.category)
        ? item.category
        : currentSettings.categories[0] || "General";
      currentSettings.products.push({
        id: item.code || generateItemCode(category, currentSettings.products),
        name: item.name || "Purchased Item",
        category,
        sku: "",
        barcode: item.code || "",
        price: item.price || item.cost || 0,
        stock: Number(item.quantity || 0),
        reorderLevel: 0,
        taxable: item.taxable !== false,
        status: "active",
        note: "",
        adjustmentReason: ""
      });
    }
  });

  purchase.addedToInventory = true;
  currentSettings = await window.simplePOS.saveSettings({
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Applied purchase to inventory",
    __auditDetails: `Purchase ${purchase.billNumber || purchase.id} from ${purchase.company || "supplier"} was added to inventory.`,
    categories: normalizeCategories(currentSettings.categories),
    productStatuses: normalizeProductStatuses(currentSettings.productStatuses),
    products: currentSettings.products,
    purchases: currentSettings.purchases
  });
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.productStatuses = normalizeProductStatuses(currentSettings.productStatuses);
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  renderStatuses();
  renderInventory();
  renderPurchases();
  els.saveStatus.textContent = "Purchase items added to inventory.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
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

function removeInventoryItem(index) {
  currentSettings.products = collectInventory().filter((_, itemIndex) => itemIndex !== index);
  renderInventory();
}

function removePurchaseBill(index) {
  if (!els.purchaseList) return;
  currentSettings.purchases = collectPurchases().filter((_, itemIndex) => itemIndex !== index);
  renderPurchases();
}

// Full Inventory save workflow persists categories, statuses, products, purchases, and audit details.
async function saveInventory(event) {
  event.preventDefault();
  const nextProducts = collectInventory();
  const stockAdjustmentIssues = getStockAdjustmentIssues(nextProducts);
  if (stockAdjustmentIssues.length) {
    window.alert(`Enter a Stock Adjustment Reason for: ${stockAdjustmentIssues.join(", ")}`);
    return;
  }
  currentSettings = await window.simplePOS.saveSettings({
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Saved inventory",
    __auditDetails: getInventoryAuditDetails(nextProducts),
    categories: normalizeCategories(currentSettings.categories),
    productStatuses: normalizeProductStatuses(currentSettings.productStatuses),
    products: nextProducts.filter((product) => product.id && product.isNew !== true),
    purchases: collectPurchases()
  });
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.productStatuses = normalizeProductStatuses(currentSettings.productStatuses);
  currentSettings.products = Array.isArray(currentSettings.products) ? currentSettings.products.map(normalizeProduct) : [];
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  renderStatuses();
  renderInventory();
  renderPurchases();
  els.saveStatus.textContent = "Inventory saved.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

function getStockAdjustmentIssues(nextProducts) {
  if (!getInventoryFieldVisibility().adjustmentReason) return [];
  return nextProducts
    .filter((product) => {
      if (!product.id || product.isNew === true) return false;
      const previous = currentSettings.products.find((item) => item.id === product.id);
      if (!previous) return false;
      return Number(previous.stock || 0) !== Number(product.stock || 0) && !product.adjustmentReason;
    })
    .map((product) => product.name || product.id);
}

function getInventoryAuditDetails(nextProducts) {
  const stockChanges = nextProducts
    .map((product) => {
      const previous = currentSettings.products.find((item) => item.id === product.id);
      if (!previous || Number(previous.stock || 0) === Number(product.stock || 0)) return "";
      return `${product.name || product.id}: ${previous.stock || 0} to ${product.stock || 0}${product.adjustmentReason ? ` (${product.adjustmentReason})` : ""}`;
    })
    .filter(Boolean);
  return stockChanges.length
    ? `Inventory updated. Stock adjustments: ${stockChanges.join("; ")}.`
    : "Inventory or categories were updated.";
}

async function createInventoryTemplate() {
  els.inventoryTemplate.disabled = true;
  els.importExportStatus.textContent = "Creating inventory template...";
  try {
    const result = await window.simplePOS.createInventoryTemplate();
    els.importExportStatus.textContent = result?.templatePath
      ? `Template saved: ${result.templatePath}`
      : "Inventory template created.";
    setTimeout(() => {
      els.importExportStatus.textContent = "";
    }, 5000);
  } catch {
    els.importExportStatus.textContent = "Unable to create inventory template.";
  } finally {
    els.inventoryTemplate.disabled = false;
  }
}

async function importInventoryTemplate() {
  els.inventoryImport.disabled = true;
  els.importExportStatus.textContent = "Importing inventory...";
  try {
    const result = await window.simplePOS.importInventoryTemplate(getAuditActor());
    if (result?.cancelled) {
      els.importExportStatus.textContent = "Import cancelled.";
      return;
    }
    if (!result?.success) {
      els.importExportStatus.textContent = result?.error || "Unable to import inventory.";
      return;
    }
    currentSettings = result.settings;
    currentSettings.categories = normalizeCategories(currentSettings.categories);
    currentSettings.purchases = normalizePurchases(currentSettings.purchases);
    renderCategories();
    renderInventory();
    renderPurchases();
    els.importExportStatus.textContent = `Imported ${result.created} new item(s), updated ${result.updated} item(s).`;
    els.saveStatus.textContent = "Inventory import saved.";
    setTimeout(() => {
      els.saveStatus.textContent = "";
    }, 3000);
  } catch {
    els.importExportStatus.textContent = "Unable to import inventory.";
  } finally {
    els.inventoryImport.disabled = false;
  }
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

// Button, toggle, and keyboard wiring for Inventory window controls.
els.form.addEventListener("submit", saveInventory);
els.toggleCategoriesSection.addEventListener("click", () => {
  setCategoriesSectionCollapsed(!categoriesSectionCollapsed);
});
els.toggleStatusesSection.addEventListener("click", () => {
  setStatusesSectionCollapsed(!statusesSectionCollapsed);
});
els.addCategory.addEventListener("click", addCategory);
els.newCategoryName.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addCategory();
});
els.addStatus.addEventListener("click", addStatus);
els.newStatusName.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addStatus();
});
els.addInventoryItem.addEventListener("click", addInventoryItem);
els.openPurchaseBill.addEventListener("click", () => {
  window.simplePOS.openPurchasing({ addBill: true });
});
els.inventoryImportExport.addEventListener("click", () => {
  els.importExportStatus.textContent = "";
  els.importExportDialog.showModal();
});
els.inventoryTemplate.addEventListener("click", createInventoryTemplate);
els.inventoryImport.addEventListener("click", importInventoryTemplate);
els.closeImportExport.addEventListener("click", () => {
  els.importExportDialog.close();
});
els.addPurchaseBill?.addEventListener("click", addPurchaseBill);
els.reloadInventory.addEventListener("click", loadManagement);
els.categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-category]");
  if (!button) return;
  removeCategory(Number(button.dataset.removeCategory));
});
els.statusList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-status]");
  if (!button || button.disabled) return;
  removeStatus(Number(button.dataset.removeStatus));
});
els.inventoryList.addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save-new-index]");
  if (saveButton) {
    saveButton.disabled = true;
    saveNewInventoryItem(Number(saveButton.dataset.saveNewIndex)).catch(() => {
      saveButton.disabled = false;
      window.alert("Unable to save this item. Please try again.");
    });
    return;
  }

  const button = event.target.closest("[data-remove-index]");
  if (!button) return;
  removeInventoryItem(Number(button.dataset.removeIndex));
});
els.inventoryList.addEventListener("change", (event) => {
  if (!event.target.closest('[data-field="status"]')) return;
  currentSettings.products = collectInventory();
  renderInventory();
});
els.purchaseList?.addEventListener("click", (event) => {
  const removePurchaseButton = event.target.closest("[data-remove-purchase]");
  const addItemButton = event.target.closest("[data-add-purchase-item]");
  const removeItemButton = event.target.closest("[data-remove-purchase-item]");
  const applyButton = event.target.closest("[data-apply-purchase]");

  if (removePurchaseButton) {
    removePurchaseBill(Number(removePurchaseButton.dataset.removePurchase));
  }
  if (addItemButton) {
    addPurchaseItem(Number(addItemButton.dataset.addPurchaseItem));
  }
  if (removeItemButton) {
    const purchaseIndex = Number(removeItemButton.closest(".purchase-row")?.dataset.index);
    removePurchaseItem(purchaseIndex, Number(removeItemButton.dataset.removePurchaseItem));
  }
  if (applyButton) {
    applyPurchaseToInventory(Number(applyButton.dataset.applyPurchase));
  }
});

loadManagement();
