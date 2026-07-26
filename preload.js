const { contextBridge, ipcRenderer } = require("electron");

// Preload bridge: exposes approved IPC actions to renderer windows with context isolation enabled.
contextBridge.exposeInMainWorld("simplePOS", {
  getStartupSettings: () => ipcRenderer.invoke("settings:startup"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  requestActivation: (payload) => ipcRenderer.invoke("activation:request", payload),
  selectDatabaseFile: () => ipcRenderer.invoke("database:select-file"),
  selectDatabaseFolder: () => ipcRenderer.invoke("database:select-folder"),
  configureDatabase: (payload) => ipcRenderer.invoke("database:configure", payload),
  backupDatabase: (payload) => ipcRenderer.invoke("database:backup", payload),
  openBackupLocation: () => ipcRenderer.invoke("database:open-backup-location"),
  openSettings: () => ipcRenderer.invoke("settings:open"),
  openManagement: () => ipcRenderer.invoke("management:open"),
  openPurchasing: (payload) => ipcRenderer.invoke("purchasing:open", payload),
  openHelp: (topic) => ipcRenderer.invoke("help:open", topic),
  createInventoryTemplate: () => ipcRenderer.invoke("inventory:template"),
  importInventoryTemplate: (actor) => ipcRenderer.invoke("inventory:import", actor),
  openReporting: (mode) => ipcRenderer.invoke("reporting:open", mode),
  closeReporting: () => ipcRenderer.invoke("reporting:close"),
  openAuditLog: () => ipcRenderer.invoke("audit:open"),
  onSettingsUpdated: (callback) => {
    ipcRenderer.on("settings:updated", (_event, settings) => callback(settings));
  },
  onDatabaseBackupStatus: (callback) => {
    ipcRenderer.on("database:backup-status", (_event, status) => callback(status));
  },
  onInvoiceRestore: (callback) => {
    ipcRenderer.on("invoice:restore", (_event, invoice) => callback(invoice));
  },
  saveInvoice: (invoice) => ipcRenderer.invoke("invoice:save", invoice),
  updateInvoiceStatus: (orderNumber, status, actor) => ipcRenderer.invoke("invoice:update-status", orderNumber, status, actor),
  deleteInvoice: (orderNumber, actor) => ipcRenderer.invoke("invoice:delete", orderNumber, actor),
  restoreInvoice: (orderNumber, actor) => ipcRenderer.invoke("invoice:restore", orderNumber, actor),
  saveVoid: (voidPayload) => ipcRenderer.invoke("void:save", voidPayload),
  logAudit: (entry) => ipcRenderer.invoke("audit:log", entry),
  getNextOrderNumber: () => ipcRenderer.invoke("order:number:next"),
  listPrinters: () => ipcRenderer.invoke("printers:list"),
  printReceipt: (payload) => ipcRenderer.invoke("receipt:print", payload),
  shareReceiptWhatsApp: (payload) => ipcRenderer.invoke("receipt:share-whatsapp", payload),
  shareEndOfDayWhatsApp: (payload) => ipcRenderer.invoke("report:end-of-day-whatsapp", payload),
  openPath: (targetPath) => ipcRenderer.invoke("path:open", targetPath),
  closeApp: () => ipcRenderer.invoke("app:close"),
  requestLogoutShortcut: () => ipcRenderer.invoke("auth:logout-shortcut"),
  onLogoutRequested: (callback) => {
    ipcRenderer.on("auth:logout-requested", () => callback());
  }
});
