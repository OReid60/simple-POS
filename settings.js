// Settings module: owns business data, inventory field toggles, user accounts,
// printer options, database mode, and draggable/collapsible settings layout.
const els = {
  form: document.querySelector("#settingsForm"),
  businessName: document.querySelector("#businessNameInput"),
  businessAddress: document.querySelector("#businessAddressInput"),
  businessAdditionalAddressEnabled: document.querySelector("#businessAdditionalAddressEnabled"),
  businessAdditionalAddress: document.querySelector("#businessAdditionalAddressInput"),
  businessLogo: document.querySelector("#businessLogoInput"),
  businessLogoPreview: document.querySelector("#businessLogoPreview"),
  businessLogoPlaceholder: document.querySelector("#businessLogoPlaceholder"),
  clearBusinessLogo: document.querySelector("#clearBusinessLogo"),
  whatsappNumber: document.querySelector("#whatsappNumber"),
  taxRate: document.querySelector("#taxRate"),
  holdRetentionEnabled: document.querySelector("#holdRetentionEnabled"),
  holdRetentionHours: document.querySelector("#holdRetentionHours"),
  newItemBadgeTimerEnabled: document.querySelector("#newItemBadgeTimerEnabled"),
  newItemBadgeHours: document.querySelector("#newItemBadgeHours"),
  themeGradient: document.querySelector("#themeGradient"),
  staffCanAccessSettings: document.querySelector("#staffCanAccessSettings"),
  staffCanAccessManagement: document.querySelector("#staffCanAccessManagement"),
  staffCanAccessReporting: document.querySelector("#staffCanAccessReporting"),
  staffCanRestoreHolds: document.querySelector("#staffCanRestoreHolds"),
  ctrlEscShortcutEnabled: document.querySelector("#ctrlEscShortcutEnabled"),
  inventoryShowSku: document.querySelector("#inventoryShowSku"),
  inventoryShowBarcode: document.querySelector("#inventoryShowBarcode"),
  inventoryShowReorderAt: document.querySelector("#inventoryShowReorderAt"),
  inventoryShowNote: document.querySelector("#inventoryShowNote"),
  inventoryShowAdjustmentReason: document.querySelector("#inventoryShowAdjustmentReason"),
  paymentMethodList: document.querySelector("#paymentMethodList"),
  addPaymentMethod: document.querySelector("#addPaymentMethod"),
  userList: document.querySelector("#userList"),
  openAuditLog: document.querySelector("#openAuditLog"),
  addUser: document.querySelector("#addUser"),
  receiptPrintingEnabled: document.querySelector("#receiptPrintingEnabled"),
  saleCompleteEnterAction: document.querySelector("#saleCompleteEnterAction"),
  printerSelect: document.querySelector("#printerSelect"),
  paperSize: document.querySelector("#paperSize"),
  silentPrint: document.querySelector("#silentPrint"),
  printerStatus: document.querySelector("#printerStatus"),
  printerSaveStatus: document.querySelector("#printerSaveStatus"),
  saveStatus: document.querySelector("#saveStatus"),
  refreshPrinters: document.querySelector("#refreshPrinters"),
  savePrinterSettings: document.querySelector("#savePrinterSettings"),
  receiptFooterText: document.querySelector("#receiptFooterText"),
  receiptTemplateList: document.querySelector("#receiptTemplateList"),
  receiptTemplatePreview: document.querySelector("#receiptTemplatePreview"),
  resetReceiptTemplate: document.querySelector("#resetReceiptTemplate"),
  toggleReceiptBuilder: document.querySelector("#toggleReceiptBuilder"),
  receiptBuilderBody: document.querySelector("#receiptBuilderBody"),
  saveReceiptSettings: document.querySelector("#saveReceiptSettings"),
  receiptSaveStatus: document.querySelector("#receiptSaveStatus"),
  layoutActionButtons: document.querySelector("#layoutActionButtons"),
  toggleLayoutEdit: document.querySelector("#toggleLayoutEdit"),
  resetLayout: document.querySelector("#resetLayout"),
  businessLayoutGrid: document.querySelector("#businessLayoutGrid"),
  databaseModeHost: document.querySelector("#databaseModeHost"),
  databaseModeClient: document.querySelector("#databaseModeClient"),
  databasePath: document.querySelector("#databasePath"),
  backupOnStartupEnabled: document.querySelector("#backupOnStartupEnabled"),
  openBackupLocation: document.querySelector("#openBackupLocation"),
  browseDatabasePath: document.querySelector("#browseDatabasePath"),
  applyDatabaseMode: document.querySelector("#applyDatabaseMode"),
  databaseStatus: document.querySelector("#databaseStatus"),
  toggleDatabaseSection: document.querySelector("#toggleDatabaseSection"),
  databaseModeBody: document.querySelector("#databaseModeBody"),
  toggleStaffSection: document.querySelector("#toggleStaffSection"),
  staffSectionBody: document.querySelector("#staffSectionBody")
};

const defaultSettingsLayout = [
  { id: "business", width: "full" },
  { id: "inventory", width: "half" },
  { id: "payments", width: "half" },
  { id: "receipt", width: "full" },
  { id: "database", width: "full" },
  { id: "staff", width: "full" }
];
const layoutSectionIds = defaultSettingsLayout.map((section) => section.id);
const defaultBusinessLayout = [
  { id: "name", width: "full" },
  { id: "address", width: "full" },
  { id: "additionalAddress", width: "full" },
  { id: "logo", width: "half" },
  { id: "whatsapp", width: "half" },
  { id: "theme", width: "half" },
  { id: "holdTimer", width: "half" }
];
const businessLayoutItemIds = defaultBusinessLayout.map((item) => item.id);
const receiptSectionLabels = {
  businessName: "Business Name",
  logo: "Logo",
  address: "Address",
  contact: "Contact",
  receiptNumber: "Receipt #",
  date: "Date",
  cashier: "Cashier",
  payment: "Payment",
  items: "Items",
  subtotal: "Subtotal",
  tax: "Tax",
  discount: "Discount",
  total: "Total",
  tendered: "Tendered",
  change: "Change",
  footer: "Footer"
};
const lockedReceiptSections = new Set(["businessName", "logo", "address"]);
const hiddenReceiptBoldSections = new Set(["logo", "address", "contact"]);
const hiddenReceiptDividerSections = new Set(["businessName", "logo", "address", "contact"]);
const receiptSectionForcedStyles = {
  businessName: { bold: true, divider: false },
  logo: { bold: false, divider: false },
  address: { bold: true, divider: false },
  contact: { bold: true, divider: false }
};
const defaultReceiptTemplate = {
  logoSize: "medium",
  footerText: "Thank you for shopping with us.",
  sections: [
    { id: "businessName", visible: true, align: "center", size: "large", bold: true, divider: false },
    { id: "logo", visible: true, align: "center", size: "normal", bold: false, divider: false },
    { id: "address", visible: true, align: "left", size: "normal", bold: true, divider: false },
    { id: "contact", visible: true, align: "left", size: "normal", bold: true, divider: false },
    { id: "receiptNumber", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "date", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "cashier", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "payment", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "items", visible: true, align: "left", size: "normal", bold: false, divider: true },
    { id: "subtotal", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "tax", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "discount", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "total", visible: true, align: "left", size: "large", bold: true, divider: true },
    { id: "tendered", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "change", visible: true, align: "left", size: "normal", bold: true, divider: true },
    { id: "footer", visible: true, align: "center", size: "normal", bold: true, divider: false }
  ]
};
const receiptSectionIds = defaultReceiptTemplate.sections.map((section) => section.id);
let layoutEditEnabled = false;
let layoutButtonsVisible = false;
let draggedLayoutSectionId = "";
let draggedBusinessLayoutItemId = "";
let draggedReceiptSectionId = "";
let databaseConfigUnlocked = false;
let databaseSectionCollapsed = true;
let staffSectionCollapsed = true;
let receiptBuilderCollapsed = true;

let currentSettings = {
  businessName: "",
  businessLogo: "",
  businessAddress: "",
  businessAdditionalAddressEnabled: false,
  businessAdditionalAddress: "",
  whatsappNumber: "",
  taxRate: 0.0825,
  holdRetentionEnabled: true,
  holdRetentionHours: 24,
  newItemBadgeTimerEnabled: true,
  newItemBadgeHours: 24,
  themeGradient: "lotus",
  ctrlEscShortcutEnabled: true,
  inventoryFieldVisibility: {
    sku: true,
    barcode: true,
    reorderAt: false,
    note: true,
    adjustmentReason: true
  },
  permissions: {},
  paymentMethods: [],
  users: [],
  receiptPrintingEnabled: false,
  saleCompleteEnterAction: "startNextSale",
  printerName: "",
  paperSize: "letter",
  silent: false,
  receiptTemplate: defaultReceiptTemplate,
  backupOnStartupEnabled: false,
  backupOnStartupConfigured: false,
  databaseMode: "host",
  databasePath: "",
  databaseSetupLocked: true,
  settingsLayout: defaultSettingsLayout,
  businessLayout: defaultBusinessLayout
};

// Load workflow: read saved settings, normalize legacy layouts, hydrate controls, then apply theme/layout.
async function loadSettings() {
  currentSettings = await window.simplePOS.getSettings();
  currentSettings.settingsLayout = normalizeSettingsLayout(currentSettings.settingsLayout);
  currentSettings.businessLayout = normalizeBusinessLayout(currentSettings.businessLayout);
  currentSettings.users = Array.isArray(currentSettings.users) ? currentSettings.users : [];
  currentSettings.paymentMethods = normalizePaymentMethods(currentSettings.paymentMethods);
  currentSettings.receiptTemplate = normalizeReceiptTemplate(currentSettings.receiptTemplate);
  els.businessName.value = currentSettings.businessName || "";
  els.businessAddress.value = currentSettings.businessAddress || "";
  els.businessAdditionalAddressEnabled.checked = currentSettings.businessAdditionalAddressEnabled === true;
  els.businessAdditionalAddress.value = currentSettings.businessAdditionalAddress || "";
  updateAdditionalAddressControl();
  renderLogoPreview();
  els.whatsappNumber.value = currentSettings.whatsappNumber;
  els.taxRate.value = (Number(currentSettings.taxRate || 0) * 100).toFixed(2);
  els.holdRetentionEnabled.checked = currentSettings.holdRetentionEnabled !== false;
  els.holdRetentionHours.value = els.holdRetentionEnabled.checked ? Number(currentSettings.holdRetentionHours || 24) : "";
  els.newItemBadgeTimerEnabled.checked = currentSettings.newItemBadgeTimerEnabled !== false;
  els.newItemBadgeHours.value = els.newItemBadgeTimerEnabled.checked ? Number(currentSettings.newItemBadgeHours || 24) : "";
  updateTimerControls();
  els.themeGradient.value = normalizeThemeGradient(currentSettings.themeGradient);
  applyTheme(currentSettings.themeGradient);
  els.staffCanAccessSettings.checked = Boolean(currentSettings.permissions?.staffCanAccessSettings);
  els.staffCanAccessManagement.checked = Boolean(currentSettings.permissions?.staffCanAccessManagement);
  els.staffCanAccessReporting.checked = Boolean(currentSettings.permissions?.staffCanAccessReporting);
  els.staffCanRestoreHolds.checked = Boolean(currentSettings.permissions?.staffCanRestoreHolds);
  els.ctrlEscShortcutEnabled.checked = currentSettings.ctrlEscShortcutEnabled !== false;
  currentSettings.inventoryFieldVisibility = normalizeInventoryFieldVisibility(currentSettings.inventoryFieldVisibility);
  els.inventoryShowSku.checked = currentSettings.inventoryFieldVisibility.sku;
  els.inventoryShowBarcode.checked = currentSettings.inventoryFieldVisibility.barcode;
  els.inventoryShowReorderAt.checked = currentSettings.inventoryFieldVisibility.reorderAt;
  els.inventoryShowNote.checked = currentSettings.inventoryFieldVisibility.note;
  els.inventoryShowAdjustmentReason.checked = currentSettings.inventoryFieldVisibility.adjustmentReason;
  els.receiptPrintingEnabled.checked = currentSettings.receiptPrintingEnabled !== false;
  els.saleCompleteEnterAction.value = normalizeSaleCompleteEnterAction(currentSettings.saleCompleteEnterAction);
  els.paperSize.value = currentSettings.paperSize;
  els.silentPrint.checked = currentSettings.silent;
  els.receiptFooterText.value = currentSettings.receiptTemplate.footerText;
  renderDatabaseConfig();
  updatePrinterControls();
  renderPaymentMethods();
  renderUsers();
  renderReceiptTemplateBuilder();
  initializeLayoutControls();
  initializeBusinessLayoutControls();
  applySettingsLayout();
  applyBusinessLayout();
  renderLayoutActionButtons();
  await loadPrinters();
  updatePrinterControls();
}

function normalizeBusinessLayout(layout) {
  const source = Array.isArray(layout) ? layout : [];
  if (source.some((item) => String(item?.id || "").trim() === "newBadgeTimer")) {
    return defaultBusinessLayout.map((item) => ({ ...item }));
  }
  const seen = new Set();
  const normalized = source
    .map((item) => ({
      id: String(item?.id || "").trim(),
      width: item?.id === "receipt" || item?.width === "full" ? "full" : "half"
    }))
    .filter((item) => {
      if (!businessLayoutItemIds.includes(item.id) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  defaultBusinessLayout.forEach((item) => {
    if (!seen.has(item.id)) normalized.push({ ...item });
  });
  return normalized;
}

function renderDatabaseConfig() {
  const mode = currentSettings.databaseMode === "client" ? "client" : "host";
  els.databaseModeHost.checked = mode === "host";
  els.databaseModeClient.checked = mode === "client";
  els.databasePath.value = currentSettings.databasePath || "";
  els.backupOnStartupEnabled.checked = currentSettings.backupOnStartupConfigured === true
    ? currentSettings.backupOnStartupEnabled === true
    : mode === "client";
  const locked = !databaseConfigUnlocked;
  els.databaseModeHost.disabled = locked;
  els.databaseModeClient.disabled = locked;
  els.databasePath.disabled = locked;
  els.browseDatabasePath.disabled = locked;
  els.applyDatabaseMode.disabled = locked;
  els.databaseStatus.textContent = locked
    ? "Database mode is locked. Press Ctrl+1 to unlock Host/Client options."
    : "Database mode unlocked. Choose Host or Client, then apply.";
}

// Collapsible Database Mode section is locked by default and unlocked with Ctrl+1.
function toggleDatabaseSection() {
  databaseSectionCollapsed = !databaseSectionCollapsed;
  els.databaseModeBody.classList.toggle("is-hidden", databaseSectionCollapsed);
  els.toggleDatabaseSection.textContent = databaseSectionCollapsed ? "Expand" : "Collapse";
  els.toggleDatabaseSection.setAttribute("aria-expanded", String(!databaseSectionCollapsed));
}

// Collapsible User Account section keeps staff/password settings hidden until needed.
function toggleStaffSection() {
  staffSectionCollapsed = !staffSectionCollapsed;
  els.staffSectionBody.classList.toggle("is-hidden", staffSectionCollapsed);
  els.toggleStaffSection.textContent = staffSectionCollapsed ? "Expand" : "Collapse";
  els.toggleStaffSection.setAttribute("aria-expanded", String(!staffSectionCollapsed));
}

function toggleReceiptBuilder() {
  receiptBuilderCollapsed = !receiptBuilderCollapsed;
  els.receiptBuilderBody.classList.toggle("is-hidden", receiptBuilderCollapsed);
  els.toggleReceiptBuilder.textContent = receiptBuilderCollapsed ? "Expand" : "Collapse";
  els.toggleReceiptBuilder.setAttribute("aria-expanded", String(!receiptBuilderCollapsed));
}

function normalizeSettingsLayout(layout) {
  const source = Array.isArray(layout) ? layout : [];
  const obsoleteSectionIds = new Set(["theme", "inventoryFields", "users", "roles"]);
  if (source.some((item) => obsoleteSectionIds.has(String(item?.id || "").trim()))) {
    return defaultSettingsLayout.map((item) => ({ ...item }));
  }
  const seen = new Set();
  const normalized = source
    .map((item) => ({
      id: String(item?.id || "").trim(),
      width: item?.width === "full" ? "full" : "half"
    }))
    .filter((item) => {
      if (!layoutSectionIds.includes(item.id) || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  defaultSettingsLayout.forEach((item) => {
    if (!seen.has(item.id)) normalized.push({ ...item });
  });
  return normalized;
}

// Inventory field visibility toggles decide which optional item fields appear in Inventory rows.
function normalizeInventoryFieldVisibility(visibility) {
  const source = visibility && typeof visibility === "object" ? visibility : {};
  return {
    sku: source.sku !== false,
    barcode: source.barcode !== false,
    reorderAt: source.reorderAt === true,
    note: source.note !== false,
    adjustmentReason: source.adjustmentReason !== false
  };
}

function initializeLayoutControls() {
  document.querySelectorAll("[data-layout-section]").forEach((section) => {
    if (section.querySelector(".layout-control-bar")) return;
    const title = section.dataset.layoutTitle || section.querySelector("h2")?.textContent || "Section";
    section.insertAdjacentHTML("afterbegin", `
      <div class="layout-control-bar">
        <button class="secondary-button layout-drag-handle" type="button" draggable="true" data-layout-drag="${escapeAttribute(section.dataset.layoutSection)}" title="Move ${escapeAttribute(title)}">Move</button>
        <button class="secondary-button layout-size-button" type="button" data-layout-resize="${escapeAttribute(section.dataset.layoutSection)}">Resize</button>
      </div>
    `);
  });
}

function initializeBusinessLayoutControls() {
  document.querySelectorAll("[data-business-layout-item]").forEach((item) => {
    if (item.querySelector(".business-layout-control-bar")) return;
    const title = item.dataset.businessLayoutTitle || "Business item";
    item.insertAdjacentHTML("afterbegin", `
      <div class="business-layout-control-bar">
        <button class="secondary-button business-layout-drag-handle" type="button" draggable="true" data-business-layout-drag="${escapeAttribute(item.dataset.businessLayoutItem)}" title="Move ${escapeAttribute(title)}">Move</button>
        <button class="secondary-button business-layout-size-button" type="button" data-business-layout-resize="${escapeAttribute(item.dataset.businessLayoutItem)}">Resize</button>
      </div>
    `);
  });
}

function applySettingsLayout() {
  currentSettings.settingsLayout = normalizeSettingsLayout(currentSettings.settingsLayout);
  currentSettings.settingsLayout.forEach((item, index) => {
    const section = document.querySelector(`[data-layout-section="${item.id}"]`);
    if (!section) return;
    section.style.order = String(index + 1);
    section.dataset.layoutWidth = item.width;
    section.classList.toggle("settings-section-full", item.width === "full");
    section.classList.toggle("settings-section-half", item.width !== "full");
  });
  document.body.classList.toggle("layout-editing", layoutEditEnabled);
  els.toggleLayoutEdit.textContent = layoutEditEnabled ? "Done Layout" : "Edit Layout";
}

function renderLayoutActionButtons() {
  els.layoutActionButtons.classList.toggle("is-hidden", !layoutButtonsVisible);
  if (!layoutButtonsVisible && layoutEditEnabled) {
    layoutEditEnabled = false;
    applySettingsLayout();
  }
}

function applyBusinessLayout() {
  currentSettings.businessLayout = normalizeBusinessLayout(currentSettings.businessLayout);
  currentSettings.businessLayout.forEach((item, index) => {
    const element = document.querySelector(`[data-business-layout-item="${item.id}"]`);
    if (!element) return;
    element.style.order = String(index + 1);
    element.dataset.businessLayoutWidth = item.width;
    element.classList.toggle("business-layout-item-full", item.width === "full");
    element.classList.toggle("business-layout-item-half", item.width !== "full");
  });
}

function getLayoutItem(sectionId) {
  currentSettings.settingsLayout = normalizeSettingsLayout(currentSettings.settingsLayout);
  return currentSettings.settingsLayout.find((item) => item.id === sectionId);
}

function getBusinessLayoutItem(itemId) {
  currentSettings.businessLayout = normalizeBusinessLayout(currentSettings.businessLayout);
  return currentSettings.businessLayout.find((item) => item.id === itemId);
}

async function saveLayoutSettings(message = "Layout saved.") {
  currentSettings = await window.simplePOS.saveSettings({
    ...collectSettingsPayload(),
    __auditAction: "Updated settings layout",
    __auditDetails: "Settings section order or size was changed."
  });
  currentSettings.settingsLayout = normalizeSettingsLayout(currentSettings.settingsLayout);
  applySettingsLayout();
  els.saveStatus.textContent = message;
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

async function saveBusinessLayoutSettings(message = "Business layout saved.") {
  currentSettings = await window.simplePOS.saveSettings({
    ...collectSettingsPayload(),
    __auditAction: "Updated business layout",
    __auditDetails: "Business settings field order or size was changed."
  });
  currentSettings.businessLayout = normalizeBusinessLayout(currentSettings.businessLayout);
  applyBusinessLayout();
  els.saveStatus.textContent = message;
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

function toggleLayoutEdit() {
  layoutEditEnabled = !layoutEditEnabled;
  applySettingsLayout();
}

function toggleLayoutButtons() {
  layoutButtonsVisible = !layoutButtonsVisible;
  renderLayoutActionButtons();
}

function resetLayout() {
  currentSettings.settingsLayout = defaultSettingsLayout.map((item) => ({ ...item }));
  currentSettings.businessLayout = defaultBusinessLayout.map((item) => ({ ...item }));
  applySettingsLayout();
  applyBusinessLayout();
  saveLayoutSettings("Layout reset.").catch(() => {
    els.saveStatus.textContent = "Unable to save layout.";
  });
}

function resizeBusinessLayoutItem(itemId) {
  const item = getBusinessLayoutItem(itemId);
  if (!item) return;
  item.width = item.width === "full" ? "half" : "full";
  applyBusinessLayout();
  saveBusinessLayoutSettings("Business field size saved.").catch(() => {
    els.saveStatus.textContent = "Unable to save business layout.";
  });
}

function moveBusinessLayoutItem(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const layout = normalizeBusinessLayout(currentSettings.businessLayout);
  const sourceIndex = layout.findIndex((item) => item.id === sourceId);
  const targetIndex = layout.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [moved] = layout.splice(sourceIndex, 1);
  layout.splice(targetIndex, 0, moved);
  currentSettings.businessLayout = layout;
  applyBusinessLayout();
  saveBusinessLayoutSettings("Business field order saved.").catch(() => {
    els.saveStatus.textContent = "Unable to save business layout.";
  });
}

function resizeLayoutSection(sectionId) {
  const item = getLayoutItem(sectionId);
  if (!item) return;
  item.width = item.width === "full" ? "half" : "full";
  applySettingsLayout();
  saveLayoutSettings("Layout size saved.").catch(() => {
    els.saveStatus.textContent = "Unable to save layout.";
  });
}

function moveLayoutSection(sourceId, targetId) {
  if (!sourceId || !targetId || sourceId === targetId) return;
  const layout = normalizeSettingsLayout(currentSettings.settingsLayout);
  const sourceIndex = layout.findIndex((item) => item.id === sourceId);
  const targetIndex = layout.findIndex((item) => item.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [moved] = layout.splice(sourceIndex, 1);
  layout.splice(targetIndex, 0, moved);
  currentSettings.settingsLayout = layout;
  applySettingsLayout();
  saveLayoutSettings("Layout order saved.").catch(() => {
    els.saveStatus.textContent = "Unable to save layout.";
  });
}

function normalizePaymentMethods(paymentMethods) {
  const source = Array.isArray(paymentMethods) && paymentMethods.length
    ? paymentMethods
    : [
        { name: "Cash", enabled: true },
        { name: "Debit Card", enabled: true },
        { name: "Credit Card", enabled: true }
      ];
  return source
    .map((method) => ({
      name: String(method.name || "").trim(),
      enabled: method.enabled !== false
    }))
    .filter((method) => method.name);
}

function normalizeSaleCompleteEnterAction(value) {
  const action = String(value || "").trim();
  return ["startNextSale", "shareWhatsApp", "hold"].includes(action) ? action : "startNextSale";
}

function normalizeThemeGradient(themeGradient) {
  return ["lotus", "emerald", "rose", "blue", "gold", "neutral"].includes(themeGradient) ? themeGradient : "lotus";
}

function applyTheme(themeGradient) {
  document.body.dataset.theme = normalizeThemeGradient(themeGradient);
}

function renderLogoPreview() {
  const hasLogo = Boolean(currentSettings.businessLogo);
  els.businessLogoPreview.src = hasLogo ? currentSettings.businessLogo : "";
  els.businessLogoPreview.classList.toggle("is-hidden", !hasLogo);
  els.businessLogoPlaceholder.classList.toggle("is-hidden", hasLogo);
  els.clearBusinessLogo.classList.toggle("is-hidden", !hasLogo);
}

function updateAdditionalAddressControl() {
  const enabled = els.businessAdditionalAddressEnabled.checked;
  els.businessAdditionalAddress.disabled = !enabled;
  els.businessAdditionalAddress.closest("label")?.classList.toggle("is-disabled", !enabled);
}

function loadLogoFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    currentSettings.businessLogo = String(reader.result || "");
    renderLogoPreview();
    renderReceiptTemplatePreview();
  });
  reader.readAsDataURL(file);
}

function clearLogo() {
  currentSettings.businessLogo = "";
  els.businessLogo.value = "";
  renderLogoPreview();
  renderReceiptTemplatePreview();
}

function renderUsers() {
  els.userList.innerHTML = currentSettings.users
    .map(
      (user, index) => `
        <div class="user-row" data-index="${index}">
          <label>
            Name
            <input data-field="name" value="${escapeAttribute(user.name)}" required>
          </label>
          <label>
            Username
            <input data-field="username" value="${escapeAttribute(user.username)}" required>
          </label>
          <label>
            Password
            <span class="password-field">
              <input data-field="password" type="password" value="${escapeAttribute(user.password)}" required>
              <button class="secondary-button password-toggle-button" type="button" data-toggle-password="${index}">Show</button>
            </span>
          </label>
          <label>
            Role
            <select data-field="role">
              <option value="staff">Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label>
            Discount limit (%)
            <input data-field="discountLimit" type="text" inputmode="decimal" maxlength="6" value="${escapeAttribute(formatPercentValue(user.discountLimit || 0))}" placeholder="0">
          </label>
          <button class="icon-button danger-button" type="button" data-remove-user="${index}" aria-label="Remove ${escapeAttribute(user.name)}">
            <span aria-hidden="true">x</span>
          </button>
        </div>
      `
    )
    .join("");

  [...els.userList.querySelectorAll(".user-row")].forEach((row, index) => {
    row.querySelector('[data-field="role"]').value = currentSettings.users[index].role || "staff";
  });
}

function renderPaymentMethods() {
  els.paymentMethodList.innerHTML = currentSettings.paymentMethods
    .map(
      (method, index) => `
        <div class="payment-method-row" data-index="${index}">
          <label>
            Method
            <input data-field="name" value="${escapeAttribute(method.name)}" required>
          </label>
          <label class="checkbox-row">
            <input data-field="enabled" type="checkbox" ${method.enabled === false ? "" : "checked"}>
            Enabled
          </label>
          <button class="icon-button danger-button" type="button" data-remove-payment="${index}" aria-label="Remove ${escapeAttribute(method.name)}">
            <span aria-hidden="true">x</span>
          </button>
        </div>
      `
    )
    .join("");
}

function collectPaymentMethods() {
  return [...els.paymentMethodList.querySelectorAll(".payment-method-row")]
    .map((row) => ({
      name: row.querySelector('[data-field="name"]').value.trim(),
      enabled: row.querySelector('[data-field="enabled"]').checked
    }))
    .filter((method) => method.name);
}

function addPaymentMethod() {
  currentSettings.paymentMethods = collectPaymentMethods();
  currentSettings.paymentMethods.push({
    name: `Payment ${currentSettings.paymentMethods.length + 1}`,
    enabled: true
  });
  renderPaymentMethods();
}

function removePaymentMethod(index) {
  currentSettings.paymentMethods = collectPaymentMethods().filter((_, itemIndex) => itemIndex !== index);
  renderPaymentMethods();
}

function collectUsers() {
  return [...els.userList.querySelectorAll(".user-row")].map((row) => {
    const username = row.querySelector('[data-field="username"]').value.trim();
    const password = row.querySelector('[data-field="password"]').value.trim();
    const name = row.querySelector('[data-field="name"]').value.trim() || username;
    const role = row.querySelector('[data-field="role"]').value === "admin" ? "admin" : "staff";
    const discountLimit = parsePercent(row.querySelector('[data-field="discountLimit"]').value);
    return { username, password, name, role, discountLimit };
  }).filter((user) => user.username && user.password);
}

function addUser() {
  currentSettings.users = collectUsers();
  currentSettings.users.push({
    name: "New Staff Member",
    username: `user${currentSettings.users.length + 1}`,
    password: "password",
    role: "staff",
    discountLimit: 0
  });
  renderUsers();
}

function removeUser(index) {
  currentSettings.users = collectUsers().filter((_, itemIndex) => itemIndex !== index);
  renderUsers();
}

function normalizeReceiptTemplate(template) {
  const sourceSections = Array.isArray(template?.sections) ? template.sections : [];
  const seen = new Set();
  const sections = sourceSections
    .map((section) => ({
      id: String(section?.id || "").trim(),
      visible: section?.visible !== false,
      align: ["left", "center", "right"].includes(section?.align) ? section.align : "left",
      size: ["small", "normal", "large"].includes(section?.size) ? section.size : "normal",
      bold: section?.bold === true,
      divider: section?.divider !== false
    }))
    .filter((section) => {
      if (!receiptSectionIds.includes(section.id) || seen.has(section.id)) return false;
      seen.add(section.id);
      return true;
    });
  defaultReceiptTemplate.sections.forEach((section) => {
    if (!seen.has(section.id)) sections.push({ ...section });
  });
  return {
    logoSize: ["small", "medium", "large"].includes(template?.logoSize) ? template.logoSize : "medium",
    footerText: String(template?.footerText || defaultReceiptTemplate.footerText),
    sections: sections.map(applyReceiptSectionForcedStyle)
  };
}

function collectReceiptTemplate() {
  const sections = [...els.receiptTemplateList.querySelectorAll(".receipt-template-row")].map((row) => ({
    id: row.dataset.receiptSection,
    visible: row.querySelector('[data-field="visible"]').checked,
    align: currentSettings.receiptTemplate.sections.find((section) => section.id === row.dataset.receiptSection)?.align || "left",
    size: row.querySelector('[data-field="size"]').value,
    bold: row.querySelector('[data-field="bold"]')?.checked === true,
    divider: row.querySelector('[data-field="divider"]')?.checked === true
  }));
  return normalizeReceiptTemplate({
    logoSize: currentSettings.receiptTemplate.logoSize || defaultReceiptTemplate.logoSize,
    footerText: els.receiptFooterText.value.trim() || defaultReceiptTemplate.footerText,
    sections
  });
}

function applyReceiptSectionForcedStyle(section) {
  return {
    ...section,
    ...(receiptSectionForcedStyles[section.id] || {})
  };
}

function renderReceiptTemplateBuilder() {
  currentSettings.receiptTemplate = normalizeReceiptTemplate(currentSettings.receiptTemplate);
  els.receiptFooterText.value = currentSettings.receiptTemplate.footerText;
  els.receiptTemplateList.innerHTML = currentSettings.receiptTemplate.sections
    .map((section) => renderReceiptTemplateRow(section))
    .join("");
  renderReceiptTemplatePreview();
}

function renderReceiptTemplateRow(section) {
  const showBold = !hiddenReceiptBoldSections.has(section.id);
  const showDivider = !hiddenReceiptDividerSections.has(section.id);
  return `
    <div class="receipt-template-row is-locked" draggable="false" data-receipt-section="${escapeAttribute(section.id)}">
      <label class="checkbox-row compact-checkbox">
        <input data-field="visible" type="checkbox" ${section.visible ? "checked" : ""}>
        ${escapeHtml(receiptSectionLabels[section.id] || section.id)}
      </label>
      <select data-field="size" title="Font size">
        <option value="small" ${section.size === "small" ? "selected" : ""}>Small</option>
        <option value="normal" ${section.size === "normal" ? "selected" : ""}>Normal</option>
        <option value="large" ${section.size === "large" ? "selected" : ""}>Large</option>
      </select>
      ${showBold ? `<label class="checkbox-row compact-checkbox"><input data-field="bold" type="checkbox" ${section.bold ? "checked" : ""}> Bold</label>` : ""}
      ${showDivider ? `<label class="checkbox-row compact-checkbox"><input data-field="divider" type="checkbox" ${section.divider ? "checked" : ""}> Line</label>` : ""}
    </div>
  `;
}

function updateReceiptTemplateFromControls() {
  currentSettings.receiptTemplate = collectReceiptTemplate();
  renderReceiptTemplatePreview();
}

function moveReceiptTemplateSection(targetSectionId) {
  if (!draggedReceiptSectionId || draggedReceiptSectionId === targetSectionId) return;
  const template = collectReceiptTemplate();
  const fromIndex = template.sections.findIndex((section) => section.id === draggedReceiptSectionId);
  const toIndex = template.sections.findIndex((section) => section.id === targetSectionId);
  if (fromIndex < 0 || toIndex < 0) return;
  const [section] = template.sections.splice(fromIndex, 1);
  template.sections.splice(toIndex, 0, section);
  currentSettings.receiptTemplate = template;
  renderReceiptTemplateBuilder();
}

function resetReceiptTemplate() {
  currentSettings.receiptTemplate = normalizeReceiptTemplate(defaultReceiptTemplate);
  renderReceiptTemplateBuilder();
}

function getSampleReceipt() {
  return {
    businessName: els.businessName.value.trim() || "Beauty POS",
    businessLogo: currentSettings.businessLogo,
    businessAddress: getBusinessAddressForReceipt() || "123 Beauty Ave",
    whatsappNumber: els.whatsappNumber.value.trim() || "15551234567",
    orderNumber: 1001,
    date: new Date().toLocaleString(),
    cashier: "Administrator",
    paymentMethod: "Cash",
    subtotal: "$28.49",
    tax: "$2.35",
    discountPercent: "10%",
    discount: "$3.08",
    total: "$27.76",
    tendered: "$30.00",
    change: "$2.24",
    items: [
      { quantity: 1, name: "Hydrating Shampoo", lineTotal: "$12.50" },
      { quantity: 1, name: "Gel Polish - Ruby", lineTotal: "$9.50" },
      { quantity: 1, name: "Cuticle Oil Pen", lineTotal: "$5.99" }
    ]
  };
}

function renderReceiptTemplatePreview() {
  els.receiptTemplatePreview.innerHTML = renderReceiptFromTemplate(getSampleReceipt(), collectReceiptTemplate());
}

function getReceiptSectionContent(section, receipt, template) {
  const rows = {
    businessName: `<div class="receipt-template-text">${escapeHtml(receipt.businessName || "Business")}</div>`,
    logo: receipt.businessLogo ? `<img class="receipt-template-logo receipt-logo-${escapeAttribute(template.logoSize)}" src="${escapeAttribute(receipt.businessLogo)}" alt="">` : `<div class="receipt-template-logo-placeholder receipt-logo-${escapeAttribute(template.logoSize)}">Logo</div>`,
    address: renderReceiptTemplateValue(receipt.businessAddress || "Business address"),
    contact: renderReceiptTemplateValue(receipt.whatsappNumber || "Contact #"),
    receiptNumber: renderReceiptTemplatePair("Receipt #", `#${receipt.orderNumber}`),
    date: renderReceiptTemplatePair("Date", receipt.date),
    cashier: renderReceiptTemplatePair("Cashier", receipt.cashier),
    payment: renderReceiptTemplatePair("Payment", receipt.paymentMethod),
    items: (receipt.items || []).map((item) => renderReceiptTemplatePair(`${item.quantity} x ${item.name}`, item.lineTotal)).join(""),
    subtotal: renderReceiptTemplatePair("Subtotal", receipt.subtotal),
    tax: renderReceiptTemplatePair("Tax", receipt.tax),
    discount: parseMoney(receipt.discount) > 0 ? renderReceiptTemplatePair(`Discount (${receipt.discountPercent || ""})`, `-${receipt.discount}`) : "",
    total: renderReceiptTemplatePair("Total", receipt.total),
    tendered: renderReceiptTemplatePair("Tendered", receipt.tendered),
    change: renderReceiptTemplatePair("Change", receipt.change),
    footer: `<div class="receipt-template-text">${escapeHtml(template.footerText || "")}</div>`
  };
  return rows[section.id] || "";
}

function renderReceiptTemplatePair(label, value) {
  return `<div class="receipt-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderReceiptTemplateValue(value) {
  return `<div class="receipt-template-text">${escapeHtml(value).replace(/\n/g, "<br>")}</div>`;
}

function getBusinessAddressForReceipt() {
  const lines = [els.businessAddress.value.trim()];
  if (els.businessAdditionalAddressEnabled.checked && els.businessAdditionalAddress.value.trim()) {
    lines.push(els.businessAdditionalAddress.value.trim());
  }
  return lines.filter(Boolean).join("\n");
}

function renderReceiptFromTemplate(receipt, template) {
  const safeTemplate = normalizeReceiptTemplate(template);
  return safeTemplate.sections
    .filter((section) => section.visible)
    .map((section) => {
      const content = getReceiptSectionContent(section, receipt, safeTemplate);
      if (!content) return "";
      return `<div class="receipt-template-section align-${section.align} size-${section.size} ${section.bold ? "is-bold" : ""} ${section.divider ? "has-divider" : ""}">${content}</div>`;
    })
    .join("");
}

function parseMoney(value) {
  return Number(String(value || "0").replace(/[^0-9.-]+/g, "")) || 0;
}

async function loadPrinters() {
  if (!els.receiptPrintingEnabled.checked) {
    els.printerStatus.textContent = "Receipt printing is disabled.";
    return;
  }
  const printers = await window.simplePOS.listPrinters();
  els.printerSelect.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "System default printer";
  els.printerSelect.append(defaultOption);

  printers.forEach((printer) => {
    const option = document.createElement("option");
    option.value = printer.name;
    option.textContent = printer.name;
    els.printerSelect.append(option);
  });

  els.printerSelect.value = currentSettings.printerName || "";
  els.printerStatus.textContent = printers.length
    ? `${printers.length} printer(s) found.`
    : "No printers were found by Windows.";
}

function updatePrinterControls() {
  const enabled = els.receiptPrintingEnabled.checked;
  els.printerSelect.disabled = !enabled;
  els.paperSize.disabled = !enabled;
  els.silentPrint.disabled = !enabled;
  els.refreshPrinters.disabled = !enabled;
  els.printerSelect.closest("label")?.classList.toggle("is-disabled", !enabled);
  els.paperSize.closest("label")?.classList.toggle("is-disabled", !enabled);
  els.silentPrint.closest("label")?.classList.toggle("is-disabled", !enabled);
  if (!enabled) els.printerStatus.textContent = "Receipt printing is disabled.";
}

// Save Settings workflow persists all controls and records a settings audit entry.
async function saveSettings(event) {
  event.preventDefault();

  currentSettings = await window.simplePOS.saveSettings(collectSettingsPayload());

  els.saveStatus.textContent = "Settings saved.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

async function savePrinterSettings() {
  currentSettings = await window.simplePOS.saveSettings({
    ...collectSettingsPayload(),
    __auditAction: "Saved printer settings",
    __auditDetails: "Printer settings and receipt layout were updated."
  });
  currentSettings.receiptTemplate = normalizeReceiptTemplate(currentSettings.receiptTemplate);
  renderReceiptTemplateBuilder();
  els.printerSaveStatus.textContent = "Printer settings saved.";
  setTimeout(() => {
    els.printerSaveStatus.textContent = "";
  }, 2400);
}

async function saveReceiptSettings() {
  currentSettings = await window.simplePOS.saveSettings({
    ...collectSettingsPayload(),
    __auditAction: "Saved receipt settings",
    __auditDetails: "Receipt Builder layout and receipt message were updated."
  });
  currentSettings.receiptTemplate = normalizeReceiptTemplate(currentSettings.receiptTemplate);
  renderReceiptTemplateBuilder();
  els.receiptSaveStatus.textContent = "Receipt settings saved.";
  setTimeout(() => {
    els.receiptSaveStatus.textContent = "";
  }, 2400);
}

function collectSettingsPayload() {
  return {
    ...currentSettings,
    __auditActor: getAuditActor(),
    __auditAction: "Saved settings",
    __auditDetails: "POS settings were updated.",
    businessName: els.businessName.value.trim(),
    businessAddress: els.businessAddress.value.trim(),
    businessAdditionalAddressEnabled: els.businessAdditionalAddressEnabled.checked,
    businessAdditionalAddress: els.businessAdditionalAddress.value.trim(),
    businessLogo: currentSettings.businessLogo || "",
    whatsappNumber: els.whatsappNumber.value.trim(),
    taxRate: Number(els.taxRate.value || 0) / 100,
    holdRetentionEnabled: els.holdRetentionEnabled.checked,
    holdRetentionHours: els.holdRetentionEnabled.checked ? Math.max(1, Number(els.holdRetentionHours.value || 24)) : 24,
    newItemBadgeTimerEnabled: els.newItemBadgeTimerEnabled.checked,
    newItemBadgeHours: els.newItemBadgeTimerEnabled.checked ? Math.max(1, Number(els.newItemBadgeHours.value || 24)) : 24,
    themeGradient: normalizeThemeGradient(els.themeGradient.value),
    ctrlEscShortcutEnabled: els.ctrlEscShortcutEnabled.checked,
    inventoryFieldVisibility: {
      sku: els.inventoryShowSku.checked,
      barcode: els.inventoryShowBarcode.checked,
      reorderAt: els.inventoryShowReorderAt.checked,
      note: els.inventoryShowNote.checked,
      adjustmentReason: els.inventoryShowAdjustmentReason.checked
    },
    permissions: {
      staffCanAccessSettings: els.staffCanAccessSettings.checked,
      staffCanAccessManagement: els.staffCanAccessManagement.checked,
      staffCanAccessReporting: els.staffCanAccessReporting.checked,
      staffCanRestoreHolds: els.staffCanRestoreHolds.checked
    },
    paymentMethods: collectPaymentMethods(),
    users: collectUsers(),
    receiptPrintingEnabled: els.receiptPrintingEnabled.checked,
    saleCompleteEnterAction: normalizeSaleCompleteEnterAction(els.saleCompleteEnterAction.value),
    printerName: els.printerSelect.value,
    paperSize: els.paperSize.value,
    silent: els.silentPrint.checked,
    receiptTemplate: collectReceiptTemplate(),
    backupOnStartupEnabled: els.backupOnStartupEnabled.checked,
    backupOnStartupConfigured: currentSettings.backupOnStartupConfigured === true || els.backupOnStartupEnabled.dataset.changed === "true",
    databaseMode: currentSettings.databaseMode || "host",
    databasePath: currentSettings.databasePath || "",
    databaseSetupLocked: currentSettings.databaseSetupLocked !== false,
    settingsLayout: normalizeSettingsLayout(currentSettings.settingsLayout),
    businessLayout: normalizeBusinessLayout(currentSettings.businessLayout)
  };
}

async function browseDatabasePath() {
  if (!databaseConfigUnlocked) return;
  const mode = els.databaseModeClient.checked ? "client" : "host";
  const result = mode === "client"
    ? await window.simplePOS.selectDatabaseFile()
    : await window.simplePOS.selectDatabaseFolder();
  if (result?.path) els.databasePath.value = result.path;
}

async function applyDatabaseMode() {
  if (!databaseConfigUnlocked) return;
  const mode = els.databaseModeClient.checked ? "client" : "host";
  els.applyDatabaseMode.disabled = true;
  els.databaseStatus.textContent = "Applying database mode...";
  try {
    const result = await window.simplePOS.configureDatabase({
      mode,
      databasePath: els.databasePath.value.trim(),
      actor: getAuditActor()
    });
    if (!result?.success) {
      els.databaseStatus.textContent = result?.error || "Unable to apply database mode.";
      return;
    }
    currentSettings = {
      ...currentSettings,
      ...result.settings
    };
    databaseConfigUnlocked = false;
    renderDatabaseConfig();
    els.databaseStatus.textContent = result.restartRequired
      ? "Database mode saved. Restart POS for the new database connection to take effect."
      : "Database mode saved.";
  } catch {
    els.databaseStatus.textContent = "Unable to apply database mode.";
  } finally {
    els.applyDatabaseMode.disabled = !databaseConfigUnlocked;
  }
}

function updateTimerControls() {
  els.holdRetentionHours.disabled = !els.holdRetentionEnabled.checked;
  els.newItemBadgeHours.disabled = !els.newItemBadgeTimerEnabled.checked;

  if (!els.holdRetentionEnabled.checked) {
    els.holdRetentionHours.value = "";
  } else if (!els.holdRetentionHours.value) {
    els.holdRetentionHours.value = Number(currentSettings.holdRetentionHours || 24);
  }

  if (!els.newItemBadgeTimerEnabled.checked) {
    els.newItemBadgeHours.value = "";
  } else if (!els.newItemBadgeHours.value) {
    els.newItemBadgeHours.value = Number(currentSettings.newItemBadgeHours || 24);
  }
}

async function saveTimerSettings() {
  updateTimerControls();
  currentSettings = await window.simplePOS.saveSettings({
    ...collectSettingsPayload(),
    __auditAction: "Updated timer settings",
    __auditDetails: "Held bill or New item timer setting was changed."
  });
  els.saveStatus.textContent = "Timer setting saved.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
  }, 2400);
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPercentValue(value) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0));
  return Number.isInteger(percent) ? String(percent) : percent.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function parsePercent(value) {
  return Math.min(100, Math.max(0, Number(String(value || "0").replace(/[^0-9.]/g, "")) || 0));
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

// Button, toggle, keyboard, drag/drop, and layout-edit wiring for Settings.
els.form.addEventListener("submit", saveSettings);
window.addEventListener("keydown", (event) => {
  if (!event.ctrlKey) return;
  if (event.shiftKey && (event.key?.toLowerCase() === "l" || event.code === "KeyL")) {
    event.preventDefault();
    toggleLayoutButtons();
    return;
  }
  if (!(event.key === "1" || event.code === "Digit1" || event.code === "Numpad1")) return;
  event.preventDefault();
  databaseConfigUnlocked = !databaseConfigUnlocked;
  renderDatabaseConfig();
});
els.toggleLayoutEdit.addEventListener("click", toggleLayoutEdit);
els.resetLayout.addEventListener("click", resetLayout);
els.holdRetentionEnabled.addEventListener("change", () => {
  saveTimerSettings().catch(() => {
    els.saveStatus.textContent = "Unable to save timer setting.";
  });
});
els.holdRetentionHours.addEventListener("change", () => {
  saveTimerSettings().catch(() => {
    els.saveStatus.textContent = "Unable to save timer setting.";
  });
});
els.newItemBadgeTimerEnabled.addEventListener("change", () => {
  saveTimerSettings().catch(() => {
    els.saveStatus.textContent = "Unable to save timer setting.";
  });
});
els.newItemBadgeHours.addEventListener("change", () => {
  saveTimerSettings().catch(() => {
    els.saveStatus.textContent = "Unable to save timer setting.";
  });
});
els.themeGradient.addEventListener("change", () => {
  applyTheme(els.themeGradient.value);
});
[els.businessName, els.businessAddress, els.businessAdditionalAddress, els.whatsappNumber, els.receiptFooterText].forEach((input) => {
  input.addEventListener("input", renderReceiptTemplatePreview);
});
els.businessAdditionalAddressEnabled.addEventListener("change", () => {
  updateAdditionalAddressControl();
  renderReceiptTemplatePreview();
});
els.receiptTemplateList.addEventListener("input", updateReceiptTemplateFromControls);
els.receiptTemplateList.addEventListener("change", updateReceiptTemplateFromControls);
els.resetReceiptTemplate.addEventListener("click", resetReceiptTemplate);
els.toggleReceiptBuilder.addEventListener("click", toggleReceiptBuilder);
els.saveReceiptSettings.addEventListener("click", () => {
  saveReceiptSettings().catch(() => {
    els.receiptSaveStatus.textContent = "Unable to save receipt settings.";
  });
});
els.receiptPrintingEnabled.addEventListener("change", () => {
  updatePrinterControls();
  if (els.receiptPrintingEnabled.checked) loadPrinters();
});
els.databaseModeHost.addEventListener("change", () => {
  if (currentSettings.backupOnStartupConfigured !== true) els.backupOnStartupEnabled.checked = false;
  if (databaseConfigUnlocked) els.databaseStatus.textContent = "Host selected. Browse for a host folder or apply the default local database path.";
});
els.databaseModeClient.addEventListener("change", () => {
  if (currentSettings.backupOnStartupConfigured !== true) els.backupOnStartupEnabled.checked = true;
  if (databaseConfigUnlocked) els.databaseStatus.textContent = "Client selected. Browse to the Host PC database file, then apply.";
});
els.backupOnStartupEnabled.addEventListener("change", () => {
  els.backupOnStartupEnabled.dataset.changed = "true";
});
els.browseDatabasePath.addEventListener("click", browseDatabasePath);
els.openBackupLocation.addEventListener("click", async () => {
  try {
    const result = await window.simplePOS.openBackupLocation();
    els.databaseStatus.textContent = result?.path ? `Opened backup location: ${result.path}` : "Backup location opened.";
  } catch {
    els.databaseStatus.textContent = "Unable to open backup location.";
  }
});
els.applyDatabaseMode.addEventListener("click", applyDatabaseMode);
els.toggleDatabaseSection.addEventListener("click", toggleDatabaseSection);
els.toggleStaffSection.addEventListener("click", toggleStaffSection);
els.refreshPrinters.addEventListener("click", loadPrinters);
els.savePrinterSettings.addEventListener("click", () => {
  savePrinterSettings().catch(() => {
    els.printerSaveStatus.textContent = "Unable to save printer settings.";
  });
});
els.openAuditLog?.addEventListener("click", () => {
  window.simplePOS.logAudit({
    actor: getAuditActor(),
    action: "Opened Audit Log",
    details: "Audit Log window opened from User Account."
  });
  window.simplePOS.openAuditLog();
});
els.addUser.addEventListener("click", addUser);
els.addPaymentMethod.addEventListener("click", addPaymentMethod);
els.businessLogo.addEventListener("change", loadLogoFile);
els.clearBusinessLogo.addEventListener("click", clearLogo);
els.form.addEventListener("click", (event) => {
  const resizeButton = event.target.closest("[data-layout-resize]");
  const businessResizeButton = event.target.closest("[data-business-layout-resize]");
  if (businessResizeButton) {
    event.preventDefault();
    resizeBusinessLayoutItem(businessResizeButton.dataset.businessLayoutResize);
    return;
  }
  if (resizeButton) {
    event.preventDefault();
    resizeLayoutSection(resizeButton.dataset.layoutResize);
  }
});
els.form.addEventListener("dragstart", (event) => {
  const receiptHandle = event.target.closest("[data-receipt-drag]");
  if (receiptHandle) {
    event.preventDefault();
    return;
  }
  const businessHandle = event.target.closest("[data-business-layout-drag]");
  if (layoutEditEnabled && businessHandle) {
    draggedBusinessLayoutItemId = businessHandle.dataset.businessLayoutDrag;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedBusinessLayoutItemId);
    return;
  }
  const handle = event.target.closest("[data-layout-drag]");
  if (!layoutEditEnabled || !handle) {
    event.preventDefault();
    return;
  }
  draggedLayoutSectionId = handle.dataset.layoutDrag;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedLayoutSectionId);
});
els.form.addEventListener("dragover", (event) => {
  if (draggedReceiptSectionId) {
    const row = event.target.closest("[data-receipt-section]");
    if (!row) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    row.classList.add("layout-drop-target");
    return;
  }
  if (layoutEditEnabled && draggedBusinessLayoutItemId) {
    const item = event.target.closest("[data-business-layout-item]");
    if (!item) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    item.classList.add("layout-drop-target");
    return;
  }
  if (!layoutEditEnabled || !draggedLayoutSectionId) return;
  const section = event.target.closest("[data-layout-section]");
  if (!section) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  section.classList.add("layout-drop-target");
});
els.form.addEventListener("dragleave", (event) => {
  const section = event.target.closest("[data-layout-section]");
  if (section) section.classList.remove("layout-drop-target");
});
els.form.addEventListener("drop", (event) => {
  if (draggedReceiptSectionId) {
    const row = event.target.closest("[data-receipt-section]");
    if (!row) return;
    event.preventDefault();
    document.querySelectorAll(".layout-drop-target").forEach((target) => target.classList.remove("layout-drop-target"));
    moveReceiptTemplateSection(row.dataset.receiptSection);
    draggedReceiptSectionId = "";
    return;
  }
  if (!layoutEditEnabled) return;
  const item = event.target.closest("[data-business-layout-item]");
  if (item && draggedBusinessLayoutItemId) {
    event.preventDefault();
    document.querySelectorAll(".layout-drop-target").forEach((target) => target.classList.remove("layout-drop-target"));
    moveBusinessLayoutItem(draggedBusinessLayoutItemId || event.dataTransfer.getData("text/plain"), item.dataset.businessLayoutItem);
    draggedBusinessLayoutItemId = "";
    return;
  }
  const section = event.target.closest("[data-layout-section]");
  if (!section) return;
  event.preventDefault();
  document.querySelectorAll(".layout-drop-target").forEach((item) => item.classList.remove("layout-drop-target"));
  moveLayoutSection(draggedLayoutSectionId || event.dataTransfer.getData("text/plain"), section.dataset.layoutSection);
  draggedLayoutSectionId = "";
});
els.form.addEventListener("dragend", () => {
  draggedLayoutSectionId = "";
  draggedBusinessLayoutItemId = "";
  draggedReceiptSectionId = "";
  document.querySelectorAll(".layout-drop-target").forEach((item) => item.classList.remove("layout-drop-target"));
});
els.userList.addEventListener("click", (event) => {
  const toggleButton = event.target.closest("[data-toggle-password]");
  if (toggleButton) {
    const row = toggleButton.closest(".user-row");
    const passwordInput = row?.querySelector('[data-field="password"]');
    if (!passwordInput) return;
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    toggleButton.textContent = isHidden ? "Hide" : "Show";
    return;
  }

  const button = event.target.closest("[data-remove-user]");
  if (!button) return;
  removeUser(Number(button.dataset.removeUser));
});
els.paymentMethodList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-payment]");
  if (!button) return;
  removePaymentMethod(Number(button.dataset.removePayment));
});

loadSettings();
