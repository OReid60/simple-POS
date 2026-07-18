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
        .map(
          (log) => `
            <article class="audit-entry">
              <div>
                <strong>${escapeHtml(log.action || "Activity")}</strong>
                <span>${escapeHtml(log.details || "")}</span>
              </div>
              <div>
                <span>${escapeHtml(log.actorName || "Unknown User")}</span>
                <span>${escapeHtml(log.actorRole || "unknown")}</span>
                <time>${escapeHtml(formatDate(log.createdAt))}</time>
              </div>
            </article>
          `
        )
        .join("")
    : `<div class="empty-cart compact-empty">No user activity has been logged yet.</div>`;
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

els.refreshAuditLog.addEventListener("click", loadAuditLog);

if (window.simplePOS) {
  window.simplePOS.onSettingsUpdated((settings) => {
    applyTheme(settings.themeGradient);
    const logs = Array.isArray(settings.auditLogs) ? settings.auditLogs : [];
    if (!logs.length) return;
    loadAuditLog();
  });
}

loadAuditLog();
