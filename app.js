const SESSION_KEY = "beauty-pos-session";

// Main POS renderer: handles login/setup, catalog browsing, current sale,
// payment tendering, receipt completion, holds, discounts, and user switching.
const defaultUsers = [
  { username: "admin", password: "admin123", name: "Administrator", role: "admin", discountLimit: 0 },
  { username: "staff", password: "staff123", name: "Staff Member", role: "staff", discountLimit: 0 }
];

const defaultProducts = [];

const state = {
  activeCategory: "All",
  cart: new Map(),
  currentUser: null,
  discountPercent: 0,
  invoiceSavePromise: null,
  lastReceipt: null,
  holdWarningTimer: null,
  orderNumber: 1001,
  restoredOrderNumber: null,
  products: [...defaultProducts],
  users: [...defaultUsers],
  settings: {
    businessName: "",
    businessLogo: "",
    businessAddress: "",
    whatsappNumber: "",
    taxRate: 0.0825,
    receiptPrintingEnabled: false,
    saleCompleteEnterAction: "startNextSale",
    ctrlEscShortcutEnabled: true,
    printerName: "",
    paperSize: "letter",
    silent: false,
    themeGradient: "lotus",
    setupComplete: false,
    users: [...defaultUsers],
    permissions: {
      staffCanAccessSettings: false,
      staffCanAccessManagement: false,
      staffCanAccessReporting: false,
      staffCanRestoreHolds: false
    },
    paymentMethods: [
      { name: "Cash", enabled: true },
      { name: "Debit Card", enabled: true },
      { name: "Credit Card", enabled: true }
    ],
    nextOrderNumber: 1001,
    holdRetentionEnabled: true,
    holdRetentionHours: 24,
    newItemBadgeTimerEnabled: true,
    newItemBadgeHours: 24,
    invoices: [],
    voids: [],
    categories: [],
    products: [...defaultProducts]
  }
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

let backupToastTimer = null;

const els = {
  appShell: document.querySelector("#appShell"),
  setupScreen: document.querySelector("#setupScreen"),
  businessSetupStep: document.querySelector("#businessSetupStep"),
  adminSetupStep: document.querySelector("#adminSetupStep"),
  businessSetupForm: document.querySelector("#businessSetupForm"),
  adminSetupForm: document.querySelector("#adminSetupForm"),
  setupBusinessName: document.querySelector("#setupBusinessName"),
  setupBusinessAddress: document.querySelector("#setupBusinessAddress"),
  setupContactNumber: document.querySelector("#setupContactNumber"),
  setupBusinessError: document.querySelector("#setupBusinessError"),
  setupAdminName: document.querySelector("#setupAdminName"),
  setupAdminUsername: document.querySelector("#setupAdminUsername"),
  setupAdminPassword: document.querySelector("#setupAdminPassword"),
  setupAdminConfirmPassword: document.querySelector("#setupAdminConfirmPassword"),
  setupAdminError: document.querySelector("#setupAdminError"),
  backToBusinessSetup: document.querySelector("#backToBusinessSetup"),
  loginScreen: document.querySelector("#loginScreen"),
  loginBusinessName: document.querySelector("#loginBusinessName"),
  businessLogo: document.querySelector("#businessLogo"),
  businessName: document.querySelector("#businessName"),
  loginForm: document.querySelector("#loginForm"),
  loginUserHints: document.querySelector("#loginUserHints"),
  loginError: document.querySelector("#loginError"),
  username: document.querySelector("#username"),
  password: document.querySelector("#password"),
  currentRole: document.querySelector("#currentRole"),
  currentUser: document.querySelector("#currentUser"),
  logoutButton: document.querySelector("#logoutButton"),
  adminOnly: document.querySelectorAll(".admin-only"),
  categoryTabs: document.querySelector("#categoryTabs"),
  productGrid: document.querySelector("#productGrid"),
  productSearch: document.querySelector("#productSearch"),
  cartItems: document.querySelector("#cartItems"),
  subtotal: document.querySelector("#subtotal"),
  tax: document.querySelector("#tax"),
  discountLine: document.querySelector("#discountLine"),
  discountLabel: document.querySelector("#discountLabel"),
  discountAmount: document.querySelector("#discountAmount"),
  total: document.querySelector("#total"),
  taxRateLabel: document.querySelector("#taxRateLabel"),
  tendered: document.querySelector("#tendered"),
  changeDue: document.querySelector("#changeDue"),
  completeSale: document.querySelector("#completeSale"),
  discountSale: document.querySelector("#discountSale"),
  holdSale: document.querySelector("#holdSale"),
  holdWarning: document.querySelector("#holdWarning"),
  orderNumber: document.querySelector("#orderNumber"),
  paymentMethod: document.querySelector("#paymentMethod"),
  receiptDialog: document.querySelector("#receiptDialog"),
  receiptBody: document.querySelector("#receiptBody"),
  discountDialog: document.querySelector("#discountDialog"),
  discountInput: document.querySelector("#discountInput"),
  discountPreview: document.querySelector("#discountPreview"),
  applyDiscount: document.querySelector("#applyDiscount"),
  cancelDiscount: document.querySelector("#cancelDiscount"),
  printReceipt: document.querySelector("#printReceipt"),
  shareReceipt: document.querySelector("#shareReceipt"),
  startNextSale: document.querySelector("#startNextSale"),
  settingsButton: document.querySelector("#settingsButton"),
  managementButton: document.querySelector("#managementButton"),
  reportingButton: document.querySelector("#reportingButton"),
  helpButton: document.querySelector("#helpButton"),
  heldReceiptsButton: document.querySelector("#heldReceiptsButton"),
  staffReportButton: document.querySelector("#staffReportButton"),
  switchUserButton: document.querySelector("#switchUserButton")
};

function formatMoney(value) {
  return money.format(value);
}

function formatPercent(value) {
  const percent = Math.max(0, Number(value) || 0);
  return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

function parseMoney(value) {
  return Number(String(value || "0").replace(/[^0-9.-]+/g, "")) || 0;
}

function showBackupStatus(status) {
  if (!status?.message) return;
  let toast = document.querySelector("#databaseBackupToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "databaseBackupToast";
    toast.className = "backup-status-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = status.message;
  toast.classList.remove("is-hidden", "status-completed", "status-error");
  toast.classList.toggle("status-completed", status.state === "completed");
  toast.classList.toggle("status-error", status.state === "error");
  window.clearTimeout(backupToastTimer);
  backupToastTimer = window.setTimeout(() => {
    toast.classList.add("is-hidden");
  }, status.state === "started" ? 6000 : 10000);
}

function hasTenderedAmount() {
  return parseMoney(els.tendered.value) > 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderLoginUserHints() {
  els.loginUserHints.innerHTML = state.users
    .map((user) => {
      const role = user.role === "admin" ? "Admin" : "Staff";
      return `<span>${escapeHtml(role)}: ${escapeHtml(user.username)} / ${escapeHtml(user.password)}</span>`;
    })
    .join("");
}

function setLoginUserHintsVisible(visible) {
  if (state.currentUser || els.loginScreen.classList.contains("is-hidden")) return;
  renderLoginUserHints();
  els.loginUserHints.classList.toggle("is-hidden", !visible);
  els.loginUserHints.setAttribute("aria-hidden", visible ? "false" : "true");
}

function normalizeThemeGradient(themeGradient) {
  return ["lotus", "emerald", "rose", "blue", "gold", "neutral"].includes(themeGradient) ? themeGradient : "lotus";
}

function applyTheme(themeGradient) {
  document.body.dataset.theme = normalizeThemeGradient(themeGradient);
}

function isCredentialHintShortcut(event) {
  return (
    event.ctrlKey &&
    (event.key === "0" || event.code === "Digit0" || event.code === "Numpad0")
  );
}

async function loadStartupSettings() {
  if (window.simplePOS) {
    const startupSettings = await window.simplePOS.getStartupSettings();
    state.settings = {
      ...state.settings,
      businessName: startupSettings.businessName || state.settings.businessName,
      businessAddress: startupSettings.businessAddress || state.settings.businessAddress,
      whatsappNumber: startupSettings.whatsappNumber || state.settings.whatsappNumber,
      setupComplete: startupSettings.setupComplete === true,
      themeGradient: normalizeThemeGradient(startupSettings.themeGradient || state.settings.themeGradient)
    };
    state.users = Array.isArray(startupSettings.users) && startupSettings.users.length
      ? startupSettings.users
      : [...defaultUsers];
  } else {
    const saved = JSON.parse(localStorage.getItem("beauty-pos-settings") || "null");
    if (saved) {
      state.settings = {
        ...state.settings,
        businessName: saved.businessName || state.settings.businessName,
        businessAddress: saved.businessAddress || state.settings.businessAddress,
        whatsappNumber: saved.whatsappNumber || state.settings.whatsappNumber,
        setupComplete: saved.setupComplete === true
      };
      state.users = Array.isArray(saved.users) && saved.users.length ? saved.users : [...defaultUsers];
    }
  }

  renderBusinessName(false);
  applyTheme(state.settings.themeGradient);
  renderLoginUserHints();
}

async function loadSettings() {
  if (window.simplePOS) {
    state.settings = await window.simplePOS.getSettings();
  } else {
    const saved = JSON.parse(localStorage.getItem("beauty-pos-settings") || "null");
    if (saved) state.settings = { ...state.settings, ...saved };
  }

  state.products = Array.isArray(state.settings.products) && state.settings.products.length
    ? state.settings.products
    : [...defaultProducts];
  state.users = Array.isArray(state.settings.users) && state.settings.users.length
    ? state.settings.users
    : [...defaultUsers];
  state.orderNumber = Number(state.settings.nextOrderNumber || state.orderNumber);
  applyTheme(state.settings.themeGradient);
  renderBusinessName();
}

function renderBusinessName(loadLogo = Boolean(state.currentUser)) {
  const businessName = state.settings.businessName || "Simple POS";
  els.businessName.textContent = businessName;
  els.loginBusinessName.textContent = businessName;
  const showLogo = loadLogo && Boolean(state.settings.businessLogo);
  els.businessLogo.src = showLogo ? state.settings.businessLogo : "";
  els.businessLogo.classList.toggle("is-hidden", !showLogo);
  document.title = getApplicationTitle();
}

function getApplicationTitle() {
  const businessName = String(state.settings.businessName || "").trim();
  if (!businessName) return "Simple POS";
  return `${businessName} - POS`;
}

function renderPaymentMethods() {
  const methods = Array.isArray(state.settings.paymentMethods)
    ? state.settings.paymentMethods.filter((method) => method.enabled !== false)
    : [];
  const visibleMethods = methods.length
    ? methods
    : [
        { name: "Cash", enabled: true },
        { name: "Debit Card", enabled: true },
        { name: "Credit Card", enabled: true }
      ];
  const selectedMethod = els.paymentMethod.value;
  els.paymentMethod.innerHTML = visibleMethods
    .map((method) => `<option value="${escapeHtml(method.name)}">${escapeHtml(method.name)}</option>`)
    .join("");
  if (visibleMethods.some((method) => method.name === selectedMethod)) {
    els.paymentMethod.value = selectedMethod;
  }
}

function isReceiptPrintingEnabled() {
  return state.settings.receiptPrintingEnabled === true;
}

function canUseReceiptPrinting() {
  return isReceiptPrintingEnabled() && state.currentUser?.role === "admin";
}

function canUseUnlimitedDiscounts(user = state.currentUser) {
  const role = String(user?.role || "").toLowerCase();
  const username = String(user?.username || "").toLowerCase();
  const name = String(user?.name || "").toLowerCase();
  return role === "admin" || role === "owner" || username === "owner" || name === "owner";
}

function getCurrentUserDiscountLimit() {
  if (canUseUnlimitedDiscounts()) return Infinity;
  const liveUser = state.users.find((user) => user.username === state.currentUser?.username);
  return Math.min(100, Math.max(0, Number(liveUser?.discountLimit ?? state.currentUser?.discountLimit ?? 0) || 0));
}

function getDiscountDraft() {
  const totals = getTotals();
  const maximumDiscount = totals.subtotal + totals.tax;
  const percent = Math.min(100, Math.max(0, parseMoney(els.discountInput.value)));
  const discount = maximumDiscount * (percent / 100);
  return {
    totals,
    maximumDiscount,
    percent,
    discount,
    newTotal: Math.max(0, maximumDiscount - discount),
    limit: getCurrentUserDiscountLimit()
  };
}

// Receipt action buttons are driven by printer settings and the configured Enter-key default.
function renderReceiptActions() {
  els.printReceipt.classList.toggle("is-hidden", !canUseReceiptPrinting());
}

function getSaleCompleteEnterAction() {
  const action = String(state.settings.saleCompleteEnterAction || "").trim();
  return ["startNextSale", "shareWhatsApp", "hold"].includes(action) ? action : "startNextSale";
}

function runSaleCompleteEnterAction() {
  if (!els.receiptDialog.open || !state.lastReceipt) return;
  const action = getSaleCompleteEnterAction();
  if (action === "hold") {
    holdLastReceipt();
    return;
  }
  if (action === "shareWhatsApp") {
    shareLastReceipt();
    return;
  }
  startNextSale();
}

function focusSaleCompleteEnterAction() {
  const action = getSaleCompleteEnterAction();
  const target =
    action === "hold" ? els.holdSale :
    action === "shareWhatsApp" ? els.shareReceipt :
    els.startNextSale;
  window.setTimeout(() => target?.focus(), 0);
}

function canAccess(permissionName) {
  if (!state.currentUser) return false;
  if (state.currentUser.role === "admin") return true;
  return Boolean(state.settings.permissions?.[permissionName]);
}

function loadSession() {
  localStorage.removeItem(SESSION_KEY);
  state.currentUser = null;
}

function persistSession() {
  if (state.currentUser) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(state.currentUser));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function getTotals() {
  const subtotal = [...state.cart.values()].reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const taxableSubtotal = [...state.cart.values()].reduce((sum, item) => {
    const taxable = item.product.taxable !== false;
    return taxable ? sum + item.product.price * item.quantity : sum;
  }, 0);
  const tax = taxableSubtotal * Number(state.settings.taxRate || 0);
  const beforeDiscountTotal = subtotal + tax;
  const discountPercent = Math.min(100, Math.max(0, Number(state.discountPercent || 0)));
  const discount = beforeDiscountTotal * (discountPercent / 100);
  return {
    subtotal,
    taxableSubtotal,
    tax,
    discountPercent,
    discount,
    total: Math.max(0, beforeDiscountTotal - discount)
  };
}

// Authentication workflow updates persisted session state and switches between login/register views.
function setAuthenticatedUser(user) {
  state.currentUser = user ? {
    name: user.name,
    role: user.role,
    username: user.username,
    discountLimit: Number(user.discountLimit) || 0
  } : null;
  persistSession();
  renderAuthState();
  if (state.currentUser) renderRegister();
}

function closeOpenDialogs() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => {
    dialog.close();
  });
}

function switchUser() {
  const previousUser = state.currentUser;
  closeOpenDialogs();
  resetSale();
  setAuthenticatedUser(null);
  if (previousUser && window.simplePOS) {
    window.simplePOS.logAudit({
      actorName: previousUser.name,
      actorUsername: previousUser.username,
      actorRole: previousUser.role,
      action: "Logged out",
      details: "User logged out or switched user."
    });
  }
  els.username.focus();
}

function getAuditActor() {
  return state.currentUser
    ? { name: state.currentUser.name, username: state.currentUser.username, role: state.currentUser.role }
    : null;
}

function isCtrlLShortcut(event) {
  return event.ctrlKey && !event.altKey && !event.shiftKey && (event.key?.toLowerCase() === "l" || event.code === "KeyL");
}

function isLoginScreenVisible() {
  return !els.loginScreen.classList.contains("is-hidden") && els.setupScreen.classList.contains("is-hidden");
}

function isMainPosScreenVisible() {
  return Boolean(state.currentUser) && !els.appShell.classList.contains("is-hidden");
}

// Ctrl+L workflow logs out from POS or confirms app close from login when enabled in Settings.
function handleCtrlLShortcut(event) {
  if (state.settings.ctrlEscShortcutEnabled === false) return;
  if (!isLoginScreenVisible() && !isMainPosScreenVisible()) return;
  event.preventDefault();
  event.stopPropagation();

  if (isMainPosScreenVisible()) {
    switchUser();
    return;
  }

  if (window.confirm("Ctrl+L will close the POS application. Close now?")) {
    if (window.simplePOS?.closeApp) {
      window.simplePOS.closeApp();
    } else {
      window.close();
    }
  }
}

function renderAuthState() {
  const signedIn = Boolean(state.currentUser);
  els.setupScreen.classList.add("is-hidden");
  els.loginScreen.classList.toggle("is-hidden", signedIn);
  els.appShell.classList.toggle("is-hidden", !signedIn);
  if (signedIn) {
    setLoginUserHintsVisible(false);
  } else {
    setTimeout(() => els.username.focus(), 0);
  }

  if (!signedIn) return;

  els.currentRole.textContent = state.currentUser.name;
  els.currentUser.textContent = state.currentUser.username;
  els.settingsButton.classList.toggle("is-hidden", !canAccess("staffCanAccessSettings"));
  els.managementButton.classList.toggle("is-hidden", !canAccess("staffCanAccessManagement"));
  els.reportingButton.classList.toggle("is-hidden", !canAccess("staffCanAccessReporting"));
  els.heldReceiptsButton.classList.toggle("is-hidden", state.currentUser.role !== "staff");
  els.staffReportButton.classList.toggle("is-hidden", state.currentUser.role !== "staff");
  const hasAdminActions =
    canAccess("staffCanAccessSettings") ||
    canAccess("staffCanAccessManagement") ||
    canAccess("staffCanAccessReporting");
  document.querySelector(".admin-actions")?.classList.toggle("is-hidden", !hasAdminActions);
}

function renderRegister() {
  renderBusinessName(true);
  els.taxRateLabel.textContent = `${(Number(state.settings.taxRate || 0) * 100).toFixed(2)}%`;
  els.orderNumber.textContent = `#${state.orderNumber}`;
  renderPaymentMethods();
  renderCategories();
  renderProducts();
  renderCart();
}

function showSetupScreen(step = "business") {
  state.currentUser = null;
  persistSession();
  els.appShell.classList.add("is-hidden");
  els.loginScreen.classList.add("is-hidden");
  els.setupScreen.classList.remove("is-hidden");
  const showBusiness = step === "business";
  els.businessSetupStep.classList.toggle("is-hidden", !showBusiness);
  els.adminSetupStep.classList.toggle("is-hidden", showBusiness);
  if (showBusiness) {
    els.setupBusinessName.value = state.settings.businessName || "";
    els.setupBusinessAddress.value = state.settings.businessAddress || "";
    els.setupContactNumber.value = state.settings.whatsappNumber || "";
    els.setupBusinessError.textContent = "";
    els.setupBusinessName.focus();
  } else {
    els.setupAdminError.textContent = "";
    els.setupAdminName.focus();
  }
}

function handleBusinessSetup(event) {
  event.preventDefault();
  const businessName = els.setupBusinessName.value.trim();
  const businessAddress = els.setupBusinessAddress.value.trim();
  const contactNumber = els.setupContactNumber.value.trim();
  if (!businessName || !businessAddress || !contactNumber) {
    els.setupBusinessError.textContent = "Business name, address, and contact number are required.";
    return;
  }
  state.settings = {
    ...state.settings,
    businessName,
    businessAddress,
    whatsappNumber: contactNumber
  };
  renderBusinessName(false);
  showSetupScreen("admin");
}

async function handleAdminSetup(event) {
  event.preventDefault();
  const name = els.setupAdminName.value.trim();
  const username = els.setupAdminUsername.value.trim();
  const password = els.setupAdminPassword.value;
  const confirmPassword = els.setupAdminConfirmPassword.value;
  if (!name || !username || !password || !confirmPassword) {
    els.setupAdminError.textContent = "Owner name, username, and password are required.";
    return;
  }
  if (password.length < 4) {
    els.setupAdminError.textContent = "Admin password must be at least 4 characters.";
    return;
  }
  if (password !== confirmPassword) {
    els.setupAdminError.textContent = "Passwords do not match.";
    return;
  }

  const submitButton = els.adminSetupForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  els.setupAdminError.textContent = "";
  try {
    const adminUser = { name, username, password, role: "admin" };
    const nextSettings = {
      ...state.settings,
      setupComplete: true,
      receiptPrintingEnabled: false,
      silent: false,
      users: [adminUser]
    };
    state.settings = window.simplePOS
      ? await window.simplePOS.saveSettings({
          ...nextSettings,
          __auditActor: adminUser,
          __auditAction: "Completed first setup",
          __auditDetails: "Business information and owner administrator account were created."
        })
      : nextSettings;
    state.users = [adminUser];
    renderBusinessName(false);
    renderLoginUserHints();
    els.businessSetupForm.reset();
    els.adminSetupForm.reset();
    els.setupScreen.classList.add("is-hidden");
    renderAuthState();
    els.username.focus();
  } catch {
    els.setupAdminError.textContent = "Unable to save setup. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
}

function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  const current = state.cart.get(productId);

  state.cart.set(productId, {
    product,
    quantity: current ? current.quantity + 1 : 1
  });

  renderCart();
  scrollCartToBottom();
  focusTenderedAmount();
}

function scrollCartToBottom() {
  requestAnimationFrame(() => {
    if (els.cartItems.scrollHeight > els.cartItems.clientHeight) {
      els.cartItems.scrollTop = els.cartItems.scrollHeight;
    }
  });
}

function focusTenderedAmount() {
  requestAnimationFrame(() => {
    els.tendered.focus();
    const cursorPosition = els.tendered.value.length;
    els.tendered.setSelectionRange(cursorPosition, cursorPosition);
  });
}

function updateQuantity(productId, delta) {
  const current = state.cart.get(productId);
  if (!current) return;

  const quantity = current.quantity + delta;
  if (quantity <= 0) {
    state.cart.delete(productId);
  } else {
    state.cart.set(productId, { ...current, quantity });
  }

  renderCart();
}

function renderCategories() {
  const catalogProducts = state.products.filter((product) => getProductStatus(product) !== "inactive");
  const categories = [
    "All",
    ...new Set([
      ...(Array.isArray(state.settings.categories) ? state.settings.categories : []),
      ...catalogProducts.map((product) => product.category)
    ])
  ];

  els.categoryTabs.innerHTML = categories
    .map((category) => {
      const active = category === state.activeCategory ? "active" : "";
      return `<button class="${active}" type="button" data-category="${escapeHtml(category)}">${escapeHtml(category)}</button>`;
    })
    .join("");
}

function renderProducts() {
  const searchTerm = els.productSearch.value.trim().toLowerCase();
  const visibleProducts = state.products.filter((product) => {
    if (getProductStatus(product) === "inactive") return false;
    const matchesCategory =
      state.activeCategory === "All" || product.category === state.activeCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm) ||
      product.id.toLowerCase().includes(searchTerm) ||
      String(product.sku || "").toLowerCase().includes(searchTerm) ||
      String(product.barcode || "").toLowerCase().includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  els.productGrid.innerHTML = visibleProducts
    .map(
      (product) => `
        <button class="product-card" type="button" data-product-id="${escapeHtml(product.id)}">
          <span class="product-card-topline">
            <span class="product-code">${escapeHtml(product.id)} - ${escapeHtml(product.category)}</span>
            ${isNewStatusActive(product) ? `<span class="minor-status-badge product-status-badge">NEW!</span>` : ""}
            ${getProductStatus(product) === "promotion" ? `<span class="product-promotion-badge catalog-promotion-badge">PROMO</span>` : ""}
          </span>
          <strong>${escapeHtml(product.name)}</strong>
          <span class="product-price">${formatMoney(product.price)}</span>
        </button>
      `
    )
    .join("");
}

function getProductStatus(product) {
  const status = String(product?.status || "active").trim().toLowerCase();
  return ["active", "inactive", "promotion"].includes(status) ? status : "active";
}

function isNewStatusActive(product) {
  if (product?.minorStatus !== "new") return false;
  if (state.settings.newItemBadgeTimerEnabled === false) return true;
  const timestamp = Date.parse(product.minorStatusAt || "");
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp <= getNewItemBadgeHours() * 60 * 60 * 1000;
}

function getNewItemBadgeHours() {
  const hours = Number(state.settings.newItemBadgeHours || 24);
  return Number.isFinite(hours) && hours >= 1 ? Math.floor(hours) : 24;
}

// Cart renderer recalculates sale totals, tax, discount, change due, and checkout button state.
function renderCart() {
  const cartItems = [...state.cart.values()];
  const totals = getTotals();
  const tendered = Number(els.tendered.value || 0);
  const change = Math.max(0, tendered - totals.total);

  els.cartItems.innerHTML = cartItems.length
    ? cartItems
        .map(
          ({ product, quantity }) => `
            <div class="cart-item">
              <div>
                <h3>${escapeHtml(product.name)}</h3>
                <p>${quantity} x ${formatMoney(product.price)} - ${formatMoney(product.price * quantity)}</p>
              </div>
              <div class="quantity-controls" aria-label="Quantity for ${escapeHtml(product.name)}">
                <button type="button" data-quantity-id="${escapeHtml(product.id)}" data-delta="-1" aria-label="Remove one ${escapeHtml(product.name)}">-</button>
                <span>${quantity}</span>
                <button type="button" data-quantity-id="${escapeHtml(product.id)}" data-delta="1" aria-label="Add one ${escapeHtml(product.name)}">+</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="empty-cart">No items yet. Add products from the catalog to start a sale.</div>`;

  els.subtotal.textContent = formatMoney(totals.subtotal);
  els.tax.textContent = formatMoney(totals.tax);
  els.discountLine.classList.toggle("is-hidden", totals.discount <= 0);
  els.discountLabel.textContent = totals.discountPercent > 0
    ? `Discount (${formatPercent(totals.discountPercent)})`
    : "Discount";
  els.discountAmount.textContent = `-${formatMoney(totals.discount)}`;
  els.total.textContent = formatMoney(totals.total);
  els.changeDue.textContent = formatMoney(change);
  els.discountSale.disabled = cartItems.length === 0 || !hasTenderedAmount();
  els.discountSale.title = els.discountSale.disabled
    ? "Enter Amount tendered before applying a discount."
    : "Apply a discount to the sale total.";
  els.completeSale.disabled = cartItems.length === 0 || tendered < totals.total;
}

function buildSalePayload(orderNumber) {
  const totals = getTotals();
  const tendered = Number(els.tendered.value || 0);
  const change = Math.max(0, tendered - totals.total);

  return {
    businessName: state.settings.businessName || "Simple POS",
    businessAddress: state.settings.businessAddress || "",
    whatsappNumber: state.settings.whatsappNumber || "",
    orderNumber,
    date: new Date().toLocaleString(),
    cashier: state.currentUser?.name || "Unknown",
    cashierUsername: state.currentUser?.username || "unknown",
    cashierRole: state.currentUser?.role || "staff",
    paymentMethod: els.paymentMethod.value,
    items: [...state.cart.values()].map(({ product, quantity }) => ({
      id: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      taxable: product.taxable !== false,
      quantity,
      unitPrice: formatMoney(product.price),
      lineTotal: formatMoney(product.price * quantity)
    })),
    subtotal: formatMoney(totals.subtotal),
    taxableSubtotal: formatMoney(totals.taxableSubtotal),
    tax: formatMoney(totals.tax),
    discountPercent: formatPercent(totals.discountPercent),
    discount: formatMoney(totals.discount),
    total: formatMoney(totals.total),
    tendered: formatMoney(tendered),
    change: formatMoney(change),
    status: "hold"
  };
}

async function getReceiptOrderNumber() {
  if (state.restoredOrderNumber) return state.restoredOrderNumber;
  if (window.simplePOS) {
    const orderNumber = await window.simplePOS.getNextOrderNumber();
    state.orderNumber = Number(orderNumber) + 1;
    return orderNumber;
  }
  return state.orderNumber++;
}

// Complete Sale workflow builds a receipt, reserves order number, and opens receipt actions.
async function completeSale() {
  els.completeSale.disabled = true;
  const orderNumber = await getReceiptOrderNumber();
  const isRestoredBill = Boolean(state.restoredOrderNumber);
  state.lastReceipt = buildSalePayload(orderNumber);
  state.lastReceipt.restoredBill = isRestoredBill;
  const receiptRows = state.lastReceipt.items
    .map(
      (item) => `
        <div class="receipt-row">
          <span>${item.quantity} x ${escapeHtml(item.name)}</span>
          <strong>${item.lineTotal}</strong>
        </div>
      `
    )
    .join("");

  els.receiptBody.innerHTML = `
    <div class="receipt-row"><span>Address</span><strong>${escapeHtml(state.lastReceipt.businessAddress || "Business address")}</strong></div>
    <div class="receipt-row"><span>Contact</span><strong>${escapeHtml(state.lastReceipt.whatsappNumber || "Contact #")}</strong></div>
    <div class="receipt-row"><span>Receipt #</span><strong>#${state.lastReceipt.orderNumber}</strong></div>
    <div class="receipt-row"><span>Date</span><strong>${escapeHtml(state.lastReceipt.date)}</strong></div>
    <div class="receipt-row"><span>Cashier</span><strong>${escapeHtml(state.lastReceipt.cashier)}</strong></div>
    <div class="receipt-row"><span>Payment</span><strong>${escapeHtml(state.lastReceipt.paymentMethod)}</strong></div>
    ${receiptRows}
    <div class="receipt-row"><span>Subtotal</span><strong>${state.lastReceipt.subtotal}</strong></div>
    <div class="receipt-row"><span>Tax</span><strong>${state.lastReceipt.tax}</strong></div>
    ${parseMoney(state.lastReceipt.discount) > 0 ? `<div class="receipt-row"><span>Discount (${escapeHtml(state.lastReceipt.discountPercent || "")})</span><strong>-${state.lastReceipt.discount}</strong></div>` : ""}
    <div class="receipt-row"><span>Total</span><strong>${state.lastReceipt.total}</strong></div>
    <div class="receipt-row"><span>Tendered</span><strong>${state.lastReceipt.tendered}</strong></div>
    <div class="receipt-row"><span>Change</span><strong>${state.lastReceipt.change}</strong></div>
  `;

  renderReceiptActions();
  els.receiptDialog.showModal();
  focusSaleCompleteEnterAction();
  if (window.simplePOS) {
    state.invoiceSavePromise = window.simplePOS.saveInvoice(state.lastReceipt);
  }
  resetSale();
}

// Hold workflow saves the open receipt as Hold so it can be restored later.
async function holdLastReceipt() {
  if (!state.lastReceipt) return;
  if (state.invoiceSavePromise) {
    await state.invoiceSavePromise;
    state.invoiceSavePromise = null;
  }
  state.lastReceipt.status = "hold";
  if (window.simplePOS) {
    await window.simplePOS.updateInvoiceStatus(state.lastReceipt.orderNumber, "hold", getAuditActor());
  }
  const holdMessage = state.settings.holdRetentionEnabled === false
    ? `Held bill #${state.lastReceipt.orderNumber} saved. Held bills do not expire automatically.`
    : `Held bill #${state.lastReceipt.orderNumber} saved. Held bills are saved for ${Number(state.settings.holdRetentionHours || 24)} hour(s).`;
  showHoldWarning(holdMessage);
  state.lastReceipt = null;
  els.receiptDialog.close();
}

function showHoldWarning(message) {
  window.clearTimeout(state.holdWarningTimer);
  els.holdWarning.textContent = message;
  els.holdWarning.classList.remove("is-hidden", "is-fading");
  state.holdWarningTimer = window.setTimeout(() => {
    els.holdWarning.classList.add("is-fading");
    state.holdWarningTimer = window.setTimeout(() => {
      els.holdWarning.textContent = "";
      els.holdWarning.classList.add("is-hidden");
      els.holdWarning.classList.remove("is-fading");
      state.holdWarningTimer = null;
    }, 450);
  }, 15000);
}

function clearHoldWarning() {
  window.clearTimeout(state.holdWarningTimer);
  state.holdWarningTimer = null;
  els.holdWarning.textContent = "";
  els.holdWarning.classList.add("is-hidden");
  els.holdWarning.classList.remove("is-fading");
}

async function markLastReceiptComplete() {
  return markReceiptComplete(state.lastReceipt);
}

async function markReceiptComplete(receipt) {
  if (!receipt || !window.simplePOS) return;
  if (state.invoiceSavePromise) {
    await state.invoiceSavePromise;
    state.invoiceSavePromise = null;
  }
  receipt.status = "complete";
  await window.simplePOS.updateInvoiceStatus(receipt.orderNumber, "complete", getAuditActor());
}

function resetSale(options = {}) {
  state.cart.clear();
  state.discountPercent = 0;
  state.restoredOrderNumber = null;
  state.orderNumber = Math.max(Number(state.settings.nextOrderNumber || state.orderNumber), state.orderNumber);
  els.orderNumber.textContent = `#${state.orderNumber}`;
  els.tendered.value = "";
  if (!options.keepHoldWarning) {
    clearHoldWarning();
  }
  renderCart();
}

function setSaleDiscount() {
  const totals = getTotals();
  if (totals.subtotal <= 0) {
    window.alert("Add items to the current sale before applying a discount.");
    return;
  }
  if (!hasTenderedAmount()) {
    window.alert("Enter Amount tendered before applying a discount.");
    focusTenderedAmount();
    return;
  }

  els.discountInput.value = totals.discountPercent > 0 ? String(totals.discountPercent) : "";
  renderDiscountPreview();
  els.discountDialog.showModal();
  window.setTimeout(() => {
    els.discountInput.focus();
    els.discountInput.select();
  }, 0);
}

function renderDiscountPreview() {
  const draft = getDiscountDraft();
  if (draft.totals.subtotal <= 0) {
    els.discountPreview.textContent = "Add items to the current sale before applying a discount.";
    els.discountPreview.classList.add("status-short");
    els.applyDiscount.disabled = true;
    return;
  }

  const overLimit = draft.percent > draft.limit;
  els.discountPreview.classList.toggle("status-short", overLimit);
  els.applyDiscount.disabled = overLimit || !Number.isFinite(draft.percent) || draft.percent < 0;
  els.discountPreview.textContent = overLimit
    ? `Limit exceeded. This user can discount up to ${formatPercent(draft.limit)}.`
    : `Confirm ${formatPercent(draft.percent)} discount from sale total. Discount: ${formatMoney(draft.discount)}. Receipt total: ${formatMoney(draft.newTotal)}.`;
}

function applySaleDiscount() {
  const draft = getDiscountDraft();
  if (draft.totals.subtotal <= 0 || draft.percent > draft.limit || draft.percent < 0) {
    renderDiscountPreview();
    return;
  }

  state.discountPercent = draft.percent;
  els.discountDialog.close();
  renderCart();
  focusTenderedAmount();
}

async function printLastReceipt() {
  if (!state.lastReceipt) return;
  if (!canUseReceiptPrinting()) return;

  await markLastReceiptComplete();
  if (window.simplePOS) {
    await window.simplePOS.printReceipt({ ...state.lastReceipt, ...state.settings });
    return;
  }

  window.print();
}

async function shareLastReceipt() {
  if (!state.lastReceipt) return;

  await markLastReceiptComplete();
  if (window.simplePOS) {
    await window.simplePOS.shareReceiptWhatsApp({ ...state.lastReceipt, ...state.settings });
    return;
  }

  const message = `${state.lastReceipt.businessName} receipt #${state.lastReceipt.orderNumber} total ${state.lastReceipt.total}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
}

async function startNextSale() {
  const receipt = state.lastReceipt;
  state.lastReceipt = null;
  els.receiptDialog.close();
  markReceiptComplete(receipt).catch(() => {
    state.lastReceipt = receipt;
  });
}

function restoreInvoice(invoice) {
  if (els.receiptDialog.open) {
    els.receiptDialog.close();
  }
  state.lastReceipt = null;
  state.cart.clear();
  state.orderNumber = Number(invoice.orderNumber) || state.orderNumber;
  state.restoredOrderNumber = state.orderNumber;
  els.orderNumber.textContent = `#${state.orderNumber}`;
  (invoice.items || []).forEach((item) => {
    const product =
      state.products.find((currentProduct) => currentProduct.id === item.id) || {
        id: item.id || `RESTORED-${state.cart.size + 1}`,
        name: item.name,
        category: item.category || "Restored",
        price: Number(item.price || 0),
        taxable: item.taxable !== false,
        status: "active",
        note: ""
      };
    state.cart.set(product.id, {
      product,
      quantity: Number(item.quantity || 1)
    });
  });
  els.tendered.value = "";
  state.activeCategory = "All";
  renderCategories();
  renderProducts();
  renderCart();
  focusTenderedAmount();
}

// Button, keyboard, dialog, and workflow wiring for the main POS window.
els.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  handleLogin();
});
els.businessSetupForm.addEventListener("submit", handleBusinessSetup);
els.adminSetupForm.addEventListener("submit", handleAdminSetup);
els.backToBusinessSetup.addEventListener("click", () => showSetupScreen("business"));

window.addEventListener("keydown", (event) => {
  if (isCtrlLShortcut(event)) {
    handleCtrlLShortcut(event);
    return;
  }
  if (isCredentialHintShortcut(event)) {
    event.preventDefault();
    setLoginUserHintsVisible(true);
  }
}, true);

window.addEventListener("keyup", (event) => {
  if (
    event.key === "Control" ||
    event.key === "Shift" ||
    event.key === "0" ||
    event.code === "Digit0" ||
    event.code === "Numpad0"
  ) {
    setLoginUserHintsVisible(false);
  }
}, true);

window.addEventListener("blur", () => {
  setLoginUserHintsVisible(false);
});

async function handleLogin() {
  const username = els.username.value.trim();
  const password = els.password.value;
  const user = state.users.find((item) => item.username === username && item.password === password);

  if (!user) {
    els.loginError.textContent = "Invalid username or password.";
    return;
  }

  els.loginError.textContent = "";
  const submitButton = els.loginForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await loadSettings();
    const currentUser = state.users.find((item) => item.username === username && item.password === password) || user;
    els.loginForm.reset();
    setAuthenticatedUser(currentUser);
    if (window.simplePOS) {
      window.simplePOS.logAudit({
        actorName: currentUser.name,
        actorUsername: currentUser.username,
        actorRole: currentUser.role,
        action: "Logged in",
        details: "User signed in to POS."
      });
    }
  } catch {
    els.loginError.textContent = "Unable to load POS data. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
}

els.logoutButton.addEventListener("click", () => {
  switchUser();
});

els.categoryTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.activeCategory = button.dataset.category;
  renderCategories();
  renderProducts();
});

els.productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product-id]");
  if (!button) return;
  addToCart(button.dataset.productId);
});

els.cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quantity-id]");
  if (!button) return;
  updateQuantity(button.dataset.quantityId, Number(button.dataset.delta));
});

els.productSearch.addEventListener("input", renderProducts);
els.tendered.addEventListener("input", renderCart);
els.tendered.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    renderCart();
    if (!els.completeSale.disabled) completeSale();
    return;
  }
  if (event.code !== "NumpadDecimal") return;
  event.preventDefault();
  insertDecimalAtCursor(els.tendered);
  renderCart();
});
els.completeSale.addEventListener("click", completeSale);
document.addEventListener("click", (event) => {
  if (!event.target.closest("#discountSale")) return;
  event.preventDefault();
  setSaleDiscount();
});
els.discountInput.addEventListener("input", renderDiscountPreview);
els.discountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (!els.applyDiscount.disabled) applySaleDiscount();
    return;
  }
  if (event.code !== "NumpadDecimal") return;
  event.preventDefault();
  insertDecimalAtCursor(els.discountInput);
  renderDiscountPreview();
});
els.applyDiscount.addEventListener("click", applySaleDiscount);
els.cancelDiscount.addEventListener("click", () => {
  els.discountDialog.close();
  focusTenderedAmount();
});
els.holdSale.addEventListener("click", holdLastReceipt);
els.printReceipt.addEventListener("click", printLastReceipt);
els.shareReceipt.addEventListener("click", shareLastReceipt);
els.startNextSale.addEventListener("click", startNextSale);
els.receiptDialog.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  event.stopPropagation();
  runSaleCompleteEnterAction();
});
els.receiptDialog.addEventListener("cancel", (event) => {
  if (!state.lastReceipt) return;
  event.preventDefault();
  window.alert(`Receipt #${state.lastReceipt.orderNumber} will be placed on Hold because Esc was pressed on the Complete Sale window.`);
  holdLastReceipt();
});
els.receiptDialog.addEventListener("close", async () => {
  if (!state.lastReceipt?.restoredBill || state.lastReceipt.status !== "hold") return;
  if (window.simplePOS) {
    await window.simplePOS.updateInvoiceStatus(state.lastReceipt.orderNumber, "hold", getAuditActor());
  }
  state.lastReceipt = null;
});
els.settingsButton.addEventListener("click", () => {
  if (window.simplePOS) {
    window.simplePOS.logAudit({ actor: getAuditActor(), action: "Opened Settings", details: "Settings window opened." });
    window.simplePOS.openSettings();
  }
});

els.managementButton.addEventListener("click", () => {
  if (window.simplePOS) {
    window.simplePOS.logAudit({ actor: getAuditActor(), action: "Opened Inventory", details: "Inventory window opened." });
    window.simplePOS.openManagement();
  }
});

els.reportingButton.addEventListener("click", () => {
  if (window.simplePOS) {
    window.simplePOS.logAudit({ actor: getAuditActor(), action: "Opened Reporting", details: "Reporting window opened." });
    window.simplePOS.openReporting();
  }
});

document.addEventListener("click", (event) => {
  const helpButton = event.target.closest("[data-open-help]");
  if (!helpButton) return;
  event.preventDefault();
  window.simplePOS?.openHelp?.();
});

els.heldReceiptsButton.addEventListener("click", () => {
  if (window.simplePOS) {
    window.simplePOS.logAudit({ actor: getAuditActor(), action: "Opened Held Receipts", details: "Held receipts window opened." });
    window.simplePOS.openReporting("holds");
  }
});

els.staffReportButton.addEventListener("click", () => {
  if (window.simplePOS) {
    window.simplePOS.logAudit({ actor: getAuditActor(), action: "Opened Staff Report", details: "Staff end-of-day report window opened." });
    window.simplePOS.openReporting("eod");
  }
});

els.switchUserButton.addEventListener("click", switchUser);

if (window.simplePOS) {
  window.simplePOS.onSettingsUpdated((settings) => {
    state.settings = settings;
    applyTheme(settings.themeGradient);
    state.products = Array.isArray(settings.products) && settings.products.length
      ? settings.products
      : [...defaultProducts];
    state.users = Array.isArray(settings.users) && settings.users.length
      ? settings.users
      : [...defaultUsers];
    if (!state.restoredOrderNumber) {
      state.orderNumber = Number(settings.nextOrderNumber || state.orderNumber);
      els.orderNumber.textContent = `#${state.orderNumber}`;
    }
    if (
      state.activeCategory !== "All" &&
      !state.products.some((product) => product.category === state.activeCategory)
    ) {
      state.activeCategory = "All";
    }
    if (state.currentUser) {
      renderRegister();
      if (els.receiptDialog.open) renderReceiptActions();
    } else {
      renderBusinessName(false);
    }
  });
  window.simplePOS.onInvoiceRestore((invoice) => {
    restoreInvoice(invoice);
  });
  window.simplePOS.onDatabaseBackupStatus(showBackupStatus);
  window.simplePOS.onLogoutRequested(() => {
    if (state.currentUser) {
      switchUser();
    } else {
      renderAuthState();
    }
  });
}

function insertDecimalAtCursor(input) {
  if (input.value.includes(".")) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}.${input.value.slice(end)}`;
  const nextPosition = start + 1;
  input.setSelectionRange(nextPosition, nextPosition);
}

async function init() {
  loadSession();
  await loadStartupSettings();
  if (state.settings.setupComplete !== true) {
    showSetupScreen("business");
    return;
  }
  renderAuthState();
  if (isLoginScreenVisible()) setTimeout(() => els.username.focus(), 0);
}

init();
