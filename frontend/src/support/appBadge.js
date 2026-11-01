/** Best-effort app-icon counts, plus clearing Android notification dots when all messages are read. */
export async function updateDeviceBadge(count) {
  if (!Number.isSafeInteger(count) || count < 0) return;
  try {
    if (count === 0) await navigator.clearAppBadge?.(); else await navigator.setAppBadge?.(count);
  } catch { /* OS/browser badge support and permissions vary. */ }
  if (count === 0 && 'serviceWorker' in navigator) {
    try { const registration = await navigator.serviceWorker.getRegistration('/'); registration?.active?.postMessage({ type: 'neptrixx:read-all' }); }
    catch { /* No active worker yet. */ }
  }
}
