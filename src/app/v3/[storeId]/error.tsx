'use client';

import Link from 'next/link';

export default function V3StoreError({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-5">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-4">⚠</div>
        <h1 className="text-xl font-bold text-[#0f1c2e] mb-2">ページの読み込みに失敗しました</h1>
        <p className="text-sm text-gray-500 mb-6">店舗データの取得中にエラーが発生しました。しばらくしてから再度お試しください。</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-amber-500 text-white font-bold rounded-lg text-sm hover:bg-amber-600 transition-colors cursor-pointer"
          >
            再読み込み
          </button>
          <Link
            href="/v3/"
            className="px-6 py-2.5 bg-gray-100 text-[#0f1c2e] font-semibold rounded-lg text-sm hover:bg-gray-200 transition-colors"
          >
            店舗一覧に戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
