const els = {
  form: document.querySelector("#managementForm"),
  categoryList: document.querySelector("#categoryList"),
  newCategoryName: document.querySelector("#newCategoryName"),
  addCategory: document.querySelector("#addCategory"),
  inventoryList: document.querySelector("#inventoryList"),
  addInventoryItem: document.querySelector("#addInventoryItem"),
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
  products: [],
  purchases: []
};

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
  currentSettings.products = Array.isArray(currentSettings.products)
    ? currentSettings.products
    : [];
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  renderCategories();
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

function normalizePurchases(purchases) {
  return Array.isArray(purchases)
    ? purchases.map((purchase, index) => ({
        id: String(purchase.id || `PO-${Date.now()}-${index}`).trim(),
        company: String(purchase.company || "").trim(),
        billNumber: String(purchase.billNumber || "").trim(),
        date: String(purchase.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
        notes: String(purchase.notes || "").trim(),
        amount: Number(purchase.amount) || 0,
        paid: purchase.paid === true,
        addedToInventory: purchase.addedToInventory === true,
        items: normalizePurchaseItems(purchase.items)
      }))
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

function renderInventory() {
  const categoryOptions = currentSettings.categories
    .map((category) => `<option value="${escapeAttribute(category)}">${escapeHtml(category)}</option>`)
    .join("");

  els.inventoryList.innerHTML = currentSettings.products
    .map(
      (product, index) => {
        const isNew = product.isNew === true;
        return `
        <div class="inventory-row management-row" data-index="${index}">
          <label>
            Code
            <input data-field="id" value="${escapeAttribute(product.id)}" placeholder="${isNew ? "Generated after category" : ""}" readonly>
          </label>
          <label>
            Name
            <input data-field="name" value="${escapeAttribute(product.name)}" required>
          </label>
          <label>
            Category
            <select data-field="category" required>
              ${isNew ? `<option value="">Select category</option>` : ""}
              ${categoryOptions}
            </select>
          </label>
          <label>
            Price
            <input data-field="price" type="number" min="0" step="0.01" value="${Number(product.price).toFixed(2)}" required>
          </label>
          <label>
            Stock
            <input data-field="stock" type="number" min="0" step="1" value="${Number(product.stock || 0)}">
          </label>
          <label class="tax-toggle">
            Tax
            <input data-field="taxable" type="checkbox" ${product.taxable === false ? "" : "checked"}>
          </label>
          ${isNewStatusActive(product) ? `<span class="minor-status-badge">NEW!</span>` : ""}
          ${isNew ? `<button class="secondary-button inventory-save-button" type="button" data-save-new-index="${index}">Save</button>` : ""}
          <button class="icon-button danger-button" type="button" data-remove-index="${index}" aria-label="Remove ${escapeAttribute(product.name)}">
            <span aria-hidden="true">x</span>
          </button>
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
  });
}

function renderPurchases() {
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
    const id = row.querySelector('[data-field="id"]').value.trim();
    const name = row.querySelector('[data-field="name"]').value.trim() || "Unnamed Item";
    const category = row.querySelector('[data-field="category"]').value.trim() || "General";
    const price = Number(row.querySelector('[data-field="price"]').value || 0);
    const stock = Number(row.querySelector('[data-field="stock"]').value || 0);
    const taxable = row.querySelector('[data-field="taxable"]').checked;

    return {
      id,
      name,
      category,
      price,
      stock,
      taxable,
      minorStatus: currentSettings.products[index]?.minorStatus === "new" ? "new" : "",
      minorStatusAt: currentSettings.products[index]?.minorStatusAt || "",
      isNew: currentSettings.products[index]?.isNew === true
    };
  });
}

function collectPurchases() {
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
      amount: Number(row.querySelector('[data-field="amount"]').value || 0),
      notes: row.querySelector('[data-field="notes"]').value.trim(),
      paid: row.querySelector('[data-field="paid"]').checked,
      addedToInventory: currentSettings.purchases[index]?.addedToInventory === true,
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

function addInventoryItem() {
  currentSettings.products = collectInventory();
  currentSettings.products.unshift({
    id: "",
    name: "New Cosmetic Item",
    category: "",
    price: 0,
    stock: 0,
    taxable: true,
    isNew: true
  });
  renderInventory();
  els.inventoryList.scrollTop = 0;
}

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
  currentSettings = await window.simplePOS.saveSettings({
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Added inventory item",
    __auditDetails: `Item ${product.id} (${product.name}) was added to inventory.`,
    categories: normalizeCategories(currentSettings.categories),
    products: currentSettings.products.filter((item) => item.id && item.isNew !== true),
    purchases: collectPurchases()
  });
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  renderInventory();
  renderPurchases();
  els.saveStatus.textContent = `Item ${product.id} saved.`;
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

function addPurchaseBill() {
  currentSettings.purchases = collectPurchases();
  currentSettings.purchases.push({
    id: `PO-${Date.now()}`,
    company: "",
    billNumber: "",
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    notes: "",
    paid: false,
    addedToInventory: false,
    items: []
  });
  renderPurchases();
}

function addPurchaseItem(purchaseIndex) {
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
  currentSettings.purchases = collectPurchases();
  const purchase = currentSettings.purchases[purchaseIndex];
  if (!purchase) return;
  purchase.items = purchase.items.filter((_, index) => index !== itemIndex);
  renderPurchases();
}

async function applyPurchaseToInventory(purchaseIndex) {
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
        price: item.price || item.cost || 0,
        stock: Number(item.quantity || 0),
        taxable: item.taxable !== false
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
    products: currentSettings.products,
    purchases: currentSettings.purchases
  });
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
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
  currentSettings.purchases = collectPurchases().filter((_, itemIndex) => itemIndex !== index);
  renderPurchases();
}

async function saveInventory(event) {
  event.preventDefault();
  currentSettings = await window.simplePOS.saveSettings({
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Saved inventory",
    __auditDetails: "Inventory, categories, or purchasing records were updated.",
    categories: normalizeCategories(currentSettings.categories),
    products: collectInventory().filter((product) => product.id && product.isNew !== true),
    purchases: collectPurchases()
  });
  currentSettings.categories = normalizeCategories(currentSettings.categories);
  currentSettings.purchases = normalizePurchases(currentSettings.purchases);
  renderPurchases();
  els.saveStatus.textContent = "Inventory and purchasing saved.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
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

els.form.addEventListener("submit", saveInventory);
els.addCategory.addEventListener("click", addCategory);
els.newCategoryName.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  addCategory();
});
els.addInventoryItem.addEventListener("click", addInventoryItem);
els.inventoryImportExport.addEventListener("click", () => {
  els.importExportStatus.textContent = "";
  els.importExportDialog.showModal();
});
els.inventoryTemplate.addEventListener("click", createInventoryTemplate);
els.inventoryImport.addEventListener("click", importInventoryTemplate);
els.closeImportExport.addEventListener("click", () => {
  els.importExportDialog.close();
});
els.addPurchaseBill.addEventListener("click", addPurchaseBill);
els.reloadInventory.addEventListener("click", loadManagement);
els.categoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-category]");
  if (!button) return;
  removeCategory(Number(button.dataset.removeCategory));
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
els.purchaseList.addEventListener("click", (event) => {
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
