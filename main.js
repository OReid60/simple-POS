const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const extractZip = require("extract-zip");
const posDatabase = require("./database");

let mainWindow;
let settingsWindow;
let managementWindow;
let reportingWindow;
let auditWindow;
let activeRestoredOrderNumber = null;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
let hostDatabaseReady = false;

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });
}

const defaultSettings = {
  businessName: "",
  businessLogo: "",
  businessAddress: "",
  whatsappNumber: "",
  taxRate: 0.0825,
  receiptPrintingEnabled: false,
  printerName: "",
  paperSize: "letter",
  silent: false,
  themeGradient: "lotus",
  setupComplete: false,
  databaseMode: "",
  databasePath: "",
  databaseSetupLocked: false,
  databaseSetupLockedAt: "",
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
  users: [
    { username: "admin", password: "admin123", name: "Administrator", role: "admin", discountLimit: 0 },
    { username: "staff", password: "staff123", name: "Staff Member", role: "staff", discountLimit: 0 }
  ],
  nextOrderNumber: 1001,
  holdRetentionEnabled: true,
  holdRetentionHours: 24,
  newItemBadgeTimerEnabled: true,
  newItemBadgeHours: 24,
  invoices: [],
  voids: [],
  auditLogs: [],
  purchases: [],
  categories: [],
  products: []
};

function getSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function getDatabaseDirectory() {
  return path.join(app.getPath("documents"), "Simple POS Data");
}

function readLegacyJsonSettings() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), "utf8"));
  } catch {
    return null;
  }
}

function readRawSettings() {
  if (posDatabase.isReady()) return { ...defaultSettings, ...posDatabase.readSettings() };
  return { ...defaultSettings, ...(readLegacyJsonSettings() || {}) };
}

function writeRawSettings(settings) {
  if (posDatabase.isReady()) posDatabase.saveSettings(settings);
}

function getDatabasePath() {
  return path.join(getDatabaseDirectory(), "pos-data.sqlite");
}

function isHostMode(settings = readRawSettings()) {
  return settings.databaseMode === "host";
}

function shouldUseHostDatabase(settings = readRawSettings()) {
  return hostDatabaseReady && posDatabase.isReady();
}

function getApplicationName(settings = readSettings()) {
  const businessName = String(settings.businessName || "").trim();
  if (!businessName) return "POS";
  return `${businessName} - POS`;
}

function applyApplicationName(settings = readSettings()) {
  const applicationName = getApplicationName(settings);
  app.setName(applicationName);
  if (process.platform === "win32") app.setAppUserModelId("com.simplepos.desktop");
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setTitle(applicationName);
  return applicationName;
}

function updateWindowsShortcuts(settings = readSettings()) {
  if (process.platform !== "win32" || settings.setupComplete !== true) return;
  const businessName = String(settings.businessName || "").trim();
  if (!businessName) return;

  const shortcutName = `${businessName} - POS`;
  const iconPath = getShortcutIconPath();
  const shortcutOptions = {
    target: process.execPath,
    cwd: path.dirname(process.execPath),
    description: shortcutName,
    icon: iconPath,
    iconIndex: 0,
    appUserModelId: "com.simplepos.desktop"
  };

  [
    app.getPath("desktop"),
    path.join(app.getPath("appData"), "Microsoft", "Windows", "Start Menu", "Programs")
  ].forEach((directory) => {
    try {
      fs.mkdirSync(directory, { recursive: true });
      const desiredPath = path.join(directory, `${shortcutName}.lnk`);
      removeOldWindowsPosShortcuts(directory, desiredPath);
      shell.writeShortcutLink(desiredPath, "replace", shortcutOptions);
    } catch (error) {
      console.error("Unable to update POS shortcut.", error);
    }
  });
}

function getShortcutIconPath() {
  const packagedIconPath = path.join(process.resourcesPath || "", "build", "icon.ico");
  if (app.isPackaged && fs.existsSync(packagedIconPath)) return packagedIconPath;
  const localIconPath = path.join(__dirname, "build", "icon.ico");
  return fs.existsSync(localIconPath) ? localIconPath : process.execPath;
}

function removeOldWindowsPosShortcuts(directory, desiredPath) {
  if (!fs.existsSync(directory)) return;
  fs.readdirSync(directory)
    .filter((fileName) => fileName.toLowerCase().endsWith(".lnk"))
    .forEach((fileName) => {
      const shortcutPath = path.join(directory, fileName);
      if (shortcutPath === desiredPath) return;
      const isOldPosName = ["simple pos.lnk", "pos.lnk"].includes(fileName.toLowerCase());
      if (isOldPosName) {
        fs.unlinkSync(shortcutPath);
        return;
      }
      try {
        const shortcut = shell.readShortcutLink(shortcutPath);
        const pointsToThisApp = path.resolve(shortcut.target || "") === path.resolve(process.execPath);
        if (pointsToThisApp) fs.unlinkSync(shortcutPath);
      } catch {
        // Ignore shortcuts Windows cannot read unless they matched a known old POS name above.
      }
    });
}

function writeStoredSettings(settings) {
  writeRawSettings(settings);
}

function ensureDatabaseSetup() {
  fs.mkdirSync(getDatabaseDirectory(), { recursive: true });
  const legacySettings = readLegacyJsonSettings();
  try {
    posDatabase.initializeHostDatabase(getDatabaseDirectory(), { ...defaultSettings, ...(legacySettings || {}) });
    hostDatabaseReady = true;
  } catch (error) {
    hostDatabaseReady = false;
    console.error("SQLite database setup failed. Data cannot be persisted until SQLite opens.", error);
    return;
  }

  const settings = readRawSettings();
  const currentMode = settings.databaseMode === "host" || settings.databaseMode === "client"
    ? settings.databaseMode
    : "";
  const setupLocked = settings.databaseSetupLocked === true && currentMode;

  if (!setupLocked && !currentMode) {
    const nextSettings = {
      ...defaultSettings,
      ...settings,
      databaseMode: "host",
      databasePath: getDatabasePath(),
      databaseSetupLocked: true,
      databaseSetupLockedAt: new Date().toISOString()
    };
    writeStoredSettings(nextSettings);
    return;
  }

  if (currentMode && !settings.databaseSetupLocked) {
    writeStoredSettings({
      ...settings,
      databaseSetupLocked: true,
      databaseSetupLockedAt: settings.databaseSetupLockedAt || new Date().toISOString()
    });
  }

  if (currentMode === "host") {
    const nextSettings = {
      ...settings,
      databaseMode: "host",
      databasePath: settings.databasePath || getDatabasePath(),
      databaseSetupLocked: true,
      databaseSetupLockedAt: settings.databaseSetupLockedAt || new Date().toISOString()
    };
    if (!settings.databasePath) writeStoredSettings(nextSettings);
  }
}

function readStartupSettings() {
  try {
    const saved = readSettings();
    return {
      businessName: String(saved.businessName || "").trim(),
      businessAddress: String(saved.businessAddress || "").trim(),
      whatsappNumber: String(saved.whatsappNumber || "").trim(),
      setupComplete: saved.setupComplete === true,
      themeGradient: normalizeThemeGradient(saved.themeGradient),
      users: normalizeUsers(saved.users)
    };
  } catch {
    return {
      businessName: defaultSettings.businessName,
      businessAddress: defaultSettings.businessAddress,
      whatsappNumber: defaultSettings.whatsappNumber,
      setupComplete: defaultSettings.setupComplete,
      themeGradient: defaultSettings.themeGradient,
      users: defaultSettings.users
    };
  }
}

function readSettings() {
  try {
    const saved = readRawSettings();
    const merged = {
      ...defaultSettings,
      ...saved,
      databaseMode: saved.databaseMode || "",
      databasePath: saved.databasePath || getDatabasePath(),
      databaseSetupLocked: saved.databaseSetupLocked === true,
      databaseSetupLockedAt: String(saved.databaseSetupLockedAt || "")
    };
    return {
      ...merged,
      users: normalizeUsers(merged.users),
      permissions: normalizePermissions(merged.permissions),
      paymentMethods: normalizePaymentMethods(merged.paymentMethods),
      themeGradient: normalizeThemeGradient(merged.themeGradient),
      nextOrderNumber: normalizeNextOrderNumber(merged.nextOrderNumber, merged.invoices),
      holdRetentionEnabled: merged.holdRetentionEnabled !== false,
      holdRetentionHours: normalizeHoldRetentionHours(merged.holdRetentionHours),
      newItemBadgeTimerEnabled: merged.newItemBadgeTimerEnabled !== false,
      newItemBadgeHours: normalizeNewItemBadgeHours(merged.newItemBadgeHours),
      invoices: normalizeInvoices(merged.invoices, merged.holdRetentionHours, merged.holdRetentionEnabled),
      voids: normalizeVoids(merged.voids),
      auditLogs: normalizeAuditLogs(merged.auditLogs),
      purchases: normalizePurchases(merged.purchases),
      categories: normalizeCategories(merged.categories),
      products: normalizeProducts(merged.products, merged.newItemBadgeHours, merged.newItemBadgeTimerEnabled)
    };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings(settings) {
  const nextSettings = {
    ...defaultSettings,
    ...settings,
    taxRate: normalizeTaxRate(settings.taxRate),
    users: normalizeUsers(settings.users),
    permissions: normalizePermissions(settings.permissions),
    paymentMethods: normalizePaymentMethods(settings.paymentMethods),
    themeGradient: normalizeThemeGradient(settings.themeGradient),
    setupComplete: settings.setupComplete === true,
    nextOrderNumber: normalizeNextOrderNumber(settings.nextOrderNumber, settings.invoices),
    holdRetentionEnabled: settings.holdRetentionEnabled !== false,
    holdRetentionHours: normalizeHoldRetentionHours(settings.holdRetentionHours),
    newItemBadgeTimerEnabled: settings.newItemBadgeTimerEnabled !== false,
    newItemBadgeHours: normalizeNewItemBadgeHours(settings.newItemBadgeHours),
    invoices: normalizeInvoices(settings.invoices, settings.holdRetentionHours, settings.holdRetentionEnabled),
    voids: normalizeVoids(settings.voids),
    auditLogs: normalizeAuditLogs(settings.auditLogs),
    purchases: normalizePurchases(settings.purchases),
    categories: normalizeCategories(settings.categories),
    products: normalizeProducts(settings.products, settings.newItemBadgeHours, settings.newItemBadgeTimerEnabled)
  };
  if (shouldUseHostDatabase(nextSettings)) {
    nextSettings.databasePath = nextSettings.databasePath || getDatabasePath();
    posDatabase.saveSettings(nextSettings);
    const saved = readSettings();
    applyApplicationName(saved);
    updateWindowsShortcuts(saved);
    return saved;
  }
  return nextSettings;
}

function normalizePermissions(permissions) {
  return {
    ...defaultSettings.permissions,
    ...(permissions && typeof permissions === "object" ? permissions : {})
  };
}

function normalizeTaxRate(taxRate) {
  const normalized = Number(taxRate);
  if (!Number.isFinite(normalized) || normalized < 0) return defaultSettings.taxRate;
  return normalized;
}

function normalizeHoldRetentionHours(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 1) return defaultSettings.holdRetentionHours;
  return Math.floor(normalized);
}

function normalizeNewItemBadgeHours(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 1) return defaultSettings.newItemBadgeHours;
  return Math.floor(normalized);
}

function normalizeCategories(categories) {
  const source = Array.isArray(categories) ? categories : defaultSettings.categories;
  return [...new Set(source.map((category) => String(category || "").trim()).filter(Boolean))];
}

function normalizeUsers(users) {
  const source = Array.isArray(users) && users.length ? users : defaultSettings.users;
  const normalized = source
    .map((user) => ({
      username: String(user.username || "").trim(),
      password: String(user.password || "").trim(),
      name: String(user.name || user.username || "Staff Member").trim(),
      role: user.role === "admin" ? "admin" : "staff",
      discountLimit: Math.min(100, Math.max(0, Number(user.discountLimit) || 0))
    }))
    .filter((user) => user.username && user.password);
  return normalized.length ? normalized : defaultSettings.users;
}

function normalizePaymentMethods(paymentMethods) {
  const source = Array.isArray(paymentMethods) && paymentMethods.length
    ? paymentMethods
    : defaultSettings.paymentMethods;
  const normalized = source
    .map((method) => ({
      name: String(method.name || "").trim(),
      enabled: method.enabled !== false
    }))
    .filter((method) => method.name);
  return normalized.length ? normalized : defaultSettings.paymentMethods;
}

function normalizeThemeGradient(themeGradient) {
  const value = String(themeGradient || "").trim();
  return ["lotus", "emerald", "rose", "blue", "gold", "neutral"].includes(value) ? value : defaultSettings.themeGradient;
}

function normalizeNextOrderNumber(nextOrderNumber, invoices) {
  const invoiceNumbers = Array.isArray(invoices)
    ? invoices.map((invoice) => Number(invoice.orderNumber)).filter(Number.isFinite)
    : [];
  const next = Number(nextOrderNumber);
  const highestInvoiceNumber = invoiceNumbers.length ? Math.max(...invoiceNumbers) : 1000;
  const minimumNext = Math.max(1001, highestInvoiceNumber + 1);
  return Number.isFinite(next) && next >= minimumNext ? Math.floor(next) : minimumNext;
}

function normalizeInvoices(
  invoices,
  holdRetentionHours = defaultSettings.holdRetentionHours,
  holdRetentionEnabled = defaultSettings.holdRetentionEnabled
) {
  if (!Array.isArray(invoices)) return [];
  const completedCutoff = Date.now() - 24 * 60 * 60 * 1000;
  const holdCutoff = Date.now() - normalizeHoldRetentionHours(holdRetentionHours) * 60 * 60 * 1000;
  return invoices
    .map(normalizeInvoice)
    .filter((invoice) => {
      if (invoice.status === "hold") {
        if (holdRetentionEnabled === false) return true;
        const timestamp = Date.parse(invoice.savedAt || invoice.date || "");
        return Number.isNaN(timestamp) || timestamp >= holdCutoff;
      }
      const timestamp = Date.parse(invoice.completedAt || invoice.voidedAt || invoice.savedAt || invoice.date || "");
      return Number.isNaN(timestamp) || timestamp >= completedCutoff;
    });
}

function normalizeInvoice(invoice) {
  const source = invoice && typeof invoice === "object" ? invoice : {};
  const status = source.status === "hold" || source.status === "void" ? source.status : "complete";
  const items = Array.isArray(source.items)
    ? source.items.map((item) => ({
        id: String(item.id || "").trim(),
        name: String(item.name || "Unnamed Item").trim(),
        category: String(item.category || "").trim(),
        price: Number(item.price) || 0,
        taxable: item.taxable !== false,
        quantity: Number(item.quantity) || 1,
        unitPrice: String(item.unitPrice || ""),
        lineTotal: String(item.lineTotal || "")
      }))
    : [];

  return {
    businessName: String(source.businessName || defaultSettings.businessName).trim(),
    businessAddress: String(source.businessAddress || "").trim(),
    whatsappNumber: String(source.whatsappNumber || "").trim(),
    orderNumber: source.orderNumber,
    date: String(source.date || ""),
    cashier: String(source.cashier || "Unknown"),
    cashierUsername: String(source.cashierUsername || "unknown"),
    cashierRole: source.cashierRole === "admin" ? "admin" : "staff",
    paymentMethod: String(source.paymentMethod || "Unknown"),
    items,
    subtotal: String(source.subtotal || "$0.00"),
    taxableSubtotal: String(source.taxableSubtotal || "$0.00"),
    tax: String(source.tax || "$0.00"),
    total: String(source.total || "$0.00"),
    tendered: String(source.tendered || "$0.00"),
    change: String(source.change || "$0.00"),
    status,
    savedAt: source.savedAt || "",
    completedAt: source.completedAt || "",
    voidedAt: source.voidedAt || ""
  };
}

function normalizeVoids(voids) {
  return Array.isArray(voids) ? voids.filter((item) => item && typeof item === "object") : [];
}

function normalizeAuditLogs(auditLogs) {
  return Array.isArray(auditLogs)
    ? auditLogs
        .map((log, index) => ({
          id: String(log.id || `AUD-${Date.now()}-${index}`),
          createdAt: String(log.createdAt || new Date().toISOString()),
          actorName: String(log.actorName || "Unknown User").trim(),
          actorUsername: String(log.actorUsername || "unknown").trim(),
          actorRole: String(log.actorRole || "unknown").trim(),
          action: String(log.action || "Activity").trim(),
          details: String(log.details || "").trim()
        }))
        .filter((log) => log.action)
        .slice(0, 1000)
    : [];
}

function appendAuditLog(entry = {}) {
  const settings = readSettings();
  const nextLog = normalizeAuditLogs([
    {
      id: `AUD-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      createdAt: new Date().toISOString(),
      actorName: entry.actorName || entry.actor?.name || "Unknown User",
      actorUsername: entry.actorUsername || entry.actor?.username || "unknown",
      actorRole: entry.actorRole || entry.actor?.role || "unknown",
      action: entry.action || "Activity",
      details: entry.details || ""
    },
    ...(Array.isArray(settings.auditLogs) ? settings.auditLogs : [])
  ]);
  const saved = saveSettings({
    ...settings,
    auditLogs: nextLog
  });
  broadcastSettings(saved);
  return saved.auditLogs[0];
}

function extractAuditMeta(payload = {}) {
  const actor = payload.__auditActor && typeof payload.__auditActor === "object" ? payload.__auditActor : {};
  return {
    actorName: actor.name || payload.cashier || "Unknown User",
    actorUsername: actor.username || payload.cashierUsername || "unknown",
    actorRole: actor.role || payload.cashierRole || "unknown",
    action: payload.__auditAction || "Activity",
    details: payload.__auditDetails || ""
  };
}

function normalizePurchases(purchases) {
  return Array.isArray(purchases)
    ? purchases
        .map((purchase, index) => ({
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
        .filter(
          (purchase) =>
            purchase.company ||
            purchase.billNumber ||
            purchase.notes ||
            purchase.amount > 0 ||
            purchase.items.length
        )
    : [];
}

function normalizePurchaseItems(items) {
  return Array.isArray(items)
    ? items
        .map((item) => ({
          code: String(item.code || "").trim(),
          name: String(item.name || "").trim(),
          category: String(item.category || "General").trim(),
          quantity: Number(item.quantity) || 0,
          cost: Number(item.cost) || 0,
          price: Number(item.price) || 0,
          taxable: item.taxable !== false
        }))
        .filter((item) => item.code || item.name || item.quantity > 0)
    : [];
}

function normalizeProducts(
  products,
  newItemBadgeHours = defaultSettings.newItemBadgeHours,
  newItemBadgeTimerEnabled = defaultSettings.newItemBadgeTimerEnabled
) {
  if (!Array.isArray(products)) return defaultSettings.products;

  return products
    .map((product, index) => {
      const minorStatusActive = isMinorStatusActive(product, newItemBadgeHours, newItemBadgeTimerEnabled);
      return {
        id: String(product.id || `ITEM-${index + 1}`).trim(),
        name: String(product.name || "Unnamed Item").trim(),
        category: String(product.category || "General").trim(),
        price: Number(product.price) || 0,
        stock: Number(product.stock) || 0,
        taxable: product.taxable !== false,
        minorStatus: minorStatusActive ? "new" : "",
        minorStatusAt: minorStatusActive ? String(product.minorStatusAt || new Date().toISOString()) : ""
      };
    })
    .filter((product) => product.id && product.name);
}

function isMinorStatusActive(
  product,
  newItemBadgeHours = defaultSettings.newItemBadgeHours,
  newItemBadgeTimerEnabled = defaultSettings.newItemBadgeTimerEnabled
) {
  if (product?.minorStatus !== "new") return false;
  if (newItemBadgeTimerEnabled === false) return true;
  const timestamp = Date.parse(product.minorStatusAt || "");
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp <= normalizeNewItemBadgeHours(newItemBadgeHours) * 60 * 60 * 1000;
}

function createWindow() {
  const applicationName = applyApplicationName();
  const iconPath = path.join(__dirname, "build", "icon.png");
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: applicationName,
    icon: iconPath,
    autoHideMenuBar: true,
    backgroundColor: "#f5f3ee",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.maximize();
  mainWindow.loadFile("index.html");
}

function openSettingsWindow() {
  const windowSize = { width: 1180, height: 900, minWidth: 1040, minHeight: 820 };
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.setMinimumSize(windowSize.minWidth, windowSize.minHeight);
    settingsWindow.setSize(windowSize.width, windowSize.height);
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    minWidth: windowSize.minWidth,
    minHeight: windowSize.minHeight,
    parent: mainWindow,
    title: "POS Settings",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#f5f3ee",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile("settings.html");
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function openManagementWindow() {
  const windowSize = { width: 1280, height: 900, minWidth: 1040, minHeight: 820 };
  if (managementWindow && !managementWindow.isDestroyed()) {
    managementWindow.setMinimumSize(windowSize.minWidth, windowSize.minHeight);
    managementWindow.setSize(windowSize.width, windowSize.height);
    managementWindow.focus();
    return;
  }

  managementWindow = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    minWidth: windowSize.minWidth,
    minHeight: windowSize.minHeight,
    parent: mainWindow,
    title: "Inventory",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#f5f3ee",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  managementWindow.setMenuBarVisibility(false);
  managementWindow.loadFile("management.html");
  managementWindow.on("closed", () => {
    managementWindow = null;
  });
}

function openReportingWindow(mode = "all") {
  const isHeldMode = mode === "holds";
  const isEndOfDayMode = mode === "eod";
  const windowSize = isHeldMode
    ? { width: 1180, height: 900, minWidth: 1040, minHeight: 820 }
    : { width: 1180, height: 900, minWidth: 1040, minHeight: 820 };

  if (reportingWindow && !reportingWindow.isDestroyed()) {
    reportingWindow.setMinimumSize(windowSize.minWidth, windowSize.minHeight);
    reportingWindow.setSize(windowSize.width, windowSize.height);
    reportingWindow.loadFile("reporting.html", isHeldMode || isEndOfDayMode ? { query: { mode } } : undefined);
    reportingWindow.focus();
    return;
  }

  reportingWindow = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    minWidth: windowSize.minWidth,
    minHeight: windowSize.minHeight,
    parent: mainWindow,
    title: isHeldMode ? "Held Receipts" : isEndOfDayMode ? "End-of-Day Report" : "Reporting",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#f5f3ee",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  reportingWindow.setMenuBarVisibility(false);
  reportingWindow.loadFile("reporting.html", isHeldMode || isEndOfDayMode ? { query: { mode } } : undefined);
  reportingWindow.on("closed", () => {
    reportingWindow = null;
  });
}

function openAuditWindow() {
  const windowSize = { width: 1180, height: 900, minWidth: 1040, minHeight: 820 };
  if (auditWindow && !auditWindow.isDestroyed()) {
    auditWindow.setMinimumSize(windowSize.minWidth, windowSize.minHeight);
    auditWindow.setSize(windowSize.width, windowSize.height);
    auditWindow.focus();
    return;
  }

  auditWindow = new BrowserWindow({
    width: windowSize.width,
    height: windowSize.height,
    minWidth: windowSize.minWidth,
    minHeight: windowSize.minHeight,
    parent: settingsWindow || mainWindow,
    title: "Audit Log",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    backgroundColor: "#f5f3ee",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  auditWindow.setMenuBarVisibility(false);
  auditWindow.loadFile("audit.html");
  auditWindow.on("closed", () => {
    auditWindow = null;
  });
}

if (hasSingleInstanceLock) {
  app.whenReady().then(() => {
    ensureDatabaseSetup();
    createWindow();
    updateWindowsShortcuts();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("settings:open", () => {
  openSettingsWindow();
});

ipcMain.handle("management:open", () => {
  openManagementWindow();
});

ipcMain.handle("inventory:template", async () => {
  const settings = readSettings();
  const templateDir = path.join(app.getPath("documents"), "Inventory Import Templates");
  fs.mkdirSync(templateDir, { recursive: true });
  const templatePath = path.join(templateDir, `Inventory-Import-Template-${formatFileDateTime(new Date())}.xlsx`);
  fs.writeFileSync(templatePath, buildInventoryTemplateXlsx(settings));
  await revealFileInExplorer(templatePath);
  appendAuditLog({
    action: "Created inventory import template",
    details: `Inventory import template created. ${templatePath}`
  });
  return { success: true, templatePath };
});

ipcMain.handle("inventory:import", async (_event, actor) => {
  const result = await dialog.showOpenDialog(managementWindow || mainWindow, {
    title: "Import Inventory Items",
    properties: ["openFile"],
    filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }]
  });
  if (result.canceled || !result.filePaths?.[0]) return { cancelled: true };

  const settings = readSettings();
  try {
    const importResult = await importInventoryWorkbook(result.filePaths[0], settings);
    const auditActor = actor && typeof actor === "object" ? actor : {};
    const saved = saveSettings({
      ...settings,
      categories: importResult.categories,
      products: importResult.products
    });
    appendAuditLog({
      actorName: auditActor.name,
      actorUsername: auditActor.username,
      actorRole: auditActor.role,
      action: "Imported inventory items",
      details: `Imported ${importResult.created} new item(s), updated ${importResult.updated} item(s) from ${path.basename(result.filePaths[0])}.`
    });
    broadcastSettings(saved);
    return {
      success: true,
      created: importResult.created,
      updated: importResult.updated,
      settings: saved
    };
  } catch (error) {
    return { success: false, error: error.message || "Unable to import inventory." };
  }
});

ipcMain.handle("reporting:open", (_event, mode) => {
  openReportingWindow(mode === "holds" || mode === "eod" ? mode : "all");
});

ipcMain.handle("reporting:close", () => {
  if (reportingWindow && !reportingWindow.isDestroyed()) reportingWindow.close();
  return { success: true };
});

ipcMain.handle("audit:open", () => {
  openAuditWindow();
});

ipcMain.handle("settings:startup", () => readStartupSettings());

ipcMain.handle("settings:get", () => readSettings());

ipcMain.handle("settings:save", (_event, settings) => {
  const auditMeta = extractAuditMeta(settings);
  const settingsPayload = { ...settings };
  delete settingsPayload.__auditActor;
  delete settingsPayload.__auditAction;
  delete settingsPayload.__auditDetails;
  const saved = saveSettings(settingsPayload);
  broadcastSettings(saved);
  appendAuditLog({
    ...auditMeta,
    action: auditMeta.action === "Activity" ? "Saved settings" : auditMeta.action
  });
  return saved;
});

ipcMain.handle("audit:log", (_event, entry) => appendAuditLog(entry));

ipcMain.handle("invoice:save", (_event, invoice) => {
  const settings = readSettings();
  const nextInvoice = {
    ...invoice,
    status: invoice.status || "hold",
    savedAt: invoice.savedAt || new Date().toISOString()
  };
  if (shouldUseHostDatabase(settings)) {
    posDatabase.saveInvoiceRecord(normalizeInvoice(nextInvoice));
    appendAuditLog({
      actorName: nextInvoice.cashier,
      actorUsername: nextInvoice.cashierUsername,
      actorRole: nextInvoice.cashierRole,
      action: "Created receipt",
      details: `Receipt #${nextInvoice.orderNumber} saved as ${nextInvoice.status}. Total ${nextInvoice.total}.`
    });
    const saved = readSettings();
    broadcastSettings(saved);
    return saved;
  }
  const otherInvoices = settings.invoices.filter(
    (item) => String(item.orderNumber) !== String(nextInvoice.orderNumber)
  );
  const saved = saveSettings({
    ...settings,
    invoices: [nextInvoice, ...otherInvoices]
  });
  appendAuditLog({
    actorName: nextInvoice.cashier,
    actorUsername: nextInvoice.cashierUsername,
    actorRole: nextInvoice.cashierRole,
    action: "Created receipt",
    details: `Receipt #${nextInvoice.orderNumber} saved as ${nextInvoice.status}. Total ${nextInvoice.total}.`
  });
  broadcastSettings(saved);
  return saved;
});

ipcMain.handle("order:number:next", () => {
  const settings = readRawSettings();
  if (shouldUseHostDatabase(settings)) {
    return posDatabase.reserveOrderNumber(settings.nextOrderNumber);
  }
  const orderNumber = normalizeNextOrderNumber(settings.nextOrderNumber, settings.invoices);
  writeRawSettings({
    ...settings,
    nextOrderNumber: orderNumber + 1
  });
  return orderNumber;
});

ipcMain.handle("invoice:update-status", (_event, orderNumber, status, actor) => {
  const settings = readSettings();
  const invoice = settings.invoices.find((item) => String(item.orderNumber) === String(orderNumber)) || {};
  const auditActor = actor && typeof actor === "object" ? actor : {};
  if (String(activeRestoredOrderNumber) === String(orderNumber)) {
    activeRestoredOrderNumber = null;
  }
  if (shouldUseHostDatabase(settings)) {
    posDatabase.updateInvoiceStatus(orderNumber, status);
    appendAuditLog({
      actorName: auditActor.name || invoice.cashier,
      actorUsername: auditActor.username || invoice.cashierUsername,
      actorRole: auditActor.role || invoice.cashierRole,
      action: "Updated receipt status",
      details: `Receipt #${orderNumber} marked ${status}.`
    });
    const saved = readSettings();
    broadcastSettings(saved);
    return saved;
  }
  const saved = saveSettings({
    ...settings,
    invoices: settings.invoices.map((invoice) =>
      String(invoice.orderNumber) === String(orderNumber)
        ? {
            ...invoice,
            status,
            completedAt: status === "complete" ? new Date().toISOString() : invoice.completedAt,
            savedAt: status === "hold" ? new Date().toISOString() : invoice.savedAt,
            voidedAt: status === "void" ? new Date().toISOString() : invoice.voidedAt
          }
        : invoice
    )
  });
  appendAuditLog({
    actorName: auditActor.name || invoice.cashier,
    actorUsername: auditActor.username || invoice.cashierUsername,
    actorRole: auditActor.role || invoice.cashierRole,
    action: "Updated receipt status",
    details: `Receipt #${orderNumber} marked ${status}.`
  });
  broadcastSettings(saved);
  return saved;
});

ipcMain.handle("void:save", (_event, voidPayload) => {
  const settings = readSettings();
  const nextVoid = {
    ...voidPayload,
    status: "void",
    voidedAt: voidPayload.voidedAt || new Date().toISOString()
  };
  if (shouldUseHostDatabase(settings)) {
    posDatabase.saveVoidRecord(nextVoid);
    if (nextVoid.orderNumber) posDatabase.updateInvoiceStatus(nextVoid.orderNumber, "void");
    appendAuditLog({
      actorName: nextVoid.cashier,
      actorUsername: nextVoid.cashierUsername,
      actorRole: nextVoid.cashierRole,
      action: "Voided sale",
      details: `Receipt #${nextVoid.orderNumber || "unknown"} voided. Total ${nextVoid.total || "$0.00"}.`
    });
    const saved = readSettings();
    broadcastSettings(saved);
    return saved;
  }
  const saved = saveSettings({
    ...settings,
    voids: [nextVoid, ...(Array.isArray(settings.voids) ? settings.voids : [])]
  });
  appendAuditLog({
    actorName: nextVoid.cashier,
    actorUsername: nextVoid.cashierUsername,
    actorRole: nextVoid.cashierRole,
    action: "Voided sale",
    details: `Receipt #${nextVoid.orderNumber || "unknown"} voided. Total ${nextVoid.total || "$0.00"}.`
  });
  broadcastSettings(saved);
  return saved;
});

ipcMain.handle("invoice:delete", (_event, orderNumber, actor) => {
  const settings = readSettings();
  const invoice = settings.invoices.find((item) => String(item.orderNumber) === String(orderNumber)) || {};
  const auditActor = actor && typeof actor === "object" ? actor : {};
  if (shouldUseHostDatabase(settings)) {
    posDatabase.deleteInvoice(orderNumber);
    appendAuditLog({
      actorName: auditActor.name || invoice.cashier,
      actorUsername: auditActor.username || invoice.cashierUsername,
      actorRole: auditActor.role || invoice.cashierRole,
      action: "Deleted held receipt",
      details: `Held receipt #${orderNumber} deleted.`
    });
    const saved = readSettings();
    broadcastSettings(saved);
    return saved;
  }
  const saved = saveSettings({
    ...settings,
    invoices: settings.invoices.filter((invoice) => String(invoice.orderNumber) !== String(orderNumber))
  });
  appendAuditLog({
    actorName: auditActor.name || invoice.cashier,
    actorUsername: auditActor.username || invoice.cashierUsername,
    actorRole: auditActor.role || invoice.cashierRole,
    action: "Deleted held receipt",
    details: `Held receipt #${orderNumber} deleted.`
  });
  broadcastSettings(saved);
  return saved;
});

ipcMain.handle("invoice:restore", (_event, orderNumber, actor) => {
  if (activeRestoredOrderNumber) {
    return {
      ok: false,
      reason: "restore-active",
      message: `Bill #${activeRestoredOrderNumber} is already restored in Current Sale. Complete or hold it before restoring another bill.`
    };
  }
  const settings = readSettings();
  const auditActor = actor && typeof actor === "object" ? actor : {};
  const invoice = shouldUseHostDatabase(settings)
    ? posDatabase.getInvoice(orderNumber)
    : settings.invoices.find((item) => String(item.orderNumber) === String(orderNumber));
  if (!invoice) {
    return {
      ok: false,
      reason: "not-found",
      message: "This held bill could not be found."
    };
  }
  activeRestoredOrderNumber = invoice.orderNumber;
  appendAuditLog({
    actorName: auditActor.name || invoice.cashier,
    actorUsername: auditActor.username || invoice.cashierUsername,
    actorRole: auditActor.role || invoice.cashierRole,
    action: "Restored held receipt",
    details: `Held receipt #${invoice.orderNumber} restored to Current Sale.`
  });
  if (reportingWindow && !reportingWindow.isDestroyed()) {
    reportingWindow.close();
  }
  if (invoice && mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send("invoice:restore", invoice);
  }
  if (shouldUseHostDatabase(settings)) {
    posDatabase.deleteInvoice(orderNumber);
    const saved = readSettings();
    broadcastSettings(saved);
    return { ok: true, settings: saved };
  }
  const saved = saveSettings({
    ...settings,
    invoices: settings.invoices.filter((item) => String(item.orderNumber) !== String(orderNumber))
  });
  broadcastSettings(saved);
  return { ok: true, settings: saved };
});

function broadcastSettings(settings) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("settings:updated", settings);
  }
  if (reportingWindow && !reportingWindow.isDestroyed()) {
    reportingWindow.webContents.send("settings:updated", settings);
  }
  if (auditWindow && !auditWindow.isDestroyed()) {
    auditWindow.webContents.send("settings:updated", settings);
  }
}

ipcMain.handle("printers:list", async (event) => {
  return event.sender.getPrintersAsync();
});

ipcMain.handle("receipt:print", async (_event, payload) => {
  const settings = readSettings();
  const receiptWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const html = buildReceiptHtml({ ...settings, ...payload });
  await receiptWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  const pageSize = getPageSize(payload.paperSize || settings.paperSize);
  const options = {
    silent: Boolean(payload.silent ?? settings.silent),
    printBackground: true,
    margins: { marginType: "none" },
    deviceName: payload.printerName || settings.printerName || undefined,
    pageSize
  };

  return new Promise((resolve) => {
    receiptWindow.webContents.print(options, (success, failureReason) => {
      receiptWindow.close();
      appendAuditLog({
        actorName: payload.cashier,
        actorUsername: payload.cashierUsername,
        actorRole: payload.cashierRole,
        action: success ? "Printed receipt" : "Receipt print failed",
        details: `Receipt #${payload.orderNumber || "unknown"} ${success ? "printed" : failureReason || "failed to print"}.`
      });
      resolve({ success, error: success ? "" : failureReason || "Printing failed" });
    });
  });
});

ipcMain.handle("receipt:share-whatsapp", async (_event, payload) => {
  const settings = readSettings();
  const message = buildWhatsappReceipt({ ...settings, ...payload });
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`;

  await shell.openExternal(url);
  appendAuditLog({
    actorName: payload.cashier,
    actorUsername: payload.cashierUsername,
    actorRole: payload.cashierRole,
    action: "Shared receipt by WhatsApp",
    details: `Receipt #${payload.orderNumber || "unknown"} shared.`
  });
  return { success: true };
});

ipcMain.handle("report:end-of-day-whatsapp", async (_event, payload) => {
  const settings = readSettings();
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  const cashierName = payload.actorName || payload.actorUsername || "Cashier";
  const reportsDir = path.join(app.getPath("documents"), "End of Day Report");
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, `${sanitizeFileName(cashierName)}-${formatFileDateTime(new Date())}.pdf`);
  await saveEndOfDayReportPdf(reportPath, {
    businessName: payload.businessName || settings.businessName || defaultSettings.businessName,
    businessAddress: payload.businessAddress || settings.businessAddress || "",
    cashierName,
    lines
  });
  await revealFileInExplorer(reportPath);
  const sharedFile = await openWindowsShareForFile(reportPath);
  if (!sharedFile) {
    const configuredNumber = (settings.whatsappNumber || "").replace(/\D/g, "");
    const message = buildEndOfDayPdfFallbackMessage(reportPath);
    const url = configuredNumber
      ? `https://wa.me/${configuredNumber}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    await shell.openExternal(url);
  }
  appendAuditLog({
    actorName: payload.actorName,
    actorUsername: payload.actorUsername,
    actorRole: payload.actorRole,
    action: "Saved and shared end-of-day report",
    details: `End-of-day report saved locally and ${sharedFile ? "opened in Windows file sharing" : "opened in WhatsApp contact picker"}. ${reportPath}`
  });
  return { success: true, reportPath, sharedFile };
});

ipcMain.handle("path:open", async (_event, targetPath) => {
  if (!targetPath) return { success: false };
  return revealFileInExplorer(targetPath);
});

function buildEndOfDayPdfFallbackMessage(reportPath) {
  const fileName = path.basename(reportPath || "End-of-Day POS Report.pdf");
  return [
    "End-of-Day POS Report PDF saved.",
    `File: ${fileName}`,
    "Drag and drop this PDF from the opened folder into the WhatsApp destination before sending."
  ].join("\n");
}

async function revealFileInExplorer(targetPath) {
  if (!targetPath) return { success: false };
  try {
    shell.showItemInFolder(targetPath);
    if (process.platform === "win32") {
      setTimeout(() => shell.openPath(path.dirname(targetPath)).catch(() => {}), 500);
    }
    return { success: true };
  } catch (error) {
    try {
      const fallbackPath = fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()
        ? targetPath
        : path.dirname(targetPath);
      await shell.openPath(fallbackPath);
      return { success: true };
    } catch (fallbackError) {
      console.error("Could not open saved report location.", error, fallbackError);
      return { success: false, error: fallbackError.message || error.message || "Could not open path" };
    }
  }
}

function openWindowsShareForFile(filePath) {
  if (process.platform !== "win32" || !filePath) return Promise.resolve(false);
  const psPath = `'${String(filePath).replace(/'/g, "''")}'`;
  const script = `
$path = ${psPath}
if (-not (Test-Path -LiteralPath $path)) { exit 1 }
$shell = New-Object -ComObject Shell.Application
$folderPath = Split-Path -LiteralPath $path -Parent
$fileName = Split-Path -LiteralPath $path -Leaf
$folder = $shell.Namespace($folderPath)
if ($null -eq $folder) { exit 2 }
$item = $folder.ParseName($fileName)
if ($null -eq $item) { exit 3 }
$verbs = @($item.Verbs())
$shareVerb = $verbs | Where-Object {
  ($_.Name -replace '&','').Trim() -match '^(Share|Share\.\.\.)$'
} | Select-Object -First 1
if ($null -ne $shareVerb) {
  $shareVerb.DoIt()
  exit 0
}
$item.InvokeVerb('Windows.Share')
`;
  return new Promise((resolve) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { windowsHide: true, timeout: 8000 },
      (error) => {
        if (error) {
          console.error("Windows file share failed.", error);
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}

async function importInventoryWorkbook(workbookPath, settings) {
  const categories = normalizeCategories(settings.categories);
  if (!categories.length) {
    throw new Error("Create at least one category in Inventory before importing items.");
  }

  const tempDir = fs.mkdtempSync(path.join(app.getPath("temp"), "simple-pos-inventory-import-"));
  try {
    await extractZip(workbookPath, { dir: tempDir });
    const rows = readInventoryWorkbookRows(tempDir);
    if (rows.length < 2) throw new Error("The selected workbook does not contain item rows.");

    const headers = rows[0].map(normalizeHeaderName);
    const headerIndexes = {
      name: headers.findIndex((header) => header === "name" || header === "item"),
      category: headers.findIndex((header) => header === "category" || header === "catagory"),
      price: headers.findIndex((header) => header === "price" || header === "sellprice" || header === "sellingprice"),
      stock: headers.findIndex((header) => header === "stock" || header === "quantity" || header === "qty"),
      taxable: headers.findIndex((header) => header === "taxable" || header === "tax")
    };

    if (headerIndexes.name < 0 || headerIndexes.category < 0) {
      throw new Error("Template must include Name and Category columns.");
    }

    const products = normalizeProducts(settings.products, settings.newItemBadgeHours, settings.newItemBadgeTimerEnabled);
    let created = 0;
    let updated = 0;
    const importedAt = new Date().toISOString();

    rows.slice(1).forEach((row, rowIndex) => {
      const name = String(row[headerIndexes.name] || "").trim();
      if (!name) return;
      const category = String(row[headerIndexes.category] || "").trim();
      if (!categories.includes(category)) {
        throw new Error(`Row ${rowIndex + 2} uses category "${category || "(blank)"}". Select a category from the template dropdown.`);
      }

      const price = parseImportNumber(row[headerIndexes.price]);
      const stock = parseImportNumber(row[headerIndexes.stock]);
      const taxable = parseImportBoolean(row[headerIndexes.taxable], true);
      const existingProduct = products.find((product) =>
        product.name.trim().toLowerCase() === name.toLowerCase() &&
        product.category.trim().toLowerCase() === category.toLowerCase()
      );

      if (existingProduct) {
        existingProduct.price = price;
        existingProduct.stock = stock;
        existingProduct.taxable = taxable;
        updated += 1;
        return;
      }

      products.push({
        id: generateInventoryItemCode(category, products),
        name,
        category,
        price,
        stock,
        taxable,
        minorStatus: "new",
        minorStatusAt: importedAt
      });
      created += 1;
    });

    if (created + updated === 0) throw new Error("No item rows were found to import.");
    return { categories, products, created, updated };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function readInventoryWorkbookRows(extractedWorkbookDir) {
  const sheetPath = path.join(extractedWorkbookDir, "xl", "worksheets", "sheet1.xml");
  if (!fs.existsSync(sheetPath)) throw new Error("The selected workbook is missing the first worksheet.");
  const sharedStrings = readSharedStrings(extractedWorkbookDir);
  const xml = fs.readFileSync(sheetPath, "utf8");
  const rows = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(xml))) {
    const values = [];
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    let cellMatch;
    while ((cellMatch = cellPattern.exec(rowMatch[1]))) {
      const ref = getXmlAttribute(cellMatch[1], "r") || "";
      const columnIndex = getColumnIndexFromRef(ref);
      values[columnIndex] = readCellValue(cellMatch[1], cellMatch[2], sharedStrings);
    }
    rows.push(values.map((value) => value ?? ""));
  }
  return rows;
}

function readSharedStrings(extractedWorkbookDir) {
  const stringsPath = path.join(extractedWorkbookDir, "xl", "sharedStrings.xml");
  if (!fs.existsSync(stringsPath)) return [];
  const xml = fs.readFileSync(stringsPath, "utf8");
  const strings = [];
  const itemPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let itemMatch;
  while ((itemMatch = itemPattern.exec(xml))) {
    const textParts = [];
    const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    let textMatch;
    while ((textMatch = textPattern.exec(itemMatch[1]))) {
      textParts.push(unescapeXml(textMatch[1]));
    }
    strings.push(textParts.join(""));
  }
  return strings;
}

function readCellValue(attributes, cellXml, sharedStrings) {
  const type = getXmlAttribute(attributes, "t");
  if (type === "s") {
    const index = Number((cellXml.match(/<v>([\s\S]*?)<\/v>/) || [])[1]);
    return sharedStrings[index] || "";
  }
  if (type === "inlineStr") {
    return [...cellXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
      .map((match) => unescapeXml(match[1]))
      .join("");
  }
  return unescapeXml((cellXml.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || "");
}

function getXmlAttribute(attributes, name) {
  return (attributes.match(new RegExp(`${name}="([^"]*)"`)) || [])[1] || "";
}

function getColumnIndexFromRef(ref) {
  const letters = String(ref || "").match(/[A-Z]+/i)?.[0] || "A";
  return letters.toUpperCase().split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function normalizeHeaderName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseImportNumber(value) {
  const number = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function parseImportBoolean(value, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  return ["true", "yes", "y", "1", "tax", "taxable"].includes(normalized);
}

function generateInventoryItemCode(category, products) {
  const prefix = category
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

function unescapeXml(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function buildInventoryTemplateXlsx(settings) {
  const categories = normalizeCategories(settings.categories);
  const rows = [
    ["Name", "Category", "Price", "Stock", "Taxable"]
  ];
  const categoryRows = [["Category"], ...categories.map((category) => [category])];
  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    "docProps/core.xml": `<?xml version="1.0" encoding="UTF-8"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Inventory Import Template</dc:title>
  <dc:creator>Simple POS</dc:creator>
  <cp:lastModifiedBy>Simple POS</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified>
</cp:coreProperties>`,
    "docProps/app.xml": `<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Simple POS</Application>
</Properties>`,
    "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Inventory Import" sheetId="1" r:id="rId1"/>
    <sheet name="Categories" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`,
    "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`,
    "xl/worksheets/sheet1.xml": buildInventoryImportWorksheetXml(rows, categories.length),
    "xl/worksheets/sheet2.xml": buildWorksheetXml(categoryRows)
  };
  return createZip(files);
}

function buildInventoryImportWorksheetXml(rows, categoryCount) {
  const categoryEndRow = Math.max(2, categoryCount + 1);
  const validationXml = categoryCount > 0
    ? `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" sqref="B2:B1000"><formula1>Categories!$A$2:$A$${categoryEndRow}</formula1></dataValidation></dataValidations>`
    : "";
  return buildWorksheetXml(rows, validationXml);
}

function buildWorksheetXml(rows, extraXml = "") {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) => buildCellXml(columnIndex, rowIndex + 1, value))
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>
    <col min="1" max="1" width="18" customWidth="1"/>
    <col min="2" max="2" width="28" customWidth="1"/>
    <col min="3" max="3" width="20" customWidth="1"/>
    <col min="4" max="8" width="14" customWidth="1"/>
  </cols>
  <sheetData>${sheetRows}</sheetData>
  ${extraXml}
</worksheet>`;
}

function buildCellXml(columnIndex, rowNumber, value) {
  const ref = `${getColumnName(columnIndex)}${rowNumber}`;
  if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
}

function getColumnName(index) {
  let column = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    current = Math.floor((current - 1) / 26);
  }
  return column;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  Object.entries(files).forEach(([name, content]) => {
    const nameBuffer = Buffer.from(name);
    const dataBuffer = Buffer.from(content, "utf8");
    const crc = crc32(dataBuffer);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(dataBuffer.length, 18);
    localHeader.writeUInt32LE(dataBuffer.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, dataBuffer);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(dataBuffer.length, 20);
    centralHeader.writeUInt32LE(dataBuffer.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);
    offset += localHeader.length + nameBuffer.length + dataBuffer.length;
  });
  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(Object.keys(files).length, 8);
  endRecord.writeUInt16LE(Object.keys(files).length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let index = 0; index < 8; index += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function saveEndOfDayReportPdf(reportPath, report) {
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const html = buildEndOfDayReportHtml(report);
  await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  const pdf = await pdfWindow.webContents.printToPDF({
    printBackground: true,
    margins: { marginType: "default" },
    pageSize: "Letter"
  });
  pdfWindow.close();
  fs.writeFileSync(reportPath, pdf);
}

function buildEndOfDayReportHtml(report) {
  const rows = report.lines
    .map((line) => {
      const [label, ...rest] = String(line).split(":");
      return `
        <div class="row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(rest.join(":").trim())}</strong>
        </div>
      `;
    })
    .join("");
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { margin: 0; font-family: Arial, sans-serif; color: #111; background: #fff; }
          main { padding: 36px; }
          h1 { margin: 0 0 6px; font-size: 26px; }
          .meta { margin: 0 0 24px; color: #555; font-size: 13px; line-height: 1.5; }
          .row { display: flex; justify-content: space-between; gap: 20px; padding: 10px 0; border-bottom: 1px solid #ddd; font-size: 13px; }
          .row span { color: #555; }
          .row strong { text-align: right; }
        </style>
      </head>
      <body>
        <main>
          <h1>${escapeHtml(report.businessName)}</h1>
          <p class="meta">${escapeHtml(report.businessAddress)}${report.businessAddress ? "<br>" : ""}End-of-Day POS Report<br>Cashier: ${escapeHtml(report.cashierName)}</p>
          ${rows}
        </main>
      </body>
    </html>
  `;
}

function sanitizeFileName(value) {
  return String(value || "Cashier").replace(/[<>:"/\\|?*]+/g, "").replace(/\s+/g, "-").slice(0, 80) || "Cashier";
}

function formatFileDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function getPageSize(paperSize) {
  if (paperSize === "letter") return "Letter";
  if (paperSize === "receipt-58") return { width: 58000, height: 200000 };
  return { width: 80000, height: 200000 };
}

function parseMoney(value) {
  return Number(String(value || "0").replace(/[^0-9.-]+/g, "")) || 0;
}

function buildReceiptHtml(payload) {
  const paperSize = payload.paperSize || "letter";
  const width = paperSize === "letter" ? "7.5in" : paperSize === "receipt-58" ? "54mm" : "72mm";
  const logo = payload.businessLogo
    ? `<img class="logo" src="${escapeHtml(payload.businessLogo)}" alt="">`
    : "";
  const rows = payload.items
    .map(
      (item) => `
        <div class="row">
          <span>${escapeHtml(item.quantity)} x ${escapeHtml(item.name)}</span>
          <strong>${escapeHtml(item.lineTotal)}</strong>
        </div>
      `
    )
    .join("");
  const receiptMeta = [
    `Address: ${payload.businessAddress || "Business address"}`,
    `Contact: ${payload.whatsappNumber || "Contact #"}`,
    `Receipt #${payload.orderNumber}`,
    `Date: ${payload.date}`,
    `Cashier: ${payload.cashier}`
  ].map(escapeHtml).join("<br>");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: ${paperSize === "letter" ? "letter" : "auto"}; margin: 0; }
          body { margin: 0; font-family: Arial, sans-serif; color: #111; }
          .receipt { width: ${width}; padding: 12px; }
          .logo { max-width: 120px; max-height: 70px; display: block; margin: 0 0 8px; }
          h1 { margin: 0 0 4px; font-size: 20px; }
          p { margin: 0 0 12px; font-size: 12px; }
          .row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px dashed #ccc; font-size: 12px; }
          .total { font-size: 16px; font-weight: 700; border-bottom: 0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <main class="receipt">
          ${logo}
          <h1>${escapeHtml(payload.businessName || defaultSettings.businessName)}</h1>
          <p>${receiptMeta}</p>
          ${rows}
          <div class="row"><span>Subtotal</span><strong>${escapeHtml(payload.subtotal)}</strong></div>
          <div class="row"><span>Tax</span><strong>${escapeHtml(payload.tax)}</strong></div>
          ${parseMoney(payload.discount) > 0 ? `<div class="row"><span>Discount ${payload.discountPercent ? `(${escapeHtml(payload.discountPercent)})` : ""}</span><strong>-${escapeHtml(payload.discount)}</strong></div>` : ""}
          <div class="row total"><span>Total</span><strong>${escapeHtml(payload.total)}</strong></div>
          <div class="row"><span>Payment</span><strong>${escapeHtml(payload.paymentMethod)}</strong></div>
          <div class="row"><span>Tendered</span><strong>${escapeHtml(payload.tendered)}</strong></div>
          <div class="row"><span>Change</span><strong>${escapeHtml(payload.change)}</strong></div>
        </main>
      </body>
    </html>
  `;
}

function buildWhatsappReceipt(payload) {
  const items = payload.items
    .map((item) => `${item.quantity} x ${item.name} - ${item.lineTotal}`)
    .join("\n");
  const businessHeader = [
    payload.businessName || defaultSettings.businessName,
    `Address: ${payload.businessAddress || "Business address"}`,
    `Contact: ${payload.whatsappNumber || "Contact #"}`,
    `Receipt #${payload.orderNumber}`,
    `Date: ${payload.date}`
  ].filter(Boolean);

  return [
    ...businessHeader,
    "",
    items,
    "",
    `Subtotal: ${payload.subtotal}`,
    `Tax: ${payload.tax}`,
    ...(parseMoney(payload.discount) > 0 ? [`Discount${payload.discountPercent ? ` (${payload.discountPercent})` : ""}: -${payload.discount}`] : []),
    `Total: ${payload.total}`,
    `Payment: ${payload.paymentMethod}`,
    `Tendered: ${payload.tendered}`,
    `Change: ${payload.change}`,
    "",
    "Thank you for shopping with us."
  ].join("\n");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
