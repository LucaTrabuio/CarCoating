'use client';

export default function CasesPage() {
  return (
    <div className="max-w-[700px] mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-bold text-lg mb-4">施工事例を投稿</h2>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold mb-1">車種名</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="トヨタ ハリアー" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">施工プラン</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>ダイヤモンドキーパー</option>
              <option>クリスタルキーパー</option>
              <option>EXキーパー</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold mb-1">BEFORE写真</label>
            <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:border-amber-500">
              📷 ドラッグ&ドロップ
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">AFTER写真</label>
            <div className="aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm cursor-pointer hover:border-amber-500">
              📷 ドラッグ&ドロップ
            </div>
          </div>
        </div>
        <div className="mb-3">
          <label className="block text-xs font-semibold mb-1">スタッフコメント</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm min-h-[80px]" placeholder="施工のポイントやお客様の反応など" />
        </div>
        <button className="px-6 py-2.5 bg-amber-500 text-black rounded-lg text-sm font-bold">投稿する</button>
      </div>
    </div>
  );
}
