(function () {
  // Shared window shortcuts: Ctrl+L requests logout, Help buttons open context help topics.
  let backupToastTimer = null;

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

  function isCtrlLShortcut(event) {
    return event.ctrlKey && !event.altKey && !event.shiftKey && (event.key?.toLowerCase() === "l" || event.code === "KeyL");
  }

  window.addEventListener("keydown", (event) => {
    if (!isCtrlLShortcut(event)) return;
    event.preventDefault();
    event.stopPropagation();
    window.simplePOS?.requestLogoutShortcut?.();
  }, true);

  document.addEventListener("click", (event) => {
    const helpButton = event.target.closest("[data-open-help]");
    if (!helpButton) return;
    event.preventDefault();
    window.simplePOS?.openHelp?.(helpButton.dataset.helpTopic || "pos");
  });

  window.simplePOS?.onDatabaseBackupStatus?.(showBackupStatus);
})();
