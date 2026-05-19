import { PasswordChangeForm } from '@/components/admin/PasswordChangeForm';

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">セキュリティ設定</h1>
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">パスワード変更</h2>
        <p className="text-xs text-gray-500">パスワードは90日ごとに変更する必要があります。</p>
        <PasswordChangeForm flow="voluntary" />
      </div>
    </div>
  );
}
