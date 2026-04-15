'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ja">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
          <div className="text-center max-w-md">
            <p className="text-red-500 text-sm font-bold tracking-widest mb-2">ERROR</p>
            <h1 className="text-2xl font-bold text-[#0C3290] mb-3">予期しないエラーが発生しました</h1>
            <p className="text-sm text-slate-500 mb-6">
              ご不便をおかけして申し訳ございません。再読み込みしてお試しください。
            </p>
            <button
              onClick={reset}
              className="inline-block px-6 py-3 bg-[#0C3290] text-white font-semibold rounded-md hover:bg-[#0a2a78] transition-colors"
            >
              再読み込み
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
