/**
 * Fire-and-forget KPI tracking.
 * Sends a beacon to /api/track to increment daily counters.
 */
export function trackEvent(storeId: string, event: 'phone_call' | 'inquiry' | 'booking') {
  if (!storeId) return;
  // Use sendBeacon for reliability (survives page navigation)
  const data = JSON.stringify({ storeId, event });
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    navigator.sendBeacon('/api/track', data);
  } else {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: data,
      keepalive: true,
    }).catch(() => {});
  }
}
