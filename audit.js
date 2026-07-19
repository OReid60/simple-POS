// Audit module: renders user activity logs and opens related records when supported.
const els = {
  auditList: document.querySelector("#auditList"),
  refreshAuditLog: document.querySelector("#refreshAuditLog")
};

function normalizeThemeGradient(themeGradient) {
  return ["emerald", "rose", "blue", "gold", "neutral"].includes(themeGradient) ? themeGradient : "emerald";
}

function applyTheme(themeGradient) {
  document.body.dataset.theme = normalizeThemeGradient(themeGradient);
}

async function loadAuditLog() {
  const settings = await window.simplePOS.getSettings();
  applyTheme(settings.themeGradient);
  const logs = Array.isArray(settings.auditLogs) ? settings.auditLogs : [];
  els.auditList.innerHTML = logs.length
    ? logs
        .map((log) => {
          const target = getLogTarget(log);
          return `
            <article class="audit-entry">
              <div>
                <strong>${escapeHtml(log.action || "Activity")}</strong>
                <span>${escapeHtml(log.details || "")}</span>
                ${target ? `<button class="secondary-button audit-open-button" type="button" data-open-target-type="${escapeAttribute(target.type)}" data-open-target-id="${escapeAttribute(target.id)}">Open ${escapeHtml(target.label)}</button>` : ""}
              </div>
              <div>
                <span>${escapeHtml(log.actorName || "Unknown User")}</span>
                <span>${escapeHtml(log.actorRole || "unknown")}</span>
                <time>${escapeHtml(formatDate(log.createdAt))}</time>
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-cart compact-empty">No user activity has been logged yet.</div>`;
}

function getLogTarget(log) {
  const targetType = String(log.targetType || "").trim();
  const targetId = String(log.targetId || "").trim();
  if (targetType === "purchase" && targetId) {
    return {
      type: "purchase",
      id: targetId,
      label: log.targetLabel ? `Bill ${log.targetLabel}` : "Bill"
    };
  }

  if (!["Recorded purchasing payment", "Saved purchasing", "Applied purchase to inventory"].includes(String(log.action || ""))) return null;
  const detailMatch = String(log.details || "").match(/\bbill\s+(PO-[A-Za-z0-9-]+)/i);
  const purchaseMatch = String(log.details || "").match(/\bPurchase\s+(PO-[A-Za-z0-9-]+)/i);
  const target = detailMatch?.[1] || purchaseMatch?.[1] || "";
  if (!target) return null;
  return {
    type: "purchase",
    id: target,
    label: "Bill"
  };
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
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

els.refreshAuditLog.addEventListener("click", loadAuditLog);
els.auditList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-target-type]");
  if (!button) return;
  if (button.dataset.openTargetType === "purchase") {
    window.simplePOS.openPurchasing({ purchaseId: button.dataset.openTargetId });
    window.close();
  }
});

if (window.simplePOS) {
  window.simplePOS.onSettingsUpdated((settings) => {
    applyTheme(settings.themeGradient);
    const logs = Array.isArray(settings.auditLogs) ? settings.auditLogs : [];
    if (!logs.length) return;
    loadAuditLog();
  });
}

loadAuditLog();
