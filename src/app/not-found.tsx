import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-amber-500 text-sm font-bold tracking-widest mb-2">404</p>
        <h1 className="text-2xl font-bold text-[#0C3290] mb-3">ページが見つかりません</h1>
        <p className="text-sm text-slate-500 mb-6">
          お探しのページは移動または削除された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-[#0C3290] text-white font-semibold rounded-md hover:bg-[#0a2a78] transition-colors"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
