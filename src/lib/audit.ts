export function auditLog(action: string, userId: string | null, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ type: 'audit', action, userId, ...details, ts: new Date().toISOString() }));
}
