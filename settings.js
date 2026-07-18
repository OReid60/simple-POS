const els = {
  form: document.querySelector("#settingsForm"),
  businessName: document.querySelector("#businessNameInput"),
  businessAddress: document.querySelector("#businessAddressInput"),
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
  paymentMethodList: document.querySelector("#paymentMethodList"),
  addPaymentMethod: document.querySelector("#addPaymentMethod"),
  userList: document.querySelector("#userList"),
  openAuditLog: document.querySelector("#openAuditLog"),
  addUser: document.querySelector("#addUser"),
  receiptPrintingEnabled: document.querySelector("#receiptPrintingEnabled"),
  printerSelect: document.querySelector("#printerSelect"),
  paperSize: document.querySelector("#paperSize"),
  silentPrint: document.querySelector("#silentPrint"),
  printerStatus: document.querySelector("#printerStatus"),
  saveStatus: document.querySelector("#saveStatus"),
  refreshPrinters: document.querySelector("#refreshPrinters")
};

let currentSettings = {
  businessName: "",
  businessLogo: "",
  businessAddress: "",
  whatsappNumber: "",
  taxRate: 0.0825,
  holdRetentionEnabled: true,
  holdRetentionHours: 24,
  newItemBadgeTimerEnabled: true,
  newItemBadgeHours: 24,
  themeGradient: "lotus",
  permissions: {},
  paymentMethods: [],
  users: [],
  receiptPrintingEnabled: false,
  printerName: "",
  paperSize: "letter",
  silent: false
};

async function loadSettings() {
  currentSettings = await window.simplePOS.getSettings();
  currentSettings.users = Array.isArray(currentSettings.users) ? currentSettings.users : [];
  currentSettings.paymentMethods = normalizePaymentMethods(currentSettings.paymentMethods);
  els.businessName.value = currentSettings.businessName || "";
  els.businessAddress.value = currentSettings.businessAddress || "";
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
  els.receiptPrintingEnabled.checked = currentSettings.receiptPrintingEnabled !== false;
  els.paperSize.value = currentSettings.paperSize;
  els.silentPrint.checked = currentSettings.silent;
  updatePrinterControls();
  renderPaymentMethods();
  renderUsers();
  await loadPrinters();
  updatePrinterControls();
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

function loadLogoFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    currentSettings.businessLogo = String(reader.result || "");
    renderLogoPreview();
  });
  reader.readAsDataURL(file);
}

function clearLogo() {
  currentSettings.businessLogo = "";
  els.businessLogo.value = "";
  renderLogoPreview();
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

async function saveSettings(event) {
  event.preventDefault();

  currentSettings = await window.simplePOS.saveSettings(collectSettingsPayload());

  els.saveStatus.textContent = "Settings saved.";
  setTimeout(() => {
    els.saveStatus.textContent = "";
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
    businessLogo: currentSettings.businessLogo || "",
    whatsappNumber: els.whatsappNumber.value.trim(),
    taxRate: Number(els.taxRate.value || 0) / 100,
    holdRetentionEnabled: els.holdRetentionEnabled.checked,
    holdRetentionHours: els.holdRetentionEnabled.checked ? Math.max(1, Number(els.holdRetentionHours.value || 24)) : 24,
    newItemBadgeTimerEnabled: els.newItemBadgeTimerEnabled.checked,
    newItemBadgeHours: els.newItemBadgeTimerEnabled.checked ? Math.max(1, Number(els.newItemBadgeHours.value || 24)) : 24,
    themeGradient: normalizeThemeGradient(els.themeGradient.value),
    permissions: {
      staffCanAccessSettings: els.staffCanAccessSettings.checked,
      staffCanAccessManagement: els.staffCanAccessManagement.checked,
      staffCanAccessReporting: els.staffCanAccessReporting.checked,
      staffCanRestoreHolds: els.staffCanRestoreHolds.checked
    },
    paymentMethods: collectPaymentMethods(),
    users: collectUsers(),
    receiptPrintingEnabled: els.receiptPrintingEnabled.checked,
    printerName: els.printerSelect.value,
    paperSize: els.paperSize.value,
    silent: els.silentPrint.checked
  };
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

els.form.addEventListener("submit", saveSettings);
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
els.receiptPrintingEnabled.addEventListener("change", () => {
  updatePrinterControls();
  if (els.receiptPrintingEnabled.checked) loadPrinters();
});
els.refreshPrinters.addEventListener("click", loadPrinters);
els.openAuditLog.addEventListener("click", () => {
  window.simplePOS.logAudit({
    actor: getAuditActor(),
    action: "Opened Audit Log",
    details: "Audit Log window opened from User Accounts."
  });
  window.simplePOS.openAuditLog();
});
els.addUser.addEventListener("click", addUser);
els.addPaymentMethod.addEventListener("click", addPaymentMethod);
els.businessLogo.addEventListener("change", loadLogoFile);
els.clearBusinessLogo.addEventListener("click", clearLogo);
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
