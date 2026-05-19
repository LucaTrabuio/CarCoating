// Operator-facing one-liners shown both in the admin UI expand panel and
// the daily-report email card, so a triager knows what to check first.
//
// Two-level lookup:
//   1. exact dedupeKey match (most specific)
//   2. source-level fallback
//
// Consumers can extend or override either map by passing their own to
// `resolveRunbookHint(alert, { byKey, bySource })`.

import type { SystemAlert } from "../types";

export const DEFAULT_RUNBOOK_HINTS_BY_KEY: Record<string, string> = {
  "sync:jocar-auth":
    "外部 API の認証情報が拒否されています。環境変数と上流側の管理画面を確認してください。",
  "auth:password-expiry-cron":
    "パスワード期限切れ通知の定期実行が失敗しました。CRON_SECRET と認証関連の環境変数を確認してください。",
  "critical-alert-mail-failure":
    "重大アラートの通知メール送信自体が失敗しました。メール送信プロバイダの状態を確認してください。",
};

export const DEFAULT_RUNBOOK_HINTS_BY_SOURCE: Record<string, string> = {
  sync: "対象店舗/レコードの同期処理が失敗しています。詳細ペイロードの識別子とメッセージを確認してください。",
  email: "メール送信が失敗しています。プロバイダの応答とフォールバック経路を確認してください。",
  auth: "認証関連の処理で問題が発生しています。認証プロバイダのログを確認してください。",
  image: "画像同期で問題が発生しています。ストレージの容量と権限を確認してください。",
  jocar: "JOCAR API との通信で問題が発生しています。",
  other: "詳細ペイロードを確認してください。",
};

export interface RunbookHintOverrides {
  byKey?: Record<string, string>;
  bySource?: Record<string, string>;
}

export function resolveRunbookHint(
  alert: Pick<SystemAlert, "dedupeKey" | "source">,
  overrides: RunbookHintOverrides = {},
): string {
  const byKey = { ...DEFAULT_RUNBOOK_HINTS_BY_KEY, ...(overrides.byKey ?? {}) };
  const bySource = { ...DEFAULT_RUNBOOK_HINTS_BY_SOURCE, ...(overrides.bySource ?? {}) };
  if (alert.dedupeKey && byKey[alert.dedupeKey]) return byKey[alert.dedupeKey];
  return bySource[alert.source] ?? bySource.other ?? "詳細ペイロードを確認してください。";
}
