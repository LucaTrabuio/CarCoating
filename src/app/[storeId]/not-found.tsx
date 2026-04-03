import Link from 'next/link';

export default function StoreNotFound() {
  return (
    <main className="py-20 px-5 text-center">
      <div className="max-w-md mx-auto">
        <div className="text-5xl mb-4 text-gray-300">404</div>
        <h1 className="text-xl font-bold text-[#0f1c2e] mb-2">
          この店舗は見つかりません
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          URLが正しいかご確認ください。
        </p>
        <Link
          href="/"
          className="text-amber-600 font-semibold text-sm hover:underline"
        >
          ← トップページに戻る
        </Link>
      </div>
    </main>
  );
}
