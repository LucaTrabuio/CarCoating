import { PasswordChangeForm } from '@/components/admin/PasswordChangeForm';

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-gray-900">パスワードの変更が必要です</h1>
          <p className="text-sm text-gray-600 mt-2">
            セキュリティのため、パスワードを変更してください
          </p>
        </div>
        <PasswordChangeForm flow="forced" />
      </div>
    </div>
  );
}
