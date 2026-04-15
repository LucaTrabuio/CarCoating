'use client';

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-red-500 text-sm font-bold tracking-widest mb-2">ADMIN ERROR</p>
        <h1 className="text-xl font-bold text-[#0C3290] mb-3">問題が発生しました</h1>
        <p className="text-sm text-slate-500 mb-2">{error.message || 'Unknown error'}</p>
        {error.digest && <p className="text-[11px] text-slate-400 mb-6">ID: {error.digest}</p>}
        <button
          onClick={reset}
          className="inline-block px-6 py-3 bg-[#0C3290] text-white font-semibold rounded-md hover:bg-[#0a2a78] transition-colors"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
