const path = require("path");

let db;
let lastError = "";

function openDatabase(userDataPath) {
  if (!db) {
    try {
      const Database = require("better-sqlite3");
      db = new Database(path.join(userDataPath, "pos-data.sqlite"));
      db.pragma("journal_mode = WAL");
      db.pragma("foreign_keys = ON");
      createSchema();
      lastError = "";
    } catch (error) {
      db = null;
      lastError = error && error.message ? error.message : String(error);
      throw error;
    }
  }
  return db;
}

function isReady() {
  return Boolean(db);
}

function getLastError() {
  return lastError;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      stock REAL NOT NULL DEFAULT 0,
      taxable INTEGER NOT NULL DEFAULT 1,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL DEFAULT '',
      bill_number TEXT NOT NULL DEFAULT '',
      bill_date TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      paid INTEGER NOT NULL DEFAULT 0,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      order_number TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'hold',
      receipt_date TEXT NOT NULL DEFAULT '',
      saved_at TEXT NOT NULL DEFAULT '',
      completed_at TEXT NOT NULL DEFAULT '',
      voided_at TEXT NOT NULL DEFAULT '',
      total TEXT NOT NULL DEFAULT '$0.00',
      cashier TEXT NOT NULL DEFAULT '',
      payment_method TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS voids (
      id TEXT PRIMARY KEY,
      voided_at TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT '',
      action TEXT NOT NULL DEFAULT '',
      actor_username TEXT NOT NULL DEFAULT '',
      payload_json TEXT NOT NULL
    );
  `);
}

function initializeHostDatabase(userDataPath, seedSettings) {
  openDatabase(userDataPath);
  const initialized = getMeta("initialized") === "true";
  if (!initialized) {
    saveSettings(seedSettings);
    setMeta("initialized", "true");
    return;
  }
  if (!getMeta("settings_json")) saveScalarSettings(seedSettings);
}

function getMeta(key) {
  return db.prepare("SELECT value FROM app_meta WHERE key = ?").get(key)?.value || "";
}

function setMeta(key, value) {
  db.prepare(`
    INSERT INTO app_meta (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

function readCollections() {
  if (!db) return {};
  return {
    categories: db.prepare("SELECT name FROM categories ORDER BY name").all().map((row) => row.name),
    products: db.prepare("SELECT payload_json FROM inventory_items ORDER BY name").all().map(parsePayload),
    purchases: db.prepare("SELECT payload_json FROM purchases ORDER BY bill_date DESC, id DESC").all().map(parsePayload),
    invoices: db.prepare("SELECT payload_json FROM invoices ORDER BY COALESCE(NULLIF(voided_at, ''), NULLIF(completed_at, ''), NULLIF(saved_at, ''), NULLIF(receipt_date, ''), '') DESC").all().map(parsePayload),
    voids: db.prepare("SELECT payload_json FROM voids ORDER BY voided_at DESC").all().map(parsePayload),
    auditLogs: db.prepare("SELECT payload_json FROM audit_logs ORDER BY created_at DESC LIMIT 1000").all().map(parsePayload),
    nextOrderNumber: Number(getMeta("nextOrderNumber")) || undefined
  };
}

function readSettings() {
  if (!db) return {};
  const settings = parseJson(getMeta("settings_json"), {});
  return {
    ...settings,
    ...readCollections()
  };
}

function saveSettings(settings) {
  if (!db) return;
  saveScalarSettings(settings);
  saveCollections(settings);
}

function saveScalarSettings(settings) {
  if (!db) return;
  const scalarSettings = { ...settings };
  delete scalarSettings.categories;
  delete scalarSettings.products;
  delete scalarSettings.purchases;
  delete scalarSettings.invoices;
  delete scalarSettings.voids;
  delete scalarSettings.auditLogs;
  setMeta("settings_json", JSON.stringify(scalarSettings));
}

function saveCollections(settings) {
  if (!db) return;
  const write = db.transaction(() => {
    db.prepare("DELETE FROM categories").run();
    db.prepare("DELETE FROM inventory_items").run();
    db.prepare("DELETE FROM purchases").run();
    db.prepare("DELETE FROM invoices").run();
    db.prepare("DELETE FROM voids").run();
    db.prepare("DELETE FROM audit_logs").run();

    (settings.categories || []).forEach(saveCategory);
    (settings.products || []).forEach(saveProduct);
    (settings.purchases || []).forEach(savePurchase);
    (settings.invoices || []).forEach(saveInvoiceRecord);
    (settings.voids || []).forEach(saveVoidRecord);
    (settings.auditLogs || []).forEach(saveAuditLog);
    if (settings.nextOrderNumber) setMeta("nextOrderNumber", settings.nextOrderNumber);
  });
  write();
}

function saveCategory(category) {
  if (!db) return;
  const name = String(category || "").trim();
  if (!name) return;
  db.prepare("INSERT OR IGNORE INTO categories (name) VALUES (?)").run(name);
}

function saveProduct(product) {
  if (!db || !product || !product.id) return;
  db.prepare(`
    INSERT INTO inventory_items (id, name, category, price, stock, taxable, payload_json)
    VALUES (@id, @name, @category, @price, @stock, @taxable, @payload_json)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      price = excluded.price,
      stock = excluded.stock,
      taxable = excluded.taxable,
      payload_json = excluded.payload_json
  `).run({
    id: String(product.id),
    name: String(product.name || "Unnamed Item"),
    category: String(product.category || "General"),
    price: Number(product.price) || 0,
    stock: Number(product.stock) || 0,
    taxable: product.taxable === false ? 0 : 1,
    payload_json: JSON.stringify(product)
  });
}

function savePurchase(purchase) {
  if (!db || !purchase || !purchase.id) return;
  db.prepare(`
    INSERT INTO purchases (id, company, bill_number, bill_date, amount, paid, payload_json)
    VALUES (@id, @company, @bill_number, @bill_date, @amount, @paid, @payload_json)
    ON CONFLICT(id) DO UPDATE SET
      company = excluded.company,
      bill_number = excluded.bill_number,
      bill_date = excluded.bill_date,
      amount = excluded.amount,
      paid = excluded.paid,
      payload_json = excluded.payload_json
  `).run({
    id: String(purchase.id),
    company: String(purchase.company || ""),
    bill_number: String(purchase.billNumber || ""),
    bill_date: String(purchase.date || ""),
    amount: Number(purchase.amount) || 0,
    paid: purchase.paid ? 1 : 0,
    payload_json: JSON.stringify(purchase)
  });
}

function saveInvoiceRecord(invoice) {
  if (!db || !invoice || invoice.orderNumber === undefined || invoice.orderNumber === null) return;
  db.prepare(`
    INSERT INTO invoices (order_number, status, receipt_date, saved_at, completed_at, voided_at, total, cashier, payment_method, payload_json)
    VALUES (@order_number, @status, @receipt_date, @saved_at, @completed_at, @voided_at, @total, @cashier, @payment_method, @payload_json)
    ON CONFLICT(order_number) DO UPDATE SET
      status = excluded.status,
      receipt_date = excluded.receipt_date,
      saved_at = excluded.saved_at,
      completed_at = excluded.completed_at,
      voided_at = excluded.voided_at,
      total = excluded.total,
      cashier = excluded.cashier,
      payment_method = excluded.payment_method,
      payload_json = excluded.payload_json
  `).run({
    order_number: String(invoice.orderNumber),
    status: String(invoice.status || "hold"),
    receipt_date: String(invoice.date || ""),
    saved_at: String(invoice.savedAt || ""),
    completed_at: String(invoice.completedAt || ""),
    voided_at: String(invoice.voidedAt || ""),
    total: String(invoice.total || "$0.00"),
    cashier: String(invoice.cashier || ""),
    payment_method: String(invoice.paymentMethod || ""),
    payload_json: JSON.stringify(invoice)
  });
}

function saveVoidRecord(voidRecord) {
  if (!db || !voidRecord) return;
  const id = String(voidRecord.id || voidRecord.orderNumber || `void-${Date.now()}`);
  db.prepare(`
    INSERT INTO voids (id, voided_at, payload_json)
    VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      voided_at = excluded.voided_at,
      payload_json = excluded.payload_json
  `).run(id, String(voidRecord.voidedAt || ""), JSON.stringify({ ...voidRecord, id }));
}

function saveAuditLog(log) {
  if (!db || !log) return;
  const id = String(log.id || `AUD-${Date.now()}`);
  db.prepare(`
    INSERT INTO audit_logs (id, created_at, action, actor_username, payload_json)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      created_at = excluded.created_at,
      action = excluded.action,
      actor_username = excluded.actor_username,
      payload_json = excluded.payload_json
  `).run(
    id,
    String(log.createdAt || ""),
    String(log.action || ""),
    String(log.actorUsername || ""),
    JSON.stringify({ ...log, id })
  );
}

function reserveOrderNumber(fallbackNextOrderNumber) {
  if (!db) return Number(fallbackNextOrderNumber) || 1001;
  const highestInvoice = db.prepare("SELECT MAX(CAST(order_number AS INTEGER)) AS value FROM invoices").get()?.value || 1000;
  const currentNext = Number(getMeta("nextOrderNumber")) || Number(fallbackNextOrderNumber) || 1001;
  const orderNumber = Math.max(1001, Number(highestInvoice) + 1, currentNext);
  setMeta("nextOrderNumber", orderNumber + 1);
  return orderNumber;
}

function updateInvoiceStatus(orderNumber, status) {
  if (!db) return null;
  const row = db.prepare("SELECT payload_json FROM invoices WHERE order_number = ?").get(String(orderNumber));
  if (!row) return null;
  const invoice = parsePayload(row);
  const timestamp = new Date().toISOString();
  invoice.status = status;
  if (status === "complete") invoice.completedAt = timestamp;
  if (status === "hold") invoice.savedAt = timestamp;
  if (status === "void") invoice.voidedAt = timestamp;
  saveInvoiceRecord(invoice);
  return invoice;
}

function deleteInvoice(orderNumber) {
  if (!db) return;
  db.prepare("DELETE FROM invoices WHERE order_number = ?").run(String(orderNumber));
}

function getInvoice(orderNumber) {
  if (!db) return null;
  const row = db.prepare("SELECT payload_json FROM invoices WHERE order_number = ?").get(String(orderNumber));
  return row ? parsePayload(row) : null;
}

function parsePayload(row) {
  try {
    return JSON.parse(row.payload_json || "{}");
  } catch {
    return {};
  }
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

module.exports = {
  initializeHostDatabase,
  openDatabase,
  isReady,
  getLastError,
  readSettings,
  saveSettings,
  readCollections,
  saveCollections,
  saveInvoiceRecord,
  saveVoidRecord,
  saveAuditLog,
  reserveOrderNumber,
  updateInvoiceStatus,
  deleteInvoice,
  getInvoice
};
