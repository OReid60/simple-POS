const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("simplePOS", {
  getStartupSettings: () => ipcRenderer.invoke("settings:startup"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  openSettings: () => ipcRenderer.invoke("settings:open"),
  openManagement: () => ipcRenderer.invoke("management:open"),
  createInventoryTemplate: () => ipcRenderer.invoke("inventory:template"),
  importInventoryTemplate: (actor) => ipcRenderer.invoke("inventory:import", actor),
  openReporting: (mode) => ipcRenderer.invoke("reporting:open", mode),
  closeReporting: () => ipcRenderer.invoke("reporting:close"),
  openAuditLog: () => ipcRenderer.invoke("audit:open"),
  onSettingsUpdated: (callback) => {
    ipcRenderer.on("settings:updated", (_event, settings) => callback(settings));
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
  openPath: (targetPath) => ipcRenderer.invoke("path:open", targetPath)
});
